import { Matrix4, Quaternion } from 'three';
import type { ScanFrame } from './LidarConfig';
import { PointCloudBuffer } from './PointCloudBuffer';
import { VoxelDownsampler } from './VoxelDownsampler';

export class PointCloudMapper {
  readonly buffer: PointCloudBuffer;
  readonly voxels: VoxelDownsampler;
  readonly poses: { pose: ScanFrame['pose']; timestamp: number }[] = [];
  bounds = { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity };
  scans = 0;
  constructor(voxelSize: number, capacity: number) {
    this.voxels = new VoxelDownsampler(voxelSize, capacity); this.buffer = new PointCloudBuffer(capacity);
  }
  ingest(frame: ScanFrame, live?: PointCloudBuffer, accumulate = true) {
    const m = new Matrix4().makeRotationFromQuaternion(new Quaternion(...frame.pose.quaternion)).elements;
    const [ox, oy, oz] = frame.pose.position;
    for (let i = 0; i < frame.distances.length; i++) {
      const lx = frame.localPositions[i * 3], ly = frame.localPositions[i * 3 + 1], lz = frame.localPositions[i * 3 + 2];
      const x = m[0] * lx + m[4] * ly + m[8] * lz + ox;
      const y = m[1] * lx + m[5] * ly + m[9] * lz + oy;
      const z = m[2] * lx + m[6] * ly + m[10] * lz + oz;
      if (live && i < live.capacity) live.set(i, x, y, z, frame.distances[i], frame.intensities[i]);
      if (!accumulate) continue;
      const slot = this.voxels.insert(x, y, z);
      if (slot === undefined) continue;
      this.buffer.set(slot, x, y, z, frame.distances[i], frame.intensities[i]);
      this.bounds.minX = Math.min(this.bounds.minX, x); this.bounds.maxX = Math.max(this.bounds.maxX, x);
      this.bounds.minZ = Math.min(this.bounds.minZ, z); this.bounds.maxZ = Math.max(this.bounds.maxZ, z);
    }
    if (live) { live.count = Math.min(live.capacity, frame.distances.length); live.revision++; }
    if (!accumulate) return;
    this.buffer.count = this.voxels.count; this.buffer.revision++; this.scans++;
    this.poses.push({ pose: frame.pose, timestamp: frame.timestamp });
    if (this.poses.length > 256) this.poses.shift();
  }
  clear() {
    this.voxels.clear(); this.buffer.clear(); this.poses.length = 0; this.scans = 0;
    this.bounds = { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity };
  }
}
