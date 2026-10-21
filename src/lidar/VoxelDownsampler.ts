export class VoxelDownsampler {
  readonly slots = new Map<string, number>();
  readonly keys: (string | undefined)[];
  private cursor = 0;
  constructor(readonly size: number, readonly capacity: number) {
    if (!Number.isFinite(size) || !(size > 0) || !Number.isInteger(capacity) || capacity < 1) throw new Error('Invalid voxel configuration');
    this.keys = new Array(capacity);
  }
  insert(x: number, y: number, z: number): number | undefined {
    if (![x, y, z].every(Number.isFinite)) return undefined;
    const key = `${Math.floor(x / this.size)},${Math.floor(y / this.size)},${Math.floor(z / this.size)}`;
    if (this.slots.has(key)) return undefined;
    const slot = this.cursor, previous = this.keys[slot];
    if (previous !== undefined) this.slots.delete(previous);
    this.keys[slot] = key; this.slots.set(key, slot); this.cursor = (slot + 1) % this.capacity;
    return slot;
  }
  clear() { this.slots.clear(); this.keys.fill(undefined); this.cursor = 0; }
  get count() { return this.slots.size; }
}
