import { create } from 'zustand';
import { defaultLidarConfig, normalizeLidarConfig, type CloudColor, type LidarConfig } from '../lidar/LidarConfig';

interface MappingStore {
  enabled: boolean; accumulating: boolean; showLive: boolean; showMap: boolean; showRange: boolean;
  color: CloudColor; liveSize: number; mapSize: number; voxelSize: number; config: LidarConfig;
  epoch: number; resetRevision: number;
  status: 'off' | 'ready' | 'scanning' | 'error'; error: string;
  hits: number; rays: number; points: number; scans: number; scanMs: number; actualHz: number; bytes: number;
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number } | null;
  patch: (update: Partial<MappingStore>) => void;
  configure: (update: Partial<LidarConfig>) => void;
  clear: () => void;
  restart: () => void;
}
export const useMapping = create<MappingStore>((set, get) => ({
  enabled: false, accumulating: false, showLive: true, showMap: true, showRange: false,
  color: 'height', liveSize: 0.035, mapSize: 0.045, voxelSize: 0.1, config: defaultLidarConfig,
  epoch: 0, resetRevision: 0, status: 'off', error: '', hits: 0, rays: 0, points: 0, scans: 0, scanMs: 0, actualHz: 0, bytes: 0, bounds: null,
  patch: update => set(s => ({
    ...update,
    epoch: update.epoch ?? s.epoch + (update.enabled !== undefined || update.accumulating !== undefined ? 1 : 0),
    ...(update.voxelSize !== undefined && update.voxelSize !== s.voxelSize
      ? { voxelSize: Number.isFinite(update.voxelSize) ? Math.max(0.05, Math.min(0.3, update.voxelSize)) : s.voxelSize,
        resetRevision: s.resetRevision + 1, epoch: s.epoch + 1, points: 0, scans: 0, hits: 0, rays: 0, scanMs: 0, actualHz: 0, error: '', bounds: null } : {}),
  })),
  configure: update => set(s => ({ config: normalizeLidarConfig({ ...s.config, ...update }), epoch: s.epoch + 1 })),
  clear: () => set(s => ({ resetRevision: s.resetRevision + 1, epoch: s.epoch + 1, points: 0, scans: 0, hits: 0, rays: 0, scanMs: 0, actualHz: 0, error: '', bounds: null })),
  restart: () => { get().clear(); get().patch({ enabled: true, accumulating: true }); },
}));
