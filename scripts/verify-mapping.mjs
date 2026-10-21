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
page.setDefaultTimeout(60000);
const errors = [], report = {};
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
page.on('framenavigated', frame => { if (frame === page.mainFrame()) console.log('Page navigation:', frame.url()); });
page.on('crash', () => errors.push('Browser renderer crashed'));
const check = (condition, message) => { if (!condition) throw new Error(message); };
const capture = name => page.screenshot({ path: fileURLToPath(new URL(`${name}.png`, output)) });
const mapping = () => page.evaluate(() => {
  const m = window.__mappingQA.useMapping.getState();
  const { config, points, scans, rays, hits, bounds, actualHz, scanMs, bytes, status, error, resetRevision } = m;
  return { config, points, scans, rays, hits, bounds, actualHz, scanMs, bytes, status, error, resetRevision };
});
const waitScan = (rays, after = -1) => page.waitForFunction(({ rays, after }) => {
  const s = window.__mappingQA.useMapping.getState();
  return s.rays === rays && s.hits > 0 && s.scans > after && !s.error;
}, { rays, after }, { timeout: 120000 });
const frames = () => page.evaluate(() => new Promise((resolve, reject) => {
  const { _roots } = window.__mappingQA;
  const { gl } = _roots.get(document.querySelector('.viewport canvas')).store.getState();
  const initial = gl.info.render.frame;
  const timeout = setTimeout(() => { clearInterval(timer); reject(new Error('Rendering stalled')); }, 60000);
  const timer = setInterval(() => {
    if (gl.info.render.frame > initial + 5) { clearTimeout(timeout); clearInterval(timer); resolve(); }
  }, 50);
}));
const range = async (label, key) => {
  const input = page.getByRole('slider', { name: label, exact: true });
  await input.focus();
  await input.press(key);
};
const alignment = () => page.evaluate(() => {
  const { mappingRuntime, campus, obstacleSurfaces, useSimulation } = window.__mappingQA;
  const surfaces = [...campus.surfaces, ...obstacleSurfaces(useSimulation.getState().obstacles)];
  const { live } = mappingRuntime;
  let maximumError = 0, checked = 0;
  for (let i = 0; i < live.count; i += Math.max(1, Math.floor(live.count / 150))) {
    const point = Array.from(live.positions.subarray(i * 3, i * 3 + 3));
    let best = Infinity;
    for (const s of surfaces) {
      const p = point.map((v, axis) => (v - s.center[axis]) / (s.size[axis] / 2));
      if (s.kind === 'box') {
        for (let axis = 0; axis < 3; axis++) {
          const others = [0, 1, 2].filter(a => a !== axis);
          if (others.every(a => Math.abs(p[a]) <= 1.0005)) {
            best = Math.min(best, Math.abs(Math.abs(p[axis]) - 1) * s.size[axis] / 2);
          }
        }
      } else if (s.kind === 'ellipsoid') {
        best = Math.min(best, Math.abs(Math.hypot(...p) - 1) * Math.max(...s.size) / 2);
      } else {
        if (Math.abs(p[1]) <= 1.0005) best = Math.min(best, Math.abs(Math.hypot(p[0], p[2]) - 1) * Math.max(s.size[0], s.size[2]) / 2);
        if (Math.hypot(p[0], p[2]) <= 1.0005) best = Math.min(best, Math.abs(Math.abs(p[1]) - 1) * s.size[1] / 2);
      }
    }
    maximumError = Math.max(maximumError, best); checked++;
  }
  return { maximumError, checked };
});
const camera = () => page.evaluate(() => {
  const { _roots, runtime } = window.__mappingQA;
  const { camera, controls, scene } = _roots.get(document.querySelector('.viewport canvas')).store.getState();
  return { position: camera.position.toArray(), target: controls.target.toArray(), vehicle: { ...runtime.vehicle },
    live: !!scene.getObjectByName('lidar-live'), map: !!scene.getObjectByName('lidar-map') };
});
try {
  console.log('Opening simulator and entering campus');
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.locator('.scene-loading').waitFor({ state: 'hidden' });
  await page.evaluate(async () => {
    const loaded = async path => {
      const url = performance.getEntriesByType('resource').map(e => e.name).findLast(name => new URL(name).pathname === path);
      if (!url) throw new Error(`Missing loaded module ${path}`);
      return import(url);
    };
    window.__mappingQA = {
      ...await loaded('/src/simulation/VehicleController.ts'),
      ...await loaded('/src/stores/simulationStore.ts'),
      ...await loaded('/src/stores/environmentStore.ts'),
      ...await loaded('/src/stores/mappingStore.ts'),
      ...await loaded('/src/lidar/MappingRuntime.ts'),
      ...await loaded('/src/environment/EnvironmentConfig.ts'),
      ...await loaded('/node_modules/.vite/deps/@react-three_fiber.js'),
      ...await loaded('/node_modules/.vite/deps/three.js'),
    };
    const { gl, scene } = window.__mappingQA._roots.get(document.querySelector('.viewport canvas')).store.getState();
    const render = gl.render;
    gl.render = function (renderScene, renderCamera) {
      const result = render.call(this, renderScene, renderCamera);
      if (renderScene === scene) {
        window.__mappingQA.render = { draws: gl.info.render.calls, triangles: gl.info.render.triangles, points: gl.info.render.points };
        if (window.__mappingQA.readPixels) {
          const context = gl.getContext();
          const bytes = new Uint8Array(context.drawingBufferWidth * context.drawingBufferHeight * 4);
          context.readPixels(0, 0, context.drawingBufferWidth, context.drawingBufferHeight, context.RGBA, context.UNSIGNED_BYTE, bytes);
          const colors = new Set(); let light = 0;
          for (let i = 0; i < bytes.length; i += 64) {
            colors.add(`${bytes[i] >> 3},${bytes[i + 1] >> 3},${bytes[i + 2] >> 3}`);
            if (bytes[i] + bytes[i + 1] + bytes[i + 2] > 300) light++;
          }
          window.__mappingQA.pixels = { colors: colors.size, light, width: context.drawingBufferWidth, height: context.drawingBufferHeight };
          window.__mappingQA.readPixels = false;
        }
      }
      return result;
    };
  });
  await page.getByRole('button', { name: '园区建图', exact: true }).click();
  await page.getByRole('button', { name: '开始建图', exact: true }).click();
  await waitScan(57600, 0);
  report.default = await mapping();
  check(report.default.hits > 25000, 'Default scan is unexpectedly sparse');
  report.defaultAlignment = await alignment();
  check(report.defaultAlignment.maximumError < 0.002, 'Scan points do not align with rendered surfaces');
  await capture('mapping-campus');
  console.log('Default scan passed', JSON.stringify(report.default));

  await page.getByRole('combobox', { name: '垂直扫描线' }).selectOption('128');
  await range('水平角分辨率', 'Home');
  await waitScan(230400, report.default.scans);
  report.maximum = await mapping();
  check(report.maximum.hits > report.default.hits * 2.5, 'Maximum configuration did not increase hit density');
  console.log('Maximum scan passed', JSON.stringify(report.maximum));
  await page.getByRole('combobox', { name: '垂直扫描线' }).selectOption('32');
  await range('水平角分辨率', 'End');
  await waitScan(28800, report.maximum.scans);
  report.low = await mapping();
  await range('垂直视场角', 'End');
  await range('最大探测距离', 'Home');
  await range('目标扫描频率', 'Home');
  await page.waitForFunction(() => {
    const { mappingRuntime, useMapping } = window.__mappingQA;
    const s = useMapping.getState();
    return s.config.range === 10 && mappingRuntime.live.count > 0 && mappingRuntime.live.distances.subarray(0, mappingRuntime.live.count).every(d => d <= 10.001);
  });
  report.shortRange = await mapping();
  check(report.shortRange.config.verticalFov === 90 && report.shortRange.config.frequency === 1, 'Scan controls did not update configuration');
  await page.evaluate(() => window.__mappingQA.useMapping.getState().configure({ range: 60, verticalFov: 40, frequency: 5, lines: 64 }));
  await waitScan(57600, report.shortRange.scans);

  // Deterministic controller steps avoid treating software GPU speed as vehicle speed.
  await page.getByRole('button', { name: '暂停建图', exact: true }).click();
  const stable = await mapping();
  await page.evaluate(() => {
    const { mappingRuntime, useSimulation, updateSimulation } = window.__mappingQA;
    window.__mappingQA.savedMap = Array.from(mappingRuntime.mapper.buffer.positions.subarray(0, 900));
    const s = useSimulation.getState();
    s.patch({ vehicle: { ...s.vehicle, heading: Math.PI / 2, speed: 0 }, input: { throttle: 1, steer: 0 } });
    for (let i = 0; i < 1800; i++) updateSimulation(1 / 60);
    useSimulation.getState().stop();
  });
  await frames();
  report.moved = await camera();
  check(report.moved.vehicle.z > 20, 'Rover did not travel along campus road');
  check((await mapping()).points === stable.points, 'Paused map changed during vehicle motion');
  await page.getByRole('button', { name: '开始建图', exact: true }).click();
  await waitScan(57600, stable.scans + 1);
  report.afterMove = await mapping();
  report.moveAlignment = await alignment();
  report.preserved = await page.evaluate(() => {
    const { mappingRuntime, savedMap } = window.__mappingQA;
    return savedMap.every((v, i) => mappingRuntime.mapper.buffer.positions[i] === v);
  });
  check(report.preserved, 'Historical map points moved after vehicle travel');
  check(report.afterMove.points > stable.points, 'Vehicle movement did not expand accumulated map');
  check(report.moveAlignment.maximumError < 0.002, 'Rotated / moved scan is misaligned');
  console.log('Moving, rotated scan and historical point stability passed');

  await page.getByRole('button', { name: '暂停建图', exact: true }).click();
  const pausedMap = await mapping();
  await page.evaluate(() => { window.__mappingQA.liveRevision = window.__mappingQA.mappingRuntime.live.revision; });
  await page.waitForFunction(() => window.__mappingQA.mappingRuntime.live.revision > window.__mappingQA.liveRevision + 1);
  check((await mapping()).scans === pausedMap.scans && (await mapping()).points === pausedMap.points, 'Accumulation pause failed');
  await page.getByRole('button', { name: '暂停仿真', exact: true }).click();
  const frozen = await page.evaluate(() => ({
    revision: window.__mappingQA.mappingRuntime.live.revision,
    elapsed: window.__mappingQA.runtime.elapsed,
  }));
  await frames();
  check(await page.evaluate(frozen => window.__mappingQA.mappingRuntime.live.revision === frozen.revision && window.__mappingQA.runtime.elapsed === frozen.elapsed, frozen), 'Simulation pause did not freeze scanning');
  await page.getByRole('button', { name: '继续仿真', exact: true }).click();
  await page.getByRole('switch', { name: 'LiDAR 开启', exact: true }).click();
  await frames();
  report.disabled = await mapping();
  check(report.disabled.points === pausedMap.points && report.disabled.hits === 0 && !(await camera()).live, 'Disabling LiDAR lost map or retained live layer');
  await page.getByRole('button', { name: '清空地图', exact: true }).click();
  check((await mapping()).points === 0 && (await mapping()).scans === 0, 'Clear map failed');
  await page.getByRole('button', { name: '重新开始建图', exact: true }).click();
  await waitScan(57600, 0);
  report.restarted = await mapping();
  check(report.restarted.points > 0, 'Restart failed to generate map');
  await page.getByRole('button', { name: '暂停仿真', exact: true }).click();
  await range('体素尺寸（修改后清图）', 'End');
  check((await mapping()).points === 0 && (await mapping()).resetRevision > report.restarted.resetRevision, 'Voxel size did not clear old density');
  await page.getByRole('button', { name: '继续仿真', exact: true }).click();
  await waitScan(57600, 0);
  report.coarseVoxel = await mapping();
  check(report.coarseVoxel.points < report.restarted.points, 'Coarser voxel failed to reduce map density');

  await page.getByRole('button', { name: '暂停仿真', exact: true }).click();
  report.colors = [];
  for (const color of ['mono', 'distance', 'intensity', 'height']) {
    await page.getByRole('combobox', { name: '点云颜色模式' }).selectOption(color);
    await frames();
    report.colors.push(await page.evaluate(color => {
      const { scene } = window.__mappingQA._roots.get(document.querySelector('.viewport canvas')).store.getState();
      const points = scene.getObjectByName('lidar-map');
      const values = Array.from(points.geometry.getAttribute('color').array.subarray(0, 90));
      return { color, finite: values.every(Number.isFinite), sum: values.reduce((a, b) => a + b, 0) };
    }, color));
  }
  check(report.colors.every(c => c.finite) && new Set(report.colors.map(c => c.sum)).size === 4, 'Color modes failed');
  await range('地图点尺寸', 'End');
  await range('实时点尺寸', 'End');
  await frames();
  check(await page.evaluate(() => {
    const { scene } = window.__mappingQA._roots.get(document.querySelector('.viewport canvas')).store.getState();
    return Math.abs(scene.getObjectByName('lidar-map').material.size - 0.12) < 1e-6 && Math.abs(scene.getObjectByName('lidar-live').material.size - 0.12) < 1e-6;
  }), 'Point size controls failed');
  console.log('Point size and color controls passed; checking layer visibility');
  await page.getByRole('switch', { name: '实时扫描点云', exact: true }).click();
  await page.getByRole('switch', { name: '历史累积地图', exact: true }).click();
  await frames();
  check(!(await camera()).live && !(await camera()).map, 'Layer visibility controls failed');
  await page.getByRole('switch', { name: '历史累积地图', exact: true }).click();
  await page.getByRole('switch', { name: '显示原始环境', exact: true }).click();
  await page.getByRole('switch', { name: '扫描范围与历史边界', exact: true }).click();
  await page.getByRole('button', { name: '自由观察', exact: true }).click();
  await page.evaluate(() => {
    const { camera, controls } = window.__mappingQA._roots.get(document.querySelector('.viewport canvas')).store.getState();
    controls.dispatchEvent({ type: 'start' });
    camera.position.set(48, 48, 68); controls.target.set(0, 0, 22); controls.update();
    window.__mappingQA.readPixels = true;
  });
  await frames();
  report.cloudOnly = await page.evaluate(() => ({ ...window.__mappingQA.pixels, ...window.__mappingQA.render }));
  check(report.cloudOnly.colors > 30 && report.cloudOnly.light > 100, 'Cloud-only render appears blank');
  await capture('mapping-cloud-only');
  await page.getByRole('switch', { name: '显示原始环境', exact: true }).click();
  await page.getByRole('button', { name: '俯视地图', exact: true }).click();
  await page.waitForFunction(() => {
    const { camera } = window.__mappingQA._roots.get(document.querySelector('.viewport canvas')).store.getState();
    return camera.position.y > 245;
  });
  report.top = await camera();
  await capture('mapping-overview');
  await page.getByRole('button', { name: '返回无人车', exact: true }).click();
  await page.waitForFunction(() => {
    const { _roots, runtime } = window.__mappingQA;
    const { camera, controls } = _roots.get(document.querySelector('.viewport canvas')).store.getState();
    return Math.abs(camera.position.y - 8) < 0.1 && Math.abs(controls.target.z - runtime.vehicle.z) < 0.1;
  });
  report.returned = await camera();
  await page.getByRole('button', { name: '继续仿真', exact: true }).click();
  await page.evaluate(() => {
    const { useSimulation, updateSimulation } = window.__mappingQA;
    useSimulation.getState().patch({ input: { throttle: 1, steer: 0 } });
    for (let i = 0; i < 120; i++) updateSimulation(1 / 60);
    useSimulation.getState().stop();
  });
  await frames();
  report.followed = await camera();
  check(Math.abs((report.followed.position[2] - report.returned.position[2]) - (report.followed.vehicle.z - report.returned.vehicle.z)) < 0.2, 'Follow camera did not track vehicle displacement');
  await page.getByRole('button', { name: '自由观察', exact: true }).click();
  const freeBefore = await camera();
  await page.evaluate(() => {
    const { useSimulation, updateSimulation } = window.__mappingQA;
    useSimulation.getState().patch({ input: { throttle: 1, steer: 0 } });
    for (let i = 0; i < 120; i++) updateSimulation(1 / 60);
    useSimulation.getState().stop();
  });
  await frames();
  const freeAfter = await camera();
  check(Math.hypot(...freeAfter.position.map((v, i) => v - freeBefore.position[i])) < 0.05, 'Free camera kept following vehicle');
  console.log('Pause, disable, clear, restart, density, color, layers and camera controls passed');

  // Exercise campus collision against a building instead of only custom demo boxes.
  report.collision = await page.evaluate(() => {
    const { useSimulation, updateSimulation, runtime } = window.__mappingQA;
    const s = useSimulation.getState();
    s.patch({ vehicle: { ...runtime.vehicle, x: 15, z: 32, heading: 0, speed: 0 }, input: { throttle: 1, steer: 0 } });
    for (let i = 0; i < 240; i++) updateSimulation(1 / 60);
    return { x: runtime.vehicle.x, speed: runtime.vehicle.speed };
  });
  check(report.collision.x < 18 && report.collision.speed === 0, 'Rover penetrated campus building');
  await page.getByRole('button', { name: '重置仿真', exact: true }).click();
  await page.evaluate(() => {
    const { useSimulation, updateSimulation, runtime } = window.__mappingQA;
    const s = useSimulation.getState();
    s.patch({ goal: { x: 0, z: 24 } }); s.plan(); useSimulation.getState().navigate();
    for (let i = 0; i < 2400 && useSimulation.getState().navStatus === 'running'; i++) updateSimulation(1 / 60);
    window.__mappingQA.navigation = { status: useSimulation.getState().navStatus, x: runtime.vehicle.x, z: runtime.vehicle.z };
  });
  report.navigation = await page.evaluate(() => window.__mappingQA.navigation);
  check(report.navigation.status === 'arrived', 'Campus route did not arrive');
  await page.getByRole('button', { name: '暂停仿真', exact: true }).click();
  for (const viewport of [{ width: 1100, height: 850 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await frames();
    if (viewport.width === 390) await page.getByRole('button', { name: '显示控制面板', exact: true }).click();
    check(await page.getByRole('button', { name: '俯视地图', exact: true }).isVisible(), 'Mapping controls inaccessible at compact size');
    const layout = await page.evaluate(() => ({ width: innerWidth, content: document.documentElement.scrollWidth, canvas: document.querySelector('.viewport canvas').getBoundingClientRect().toJSON() }));
    check(layout.content <= viewport.width, 'Mapping panel causes horizontal overflow');
    report[`layout${viewport.width}`] = layout;
    await capture(`mapping-${viewport.width}`);
  }
  check(errors.length === 0, `Browser errors: ${errors.join('; ')}`);
  report.passed = true;
  console.log('Mapping browser regression passed');
} catch (error) {
  report.failure = error.stack;
  await capture('mapping-failure').catch(() => {});
  console.error(error);
  process.exitCode = 1;
} finally {
  report.errors = errors;
  await writeFile(new URL('mapping-report.json', output), JSON.stringify(report, null, 2));
  await browser.close();
}
