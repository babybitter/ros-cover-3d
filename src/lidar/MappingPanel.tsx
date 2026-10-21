import { Eye, Focus, Map, Pause, Play, Radar, RotateCcw, Trash2 } from 'lucide-react';
import { PanelTitle, Toggle, IconButton } from '../components/UI';
import { useMapping } from '../stores/mappingStore';
import { useEnvironment } from '../stores/environmentStore';
import { useSimulation } from '../stores/simulationStore';
import { switchEnvironment } from '../environment/switchEnvironment';
import { maxMapPoints, type CloudColor } from './LidarConfig';

export function MappingPanel() {
  const m = useMapping(), e = useEnvironment(), v = useSimulation(s => s.vehicle);
  const paused = useSimulation(s => s.paused);
  const mappingActive = m.enabled && m.accumulating;
  const toggle = (label: string, checked: boolean, action: () => void) => <div className="setting-row"><span>{label}</span><Toggle label={label} checked={checked} onChange={action} /></div>;
  const range = (label: string, value: number, min: number, max: number, step: number, unit: string, change: (value: number) => void) =>
    <label className="mapping-range"><span className="range-label">{label}<span>{value.toFixed(step < 0.1 ? 3 : step < 1 ? 1 : 0)} {unit}</span></span><input aria-label={label} className="range" type="range" min={min} max={max} step={step} value={value} onChange={event => change(+event.target.value)} /></label>;
  return <>
    <section className="panel-section mapping-panel">
      <PanelTitle aside={<span className="tag muted-tag">SIMULATION</span>}>探索场景</PanelTitle>
      <div className="segmented"><button className={e.mode === 'showroom' ? 'active' : ''} onClick={() => switchEnvironment('showroom')}>数字样机</button><button className={e.mode === 'campus' ? 'active' : ''} onClick={() => switchEnvironment('campus')}>200 m 园区</button></div>
      {toggle('显示原始环境', e.visible, () => e.patch({ visible: !e.visible }))}
      {toggle('相机跟随车辆', e.follow, () => e.patch({ follow: !e.follow }))}
      {toggle('场景边界', e.showBounds, () => e.patch({ showBounds: !e.showBounds }))}
      <div className="mapping-camera">
        <button className="secondary-button" onClick={() => { e.patch({ follow: false }); useSimulation.getState().setView('top'); }}><Map size={13} />俯视地图</button>
        <IconButton label="自由观察" icon={Eye} active={!e.follow} onClick={() => e.patch({ follow: false })} />
        <IconButton label="返回无人车" icon={Focus} onClick={() => { e.patch({ follow: true }); useSimulation.getState().setView('perspective'); }} />
      </div>
    </section>
    <section className="panel-section mapping-panel">
      <PanelTitle aside={<Radar size={14} />}>LiDAR / Mapping</PanelTitle>
      <div className="mapping-disclaimer">仿真位姿建图</div>
      {toggle('LiDAR 开启', m.enabled, () => m.patch({ enabled: !m.enabled }))}
      <div className="mapping-status"><span>扫描 <b>{!m.enabled ? '关闭' : paused ? '仿真暂停' : m.status === 'error' ? '异常' : '运行中'}</b></span><span>地图 <b>{m.accumulating && m.enabled && !paused ? '累积中' : '已暂停'}</b></span></div>
      <div className="navigation-actions">
        <button className="primary-button" onClick={() => m.patch({ enabled: true, accumulating: !mappingActive })}>{mappingActive ? <Pause size={13} /> : <Play size={13} />}{mappingActive ? '暂停建图' : '开始建图'}</button>
        <IconButton label="清空地图" icon={Trash2} onClick={() => m.clear()} />
        <IconButton label="重新开始建图" icon={RotateCcw} onClick={() => m.restart()} />
      </div>
      {m.error && <p role="alert" className="mapping-error">{m.error}</p>}
      {toggle('实时扫描点云', m.showLive, () => m.patch({ showLive: !m.showLive }))}
      {toggle('历史累积地图', m.showMap, () => m.patch({ showMap: !m.showMap }))}
      {toggle('扫描范围与历史边界', m.showRange, () => m.patch({ showRange: !m.showRange }))}
      <label className="setting-row"><span>颜色模式</span><select aria-label="点云颜色模式" value={m.color} onChange={event => m.patch({ color: event.target.value as CloudColor })}><option value="height">高度</option><option value="distance">距离</option><option value="intensity">强度（模拟）</option><option value="mono">单色青绿</option></select></label>
      {range('水平角分辨率', m.config.horizontalResolution, 0.2, 0.4, 0.1, '°', value => m.configure({ horizontalResolution: value }))}
      <label className="setting-row"><span>垂直扫描线</span><select aria-label="垂直扫描线" value={m.config.lines} onChange={event => m.configure({ lines: +event.target.value as 32 | 64 | 128 })}>{[32, 64, 128].map(n => <option key={n} value={n}>{n} 线</option>)}</select></label>
      {range('垂直视场角', m.config.verticalFov, 10, 90, 5, '°', value => m.configure({ verticalFov: value }))}
      {range('最大探测距离', m.config.range, 10, 100, 5, 'm', value => m.configure({ range: value }))}
      {range('目标扫描频率', m.config.frequency, 1, 10, 1, 'Hz', value => m.configure({ frequency: value }))}
      {range('实时点尺寸', m.liveSize, 0.015, 0.12, 0.005, 'm', value => m.patch({ liveSize: value }))}
      {range('地图点尺寸', m.mapSize, 0.015, 0.12, 0.005, 'm', value => m.patch({ mapSize: value }))}
      {range('体素尺寸（修改后清图）', m.voxelSize, 0.05, 0.3, 0.01, 'm', value => m.patch({ voxelSize: value }))}
      <div className="mapping-metrics">
        <span>地图点数<b>{m.points.toLocaleString()} / {maxMapPoints.toLocaleString()}</b></span>
        <span>本帧命中 / 射线<b>{m.hits.toLocaleString()} / {m.rays.toLocaleString()}</b></span>
        <span>实际频率 / 扫描耗时<b>{m.actualHz.toFixed(1)} Hz / {m.scanMs.toFixed(0)} ms</b></span>
        <span>已累积扫描<b>{m.scans}</b></span>
        <span>点云缓冲预算（CPU+GPU）<b>{(m.bytes / 1048576).toFixed(1)} MiB</b></span>
        <span>历史范围 X<b>{m.bounds ? `${m.bounds.minX.toFixed(1)} … ${m.bounds.maxX.toFixed(1)} m` : '—'}</b></span>
        <span>历史范围 Z<b>{m.bounds ? `${m.bounds.minZ.toFixed(1)} … ${m.bounds.maxZ.toFixed(1)} m` : '—'}</b></span>
        <span>车辆 X / Z / 航向<b>{v.x.toFixed(1)} / {v.z.toFixed(1)} / {(v.heading * 180 / Math.PI).toFixed(1)}°</b></span>
      </div>
    </section>
  </>;
}
