import { useLayoutEffect, useMemo, useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { ExplosionPartConfig } from '../config/explosionConfig';
import { assemblyAnimation, publishAssembly } from '../stores/assemblyStore';

export function AssemblyAnimation() {
  const accumulator = useRef(0);
  useFrame((_, dt) => {
    const wasPlaying = assemblyAnimation.playing;
    // Slow frames and background-tab stalls must still show the assembly stroke.
    assemblyAnimation.advance(Math.min(dt, 1 / 15));
    accumulator.current += dt;
    if ((wasPlaying && !assemblyAnimation.playing) || (assemblyAnimation.playing && accumulator.current >= 0.08)) {
      publishAssembly();
      accumulator.current = 0;
    }
  }, -1);
  return null;
}

export function AssemblyPart({ id, config, children }: { id: string; config: ExplosionPartConfig; children: ReactNode }) {
  const object = useRef<THREE.Group>(null!);
  const guide = useRef<THREE.LineSegments<THREE.BufferGeometry, THREE.LineBasicMaterial>>(null!);
  const guidePositions = useMemo(() => new Float32Array(6), []);
  // Config factories may return new objects on rerender; only value changes
  // should unregister a part and recapture its assembled local transform.
  const { offset, anchor, start, end, easing } = config;
  useLayoutEffect(() => assemblyAnimation.register(object.current, {
    offset: [offset[0], offset[1], offset[2]], anchor: [anchor[0], anchor[1], anchor[2]], start, end, easing,
  }, guide.current), [offset[0], offset[1], offset[2], anchor[0], anchor[1], anchor[2], start, end, easing]);
  return <>
    <group ref={object} name={`assembly-${id}`}>{children}</group>
    <lineSegments ref={guide} name={`assembly-guide-${id}`} frustumCulled={false} visible={false}>
      <bufferGeometry><bufferAttribute attach="attributes-position" args={[guidePositions, 3]} /></bufferGeometry>
      <lineBasicMaterial color="#83b8ca" transparent opacity={0} depthWrite={false} />
    </lineSegments>
  </>;
}
