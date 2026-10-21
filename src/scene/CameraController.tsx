import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { useSimulation } from '../stores/simulationStore';
import { runtime } from '../simulation/VehicleController';
import type { ViewPreset } from '../types';
import { useEnvironment } from '../stores/environmentStore';

const offsets: Record<ViewPreset, [number, number, number]> = {
  perspective: [5.1, 3.3, 5.5], front: [7, 1.4, 0], rear: [-7, 1.4, 0],
  left: [0, 1.5, 7], right: [0, 1.5, -7], top: [0.01, 10, 0], camera: [1.3, 1.25, 0],
};
export function CameraController() {
  const ref = useRef<OrbitControlsImpl>(null!);
  const { camera, size } = useThree();
  const view = useSimulation(s => s.view), revision = useSimulation(s => s.viewRevision);
  const autoRotate = useSimulation(s => s.autoRotate), editMode = useSimulation(s => s.editMode);
  const campus = useEnvironment(s => s.mode === 'campus'), follow = useEnvironment(s => s.follow);
  const target = useRef(new THREE.Vector3(0, 0.85, 0));
  const last = useRef(new THREE.Vector3());
  const destination = useRef(new THREE.Vector3());
  const transition = useRef(false);
  useEffect(() => {
    const v = runtime.vehicle;
    const offset = new THREE.Vector3(...offsets[view]);
    if (campus && view === 'perspective') offset.set(11, 8, 12);
    if (view === 'top') offset.y = campus ? 250 : useSimulation.getState().showObstacles ? 35 : 10;
    if (view !== 'camera') offset.multiplyScalar(Math.max(1, 0.95 / (size.width / size.height)));
    const mapTop = campus && view === 'top';
    destination.current.copy(offset).add(new THREE.Vector3(mapTop ? 0 : v.x, 0, mapTop ? 0 : v.z));
    target.current.set(mapTop ? 0 : v.x, 0.85, mapTop ? 0 : v.z);
    transition.current = true;
  }, [view, revision, size.width, size.height, campus]);
  useFrame((_, dt) => {
    const v = runtime.vehicle;
    const position = new THREE.Vector3(v.x, 0, v.z);
    if (view === 'camera') {
      const angle = v.heading - useSimulation.getState().cameraPan * Math.PI / 180;
      camera.position.set(v.x + Math.cos(v.heading) * 1.35, 1.28, v.z + Math.sin(v.heading) * 1.35);
      camera.lookAt(v.x + Math.cos(angle) * 9, 0.8, v.z + Math.sin(angle) * 9);
    } else if (transition.current) {
      camera.position.lerp(destination.current, 1 - Math.exp(-dt * 7));
      ref.current.target.lerp(target.current, 1 - Math.exp(-dt * 7));
      ref.current.update();
      if (camera.position.distanceTo(destination.current) < 0.015) transition.current = false;
    } else {
      if (follow && !(campus && view === 'top')) {
        const delta = position.clone().sub(last.current);
        camera.position.add(delta); ref.current.target.add(delta);
      }
      ref.current.update();
    }
    last.current.copy(position);
  });
  return <OrbitControls ref={ref} makeDefault enabled={view !== 'camera' && editMode === 'orbit'} target={[0, 0.85, 0]} minDistance={3.2} maxDistance={campus ? 450 : 75} maxPolarAngle={Math.PI / 2 - 0.025} autoRotate={autoRotate} autoRotateSpeed={0.7} enableDamping dampingFactor={0.08} onStart={() => { transition.current = false; }} />;
}
