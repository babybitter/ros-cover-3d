import type { Obstacle } from '../types';

export type Vec3 = [number, number, number];
export interface Surface {
  id: string;
  kind: 'box' | 'cylinder' | 'ellipsoid';
  center: Vec3;
  size: Vec3;
  color: string;
  reflectivity: number;
  solid: boolean;
  category: 'road' | 'building' | 'vegetation' | 'furniture';
}
export interface EnvironmentConfig {
  size: number;
  surfaces: Surface[];
  roads: { x: number; z: number; width: number; depth: number }[];
}
export const campusSize = 200;

export function createCampus(): EnvironmentConfig {
  const surfaces: Surface[] = [];
  const roads: EnvironmentConfig['roads'] = [];
  const add = (id: string, center: Vec3, size: Vec3, color: string, category: Surface['category'], solid = false, kind: Surface['kind'] = 'box', reflectivity = 0.55) =>
    surfaces.push({ id, center, size, color, category, solid, kind, reflectivity });
  add('terrain', [0, -0.16, 0], [200, 0.3, 200], '#536b58', 'road');
  const road = (x: number, z: number, width: number, depth: number) => {
    const id = `road-${roads.length}`;
    roads.push({ x, z, width, depth });
    add(id, [x, -0.025, z], [width, 0.05, depth], '#343c42', 'road', false, 'box', 0.24);
  };
  for (const z of [-64, 0, 64]) road(0, z, 198, 12);
  for (const x of [-64, 0, 64]) road(x, 0, 12, 198);
  // A short service lane ends at the central boulevard, forming a T junction.
  road(48, 14, 7, 28);
  for (const z of [-64, 0, 64]) {
    for (let x = -94; x <= 94; x += 6) {
      if ([-64, 0, 64].some(c => Math.abs(x - c) < 9)) continue;
      add(`stripe-x-${x}-${z}`, [x, 0.012, z], [2.7, 0.02, 0.14], '#d9d9bd', 'road');
    }
  }
  for (const x of [-64, 0, 64]) for (let z = -94; z <= 94; z += 6) {
    if ([-64, 0, 64].some(c => Math.abs(z - c) < 9)) continue;
    add(`stripe-z-${x}-${z}`, [x, 0.013, z], [0.14, 0.02, 2.7], '#d9d9bd', 'road');
  }
  for (const x of [-64, 0, 64]) for (const z of [-64, 0, 64]) {
    for (let i = -4; i <= 4; i += 1.6) {
      add(`crosswalk-${x}-${z}-${i}`, [x + i, 0.025, z + 8], [0.8, 0.02, 2.6], '#d2d7ce', 'road');
    }
  }
  let buildingId = 0;
  for (const x of [-84, -32, 32, 84]) for (const z of [-84, -32, 32, 84]) {
    const index = buildingId++;
    const w = Math.abs(x) === 84 ? 16 : 25, d = Math.abs(z) === 84 ? 16 : 25;
    const h = 8 + (index * 7 % 5) * 3;
    const id = `building-${index}`;
    add(`${id}-plaza`, [x, 0.055, z], [w + 5, 0.11, d + 5], '#88918c', 'road');
    add(id, [x, h / 2 + 0.11, z], [w, h, d], ['#a4b0b1', '#87979c', '#b5b6ae', '#83978e'][index % 4], 'building', true);
    add(`${id}-roof`, [x, h + 0.26, z], [w + 0.4, 0.3, d + 0.4], '#59656a', 'building');
    add(`${id}-plant`, [x + w * 0.2, h + 0.9, z], [3, 1, 3], '#737f83', 'building');
    for (let y = 2; y < h - 0.6; y += 3) {
      for (let dx = -w / 2 + 2; dx < w / 2 - 1; dx += 3) {
        for (const side of [-1, 1]) add(`${id}-window-${dx}-${y}-${side}`, [x + dx, y, z + side * (d / 2 + 0.035)], [1.8, 1.5, 0.06], '#466875', 'building', false, 'box', 0.78);
      }
      for (let dz = -d / 2 + 2; dz < d / 2 - 1; dz += 3) {
        for (const side of [-1, 1]) add(`${id}-side-${dz}-${y}-${side}`, [x + side * (w / 2 + 0.035), y, z + dz], [0.06, 1.5, 1.8], '#466875', 'building', false, 'box', 0.78);
      }
    }
    add(`${id}-door`, [x, 1.5, z - d / 2 - 0.08], [2.8, 2.8, 0.12], '#283e49', 'building');
    add(`${id}-canopy`, [x, 3.2, z - d / 2 - 1.1], [4.8, 0.22, 2.4], '#628d97', 'building');
    // Sidewalks have gaps at intersections and do not block the driving lanes.
    for (const sign of [-1, 1]) {
      add(`${id}-walk-${sign}`, [x, 0.07, z + sign * (d / 2 + 3.5)], [w + 8, 0.14, 2], '#929b98', 'road');
      add(`${id}-curb-${sign}`, [x, 0.12, z + sign * (d / 2 + 4.5)], [w + 8, 0.24, 0.18], '#bdc7c2', 'road', true);
    }
  }
  let treeId = 0;
  for (const x of [-54, -10, 10, 54, 74]) for (let z = -90; z <= 90; z += 18) {
    if ([-64, 0, 64].some(c => Math.abs(z - c) < 11)) continue;
    const id = `tree-${treeId++}`;
    add(`${id}-trunk`, [x, 1.5, z], [0.5, 3, 0.5], '#71675a', 'vegetation', true, 'cylinder', 0.32);
    add(`${id}-crown`, [x, 4, z], [3.6, 4.6, 3.6], ['#3e6f55', '#537d5c', '#668568'][treeId % 3], 'vegetation', false, 'ellipsoid', 0.4);
    add(`${id}-bed`, [x, 0.16, z], [2.4, 0.32, 2.4], '#647c64', 'vegetation');
  }
  for (const x of [-8.5, 8.5]) for (let z = -88; z <= 88; z += 22) {
    if (Math.abs(z) < 10 || Math.abs(Math.abs(z) - 64) < 10) continue;
    const id = `lamp-${x}-${z}`;
    add(id, [x, 3.5, z], [0.2, 7, 0.2], '#9aa6a9', 'furniture', true, 'cylinder', 0.8);
    add(`${id}-arm`, [x + (x < 0 ? 0.6 : -0.6), 6.9, z], [1.4, 0.15, 0.18], '#a9b1b1', 'furniture');
    add(`${id}-head`, [x + (x < 0 ? 1.2 : -1.2), 6.8, z], [0.8, 0.12, 0.4], '#dce3c8', 'furniture');
  }
  for (let i = 0; i < 10; i++) {
    const x = -47 + i * 4.7, z = 12;
    add(`car-${i}`, [x, 0.55, z], [3.8, 0.85, 1.85], ['#a4b5bf', '#bc7771', '#dadbd2'][i % 3], 'furniture', true);
    add(`car-${i}-glass`, [x - 0.1, 1.15, z], [2, 0.65, 1.65], '#324e5d', 'furniture', true, 'box', 0.85);
    for (const dx of [-1.15, 1.15]) for (const dz of [-0.88, 0.88]) add(`car-${i}-wheel-${dx}-${dz}`, [x + dx, 0.28, z + dz], [0.6, 0.55, 0.22], '#222b30', 'furniture');
  }
  for (const x of [-11, 11]) {
    add(`sign-pole-${x}`, [x, 1.5, -11], [0.1, 3, 0.1], '#aeb6b4', 'furniture', true, 'cylinder');
    add(`sign-${x}`, [x, 2.7, -11], [1.2, 0.8, 0.12], '#4d91a2', 'furniture');
  }
  for (let i = 0; i < 8; i++) add(`bollard-${i}`, [18 + i * 2.3, 0.5, -9], [0.25, 1, 0.25], '#d5bc77', 'furniture', true, 'cylinder');
  add('service-wall', [45, 1.6, 43], [26, 3.2, 0.4], '#8b9698', 'furniture', true);
  for (let i = 0; i < 12; i++) {
    add(`fence-post-${i}`, [-46 + i * 2, 1, 44], [0.12, 2, 0.12], '#acb7b6', 'furniture', true);
    add(`fence-rail-${i}`, [-45 + i * 2, 1.2, 44], [2, 0.12, 0.12], '#8d9b9b', 'furniture', true);
  }
  return { size: campusSize, surfaces, roads };
}
export const campus = createCampus();
export const toObstacles = (surfaces: Surface[]): Obstacle[] => surfaces.filter(s => s.solid).map(s => ({
  id: s.id, x: s.center[0], z: s.center[2], width: s.size[0], depth: s.size[2], height: s.size[1],
}));
export const campusObstacles = toObstacles(campus.surfaces);
export const obstacleSurfaces = (obstacles: Obstacle[]): Surface[] => obstacles.map(o => ({
  id: o.id, kind: 'box', center: [o.x, o.height / 2, o.z], size: [o.width, o.height, o.depth],
  color: '#879196', reflectivity: 0.55, solid: true, category: 'furniture',
}));
