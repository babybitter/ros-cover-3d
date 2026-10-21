import { afterEach, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { detailProfiles, mechanicalConfig as m, roverConfig } from '../config/roverConfig';
import { createCameraHousing, createChassisDeck, createCoilSpring, createFastener, createGear, createMetalBracket, createMountingPlate, createRoundedPanel } from '../rover/geometry';
import { useSimulation } from '../stores/simulationStore';

const resources: THREE.BufferGeometry[] = [];
function track<T extends THREE.BufferGeometry>(geometry: T): T {
  resources.push(geometry);
  return geometry;
}
afterEach(() => {
  resources.splice(0).forEach(geometry => geometry.dispose());
  useSimulation.getState().reset();
  useSimulation.getState().patch({ bodyMode: 'full', detailLevel: 'detail' });
});

describe('mechanical geometry', () => {
  it('creates finite solid parts with nonzero bounds', () => {
    const geometries = [
      createCameraHousing([0.21, 0.18, 0.22]),
      createFastener(0.027, 0.024),
      createGear(0.23, 20),
      createMetalBracket(0.22, 0.22, 0.032),
      createRoundedPanel([0.5, 0.2, 0.036], 0.014),
      createCoilSpring(0.066, 0.4, 8, 0.012, 144),
    ].map(track);
    for (const geometry of geometries) {
      expect(Array.from(geometry.getAttribute('position').array).every(Number.isFinite)).toBe(true);
      geometry.computeBoundingBox();
      const size = geometry.boundingBox!.getSize(new THREE.Vector3());
      expect(Math.min(size.x, size.y, size.z)).toBeGreaterThan(0);
    }
    expect(geometries[4].boundingBox!.getSize(new THREE.Vector3()).toArray()).toEqual(
      expect.arrayContaining([expect.closeTo(0.5), expect.closeTo(0.2), expect.closeTo(0.036)]),
    );
  });

  it('keeps mounting holes and vents physically open for raycasts', () => {
    const geometry = track(createMountingPlate({
      outline: [[-1, -1], [1, -1], [1, 1], [-1, 1]],
      holes: [{ x: -0.4, y: 0, radius: 0.18 }],
      slots: [{ x: 0.4, y: 0, width: 0.15, height: 0.6 }],
      thickness: 0.04,
    }));
    const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
    try {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.updateMatrixWorld();
      const hits = (x: number, y: number) => new THREE.Raycaster(new THREE.Vector3(x, y, 1), new THREE.Vector3(0, 0, -1)).intersectObject(mesh);
      expect(hits(-0.4, 0)).toHaveLength(0);
      expect(hits(0.4, 0)).toHaveLength(0);
      expect(hits(0, 0.6).length).toBeGreaterThan(0);
    } finally { material.dispose(); }
  });

  it('leaves lateral clearance between the wishbone and the unsteered tire', () => {
    const c = m.suspension;
    const geometry = track(createMetalBracket(c.halfSpan, c.outerZ - c.innerZ, c.armThickness));
    geometry.rotateX(Math.PI / 2);
    geometry.translate(0, c.lowerY, c.innerZ);
    geometry.computeBoundingBox();
    expect(geometry.boundingBox!.max.z).toBeLessThan(roverConfig.track / 2 - roverConfig.wheelWidth / 2);
  });

  it('keeps the notched deck clear around the wheel-side suspension envelope', () => {
    const c = m.chassis;
    const geometry = track(createChassisDeck(c.deckLength, c.deckWidth, c.spineHalfWidth, c.centerHalfLength, 0.06));
    geometry.computeBoundingBox();
    const box = geometry.boundingBox!;
    expect(box.min.x).toBeCloseTo(-c.deckLength / 2, 2);
    expect(box.max.x).toBeCloseTo(c.deckLength / 2, 2);
    expect(box.min.y).toBeCloseTo(-c.deckWidth / 2, 2);
    expect(box.max.y).toBeCloseTo(c.deckWidth / 2, 2);

    const ray = new THREE.Raycaster(new THREE.Vector3(0.85, 1, 0.7), new THREE.Vector3(0, -1, 0));
    const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial());
    mesh.rotation.x = Math.PI / 2;
    mesh.updateMatrixWorld();
    try {
      expect(ray.intersectObject(mesh)).toHaveLength(0);
      ray.set(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, -1, 0));
      expect(ray.intersectObject(mesh).length).toBeGreaterThan(0);
    } finally { mesh.material.dispose(); }
  });

  it('supports the camera beam above the fixed carrier throughout its pan range', () => {
    const c = m.cameras;
    const beamBottom = c.panPivot[1] + c.rotatingBeamOffset[1] - c.rotatingBeamSize[1] / 2;
    const fixedTop = c.frontBeam[1] + c.frontBeamSize[1] / 2;
    expect(beamBottom - fixedTop).toBeGreaterThan(0.1);
    expect(beamBottom).toBeGreaterThan(1.025 + 0.085 + 0.005);
    expect(Math.abs(c.panPivot[0] - c.frontBeam[0]) + c.bearingRadius).toBeLessThan(c.frontBeamSize[0] / 2);
    const material = new THREE.MeshBasicMaterial();
    try {
      const beam = new THREE.Mesh(track(new THREE.BoxGeometry(...c.rotatingBeamSize)), material);
      for (const pan of [-35, 0, 35]) {
        const root = new THREE.Group();
        root.position.set(...c.panPivot);
        root.rotation.y = pan * Math.PI / 180;
        beam.position.set(...c.rotatingBeamOffset);
        root.add(beam);
        root.updateMatrixWorld(true);
        const localBearing = beam.worldToLocal(new THREE.Vector3(c.panPivot[0], beamBottom, 0));
        expect(Math.abs(localBearing.x)).toBeLessThan(c.rotatingBeamSize[0] / 2 - c.bearingRadius);
        expect(Math.abs(localBearing.z)).toBeLessThan(c.rotatingBeamSize[2] / 2 - c.bearingRadius);
        expect(localBearing.y).toBeCloseTo(-c.rotatingBeamSize[1] / 2);
      }
    } finally { material.dispose(); }
  });

  it('keeps the shock absorber between its configured mounts and below the camera carrier', () => {
    const c = m.suspension;
    const length = Math.hypot(
      c.shockTop[0] - c.shockBottom[0],
      c.shockTop[1] - c.shockBottom[1],
      c.shockTop[2] - c.shockBottom[2],
    );
    expect(length).toBeGreaterThan(0.45);
    expect(c.shockBottom[1]).toBeGreaterThan(c.lowerY);
    expect(c.shockTop[1]).toBeLessThan(1.12);
    expect(c.shockTop[2]).toBeGreaterThan(c.innerZ);
  });

  it('reduces spring geometry in the performance profile without changing its envelope', () => {
    const c = m.suspension;
    const make = (segments: number) => track(createCoilSpring(c.springRadius, 0.4, c.springTurns, c.springWire, segments));
    const detail = make(detailProfiles.detail.springSegments), performance = make(detailProfiles.performance.springSegments);
    expect(performance.getAttribute('position').count).toBeLessThan(detail.getAttribute('position').count * 0.6);
    for (const geometry of [detail, performance]) {
      geometry.computeBoundingBox();
      expect(geometry.boundingBox!.getSize(new THREE.Vector3()).y).toBeCloseTo(0.42, 1);
    }
  });
});

describe('display settings and navigation', () => {
  it('preserves an active navigation route when changing model appearance', () => {
    const s = useSimulation.getState();
    s.reset();
    s.navigate();
    const path = useSimulation.getState().path;
    expect(useSimulation.getState().navStatus).toBe('running');
    s.patch({ bodyMode: 'transparent', detailLevel: 'performance' });
    expect(useSimulation.getState().path).toBe(path);
    expect(useSimulation.getState().navStatus).toBe('running');
    expect(useSimulation.getState().mode).toBe('auto');
  });

  it('retains selected shell and quality settings on simulation reset', () => {
    useSimulation.getState().patch({ bodyMode: 'bare', detailLevel: 'performance' });
    useSimulation.getState().reset();
    expect(useSimulation.getState().bodyMode).toBe('bare');
    expect(useSimulation.getState().detailLevel).toBe('performance');
  });
});
