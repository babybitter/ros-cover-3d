import * as THREE from 'three';
import type { Vec3 } from '../config/roverConfig';
import { mechanicalConfig } from '../config/roverConfig';
import { Bolt, Box, Cylinder, materials, Torus } from './Primitives';
import { createCameraHousing } from './geometry';
import { useGeometry } from './useGeometry';

export function Lens({ position, radius = 0.065 }: { position: Vec3; radius?: number }) {
  return <group position={position} rotation={[0, Math.PI / 2, 0]}>
    <Cylinder radius={radius * 1.4} length={0.095} material="dark" rotation={[Math.PI / 2, 0, 0]} />
    <Cylinder radius={radius * 1.17} length={0.12} material="silver" rotation={[Math.PI / 2, 0, 0]} />
    <Cylinder radius={radius} length={0.13} material="black" rotation={[Math.PI / 2, 0, 0]} />
    <Torus position={[0, 0, 0.063]} radius={radius * 0.91} tube={0.005} material="dark" />
    <Cylinder position={[0, 0, 0.068]} radius={radius * 0.8} length={0.006} material="glass" rotation={[Math.PI / 2, 0, 0]} />
    <Cylinder position={[-radius * 0.22, radius * 0.22, 0.073]} radius={radius * 0.12} length={0.002} material="edge" rotation={[Math.PI / 2, 0, 0]} />
  </group>;
}

export function CameraModule({ position, radius = 0.059, id }: { position: Vec3; radius?: number; id: string }) {
  const size = mechanicalConfig.cameras.housingSize;
  const geometry = useGeometry(`camera-housing:${size.join(',')}`, () => createCameraHousing([...size]));
  return <group position={position} name={`camera-module-${id}`}>
    <mesh geometry={geometry} material={materials.black} castShadow dispose={null} />
    <Box position={[0, -0.11, 0]} size={[0.13, 0.035, 0.18]} material="silver" />
    <Cylinder radius={0.036} length={0.03} position={[0, -0.14, 0]} material="dark" />
    <Box position={[0, -0.165, 0]} size={[0.18, 0.025, 0.23]} material="dark" />
    <Lens position={[0.14, 0, 0]} radius={radius} />
    {[-1, 1].map(s => <group key={s}>
      <Bolt position={[0.04, -0.1, s * 0.075]} normal={[0, -1, 0]} scale={0.45} />
      {[0, 1, 2].map(i => <Box key={i} position={[-0.065 + i * 0.037, 0.026, s * 0.113]} size={[0.012, 0.065, 0.006]} material="dark" />)}
    </group>)}
  </group>;
}

export function Cable({ points, radius = 0.012 }: { points: Vec3[]; radius?: number }) {
  const key = `cable:${JSON.stringify(points)}:${radius}`;
  const geometry = useGeometry(key, () => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p))), 24, radius, 6, false));
  return <mesh geometry={geometry} material={materials.rubber} dispose={null} />;
}
