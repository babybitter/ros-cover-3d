import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Bolt, Cylinder, materials, Rod } from './Primitives';
import { runtime } from '../simulation/VehicleController';
import { detailProfiles } from '../config/roverConfig';
import { useSimulation } from '../stores/simulationStore';
import { createGear, createMountingPlate } from './geometry';
import { useGeometry } from './useGeometry';

function Gear({ radius, teeth, position, ratio = 1 }: { radius: number; teeth: number; position: [number, number, number]; ratio?: number }) {
  const ref = useRef<THREE.Group>(null!);
  const segments = useSimulation(s => detailProfiles[s.detailLevel].radialSegments);
  const geometry = useGeometry(`gear:${radius}:${teeth}:${segments}`, () => createGear(radius, teeth, segments));
  useFrame(() => { ref.current.rotation.z = runtime.vehicle.wheelAngle * ratio; });
  return <group position={position}>
    <group ref={ref} name={`gear-spin-${teeth}`}><mesh geometry={geometry} material={materials.silver} dispose={null} castShadow /></group>
    <Cylinder radius={radius * 0.17} length={0.14} rotation={[Math.PI / 2, 0, 0]} material="bronze" position={[0, 0, -0.02]} />
    <Cylinder radius={radius * 0.25} length={0.022} rotation={[Math.PI / 2, 0, 0]} material="dark" position={[0, 0, -0.037]} />
    <Bolt position={[0, 0, 0.055]} scale={0.75} />
  </group>;
}
function Bracket({ side }: { side: number }) {
  const geometry = useGeometry('gear:carrier', () => createMountingPlate({
    outline: [[-0.86, -0.14], [0.86, -0.14], [0.72, 0.35], [0.42, 0.46], [-0.42, 0.46], [-0.72, 0.35]],
    holes: [{ x: -0.58, y: 0.05, radius: 0.13 }, { x: 0, y: 0.15, radius: 0.2 }, { x: 0.58, y: 0.05, radius: 0.13 }],
    thickness: 0.045, bevel: 0.008,
  }));
  return <group name={`gear-assembly-${side}`} position={[0, 1.09, side * 0.67]} rotation={[0, side < 0 ? Math.PI : 0, 0]}>
    <mesh geometry={geometry} material={materials.dark} dispose={null} castShadow />
    {[-0.7, 0.7].map(x => <Bolt key={x} position={[x, -0.06, 0.031]} />)}
    {[[-0.52, 0.17], [-0.165, 0.32], [0.22, 0.25], [0.55, 0.09]].map(([x, y]) => <Rod key={x} from={[x - 0.1, -0.1, 0.033]} to={[x, y, 0.033]} radius={0.018} material="edge" />)}
    <Gear radius={0.23} teeth={20} position={[-0.52, 0.17, 0.075]} />
    <Gear radius={0.16} teeth={14} position={[-0.165, 0.32, 0.08]} ratio={-20 / 14} />
    <Gear radius={0.24} teeth={22} position={[0.22, 0.25, 0.075]} ratio={20 / 22} />
    <Gear radius={0.13} teeth={12} position={[0.55, 0.09, 0.08]} ratio={-20 / 12} />
  </group>;
}
export function GearSystem() { return <>{[-1, 1].map(side => <Bracket key={side} side={side} />)}</>; }
