import { useLayoutEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Bolt, Cylinder, materials } from './Primitives';
import { runtime } from '../simulation/VehicleController';
import { roverConfig as c } from '../config/roverConfig';
import { useSimulation } from '../stores/simulationStore';

function Tread() {
  const ref = useRef<THREE.InstancedMesh>(null!);
  useLayoutEffect(() => {
    const dummy = new THREE.Object3D();
    for (let i = 0; i < 40; i++) for (let j = 0; j < 3; j++) {
      const a = (i + j * 0.35) / 40 * Math.PI * 2;
      dummy.position.set(Math.sin(a) * 0.413, Math.cos(a) * 0.413, (j - 1) * 0.092);
      dummy.rotation.set(0, j === 1 ? 0.12 : -0.15, -a); dummy.updateMatrix();
      ref.current.setMatrixAt(i * 3 + j, dummy.matrix);
    }
    ref.current.instanceMatrix.needsUpdate = true;
  }, []);
  return <instancedMesh ref={ref} args={[undefined, materials.tread, 120]} castShadow><boxGeometry args={[0.082, 0.042, 0.082]} /></instancedMesh>;
}
export function Wheel({ x, side }: { x: number; side: number }) {
  const steer = useRef<THREE.Group>(null!), rotation = useRef<THREE.Group>(null!);
  const exploded = useSimulation(s => s.exploded);
  useFrame(() => {
    steer.current.rotation.y = x > 0 ? -runtime.vehicle.steering : 0;
    rotation.current.rotation.z = -runtime.vehicle.wheelAngle;
  });
  return <group ref={steer} name={`steering-${x}-${side}`} position={[x, c.wheelRadius, side * (c.track / 2 + (exploded ? 0.55 : 0))]}>
    <group ref={rotation} name={`wheel-spin-${x}-${side}`}>
      <Cylinder radius={0.398} length={0.29} material="rubber" rotation={[Math.PI / 2, 0, 0]} />
      <Tread />
      {[-1, 1].map(s => <group key={s} position={[0, 0, s * 0.151]}>
        <mesh material={materials.rubber}><torusGeometry args={[0.32, 0.068, 12, 48]} /></mesh>
        <mesh material={materials.edge}><torusGeometry args={[0.265, 0.018, 8, 48]} /></mesh>
        <Cylinder radius={0.248} length={0.026} rotation={[Math.PI / 2, 0, 0]} material="dark" />
        <mesh material={materials.silver}><torusGeometry args={[0.225, 0.018, 8, 32]} /></mesh>
        {Array.from({ length: 8 }, (_, i) => {
          const a = i * Math.PI / 4;
          return <group rotation={[0, 0, a]} key={i}>
            <mesh position={[0, 0.155, 0.023]} rotation={[0, 0, 0.17]} material={materials.silver} castShadow><boxGeometry args={[0.046, 0.155, 0.035]} /></mesh>
            <Bolt position={[0, 0.205, s * 0.025]} scale={0.65} />
          </group>;
        })}
        <Cylinder radius={0.088} length={0.085} rotation={[Math.PI / 2, 0, 0]} material="silver" />
        <Cylinder radius={0.052} length={0.095} rotation={[Math.PI / 2, 0, 0]} material="black" />
        {Array.from({ length: 5 }, (_, i) => <Bolt key={i} position={[Math.sin(i * 1.257) * 0.065, Math.cos(i * 1.257) * 0.065, s * 0.053]} scale={0.6} />)}
      </group>)}
    </group>
  </group>;
}
