import { useEffect, useRef } from 'react';
import { useSimulation } from '../stores/simulationStore';

export function MiniMap({ large = false }: { large?: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null!);
  const v = useSimulation(s => s.vehicle), obstacles = useSimulation(s => s.obstacles);
  const path = useSimulation(s => s.path), goal = useSimulation(s => s.goal), scan = useSimulation(s => s.sensors);
  useEffect(() => {
    const ctx = canvas.current.getContext('2d')!, size = 440, scale = size / 22;
    const xy = (x: number, z: number): [number, number] => [size / 2 + x * scale, size / 2 + z * scale];
    ctx.clearRect(0, 0, size, size); ctx.fillStyle = '#171e24'; ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = '#28323a'; ctx.lineWidth = 1;
    for (let i = -10; i <= 10; i++) {
      ctx.beginPath(); ctx.moveTo(...xy(i, -10)); ctx.lineTo(...xy(i, 10)); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(...xy(-10, i)); ctx.lineTo(...xy(10, i)); ctx.stroke();
    }
    ctx.strokeStyle = '#3e505c'; ctx.strokeRect(...xy(-10, -10), scale * 20, scale * 20);
    for (const o of obstacles) { ctx.fillStyle = '#879196'; ctx.fillRect(...xy(o.x - o.width / 2, o.z - o.depth / 2), o.width * scale, o.depth * scale); }
    ctx.strokeStyle = '#75dabb'; ctx.lineWidth = 2.5; ctx.beginPath();
    path.forEach((p, i) => { if (i === 0) ctx.moveTo(...xy(p.x, p.z)); else ctx.lineTo(...xy(p.x, p.z)); }); ctx.stroke();
    ctx.fillStyle = '#5ba698';
    for (const p of scan.lidar.filter(p => p.hit)) { ctx.beginPath(); ctx.arc(...xy(p.x, p.z), 1.8, 0, Math.PI * 2); ctx.fill(); }
    ctx.strokeStyle = '#8fe5c4'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(...xy(goal.x, goal.z), 6, 0, Math.PI * 2); ctx.stroke();
    const [x, y] = xy(v.x, v.z);
    ctx.save(); ctx.translate(x, y); ctx.rotate(v.heading);
    ctx.fillStyle = '#d7eee8'; ctx.strokeStyle = '#6fe0bd'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(11, 0); ctx.lineTo(-7, -6); ctx.lineTo(-4, 0); ctx.lineTo(-7, 6); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
  }, [v, obstacles, path, goal, scan]);
  return <canvas ref={canvas} width={440} height={440} className={large ? 'mini-map large' : 'mini-map'} aria-label="二维导航地图" />;
}
