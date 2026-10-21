import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Chassis } from './Chassis';
import { Wheel } from './Wheel';
import { Suspension } from './Suspension';
import { GearSystem } from './GearSystem';
import { Cameras, Lidar } from './Sensors';
import { useModelMaterials } from './Primitives';
import { BodyPanels } from './BodyPanels';
import { useSimulation } from '../stores/simulationStore';
import { runtime } from '../simulation/VehicleController';
import { roverConfig as c } from '../config/roverConfig';

export function RoverModel() {
  const root = useRef<THREE.Group>(null!);
  const components = useSimulation(s => s.components), exploded = useSimulation(s => s.exploded);
  const wireframe = useSimulation(s => s.wireframe);
  useModelMaterials(wireframe);
  useFrame(() => {
    const v = runtime.vehicle;
    root.current.position.set(v.x, 0, v.z);
    root.current.rotation.set(v.roll, -v.heading, v.pitch, 'YXZ');
  });
  return <group ref={root} name="ZXAJ-R01">
    {components.chassis && <><Chassis /><BodyPanels /></>}
    {components.wheels && [-c.wheelbase / 2, c.wheelbase / 2].map(x => [-1, 1].map(side => <Wheel key={`${x}-${side}`} x={x} side={side} />))}
    {components.suspension && [-c.wheelbase / 2, c.wheelbase / 2].map(x => [-1, 1].map(side => <Suspension key={`${x}-${side}`} x={x} side={side} />))}
    <group position={[0, exploded ? 0.6 : 0, 0]}>{components.gears && <GearSystem />}</group>
    <group position={[0, exploded ? 1 : 0, 0]}>{components.lidar && <Lidar />}</group>
    <group position={[exploded ? 0.5 : 0, exploded ? 0.5 : 0, 0]}>{components.cameras && <Cameras />}</group>
  </group>;
}
