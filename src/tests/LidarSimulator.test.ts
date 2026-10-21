import { describe, expect, it } from 'vitest';
import { Euler, Quaternion, Vector3 } from 'three';
import { campus, type Surface } from '../environment/EnvironmentConfig';
import { defaultLidarConfig, normalizeLidarConfig } from '../lidar/LidarConfig';
import { intersectSurface, LidarSimulator } from '../lidar/LidarSimulator';
import { SimulationPoseProvider, type SensorPose } from '../simulation/PoseProvider';
import { initialVehicle } from '../simulation/MotionModel';
import { roverConfig } from '../config/roverConfig';

const surface = (kind: Surface['kind'], center: Surface['center'] = [5, 0, 0]): Surface => ({
  id: kind, kind, center, size: [2, 2, 2], color: '#ffffff', reflectivity: 0.7, solid: true, category: 'building',
});
const pose: SensorPose = { position: [0, 0, 0], quaternion: [0, 0, 0, 1] };

describe('analytic LiDAR intersections', () => {
  for (const kind of ['box', 'cylinder', 'ellipsoid'] as const) {
    it(`${kind}: handles entry, exit, misses and range clipping`, () => {
      const s = surface(kind);
      expect(intersectSurface(s, [0, 0, 0], [1, 0, 0], 10)).toBeCloseTo(4);
      expect(intersectSurface(s, [5, 0, 0], [1, 0, 0], 10)).toBeCloseTo(1);
      expect(intersectSurface(s, [0, 3, 0], [1, 0, 0], 10)).toBe(Infinity);
      expect(intersectSurface(s, [0, 0, 0], [-1, 0, 0], 10)).toBe(Infinity);
      expect(intersectSurface(s, [0, 0, 0], [1, 0, 0], 3)).toBe(Infinity);
    });
  }
  it('tests cylinder caps and ellipsoid nonuniform radii', () => {
    expect(intersectSurface(surface('cylinder'), [5, 4, 0], [0, -1, 0], 10)).toBe(3);
    expect(intersectSurface(surface('cylinder'), [7, 4, 0], [0, -1, 0], 10)).toBe(Infinity);
    const s = { ...surface('ellipsoid'), size: [4, 6, 2] as Surface['size'] };
    expect(intersectSurface(s, [5, 10, 0], [0, -1, 0], 20)).toBeCloseTo(7);
  });
  it('rejects parallel rays outside a box', () => {
    expect(intersectSurface(surface('box'), [0, 2, 0], [0, 0, 1], 10)).toBe(Infinity);
  });
});

describe('multiline geometric scanning', () => {
  const near = { ...surface('box', [0, 0, 0]), size: [10, 10, 10] as Surface['size'] };
  it('returns no invented points for an empty world', () => {
    const frame = new LidarSimulator([]).scan(defaultLidarConfig, pose, 3);
    expect(frame.distances.length).toBe(0);
    expect(frame.localPositions.length).toBe(0);
    expect(frame.rayCount).toBe(900 * 64);
  });
  it('samples 360 degrees, respects nearest occlusion and carries reflectivity', () => {
    const far = { ...near, id: 'far', size: [18, 18, 18] as Surface['size'], reflectivity: 0.1 };
    const frame = new LidarSimulator([far, near]).scan(defaultLidarConfig, pose, 4);
    expect(frame.distances.length).toBe(frame.rayCount);
    const p = frame.localPositions;
    for (let i = 0; i < frame.distances.length; i++) {
      expect(Math.max(Math.abs(p[i * 3]), Math.abs(p[i * 3 + 1]), Math.abs(p[i * 3 + 2]))).toBeCloseTo(5, 4);
    }
    expect(frame.intensities[0]).toBeCloseTo(0.7);
    expect(frame.timestamp).toBe(4);
  });
  it('changes horizontal density, line count and vertical field of view', () => {
    const sim = new LidarSimulator([near]);
    const a = sim.scan({ ...defaultLidarConfig, lines: 32 }, pose, 0);
    const b = sim.scan({ ...defaultLidarConfig, horizontalResolution: 0.2, lines: 128, verticalFov: 80 }, pose, 1);
    expect(a.rayCount).toBe(28_800);
    expect(b.rayCount).toBe(230_400);
    const angle = (frame: typeof a) => Math.asin(frame.localPositions[1] / frame.distances[0]) * 180 / Math.PI;
    expect(angle(a)).toBeCloseTo(-20, 4);
    expect(angle(b)).toBeCloseTo(-40, 4);
  });
  it('produces dense finite campus returns within the configured range', () => {
    const frame = new LidarSimulator(campus.surfaces).scan(defaultLidarConfig,
      new SimulationPoseProvider().sensorPose(initialVehicle()), 0);
    expect(frame.distances.length).toBeGreaterThan(25_000);
    expect(frame.distances.every(d => Number.isFinite(d) && d >= 0.08 && d <= 60.00001)).toBe(true);
    expect(frame.localPositions.every(Number.isFinite)).toBe(true);
  });
  it('normalizes unsafe settings including nonfinite values', () => {
    expect(normalizeLidarConfig({ horizontalResolution: NaN, lines: 4 as 32, verticalFov: Infinity, range: -4, frequency: 20 }))
      .toEqual({ ...defaultLidarConfig, range: 10, frequency: 10 });
  });
});

describe('sensor pose convention', () => {
  it('matches rover YXZ orientation and rotated mounting offset at heading and tilt', () => {
    const vehicle = { ...initialVehicle(), x: 12, z: -8, heading: Math.PI / 2, pitch: 0.1, roll: -0.2 };
    const result = new SimulationPoseProvider().sensorPose(vehicle);
    const q = new Quaternion().setFromEuler(new Euler(vehicle.roll, -vehicle.heading, vehicle.pitch, 'YXZ'));
    const expected = new Vector3(...roverConfig.lidarPosition).applyQuaternion(q).add(new Vector3(vehicle.x, 0, vehicle.z));
    expect(new Vector3(...result.position).distanceTo(expected)).toBeLessThan(1e-10);
    const forward = new Vector3(1, 0, 0).applyQuaternion(new Quaternion(...result.quaternion));
    expect(forward.z).toBeGreaterThan(0.95);
  });
});
