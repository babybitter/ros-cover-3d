import { Euler, Quaternion, Vector3 } from 'three';
import { roverConfig } from '../config/roverConfig';
import type { VehicleState } from '../types';

export interface SensorPose {
  position: [number, number, number];
  quaternion: [number, number, number, number];
}
export interface PoseProvider { sensorPose(vehicle: VehicleState): SensorPose }
const orientation = new Quaternion(), offset = new Vector3();
export class SimulationPoseProvider implements PoseProvider {
  sensorPose(vehicle: VehicleState): SensorPose {
    orientation.setFromEuler(new Euler(vehicle.roll, -vehicle.heading, vehicle.pitch, 'YXZ'));
    offset.set(...roverConfig.lidarPosition).applyQuaternion(orientation);
    return {
      position: [vehicle.x + offset.x, offset.y, vehicle.z + offset.z],
      quaternion: orientation.toArray(),
    };
  }
}
