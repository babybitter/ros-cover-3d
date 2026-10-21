import { Bolt, Box, Cylinder, Decal, Rod, materials, type MaterialName } from './Primitives';
import { useSimulation } from '../stores/simulationStore';
import { mechanicalConfig } from '../config/roverConfig';
import { createChassisDeck } from './geometry';
import { useGeometry } from './useGeometry';

function Deck({ y, thickness, material, size = [2.64, 1.4] }: { y: number; thickness: number; material: MaterialName; size?: [number, number] }) {
  const c = mechanicalConfig.chassis;
  const geometry = useGeometry(`deck:${size}:${thickness}`, () => createChassisDeck(...size, c.spineHalfWidth, c.centerHalfLength, thickness));
  return <mesh name="notched-chassis-deck" position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]} geometry={geometry} material={materials[material]} dispose={null} castShadow receiveShadow />;
}

export function Chassis() {
  const exploded = useSimulation(s => s.exploded);
  return <group>
    <Deck y={0.54} thickness={0.17} material="black" size={[2.58, 1.3]} />
    <Deck y={0.65} thickness={0.065} material="silver" />
    <Box size={[1.12, 0.24, 1.24]} position={[0, 0.8, 0]} material="dark" />
    {[-1, 1].map(s => <Box key={s} size={[0.67, 0.24, 0.8]} position={[s * 0.925, 0.8, 0]} material="dark" />)}
    <Deck y={0.955 + (exploded ? 0.25 : 0)} thickness={0.048} material="edge" size={[2.56, 1.44]} />
    <group position={[0, exploded ? 0.3 : 0, 0]}>
      {[-1, 1].map(s => <group key={s}>
        <Box size={[1.12, 0.085, 0.085]} position={[0, 0.54, s * 0.72]} />
        <Box size={[2.68, 0.07, 0.06]} position={[0, 0.54, s * 0.39]} />
        <Box size={[2.58, 0.045, 0.045]} position={[0, 1.03, s * 0.73]} material="edge" />
        <Box size={[1.12, 0.26, 0.05]} position={[0, 0.79, s * 0.645]} material="black" />
        <Decal label="ZXAJ" position={[0, 0.8, s * 0.675]} rotation={[0, s < 0 ? Math.PI : 0, 0]} width={0.71} height={0.19} />
        <Decal label="AUTONOMOUS SYSTEMS" position={[0, 0.66, s * 0.755]} rotation={[0, s < 0 ? Math.PI : 0, 0]} width={0.75} height={0.038} color="#6c8896" />
        {[-0.52, 0.52].map(x => <group key={x}>
          <Box size={[0.045, 0.36, 0.06]} position={[x, 0.77, s * 0.67]} material="silver" />
          <Bolt position={[x, 0.92, s * 0.707]} normal={[0, 0, s]} scale={0.8} />
          <Bolt position={[x, 0.62, s * 0.707]} normal={[0, 0, s]} scale={0.8} />
        </group>)}
      </group>)}
    </group>
    {[-0.975, 0.975].map(x => <group key={x}>
      <Cylinder radius={0.051} length={1.93} rotation={[Math.PI / 2, 0, 0]} position={[x, 0.43, 0]} material="dark" />
      <Box size={[0.28, 0.16, 0.37]} position={[x, 0.5, 0]} material="black" />
    </group>)}
    {[-1, 1].map(s => <group key={s}>
      <Box size={[0.10, 0.15, 1.54]} position={[s * 1.34, 0.72, 0]} material="dark" />
      <Box size={[0.045, 0.05, 1.6]} position={[s * 1.4, 0.68, 0]} />
      <Rod from={[s * 1.38, 0.67, -0.72]} to={[s * 1.47, 0.8, -0.56]} radius={0.035} />
      <Rod from={[s * 1.38, 0.67, 0.72]} to={[s * 1.47, 0.8, 0.56]} radius={0.035} />
    </group>)}
    <Box size={[1.04, 0.1, 0.73]} position={[-0.14, 1.07, 0]} material="black" />
    {Array.from({ length: 9 }, (_, i) => <Box key={i} size={[0.025, 0.04, 0.58]} position={[-0.52 + i * 0.1, 1.135, 0]} material="dark" />)}
    <Box size={[0.36, 0.16, 0.48]} position={[-0.96, 1.09, 0]} material="dark" />
    {[-0.19, 0.19].map(z => <Box key={z} size={[0.018, 0.21, 0.025]} position={[-1.03, 1.24, z]} material="black" />)}
  </group>;
}
