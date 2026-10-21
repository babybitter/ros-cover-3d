import { campus } from './EnvironmentConfig';
import { EnvironmentChunk } from './EnvironmentChunk';
import { useEnvironment } from '../stores/environmentStore';

// Spatial batches retain frustum culling while sharing geometry across repeated items.
const batches = new Map<string, typeof campus.surfaces>();
for (const s of campus.surfaces) {
  const key = `${Math.floor(s.center[0] / 50)},${Math.floor(s.center[2] / 50)}:${s.kind}:${s.color}`;
  const batch = batches.get(key) ?? [];
  batch.push(s); batches.set(key, batch);
}
const groups = [...batches.values()];
export function EnvironmentScene() {
  const mode = useEnvironment(s => s.mode), visible = useEnvironment(s => s.visible);
  return mode === 'campus' && visible ? <EnvironmentChunk groups={groups} /> : null;
}
