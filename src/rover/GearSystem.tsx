import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Bolt, Cylinder, materials } from './Primitives';
import { runtime } from '../simulation/VehicleController';

function Gear({ radius, teeth, position, ratio = 1 }: { radius: number; teeth: number; position: [number, number, number]; ratio?: number }) {
  const ref = useRef<THREE.Group>(null!);
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    for (let i = 0; i <= teeth * 4; i++) {
      const angle = i / (teeth * 4) * Math.PI * 2;
      const r = radius * (i % 4 === 1 || i % 4 === 2 ? 1 : 0.85);
      const x = Math.cos(angle) * r, y = Math.sin(angle) * r;
      if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
    }
    const center = new THREE.Path(); center.absarc(0, 0, radius * 0.2, 0, Math.PI * 2, true); shape.holes.push(center);
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * Math.PI * 2, hole = new THREE.Path();
      hole.absarc(Math.cos(a) * radius * 0.54, Math.sin(a) * radius * 0.54, radius * 0.17, 0, Math.PI * 2, true); shape.holes.push(hole);
    }
    return new THREE.ExtrudeGeometry(shape, { depth: 0.045, bevelEnabled: true, bevelSegments: 1, steps: 1, bevelSize: 0.005, bevelThickness: 0.005 });
  }, [radius, teeth]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useFrame(() => { ref.current.rotation.z = runtime.vehicle.wheelAngle * ratio; });
  return <group position={position}>
    <group ref={ref} name={`gear-spin-${teeth}`}><mesh geometry={geometry} material={materials.silver} castShadow /></group>
    <Cylinder radius={radius * 0.17} length={0.09} rotation={[Math.PI / 2, 0, 0]} material="bronze" position={[0, 0, 0.02]} />
    <Bolt position={[0, 0, 0.075]} />
  </group>;
}
function Bracket({ side }: { side: number }) {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-0.86, -0.14); shape.lineTo(0.86, -0.14); shape.lineTo(0.72, 0.35); shape.lineTo(0.42, 0.46); shape.lineTo(-0.42, 0.46); shape.lineTo(-0.72, 0.35); shape.closePath();
    for (const [x, y, r] of [[-0.58, 0.05, 0.13], [0, 0.15, 0.2], [0.58, 0.05, 0.13]]) {
      const hole = new THREE.Path(); hole.absarc(x, y, r, 0, Math.PI * 2, true); shape.holes.push(hole);
    }
    return new THREE.ExtrudeGeometry(shape, { depth: 0.045, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.008, bevelSegments: 1 });
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return <group position={[0, 1.09, side * 0.67]} rotation={[0, side < 0 ? Math.PI : 0, 0]}>
    <mesh geometry={geometry} material={materials.dark} castShadow />
    {[-0.7, 0.7].map(x => <Bolt key={x} position={[x, -0.06, 0.06]} />)}
    <Gear radius={0.23} teeth={20} position={[-0.52, 0.17, 0.075]} />
    <Gear radius={0.16} teeth={14} position={[-0.165, 0.32, 0.08]} ratio={-20 / 14} />
    <Gear radius={0.24} teeth={22} position={[0.22, 0.25, 0.075]} ratio={20 / 22} />
    <Gear radius={0.13} teeth={12} position={[0.55, 0.09, 0.08]} ratio={-20 / 12} />
  </group>;
}
export function GearSystem() { return <>{[-1, 1].map(side => <Bracket key={side} side={side} />)}</>; }
