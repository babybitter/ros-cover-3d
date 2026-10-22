import type { Vec3 } from './roverConfig';

export interface ExplosionPartConfig {
  offset: Vec3;
  anchor: Vec3;
  start: number;
  end: number;
  easing: 'smootherstep';
}

const part = (offset: Vec3, anchor: Vec3, start: number, end: number): ExplosionPartConfig =>
  ({ offset, anchor, start, end, easing: 'smootherstep' });

// Coordinates are local to the stationary parent of each translation wrapper.
export const explosionConfig = {
  duration: 1.2,
  shellSide: (side: number) => part([0, 0.08, side * 0.34], [0, 0.8, side * 0.7], 0, 0.42),
  hatch: part([-0.12, 0.38, 0], [-0.97, 1.235, 0], 0, 0.42),
  shellEnd: (side: number) => part([side * 0.32, 0.08, 0], [side * 1.25, 1, 0], 0.02, 0.44),
  cameras: part([0.27, 0.32, 0], [0.8, 1.15, 0], 0.12, 0.69),
  cameraModule: (z: number) => part([0.14, 0.025, Math.sign(z) * 0.045], [0.02, 0, z], 0.26, 0.76),
  upperCamera: part([0.14, 0.09, 0], [0.5, 1.5, 0], 0.26, 0.76),
  lidar: part([0, 0.52, 0], [0, 1.14, 0], 0.12, 0.68),
  lidarHead: part([0, 0.16, 0], [0, 1.75, 0], 0.26, 0.76),
  wheel: (x: number, side: number) => part([0, 0, side * 0.62], [x, 0.43, side * 0.975], 0.32, 0.85),
  suspension: (x: number, side: number) => part([0, 0.05, side * 0.23], [x, 0.7, side * 0.65], 0.42, 0.93),
  gears: part([-0.18, 0.3, 0], [-0.6, 1.12, 0], 0.5, 1),
  deck: part([0, 0.18, 0], [0, 0.955, 0], 0.56, 1),
  frame: (side: number) => part([0, 0.045, side * 0.1], [0, 0.8, side * 0.67], 0.56, 1),
};
