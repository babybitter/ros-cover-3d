import type { CloudColor } from './LidarConfig';

export class PointCloudBuffer {
  readonly positions: Float32Array;
  readonly distances: Float32Array;
  readonly intensities: Float32Array;
  count = 0;
  revision = 0;
  dirtyMin = Infinity;
  dirtyMax = -1;
  constructor(readonly capacity: number) {
    this.positions = new Float32Array(capacity * 3);
    this.distances = new Float32Array(capacity); this.intensities = new Float32Array(capacity);
  }
  set(index: number, x: number, y: number, z: number, distance: number, intensity: number) {
    this.positions.set([x, y, z], index * 3); this.distances[index] = distance; this.intensities[index] = intensity;
    this.dirtyMin = Math.min(this.dirtyMin, index); this.dirtyMax = Math.max(this.dirtyMax, index);
  }
  clear() { this.count = 0; this.revision++; this.dirtyMin = Infinity; this.dirtyMax = -1; }
  get bytes() { return this.positions.byteLength + this.distances.byteLength + this.intensities.byteLength; }
}
export function pointColor(mode: CloudColor, height: number, distance: number, intensity: number): [number, number, number] {
  if (mode === 'mono') return [0.19, 0.93, 0.74];
  const t = Math.max(0, Math.min(1, mode === 'height' ? height / 18 : mode === 'distance' ? distance / 100 : intensity));
  // Cyan -> green -> amber gives readable height and material contrast.
  return [0.14 + 0.86 * t, 0.85 - 0.35 * t, 0.95 * (1 - t) + 0.12];
}
