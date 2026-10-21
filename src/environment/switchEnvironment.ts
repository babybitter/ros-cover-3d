import { useEnvironment } from '../stores/environmentStore';
import { useSimulation } from '../stores/simulationStore';
import { useMapping } from '../stores/mappingStore';

export function switchEnvironment(mode: 'showroom' | 'campus') {
  if (useEnvironment.getState().mode === mode) return;
  useSimulation.getState().reset();
  useSimulation.getState().patch({ goal: mode === 'campus' ? { x: 64, z: 0 } : { x: 7, z: -5 }, editMode: 'orbit' });
  useEnvironment.getState().patch({ mode, visible: true, follow: true });
  useMapping.getState().clear();
  useSimulation.getState().log(mode === 'campus' ? '进入 200 × 200 m 仿真园区' : '返回数字样机展示场景');
}
