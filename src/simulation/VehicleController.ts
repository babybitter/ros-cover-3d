import { useSimulation } from '../stores/simulationStore';
import { roverConfig as c } from '../config/roverConfig';
import { collides } from './CollisionDetector';
import { stepMotion } from './MotionModel';
import { stepNavigation } from './NavigationMotion';
import { SensorSimulator } from './SensorSimulator';
import type { Point2, VehicleState } from '../types';
import { activeMap, collisionObstacles } from '../stores/environmentStore';

/** Mutable frame state avoids publishing React updates at display refresh rate. */
export const runtime = { vehicle: useSimulation.getState().vehicle, elapsed: 0, ticks: 0 };
const sensor = new SensorSimulator();
let published = 0;
let observedVehicle: VehicleState = runtime.vehicle;
let collisionLocked = false;

export function updateSimulation(rawDelta: number) {
  const s = useSimulation.getState();
  if (s.vehicle !== observedVehicle) { runtime.vehicle = s.vehicle; observedVehicle = s.vehicle; runtime.elapsed = s.elapsed; }
  if (s.paused) return;
  const obstacles = collisionObstacles(s.obstacles), map = activeMap();
  const dt = Math.max(0, Math.min(rawDelta, 0.25)) * s.timeScale;
  runtime.elapsed += dt;
  let input = { ...s.input };
  let v = runtime.vehicle;
  let navigationTarget: Point2 | undefined;
  if (s.emergency) { input = { throttle: 0, steer: 0 }; v = { ...v, speed: 0 }; }
  if (s.mode === 'auto' && s.navStatus === 'running') {
    let index = s.pathIndex;
    while (index < s.path.length - 1 && Math.hypot(s.path[index].x - v.x, s.path[index].z - v.z) < 0.002) index++;
    if (index !== s.pathIndex) s.patch({ pathIndex: index });
    const goal = s.path[s.path.length - 1];
    if (goal && Math.hypot(goal.x - v.x, goal.z - v.z) < 0.02) {
      s.patch({ navStatus: 'arrived', mode: 'manual', input: { throttle: 0, steer: 0 } });
      s.log('已到达目标点', 'success');
      input = { throttle: 0, steer: 0 }; v = { ...v, speed: 0 };
    } else {
      navigationTarget = s.path[index];
    }
  }
  // Fixed substeps keep time scaling and low frame rates consistent.
  const substeps = Math.max(1, Math.ceil(dt / 0.016));
  for (let i = 0; i < substeps; i++) {
    const next = navigationTarget && !s.emergency
      ? stepNavigation(v, navigationTarget, dt / substeps, s.speedLimit)
      : stepMotion(v, input, dt / substeps, s.speedLimit);
    const blocked = collides(next, obstacles, c.collisionRadius) || next.x > map.max - c.collisionRadius || next.x < map.min + c.collisionRadius || next.z > map.max - c.collisionRadius || next.z < map.min + c.collisionRadius;
    if (blocked && Math.abs(next.speed) > 0.001) {
      v = { ...v, speed: 0 };
      if (!collisionLocked) {
        collisionLocked = true; s.log('安全保护 · 障碍物或地图边界，车辆停止', 'warn');
        s.patch({ input: { throttle: 0, steer: 0 } });
        if (s.mode === 'auto') {
          s.patch({ vehicle: v }); observedVehicle = v;
          s.plan();
          if (useSimulation.getState().path.length) s.patch({ mode: 'auto', navStatus: 'running' });
        }
      }
      break;
    }
    collisionLocked = false; v = next;
  }
  runtime.vehicle = v; runtime.ticks++;
  if (runtime.elapsed - published >= 0.1 || runtime.elapsed < published) {
    published = runtime.elapsed;
    sensor.threshold = s.threshold;
    const sensors = sensor.sample(v, obstacles, runtime.elapsed);
    s.patch({ vehicle: v, sensors, elapsed: runtime.elapsed });
    observedVehicle = v;
  }
}
