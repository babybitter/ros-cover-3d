import { mechanicalConfig, type Vec3 } from '../config/roverConfig';
import { useSimulation } from '../stores/simulationStore';
import { Bolt, materials } from './Primitives';
import { createMountingPlate } from './geometry';
import { useGeometry } from './useGeometry';
import { AssemblyPart } from './AssemblyPart';
import { explosionConfig as e } from '../config/explosionConfig';

function Panel({ size, position, rotation = [0, 0, 0], vented = false }: { size: [number, number]; position: Vec3; rotation?: Vec3; vented?: boolean }) {
  const transparent = useSimulation(s => s.bodyMode === 'transparent');
  const c = mechanicalConfig.panels;
  const [w, h] = size;
  const b = vented ? Math.min(c.bevel, w * 0.004) : c.bevel;
  const geometry = useGeometry(`body-panel:${w}:${h}:${vented}:${c.thickness}:${b}`, () => createMountingPlate({
    outline: [[-w / 2 + b, -h / 2 + b], [w / 2 - b, -h / 2 + b], [w / 2 - b, h / 2 - b], [-w / 2 + b, h / 2 - b]],
    thickness: c.thickness - b * 2, bevel: b,
    slots: vented ? Array.from({ length: 5 }, (_, i) => ({ x: (i - 2) * w * 0.135, y: 0, width: w * 0.035, height: h * 0.46 })) : [],
  }));
  return <group position={position} rotation={rotation}>
    <mesh geometry={geometry} material={transparent ? materials.transparentShell : materials.shell} renderOrder={transparent ? 2 : 0} dispose={null} castShadow={!transparent} receiveShadow />
    {[-1, 1].map(x => [-1, 1].map(y => <Bolt key={`${x}:${y}`} position={[x * (w / 2 - 0.044), y * (h / 2 - 0.044), c.thickness / 2 + 0.003]} scale={0.48} />))}
  </group>;
}

export function BodyPanels() {
  const mode = useSimulation(s => s.bodyMode);
  if (mode === 'bare') return null;
  const c = mechanicalConfig.panels;
  return <group name="body-panels">
    {[-1, 1].map(s => <AssemblyPart key={s} id={`shell-side-${s}`} config={e.shellSide(s)}>
      {[-0.31, 0.31].map(x => <Panel key={x} size={[0.48, 0.12]} position={[x, 0.61, s * c.sideZ]} rotation={[0, s < 0 ? Math.PI : 0, 0]} vented />)}
      <Panel size={[0.84, 0.17]} position={[-0.14, 1.076, s * 0.398]} rotation={[0, s < 0 ? Math.PI : 0, 0]} vented />
      <Panel size={[0.42, 0.23]} position={[-0.97, 1.105, s * 0.27]} rotation={[0, s < 0 ? Math.PI : 0, 0]} />
    </AssemblyPart>)}
    <AssemblyPart id="hatch" config={e.hatch}><Panel size={[0.42, 0.54]} position={[-0.97, 1.235, 0]} rotation={[-Math.PI / 2, 0, 0]} vented /></AssemblyPart>
    <AssemblyPart id="shell-rear" config={e.shellEnd(-1)}><Panel size={[0.54, 0.23]} position={[-1.2, 1.105, 0]} rotation={[0, -Math.PI / 2, 0]} /></AssemblyPart>
    <AssemblyPart id="shell-front" config={e.shellEnd(1)}><Panel size={[0.82, 0.14]} position={[1.284, 0.913, 0]} rotation={[0, Math.PI / 2, 0]} vented /></AssemblyPart>
  </group>;
}
