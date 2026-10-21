const dimensions = {
  length: 2.8,
  width: 1.64,
  wheelbase: 1.95,
  track: 1.95,
  wheelRadius: 0.43,
  wheelWidth: 0.30,
};

export type Vec3 = [number, number, number];
export type BodyMode = 'bare' | 'full' | 'transparent';
export type DetailLevel = 'detail' | 'performance';

export const mechanicalConfig = {
  chassis: {
    deckLength: 2.64, deckWidth: 1.4,
    spineHalfWidth: 0.42, centerHalfLength: 0.60,
  },
  suspension: {
    innerZ: 0.57, outerZ: 0.745, halfSpan: 0.22,
    lowerY: 0.43, upperY: 0.69, mountY: 0.95,
    springRadius: 0.066, springTurns: 8, springWire: 0.012,
    armThickness: 0.032, jointRadius: 0.044,
    shockTop: [0, 1.015, 0.60] as Vec3,
    shockBottom: [0, 0.49, 0.61] as Vec3,
    travel: 0.018,
  },
  cameras: {
    panPivot: [1.11, 1.35, 0] as Vec3,
    base: [0.79, 0.995, 0] as Vec3,
    baseSize: [0.69, 0.055, 0.94] as Vec3,
    frontBeam: [1.08, 1.012, 0] as Vec3,
    frontBeamSize: [0.23, 0.026, 0.91] as Vec3,
    rotatingBeamOffset: [-0.02, -0.1975, 0] as Vec3,
    rotatingBeamSize: [0.25, 0.04, 0.94] as Vec3,
    bearingRadius: 0.065,
    sideSpacing: 0.42,
    lensOffsets: [-0.31, 0, 0.31],
    upperCenter: [0.61, 1.5, 0] as Vec3,
    housingSize: [0.21, 0.18, 0.22] as Vec3,
  },
  panels: { thickness: 0.036, bevel: 0.014, sideZ: 0.676 },
  fastener: { radius: 0.027, depth: 0.024, washerRadius: 0.038 },
} as const;

export const detailProfiles = {
  detail: { radialSegments: 24, springSegments: 144, treadRows: 3, treadSegments: 40, dpr: 1.75, shadowSize: 2048, contactResolution: 256 },
  performance: { radialSegments: 12, springSegments: 64, treadRows: 2, treadSegments: 24, dpr: 1, shadowSize: 1024, contactResolution: 128 },
} as const;

export const materialConfig = {
  silver: { color: '#b3bec8', metalness: 0.85, roughness: 0.29 },
  edge: { color: '#e0e7ec', metalness: 0.78, roughness: 0.24 },
  dark: { color: '#262d33', metalness: 0.65, roughness: 0.35 },
  black: { color: '#111619', metalness: 0.35, roughness: 0.44 },
  rubber: { color: '#111518', metalness: 0.04, roughness: 0.92 },
  tread: { color: '#22272b', metalness: 0.08, roughness: 0.85 },
  bronze: { color: '#9a8a60', metalness: 0.8, roughness: 0.32 },
  shell: { color: '#353f48', metalness: 0.6, roughness: 0.4 },
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
  cameraPosition: [1.12, 1.32, 0] as [number, number, number],
  lidarRange: 7,
  lidarRays: 120,
  map: { min: -10, max: 10, resolution: 0.5 },
};

export const initialObstacles = [
  { id: 'ob-1', x: 3.5, z: -2.5, width: 1.2, depth: 1.2, height: 0.9 },
  { id: 'ob-2', x: 5, z: 2, width: 1.4, depth: 1.2, height: 0.7 },
  { id: 'ob-3', x: -3.5, z: -3, width: 1, depth: 1.6, height: 1.1 },
];
