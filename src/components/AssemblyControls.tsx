import { Layers3, RotateCcw, RotateCw } from 'lucide-react';
import { useAssembly } from '../stores/assemblyStore';
import { useSimulation } from '../stores/simulationStore';
import { IconButton, Toggle } from './UI';

export function AssemblyControls() {
  const exploded = useSimulation(s => s.exploded);
  const { progress, target, playing, speed, seek, setSpeed, replay, restore } = useAssembly();
  const status = playing ? target ? '拆分中' : '组合中' : progress === 0 ? '已装配' : progress === 1 ? '已拆分' : '手动定位';
  return <div className="assembly-controls">
    <div className="setting-row"><span><Layers3 size={14} />结构分解</span><Toggle label="结构分解" checked={exploded} onChange={() => useSimulation.getState().patch({ exploded: !exploded })} /></div>
    <div className="assembly-progress-label"><span>{status}</span><output aria-label="实际拆分进度">{Math.round(progress * 100)}%</output></div>
    <input className="range" type="range" min="0" max="100" step="0.1" aria-label="拆分进度" value={progress * 100} onChange={e => seek(+e.target.value / 100)} />
    <div className="assembly-actions">
      <label>动画速度<select aria-label="拆分动画速度" value={speed} onChange={e => setSpeed(+e.target.value)}>
        {[0.5, 1, 1.5, 2].map(value => <option key={value} value={value}>{value}×</option>)}
      </select></label>
      <IconButton icon={RotateCw} label="重新播放拆分动画" onClick={replay} />
      <IconButton icon={RotateCcw} label="立即恢复装配状态" onClick={restore} />
    </div>
  </div>;
}
