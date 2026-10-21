import * as THREE from 'three';
import type { Vec3 } from '../config/roverConfig';

export interface PlateOptions {
  outline: [number, number][];
  holes?: { x: number; y: number; radius: number }[];
  slots?: { x: number; y: number; width: number; height: number }[];
  thickness: number;
  bevel?: number;
  segments?: number;
}

export function createMountingPlate({ outline, holes = [], slots = [], thickness, bevel = 0.006, segments = 16 }: PlateOptions): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  outline.forEach(([x, y], i) => i ? shape.lineTo(x, y) : shape.moveTo(x, y));
  shape.closePath();
  for (const hole of holes) {
    const path = new THREE.Path();
    path.absarc(hole.x, hole.y, hole.radius, 0, Math.PI * 2, true);
    shape.holes.push(path);
  }
  for (const { x, y, width, height } of slots) {
    const path = new THREE.Path();
    path.moveTo(x - width / 2, y - height / 2);
    path.lineTo(x - width / 2, y + height / 2);
    path.lineTo(x + width / 2, y + height / 2);
    path.lineTo(x + width / 2, y - height / 2);
    path.closePath();
    shape.holes.push(path);
  }
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: thickness, bevelEnabled: bevel > 0, bevelThickness: bevel,
    bevelSize: bevel, bevelSegments: 2, curveSegments: segments, steps: 1,
  });
  geometry.translate(0, 0, -thickness / 2);
  return geometry;
}

export function createMetalBracket(span: number, reach: number, thickness: number): THREE.ExtrudeGeometry {
  return createMountingPlate({
    // Open fork: the coil passes between the two branches, behind the outer joint.
    outline: [[-span, -0.045], [-span, reach * 0.65], [-0.045, reach + 0.015],
      [0.045, reach + 0.015], [span, reach * 0.65], [span, -0.045],
      [span - 0.055, -0.045], [span - 0.055, reach * 0.55],
      [0.03, reach - 0.03], [-0.03, reach - 0.03],
      [-span + 0.055, reach * 0.55], [-span + 0.055, -0.045]],
    thickness, bevel: 0.007,
  });
}

export function createChassisDeck(length: number, width: number, spineHalfWidth: number, centerHalfLength: number, thickness: number): THREE.ExtrudeGeometry {
  const x = length / 2, z = width / 2, s = spineHalfWidth, c = centerHalfLength;
  return createMountingPlate({
    outline: [[-x, -s], [-c, -s], [-c, -z], [c, -z], [c, -s], [x, -s],
      [x, s], [c, s], [c, z], [-c, z], [-c, s], [-x, s]],
    thickness, bevel: 0.004,
  });
}

export function createCoilSpring(radius: number, height: number, turns: number, wire: number, segments: number): THREE.TubeGeometry {
  const points = Array.from({ length: segments + 1 }, (_, i) => {
    const t = i / segments, angle = t * Math.PI * 2 * turns;
    return new THREE.Vector3(Math.cos(angle) * radius, (t - 0.5) * height, Math.sin(angle) * radius);
  });
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), segments, wire, 6, false);
}

export function createRoundedPanel(size: Vec3, bevel = 0.012): THREE.ExtrudeGeometry {
  const [x, y, z] = size;
  // Inset the extrusion so the outer dimensions include the bevel.
  return createMountingPlate({
    outline: [[-x / 2 + bevel, -y / 2 + bevel], [x / 2 - bevel, -y / 2 + bevel],
      [x / 2 - bevel, y / 2 - bevel], [-x / 2 + bevel, y / 2 - bevel]],
    thickness: z - bevel * 2, bevel,
  });
}

export function createGear(radius: number, teeth: number, segments = 16): THREE.ExtrudeGeometry {
  const outline: [number, number][] = [];
  for (let i = 0; i < teeth * 4; i++) {
    const angle = i / (teeth * 4) * Math.PI * 2;
    const r = i % 4 === 1 || i % 4 === 2 ? radius : radius * 0.85;
    outline.push([Math.cos(angle) * r, Math.sin(angle) * r]);
  }
  const holes = [{ x: 0, y: 0, radius: radius * 0.2 }];
  for (let i = 0; i < 5; i++) {
    const angle = i * Math.PI * 2 / 5;
    holes.push({ x: Math.cos(angle) * radius * 0.54, y: Math.sin(angle) * radius * 0.54, radius: radius * 0.17 });
  }
  return createMountingPlate({ outline, holes, thickness: 0.045, bevel: 0.005, segments });
}

export function createCameraHousing(size: Vec3): THREE.ExtrudeGeometry {
  return createRoundedPanel(size, 0.009);
}

export function createFastener(radius: number, depth: number): THREE.CylinderGeometry {
  const geometry = new THREE.CylinderGeometry(radius, radius, depth, 6);
  geometry.rotateX(Math.PI / 2);
  return geometry;
}
