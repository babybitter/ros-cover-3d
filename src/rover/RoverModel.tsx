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
import { explosionConfig as e } from '../config/explosionConfig';
import { AssemblyAnimation, AssemblyPart } from './AssemblyPart';

export function RoverModel() {
  const root = useRef<THREE.Group>(null!);
  const components = useSimulation(s => s.components);
  const wireframe = useSimulation(s => s.wireframe);
  useModelMaterials(wireframe);
  useFrame(() => {
    const v = runtime.vehicle;
    root.current.position.set(v.x, 0, v.z);
    root.current.rotation.set(v.roll, -v.heading, v.pitch, 'YXZ');
  });
  return <group ref={root} name="ZXAJ-R01">
    <AssemblyAnimation />
    {components.chassis && <><Chassis /><BodyPanels /></>}
    {components.wheels && [-c.wheelbase / 2, c.wheelbase / 2].map(x => [-1, 1].map(side =>
      <AssemblyPart key={`${x}-${side}`} id={`wheel-${x}-${side}`} config={e.wheel(x, side)}><Wheel x={x} side={side} /></AssemblyPart>))}
    {components.suspension && [-c.wheelbase / 2, c.wheelbase / 2].map(x => [-1, 1].map(side =>
      <AssemblyPart key={`${x}-${side}`} id={`suspension-${x}-${side}`} config={e.suspension(x, side)}><Suspension x={x} side={side} /></AssemblyPart>))}
    {components.gears && <AssemblyPart id="gears" config={e.gears}><GearSystem /></AssemblyPart>}
    {components.lidar && <AssemblyPart id="lidar" config={e.lidar}><Lidar /></AssemblyPart>}
    {components.cameras && <Cameras />}
  </group>;
}
