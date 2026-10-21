import { mechanicalConfig as config } from '../config/roverConfig';
import { createMetalBracket } from './geometry';
import { useGeometry } from './useGeometry';
import { Bolt, Cylinder, materials } from './Primitives';

export function SuspensionArm({ y, upper = false }: { y: number; upper?: boolean }) {
  const c = config.suspension;
  const span = c.halfSpan * (upper ? 0.83 : 1);
  const geometry = useGeometry(`control-arm:${span}`, () => createMetalBracket(span, c.outerZ - c.innerZ, c.armThickness));
  return <group name={upper ? 'upper-control-arm' : 'lower-control-arm'} position={[0, y, c.innerZ]}>
    <mesh rotation={[Math.PI / 2, 0, 0]} geometry={geometry} material={materials.silver} castShadow dispose={null} />
    {[-span, span].map(x => <group key={x} position={[x, 0, 0]}>
      <Cylinder radius={c.jointRadius} length={0.09} rotation={[0, 0, Math.PI / 2]} material="dark" />
      <Bolt position={[Math.sign(x) * 0.05, 0, 0]} normal={[Math.sign(x), 0, 0]} scale={0.85} />
    </group>)}
    <Cylinder position={[0, 0, c.outerZ - c.innerZ]} radius={c.jointRadius} length={0.065} material="dark" />
    <Bolt position={[0, 0.04, c.outerZ - c.innerZ]} normal={[0, 1, 0]} scale={0.8} />
  </group>;
}
