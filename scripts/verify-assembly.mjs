import assert from 'node:assert/strict';
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
const report = {};
page.on('pageerror', e => errors.push(e.message));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
const capture = name => page.screenshot({ path: fileURLToPath(new URL(`assembly-${name}.png`, output)) });
const settled = () => page.waitForFunction(() => !window.__assemblyQA.assemblyAnimation.playing, null, { timeout: 90000 });
const frames = count => page.evaluate(count => new Promise((resolve, reject) => {
  const qa = window.__assemblyQA, start = qa.frames;
  const timeout = setTimeout(() => { clearInterval(timer); reject(new Error('Render frames stopped')); }, 60000);
  const timer = setInterval(() => {
    if (qa.frames >= start + count) { clearTimeout(timeout); clearInterval(timer); resolve(); }
  }, 50);
}), count);
const info = () => page.evaluate(() => window.__assemblyQA.inspect());
const seek = async value => {
  await page.getByRole('slider', { name: '拆分进度', exact: true }).fill(String(value));
  await frames(2);
};
const checkBounds = result => {
  const b = result.bounds;
  assert(b.minX > -0.98 && b.maxX < 0.98 && b.minY > -0.9 && b.maxY < 0.83, `Model outside viewport: ${JSON.stringify(b)}`);
  assert(b.maxX - b.minX > 0.25, 'Model is too small');
  assert(result.pixels.colors > 40 && result.pixels.light > 30, 'Model pixels are blank');
};
try {
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.locator('.scene-loading').waitFor({ state: 'hidden', timeout: 45000 });
  await page.evaluate(async () => {
    const loaded = async path => {
      const url = performance.getEntriesByType('resource').map(e => e.name).findLast(name => new URL(name).pathname === path);
      if (!url) throw new Error(`Module not loaded: ${path}`);
      return import(url);
    };
    const qa = window.__assemblyQA = {
      ...await loaded('/src/stores/assemblyStore.ts'),
      ...await loaded('/src/stores/simulationStore.ts'),
      ...await loaded('/node_modules/.vite/deps/@react-three_fiber.js'),
      ...await loaded('/node_modules/.vite/deps/three.js'),
      frames: 0, trace: [],
    };
    qa.root = () => qa._roots.get(document.querySelector('.viewport canvas')).store.getState();
    qa.parts = () => {
      const result = {};
      qa.root().scene.getObjectByName('ZXAJ-R01').traverse(o => {
        if (o.name.startsWith('assembly-') && !o.name.startsWith('assembly-guide-')) {
          result[o.name] = { position: o.position.toArray(), quaternion: o.quaternion.toArray(), scale: o.scale.toArray() };
        }
      });
      return result;
    };
    qa.inspect = () => {
      const { scene, camera, gl } = qa.root(), rover = scene.getObjectByName('ZXAJ-R01');
      scene.updateMatrixWorld(true); camera.updateMatrixWorld(true);
      // Mesh bounds exclude dynamic guide lines and don't depend on their cached bounds.
      const bounds = new qa.Box3();
      const spins = {};
      let visibleGuides = 0;
      rover.traverse(o => {
        if (o.isMesh) bounds.union(new qa.Box3().setFromObject(o));
        if (/^(wheel-spin|gear-spin|lidar-spin)/.test(o.name)) spins[o.name] = o.rotation.toArray().slice(0, 3);
        if (o.name.startsWith('assembly-guide-') && o.visible) visibleGuides++;
      });
      const points = [];
      for (const x of [bounds.min.x, bounds.max.x]) for (const y of [bounds.min.y, bounds.max.y]) for (const z of [bounds.min.z, bounds.max.z]) points.push(new qa.Vector3(x, y, z).project(camera));
      const bytes = new Uint8Array(gl.domElement.width * gl.domElement.height * 4);
      const context = gl.getContext();
      context.readPixels(0, 0, gl.domElement.width, gl.domElement.height, context.RGBA, context.UNSIGNED_BYTE, bytes);
      const colors = new Set();
      let light = 0;
      for (let i = 0; i < bytes.length; i += 64) {
        colors.add(`${bytes[i] >> 3},${bytes[i + 1] >> 3},${bytes[i + 2] >> 3}`);
        if (bytes[i] + bytes[i + 1] + bytes[i + 2] > 420) light++;
      }
      return {
        ...qa.assemblyAnimation.snapshot(), parts: qa.parts(), spins, visibleGuides,
        bounds: { minX: Math.min(...points.map(p => p.x)), maxX: Math.max(...points.map(p => p.x)), minY: Math.min(...points.map(p => p.y)), maxY: Math.max(...points.map(p => p.y)) },
        worldBounds: { min: bounds.min.toArray(), max: bounds.max.toArray() },
        pixels: { colors: colors.size, light }, memory: { ...gl.info.memory },
      };
    };
    const advance = qa.assemblyAnimation.advance.bind(qa.assemblyAnimation);
    qa.assemblyAnimation.advance = dt => {
      advance(dt); qa.frames++;
      if (qa.record && qa.trace.length < 1000) qa.trace.push({ dt, progress: qa.assemblyAnimation.progress, parts: qa.parts() });
    };
  });
  await frames(5);
  report.assembled = await info();
  checkBounds(report.assembled);
  assert(Object.keys(report.assembled.parts).length >= 20, 'Parts were not registered');
  await capture('assembled');
  await page.getByLabel('拆分动画速度', { exact: true }).selectOption('0.5');
  await page.evaluate(() => { window.__assemblyQA.record = true; });
  await page.getByRole('switch', { name: '结构分解', exact: true }).click();
  await settled();
  report.expanded = await info();
  checkBounds(report.expanded);
  assert.equal(report.expanded.progress, 1);
  assert(report.expanded.visibleGuides > 10);
  report.playback = await page.evaluate(() => {
    const qa = window.__assemblyQA;
    qa.record = false;
    return qa.trace;
  });
  const middleFrames = report.playback.filter(f => f.progress > 0.01 && f.progress < 0.99);
  assert(middleFrames.length >= 3, 'No rendered intermediate animation frames');
  assert(middleFrames.some(f => f.parts['assembly-shell-side-1'].position[2] > 0 && f.parts['assembly-wheel-0.975-1'].position[2] === 0), 'Shell and wheel stages are not staggered');
  assert.equal(report.expanded.parts['assembly-wheel-0.975-1'].position[2], 0.62);
  assert.equal(report.expanded.parts['assembly-wheel-0.975--1'].position[2], -0.62);
  assert.equal(report.expanded.parts['assembly-lidar'].position[1], 0.52);
  assert.notDeepEqual(report.expanded.spins['lidar-spin'], report.assembled.spins['lidar-spin'], 'Lidar stopped during assembly animation');
  await capture('expanded');
  // Real rendered intermediate states also provide stable visual review snapshots.
  report.stages = [];
  for (const value of [18, 48, 78]) {
    await seek(value);
    const stage = await info();
    assert.equal(stage.progress, value / 100);
    assert.equal(stage.playing, false);
    report.stages.push(stage);
    checkBounds(stage);
    await capture(`stage-${value}`);
  }
  await seek(42);
  const held = await info();
  await frames(3);
  assert.deepEqual((await info()).parts, held.parts, 'Slider competes with automatic playback');
  // Reverse through the existing switch in the same browser task: no transform may jump.
  report.reversal = await page.evaluate(() => {
    const qa = window.__assemblyQA;
    qa.useSimulation.getState().patch({ exploded: false });
    qa.useSimulation.getState().patch({ exploded: true });
    return { before: qa.parts(), progress: qa.assemblyAnimation.progress };
  });
  await page.waitForFunction(() => window.__assemblyQA.assemblyAnimation.progress > 0.5, null, { timeout: 60000 });
  report.reversal.live = await page.evaluate(() => {
    const qa = window.__assemblyQA, before = qa.parts(), velocity = qa.assemblyAnimation.velocity;
    qa.useSimulation.getState().patch({ exploded: false });
    return { before, after: qa.parts(), velocityBefore: velocity, velocityAfter: qa.assemblyAnimation.velocity };
  });
  assert.deepEqual(report.reversal.live.before, report.reversal.live.after, 'Reversal jumps transforms');
  assert.equal(report.reversal.live.velocityBefore, report.reversal.live.velocityAfter);
  await settled();
  assert.deepEqual((await info()).parts, report.assembled.parts, 'Reversal failed to restore exact local transforms');
  // Repeat actual rendered cycles (unit tests additionally exercise 40 interrupted cycles).
  await page.getByLabel('拆分动画速度', { exact: true }).selectOption('2');
  for (let i = 0; i < 4; i++) {
    await page.getByRole('switch', { name: '结构分解', exact: true }).click();
    await settled();
    assert.equal((await info()).progress, 1);
    await page.getByRole('switch', { name: '结构分解', exact: true }).click();
    await settled();
    assert.deepEqual((await info()).parts, report.assembled.parts, `Cycle ${i} drifted`);
  }
  report.repeatCycles = 4;
  await seek(65);
  // Remount model parts and change parameters while expanded.
  await page.getByRole('button', { name: '隐藏全地形驱动轮', exact: true }).click();
  await page.getByRole('button', { name: '显示全地形驱动轮', exact: true }).click();
  await page.getByRole('button', { name: '裸露外壳模式', exact: true }).click();
  await page.getByRole('button', { name: '完整外壳模式', exact: true }).click();
  await page.getByRole('button', { name: '性能档位', exact: true }).click();
  await frames(2);
  report.remounted = await info();
  assert.equal(report.remounted.progress, 0.65);
  assert(report.remounted.parts['assembly-wheel-0.975-1'].position[2] > 0);
  await page.getByRole('button', { name: '立即恢复装配状态', exact: true }).click();
  await frames(2);
  assert.deepEqual((await info()).parts, report.assembled.parts, 'Remount or rerender overwrote assembled origins');
  await seek(100);
  await page.getByRole('button', { name: '重新播放拆分动画', exact: true }).click();
  assert.equal((await info()).target, 0);
  await settled();
  assert.equal((await info()).progress, 1, 'Replay did not finish expanded');
  await page.getByRole('button', { name: '立即恢复装配状态', exact: true }).click();
  await frames(2);
  report.final = await info();
  assert.deepEqual(report.final.parts, report.assembled.parts);
  assert.equal(report.final.visibleGuides, 0);
  // Verify child wheel/gear animation and keyboard control survive expanded state.
  await seek(100);
  await page.evaluate(() => document.activeElement?.blur());
  await page.keyboard.down('w');
  const spinBefore = (await info()).spins;
  await page.waitForFunction(() => window.__assemblyQA.useSimulation.getState().vehicle.x > 0.15, null, { timeout: 90000 });
  await page.keyboard.up('w');
  const spinAfter = (await info()).spins;
  assert.notDeepEqual(spinBefore['wheel-spin-0.975-1'], spinAfter['wheel-spin-0.975-1']);
  assert(Object.keys(spinAfter).some(k => k.startsWith('gear-spin') && JSON.stringify(spinBefore[k]) !== JSON.stringify(spinAfter[k])), 'Gears stopped while expanded');
  report.mechanicalAnimation = true;
  await page.getByRole('button', { name: '重置仿真', exact: true }).click();
  await page.getByRole('button', { name: '立即恢复装配状态', exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await frames(8);
  await page.getByRole('button', { name: '模型显示设置', exact: true }).click();
  const settings = page.locator('#model-settings');
  await settings.getByRole('slider', { name: '拆分进度', exact: true }).fill('100');
  await frames(3);
  report.mobile = await info();
  checkBounds(report.mobile);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'Mobile overflows');
  await capture('mobile-settings');
  await settings.getByRole('button', { name: '关闭显示设置', exact: true }).click();
  await capture('mobile-expanded');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await frames(8);
  await page.getByRole('button', { name: '细节档位', exact: true }).click();
  await seek(100);
  await capture('final-expanded');
  assert.deepEqual(errors, []);
  report.errors = errors;
  report.passed = true;
} catch (error) {
  report.passed = false; report.failure = String(error); report.errors = errors;
  await capture('failure');
  process.exitCode = 1;
} finally {
  await writeFile(new URL('assembly-report.json', output), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({
    passed: report.passed, failure: report.failure, errors,
    intermediateFrames: report.playback?.filter(f => f.progress > 0.01 && f.progress < 0.99).length,
    repeatCycles: report.repeatCycles, mechanicalAnimation: report.mechanicalAnimation,
    desktopBounds: report.expanded?.bounds, mobileBounds: report.mobile?.bounds,
  }, null, 2));
  await browser.close();
}
