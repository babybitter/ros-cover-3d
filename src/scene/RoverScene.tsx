import { Component, Suspense, useState, type ReactNode } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { GizmoHelper, GizmoViewport } from '@react-three/drei';
import * as THREE from 'three';
import { RoverModel } from '../rover/RoverModel';
import { updateSimulation } from '../simulation/VehicleController';
import { SceneLighting } from './SceneLighting';
import { CameraController } from './CameraController';
import { SensorVisualization } from './SensorVisualization';
import { World } from './World';
import { detailProfiles } from '../config/roverConfig';
import { useSimulation } from '../stores/simulationStore';
import { GroundContactShadows } from './GroundContactShadows';

class SceneBoundary extends Component<{ children: ReactNode }, { error: string }> {
  state = { error: '' };
  static getDerivedStateFromError(e: Error) { return { error: e.message }; }
  render() { return this.state.error ? <div className="scene-error">三维渲染暂时不可用<br /><small>{this.state.error}</small><button onClick={() => location.reload()}>重新加载</button></div> : this.props.children; }
}
function SimulationLoop() { useFrame((_, dt) => updateSimulation(dt), -2); return null; }
export function RoverScene() {
  const [ready, setReady] = useState(false);
  const profile = useSimulation(s => detailProfiles[s.detailLevel]);
  return <SceneBoundary>
    {!ready && <div className="scene-loading"><span className="loader" />正在构建三维场景</div>}
    <Canvas shadows dpr={[1, profile.dpr]} camera={{ position: [5.1, 3.3, 5.5], fov: 36, near: 0.05, far: 150 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance', preserveDrawingBuffer: true }}
      onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.13; setReady(true); }}
      fallback={<div className="scene-error">当前浏览器不支持 WebGL，请启用硬件加速。</div>}>
      <Suspense fallback={null}>
        <fog attach="fog" args={['#263846', 16, 45]} />
        <SceneLighting /><SimulationLoop /><World /><RoverModel /><SensorVisualization /><CameraController />
        <GroundContactShadows resolution={profile.contactResolution} />
        <GizmoHelper alignment="bottom-right" margin={[49, 55]}><GizmoViewport axisColors={['#e3a294', '#a3cead', '#8baee0']} labelColor="#161e27" hideNegativeAxes /></GizmoHelper>
      </Suspense>
    </Canvas>
  </SceneBoundary>;
}
