import { roverConfig as c } from '../config/roverConfig';
import type { Point2, VehicleState } from '../types';
import { wrapAngle } from './MotionModel';

/** Grid navigation uses a simplified skid-steer pivot at each waypoint. */
export function stepNavigation(v: VehicleState, target: Point2, dt: number, limit: number): VehicleState {
  const dx = target.x - v.x, dz = target.z - v.z, distance = Math.hypot(dx, dz);
  if (distance < 0.0001) return { ...v, speed: 0 };
  const desired = Math.atan2(dz, dx), error = wrapAngle(desired - v.heading);
  const aligned = Math.abs(error) < 0.025;
  const heading = wrapAngle(v.heading + Math.sign(error) * Math.min(Math.abs(error), dt * 1.2));
  const targetSpeed = aligned ? Math.min(limit, Math.sqrt(2 * c.braking * distance)) : 0;
  const rate = targetSpeed > v.speed ? c.acceleration : c.braking;
  const speed = Math.max(0, v.speed + Math.sign(targetSpeed - v.speed) * Math.min(Math.abs(targetSpeed - v.speed), rate * dt));
  // Pivot without translating; exact segment following preserves the inflated path clearance.
  const traveled = aligned ? Math.min(distance, speed * dt) : 0;
  return {
    ...v, x: v.x + dx / distance * traveled, z: v.z + dz / distance * traveled,
    heading, speed: aligned ? speed : 0, steering: 0,
    distance: v.distance + traveled, wheelAngle: v.wheelAngle + traveled / c.wheelRadius,
    pitch: 0, roll: 0,
  };
}
