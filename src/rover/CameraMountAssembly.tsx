import { mechanicalConfig as config } from '../config/roverConfig';
import { useSimulation } from '../stores/simulationStore';
import { Box, Cylinder } from './Primitives';
import { Cable, CameraModule, Lens } from './CameraModule';
import { CameraBracket } from './CameraBracket';
import { AssemblyPart } from './AssemblyPart';
import { explosionConfig as e } from '../config/explosionConfig';

export function Cameras() {
  const pan = useSimulation(s => s.cameraPan);
  const c = config.cameras;
  const bearingBottom = c.frontBeam[1] + c.frontBeamSize[1] / 2;
  const bearingTop = c.panPivot[1] + c.rotatingBeamOffset[1] - c.rotatingBeamSize[1] / 2;
  return <group name="camera-system">
    <AssemblyPart id="camera-carrier" config={e.cameras}>
    <CameraBracket />
    <Cylinder position={[c.panPivot[0], (bearingBottom + bearingTop) / 2, 0]} radius={c.bearingRadius} length={bearingTop - bearingBottom} material="dark" />
    <group position={c.panPivot} rotation={[0, pan * Math.PI / 180, 0]} name="camera-pan">
      <Box position={c.rotatingBeamOffset} size={c.rotatingBeamSize} material="silver" />
      {c.lensOffsets.map((z, i) => <group key={z}>
        <AssemblyPart id={`camera-${i + 1}`} config={e.cameraModule(z)}><CameraModule id={`${i + 1}`} position={[0.02, 0, z]} radius={z === 0 ? 0.076 : 0.059} /></AssemblyPart>
        <Cable points={[[-0.09, -0.035, z], [-0.16, -0.06, z], [-0.16, -0.14, z * 0.55], [-0.12, -0.19, 0]]} />
      </group>)}
    </group>
    <AssemblyPart id="camera-4" config={e.upperCamera}><CameraModule id="4" position={c.upperCenter} radius={0.065} /></AssemblyPart>
    <Cable points={[[0.5, 1.48, 0], [0.43, 1.42, 0], [0.48, 1.14, 0], [0.64, 1.04, 0]]} />
    <Cable points={[[0.99, 1.06, 0], [0.86, 1.04, 0], [0.51, 1.025, 0], [0.38, 1.04, 0]]} radius={0.018} />
    </AssemblyPart>
    {[-0.48, 0.48].map(z => <group key={z}>
      <Box size={[0.032, 0.055, 0.18]} position={[1.403, 0.81, z]} material={z < 0 ? 'blue' : 'cyan'} />
      <group name={`bumper-lens-${z}`}><Lens position={[1.41, 0.73, z * 0.49]} radius={0.043} /></group>
    </group>)}
    <Box size={[0.034, 0.055, 0.17]} position={[-1.397, 0.8, 0]} material="blue" />
  </group>;
}
