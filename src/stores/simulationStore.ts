import { create } from 'zustand';
import type { ControlInput, EditMode, LogEntry, NavigationStatus, Obstacle, Point2, SensorReading, VehicleState, ViewPreset } from '../types';
import { initialObstacles, roverConfig as c, type BodyMode, type DetailLevel } from '../config/roverConfig';
import { initialVehicle } from '../simulation/MotionModel';
import { planPath } from '../simulation/PathPlanner';

interface SimulationStore {
  vehicle: VehicleState; sensors: SensorReading; input: ControlInput; paused: boolean; emergency: boolean;
  mode: 'manual' | 'auto'; speedLimit: number; elapsed: number; timeScale: number;
  view: ViewPreset; viewRevision: number; autoRotate: boolean; wireframe: boolean; showLidar: boolean; showGrid: boolean;
  exploded: boolean; cameraPan: number; threshold: number; components: Record<string, boolean>; selectedPart: string;
  bodyMode: BodyMode; detailLevel: DetailLevel;
  obstacles: Obstacle[]; showObstacles: boolean; selectedObstacle: string | null; editMode: EditMode;
  goal: Point2; path: Point2[]; pathIndex: number; navStatus: NavigationStatus; logs: LogEntry[];
  patch: (update: Partial<SimulationStore>) => void;
  setView: (view: ViewPreset) => void;
  log: (message: string, level?: LogEntry['level']) => void;
  stop: (emergency?: boolean) => void;
  reset: () => void;
  plan: () => void;
  navigate: () => void;
}
let logId = 0;
const entry = (message: string, level: LogEntry['level'] = 'info'): LogEntry => ({
  id: ++logId, time: new Date().toLocaleTimeString('en-GB', { hour12: false }), message, level,
});
export const useSimulation = create<SimulationStore>((set, get) => ({
  vehicle: initialVehicle(), sensors: { lidar: [], frontDistance: 7, warning: 'clear', timestamp: 0 },
  input: { throttle: 0, steer: 0 }, paused: false, emergency: false, mode: 'manual',
  speedLimit: 0.8, elapsed: 0, timeScale: 1,
  view: 'perspective', viewRevision: 0, autoRotate: false, wireframe: false,
  showLidar: false, showGrid: true, exploded: false, cameraPan: 0, threshold: 2,
  bodyMode: 'full', detailLevel: 'detail',
  components: { chassis: true, wheels: true, suspension: true, gears: true, lidar: true, cameras: true },
  selectedPart: '', obstacles: initialObstacles, showObstacles: false, selectedObstacle: null, editMode: 'orbit',
  goal: { x: 7, z: -5 }, path: [], pathIndex: 1, navStatus: 'idle',
  logs: [entry('仿真场景已就绪 · ZXAJ-R01', 'success'), entry('程序化模型与虚拟传感器已加载')],
  patch: update => {
    const invalidated = update.goal !== undefined || update.obstacles !== undefined;
    set(invalidated ? { ...update, path: [], pathIndex: 1, navStatus: 'idle', mode: 'manual', input: { throttle: 0, steer: 0 }, vehicle: { ...(update.vehicle ?? get().vehicle), speed: 0 } } : update);
  },
  setView: view => set(s => ({ view, viewRevision: s.viewRevision + 1, autoRotate: false })),
  log: (message, level = 'info') => set(s => ({ logs: [...s.logs.slice(-79), entry(message, level)] })),
  stop: (emergency = false) => {
    set(s => ({ input: { throttle: 0, steer: 0 }, emergency: emergency || s.emergency, mode: 'manual', vehicle: emergency || s.emergency ? { ...s.vehicle, speed: 0 } : s.vehicle, navStatus: s.navStatus === 'running' ? 'ready' : s.navStatus }));
    get().log(emergency ? '急停触发 · 驱动锁定' : '停止行驶', emergency ? 'warn' : 'info');
  },
  reset: () => {
    set({ vehicle: initialVehicle(), input: { throttle: 0, steer: 0 }, emergency: false, elapsed: 0, paused: false, path: [], pathIndex: 1, navStatus: 'idle', mode: 'manual' });
    get().setView('perspective'); get().log('车辆位置与仿真时钟已复位');
  },
  plan: () => {
    const s = get(), result = planPath(c.map, s.vehicle, s.goal, s.obstacles, c.collisionRadius + 0.12);
    set({ path: result.path, pathIndex: 1, navStatus: result.path.length ? 'ready' : 'blocked', showObstacles: true, mode: 'manual', input: { throttle: 0, steer: 0 } });
    get().log(result.path.length ? `A* 规划完成 · ${result.path.length} 个路径节点 · 搜索 ${result.visited} 格` : result.reason!, result.path.length ? 'success' : 'warn');
  },
  navigate: () => {
    if (get().emergency) { get().log('请先解除急停', 'warn'); return; }
    get().plan();
    if (get().path.length) { set({ mode: 'auto', navStatus: 'running', paused: false }); get().log('自主导航开始', 'success'); }
  },
}));
