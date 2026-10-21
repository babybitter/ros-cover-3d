import { useMemo } from 'react';
import { Line } from '@react-three/drei';
import { useSimulation } from '../stores/simulationStore';

export function SensorVisualization() {
  const show = useSimulation(s => s.showLidar), sensors = useSimulation(s => s.sensors), v = useSimulation(s => s.vehicle);
  const points = useMemo(() => new Float32Array(sensors.lidar.flatMap(p => [p.x, 0.28, p.z])), [sensors]);
  if (!show) return null;
  return <group>
    <points><bufferGeometry><bufferAttribute attach="attributes-position" args={[points, 3]} /></bufferGeometry><pointsMaterial color="#56e7cf" size={0.055} transparent opacity={0.9} sizeAttenuation /></points>
    {sensors.lidar.filter((_, i) => i % 5 === 0).map((p, i) => <Line key={i} points={[[v.x, 0.28, v.z], [p.x, 0.28, p.z]]} color={p.hit ? '#f0bd70' : '#4ecab8'} transparent opacity={0.13} lineWidth={0.7} />)}
    <mesh position={[v.x, 0.02, v.z]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[6.98, 7, 128]} /><meshBasicMaterial color="#4ad5c1" transparent opacity={0.25} /></mesh>
  </group>;
}
