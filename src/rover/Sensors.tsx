import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Bolt, Box, Cylinder, Decal, materials, Rod } from './Primitives';
import { runtime } from '../simulation/VehicleController';
import { useSimulation } from '../stores/simulationStore';

export function Lidar() {
  const spin = useRef<THREE.Group>(null!);
  useFrame(() => { spin.current.rotation.y = runtime.elapsed * 9; });
  return <group>
    {[-0.26, 0.26].map(x => [-0.25, 0.25].map(z => <Rod key={`${x}-${z}`} from={[x, 1.14, z]} to={[x * 0.75, 1.62, z * 0.75]} radius={0.025} />))}
    <Box size={[0.58, 0.045, 0.58]} position={[0, 1.62, 0]} material="edge" />
    <Cylinder position={[0, 1.69, 0]} radius={0.235} length={0.1} material="dark" />
    <Cylinder position={[0, 1.75, 0]} radius={0.24} length={0.025} material="silver" />
    <group ref={spin} name="lidar-spin" position={[0, 1.88, 0]}>
      <Cylinder radius={0.22} length={0.24} material="black" />
      <Cylinder radius={0.225} length={0.075} material="glass" />
      <Cylinder position={[0, 0.12, 0]} radius={0.23} length={0.04} material="dark" />
      <Box size={[0.015, 0.026, 0.07]} position={[0.225, 0, 0]} material="cyan" />
      <Decal label="LIDAR" position={[0, 0.07, 0.224]} width={0.16} height={0.04} />
    </group>
    {[-0.23, 0.23].map(x => [-0.23, 0.23].map(z => <Bolt key={`${x}-${z}`} position={[x, 1.65, z]} scale={0.7} />))}
  </group>;
}
function Lens({ position, radius = 0.065 }: { position: [number, number, number]; radius?: number }) {
  return <group position={position} rotation={[0, Math.PI / 2, 0]}>
    <Cylinder radius={radius * 1.45} length={0.1} material="dark" rotation={[Math.PI / 2, 0, 0]} />
    <Cylinder radius={radius * 1.18} length={0.12} material="silver" rotation={[Math.PI / 2, 0, 0]} />
    <Cylinder radius={radius} length={0.13} material="black" rotation={[Math.PI / 2, 0, 0]} />
    <mesh position={[0, 0, 0.071]} material={materials.glass}><circleGeometry args={[radius * 0.8, 32]} /></mesh>
    <mesh position={[-radius * 0.22, radius * 0.22, 0.073]}><circleGeometry args={[radius * 0.18, 16]} /><meshBasicMaterial color="#7dbbe5" /></mesh>
  </group>;
}
export function Cameras() {
  const pan = useSimulation(s => s.cameraPan);
  return <group>
    <Box size={[0.1, 0.24, 1.18]} position={[1.12, 1.08, 0]} material="silver" />
    <group position={[1.11, 1.25, 0]} rotation={[0, pan * Math.PI / 180, 0]}>
      <Box size={[0.21, 0.21, 0.93]} material="black" />
      <Box size={[0.025, 0.18, 0.89]} position={[0.116, 0, 0]} material="dark" />
      {[-0.31, 0, 0.31].map(z => <Lens key={z} position={[0.16, 0, z]} radius={z === 0 ? 0.076 : 0.059} />)}
      <Decal label="STEREO VISION" position={[0, 0.112, 0]} rotation={[-Math.PI / 2, 0, -Math.PI / 2]} width={0.5} height={0.05} />
    </group>
    <Box size={[0.19, 0.18, 0.32]} position={[0.61, 1.5, 0]} material="dark" />
    <Lens position={[0.73, 1.5, 0]} radius={0.065} />
    <Rod from={[0.61, 1.08, 0]} to={[0.61, 1.43, 0]} radius={0.035} />
    {[-0.48, 0.48].map(z => <group key={z}>
      <Box size={[0.032, 0.055, 0.18]} position={[1.403, 0.81, z]} material={z < 0 ? 'blue' : 'cyan'} />
      <Lens position={[1.41, 0.73, z * 0.49]} radius={0.043} />
    </group>)}
    <Box size={[0.034, 0.055, 0.17]} position={[-1.397, 0.8, 0]} material="blue" />
  </group>;
}
