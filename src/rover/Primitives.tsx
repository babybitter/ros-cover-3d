import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { ThreeElements } from '@react-three/fiber';

export const materials = {
  silver: new THREE.MeshStandardMaterial({ color: '#b3bec8', metalness: 0.85, roughness: 0.29 }),
  edge: new THREE.MeshStandardMaterial({ color: '#e0e7ec', metalness: 0.78, roughness: 0.24 }),
  dark: new THREE.MeshStandardMaterial({ color: '#262d33', metalness: 0.65, roughness: 0.35 }),
  black: new THREE.MeshStandardMaterial({ color: '#111619', metalness: 0.35, roughness: 0.44 }),
  rubber: new THREE.MeshStandardMaterial({ color: '#111518', metalness: 0.04, roughness: 0.92 }),
  tread: new THREE.MeshStandardMaterial({ color: '#22272b', metalness: 0.08, roughness: 0.85 }),
  bronze: new THREE.MeshStandardMaterial({ color: '#9a8a60', metalness: 0.8, roughness: 0.32 }),
  glass: new THREE.MeshPhysicalMaterial({ color: '#08709b', metalness: 0.55, roughness: 0.08, clearcoat: 1 }),
  cyan: new THREE.MeshStandardMaterial({ color: '#51e0da', emissive: '#0ce9d6', emissiveIntensity: 3, toneMapped: false }),
  blue: new THREE.MeshStandardMaterial({ color: '#5d9fff', emissive: '#1265ff', emissiveIntensity: 3, toneMapped: false }),
};
export type MaterialName = keyof typeof materials;

export function Box({ size, material = 'silver', ...props }: Omit<ThreeElements['mesh'], 'material'> & { size: [number, number, number]; material?: MaterialName }) {
  return <mesh castShadow receiveShadow material={materials[material]} {...props}><boxGeometry args={size} /></mesh>;
}
export function Cylinder({ radius, length, material = 'silver', ...props }: Omit<ThreeElements['mesh'], 'material'> & { radius: number; length: number; material?: MaterialName }) {
  return <mesh castShadow material={materials[material]} {...props}><cylinderGeometry args={[radius, radius, length, 24]} /></mesh>;
}
export function Bolt({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  return <group position={position} scale={scale}><mesh material={materials.dark} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.032, 0.032, 0.022, 6]} /></mesh><mesh position={[0, 0, 0.013]} material={materials.edge}><ringGeometry args={[0.008, 0.018, 12]} /></mesh></group>;
}
export function Rod({ from, to, radius = 0.025, material = 'silver' }: { from: [number, number, number]; to: [number, number, number]; radius?: number; material?: MaterialName }) {
  const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to);
  const direction = b.clone().sub(a);
  const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
  return <Cylinder position={a.add(b).multiplyScalar(0.5)} quaternion={quaternion} radius={radius} length={direction.length()} material={material} />;
}
export function Decal({ label, color = '#c6d3dd', width = 0.9, height = 0.25, ...props }: ThreeElements['mesh'] & { label: string; color?: string; width?: number; height?: number }) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = color; ctx.font = 'italic 900 174px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(label, 512, 140, 1000);
    const t = new THREE.CanvasTexture(canvas); t.colorSpace = THREE.SRGBColorSpace; return t;
  }, [label, color]);
  useEffect(() => () => texture.dispose(), [texture]);
  return <mesh {...props}><planeGeometry args={[width, height]} /><meshBasicMaterial map={texture} transparent depthWrite={false} toneMapped={false} /></mesh>;
}
