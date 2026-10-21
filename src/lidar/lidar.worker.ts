import { LidarSimulator } from './LidarSimulator';
import type { LidarConfig } from './LidarConfig';
import type { Surface } from '../environment/EnvironmentConfig';
import type { SensorPose } from '../simulation/PoseProvider';

export type WorkerRequest =
  | { type: 'world'; surfaces: Surface[] }
  | { type: 'scan'; epoch: number; config: LidarConfig; pose: SensorPose; timestamp: number };
let scanner: LidarSimulator | undefined;
self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;
  if (request.type === 'world') { scanner = new LidarSimulator(request.surfaces); return; }
  if (!scanner) return;
  try {
    const frame = scanner.scan(request.config, request.pose, request.timestamp);
    self.postMessage({ epoch: request.epoch, frame },
      { transfer: [frame.localPositions.buffer, frame.distances.buffer, frame.intensities.buffer] });
  } catch (error) {
    self.postMessage({ epoch: request.epoch, error: error instanceof Error ? error.message : String(error) });
  }
};
