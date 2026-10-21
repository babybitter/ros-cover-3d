import type { SensorPose } from '../simulation/PoseProvider';

export interface LidarConfig {
  horizontalResolution: number;
  lines: 32 | 64 | 128;
  verticalFov: number;
  range: number;
  frequency: number;
}
export type CloudColor = 'mono' | 'height' | 'distance' | 'intensity';
export interface ScanFrame {
  localPositions: Float32Array;
  distances: Float32Array;
  intensities: Float32Array;
  pose: SensorPose;
  timestamp: number;
  rayCount: number;
  duration: number;
}
export const defaultLidarConfig: LidarConfig = {
  horizontalResolution: 0.4, lines: 64, verticalFov: 40, range: 60, frequency: 5,
};
export const maxScanPoints = 1800 * 128;
export const maxMapPoints = 400_000;
export function normalizeLidarConfig(config: LidarConfig): LidarConfig {
  const clamp = (value: number, min: number, max: number, fallback: number) =>
    Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;
  return {
    horizontalResolution: clamp(config.horizontalResolution, 0.2, 0.4, defaultLidarConfig.horizontalResolution),
    lines: [32, 64, 128].includes(config.lines) ? config.lines : 64,
    verticalFov: clamp(config.verticalFov, 10, 90, defaultLidarConfig.verticalFov),
    range: clamp(config.range, 10, 100, defaultLidarConfig.range),
    frequency: clamp(config.frequency, 1, 10, defaultLidarConfig.frequency),
  };
}
