import { create } from 'zustand';
import { campusObstacles } from '../environment/EnvironmentConfig';
import { roverConfig } from '../config/roverConfig';
import type { Obstacle } from '../types';

export const useEnvironment = create<{
  mode: 'showroom' | 'campus'; visible: boolean; follow: boolean; showBounds: boolean;
  patch: (update: Partial<{ mode: 'showroom' | 'campus'; visible: boolean; follow: boolean; showBounds: boolean }>) => void;
}>(set => ({ mode: 'showroom', visible: true, follow: true, showBounds: false, patch: update => set(update) }));
export const activeMap = () => useEnvironment.getState().mode === 'campus'
  ? { min: -100, max: 100, resolution: 2 } : roverConfig.map;
let lastInput: Obstacle[] | undefined;
let lastCombined: Obstacle[] = [];
export function collisionObstacles(obstacles: Obstacle[]) {
  if (useEnvironment.getState().mode !== 'campus') return obstacles;
  if (lastInput !== obstacles) { lastInput = obstacles; lastCombined = [...campusObstacles, ...obstacles]; }
  return lastCombined;
}
