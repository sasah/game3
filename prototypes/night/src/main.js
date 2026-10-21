import * as THREE from 'three';
import * as world from './world.js';
import { mulberry32, fbm2 } from './noise.js';
import { installHeightFog } from './fog.js';
import { buildSky, SKY_HORIZON } from './sky.js';
import { buildTerrain } from './terrain.js';
import { createControls } from './controls.js';
import { createPost } from './post.js';

const params = new URLSearchParams(location.search);
const isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
const quality = params.get('quality') || (isTouch ? 'low' : 'high');
const shotMode = params.has('shot');
const usePost = params.get('post') !== '0';

const $ = (id) => document.getElementById(id);
const ui = {
  status: (text) => { $('status').textContent = text; },
  showStick(x, y) { const s = $('stick'); s.style.left = x + 'px'; s.style.top = y + 'px'; s.classList.add('on'); this.moveStick(0, 0); },
  moveStick(dx, dy) { $('knob').style.transform = `translate(${dx}px, ${dy}px)`; },
  hideStick() { $('stick').classList.remove('on'); },
};

function fail(msg, err) {
  console.error(msg, err);
  ui.status(msg);
  $('enter').disabled = true;
}

if (!document.createElement('canvas').getContext('webgl2')) {
  fail('Этот браузер не поддерживает WebGL2 — ночь не откроется.');
  throw new Error('no webgl2');
}

installHeightFog({ moonDir: world.MOON_DIR, base: 0.0, density: 0.022, falloff: 1.1 });

const canvas = $('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !usePost, powerPreference: 'high-performance' });
const maxPR = quality === 'high' ? Math.min(2, window.devicePixelRatio) : Math.min(1.5, window.devicePixelRatio);
let pixelRatio = quality === 'high' ? maxPR : Math.min(1.15, maxPR);
renderer.setPixelRatio(pixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.3;
renderer.info.autoReset = false;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(SKY_HORIZON.clone().multiplyScalar(0.85), 0.011);
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.08, 1600);
camera.layers.enable(world.LAYER_NO_REFLECT);

// Moonlight: cool, low, from the south. Hemisphere fill keeps the night readable.
const moon = new THREE.DirectionalLight(new THREE.Color('#b4c6ff'), 3.0);
const SHADOW_CENTER = new THREE.Vector3(0, 0, -10);
moon.position.copy(SHADOW_CENTER).addScaledVector(world.MOON_DIR, 90);
moon.target.position.copy(SHADOW_CENTER);
moon.castShadow = true;
moon.shadow.mapSize.setScalar(quality === 'high' ? 2048 : 1024);
Object.assign(moon.shadow.camera, { left: -48, right: 48, top: 48, bottom: -48, near: 10, far: 200 });
moon.shadow.bias = -0.0004;
moon.shadow.normalBias = 0.035;
scene.add(moon, moon.target);
const hemi = new THREE.HemisphereLight(new THREE.Color('#5d7bb0'), new THREE.Color('#1a2616'), 1.5);
scene.add(hemi);

const updaters = [];
const ctx = {
  THREE, renderer, scene, camera, quality, params, isTouch,
  world,
  moonLight: moon,
  hemiLight: hemi,
  uniforms: {
    uTime: { value: 0 },
    uWindStrength: { value: 1 },
    uWindDir: { value: new THREE.Vector2(0.8, -0.6).normalize() },
  },
  onUpdate(fn) { updaters.push(fn); },
  rng: (seed) => mulberry32(seed),
};
window.__ctx = ctx;

let post = null;
const size = new THREE.Vector2();
function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(w, h);
  if (post) post.setSize(w, h, pixelRatio);
}
window.addEventListener('resize', resize);

const controls = createControls(ctx, canvas, ui);
if (params.has('cam')) {
  const [x, z, yaw, pitch] = params.get('cam').split(',').map(Number);
  Object.assign(controls.state, { x, z, yaw: yaw ?? 0, pitch: pitch ?? 0, groundY: world.walkHeightAt(x, z) });
}

async function buildAll() {
  const t0 = performance.now();
  buildTerrain(ctx);
  buildSky(ctx);
  console.log(`[build] terrain+sky ${(performance.now() - t0).toFixed(0)} ms`);
  const modules = ['./water.js', './vegetation-grass.js', './vegetation-trees.js', './architecture.js'];
  await Promise.all(modules.map(async (m) => {
    const t1 = performance.now();
    try {
      const mod = await import(m);
      await mod.build(ctx);
      console.log(`[build] ${m} ${(performance.now() - t1).toFixed(0)} ms`);
    } catch (err) {
      console.error(`[build] ${m} failed`, err);
    }
  }));
  let audio = null;
  try {
    audio = (await import('./audio.js')).createAudio(ctx);
  } catch (err) {
    console.error('[build] audio failed', err);
  }
  if (usePost) {
    renderer.getDrawingBufferSize(size);
    post = createPost(ctx, size);
    post.setSize(window.innerWidth, window.innerHeight, pixelRatio);
  }
  console.log(`[build] total ${(performance.now() - t0).toFixed(0)} ms`);
  return audio;
}

// Wind gusts shared by grass, trees and the wind sound.
function windAt(t) {
  const base = 0.55 + 0.35 * fbm2(t * 0.07, 3.3, 3);
  const gust = Math.max(0, fbm2(t * 0.21, 9.1, 2)) * 1.4;
  return base + gust;
}

let time = params.has('t') ? Number(params.get('t')) : 0;
let last = performance.now();
let frames = 0;
let perfAcc = 0, perfN = 0, perfClock = 0;
const fpsEl = params.has('fps') ? $('fps') : null;
if (fpsEl) fpsEl.style.display = 'block';

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  time += shotMode ? 1 / 30 : dt;
  ctx.uniforms.uTime.value = time;
  ctx.uniforms.uWindStrength.value = windAt(time);
  controls.update(shotMode ? 0 : dt);
  for (const fn of updaters) fn(shotMode ? 1 / 30 : dt, time);
  renderer.info.reset();
  if (post) post.render(time); else renderer.render(scene, camera);
  window.__stats = { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures };
  frames++;
  if (shotMode && frames === 6) window.__shotReady = true;

  // Adaptive resolution: step down when the phone struggles, creep back when it is easy.
  if (!shotMode && time > 3) {
    perfAcc += dt; perfN++; perfClock += dt;
    if (perfClock > 2) {
      const avg = perfAcc / perfN;
      if (fpsEl) fpsEl.textContent = `${(1 / avg).toFixed(0)} fps · ${pixelRatio.toFixed(2)}x`;
      if (avg > 1 / 38 && pixelRatio > 0.6) { pixelRatio = Math.max(0.6, pixelRatio - 0.15); resize(); }
      else if (avg < 1 / 57 && pixelRatio < maxPR) { pixelRatio = Math.min(maxPR, pixelRatio + 0.1); resize(); }
      perfAcc = perfN = perfClock = 0;
    }
  }
  requestAnimationFrame(frame);
}

ui.status('Готовлю ночь…');
buildAll().then((audio) => {
  requestAnimationFrame(frame);
  if (shotMode) {
    $('overlay').remove();
    $('fade').remove();
    return;
  }
  const btn = $('enter');
  ui.status('');
  btn.disabled = false;
  btn.textContent = 'Войти в ночь';
  $('hint').textContent = isTouch
    ? 'Лучше в наушниках · левый палец — идти, правый — смотреть'
    : 'Лучше в наушниках · WASD — идти, мышь — смотреть, Shift — быстрее';
  btn.addEventListener('click', async () => {
    if (isTouch && document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
    if (audio) audio.start().catch((e) => console.error('[audio] start failed', e));
    $('overlay').classList.add('gone');
    $('fade').classList.add('gone');
    controls.state.enabled = true;
    const help = $('help');
    help.textContent = isTouch ? 'Левый палец — идти · правый — смотреть' : 'WASD — идти · мышь — смотреть';
    help.classList.add('on');
    setTimeout(() => help.classList.remove('on'), 7000);
  }, { once: true });
}).catch((err) => fail('Не получилось собрать сцену.', err));
