// Isometric yard: a painted picture with a depth map from its blockout, puppet characters that
// walk behind things, a candle that reveals a hidden layer, and visual-novel style dialogue.
import * as THREE from 'three';
import * as S from './scene.js';
import { DIALOGUE, CLUES } from './story.js';

const params = new URLSearchParams(location.search);
const shotMode = params.has('shot');
const $ = (id) => document.getElementById(id);

const STYLES = {
  kuindzhi: { name: 'Куинджи', tint: [0.86, 0.9, 1.04], candle: [1.0, 0.72, 0.42] },
  engraving: { name: 'Гравюра', tint: [0.92, 0.88, 0.8], candle: [1.0, 0.86, 0.62] },
};
let style = params.get('style') in STYLES ? params.get('style') : 'kuindzhi';

// ---------- renderer, cameras ----------
const canvas = $('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
renderer.setClearColor(0x05070c);
const scene = new THREE.Scene();
const base = S.makeCamera(); // frames the whole painting
const cam = base.clone(); // same pose, frustum narrowed to a window that follows the hero
const FULL_W = base.right - base.left, FULL_H = base.top - base.bottom;
const PITCH_COS = Math.cos(S.CAMERA.pitch);
const viewDir = new THREE.Vector3(0, 0, -1).applyQuaternion(base.quaternion);

function toLocal(p, out = new THREE.Vector3()) {
  return out.copy(p).applyMatrix4(base.matrixWorldInverse);
}
function localToImageUV(l) {
  return new THREE.Vector2((l.x - base.left) / FULL_W, (l.y - base.bottom) / FULL_H);
}

// ---------- textures ----------
const loader = new THREE.TextureLoader();
function loadTex(url, { raw = false } = {}) {
  return new Promise((resolve) => {
    loader.load(url, (t) => {
      t.colorSpace = THREE.NoColorSpace;
      t.generateMipmaps = !raw;
      if (raw) { t.minFilter = t.magFilter = THREE.NearestFilter; }
      else { t.minFilter = THREE.LinearMipmapLinearFilter; t.anisotropy = 4; }
      resolve(t);
    }, undefined, () => resolve(null));
  });
}

// Crops a sprite to its opaque pixels so the card's bottom edge is the character's feet.
function loadSprite(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.width; c.height = img.height;
      const g = c.getContext('2d');
      g.drawImage(img, 0, 0);
      const d = g.getImageData(0, 0, c.width, c.height).data;
      let x0 = c.width, y0 = c.height, x1 = 0, y1 = 0;
      for (let y = 0; y < c.height; y += 2) for (let x = 0; x < c.width; x += 2) {
        if (d[(y * c.width + x) * 4 + 3] > 24) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      }
      if (x1 <= x0) { resolve(null); return; }
      const w = x1 - x0 + 2, h = y1 - y0 + 2;
      const o = document.createElement('canvas');
      o.width = w; o.height = h;
      o.getContext('2d').drawImage(c, x0, y0, w, h, 0, 0, w, h);
      const t = new THREE.CanvasTexture(o);
      t.colorSpace = THREE.NoColorSpace;
      t.anisotropy = 4;
      resolve({ tex: t, aspect: w / h, url, canvas: o });
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

// Plain silhouette used until generated sprites exist.
function placeholderSprite(color) {
  const c = document.createElement('canvas');
  c.width = 120; c.height = 300;
  const g = c.getContext('2d');
  g.fillStyle = color;
  g.beginPath(); g.ellipse(60, 40, 26, 30, 0, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.moveTo(25, 80); g.lineTo(95, 80); g.lineTo(105, 300); g.lineTo(15, 300); g.closePath(); g.fill();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace;
  return { tex: t, aspect: c.width / c.height, canvas: c };
}

// ---------- painted background with depth ----------
const bgUniforms = {
  uColor: { value: null }, uHidden: { value: null }, uDepth: { value: null },
  uCandle: { value: 0 }, uCandleUV: { value: new THREE.Vector2(0.5, 0.5) },
  uCandleR: { value: new THREE.Vector2(0.1, 0.15) }, uCandleTint: { value: new THREE.Vector3(1, 0.75, 0.45) },
  uTime: { value: 0 }, uFade: { value: 0 },
};
const bgMat = new THREE.ShaderMaterial({
  uniforms: bgUniforms,
  // Depth writes need the depth test on; ALWAYS lets the painting overwrite whatever is there.
  depthTest: true,
  depthFunc: THREE.AlwaysDepth,
  depthWrite: true,
  vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `
    uniform sampler2D uColor, uHidden, uDepth;
    uniform float uCandle, uTime, uFade;
    uniform vec2 uCandleUV, uCandleR;
    uniform vec3 uCandleTint;
    varying vec2 vUv;
    void main() {
      vec3 col = texture2D(uColor, vUv).rgb;
      vec3 hid = texture2D(uHidden, vUv).rgb;
      vec2 q = (vUv - uCandleUV) / uCandleR;
      float flicker = 0.94 + 0.06 * sin(uTime * 13.0) * sin(uTime * 7.3 + 1.7);
      float r = length(q) / flicker;
      float inLight = (1.0 - smoothstep(0.55, 1.0, r)) * uCandle;
      vec3 lit = mix(col, hid, inLight) * mix(vec3(1.0), uCandleTint * 1.6, inLight * (1.0 - r * 0.7) * 0.7);
      // Outside the candle the night presses in.
      lit *= mix(1.0, 0.62, uCandle * smoothstep(0.85, 1.9, r));
      gl_FragColor = vec4(lit * uFade, 1.0);
      vec3 e = texture2D(uDepth, vUv).rgb;
      gl_FragDepth = dot(e, vec3(1.0, 1.0 / 255.0, 1.0 / 65025.0));
    }`,
});
const bgPivot = new THREE.Object3D();
bgPivot.matrixAutoUpdate = false;
bgPivot.matrix.copy(base.matrixWorld);
const bgQuad = new THREE.Mesh(new THREE.PlaneGeometry(FULL_W, FULL_H), bgMat);
bgQuad.position.set((base.left + base.right) / 2, (base.top + base.bottom) / 2, -(S.CAMERA.near + 0.5));
bgQuad.renderOrder = -10;
bgQuad.frustumCulled = false;
bgPivot.add(bgQuad);
scene.add(bgPivot);

// ---------- puppet characters ----------
const actorMat = (sprite, height) => new THREE.ShaderMaterial({
  transparent: true,
  depthWrite: false,
  uniforms: {
    uMap: { value: sprite.tex }, uFlip: { value: 0 }, uTint: { value: new THREE.Vector3(1, 1, 1) },
    uGlow: { value: 0 }, uGlowTint: { value: new THREE.Vector3(1, 0.75, 0.45) }, uFade: { value: 1 },
  },
  vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `
    uniform sampler2D uMap; uniform float uFlip, uGlow, uFade; uniform vec3 uTint, uGlowTint;
    varying vec2 vUv;
    void main() {
      vec2 uv = vec2(mix(vUv.x, 1.0 - vUv.x, uFlip), vUv.y);
      vec4 c = texture2D(uMap, uv);
      if (c.a < 0.04) discard;
      vec3 col = c.rgb * (uTint + uGlowTint * uGlow * (0.35 + 0.65 * vUv.y));
      gl_FragColor = vec4(col * uFade, c.a);
    }`,
});

const shadowMat = new THREE.ShaderMaterial({
  transparent: true,
  depthWrite: false,
  polygonOffset: true,
  polygonOffsetFactor: -2,
  vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `varying vec2 vUv; void main() { float d = length(vUv - 0.5) * 2.0; gl_FragColor = vec4(0.0, 0.01, 0.03, 0.55 * smoothstep(1.0, 0.2, d)); }`,
});

class Actor {
  constructor(name, sprites, height) {
    this.name = name;
    this.sprites = sprites; // { front, back }
    this.height = height;
    this.pos = new THREE.Vector3();
    this.facing = { back: false, flip: false };
    this.phase = 0;
    this.moving = 0;
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0), actorMat(sprites.front, height));
    this.mesh.quaternion.copy(base.quaternion);
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);
    this.shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), shadowMat);
    this.shadow.scale.set(0.9, 1, 0.55);
    this.shadow.renderOrder = 0.5;
    scene.add(this.shadow);
    this.setSprite(sprites.front);
  }
  setSprite(s) {
    this.current = s;
    this.mesh.material.uniforms.uMap.value = s.tex;
    const h = this.height * PITCH_COS;
    this.mesh.scale.set(h * s.aspect, h, 1);
  }
  face(dxScreen, dyScreen) {
    const back = dyScreen > 0.15 * Math.abs(dxScreen);
    // Front art walks to the lower left, back art to the upper right.
    const flip = back ? dxScreen < 0 : dxScreen > 0;
    if (back !== this.facing.back) this.setSprite(back ? this.sprites.back : this.sprites.front);
    this.facing = { back, flip };
    this.mesh.material.uniforms.uFlip.value = flip ? 1 : 0;
  }
  update(dt) {
    this.phase += dt * (this.moving ? 9 : 2.2);
    const hop = this.moving ? Math.abs(Math.sin(this.phase)) * 0.09 : Math.sin(this.phase) * 0.006;
    const sway = this.moving ? Math.sin(this.phase) * 0.05 : Math.sin(this.phase * 0.7) * 0.012;
    // Card stands at the feet, nudged toward the camera so it never sinks into the ground.
    this.mesh.position.copy(this.pos).addScaledVector(viewDir, -0.45);
    this.mesh.position.y += hop;
    this.mesh.quaternion.copy(base.quaternion);
    this.mesh.rotateZ(sway);
    this.mesh.renderOrder = 1 + toLocal(this.pos).z * 0.001;
    // Moon shadow falls up and to the left, away from the moon.
    this.shadow.position.set(this.pos.x - 0.25, 0.04, this.pos.z - 0.12);
    this.shadow.scale.x = 0.9 - hop * 2;
  }
}

// ---------- navigation ----------
const CELL = 0.35, GX0 = -13, GZ0 = -11, GW = Math.ceil(25 / CELL), GH = Math.ceil(27 / CELL);
const grid = new Uint8Array(GW * GH);
const tmpV = new THREE.Vector3();
function visibleOnPainting(x, z) {
  const l = toLocal(tmpV.set(x, 0, z));
  return l.x > base.left + 0.7 && l.x < base.right - 0.7 && l.y > base.bottom + 0.35 && l.y < base.top - 2.2;
}
for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) {
  const x = GX0 + (i + 0.5) * CELL, z = GZ0 + (j + 0.5) * CELL;
  grid[j * GW + i] = S.isWalkable(x, z) && visibleOnPainting(x, z) ? 1 : 0;
}
const cellOf = (x, z) => [Math.floor((x - GX0) / CELL), Math.floor((z - GZ0) / CELL)];
const open = (i, j) => i >= 0 && j >= 0 && i < GW && j < GH && grid[j * GW + i] === 1;
const centerOf = (i, j) => new THREE.Vector3(GX0 + (i + 0.5) * CELL, 0, GZ0 + (j + 0.5) * CELL);

function nearestOpen(i, j) {
  for (let r = 0; r < 12; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
    if (Math.max(Math.abs(di), Math.abs(dj)) === r && open(i + di, j + dj)) return [i + di, j + dj];
  }
  return null;
}

function lineClear(a, b) {
  const n = Math.ceil(a.distanceTo(b) / (CELL * 0.5));
  for (let k = 1; k < n; k++) {
    const t = k / n;
    const [i, j] = cellOf(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t);
    if (!open(i, j)) return false;
  }
  return true;
}

function findPath(from, to) {
  const s = nearestOpen(...cellOf(from.x, from.z));
  const g = nearestOpen(...cellOf(to.x, to.z));
  if (!s || !g) return null;
  const key = (i, j) => j * GW + i;
  const gScore = new Float32Array(GW * GH).fill(Infinity);
  const came = new Int32Array(GW * GH).fill(-1);
  const openSet = [[0, s[0], s[1]]];
  gScore[key(...s)] = 0;
  const h = (i, j) => Math.hypot(i - g[0], j - g[1]);
  while (openSet.length) {
    let bi = 0;
    for (let k = 1; k < openSet.length; k++) if (openSet[k][0] < openSet[bi][0]) bi = k;
    const [, i, j] = openSet.splice(bi, 1)[0];
    if (i === g[0] && j === g[1]) break;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      if (!di && !dj) continue;
      const ni = i + di, nj = j + dj;
      if (!open(ni, nj) || (di && dj && (!open(i + di, j) || !open(i, j + dj)))) continue;
      const ng = gScore[key(i, j)] + (di && dj ? 1.414 : 1);
      if (ng < gScore[key(ni, nj)]) {
        gScore[key(ni, nj)] = ng;
        came[key(ni, nj)] = key(i, j);
        openSet.push([ng + h(ni, nj), ni, nj]);
      }
    }
  }
  if (came[key(...g)] < 0 && key(...g) !== key(...s)) return null;
  const cells = [];
  for (let k = key(...g); k >= 0; k = came[k]) { cells.push(centerOf(k % GW, Math.floor(k / GW))); if (k === key(...s)) break; }
  cells.reverse();
  const goal = open(...cellOf(to.x, to.z)) ? to.clone().setY(0) : cells[cells.length - 1];
  const pts = [from.clone(), ...cells.slice(1, -1), goal];
  // String-pull: skip waypoints that are in clear line of sight.
  const out = [pts[0]];
  let a = 0;
  while (a < pts.length - 1) {
    let b = pts.length - 1;
    while (b > a + 1 && !lineClear(pts[a], pts[b])) b--;
    out.push(pts[b]);
    a = b;
  }
  return out.slice(1);
}

// ---------- fireflies and mist ----------
function makeFireflies() {
  const N = 48, pos = new Float32Array(N * 3), seed = new Float32Array(N);
  const rnd = mulberry(7);
  for (let k = 0; k < N; k++) {
    let x, z;
    do { x = -11 + rnd() * 22; z = -9 + rnd() * 24; } while (!visibleOnPainting(x, z));
    pos.set([x, 0.4 + rnd() * 1.4, z], k * 3);
    seed[k] = rnd() * 100;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('seed', new THREE.BufferAttribute(seed, 1));
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uTime: bgUniforms.uTime, uScale: { value: 1 } },
    vertexShader: `
      attribute float seed; uniform float uTime, uScale; varying float vA;
      void main() {
        vec3 p = position + vec3(sin(uTime * 0.31 + seed) * 0.6, sin(uTime * 0.5 + seed * 1.7) * 0.25, cos(uTime * 0.27 + seed * 0.7) * 0.6);
        vA = pow(max(0.0, sin(uTime * (0.7 + fract(seed) * 0.8) + seed)), 6.0);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = (5.0 + 5.0 * vA) * uScale;
      }`,
    fragmentShader: `
      varying float vA;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d);
        gl_FragColor = vec4(vec3(1.0, 0.92, 0.45) * (a * a * 1.6 + smoothstep(0.12, 0.0, d)), 1.0) * (0.15 + 0.85 * vA);
      }`,
  });
  const pts = new THREE.Points(g, m);
  pts.frustumCulled = false;
  pts.renderOrder = 5;
  scene.add(pts);
  return m;
}

function mulberry(a) {
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// ---------- game state ----------
const state = {
  hero: null, holova: null, path: [], candle: false, talking: false,
  journal: [], flags: new Set(), pending: null, camX: 0, camY: 0, viewH: 8.5,
};
const sprites = {};
let fireflyMat;

async function loadStyle(name) {
  style = name;
  const st = STYLES[name];
  const [col, hid] = await Promise.all([loadTex(`img/yard-${name}.webp`), loadTex(`img/yard-${name}-hidden.webp`)]);
  const fallback = col || await loadTex('img/blockout/guide.png');
  bgUniforms.uColor.value = fallback;
  bgUniforms.uHidden.value = hid || fallback;
  bgUniforms.uCandleTint.value.set(...st.candle);
  const [hf, hb, gv] = await Promise.all([
    loadSprite(`img/hero-${name}-front.webp`), loadSprite(`img/hero-${name}-back.webp`),
    loadSprite(`../styles/img/golova-${name}.webp`),
  ]);
  sprites.heroFront = hf || placeholderSprite('#2b3a2e');
  sprites.heroBack = hb || sprites.heroFront;
  sprites.holova = gv || placeholderSprite('#1d1d1d');
  for (const a of [state.hero, state.holova]) if (a) a.mesh.material.uniforms.uTint.value.set(...st.tint);
  if (state.hero) {
    state.hero.sprites = { front: sprites.heroFront, back: sprites.heroBack };
    state.hero.setSprite(state.hero.facing.back ? sprites.heroBack : sprites.heroFront);
    state.holova.sprites = { front: sprites.holova, back: sprites.holova };
    state.holova.setSprite(sprites.holova);
  }
  $('portrait').src = sprites.holova.canvas.toDataURL();
  document.body.dataset.style = name;
}

// ---------- camera window ----------
function updateCamera(dt, snap = false) {
  const aspect = window.innerWidth / window.innerHeight;
  let vh = Math.min(state.viewH, FULL_H), vw = vh * aspect;
  if (vw > FULL_W) { vw = FULL_W; vh = vw / aspect; }
  const l = toLocal(state.hero.pos);
  const tx = THREE.MathUtils.clamp(l.x, base.left + vw / 2, base.right - vw / 2);
  const ty = THREE.MathUtils.clamp(l.y + 0.8, base.bottom + vh / 2, base.top - vh / 2);
  const k = snap ? 1 : 1 - Math.exp(-dt * 3);
  state.camX += (tx - state.camX) * k;
  state.camY += (ty - state.camY) * k;
  cam.left = state.camX - vw / 2; cam.right = state.camX + vw / 2;
  cam.top = state.camY + vh / 2; cam.bottom = state.camY - vh / 2;
  cam.updateProjectionMatrix();
  // Fireflies scale with zoom so they stay small specks.
  if (fireflyMat) fireflyMat.uniforms.uScale.value = renderer.getPixelRatio() * Math.min(1.6, window.innerHeight / vh / 60);
}

function screenToGround(cx, cy) {
  const rect = canvas.getBoundingClientRect();
  const nx = (cx - rect.left) / rect.width, ny = 1 - (cy - rect.top) / rect.height;
  const lx = cam.left + nx * (cam.right - cam.left), ly = cam.bottom + ny * (cam.top - cam.bottom);
  const o = new THREE.Vector3(lx, ly, 0).applyMatrix4(base.matrixWorld);
  const t = -o.y / viewDir.y;
  return o.addScaledVector(viewDir, t);
}

function actorScreenRect(a) {
  const l = toLocal(a.pos);
  const h = a.height * PITCH_COS, w = h * a.current.aspect;
  return { x0: l.x - w / 2, x1: l.x + w / 2, y0: l.y, y1: l.y + h };
}

function onTap(cx, cy) {
  if (state.talking || !state.hero) return;
  const rect = canvas.getBoundingClientRect();
  const lx = cam.left + ((cx - rect.left) / rect.width) * (cam.right - cam.left);
  const ly = cam.bottom + (1 - (cy - rect.top) / rect.height) * (cam.top - cam.bottom);
  const r = actorScreenRect(state.holova);
  const pad = 0.25;
  if (lx > r.x0 - pad && lx < r.x1 + pad && ly > r.y0 - pad && ly < r.y1 + pad) {
    walkTo(new THREE.Vector3(S.SPOTS.holova.x + 1.3, 0, S.SPOTS.holova.z + 1.1), () => startDialogue('start'));
    return;
  }
  walkTo(screenToGround(cx, cy));
  showMarker(cx, cy);
}

function walkTo(target, then = null) {
  const p = findPath(state.hero.pos, target);
  state.path = p || [];
  state.pending = then;
  if (!p && then) then();
}

// ---------- dialogue ----------
function startDialogue(nodeId) {
  state.talking = true;
  state.path = [];
  state.hero.moving = 0;
  // Turn the hero toward the holova.
  const a = toLocal(state.hero.pos), b = toLocal(state.holova.pos);
  state.hero.face(b.x - a.x, b.y - a.y);
  $('dialogue').classList.add('on');
  showNode(nodeId);
}

function showNode(id) {
  const node = DIALOGUE[id];
  if (!node) { endDialogue(); return; }
  if (node.note) addNote(node.note);
  if (node.flag) state.flags.add(node.flag);
  $('speaker').textContent = node.speaker || '';
  $('portrait').classList.toggle('dim', node.speaker !== 'Голова');
  typeText(node.text);
  const box = $('choices');
  box.innerHTML = '';
  const choices = (node.choices || []).filter((c) => (!c.if || state.flags.has(c.if)) && (!c.unless || !state.flags.has(c.unless)));
  for (const c of choices) {
    const b = document.createElement('button');
    b.textContent = c.text;
    b.addEventListener('click', () => (c.to ? showNode(c.to) : endDialogue()));
    box.appendChild(b);
  }
}

let typeTimer = null;
function typeText(text) {
  const el = $('line');
  clearInterval(typeTimer);
  if (shotMode) { el.textContent = text; return; }
  let n = 0;
  el.textContent = '';
  typeTimer = setInterval(() => {
    n += 2;
    el.textContent = text.slice(0, n);
    if (n >= text.length) clearInterval(typeTimer);
  }, 16);
  el.onclick = () => { clearInterval(typeTimer); el.textContent = text; };
}

function endDialogue() {
  state.talking = false;
  $('dialogue').classList.remove('on');
}

// ---------- journal and clues ----------
function addNote(text) {
  if (state.journal.includes(text)) return;
  state.journal.push(text);
  const li = document.createElement('li');
  li.textContent = text;
  $('notes').appendChild(li);
  $('journalBtn').classList.add('new');
  toast('Записано в книжечку');
}

let toastTimer = null;
function toast(text) {
  const t = $('toast');
  t.textContent = text;
  t.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('on'), 2600);
}

function checkClues() {
  if (!state.candle) return;
  for (const c of CLUES) {
    if (state.flags.has(c.flag)) continue;
    const near = c.points.some(([x, z]) => Math.hypot(x - state.hero.pos.x, z - state.hero.pos.z) < c.radius);
    if (near) { state.flags.add(c.flag); addNote(c.note); toast(c.toast); }
  }
}

function showMarker(cx, cy) {
  const m = $('marker');
  m.style.left = cx + 'px'; m.style.top = cy + 'px';
  m.classList.remove('on'); void m.offsetWidth; m.classList.add('on');
}

// ---------- loop ----------
let last = performance.now(), time = 0, frames = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  time += shotMode ? 1 / 30 : dt;
  bgUniforms.uTime.value = time;
  bgUniforms.uFade.value = Math.min(1, bgUniforms.uFade.value + dt * 0.6);
  const hero = state.hero;
  // Walk along the path.
  if (state.path.length) {
    const target = state.path[0];
    const d = tmpV.subVectors(target, hero.pos).setY(0);
    const dist = d.length(), step = 2.3 * dt;
    if (dist <= step) {
      hero.pos.copy(target);
      state.path.shift();
    } else {
      hero.pos.addScaledVector(d.normalize(), step);
    }
    const a = toLocal(hero.pos), b = toLocal(target);
    if (dist > 0.05) hero.face(b.x - a.x, b.y - a.y);
    hero.moving = 1;
    if (!state.path.length) {
      hero.moving = 0;
      const cb = state.pending; state.pending = null;
      if (cb) cb();
    }
  } else hero.moving = 0;
  hero.update(dt);
  state.holova.update(dt);
  checkClues();

  // Candle light follows the hero, centred about his chest.
  const l = toLocal(hero.pos);
  l.y += 1.0 * PITCH_COS;
  bgUniforms.uCandleUV.value.copy(localToImageUV(l));
  bgUniforms.uCandleR.value.set(3.1 / FULL_W, 3.1 / FULL_H);
  const target = state.candle ? 1 : 0;
  bgUniforms.uCandle.value += (target - bgUniforms.uCandle.value) * Math.min(1, dt * 4);
  const glow = bgUniforms.uCandle.value * (0.9 + 0.1 * Math.sin(time * 11));
  hero.mesh.material.uniforms.uGlow.value = glow * 0.55;
  const dh = Math.hypot(state.holova.pos.x - hero.pos.x, state.holova.pos.z - hero.pos.z);
  state.holova.mesh.material.uniforms.uGlow.value = glow * 0.5 * Math.max(0, 1 - dh / 3.5);

  updateCamera(dt);
  renderer.render(scene, cam);
  frames++;
  if (shotMode && frames === 8) window.__shotReady = true;
  requestAnimationFrame(frame);
}

function resize() {
  renderer.setSize(window.innerWidth, window.innerHeight);
  if (state.hero) updateCamera(0, true);
}
window.addEventListener('resize', resize);

// ---------- input ----------
let down = null;
canvas.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
canvas.addEventListener('pointerup', (e) => {
  if (!down) return;
  if (Math.hypot(e.clientX - down.x, e.clientY - down.y) < 14) onTap(e.clientX, e.clientY);
  down = null;
});
canvas.addEventListener('wheel', (e) => {
  state.viewH = THREE.MathUtils.clamp(state.viewH * (1 + Math.sign(e.deltaY) * 0.1), 7, FULL_H);
}, { passive: true });

$('candleBtn').addEventListener('click', () => {
  state.candle = !state.candle;
  $('candleBtn').classList.toggle('on', state.candle);
  if (state.candle && !state.flags.has('candleHint')) { state.flags.add('candleHint'); toast('В свете свечи видно то, чего не видно глазу'); }
});
$('journalBtn').addEventListener('click', () => { $('journal').classList.toggle('on'); $('journalBtn').classList.remove('new'); });
$('journal').addEventListener('click', () => $('journal').classList.remove('on'));
$('styleBtn').addEventListener('click', async () => {
  const names = Object.keys(STYLES);
  const next = names[(names.indexOf(style) + 1) % names.length];
  $('styleBtn').textContent = STYLES[next].name;
  bgUniforms.uFade.value = 0.2;
  await loadStyle(next);
});

// ---------- start ----------
async function init() {
  const depth = await loadTex('img/blockout/depth.png', { raw: true });
  bgUniforms.uDepth.value = depth;
  await loadStyle(style);
  $('styleBtn').textContent = STYLES[style].name;
  const st = STYLES[style];
  state.hero = new Actor('hero', { front: sprites.heroFront, back: sprites.heroBack }, 1.78);
  state.hero.pos.set(S.SPOTS.heroStart.x, 0, S.SPOTS.heroStart.z);
  state.holova = new Actor('holova', { front: sprites.holova, back: sprites.holova }, 1.7);
  state.holova.pos.set(S.SPOTS.holova.x, 0, S.SPOTS.holova.z);
  for (const a of [state.hero, state.holova]) a.mesh.material.uniforms.uTint.value.set(...st.tint);
  if (params.has('hero')) {
    const [x, z] = params.get('hero').split(',').map(Number);
    state.hero.pos.set(x, 0, z);
  }
  if (params.has('candle')) { state.candle = true; bgUniforms.uCandle.value = 1; }
  if (params.has('view')) state.viewH = Number(params.get('view'));
  fireflyMat = makeFireflies();
  resize();
  updateCamera(0, true);
  if (shotMode) { bgUniforms.uFade.value = 1; $('intro').remove(); if (params.has('talk')) startDialogue(params.get('talk')); }
  requestAnimationFrame(frame);
}

$('startBtn').addEventListener('click', () => {
  $('intro').classList.add('gone');
  toast('Тапните по земле, чтобы идти; по голове — чтобы заговорить');
});
init().then(() => {
  const b = $('startBtn');
  if (b) { b.disabled = false; b.textContent = 'Войти во двор'; }
}).catch((e) => {
  console.error(e);
  const b = $('startBtn');
  if (b) b.textContent = 'Не удалось загрузить сцену';
});
