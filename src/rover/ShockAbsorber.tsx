import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { mechanicalConfig } from '../config/roverConfig';
import { runtime } from '../simulation/VehicleController';
import { Bolt, Cylinder, Torus } from './Primitives';
import { CoilSpring } from './CoilSpring';

export function ShockAbsorber({ phase }: { phase: number }) {
  const coil = useRef<THREE.Group>(null!);
  const lower = useRef<THREE.Group>(null!);
  const c = mechanicalConfig.suspension;
  const { length, quaternion } = useMemo(() => {
    const direction = new THREE.Vector3(...c.shockTop).sub(new THREE.Vector3(...c.shockBottom));
    return { length: direction.length(), quaternion: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize()) };
  }, [c]);
  const springLength = length - 0.17;
  useFrame(() => {
    // A small visual stroke; this is not a suspension dynamics solver.
    const travel = Math.sin(runtime.elapsed * 7 + phase) * Math.min(Math.abs(runtime.vehicle.speed), 1) * c.travel;
    lower.current.position.y = travel;
    coil.current.scale.y = 1 - travel / springLength;
    coil.current.position.y = length / 2 + travel / 2;
  });
  return <group name="shock-absorber" position={c.shockBottom} quaternion={quaternion}>
    <group ref={lower}>
      <Cylinder position={[0, 0.14, 0]} radius={0.039} length={0.25} material="dark" />
      <Cylinder position={[0, 0.14, 0]} radius={0.041} length={0.04} material="bronze" />
      <Cylinder position={[0, 0.085, 0]} radius={0.083} length={0.024} material="silver" />
      <Torus radius={0.038} tube={0.014} rotation={[0, Math.PI / 2, 0]} material="dark" />
      <Bolt position={[0.022, 0, 0]} normal={[1, 0, 0]} scale={0.75} />
    </group>
    <Cylinder position={[0, length - 0.16, 0]} radius={0.019} length={0.3} material="edge" />
    {[0, 1, 2, 3, 4].map(i => <Cylinder key={i} position={[0, length - 0.13 - i * 0.014, 0]} radius={0.031} length={0.009} material="rubber" />)}
    <group ref={coil} position={[0, length / 2, 0]}><CoilSpring height={springLength} /></group>
    <Cylinder position={[0, length - 0.085, 0]} radius={0.083} length={0.024} material="silver" />
    <Torus position={[0, length, 0]} radius={0.038} tube={0.014} rotation={[0, Math.PI / 2, 0]} material="dark" />
    <Bolt position={[0.022, length, 0]} normal={[1, 0, 0]} scale={0.75} />
  </group>;
}
