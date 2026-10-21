import { roverConfig as c } from '../config/roverConfig';
import type { ControlInput, VehicleState } from '../types';

export const initialVehicle = (): VehicleState => ({
  x: 0, z: 0, heading: 0, speed: 0, steering: 0, distance: 0, wheelAngle: 0, pitch: 0, roll: 0,
});
export const wrapAngle = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const approach = (value: number, target: number, step: number) => value + Math.sign(target - value) * Math.min(Math.abs(target - value), step);

export function stepMotion(state: VehicleState, input: ControlInput, dt: number, speedLimit: number): VehicleState {
  const step = Math.max(0, Math.min(dt, 0.05));
  const target = input.throttle * speedLimit;
  const speed = approach(state.speed, target, (input.throttle ? c.acceleration : c.braking) * step);
  const steering = approach(state.steering, input.steer * c.maxSteering, step * 1.8);
  const turn = speed / c.wheelbase * Math.tan(steering);
  const heading = wrapAngle(state.heading + turn * step);
  const traveled = speed * step;
  return {
    x: state.x + Math.cos(state.heading + turn * step / 2) * traveled,
    z: state.z + Math.sin(state.heading + turn * step / 2) * traveled,
    heading, speed, steering,
    distance: state.distance + Math.abs(traveled),
    wheelAngle: state.wheelAngle + traveled / c.wheelRadius,
    pitch: -0.025 * input.throttle * Math.abs(speed),
    roll: -turn * speed * 0.025,
  };
}
