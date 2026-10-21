import { beforeEach, describe, expect, it } from 'vitest';
import { roverConfig as c, initialObstacles } from '../config/roverConfig';
import { collides, raycast } from '../simulation/CollisionDetector';
import { initialVehicle, stepMotion } from '../simulation/MotionModel';
import { planPath } from '../simulation/PathPlanner';
import { SensorSimulator } from '../simulation/SensorSimulator';
import { runtime, updateSimulation } from '../simulation/VehicleController';
import { useSimulation } from '../stores/simulationStore';
import type { Obstacle } from '../types';

const box: Obstacle = { id: 'test', x: 4, z: 0, width: 2, depth: 2, height: 1 };
const planningRadius = c.collisionRadius + 0.12;
const drive = (seconds: number, rate: number) => {
  let v = initialVehicle();
  for (let i = 0; i < seconds * rate; i++) v = stepMotion(v, { throttle: 1, steer: 0 }, 1 / rate, 1);
  return v;
};

describe('bicycle motion model', () => {
  it('accelerates and couples wheel rotation to traveled distance', () => {
    const v = drive(5, 60);
    expect(v.speed).toBeCloseTo(1);
    expect(v.x).toBeGreaterThan(4);
    expect(v.wheelAngle * c.wheelRadius).toBeCloseTo(v.distance, 8);
    expect(v.z).toBe(0);
  });
  it('is consistent across 30 and 120 fps', () => {
    expect(Math.abs(drive(5, 30).x - drive(5, 120).x)).toBeLessThan(0.02);
  });
  it('reverses, turns and brakes', () => {
    let v = initialVehicle();
    for (let i = 0; i < 180; i++) v = stepMotion(v, { throttle: -1, steer: 1 }, 1 / 60, 1);
    expect(v.x).toBeLessThan(-1);
    expect(v.heading).toBeLessThan(-0.2);
    for (let i = 0; i < 60; i++) v = stepMotion(v, { throttle: 0, steer: 0 }, 1 / 60, 1);
    expect(v.speed).toBe(0);
  });
});

describe('collision and sensors', () => {
  it('covers the wheel footprint through the full steering range', () => {
    for (let steering = -c.maxSteering; steering <= c.maxSteering; steering += 0.01) {
      for (const longitudinal of [-c.wheelRadius - 0.025, c.wheelRadius + 0.025]) {
        for (const lateral of [-c.wheelWidth / 2 - 0.02, c.wheelWidth / 2 + 0.02]) {
          const x = c.wheelbase / 2 + Math.cos(steering) * longitudinal - Math.sin(steering) * lateral;
          const z = c.track / 2 + Math.sin(steering) * longitudinal + Math.cos(steering) * lateral;
          expect(Math.hypot(x, z)).toBeLessThanOrEqual(c.collisionRadius);
        }
      }
    }
  });
  it('inflates boxes with a circular safety footprint', () => {
    expect(collides({ x: 2, z: 0 }, [box], 1.1)).toBe(true);
    expect(collides({ x: 2, z: 2 }, [box], 1.1)).toBe(false);
  });
  it('handles forward, parallel, backward and inside rays', () => {
    expect(raycast({ x: 0, z: 0 }, 0, [box], 7)).toBe(3);
    expect(raycast({ x: 0, z: 0 }, Math.PI / 2, [box], 7)).toBe(7);
    expect(raycast({ x: 0, z: 0 }, Math.PI, [box], 7)).toBe(7);
    expect(raycast({ x: 4, z: 0 }, 0, [box], 7)).toBe(0);
  });
  it('produces real obstacle-dependent returns and warning thresholds', () => {
    const sensor = new SensorSimulator(2);
    const reading = sensor.sample(initialVehicle(), [box], 2);
    expect(reading.lidar).toHaveLength(120);
    expect(reading.lidar[0].distance).toBe(3);
    expect(reading.frontDistance).toBeCloseTo(1.6);
    expect(reading.warning).toBe('caution');
    expect(sensor.sample({ ...initialVehicle(), heading: Math.PI }, [box], 2).warning).toBe('clear');
    expect(reading.timestamp).toBe(2);
  });
});

describe('A* planning', () => {
  it('routes around inflated obstacles without clipping any segment', () => {
    const result = planPath(c.map, { x: 0, z: 0 }, { x: 7, z: -5 }, initialObstacles, planningRadius);
    expect(result.path.length).toBeGreaterThan(2);
    expect(result.path[0]).toEqual({ x: 0, z: 0 });
    expect(result.path.at(-1)).toEqual({ x: 7, z: -5 });
    for (let i = 1; i < result.path.length; i++) {
      const a = result.path[i - 1], b = result.path[i];
      for (let j = 0; j <= 20; j++) {
        expect(collides({ x: a.x + (b.x - a.x) * j / 20, z: a.z + (b.z - a.z) * j / 20 }, initialObstacles, planningRadius)).toBe(false);
      }
    }
  });
  it('rejects an occupied endpoint and an unreachable partition', () => {
    expect(planPath(c.map, { x: 0, z: 0 }, box, [box], 1).path).toEqual([]);
    const wall = { ...box, x: 2, depth: 30 };
    expect(planPath(c.map, { x: 0, z: 0 }, { x: 7, z: 0 }, [wall], 1).path).toEqual([]);
  });
  it('preserves off-grid endpoints and rejects unsafe map margins', () => {
    const start = { x: 0.13, z: 0.17 }, goal = { x: 6.08, z: -4.11 };
    const result = planPath(c.map, start, goal, initialObstacles, planningRadius);
    expect(result.path[0]).toEqual(start);
    expect(result.path.at(-1)).toEqual(goal);
    expect(planPath(c.map, start, { x: 9.5, z: 0 }, [], planningRadius).path).toEqual([]);
  });
});

describe('vehicle controller', () => {
  beforeEach(() => {
    useSimulation.getState().reset();
    useSimulation.setState({ obstacles: initialObstacles, goal: { x: 7, z: -5 }, speedLimit: 0.8, timeScale: 1 });
    updateSimulation(0);
  });
  it('follows the default planned route to arrival', () => {
    useSimulation.getState().navigate();
    for (let i = 0; i < 60 * 120 && useSimulation.getState().navStatus === 'running'; i++) updateSimulation(1 / 60);
    const s = useSimulation.getState();
    expect(s.navStatus, JSON.stringify({ v: runtime.vehicle, logs: s.logs.slice(-5) })).toBe('arrived');
    expect(Math.hypot(runtime.vehicle.x - 7, runtime.vehicle.z + 5)).toBeLessThan(0.5);
    expect(runtime.vehicle.speed).toBe(0);
  });
  it('freezes while paused and stops immediately on emergency', () => {
    useSimulation.setState({ input: { throttle: 1, steer: 0 } });
    for (let i = 0; i < 60; i++) updateSimulation(1 / 60);
    useSimulation.setState({ paused: true });
    const x = runtime.vehicle.x;
    updateSimulation(0.05);
    expect(runtime.vehicle.x).toBe(x);
    useSimulation.setState({ paused: false });
    useSimulation.getState().stop(true);
    updateSimulation(1 / 60);
    expect(runtime.vehicle.speed).toBe(0);
  });
  it('prevents manual driving into an obstacle', () => {
    useSimulation.setState({ obstacles: [box], input: { throttle: 1, steer: 0 } });
    for (let i = 0; i < 60 * 12; i++) updateSimulation(1 / 60);
    expect(runtime.vehicle.x).toBeLessThan(3 - c.collisionRadius);
    expect(runtime.vehicle.speed).toBe(0);
  });
  it('invalidates navigation when its target or obstacles are edited', () => {
    useSimulation.getState().navigate();
    for (let i = 0; i < 30; i++) updateSimulation(1 / 60);
    useSimulation.getState().patch({ goal: { x: 6, z: -4 } });
    updateSimulation(1 / 60);
    expect(useSimulation.getState().path).toEqual([]);
    expect(useSimulation.getState().navStatus).toBe('idle');
    expect(runtime.vehicle.speed).toBe(0);
    useSimulation.getState().navigate();
    useSimulation.getState().patch({ obstacles: [...initialObstacles, box] });
    updateSimulation(1 / 60);
    expect(useSimulation.getState().mode).toBe('manual');
    expect(runtime.vehicle.speed).toBe(0);
  });
  it('keeps emergency latched when normal stop is pressed', () => {
    useSimulation.getState().stop(true);
    useSimulation.getState().stop();
    expect(useSimulation.getState().emergency).toBe(true);
  });
  it('substeps slow frames consistently and ignores negative deltas', () => {
    useSimulation.setState({ input: { throttle: 1, steer: 0 } });
    for (let i = 0; i < 20; i++) updateSimulation(0.1);
    const slowX = runtime.vehicle.x;
    useSimulation.getState().reset();
    useSimulation.setState({ input: { throttle: 1, steer: 0 } });
    for (let i = 0; i < 120; i++) updateSimulation(1 / 60);
    expect(Math.abs(runtime.vehicle.x - slowX)).toBeLessThan(0.01);
    const elapsed = runtime.elapsed;
    updateSimulation(-1);
    expect(runtime.elapsed).toBe(elapsed);
  });
});
