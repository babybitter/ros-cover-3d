import { describe, expect, it } from 'vitest';
import { VoxelDownsampler } from '../lidar/VoxelDownsampler';

describe('bounded voxel sampling', () => {
  it('uses floor for negative coordinates and rejects duplicate voxels', () => {
    const voxels = new VoxelDownsampler(0.1, 10);
    expect(voxels.insert(-0.01, 0, 0)).toBe(0);
    expect(voxels.insert(-0.09, 0, 0)).toBeUndefined();
    expect(voxels.insert(0.01, 0, 0)).toBe(1);
    expect(voxels.count).toBe(2);
  });
  it('evicts in FIFO order, removes old keys and reuses bounded slots', () => {
    const voxels = new VoxelDownsampler(1, 2);
    expect(voxels.insert(0, 0, 0)).toBe(0);
    expect(voxels.insert(1, 0, 0)).toBe(1);
    expect(voxels.insert(2, 0, 0)).toBe(0);
    expect(voxels.slots.has('0,0,0')).toBe(false);
    expect(voxels.insert(0, 0, 0)).toBe(1);
    expect(voxels.count).toBe(2);
    expect(voxels.keys.length).toBe(2);
    voxels.clear();
    expect(voxels.insert(1, 0, 0)).toBe(0);
    expect(voxels.count).toBe(1);
  });
  it('rejects nonfinite points and invalid configurations', () => {
    const voxels = new VoxelDownsampler(0.1, 2);
    expect(voxels.insert(NaN, 0, 0)).toBeUndefined();
    expect(voxels.insert(0, Infinity, 0)).toBeUndefined();
    expect(voxels.count).toBe(0);
    for (const size of [0, -1, NaN, Infinity]) expect(() => new VoxelDownsampler(size, 2)).toThrow();
    expect(() => new VoxelDownsampler(0.1, 1.5)).toThrow();
  });
});
