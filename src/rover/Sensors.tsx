import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Bolt, Box, Cylinder, Decal, Rod } from './Primitives';
import { runtime } from '../simulation/VehicleController';
import { AssemblyPart } from './AssemblyPart';
import { explosionConfig as e } from '../config/explosionConfig';
export { Cameras } from './CameraMountAssembly';

export function Lidar() {
  const spin = useRef<THREE.Group>(null!);
  useFrame(() => { spin.current.rotation.y = runtime.elapsed * 9; });
  return <group>
    {[-0.26, 0.26].map(x => [-0.25, 0.25].map(z => <Rod key={`${x}-${z}`} from={[x, 1.14, z]} to={[x * 0.75, 1.62, z * 0.75]} radius={0.025} />))}
    <Box size={[0.58, 0.045, 0.58]} position={[0, 1.62, 0]} material="edge" />
    <Cylinder position={[0, 1.69, 0]} radius={0.235} length={0.1} material="dark" />
    <Cylinder position={[0, 1.75, 0]} radius={0.24} length={0.025} material="silver" />
    <AssemblyPart id="lidar-head" config={e.lidarHead}><group ref={spin} name="lidar-spin" position={[0, 1.88, 0]}>
      <Cylinder radius={0.22} length={0.24} material="black" />
      <Cylinder radius={0.225} length={0.075} material="glass" />
      <Cylinder position={[0, 0.12, 0]} radius={0.23} length={0.04} material="dark" />
      <Box size={[0.015, 0.026, 0.07]} position={[0.225, 0, 0]} material="cyan" />
      <Decal label="LIDAR" position={[0, 0.07, 0.224]} width={0.16} height={0.04} />
    </group></AssemblyPart>
    {[-0.23, 0.23].map(x => [-0.23, 0.23].map(z => <Bolt key={`${x}-${z}`} position={[x, 1.65, z]} normal={[0, 1, 0]} scale={0.7} />))}
  </group>;
}
