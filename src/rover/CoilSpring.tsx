import { detailProfiles, mechanicalConfig } from '../config/roverConfig';
import { useSimulation } from '../stores/simulationStore';
import { createCoilSpring } from './geometry';
import { useGeometry } from './useGeometry';
import { materials } from './Primitives';

export function CoilSpring({ height }: { height: number }) {
  const segments = useSimulation(s => detailProfiles[s.detailLevel].springSegments);
  const c = mechanicalConfig.suspension;
  const geometry = useGeometry(`coil:${height}:${segments}`, () => createCoilSpring(c.springRadius, height, c.springTurns, c.springWire, segments));
  return <mesh name="coil-spring" geometry={geometry} material={materials.black} castShadow dispose={null} />;
}
