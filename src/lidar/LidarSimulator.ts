import { Matrix4, Quaternion } from 'three';
import type { Surface, Vec3 } from '../environment/EnvironmentConfig';
import type { SensorPose } from '../simulation/PoseProvider';
import { normalizeLidarConfig, type LidarConfig, type ScanFrame } from './LidarConfig';

interface Node { min: Vec3; max: Vec3; left?: Node; right?: Node; items?: Surface[] }
function build(items: Surface[]): Node {
  const min: Vec3 = [Infinity, Infinity, Infinity], max: Vec3 = [-Infinity, -Infinity, -Infinity];
  for (const s of items) for (let k = 0; k < 3; k++) {
    min[k] = Math.min(min[k], s.center[k] - s.size[k] / 2);
    max[k] = Math.max(max[k], s.center[k] + s.size[k] / 2);
  }
  if (items.length <= 8) return { min, max, items };
  const extents = max.map((v, i) => v - min[i]);
  const axis = extents.indexOf(Math.max(...extents));
  const sorted = [...items].sort((a, b) => a.center[axis] - b.center[axis]), middle = sorted.length >> 1;
  return { min, max, left: build(sorted.slice(0, middle)), right: build(sorted.slice(middle)) };
}
function boxDistance(origin: Vec3, direction: Vec3, min: Vec3, max: Vec3, limit: number): number {
  let near = -Infinity, far = limit;
  for (let axis = 0; axis < 3; axis++) {
    const o = origin[axis], d = direction[axis];
    if (Math.abs(d) < 1e-12) { if (o < min[axis] || o > max[axis]) return Infinity; continue; }
    let a = (min[axis] - o) / d, b = (max[axis] - o) / d;
    if (a > b) [a, b] = [b, a];
    near = Math.max(near, a); far = Math.min(far, b);
    if (near > far) return Infinity;
  }
  return far < 0.08 ? Infinity : Math.max(0, near);
}

/** Exact intersections with the same axis-aligned primitives used by the environment. */
export function intersectSurface(s: Surface, o: Vec3, d: Vec3, limit: number): number {
  if (s.kind === 'box') {
    let near = -Infinity, far = Infinity;
    for (let i = 0; i < 3; i++) {
      const half = s.size[i] / 2, p = (o[i] - s.center[i]) / half, v = d[i] / half;
      if (Math.abs(v) < 1e-12) { if (Math.abs(p) > 1) return Infinity; continue; }
      let a = (-1 - p) / v, b = (1 - p) / v;
      if (a > b) [a, b] = [b, a];
      near = Math.max(near, a); far = Math.min(far, b);
      if (near > far) return Infinity;
    }
    const t = near >= 0.08 ? near : far;
    return near <= far && t >= 0.08 && t <= limit ? t : Infinity;
  }
  const px = (o[0] - s.center[0]) * 2 / s.size[0], py = (o[1] - s.center[1]) * 2 / s.size[1], pz = (o[2] - s.center[2]) * 2 / s.size[2];
  const vx = d[0] * 2 / s.size[0], vy = d[1] * 2 / s.size[1], vz = d[2] * 2 / s.size[2];
  const ellipsoid = s.kind === 'ellipsoid';
  const a = vx * vx + vz * vz + (ellipsoid ? vy * vy : 0);
  const b = 2 * (px * vx + pz * vz + (ellipsoid ? py * vy : 0));
  const cc = px * px + pz * pz + (ellipsoid ? py * py : 0) - 1;
  const disc = b * b - 4 * a * cc;
  let result = Infinity;
  if (disc >= 0 && a > 1e-15) {
    const root = Math.sqrt(disc), near = (-b - root) / (2 * a), far = (-b + root) / (2 * a);
    if (near >= 0.08 && near <= limit && (ellipsoid || Math.abs(py + near * vy) <= 1)) result = near;
    if (far >= 0.08 && far <= limit && (ellipsoid || Math.abs(py + far * vy) <= 1)) result = Math.min(result, far);
  }
  if (!ellipsoid && Math.abs(vy) > 1e-12) for (let y = -1; y <= 1; y += 2) {
    const t = (y - py) / vy, x = px + t * vx, z = pz + t * vz;
    if (t >= 0.08 && t <= limit && x * x + z * z <= 1) result = Math.min(result, t);
  }
  return result;
}

export class LidarSimulator {
  private tree: Node;
  private directions = new Float32Array();
  private directionKey = '';
  constructor(surfaces: Surface[]) { this.tree = build(surfaces); }
  scan(rawConfig: LidarConfig, pose: SensorPose, timestamp: number): ScanFrame {
    const start = performance.now(), config = normalizeLidarConfig(rawConfig);
    const columns = Math.round(360 / config.horizontalResolution);
    const key = `${columns}/${config.lines}/${config.verticalFov}`;
    if (key !== this.directionKey) {
      this.directionKey = key; this.directions = new Float32Array(columns * config.lines * 3);
      for (let line = 0; line < config.lines; line++) {
        const vertical = (-config.verticalFov / 2 + line * config.verticalFov / (config.lines - 1)) * Math.PI / 180;
        for (let col = 0; col < columns; col++) {
          const a = col / columns * Math.PI * 2, i = (line * columns + col) * 3;
          this.directions.set([Math.cos(vertical) * Math.cos(a), Math.sin(vertical), Math.cos(vertical) * Math.sin(a)], i);
        }
      }
    }
    const rays = columns * config.lines, positions = new Float32Array(rays * 3);
    const distances = new Float32Array(rays), intensities = new Float32Array(rays);
    const m = new Matrix4().makeRotationFromQuaternion(new Quaternion(...pose.quaternion)).elements;
    const d: Vec3 = [0, 0, 0], stack: Node[] = [];
    let count = 0;
    for (let i = 0; i < rays; i++) {
      const x = this.directions[i * 3], y = this.directions[i * 3 + 1], z = this.directions[i * 3 + 2];
      d[0] = m[0] * x + m[4] * y + m[8] * z;
      d[1] = m[1] * x + m[5] * y + m[9] * z;
      d[2] = m[2] * x + m[6] * y + m[10] * z;
      let nearest = config.range, hit: Surface | undefined;
      stack.length = 0; stack.push(this.tree);
      while (stack.length) {
        const node = stack.pop()!;
        if (boxDistance(pose.position, d, node.min, node.max, nearest) === Infinity) continue;
        if (node.items) {
          for (const surface of node.items) {
            const t = intersectSurface(surface, pose.position, d, nearest);
            if (t <= nearest) { nearest = t; hit = surface; }
          }
        } else { stack.push(node.left!, node.right!); }
      }
      if (!hit) continue;
      positions[count * 3] = x * nearest;
      positions[count * 3 + 1] = y * nearest;
      positions[count * 3 + 2] = z * nearest;
      distances[count] = nearest; intensities[count] = hit.reflectivity; count++;
    }
    return { localPositions: positions.slice(0, count * 3), distances: distances.slice(0, count),
      intensities: intensities.slice(0, count), pose, timestamp, rayCount: rays, duration: performance.now() - start };
  }
}
