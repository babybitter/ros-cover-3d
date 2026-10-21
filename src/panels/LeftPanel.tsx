import { Box as BoxIcon, ChevronDown, ChevronRight, CircleDot, Cpu, Eye, EyeOff, Layers3, Radar, ScanLine, Settings2, Shield, Unplug, Video, Wrench } from 'lucide-react';
import { useSimulation } from '../stores/simulationStore';
import { PanelTitle, Toggle } from '../components/UI';

const parts = [
  { id: 'chassis', name: '车体与金属底盘', icon: BoxIcon, count: '01' },
  { id: 'wheels', name: '全地形驱动轮', icon: CircleDot, count: '04' },
  { id: 'suspension', name: '独立悬架系统', icon: Wrench, count: '04' },
  { id: 'gears', name: '机械传动齿轮组', icon: Settings2, count: '08' },
  { id: 'lidar', name: '360° 激光雷达', icon: Radar, count: '01' },
  { id: 'cameras', name: '多目视觉传感器', icon: Video, count: '04' },
];
export function LeftPanel() {
  const components = useSimulation(s => s.components), selected = useSimulation(s => s.selectedPart);
  const grid = useSimulation(s => s.showGrid), obstacles = useSimulation(s => s.showObstacles), exploded = useSimulation(s => s.exploded);
  const patch = useSimulation(s => s.patch), wireframe = useSimulation(s => s.wireframe);
  return <aside className="left-panel">
    <PanelTitle aside={<span className="tiny-label">ASSEMBLY</span>}>模型结构</PanelTitle>
    <div className="tree-root"><ChevronDown size={13} /><Layers3 size={15} /><strong>ZXAJ-R01</strong><span className="tree-count">22</span></div>
    <div className="parts-tree">
      {parts.map(({ id, name, icon: Icon, count }) => <div className={`part-row ${selected === id ? 'selected' : ''}`} key={id}>
        <button className="part-select" onClick={() => patch({ selectedPart: selected === id ? '' : id })}><span className="tree-branch" /><Icon size={15} /><span>{name}</span><small>{count}</small></button>
        <button title={components[id] ? `隐藏${name}` : `显示${name}`} aria-label={components[id] ? `隐藏${name}` : `显示${name}`} className={`part-eye ${components[id] ? '' : 'muted'}`} onClick={() => patch({ components: { ...components, [id]: !components[id] } })}>{components[id] ? <Eye size={13} /> : <EyeOff size={13} />}</button>
        {selected === id && <div className="part-detail"><span>{id === 'lidar' ? '采样频率 10 Hz · 探测 7 m' : id === 'wheels' ? '半径 0.43 m · 八辐轮毂' : id === 'cameras' ? '三目立体视觉 + 前视镜头' : id === 'suspension' ? '螺旋弹簧 · 双连杆结构' : id === 'gears' ? '4 级联动 · 齿数比传动' : '铝合金框架 · 多层支撑'}</span></div>}
      </div>)}
    </div>
    <div className="sidebar-section">
      <PanelTitle aside={<Settings2 size={14} />}>场景设置</PanelTitle>
      <div className="setting-row"><span><ScanLine size={14} />地面网格</span><Toggle label="地面网格" checked={grid} onChange={() => patch({ showGrid: !grid })} /></div>
      <div className="setting-row"><span><BoxIcon size={14} />环境障碍物</span><Toggle label="环境障碍物" checked={obstacles} onChange={() => patch({ showObstacles: !obstacles })} /></div>
      <div className="setting-row"><span><Layers3 size={14} />结构分解</span><Toggle label="结构分解" checked={exploded} onChange={() => patch({ exploded: !exploded })} /></div>
      <div className="setting-row"><span><Unplug size={14} />线框显示</span><Toggle label="线框显示" checked={wireframe} onChange={() => patch({ wireframe: !wireframe })} /></div>
    </div>
    <div className="sidebar-section specification">
      <PanelTitle aside={<Cpu size={14} />}>平台参数</PanelTitle>
      <dl><div><dt>底盘尺寸</dt><dd>2.8 × 1.64 m</dd></div><div><dt>轴距 / 轮距</dt><dd>1.95 / 1.95 m</dd></div><div><dt>最大速度</dt><dd>2.0 m/s</dd></div><div><dt>驱动形式</dt><dd>4WD · 前轮转向</dd></div><div><dt>坐标基准</dt><dd>Y-UP · 米</dd></div></dl>
    </div>
    <div className="sidebar-foot"><div className="simulation-badge"><Shield size={15} /><span>纯软件仿真环境</span></div><span>LOCAL SIMULATOR <ChevronRight size={11} /></span><span className="version">ENGINE V1.0.0</span></div>
  </aside>;
}
