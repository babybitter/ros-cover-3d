import type { Obstacle, Point2 } from '../types';

export function collides(point: Point2, obstacles: Obstacle[], radius = 0): boolean {
  return obstacles.some(o => {
    const dx = Math.max(Math.abs(point.x - o.x) - o.width / 2, 0);
    const dz = Math.max(Math.abs(point.z - o.z) - o.depth / 2, 0);
    return dx * dx + dz * dz <= radius * radius;
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
