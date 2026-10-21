import { useState } from 'react';
import { Activity, Box, ChevronDown, CircleHelp, Clock3, Expand, Focus, Grid2X2, Layers3, MousePointer2, MoveUpRight, Navigation, Orbit, PanelLeftClose, PanelRight, Pause, Play, Radar, RotateCcw, RotateCw, ScanLine, Settings2, ShieldCheck, Video, X } from 'lucide-react';
import { RoverScene } from '../scene/RoverScene';
import { useSimulation } from '../stores/simulationStore';
import { LeftPanel } from '../panels/LeftPanel';
import { RightPanel, type WorkspaceTab } from '../panels/RightPanel';
import { ConsolePanel } from '../panels/ConsolePanel';
import { IconButton, Toggle } from '../components/UI';
import { ModelDisplayControls } from '../components/ModelDisplayControls';
import { useKeyboard } from '../hooks/useKeyboard';
import type { ViewPreset } from '../types';

const views: [ViewPreset, string][] = [['perspective', '默认透视'], ['front', '前视图'], ['rear', '后视图'], ['left', '左视图'], ['right', '右视图'], ['top', '俯视图'], ['camera', '模拟摄像头']];
const tabs: { id: WorkspaceTab; name: string; icon: typeof Box }[] = [{ id: 'model', name: '数字样机', icon: Box }, { id: 'navigation', name: '导航与规划', icon: Navigation }, { id: 'sensors', name: '传感器空间', icon: Radar }];
const formatTime = (seconds: number) => `${String(Math.floor(seconds / 3600)).padStart(2, '0')}:${String(Math.floor(seconds / 60) % 60).padStart(2, '0')}:${(seconds % 60).toFixed(1).padStart(4, '0')}`;

export function App() {
  useKeyboard();
  const [tab, setTab] = useState<WorkspaceTab>('model'), [left, setLeft] = useState(true), [right, setRight] = useState(false), [help, setHelp] = useState(false);
  const [settings, setSettings] = useState(false);
  const exploded = useSimulation(s => s.exploded);
  const paused = useSimulation(s => s.paused), emergency = useSimulation(s => s.emergency), elapsed = useSimulation(s => s.elapsed);
  const v = useSimulation(s => s.vehicle), view = useSimulation(s => s.view), wireframe = useSimulation(s => s.wireframe);
  const autoRotate = useSimulation(s => s.autoRotate), timeScale = useSimulation(s => s.timeScale), showLidar = useSimulation(s => s.showLidar), showGrid = useSimulation(s => s.showGrid);
  const editMode = useSimulation(s => s.editMode), patch = useSimulation(s => s.patch), setView = useSimulation(s => s.setView);
  const fullscreen = async () => {
    try { if (!document.fullscreenElement) await document.documentElement.requestFullscreen(); else await document.exitFullscreen(); }
    catch { useSimulation.getState().log('浏览器拒绝全屏请求', 'warn'); }
  };
  const changeTab = (next: WorkspaceTab) => {
    setTab(next);
    patch({ editMode: 'orbit' });
    if (next === 'navigation') { patch({ showObstacles: true, showLidar: false }); setView('top'); }
    else if (next === 'sensors') { patch({ showLidar: true, showObstacles: true }); setView('perspective'); }
    else { patch({ showLidar: false, showObstacles: false }); setView('perspective'); }
  };
  return <div className="app-shell">
    <header className="app-header">
      <a className="brand" href="#" onClick={e => { e.preventDefault(); changeTab('model'); }}><span className="brand-symbol"><Layers3 size={24} strokeWidth={2.2} /></span><span className="brand-word">ZXAJ<span className="brand-period">.</span></span></a>
      <div className="header-divider" /><div className="project-name"><strong>无人车仿真平台</strong><span>ROBOTICS SIMULATION WORKBENCH</span></div>
      <div className="header-center"><span className={`status-indicator ${emergency ? 'danger' : paused ? 'paused' : ''}`} /><span>{emergency ? '急停锁定' : paused ? '仿真已暂停' : '仿真运行中'}</span><span className="environment-tag">LOCAL</span></div>
      <div className="header-actions"><span className="sim-clock"><Clock3 size={13} />{formatTime(elapsed)}</span><div className="header-divider" /><IconButton label={paused ? '继续仿真' : '暂停仿真'} icon={paused ? Play : Pause} active={!paused} onClick={() => patch({ paused: !paused })} /><IconButton label="重置仿真" icon={RotateCcw} onClick={() => useSimulation.getState().reset()} /><IconButton label="全屏" icon={Expand} onClick={fullscreen} /><IconButton label="操作说明" icon={CircleHelp} onClick={() => setHelp(true)} /></div>
    </header>
    <nav className="workspace-nav"><div className="workspace-label"><span className="project-dot" />ZXAJ-R01<span className="workspace-version">/ workspace</span><ChevronDown size={12} /></div><div className="workspace-tabs">{tabs.map(({ id, name, icon: Icon }) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => changeTab(id)}><Icon size={15} />{name}{tab === id && <span className="tab-dot" />}</button>)}</div><div className="workspace-right"><span><ShieldCheck size={12} />虚拟仿真</span><IconButton label="显示控制面板" icon={PanelRight} active={right} onClick={() => setRight(!right)} /></div></nav>
    <main className={`workbench ${left ? '' : 'left-hidden'} ${right ? 'right-open' : ''}`}>
      {left && <LeftPanel />}
      <section className="viewport" aria-label="三维无人车场景">
        <RoverScene />
        <div className="viewport-top"><div className="scene-breadcrumb"><span className="green-dot" /><span>{tab === 'model' ? '模型空间' : tab === 'navigation' ? '导航空间' : '传感器空间'}</span><ChevronDown size={11} /><span className="scene-divider">/</span><span>ZXAJ-R01</span></div><span className="render-badge">{view === 'perspective' ? 'PERSPECTIVE' : view.toUpperCase()} <span>·</span> PBR</span></div>
        <div className="scene-toolbar"><div className="toolbar-group"><IconButton className="left-panel-toggle" label={left ? '收起模型面板' : '展开模型面板'} icon={PanelLeftClose} active={left} onClick={() => setLeft(!left)} /><i className="left-panel-toggle" /><IconButton label="环绕观察" icon={Orbit} active={editMode === 'orbit'} onClick={() => patch({ editMode: 'orbit' })} /><IconButton label="自动旋转" icon={RotateCw} active={autoRotate} onClick={() => patch({ autoRotate: !autoRotate })} /><IconButton label="线框模式" icon={ScanLine} active={wireframe} onClick={() => patch({ wireframe: !wireframe })} /><i /><IconButton label="地面网格开关" icon={Grid2X2} active={showGrid} onClick={() => patch({ showGrid: !showGrid })} /><IconButton label="激光雷达扫描" icon={Radar} active={showLidar} onClick={() => patch({ showLidar: !showLidar })} /><IconButton label="模型显示设置" icon={Settings2} active={settings} aria-expanded={settings} aria-controls="model-settings" onClick={() => setSettings(!settings)} /></div>
          <div className="toolbar-group view-select"><Focus size={14} /><select aria-label="场景视角" value={view} onChange={e => setView(e.target.value as ViewPreset)}>{views.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select><IconButton label="恢复默认视角" icon={RotateCcw} onClick={() => setView('perspective')} /></div></div>
        {settings && <div id="model-settings" className="model-settings" role="region" aria-label="模型显示设置" onKeyDown={e => { if (e.key === 'Escape') setSettings(false); }}><div className="model-settings-title"><strong>模型显示</strong><IconButton label="关闭显示设置" icon={X} onClick={() => setSettings(false)} /></div><ModelDisplayControls /><div className="setting-row"><span><Layers3 size={14} />结构分解</span><Toggle label="结构分解" checked={exploded} onChange={() => patch({ exploded: !exploded })} /></div></div>}
        {view === 'camera' && <div className="camera-overlay"><span><Video size={15} />CAM 01 · 模拟摄像头画面</span><button onClick={() => setView('perspective')} aria-label="关闭模拟摄像头"><X size={14} /></button><div className="camera-reticle" /></div>}
        {editMode !== 'orbit' && <div className="edit-indicator"><MousePointer2 size={13} />{editMode === 'goal' ? '目标点编辑' : editMode === 'start' ? '起点编辑' : '障碍物放置'}<button aria-label="结束地图编辑" onClick={() => patch({ editMode: 'orbit' })}><X size={13} /></button></div>}
        <div className="model-caption"><span className="model-eyebrow">AUTONOMOUS ROVER</span><h1>ZXAJ<span> — R01</span></h1><div><span className="model-status-dot" />{tab === 'model' ? '四轮驱动 · 独立悬架' : tab === 'navigation' ? 'A* 网格导航 · 障碍物感知' : '虚拟传感器 · 10 Hz 采样'}</div></div>
        <div className="viewport-footer"><span className="axis-origin"><MoveUpRight size={12} />WORLD <b>Y ↑</b></span><span>1 UNIT = 1 m</span><div className="viewport-position"><span>X <b>{v.x.toFixed(2)}</b></span><span>Y <b>0.00</b></span><span>Z <b>{v.z.toFixed(2)}</b></span></div></div>
        <div className="scale-bar"><span /><small>1 m</small></div>
      </section>
      <RightPanel tab={tab} />
    </main>
    <ConsolePanel />
    <footer className="status-bar"><div><span className="green-dot" /><span>{emergency ? '急停锁定' : paused ? '仿真已暂停' : '引擎就绪'}</span><i /><span><Box size={11} />ZXAJ-R01</span><i /><span className="status-optional">WebGL 2 · THREE.JS</span></div><div><span className="status-optional"><Activity size={11} />仿真数据</span><i /><label>时间倍率<select aria-label="时间倍率" value={timeScale} onChange={e => patch({ timeScale: +e.target.value })}><option value={0.5}>0.5×</option><option value={1}>1.0×</option><option value={2}>2.0×</option></select></label><i /><span className="status-optional"><span className="green-dot" />{emergency ? '驱动已锁定' : paused ? '时钟已冻结' : '系统正常'}</span></div></footer>
    {help && <div className="modal-backdrop" onClick={() => setHelp(false)}><div className="help-modal" role="dialog" aria-modal="true" aria-label="操作说明" onClick={e => e.stopPropagation()}><div><h2>操作说明</h2><IconButton label="关闭说明" icon={X} onClick={() => setHelp(false)} /></div><dl><dt>视角控制</dt><dd>鼠标左键旋转，右键平移，滚轮缩放。</dd><dt>车辆控制</dt><dd>W / S 前进后退，A / D 转向；方向键同样有效。松开减速，空格急停。</dd><dt>自主导航</dt><dd>进入导航与规划，设置目标并规划路径；地图中可放置障碍物，选中后可修改位置或删除。</dd><dt>传感器</dt><dd>雷达执行二维射线检测；摄像头显示车载模拟视角。所有数据均来自本地软件仿真。</dd></dl><p>外观依据文字描述程序化构建，未导入参考照片或真实硬件数据。</p></div></div>}
  </div>;
}
