import { useLayoutEffect, useRef } from 'react';
import { InstancedMesh, Object3D } from 'three';
import type { Surface } from './EnvironmentConfig';

export function SurfaceInstances({ surfaces }: { surfaces: Surface[] }) {
  const ref = useRef<InstancedMesh>(null!);
  const first = surfaces[0];
  useLayoutEffect(() => {
    const transform = new Object3D();
    surfaces.forEach((surface, i) => {
      transform.position.set(...surface.center);
      transform.scale.set(...surface.size);
      transform.updateMatrix(); ref.current.setMatrixAt(i, transform.matrix);
    });
    ref.current.instanceMatrix.needsUpdate = true;
    ref.current.computeBoundingSphere();
  }, [surfaces]);
  return <instancedMesh ref={ref} args={[undefined, undefined, surfaces.length]} receiveShadow name={`environment-${first.category}`}>
    {first.kind === 'box' ? <boxGeometry /> : first.kind === 'cylinder' ? <cylinderGeometry args={[0.5, 0.5, 1, 32]} /> : <sphereGeometry args={[0.5, 32, 20]} />}
    <meshStandardMaterial color={first.color} roughness={first.category === 'building' ? 0.64 : 0.88} metalness={first.category === 'furniture' ? 0.3 : 0.05} />
  </instancedMesh>;
}

export function EnvironmentChunk({ groups }: { groups: Surface[][] }) {
  return <group>{groups.map((group, i) => <SurfaceInstances key={i} surfaces={group} />)}</group>;
}
