import { mechanicalConfig as config } from '../config/roverConfig';
import { Bolt, Box, materials, Rod } from './Primitives';
import { createMountingPlate } from './geometry';
import { useGeometry } from './useGeometry';

export function CameraBracket() {
  const c = config.cameras;
  const geometry = useGeometry('camera-carrier:sideplate', () => createMountingPlate({
    outline: [[-0.31, 0], [0.34, 0], [0.34, 0.055], [0.12, 0.085], [-0.11, 0.085], [-0.31, 0.055]],
    holes: [{ x: -0.12, y: 0.041, radius: 0.020 }, { x: 0.06, y: 0.041, radius: 0.023 }, { x: 0.24, y: 0.032, radius: 0.016 }],
    thickness: 0.028, bevel: 0.005,
  }));
  return <group name="camera-mount-assembly">
    <Box position={c.base} size={[...c.baseSize]} material="dark" />
    {[-1, 1].map(side => <group key={side}>
      <mesh position={[c.base[0], 1.025, side * c.sideSpacing]} geometry={geometry} material={materials.silver} dispose={null} castShadow />
      <Rod from={[0.5, 1.025, side * 0.35]} to={[1.075, 1.09, side * 0.35]} radius={0.02} material="edge" />
      <Rod from={[0.51, 1.04, side * 0.12]} to={[0.61, 1.315, side * 0.12]} radius={0.022} />
      <Rod from={[0.83, 1.04, side * 0.12]} to={[0.61, 1.315, side * 0.12]} radius={0.022} />
      {[0.51, 1.06].map(x => <Bolt key={x} position={[x, 1.026, side * 0.35]} normal={[0, 1, 0]} scale={0.65} />)}
      {[-0.20, 0.18].map(dx => <Bolt key={dx} position={[c.base[0] + dx, 1.07, side * (c.sideSpacing + 0.022)]} normal={[0, 0, side]} scale={0.65} />)}
    </group>)}
    <Box position={c.frontBeam} size={c.frontBeamSize} material="silver" />
    <Box position={[0.61, 1.315, 0]} size={[0.24, 0.025, 0.35]} material="silver" />
    <Box position={[0.79, 1.031, 0]} size={[0.45, 0.025, 0.075]} material="rubber" />
  </group>;
}
