import { Environment, Lightformer } from '@react-three/drei';
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { DirectionalLight } from 'three';
import { useSimulation } from '../stores/simulationStore';
import { detailProfiles } from '../config/roverConfig';
import { runtime } from '../simulation/VehicleController';

export function SceneLighting() {
  const shadowSize = useSimulation(s => detailProfiles[s.detailLevel].shadowSize);
  const light = useRef<DirectionalLight>(null);
  useFrame(() => {
    if (!light.current) return;
    const { x, z } = runtime.vehicle;
    light.current.position.set(x + 3, 7, z + 5);
    light.current.target.position.set(x, 0, z);
    light.current.target.updateMatrixWorld();
  });
  return <>
    <ambientLight intensity={0.7} />
    <hemisphereLight args={['#e1ecff', '#47505c', 1.4]} />
    <directionalLight ref={light} key={shadowSize} position={[3, 7, 5]} intensity={3.4} color="#f4f7ff" castShadow shadow-mapSize={[shadowSize, shadowSize]} shadow-camera-left={-12} shadow-camera-right={12} shadow-camera-top={12} shadow-camera-bottom={-12} shadow-normalBias={0.035} />
    <directionalLight position={[-4, 3, -5]} intensity={2.3} color="#80a8ce" />
    <directionalLight position={[2, 2, -3]} intensity={1.4} color="#d8f7f3" />
    <Environment resolution={128}>
      <Lightformer form="rect" intensity={3} position={[0, 5, -2]} rotation={[Math.PI / 2, 0, 0]} scale={[8, 4, 1]} />
      <Lightformer form="rect" intensity={2} position={[-4, 2, 2]} rotation={[0, Math.PI / 2, 0]} scale={[5, 3, 1]} />
      <Lightformer form="rect" intensity={2} position={[4, 3, 4]} rotation={[0, -Math.PI / 4, 0]} scale={[4, 4, 1]} />
    </Environment>
  </>;
}
