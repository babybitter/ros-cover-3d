import { collides } from './CollisionDetector';
import type { Obstacle, Point2 } from '../types';

export interface GridMap { min: number; max: number; resolution: number }
export interface PathResult { path: Point2[]; visited: number; reason?: string }

export function planPath(map: GridMap, start: Point2, goal: Point2, obstacles: Obstacle[], radius: number): PathResult {
  const count = Math.round((map.max - map.min) / map.resolution);
  const toCell = (p: Point2) => [Math.round((p.x - map.min) / map.resolution), Math.round((p.z - map.min) / map.resolution)];
  const toWorld = (x: number, z: number) => ({ x: map.min + x * map.resolution, z: map.min + z * map.resolution });
  const safe = (p: Point2) => p.x >= map.min + radius && p.z >= map.min + radius && p.x <= map.max - radius && p.z <= map.max - radius && !collides(p, obstacles, radius);
  const segmentSafe = (a: Point2, b: Point2) => {
    const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 0.025));
    for (let i = 0; i <= steps; i++) if (!safe({ x: a.x + (b.x - a.x) * i / steps, z: a.z + (b.z - a.z) * i / steps })) return false;
    return true;
  };
  const [sx, sz] = toCell(start), [gx, gz] = toCell(goal);
  const valid = (x: number, z: number) => x >= 0 && z >= 0 && x <= count && z <= count && safe(toWorld(x, z));
  if (!safe(start) || !safe(goal) || !valid(sx, sz) || !valid(gx, gz) ||
    !segmentSafe(start, toWorld(sx, sz)) || !segmentSafe(toWorld(gx, gz), goal)) return { path: [], visited: 0, reason: '起点或目标位于障碍物或地图边界安全区域内' };
  const key = (x: number, z: number) => z * (count + 1) + x;
  const startKey = key(sx, sz), goalKey = key(gx, gz);
  const open = new Set([startKey]), closed = new Set<number>(), costs = new Map([[startKey, 0]]), parents = new Map<number, number>();
  const heuristic = (x: number, z: number) => Math.hypot(x - gx, z - gz);
  const scores = new Map([[startKey, heuristic(sx, sz)]]);
  let visited = 0;
  while (open.size) {
    let current = -1, best = Infinity;
    for (const id of open) { if ((scores.get(id) ?? Infinity) < best) { current = id; best = scores.get(id)!; } }
    open.delete(current);
    if (current === goalKey) {
      const path: Point2[] = [];
      let id: number | undefined = current;
      while (id !== undefined) { path.unshift(toWorld(id % (count + 1), Math.floor(id / (count + 1)))); id = parents.get(id); }
      if (Math.hypot(start.x - path[0].x, start.z - path[0].z) > 0.0001) path.unshift({ ...start });
      if (Math.hypot(goal.x - path[path.length - 1].x, goal.z - path[path.length - 1].z) > 0.0001) path.push({ ...goal });
      return { path, visited };
    }
    closed.add(current); visited++;
    const x = current % (count + 1), z = Math.floor(current / (count + 1));
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
      const nx = x + dx, nz = z + dz, id = key(nx, nz);
      if (!valid(nx, nz) || closed.has(id)) continue;
      if (dx && dz && (!valid(x + dx, z) || !valid(x, z + dz))) continue;
      if (!segmentSafe(toWorld(x, z), toWorld(nx, nz))) continue;
      const cost = costs.get(current)! + Math.hypot(dx, dz);
      if (cost < (costs.get(id) ?? Infinity)) {
        parents.set(id, current); costs.set(id, cost); scores.set(id, cost + heuristic(nx, nz)); open.add(id);
      }
    }
  }
  return { path: [], visited, reason: '没有可通行路径' };
}
