import { useSimulation } from '../stores/simulationStore';
import type { BodyMode, DetailLevel } from '../config/roverConfig';

export function ModelDisplayControls() {
  const bodyMode = useSimulation(s => s.bodyMode), detailLevel = useSimulation(s => s.detailLevel);
  const patch = useSimulation(s => s.patch);
  return <div className="model-display-controls">
    <fieldset><legend>外壳展示</legend><div className="segmented">
      {([['bare', '裸露'], ['full', '完整'], ['transparent', '透明']] as [BodyMode, string][]).map(([value, label]) =>
        <button key={value} aria-label={`${label}外壳模式`} aria-pressed={bodyMode === value} className={bodyMode === value ? 'active' : ''} onClick={() => patch({ bodyMode: value })}>{label}</button>)}
    </div></fieldset>
    <fieldset><legend>渲染档位</legend><div className="segmented">
      {([['detail', '细节'], ['performance', '性能']] as [DetailLevel, string][]).map(([value, label]) =>
        <button key={value} aria-label={`${label}档位`} aria-pressed={detailLevel === value} className={detailLevel === value ? 'active' : ''} onClick={() => patch({ detailLevel: value })}>{label}</button>)}
    </div></fieldset>
  </div>;
}
