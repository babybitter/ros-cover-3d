import { Grid, Line } from '@react-three/drei';
import type { ThreeEvent } from '@react-three/fiber';
import { useSimulation } from '../stores/simulationStore';
import type { Point2 } from '../types';
import { collides } from '../simulation/CollisionDetector';
import { roverConfig as c } from '../config/roverConfig';

export function World() {
  const showGrid = useSimulation(s => s.showGrid), showObstacles = useSimulation(s => s.showObstacles);
  const obstacles = useSimulation(s => s.obstacles), path = useSimulation(s => s.path), goal = useSimulation(s => s.goal);
  const selected = useSimulation(s => s.selectedObstacle), editMode = useSimulation(s => s.editMode);
  const s = useSimulation.getState();
  const edit = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation();
    const p = { x: Math.round(event.point.x * 2) / 2, z: Math.round(event.point.z * 2) / 2 };
    if (Math.abs(p.x) > 9 || Math.abs(p.z) > 9) return;
    if (editMode === 'goal') { s.patch({ goal: p, path: [], navStatus: 'idle', editMode: 'orbit' }); s.log(`目标已设置 (${p.x}, ${p.z})`); }
    if (editMode === 'start') {
      if (Math.abs(p.x) > c.map.max - c.collisionRadius - 0.12 || Math.abs(p.z) > c.map.max - c.collisionRadius - 0.12) {
        s.log('起点过于接近地图边界', 'warn'); return;
      }
      if (collides(p, obstacles, c.collisionRadius)) { s.log('起点与障碍物安全区域重叠', 'warn'); return; }
      s.patch({ vehicle: { ...s.vehicle, ...p, speed: 0 }, path: [], navStatus: 'idle', mode: 'manual', input: { throttle: 0, steer: 0 }, editMode: 'orbit' });
      s.log(`起点已设置 (${p.x}, ${p.z})`);
    }
    if (editMode === 'obstacle') {
      const obstacle = { id: `ob-${Date.now()}`, ...p, width: 1, depth: 1, height: 0.8 };
      if (collides(s.vehicle, [obstacle], c.collisionRadius + 0.1)) { s.log('障碍物距离车辆太近', 'warn'); return; }
      s.patch({ obstacles: [...obstacles, obstacle], selectedObstacle: obstacle.id, showObstacles: true, path: [], navStatus: 'idle' });
      s.log('障碍物已添加');
    }
  };
  const marker = (p: Point2, color: string) => <group position={[p.x, 0.03, p.z]}>
    <mesh rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[0.19, 0.24, 32]} /><meshBasicMaterial color={color} /></mesh>
    <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.065, 16]} /><meshBasicMaterial color={color} /></mesh>
  </group>;
  return <>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.009, 0]} receiveShadow onClick={edit}>
      <planeGeometry args={[200, 200]} /><meshStandardMaterial color="#273744" metalness={0.25} roughness={0.81} transparent opacity={0.65} />
    </mesh>
    {showGrid && <Grid position={[0, 0.001, 0]} args={[40, 40]} cellSize={0.5} cellThickness={0.45} cellColor="#4d6679" sectionSize={2.5} sectionThickness={0.65} sectionColor="#557084" fadeDistance={22} fadeStrength={1.8} infiniteGrid />}
    {showObstacles && <>
      {obstacles.map(o => <group key={o.id} position={[o.x, 0, o.z]} onClick={e => { e.stopPropagation(); s.patch({ selectedObstacle: o.id }); }}>
        <mesh position={[0, o.height / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[o.width, o.height, o.depth]} /><meshStandardMaterial color={o.id === selected ? '#d8ab67' : '#6b7780'} metalness={0.5} roughness={0.45} />
        </mesh>
        <mesh position={[0, o.height + 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[o.width * 0.8, o.depth * 0.8]} /><meshStandardMaterial color="#b9a469" roughness={0.65} /></mesh>
      </group>)}
      {marker(goal, '#79d2b7')}
      <Line points={[[-10, 0.015, -10], [10, 0.015, -10], [10, 0.015, 10], [-10, 0.015, 10], [-10, 0.015, -10]]} color="#758a9b" dashed dashSize={0.2} gapSize={0.18} lineWidth={1} />
    </>}
    {path.length > 1 && <><Line points={path.map(p => [p.x, 0.04, p.z] as [number, number, number])} color="#75dfba" lineWidth={2.5} />{marker(path[0], '#d8ecf3')}</>}
  </>;
}
