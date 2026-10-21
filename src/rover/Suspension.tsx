import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Box, Cylinder, materials, Rod } from './Primitives';
import { runtime } from '../simulation/VehicleController';

export function Suspension({ x, side }: { x: number; side: number }) {
  const spring = useRef<THREE.Group>(null!);
  const geometry = useMemo(() => {
    const points = Array.from({ length: 241 }, (_, i) => {
      const t = i / 240, angle = t * Math.PI * 2 * 9;
      return new THREE.Vector3(Math.cos(angle) * 0.069, t * 0.43 - 0.215, Math.sin(angle) * 0.069);
    });
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 200, 0.013, 6, false);
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useFrame(() => { spring.current.scale.y = 1 + Math.sin(runtime.elapsed * 7 + x) * Math.abs(runtime.vehicle.speed) * 0.045; });
  return <group>
    <Rod from={[x - 0.26, 0.66, side * 0.5]} to={[x, 0.42, side * 0.95]} radius={0.04} material="dark" />
    <Rod from={[x + 0.26, 0.66, side * 0.5]} to={[x, 0.42, side * 0.95]} radius={0.04} />
    <Rod from={[x - 0.22, 0.91, side * 0.48]} to={[x, 0.58, side * 0.94]} radius={0.025} />
    <group position={[x, 0.84, side * 0.7]} rotation={[side * 0.33, 0, 0]}>
      <Cylinder radius={0.038} length={0.53} material="edge" />
      <Cylinder radius={0.053} length={0.21} material="black" position={[0, -0.16, 0]} />
      <group ref={spring}><mesh geometry={geometry} material={materials.edge} castShadow /></group>
      {[-0.24, 0.24].map(y => <Cylinder key={y} radius={0.083} length={0.035} position={[0, y, 0]} material="dark" />)}
    </group>
    <Box position={[x, 1.1, side * 0.65]} size={[0.21, 0.07, 0.28]} />
  </group>;
}
