export interface Point2 { x: number; z: number }
export interface VehicleState extends Point2 {
  heading: number;
  speed: number;
  steering: number;
  distance: number;
  wheelAngle: number;
  pitch: number;
  roll: number;
}
export interface ControlInput { throttle: number; steer: number }
export interface Obstacle extends Point2 { id: string; width: number; depth: number; height: number }
export interface ScanPoint extends Point2 { distance: number; hit: boolean }
export interface SensorReading {
  lidar: ScanPoint[];
  frontDistance: number;
  warning: 'clear' | 'caution' | 'danger';
  timestamp: number;
}
export interface SensorPlugin<T = unknown> {
  id: string;
  sample(vehicle: VehicleState, obstacles: Obstacle[], time: number): T;
}
export type ViewPreset = 'perspective' | 'front' | 'rear' | 'left' | 'right' | 'top' | 'camera';
export type EditMode = 'orbit' | 'obstacle' | 'start' | 'goal';
export type NavigationStatus = 'idle' | 'ready' | 'running' | 'arrived' | 'blocked';
export interface LogEntry { id: number; time: string; level: 'info' | 'success' | 'warn'; message: string }
