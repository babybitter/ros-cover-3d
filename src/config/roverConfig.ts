const dimensions = {
  length: 2.8,
  width: 1.64,
  wheelbase: 1.95,
  track: 1.95,
  wheelRadius: 0.43,
  wheelWidth: 0.30,
};

export const roverConfig = {
  ...dimensions,
  chassisHeight: 0.63,
  maxSpeed: 2,
  maxSteering: 0.53,
  acceleration: 1.1,
  braking: 2.2,
  // Include tread and hub clearance at every steering angle.
  collisionRadius: Math.max(
    Math.hypot(dimensions.length / 2, dimensions.width / 2),
    Math.hypot(dimensions.wheelbase / 2, dimensions.track / 2)
      + Math.hypot(dimensions.wheelRadius + 0.025, dimensions.wheelWidth / 2 + 0.02),
  ),
  lidarPosition: [0, 1.92, 0] as [number, number, number],
  cameraPosition: [1.12, 1.22, 0] as [number, number, number],
  lidarRange: 7,
  lidarRays: 120,
  map: { min: -10, max: 10, resolution: 0.5 },
};

export const initialObstacles = [
  { id: 'ob-1', x: 3.5, z: -2.5, width: 1.2, depth: 1.2, height: 0.9 },
  { id: 'ob-2', x: 5, z: 2, width: 1.4, depth: 1.2, height: 0.7 },
  { id: 'ob-3', x: -3.5, z: -3, width: 1, depth: 1.6, height: 1.1 },
];
