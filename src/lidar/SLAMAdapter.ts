import type { ScanFrame } from './LidarConfig';
import type { SensorPose } from '../simulation/PoseProvider';

/** Integration contract; no scan matching, localization or loop closure is claimed. */
export interface SLAMAdapter {
  estimatePose(scan: ScanFrame): SensorPose | Promise<SensorPose>;
  reset(): void;
}
export class SimulationPoseAdapter implements SLAMAdapter {
  estimatePose(scan: ScanFrame) { return scan.pose; }
  reset() { /* The simulator supplies an absolute pose for every frame. */ }
}
