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
    draws: gl.info.render.calls, triangles: gl.info.render.triangles,
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
