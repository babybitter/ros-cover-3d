import type { Obstacle, Point2 } from '../types';

export function collides(point: Point2, obstacles: Obstacle[], radius = 0): boolean {
  return obstacles.some(o => {
    const dx = Math.max(Math.abs(point.x - o.x) - o.width / 2, 0);
    const dz = Math.max(Math.abs(point.z - o.z) - o.depth / 2, 0);
    return dx * dx + dz * dz <= radius * radius;
  });
}

/** Exact swept-circle test against axis-aligned boxes, including rounded corners. */
export function segmentCollides(a: Point2, b: Point2, obstacles: Obstacle[], radius: number): boolean {
  const dx = b.x - a.x, dz = b.z - a.z, length2 = dx * dx + dz * dz;
  return obstacles.some(o => {
    const minX = o.x - o.width / 2, maxX = o.x + o.width / 2;
    const minZ = o.z - o.depth / 2, maxZ = o.z + o.depth / 2;
    if (Math.max(a.x, b.x) < minX - radius || Math.min(a.x, b.x) > maxX + radius ||
      Math.max(a.z, b.z) < minZ - radius || Math.min(a.z, b.z) > maxZ + radius) return false;
    if (collides(a, [o], radius) || collides(b, [o], radius)) return true;
    let near = 0, far = 1;
    for (const [p, d, min, max] of [[a.x, dx, minX, maxX], [a.z, dz, minZ, maxZ]]) {
      if (Math.abs(d) < 1e-12) { if (p < min || p > max) { far = -1; break; } }
      else { const u = (min - p) / d, v = (max - p) / d; near = Math.max(near, Math.min(u, v)); far = Math.min(far, Math.max(u, v)); }
    }
    if (near <= far) return true;
    for (const x of [minX, maxX]) for (const z of [minZ, maxZ]) {
      const t = length2 ? Math.max(0, Math.min(1, ((x - a.x) * dx + (z - a.z) * dz) / length2)) : 0;
      if ((a.x + t * dx - x) ** 2 + (a.z + t * dz - z) ** 2 <= radius * radius) return true;
    }
    return false;
  });
}

export function raycast(origin: Point2, angle: number, obstacles: Obstacle[], range: number): number {
  const dx = Math.cos(angle), dz = Math.sin(angle);
  let nearest = range;
  for (const o of obstacles) {
    let near = 0, far = range;
    for (const [position, direction, min, max] of [
      [origin.x, dx, o.x - o.width / 2, o.x + o.width / 2],
      [origin.z, dz, o.z - o.depth / 2, o.z + o.depth / 2],
    ]) {
      if (Math.abs(direction) < 1e-8) {
        if (position < min || position > max) { far = -1; break; }
      } else {
        const a = (min - position) / direction, b = (max - position) / direction;
        near = Math.max(near, Math.min(a, b));
        far = Math.min(far, Math.max(a, b));
      }
    }
    if (near <= far && far >= 0) nearest = Math.min(nearest, near);
  }
  return nearest;
}
