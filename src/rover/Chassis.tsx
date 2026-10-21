import { Bolt, Box, Cylinder, Decal, Rod } from './Primitives';
import { useSimulation } from '../stores/simulationStore';

export function Chassis() {
  const exploded = useSimulation(s => s.exploded);
  return <group>
    <Box size={[2.58, 0.17, 1.3]} position={[0, 0.54, 0]} material="black" />
    <Box size={[2.64, 0.065, 1.4]} position={[0, 0.65, 0]} material="silver" />
    <Box size={[2.26, 0.24, 1.24]} position={[0, 0.8, 0]} material="dark" />
    <Box size={[2.56, 0.048, 1.44]} position={[0, 0.955 + (exploded ? 0.25 : 0), 0]} material="edge" />
    <group position={[0, exploded ? 0.3 : 0, 0]}>
      {[-1, 1].map(s => <group key={s}>
        <Box size={[2.68, 0.085, 0.085]} position={[0, 0.54, s * 0.72]} />
        <Box size={[2.58, 0.045, 0.045]} position={[0, 1.03, s * 0.73]} material="edge" />
        <Box size={[1.12, 0.26, 0.05]} position={[0, 0.79, s * 0.645]} material="black" />
        <Decal label="ZXAJ" position={[0, 0.8, s * 0.675]} rotation={[0, s < 0 ? Math.PI : 0, 0]} width={0.71} height={0.19} />
        <Decal label="AUTONOMOUS SYSTEMS" position={[0, 0.66, s * 0.755]} rotation={[0, s < 0 ? Math.PI : 0, 0]} width={0.75} height={0.038} color="#6c8896" />
        {[-1.16, -0.7, 0.7, 1.16].map(x => <group key={x}>
          <Box size={[0.045, 0.36, 0.06]} position={[x, 0.77, s * 0.67]} material="silver" />
          <Bolt position={[x, 0.94, s * 0.76]} scale={0.8} />
          <Bolt position={[x, 0.6, s * 0.76]} scale={0.8} />
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
