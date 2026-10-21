import { useLayoutEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Bolt, Box, Cylinder, materials, Torus } from './Primitives';
import { runtime } from '../simulation/VehicleController';
import { detailProfiles, roverConfig as c } from '../config/roverConfig';
import { useSimulation } from '../stores/simulationStore';
import { useGeometry } from './useGeometry';

function Tread() {
  const ref = useRef<THREE.InstancedMesh>(null!);
  const { treadSegments: segments, treadRows: rows } = useSimulation(s => detailProfiles[s.detailLevel]);
  const geometry = useGeometry('wheel:tread', () => new THREE.BoxGeometry(0.082, 0.042, 0.082));
  useLayoutEffect(() => {
    const dummy = new THREE.Object3D();
    for (let i = 0; i < segments; i++) for (let j = 0; j < rows; j++) {
      const a = (i + j * 0.35) / segments * Math.PI * 2;
      dummy.position.set(Math.sin(a) * 0.413, Math.cos(a) * 0.413, (j - (rows - 1) / 2) * (rows === 3 ? 0.092 : 0.16));
      dummy.rotation.set(0, j === 1 ? 0.12 : -0.15, -a); dummy.updateMatrix();
      ref.current.setMatrixAt(i * rows + j, dummy.matrix);
    }
    ref.current.instanceMatrix.needsUpdate = true;
    ref.current.computeBoundingSphere();
    const mesh = ref.current;
    // Instance buffers belong to this mesh; geometry and material belong to the cache.
    return () => { mesh.dispose(); };
  }, [segments, rows]);
  return <instancedMesh key={`${segments}:${rows}`} ref={ref} args={[geometry, materials.tread, segments * rows]} dispose={null} castShadow />;
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
        <Torus radius={0.32} tube={0.068} material="rubber" />
        <Torus radius={0.265} tube={0.018} material="edge" />
        <Cylinder radius={0.248} length={0.026} rotation={[Math.PI / 2, 0, 0]} material="dark" />
        <Torus radius={0.225} tube={0.018} material="silver" />
        {Array.from({ length: 8 }, (_, i) => {
          const a = i * Math.PI / 4;
          return <group rotation={[0, 0, a]} key={i}>
            <Box position={[0, 0.155, s * 0.023]} rotation={[0, 0, 0.17]} material="silver" size={[0.046, 0.155, 0.035]} />
            <Bolt position={[0, 0.205, s * 0.025]} normal={[0, 0, s]} scale={0.65} />
          </group>;
        })}
        <Cylinder radius={0.088} length={0.085} rotation={[Math.PI / 2, 0, 0]} material="silver" />
        <Cylinder radius={0.052} length={0.095} rotation={[Math.PI / 2, 0, 0]} material="black" />
        {Array.from({ length: 5 }, (_, i) => <Bolt key={i} position={[Math.sin(i * 1.257) * 0.065, Math.cos(i * 1.257) * 0.065, s * 0.053]} normal={[0, 0, s]} scale={0.6} />)}
      </group>)}
    </group>
  </group>;
}
