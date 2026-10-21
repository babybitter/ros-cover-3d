import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { campus, obstacleSurfaces, type Surface } from '../environment/EnvironmentConfig';
import { useSimulation } from '../stores/simulationStore';
import { useEnvironment } from '../stores/environmentStore';
import { useMapping } from '../stores/mappingStore';
import { runtime } from '../simulation/VehicleController';
import { SimulationPoseProvider } from '../simulation/PoseProvider';
import { mappingRuntime } from './MappingRuntime';
import { PointCloudMapper } from './PointCloudMapper';
import { maxMapPoints, type ScanFrame } from './LidarConfig';
import type { WorkerRequest } from './lidar.worker';

const poseProvider = new SimulationPoseProvider();
const showroom: Surface = { id: 'showroom-ground', kind: 'box', center: [0, -0.159, 0], size: [20, 0.3, 20],
  color: '#273744', reflectivity: 0.4, solid: false, category: 'road' };
export function LidarSensor() {
  const mode = useEnvironment(s => s.mode), obstacles = useSimulation(s => s.obstacles);
  const reset = useSimulation(s => s.resetRevision);
  const worker = useRef<Worker | null>(null), busy = useRef(false), last = useRef(-Infinity);
  const lastResult = useRef(0);
  useEffect(() => {
    const instance = new Worker(new URL('./lidar.worker.ts', import.meta.url), { type: 'module' });
    worker.current = instance;
    instance.onmessage = ({ data }: MessageEvent<{ epoch: number; frame?: ScanFrame; error?: string }>) => {
      busy.current = false;
      const state = useMapping.getState();
      if (data.epoch !== state.epoch || !state.enabled || useSimulation.getState().paused) return;
      if (data.error || !data.frame) { state.patch({ status: 'error', error: data.error ?? '扫描失败' }); return; }
      const { frame } = data, { live, mapper } = mappingRuntime;
      mapper.ingest(frame, live, state.accumulating);
      const now = performance.now(), hz = lastResult.current ? 1000 / (now - lastResult.current) : 0;
      lastResult.current = now;
      state.patch({ status: 'ready', error: '', hits: live.count, rays: frame.rayCount, points: mapper.buffer.count,
        scans: mapper.scans, scanMs: frame.duration, actualHz: hz,
        bytes: live.bytes + mapper.buffer.bytes + (live.capacity + mapper.buffer.capacity) * 48,
        bounds: mapper.buffer.count ? { ...mapper.bounds } : null });
    };
    instance.onerror = event => { busy.current = false; useMapping.getState().patch({ status: 'error', error: event.message }); };
    return () => { instance.terminate(); worker.current = null; busy.current = false; };
  }, []);
  useEffect(() => {
    useMapping.getState().clear();
    worker.current?.postMessage({ type: 'world', surfaces: [...(mode === 'campus' ? campus.surfaces : [showroom]), ...obstacleSurfaces(obstacles)] } satisfies WorkerRequest);
    last.current = -Infinity;
  }, [mode, obstacles]);
  useEffect(() => { useMapping.getState().clear(); }, [reset]);
  useEffect(() => useSimulation.subscribe((state, previous) => {
    if (state.paused !== previous.paused) {
      const mapping = useMapping.getState();
      mapping.patch({ epoch: mapping.epoch + 1, actualHz: 0 });
      lastResult.current = 0;
    }
  }), []);
  useEffect(() => useMapping.subscribe((state, previous) => {
    if (state.resetRevision !== previous.resetRevision) {
      mappingRuntime.mapper = new PointCloudMapper(state.voxelSize, maxMapPoints);
      mappingRuntime.live.clear(); last.current = -Infinity;
      lastResult.current = 0;
    }
    if (state.enabled !== previous.enabled) {
      state.patch({ status: state.enabled ? 'ready' : 'off', actualHz: 0 });
      if (!state.enabled) { mappingRuntime.live.clear(); state.patch({ hits: 0, rays: 0 }); }
    }
  }), []);
  useFrame(() => {
    const state = useMapping.getState(), sim = useSimulation.getState(), now = performance.now();
    if (!state.enabled || sim.paused || busy.current || !worker.current || now - last.current < 1000 / state.config.frequency) return;
    busy.current = true; last.current = now;
    state.patch({ status: 'scanning' });
    worker.current.postMessage({ type: 'scan', epoch: state.epoch, config: state.config,
      pose: poseProvider.sensorPose(runtime.vehicle), timestamp: runtime.elapsed } satisfies WorkerRequest);
  });
  return null;
}
