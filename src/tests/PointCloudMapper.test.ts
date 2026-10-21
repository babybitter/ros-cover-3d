import { describe, expect, it } from 'vitest';
import { Quaternion, Vector3 } from 'three';
import { defaultLidarConfig, type ScanFrame } from '../lidar/LidarConfig';
import { PointCloudMapper } from '../lidar/PointCloudMapper';
import { PointCloudBuffer, pointColor } from '../lidar/PointCloudBuffer';
import { LidarSimulator } from '../lidar/LidarSimulator';
import { SimulationPoseProvider } from '../simulation/PoseProvider';
import { initialVehicle } from '../simulation/MotionModel';
import { useMapping } from '../stores/mappingStore';

const frame = (x = 0, heading = 0): ScanFrame => ({
  localPositions: new Float32Array([1, 2, 0, 1.01, 2, 0, 3, 2, 0]),
  distances: new Float32Array([1, 1.01, 3]), intensities: new Float32Array([0.5, 0.5, 0.8]),
  pose: { position: [x, 0, 0], quaternion: new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), -heading).toArray() },
  timestamp: x, rayCount: 3, duration: 1,
});
describe('point cloud accumulation', () => {
  it('transforms local coordinates into world space and deduplicates repeated scans', () => {
    const mapper = new PointCloudMapper(0.1, 20), live = new PointCloudBuffer(10);
    mapper.ingest(frame(10, Math.PI / 2), live);
    expect(live.count).toBe(3);
    expect([...live.positions.slice(0, 3)]).toEqual([10, 2, 1]);
    expect(mapper.buffer.count).toBe(2);
    mapper.ingest(frame(10, Math.PI / 2), live);
    expect(mapper.buffer.count).toBe(2);
    expect(mapper.scans).toBe(2);
    expect(mapper.bounds).toEqual({ minX: 10, maxX: 10, minZ: 1, maxZ: 3 });
  });
  it('keeps the accumulated map while live scans move and accumulation is paused', () => {
    const mapper = new PointCloudMapper(0.1, 20), live = new PointCloudBuffer(2);
    mapper.ingest(frame(), live);
    const before = mapper.buffer.positions.slice();
    mapper.ingest(frame(20), live, false);
    expect(mapper.buffer.positions).toEqual(before);
    expect(mapper.scans).toBe(1);
    expect(live.count).toBe(2);
    expect(live.positions[0]).toBe(21);
    mapper.ingest(frame(20), live);
    expect(mapper.buffer.count).toBe(4);
  });
  it('bounds point and pose history, clears completely and can restart', () => {
    const mapper = new PointCloudMapper(0.1, 4);
    for (let i = 0; i < 300; i++) mapper.ingest(frame(i * 10));
    expect(mapper.buffer.count).toBe(4);
    expect(mapper.voxels.slots.size).toBe(4);
    expect(mapper.poses.length).toBe(256);
    mapper.clear();
    expect(mapper.buffer.count).toBe(0);
    expect(mapper.poses).toEqual([]);
    expect(mapper.bounds.minX).toBe(Infinity);
    mapper.ingest(frame());
    expect(mapper.buffer.count).toBe(2);
    expect(mapper.scans).toBe(1);
  });
  it('aligns turned and tilted scans with real world walls', () => {
    const simulator = new LidarSimulator([{
      id: 'wall', kind: 'box', center: [12, 3, 0], size: [1, 6, 16], color: '#ffffff',
      reflectivity: 0.5, solid: true, category: 'building',
    }]);
    for (const heading of [0, Math.PI / 2, -1.2]) {
      const pose = new SimulationPoseProvider().sensorPose({ ...initialVehicle(), x: 1, z: 2, heading, roll: 0.04, pitch: -0.06 });
      const scan = simulator.scan({ ...defaultLidarConfig, lines: 32 }, pose, 1);
      const mapper = new PointCloudMapper(0.1, 30_000), live = new PointCloudBuffer(30_000);
      mapper.ingest(scan, live);
      expect(live.count).toBeGreaterThan(1000);
      for (let i = 0; i < live.count; i++) expect(live.positions[i * 3]).toBeCloseTo(11.5, 4);
    }
  });
  it('provides finite bounded colors for all display modes', () => {
    for (const mode of ['mono', 'height', 'distance', 'intensity'] as const) {
      expect(pointColor(mode, 3, 20, 0.7).every(v => Number.isFinite(v) && v >= 0 && v <= 1)).toBe(true);
    }
  });
});
describe('mapping control invalidation', () => {
  it('invalidates in-flight frames on scanner/accumulation/config changes and resets diagnostics on clear', () => {
    const s = useMapping.getState();
    const epoch = s.epoch;
    s.patch({ enabled: true });
    s.patch({ accumulating: true });
    s.configure({ range: 70 });
    expect(useMapping.getState().epoch).toBe(epoch + 3);
    s.patch({ hits: 10, points: 20, rays: 30, scans: 2, scanMs: 4, actualHz: 5, bounds: { minX: 0, maxX: 1, minZ: 0, maxZ: 1 } });
    s.clear();
    expect(useMapping.getState()).toMatchObject({ hits: 0, points: 0, rays: 0, scans: 0, scanMs: 0, actualHz: 0, bounds: null });
    s.restart();
    expect(useMapping.getState()).toMatchObject({ enabled: true, accumulating: true });
    s.patch({ voxelSize: 0.08 });
    expect(useMapping.getState().resetRevision).toBeGreaterThan(s.resetRevision);
  });
});
