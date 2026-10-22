import { afterEach, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { explosionConfig as e } from '../config/explosionConfig';
import { AssemblyAnimationController, partProgress, smootherstep } from '../simulation/AssemblyAnimationController';
import { assemblyAnimation, publishAssembly, useAssembly } from '../stores/assemblyStore';
import { useSimulation } from '../stores/simulationStore';

function settle(controller: AssemblyAnimationController) {
  for (let i = 0; i < 1200 && controller.playing; i++) controller.advance(1 / 120);
  expect(controller.playing).toBe(false);
}
afterEach(() => {
  useAssembly.getState().restore();
  useAssembly.getState().setSpeed(1);
});

describe('assembly timeline', () => {
  it('has smooth endpoints and opens protection before sensors, wheels and internals', () => {
    expect(smootherstep(-1)).toBe(0);
    expect(smootherstep(2)).toBe(1);
    expect(smootherstep(0.5)).toBe(0.5);
    expect(partProgress(0.1, e.shellSide(1))).toBeGreaterThan(0);
    expect(partProgress(0.1, e.lidar)).toBe(0);
    expect(partProgress(0.25, e.lidar)).toBeGreaterThan(0);
    expect(partProgress(0.25, e.wheel(1, 1))).toBe(0);
    expect(partProgress(0.45, e.wheel(1, 1))).toBeGreaterThan(0);
    expect(partProgress(0.45, e.deck)).toBe(0);
    expect(partProgress(1, e.deck)).toBe(1);
    expect(e.wheel(1, -1).offset[2]).toBe(-e.wheel(1, 1).offset[2]);
    expect(e.lidar.offset[1]).toBeGreaterThan(0);
  });

  it('produces the same positions and velocity at different frame rates', () => {
    const controllers = [new AssemblyAnimationController(), new AssemblyAnimationController()];
    controllers.forEach(c => c.play(1));
    for (let i = 0; i < 18; i++) controllers[0].advance(1 / 30);
    for (let i = 0; i < 144; i++) controllers[1].advance(1 / 240);
    expect(controllers[0].progress).toBeCloseTo(controllers[1].progress, 12);
    expect(controllers[0].velocity).toBeCloseTo(controllers[1].velocity, 12);
    expect(controllers[0].progress).toBeCloseTo(0.5, 12);
    settle(controllers[0]);
    expect(controllers[0].progress).toBe(1);
  });

  it('keeps position and velocity continuous when reversing midflight', () => {
    const c = new AssemblyAnimationController();
    const object = new THREE.Group();
    c.register(object, e.shellSide(1));
    c.play(1);
    c.advance(0.13);
    const position = object.position.clone(), velocity = c.velocity, progress = c.progress;
    c.play(0);
    expect(object.position.equals(position)).toBe(true);
    expect(c.velocity).toBe(velocity);
    expect(c.progress).toBe(progress);
    c.advance(0.0001);
    expect(object.position.distanceTo(position)).toBeLessThan(0.001);
    settle(c);
    expect(object.position.toArray()).toEqual([0, 0, 0]);
  });

  it('restores exact local transforms after 40 interrupted cycles, without touching children or geometry', () => {
    const c = new AssemblyAnimationController();
    const parent = new THREE.Group(), object = new THREE.Group(), spin = new THREE.Group();
    parent.rotation.set(0.2, 0.7, 0.1);
    parent.position.set(3, 2, -4);
    object.position.set(1.12, 0.33, -0.7);
    object.rotation.set(0.2, -0.1, 0.4);
    object.scale.set(-1, 2, 0.75);
    parent.add(object); object.add(spin);
    const original = { p: object.position.clone(), q: object.quaternion.clone(), s: object.scale.clone() };
    const cleanup = c.register(object, e.wheel(1, -1));
    for (let i = 0; i < 40; i++) {
      c.play(1); c.advance(0.21);
      c.play(0); c.advance(0.06);
      c.play(1); settle(c);
      expect(object.position.z).toBe(original.p.z + e.wheel(1, -1).offset[2]);
      spin.rotation.z += 0.1;
      c.play(0); settle(c);
      expect(object.position.equals(original.p)).toBe(true);
      expect(object.quaternion.equals(original.q)).toBe(true);
      expect(object.scale.equals(original.s)).toBe(true);
    }
    expect(spin.rotation.z).toBeCloseTo(4);
    c.seek(1);
    cleanup();
    expect(object.position.equals(original.p)).toBe(true);
    c.seek(0.5);
    expect(object.position.equals(original.p)).toBe(true);
  });

  it('registers at current progress, rejects duplicates and supports remount without drift', () => {
    const c = new AssemblyAnimationController();
    const o = new THREE.Group();
    c.seek(0.7);
    const clean = c.register(o, e.lidar);
    const position = o.position.clone();
    expect(position.y).toBeGreaterThan(0);
    expect(() => c.register(o, e.lidar)).toThrow('already registered');
    clean();
    c.register(o, e.lidar);
    expect(o.position.equals(position)).toBe(true);
    c.seek(0);
    expect(o.position.y).toBe(0);
  });

  it('scrubbing cancels playback and replay returns smoothly through assembly', () => {
    const c = new AssemblyAnimationController();
    c.play(1); c.advance(0.2);
    c.seek(0.42); c.advance(2);
    expect(c.progress).toBe(0.42);
    expect(c.playing).toBe(false);
    c.replay();
    expect(c.progress).toBe(0.42);
    expect(c.target).toBe(0);
    let visitedAssembly = false;
    for (let i = 0; i < 600 && c.playing; i++) {
      c.advance(1 / 120);
      if (c.target === 1 && c.progress < 0.001) visitedAssembly = true;
    }
    expect(visitedAssembly).toBe(true);
    expect(c.progress).toBe(1);
    c.seek(0);
    c.replay();
    expect(c.target).toBe(1);
    c.seek(0.3); c.play(0); settle(c);
    expect(c.progress).toBe(0);
  });

  it('changes speed in place, clamps inputs, ignores invalid time and settles after stalls', () => {
    const slow = new AssemblyAnimationController(), fast = new AssemblyAnimationController();
    slow.play(1); fast.play(1); fast.setSpeed(2);
    slow.advance(0.4); fast.advance(0.2);
    expect(slow.progress).toBe(fast.progress);
    const p = fast.progress;
    fast.setSpeed(0.5);
    expect(fast.progress).toBe(p);
    fast.advance(NaN); fast.advance(-1); fast.seek(NaN);
    expect(fast.progress).toBe(p);
    fast.advance(60);
    expect(fast.progress).toBe(1);
    expect(fast.velocity).toBe(0);
    fast.setSpeed(100); expect(fast.speed).toBe(3);
    fast.setSpeed(-1); expect(fast.speed).toBe(0.25);
    fast.seek(-5); expect(fast.progress).toBe(0);
    fast.seek(5); expect(fast.progress).toBe(1);
    expect(() => new AssemblyAnimationController(0)).toThrow();
  });

  it('uses the configured duration with gradual acceleration and exact completion', () => {
    const c = new AssemblyAnimationController(1.2);
    c.play(1);
    c.advance(0.12);
    expect(c.progress).toBeLessThan(0.01);
    c.advance(0.48);
    expect(c.progress).toBeCloseTo(0.5);
    c.advance(0.48);
    expect(c.progress).toBeGreaterThan(0.99);
    c.advance(0.13);
    expect(c.progress).toBe(1);
    expect(c.velocity).toBe(0);
    expect(c.playing).toBe(false);
  });

  it('brakes within travel bounds on repeated reversals, including near endpoints', () => {
    for (const elapsed of [0.001, 0.1, 0.6, 1.1, 1.199]) {
      const c = new AssemblyAnimationController();
      c.play(1); c.advance(elapsed);
      c.play(0);
      for (let i = 0; i < 300; i++) {
        if (i % 19 === 0) c.play(c.target ? 0 : 1);
        c.advance(1 / 120);
        expect(c.progress).toBeGreaterThanOrEqual(0);
        expect(c.progress).toBeLessThanOrEqual(1);
      }
      c.play(0); settle(c);
      expect(c.progress).toBe(0);
    }
  });

  it('updates guide endpoints in parent space and fades them out on assembly', () => {
    const c = new AssemblyAnimationController();
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
    const material = new THREE.LineBasicMaterial({ transparent: true });
    const guide = new THREE.LineSegments(geometry, material), o = new THREE.Group();
    o.position.set(0.2, 0.1, 0.3);
    const cleanup = c.register(o, e.lidar, guide);
    c.seek(1);
    const positions = geometry.getAttribute('position');
    expect(positions.getY(0)).toBeCloseTo(1.24);
    expect(positions.getY(1) - positions.getY(0)).toBeCloseTo(e.lidar.offset[1]);
    expect(material.opacity).toBeCloseTo(0.22);
    expect(guide.visible).toBe(true);
    c.play(0); settle(c);
    expect(material.opacity).toBe(0);
    expect(guide.visible).toBe(false);
    cleanup(); geometry.dispose(); material.dispose();
  });
});

describe('assembly UI and existing toggle integration', () => {
  it('accepts the existing toggle and publishes actual motion without changing navigation', () => {
    const state = useSimulation.getState();
    state.reset(); state.navigate();
    const path = useSimulation.getState().path;
    state.patch({ exploded: true });
    expect(assemblyAnimation.target).toBe(1);
    assemblyAnimation.advance(0.2); publishAssembly();
    expect(useAssembly.getState().progress).toBe(assemblyAnimation.progress);
    expect(useSimulation.getState().path).toBe(path);
    expect(useSimulation.getState().navStatus).toBe('running');
    state.patch({ exploded: false });
    expect(assemblyAnimation.target).toBe(0);
    state.reset();
  });

  it('keeps scrubbing authoritative and supports reset and replay through store actions', () => {
    useSimulation.getState().patch({ exploded: true });
    useAssembly.getState().seek(0.35);
    expect(assemblyAnimation.progress).toBe(0.35);
    expect(assemblyAnimation.playing).toBe(false);
    expect(useSimulation.getState().exploded).toBe(true);
    assemblyAnimation.advance(2);
    expect(assemblyAnimation.progress).toBe(0.35);
    useAssembly.getState().setSpeed(1.5);
    expect(assemblyAnimation.speed).toBe(1.5);
    useAssembly.getState().replay();
    expect(assemblyAnimation.target).toBe(0);
    useAssembly.getState().restore();
    expect(useSimulation.getState().exploded).toBe(false);
    expect(useAssembly.getState().progress).toBe(0);
    expect(useAssembly.getState().playing).toBe(false);
  });
});
