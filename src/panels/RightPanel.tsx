import { Activity, ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Camera, Check, ChevronRight, CircleStop, Crosshair, Gauge, LocateFixed, MapPin, Navigation, OctagonX, Play, Radar, Radio, Route, Square, Trash2, Video, Waves } from 'lucide-react';
import { useState } from 'react';
import { useSimulation } from '../stores/simulationStore';
import { IconButton, PanelTitle, Toggle } from '../components/UI';
import { MiniMap } from './MiniMap';
import type { ControlInput } from '../types';
import { collides } from '../simulation/CollisionDetector';
import { roverConfig as c } from '../config/roverConfig';
import { MappingPanel } from '../lidar/MappingPanel';
import { useMapping } from '../stores/mappingStore';
import { activeMap, useEnvironment } from '../stores/environmentStore';

export type WorkspaceTab = 'model' | 'navigation' | 'sensors' | 'mapping';
export function RightPanel({ tab }: { tab: WorkspaceTab }) {
  return <aside className="right-panel">{tab === 'mapping' ? <><MappingPanel /><VehicleControls /><Telemetry /></> : tab === 'navigation' ? <NavigationPanel /> : tab === 'sensors' ? <><SensorPanel expanded /><Telemetry /></> : <><VehicleControls /><SensorPanel /><Telemetry /></>}</aside>;
}

function VehicleControls() {
  const speed = useSimulation(s => s.speedLimit), input = useSimulation(s => s.input);
  const mode = useSimulation(s => s.mode), emergency = useSimulation(s => s.emergency);
  const patch = useSimulation(s => s.patch), stop = useSimulation(s => s.stop);
  const press = (control: ControlInput) => {
    if (emergency) return;
    patch({ input: control, mode: 'manual', showObstacles: true, navStatus: useSimulation.getState().navStatus === 'running' ? 'ready' : useSimulation.getState().navStatus });
  };
  const direction = (label: string, icon: typeof ArrowUp, control: ControlInput, className: string) => {
    const Icon = icon;
    return <button className={`drive-key ${className} ${JSON.stringify(input) === JSON.stringify(control) ? 'pressed' : ''}`} aria-label={label} title={label} disabled={emergency}
      onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); press(control); }}
      onPointerUp={() => patch({ input: { throttle: 0, steer: 0 } })}
      onLostPointerCapture={() => patch({ input: { throttle: 0, steer: 0 } })}><Icon size={18} /></button>;
  };
  return <section className="panel-section control-section">
    <PanelTitle aside={<span className="section-index">01</span>}>车辆控制</PanelTitle>
    <div className="segmented"><button className={mode === 'manual' ? 'active' : ''} onClick={() => { stop(); patch({ mode: 'manual' }); }}>手动控制</button><button className={mode === 'auto' ? 'active' : ''} onClick={() => useSimulation.getState().navigate()}>自主导航</button></div>
    <div className="drive-area">
      <div className="drive-pad">
        {direction('前进 · W / ↑', ArrowUp, { throttle: 1, steer: 0 }, 'drive-up')}
        {direction('左转 · A / ←', ArrowLeft, { throttle: 0.55, steer: -1 }, 'drive-left')}
        <button className="drive-key drive-stop" aria-label="停止行驶" title="停止行驶" onClick={() => stop()}><Square size={13} fill="currentColor" /></button>
        {direction('右转 · D / →', ArrowRight, { throttle: 0.55, steer: 1 }, 'drive-right')}
        {direction('后退 · S / ↓', ArrowDown, { throttle: -1, steer: 0 }, 'drive-down')}
      </div>
      <div className="drive-info"><span>控制模式</span><strong>{emergency ? '驱动锁定' : mode === 'auto' ? 'AUTO' : 'MANUAL'}</strong><span className={`status-inline ${emergency ? 'red' : ''}`}><i />{emergency ? '急停中' : '驱动已使能'}</span></div>
    </div>
    <div className="range-label"><label htmlFor="speed">目标速度</label><span>{speed.toFixed(1)} <small>m/s</small></span></div>
    <input id="speed" aria-label="目标速度" className="range" type="range" min="0.2" max="2" step="0.1" value={speed} onChange={e => patch({ speedLimit: Number(e.target.value) })} />
    <div className="range-ticks"><span>0.2</span><span>1.0</span><span>2.0 m/s</span></div>
    <button className={`emergency-button ${emergency ? 'engaged' : ''}`} onClick={() => emergency ? (patch({ emergency: false }), useSimulation.getState().log('急停已解除', 'success')) : stop(true)}><OctagonX size={16} />{emergency ? '解除急停' : '紧急停止'}<kbd>SPACE</kbd></button>
  </section>;
}

function SensorPanel({ expanded = false }: { expanded?: boolean }) {
  const scan = useMapping(s => s.enabled), reading = useSimulation(s => s.sensors), mapping = useMapping();
  const pan = useSimulation(s => s.cameraPan), threshold = useSimulation(s => s.threshold);
  const view = useSimulation(s => s.view), patch = useSimulation(s => s.patch);
  const [activeSensor, setActiveSensor] = useState('lidar');
  return <section className="panel-section sensor-section">
    <PanelTitle aside={<span className="tag muted-tag">SIMULATED</span>}>传感器状态</PanelTitle>
    <div className={`sensor-row ${activeSensor === 'lidar' ? 'chosen' : ''}`}>
      <button className="sensor-name" onClick={() => setActiveSensor('lidar')}><span className="sensor-icon"><Radar size={17} /></span><span><strong>激光雷达</strong><small>LiDAR · 360°</small></span></button>
      <span className={scan ? 'online-dot' : 'offline-dot'} /><Toggle label="雷达扫描可视化" checked={scan} onChange={() => mapping.patch({ enabled: !scan })} />
    </div>
    <div className="sensor-row">
      <button className="sensor-name" onClick={() => setActiveSensor('camera')}><span className="sensor-icon"><Video size={17} /></span><span><strong>立体摄像头</strong><small>Stereo · 3 lenses</small></span></button>
      <span className="online-dot" /><IconButton label={view === 'camera' ? '退出模拟摄像头' : '进入模拟摄像头'} icon={view === 'camera' ? Check : ChevronRight} active={view === 'camera'} onClick={() => useSimulation.getState().setView(view === 'camera' ? 'perspective' : 'camera')} />
    </div>
    <div className="sensor-row">
      <button className="sensor-name" onClick={() => setActiveSensor('ultrasonic')}><span className="sensor-icon"><Waves size={17} /></span><span><strong>超声波探测</strong><small>Ultrasonic · front</small></span></button>
      <span className={`distance-tag ${reading.warning}`}>{reading.frontDistance.toFixed(2)} m</span>
    </div>
    {(expanded || activeSensor !== 'lidar') && <div className="sensor-parameters">
      {activeSensor === 'camera' ? <><div className="range-label"><label htmlFor="pan">镜头水平角</label><span>{pan}°</span></div><input id="pan" className="range" type="range" min="-35" max="35" value={pan} onChange={e => patch({ cameraPan: Number(e.target.value) })} /><button className="text-button" onClick={() => useSimulation.getState().setView('camera')}><Camera size={13} />打开模拟摄像头</button></>
        : activeSensor === 'ultrasonic' ? <><div className="range-label"><label htmlFor="threshold">预警阈值</label><span>{threshold.toFixed(1)} m</span></div><input id="threshold" className="range" type="range" min="0.7" max="5" step="0.1" value={threshold} onChange={e => patch({ threshold: +e.target.value })} /></>
          : <div className="sensor-stats"><span>扫描线数 <b>{mapping.config.lines}</b></span><span>有效回波 <b>{mapping.hits}</b></span><span>探测范围 <b>{mapping.config.range} m</b></span><span>实际频率 <b>{mapping.actualHz.toFixed(1)} Hz</b></span></div>}
    </div>}
    <div className="sensor-note"><Radio size={11} /><span>虚拟传感器 · 无硬件连接</span><span className="tiny-label">{mapping.actualHz.toFixed(1)} Hz</span></div>
    {expanded && <div className="scan-map"><MiniMap large /><div className="map-label">辅助二维避障 / WORLD FRAME</div></div>}
  </section>;
}

function Telemetry() {
  const v = useSimulation(s => s.vehicle);
  const metrics = [
    ['位置 X / Z', `${v.x.toFixed(2)} / ${v.z.toFixed(2)}`, 'm'],
    ['航向角', (v.heading * 180 / Math.PI).toFixed(1), '°'],
    ['累计里程', v.distance.toFixed(2), 'm'],
    ['转向角', (v.steering * 180 / Math.PI).toFixed(1), '°'],
    ['IMU 俯仰 / 横滚', `${(v.pitch * 180 / Math.PI).toFixed(1)} / ${(v.roll * 180 / Math.PI).toFixed(1)}`, '°'],
  ];
  return <section className="panel-section telemetry-section"><PanelTitle aside={<Activity size={14} />}>实时遥测</PanelTitle>
    <div className="speed-display"><Gauge size={23} /><strong>{Math.abs(v.speed).toFixed(2)}</strong><span>m/s</span><div className="telemetry-bars">{Array.from({ length: 17 }, (_, i) => <i key={i} className={i / 17 < Math.abs(v.speed) / 2 ? 'lit' : ''} />)}</div></div>
    <dl>{metrics.map(([label, value, unit]) => <div key={label}><dt>{label}</dt><dd>{value}<span>{unit}</span></dd></div>)}</dl>
  </section>;
}

const navLabels = { idle: '待规划', ready: '路径就绪', running: '导航中', arrived: '已到达', blocked: '不可达' };
function NavigationPanel() {
  const s = useSimulation(), selected = s.obstacles.find(o => o.id === s.selectedObstacle);
  useEnvironment(state => state.mode);
  const map = activeMap(), limit = map.max - 1;
  const moveObstacle = (axis: 'x' | 'z', value: number) => {
    if (!selected || !Number.isFinite(value)) return;
    const next = { ...selected, [axis]: Math.max(-limit, Math.min(limit, value)) };
    if (collides(s.vehicle, [next], c.collisionRadius + 0.1)) { s.log('移动位置与车辆重叠', 'warn'); return; }
    s.patch({ obstacles: s.obstacles.map(o => o.id === next.id ? next : o), path: [], navStatus: 'idle', mode: 'manual', input: { throttle: 0, steer: 0 } });
  };
  return <>
    <section className="panel-section">
      <PanelTitle aside={<span className="tag">{navLabels[s.navStatus]}</span>}>自主导航</PanelTitle>
      <div className="nav-map"><MiniMap large /><span>{map.max * 2} × {map.max * 2} m</span></div>
      <div className="waypoint"><LocateFixed size={15} /><span>当前位置</span><strong>{s.vehicle.x.toFixed(1)}, {s.vehicle.z.toFixed(1)}</strong></div>
      <div className="waypoint"><MapPin size={15} /><span>目标点</span><div className="coordinate-inputs"><input aria-label="目标 X" type="number" min={-limit} max={limit} step="0.5" value={s.goal.x} onChange={e => s.patch({ goal: { ...s.goal, x: Math.max(-limit, Math.min(limit, +e.target.value)) }, path: [], navStatus: 'idle' })} /><input aria-label="目标 Z" type="number" min={-limit} max={limit} step="0.5" value={s.goal.z} onChange={e => s.patch({ goal: { ...s.goal, z: Math.max(-limit, Math.min(limit, +e.target.value)) }, path: [], navStatus: 'idle' })} /></div></div>
      <div className="map-tools"><button className={s.editMode === 'start' ? 'active' : ''} onClick={() => { s.patch({ editMode: s.editMode === 'start' ? 'orbit' : 'start' }); s.setView('top'); }}><Crosshair size={13} />起点</button><button className={s.editMode === 'goal' ? 'active' : ''} onClick={() => { s.patch({ editMode: s.editMode === 'goal' ? 'orbit' : 'goal' }); s.setView('top'); }}><MapPin size={13} />目标</button><button className={s.editMode === 'obstacle' ? 'active' : ''} onClick={() => { s.patch({ editMode: s.editMode === 'obstacle' ? 'orbit' : 'obstacle' }); s.setView('top'); }}><Square size={13} />障碍物</button></div>
      <div className="navigation-actions"><button className="secondary-button" onClick={() => s.plan()}><Route size={14} />规划路径</button><button className="primary-button" onClick={() => s.navStatus === 'running' ? s.stop() : s.navigate()}>{s.navStatus === 'running' ? <CircleStop size={14} /> : <Play size={14} />}{s.navStatus === 'running' ? '停止' : '运行'}</button></div>
      <div className="planner-meta"><span>A* / {map.resolution} m 网格</span><span>{s.path.length} 节点</span></div>
    </section>
    <section className="panel-section">
      <PanelTitle aside={<span className="section-index">{s.obstacles.length.toString().padStart(2, '0')}</span>}>场景障碍物</PanelTitle>
      <div className="obstacle-list">{s.obstacles.map((o, i) => <button className={selected?.id === o.id ? 'selected' : ''} key={o.id} onClick={() => s.patch({ selectedObstacle: o.id })}><Square size={12} /><span>障碍物 {String(i + 1).padStart(2, '0')}</span><small>{o.x}, {o.z}</small></button>)}</div>
      {selected && <div className="obstacle-edit"><label>X<input aria-label="障碍物 X" type="number" step="0.5" min={-limit} max={limit} value={selected.x} onChange={e => moveObstacle('x', +e.target.value)} /></label><label>Z<input aria-label="障碍物 Z" type="number" step="0.5" min={-limit} max={limit} value={selected.z} onChange={e => moveObstacle('z', +e.target.value)} /></label><IconButton label="删除选中障碍物" icon={Trash2} onClick={() => { s.patch({ obstacles: s.obstacles.filter(o => o.id !== selected.id), selectedObstacle: null, path: [], navStatus: 'idle', mode: 'manual' }); s.log('障碍物已删除'); }} /></div>}
      <div className="sensor-note"><Navigation size={11} /><span>安全膨胀半径 {(c.collisionRadius + 0.12).toFixed(2)} m</span></div>
    </section>
  </>;
}
