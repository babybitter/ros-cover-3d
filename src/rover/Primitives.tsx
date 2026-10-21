import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import type { ThreeElements } from '@react-three/fiber';
import { detailProfiles, materialConfig, mechanicalConfig, type Vec3 } from '../config/roverConfig';
import { useSimulation } from '../stores/simulationStore';
import { useGeometry } from './useGeometry';
import { createFastener } from './geometry';

export const materials = {
  silver: new THREE.MeshStandardMaterial(materialConfig.silver),
  edge: new THREE.MeshStandardMaterial(materialConfig.edge),
  dark: new THREE.MeshStandardMaterial(materialConfig.dark),
  black: new THREE.MeshStandardMaterial(materialConfig.black),
  rubber: new THREE.MeshStandardMaterial(materialConfig.rubber),
  tread: new THREE.MeshStandardMaterial(materialConfig.tread),
  bronze: new THREE.MeshStandardMaterial(materialConfig.bronze),
  shell: new THREE.MeshStandardMaterial(materialConfig.shell),
  transparentShell: new THREE.MeshStandardMaterial({ ...materialConfig.shell, color: '#8eafbd', transparent: true, opacity: 0.23, depthWrite: false }),
  glass: new THREE.MeshPhysicalMaterial({ color: '#08709b', metalness: 0.55, roughness: 0.08, clearcoat: 1 }),
  cyan: new THREE.MeshStandardMaterial({ color: '#51e0da', emissive: '#0ce9d6', emissiveIntensity: 3, toneMapped: false }),
  blue: new THREE.MeshStandardMaterial({ color: '#5d9fff', emissive: '#1265ff', emissiveIntensity: 3, toneMapped: false }),
};
export type MaterialName = keyof typeof materials;

let materialUsers = 0;
let materialTimer: ReturnType<typeof setTimeout> | undefined;
/** The model owns the palette; individual meshes must not dispose shared resources. */
export function useModelMaterials(wireframe: boolean) {
  useEffect(() => {
    clearTimeout(materialTimer);
    materialUsers++;
    return () => {
      materialUsers--;
      materialTimer = setTimeout(() => {
        if (!materialUsers) Object.values(materials).forEach(material => material.dispose());
      }, 0);
    };
  }, []);
  useEffect(() => {
    Object.values(materials).forEach(material => { material.wireframe = wireframe; });
  }, [wireframe]);
}

export function Box({ size, material = 'silver', ...props }: Omit<ThreeElements['mesh'], 'material'> & { size: [number, number, number]; material?: MaterialName }) {
  const geometry = useGeometry(`box:${size.join(',')}`, () => new THREE.BoxGeometry(...size));
  return <mesh castShadow receiveShadow geometry={geometry} material={materials[material]} dispose={null} {...props} />;
}
export function Cylinder({ radius, length, material = 'silver', ...props }: Omit<ThreeElements['mesh'], 'material'> & { radius: number; length: number; material?: MaterialName }) {
  const segments = useSimulation(s => detailProfiles[s.detailLevel].radialSegments);
  const geometry = useGeometry(`cylinder:${radius}:${length}:${segments}`, () => new THREE.CylinderGeometry(radius, radius, length, segments));
  return <mesh castShadow geometry={geometry} material={materials[material]} dispose={null} {...props} />;
}
export function Torus({ radius, tube, material = 'silver', ...props }: Omit<ThreeElements['mesh'], 'material'> & { radius: number; tube: number; material?: MaterialName }) {
  const segments = useSimulation(s => detailProfiles[s.detailLevel].radialSegments);
  const geometry = useGeometry(`torus:${radius}:${tube}:${segments}`, () => new THREE.TorusGeometry(radius, tube, 8, segments * 2));
  return <mesh castShadow geometry={geometry} material={materials[material]} dispose={null} {...props} />;
}
export function Bolt({ position, scale = 1, normal = [0, 0, 1] }: { position: Vec3; scale?: number; normal?: Vec3 }) {
  const detail = useSimulation(s => s.detailLevel === 'detail');
  const c = mechanicalConfig.fastener;
  const geometry = useGeometry('bolt:hex', () => createFastener(c.radius, c.depth));
  const socket = useGeometry('bolt:socket', () => new THREE.CircleGeometry(0.01, 6));
  const quaternion = useMemo(() => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(...normal).normalize()), [normal[0], normal[1], normal[2]]);
  return <group position={position} quaternion={quaternion} scale={scale}>
    {detail && <Cylinder position={[0, 0, -0.006]} radius={c.washerRadius} length={0.007} rotation={[Math.PI / 2, 0, 0]} material="edge" />}
    <mesh geometry={geometry} material={materials.dark} position={[0, 0, 0.008]} dispose={null} />
    {detail && <mesh geometry={socket} material={materials.black} position={[0, 0, 0.0205]} dispose={null} />}
  </group>;
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
