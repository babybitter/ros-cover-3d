import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const output = new URL('../artifacts/', import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  headless: true,
  args: ['--use-angle=swiftshader', '--enable-webgl', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
const report = {};
const waitForFrames = count => page.evaluate(async count => {
  const { runtime } = window.__roverQA;
  const start = runtime.ticks;
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { clearInterval(timer); reject(new Error('No simulation frames')); }, 60000);
    const timer = setInterval(() => {
      if (runtime.ticks >= start + count) { clearTimeout(timeout); clearInterval(timer); resolve(); }
    }, 50);
  });
}, count);
const sceneInfo = () => page.evaluate(async () => {
  const { _roots, Box3, Vector3 } = window.__roverQA;
  const canvas = document.querySelector('.viewport canvas');
  const { scene, camera, gl } = _roots.get(canvas).store.getState();
  const rover = scene.getObjectByName('ZXAJ-R01');
  scene.updateMatrixWorld(true);
  camera.updateMatrixWorld(true);
  const box = new Box3().setFromObject(rover);
  const points = [];
  for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) points.push(new Vector3(x, y, z).project(camera));
  const objects = [];
  rover.traverse(o => {
    if (/^(wheel-spin|gear-spin|lidar-spin)/.test(o.name)) objects.push({ name: o.name, y: o.rotation.y, z: o.rotation.z });
  });
  return {
    bounds: { minX: Math.min(...points.map(p => p.x)), maxX: Math.max(...points.map(p => p.x)), minY: Math.min(...points.map(p => p.y)), maxY: Math.max(...points.map(p => p.y)) },
    camera: camera.position.toArray(), objects,
    ...window.__roverQA.mainRender,
  };
});
const assertFraming = info => {
  const b = info.bounds;
  if (b.minX < -0.97 || b.maxX > 0.97 || b.minY < -0.85 || b.maxY > 0.70 || b.maxX - b.minX < 0.25) throw new Error(`Model framing failed: ${JSON.stringify(b)}`);
};
const state = () => page.evaluate(async () => {
  const { useSimulation } = window.__roverQA;
  const s = useSimulation.getState();
  return { x: s.vehicle.x, z: s.vehicle.z, speed: s.vehicle.speed, wheelAngle: s.vehicle.wheelAngle, elapsed: s.elapsed, emergency: s.emergency, paused: s.paused, navStatus: s.navStatus, path: s.path.length };
});
const modelInfo = () => page.evaluate(() => {
  const { _roots, useSimulation } = window.__roverQA;
  const { scene, gl } = _roots.get(document.querySelector('.viewport canvas')).store.getState();
  const rover = scene.getObjectByName('ZXAJ-R01');
  const counts = { suspension: 0, cameras: 0, bumperLenses: 0 };
  rover.traverse(o => {
    if (/^suspension-/.test(o.name)) counts.suspension++;
    if (/^camera-module-/.test(o.name)) counts.cameras++;
    if (/^bumper-lens-/.test(o.name)) counts.bumperLenses++;
  });
  const panels = rover.getObjectByName('body-panels');
  const shellMaterials = new Set();
  panels?.traverse(o => { if (o.isMesh && o.renderOrder === 2) shellMaterials.add(o.material); });
  return {
    ...counts, bodyMode: useSimulation.getState().bodyMode, detailLevel: useSimulation.getState().detailLevel,
    panels: !!panels, transparentPanels: shellMaterials.size > 0 && [...shellMaterials].every(m => m.transparent && !m.depthWrite && m.opacity < 0.5),
    pan: rover.getObjectByName('camera-pan')?.rotation.y,
    memory: { ...gl.info.memory }, ...window.__roverQA.mainRender,
  };
});
const capture = name => page.screenshot({ path: fileURLToPath(new URL(`${name}.png`, output)) });
const closeup = async (position, target, name) => {
  await page.evaluate(({ position, target }) => {
    const { _roots } = window.__roverQA;
    const { camera, controls } = _roots.get(document.querySelector('.viewport canvas')).store.getState();
    controls.dispatchEvent({ type: 'start' });
    controls.minDistance = 1;
    camera.position.set(...position);
    controls.target.set(...target);
    controls.update();
  }, { position, target });
  await waitForFrames(3);
  await capture(name);
};
try {
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.locator('.scene-loading').waitFor({ state: 'hidden', timeout: 45000 });
  await page.evaluate(async () => {
    // Reuse the exact module URLs loaded by Vite, including HMR version queries.
    const loaded = async path => {
      const url = performance.getEntriesByType('resource').map(entry => entry.name).findLast(name => new URL(name).pathname === path);
      if (!url) throw new Error(`Page did not load ${path}`);
      return import(url);
    };
    window.__roverQA = {
      ...await loaded('/src/simulation/VehicleController.ts'),
      ...await loaded('/src/stores/simulationStore.ts'),
      ...await loaded('/node_modules/.vite/deps/@react-three_fiber.js'),
      ...await loaded('/node_modules/.vite/deps/three.js'),
    };
    const { gl, scene } = window.__roverQA._roots.get(document.querySelector('.viewport canvas')).store.getState();
    const render = gl.render;
    // Capture the main pass before the gizmo renders its separate scene and resets the counters.
    gl.render = function (renderScene, camera) {
      const result = render.call(this, renderScene, camera);
      if (renderScene === scene) {
        window.__roverQA.mainRender = { draws: gl.info.render.calls, triangles: gl.info.render.triangles };
      }
      return result;
    };
  });
  await waitForFrames(5);
  await page.screenshot({ path: fileURLToPath(new URL('desktop.png', output)) });
  report.desktopScene = await sceneInfo();
  assertFraming(report.desktopScene);
  report.canvas = await page.locator('.viewport canvas').first().evaluate(canvas => {
    const gl = canvas.getContext('webgl2');
    const bytes = new Uint8Array(gl.drawingBufferWidth * gl.drawingBufferHeight * 4);
    gl.readPixels(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight, gl.RGBA, gl.UNSIGNED_BYTE, bytes);
    const colors = new Set();
    let opaque = 0, light = 0;
    for (let i = 0; i < bytes.length; i += 64) {
      colors.add(`${bytes[i] >> 3},${bytes[i + 1] >> 3},${bytes[i + 2] >> 3}`);
      if (bytes[i + 3]) opaque++;
      if (bytes[i] + bytes[i + 1] + bytes[i + 2] > 420) light++;
    }
    return { width: canvas.width, height: canvas.height, colors: colors.size, opaque, light };
  });
  if (report.canvas.colors < 40 || report.canvas.light < 30) throw new Error('Canvas is blank or model is not visible');
  report.model = { full: await modelInfo() };
  if (report.model.full.suspension !== 4 || report.model.full.cameras !== 4 || report.model.full.bumperLenses !== 2) throw new Error('Mechanical assembly count changed');
  await page.getByRole('button', { name: '裸露外壳模式', exact: true }).click();
  await waitForFrames(3);
  report.model.bare = await modelInfo();
  if (report.model.bare.panels) throw new Error('Bare mode still has body panels');
  await capture('bare');
  await page.getByRole('button', { name: '透明外壳模式', exact: true }).click();
  await waitForFrames(3);
  report.model.transparent = await modelInfo();
  if (!report.model.transparent.panels || !report.model.transparent.transparentPanels) throw new Error('Transparent mode material/depth handling failed');
  await capture('transparent');
  await page.getByRole('button', { name: '裸露外壳模式', exact: true }).click();
  await page.getByRole('button', { name: '隐藏全地形驱动轮', exact: true }).click();
  await closeup([2.8, 1.35, 2.4], [0.975, 0.65, 0.62], 'suspension-closeup');
  await page.getByRole('button', { name: '显示全地形驱动轮', exact: true }).click();
  await closeup([2.4, 2.05, 2.4], [0.85, 1.25, 0], 'camera-closeup');
  report.model.pan = [];
  for (const cameraPan of [-35, 35, 0]) {
    await page.evaluate(cameraPan => window.__roverQA.useSimulation.getState().patch({ cameraPan }), cameraPan);
    await waitForFrames(2);
    const info = await modelInfo();
    if (Math.abs(info.pan - cameraPan * Math.PI / 180) > 1e-6) throw new Error('Camera pan no longer follows controls');
    report.model.pan.push(info.pan);
    if (cameraPan) await capture(`camera-pan-${cameraPan}`);
  }
  await page.getByRole('button', { name: '完整外壳模式', exact: true }).click();
  await waitForFrames(3);
  const detailComparison = await modelInfo();
  await page.getByRole('button', { name: '性能档位', exact: true }).click();
  await waitForFrames(4);
  report.model.performance = await modelInfo();
  report.model.detailComparison = detailComparison;
  if (report.model.performance.triangles >= detailComparison.triangles * 0.85) throw new Error('Performance profile does not meaningfully reduce geometry');
  // Warm both profiles before comparing renderer-owned resource counts.
  await page.getByRole('button', { name: '细节档位', exact: true }).click();
  await waitForFrames(4);
  const resourceStart = await modelInfo();
  for (let cycle = 0; cycle < 3; cycle++) {
    for (const mode of ['裸露', '透明', '完整']) {
      await page.getByRole('button', { name: `${mode}外壳模式`, exact: true }).click();
      await waitForFrames(2);
    }
    for (const part of ['车体与金属底盘', '全地形驱动轮', '独立悬架系统', '多目视觉传感器']) {
      await page.getByRole('button', { name: `隐藏${part}`, exact: true }).click();
      await waitForFrames(1);
      await page.getByRole('button', { name: `显示${part}`, exact: true }).click();
    }
    await page.getByRole('button', { name: '性能档位', exact: true }).click();
    await waitForFrames(3);
    await page.getByRole('button', { name: '细节档位', exact: true }).click();
    await waitForFrames(4);
  }
  const resourceEnd = await modelInfo();
  report.model.resources = { before: resourceStart.memory, after: resourceEnd.memory, cycles: 3 };
  if (resourceEnd.memory.geometries > resourceStart.memory.geometries + 5 || resourceEnd.memory.textures > resourceStart.memory.textures + 1) throw new Error('Repeated model switches retain GPU resources');
  await page.getByRole('switch', { name: '结构分解', exact: true }).click();
  await waitForFrames(3);
  await capture('exploded');
  await page.getByRole('switch', { name: '结构分解', exact: true }).click();
  await page.getByRole('button', { name: '性能档位', exact: true }).click();
  await page.getByRole('button', { name: '恢复默认视角', exact: true }).click();
  await page.evaluate(() => document.activeElement?.blur());
  await waitForFrames(8);
  const before = await state();
  await page.keyboard.down('w');
  report.keyDown = await page.evaluate(() => {
    const { useSimulation, runtime } = window.__roverQA;
    const s = useSimulation.getState();
    return { input: s.input, vehicle: s.vehicle, runtime: runtime.vehicle, elapsed: runtime.elapsed, focus: document.activeElement?.tagName };
  });
  await page.waitForFunction(x => {
    const { useSimulation } = window.__roverQA;
    return useSimulation.getState().vehicle.x > x + 0.15;
  }, before.x, { timeout: 90000, polling: 100 });
  report.keyHeld = await page.evaluate(() => {
    const { useSimulation, runtime } = window.__roverQA;
    const s = useSimulation.getState();
    return { input: s.input, vehicle: s.vehicle, runtime: runtime.vehicle, elapsed: runtime.elapsed, ui: document.querySelector('.viewport-position')?.textContent, logs: s.logs.slice(-3) };
  });
  await page.keyboard.up('w');
  await waitForFrames(2);
  const after = await state();
  report.drive = { before, after, scene: await sceneInfo() };
  if (after.x <= before.x + 0.1 || after.wheelAngle === before.wheelAngle) throw new Error('Driving or wheel animation failed');
  if (!report.drive.scene.objects.some(o => o.name.startsWith('wheel-spin') && Math.abs(o.z) > 0.1)) throw new Error('Rendered wheels did not rotate');
  if (!report.drive.scene.objects.some(o => o.name.startsWith('gear-spin') && Math.abs(o.z) > 0.1)) throw new Error('Rendered gears did not rotate');
  const lidarBefore = report.desktopScene.objects.find(o => o.name === 'lidar-spin').y;
  if (report.drive.scene.objects.find(o => o.name === 'lidar-spin').y === lidarBefore) throw new Error('Rendered LiDAR did not rotate');
  await page.keyboard.press('Space');
  await page.waitForTimeout(250);
  report.emergency = await state();
  if (!report.emergency.emergency || report.emergency.speed !== 0) throw new Error('Emergency stop failed');
  await page.getByRole('button', { name: '解除急停' }).click();
  await page.getByRole('button', { name: '重置仿真', exact: true }).click();
  await page.getByRole('button', { name: '暂停仿真', exact: true }).click();
  const frozen = await state();
  await page.waitForTimeout(300);
  if ((await state()).elapsed !== frozen.elapsed) throw new Error('Pause failed');
  await page.getByRole('button', { name: '继续仿真', exact: true }).click();
  report.views = {};
  for (const view of ['front', 'rear', 'left', 'right', 'top', 'camera', 'perspective']) {
    await page.getByLabel('场景视角').selectOption(view);
    await waitForFrames(6);
    report.views[view] = (await sceneInfo()).camera;
  }
  await page.getByRole('button', { name: '线框模式', exact: true }).click();
  await page.getByRole('button', { name: '线框模式', exact: true }).click();
  await page.getByRole('button', { name: '导航与规划', exact: true }).click();
  await page.getByRole('button', { name: '规划路径', exact: true }).click();
  report.planner = await state();
  if (report.planner.path < 2) throw new Error('UI planning failed');
  await page.getByRole('button', { name: '运行', exact: true }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: fileURLToPath(new URL('navigation.png', output)) });
  report.navigation = await page.evaluate(async () => {
    const { useSimulation, updateSimulation, runtime } = window.__roverQA;
    for (let i = 0; i < 8000 && useSimulation.getState().navStatus === 'running'; i++) updateSimulation(1 / 60);
    return { status: useSimulation.getState().navStatus, x: runtime.vehicle.x, z: runtime.vehicle.z };
  });
  if (report.navigation.status !== 'arrived') throw new Error('Navigation did not arrive');
  report.navigation.verification = 'UI started navigation; controller advanced in fixed 1/60 s steps to avoid software-renderer wall-clock delays';
  await page.getByRole('button', { name: /障碍物 01/ }).click();
  await page.getByLabel('障碍物 X', { exact: true }).fill('4');
  await page.getByLabel('障碍物 X', { exact: true }).press('Tab');
  report.obstacleMoved = await page.evaluate(async () => {
    const { useSimulation } = window.__roverQA;
    return useSimulation.getState().obstacles[0].x;
  });
  if (report.obstacleMoved !== 4) throw new Error('Obstacle movement failed');
  await page.getByRole('button', { name: '删除选中障碍物', exact: true }).click();
  if (await page.locator('.obstacle-list > button').count() !== 2) throw new Error('Obstacle deletion failed');
  await page.getByRole('button', { name: '重置仿真', exact: true }).click();
  await page.getByRole('button', { name: '数字样机', exact: true }).click();
  await page.setViewportSize({ width: 1100, height: 850 });
  await waitForFrames(8);
  await capture('compact-desktop');
  report.compact = await page.evaluate(() => {
    const groups = [...document.querySelectorAll('.scene-toolbar > .toolbar-group')].map(el => el.getBoundingClientRect());
    return { toolbarOverlap: groups[0].right > groups[1].left, overflow: document.documentElement.scrollWidth > innerWidth };
  });
  if (report.compact.toolbarOverlap || report.compact.overflow) throw new Error('Compact desktop toolbar overlaps');
  await page.setViewportSize({ width: 390, height: 844 });
  await waitForFrames(8);
  await page.screenshot({ path: fileURLToPath(new URL('mobile.png', output)) });
  report.mobileScene = await sceneInfo();
  assertFraming(report.mobileScene);
  report.mobile = await page.evaluate(() => ({
    width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
    viewport: (() => { const r = document.querySelector('.viewport').getBoundingClientRect(); return { width: r.width, height: r.height }; })(),
  }));
  if (report.mobile.scrollWidth > report.mobile.width) throw new Error('Mobile horizontal overflow');
  await page.getByRole('button', { name: '模型显示设置', exact: true }).click();
  const settings = page.locator('#model-settings');
  await settings.getByRole('button', { name: '透明外壳模式', exact: true }).click();
  await waitForFrames(2);
  if ((await modelInfo()).bodyMode !== 'transparent') throw new Error('Mobile model settings failed');
  await capture('mobile-settings');
  await settings.getByRole('button', { name: '关闭显示设置', exact: true }).click();
  await page.getByRole('button', { name: '显示控制面板', exact: true }).click();
  if (!(await page.locator('.right-panel').isVisible())) throw new Error('Mobile control drawer failed');
  report.errors = errors;
  if (errors.length) throw new Error(errors.join('\n'));
  report.passed = true;
} catch (error) {
  report.passed = false;
  report.failure = String(error);
  await page.screenshot({ path: fileURLToPath(new URL('failure.png', output)) });
  process.exitCode = 1;
} finally {
  await writeFile(new URL('browser-report.json', output), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
}
