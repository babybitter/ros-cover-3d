import { Bolt, Box, Cylinder, Rod } from './Primitives';
import { mechanicalConfig } from '../config/roverConfig';
import { SuspensionArm } from './SuspensionArm';
import { ShockAbsorber } from './ShockAbsorber';

export function Suspension({ x, side }: { x: number; side: number }) {
  const c = mechanicalConfig.suspension;
  return <group name={`suspension-${x}-${side}`} position={[x, 0, 0]} scale={[1, 1, side]}>
    <SuspensionArm y={c.lowerY} />
    <SuspensionArm y={c.upperY} upper />
    <Box name="steering-knuckle" position={[0, (c.lowerY + c.upperY) / 2, c.outerZ]} size={[0.085, c.upperY - c.lowerY + 0.08, 0.055]} material="dark" />
    <Cylinder radius={0.061} length={0.09} position={[0, c.lowerY, c.outerZ + 0.025]} rotation={[Math.PI / 2, 0, 0]} material="silver" />
    <Box name="lower-shock-clevis" position={[0, c.lowerY + 0.035, c.shockBottom[2]]} size={[0.10, 0.045, 0.16]} />
    <Cylinder position={c.shockBottom} radius={0.021} length={0.12} rotation={[0, 0, Math.PI / 2]} material="dark" />
    {[-c.halfSpan, c.halfSpan].map(dx => <group key={dx}>
      <Box position={[dx, 0.69, c.innerZ - 0.025]} size={[0.07, 0.58, 0.055]} material="dark" />
      <Box position={[dx, c.mountY, c.innerZ]} size={[0.12, 0.045, 0.19]} />
      <Bolt position={[dx, c.mountY + 0.026, c.innerZ]} normal={[0, 1, 0]} scale={0.8} />
    </group>)}
    <Rod from={[-c.halfSpan, c.upperY, c.innerZ]} to={c.shockTop} radius={0.022} />
    <Rod from={[c.halfSpan, c.upperY, c.innerZ]} to={c.shockTop} radius={0.022} />
    <Box position={c.shockTop} size={[0.12, 0.08, 0.09]} material="silver" />
    <ShockAbsorber phase={x + side * 0.8} />
  </group>;
}
