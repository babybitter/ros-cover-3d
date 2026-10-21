import { ChevronDown, ChevronUp, Circle, Download, ListFilter, Terminal, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useSimulation } from '../stores/simulationStore';
import { IconButton } from '../components/UI';

export function ConsolePanel() {
  const logs = useSimulation(s => s.logs), elapsed = useSimulation(s => s.elapsed);
  const [collapsed, setCollapsed] = useState(false), [warnings, setWarnings] = useState(false), [tab, setTab] = useState<'logs' | 'timeline'>('logs');
  const exportLog = () => {
    const state = useSimulation.getState();
    const blob = new Blob([JSON.stringify({ environment: 'simulation', vehicle: state.vehicle, elapsed: state.elapsed, logs: state.logs }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = 'zxaj-simulation-log.json'; a.click(); URL.revokeObjectURL(url);
  };
  return <section className={`console-panel ${collapsed ? 'collapsed' : ''}`}>
    <div className="console-toolbar"><div className="console-tabs"><button className={tab === 'logs' ? 'active' : ''} onClick={() => { setTab('logs'); setCollapsed(false); }}><Terminal size={13} />运行日志<span>{logs.length}</span></button><button className={tab === 'timeline' ? 'active' : ''} onClick={() => { setTab('timeline'); setCollapsed(false); }}>仿真时间线</button></div><div className="console-actions"><IconButton label="仅显示警告" icon={ListFilter} active={warnings} onClick={() => setWarnings(!warnings)} /><IconButton label="导出运行数据" icon={Download} onClick={exportLog} /><IconButton label="清空日志" icon={Trash2} onClick={() => useSimulation.getState().patch({ logs: [] })} /><IconButton label={collapsed ? '展开日志' : '收起日志'} icon={collapsed ? ChevronUp : ChevronDown} onClick={() => setCollapsed(!collapsed)} /></div></div>
    {!collapsed && (tab === 'logs' ? <div className="log-list">{[...logs].reverse().filter(l => !warnings || l.level === 'warn').map(l => <div className={`log-entry ${l.level}`} key={l.id}><time>{l.time}</time><Circle size={5} fill="currentColor" /><span className="log-origin">SIM</span><span>{l.message}</span></div>)}{(warnings ? !logs.some(l => l.level === 'warn') : !logs.length) && <div className="empty-log">暂无{warnings ? '警告' : '日志'}</div>}</div> : <div className="timeline"><div className="timeline-ruler">{Array.from({ length: 13 }, (_, i) => <span key={i}>{(i * 5).toFixed(0)} s</span>)}</div><div className="timeline-track"><span>SIMULATION</span><div><i style={{ width: `${Math.min(100, elapsed % 60 / 60 * 100)}%` }} /></div><strong>{elapsed.toFixed(2)} s</strong></div></div>)}
  </section>;
}
