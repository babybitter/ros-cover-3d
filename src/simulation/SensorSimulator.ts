import type { Obstacle, SensorPlugin, SensorReading, VehicleState } from '../types';
import { roverConfig as c } from '../config/roverConfig';
import { raycast } from './CollisionDetector';

export class SensorSimulator implements SensorPlugin<SensorReading> {
  id = 'zxaj-simulated-sensor-suite';
  constructor(public threshold = 2, public range = c.lidarRange) {}
  sample(v: VehicleState, obstacles: Obstacle[], time: number): SensorReading {
    const lidar = Array.from({ length: c.lidarRays }, (_, i) => {
      const angle = v.heading + i / c.lidarRays * Math.PI * 2;
      const distance = raycast(v, angle, obstacles, this.range);
      return { x: v.x + Math.cos(angle) * distance, z: v.z + Math.sin(angle) * distance, distance, hit: distance < this.range };
    });
    const front = { x: v.x + Math.cos(v.heading) * c.length / 2, z: v.z + Math.sin(v.heading) * c.length / 2 };
    const frontDistance = Math.min(...[-0.15, 0, 0.15].map(a => raycast(front, v.heading + a, obstacles, this.range)));
    return { lidar, frontDistance, warning: frontDistance < 0.65 ? 'danger' : frontDistance < this.threshold ? 'caution' : 'clear', timestamp: time };
  }
}
