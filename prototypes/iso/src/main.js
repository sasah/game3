// Isometric yard: a painted picture with a depth map from its blockout, puppet characters that
// walk behind things, a candle that reveals a hidden layer, and visual-novel style dialogue.
import * as THREE from 'three';
import * as S from './scene.js';
import { DIALOGUE, CLUES } from './story.js';

const params = new URLSearchParams(location.search);
const shotMode = params.has('shot');
const $ = (id) => document.getElementById(id);

const STYLES = {
  kuindzhi: { name: 'Куинджи', tint: [0.86, 0.9, 1.04], candle: [1.0, 0.72, 0.42], mist: [0.4, 0.48, 0.58] },
  engraving: { name: 'Гравюра', tint: [0.92, 0.88, 0.8], candle: [1.0, 0.86, 0.62], mist: [0.74, 0.69, 0.6] },
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
// The painting is drawn as a full-frame quad that writes the blockout's depth, so 3D actors are
// occluded per pixel. Normals and material masks from the blockout let shaders bring it to life:
// rippling water with moon glints, drifting mist, wind in the leaves, flickering windows, and
// candlelight that lights surfaces by their orientation.
const bgUniforms = {
  uColor: { value: null }, uHidden: { value: null }, uDepth: { value: null },
  uNormal: { value: null }, uMask: { value: null },
  uCandle: { value: 0 }, uCandlePos: { value: new THREE.Vector3() },
  uCandleTint: { value: new THREE.Vector3(1, 0.75, 0.45) }, uMistColor: { value: new THREE.Vector3(0.42, 0.5, 0.6) },
  uCamWorld: { value: base.matrixWorld.clone() },
  uFrustum: { value: new THREE.Vector4(base.left, base.right, base.bottom, base.top) },
  uNearFar: { value: new THREE.Vector2(base.near, base.far) },
  uPond: { value: new THREE.Vector4(S.POND.x, S.POND.z, S.POND.rx, S.POND.rz) },
  uTime: { value: 0 }, uFade: { value: 0 }, uLive: { value: params.get('live') === '0' ? 0 : 1 },
  uDebug: { value: Number(params.get('debug') || 0) },
};
const bgMat = new THREE.ShaderMaterial({
  uniforms: bgUniforms,
  // Depth writes need the depth test on; ALWAYS lets the painting overwrite whatever is there.
  depthTest: true,
  depthFunc: THREE.AlwaysDepth,
  depthWrite: true,
  vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `
    uniform sampler2D uColor, uHidden, uDepth, uNormal, uMask;
    uniform float uCandle, uTime, uFade, uLive, uDebug;
    uniform vec3 uCandlePos, uCandleTint, uMistColor;
    uniform mat4 uCamWorld;
    uniform vec4 uFrustum, uPond;
    uniform vec2 uNearFar;
    varying vec2 vUv;

    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float noise(vec2 p) {
      vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
    }
    float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * noise(p); p = p * 2.03 + 17.1; a *= 0.5; } return s; }

    void main() {
      vec3 e = texture2D(uDepth, vUv).rgb;
      float d = dot(e, vec3(1.0, 1.0 / 255.0, 1.0 / 65025.0));
      // Reconstruct the world position of this pixel from the orthographic depth.
      float vz = uNearFar.x + d * (uNearFar.y - uNearFar.x);
      vec3 local = vec3(mix(uFrustum.x, uFrustum.y, vUv.x), mix(uFrustum.z, uFrustum.w, vUv.y), -vz);
      vec3 world = (uCamWorld * vec4(local, 1.0)).xyz;
      vec3 N = normalize(mat3(uCamWorld) * (texture2D(uNormal, vUv).rgb * 2.0 - 1.0));
      vec4 m = texture2D(uMask, vUv, 2.5); // blurred: the painting only roughly follows the blockout
      float t = uTime;

      vec2 uv = vUv;
      float water = smoothstep(0.12, 0.55, m.r) * uLive;
      vec2 rip = vec2(sin(world.x * 2.6 + t * 1.1 + 2.0 * sin(world.z * 1.3 + t * 0.5)),
                      cos(world.z * 2.9 - t * 0.9 + 2.0 * sin(world.x * 1.1 - t * 0.6)));
      uv += rip * 0.0015 * water;
      float leaf = smoothstep(0.08, 0.45, m.g) * uLive;
      float gust = 0.6 + 0.4 * sin(t * 0.37) * sin(t * 0.23 + 1.0);
      float sway = sin(t * 1.6 + world.x * 0.7 + world.z * 0.4) + 0.5 * sin(t * 2.9 + world.y * 1.3);
      uv += vec2(sway, 0.35 * cos(t * 2.2 + world.x)) * 0.0010 * gust * leaf * clamp(world.y / 4.0, 0.25, 1.0);

      vec3 col = texture2D(uColor, uv).rgb;
      vec3 hid = texture2D(uHidden, uv).rgb;

      // Moon glints twinkling on the brighter parts of the water.
      float lum = dot(col, vec3(0.3, 0.59, 0.11));
      vec2 cell = floor(world.xz * vec2(9.0, 15.0));
      float tw = hash(cell + floor(t * 4.0 + hash(cell) * 9.0));
      col += vec3(0.85, 0.92, 1.0) * step(0.94, tw) * water * smoothstep(0.16, 0.45, lum) * 0.6;

      // Candle flicker in the painted windows: warm bright pixels near the window mask.
      float win = smoothstep(0.01, 0.2, texture2D(uMask, vUv, 4.5).b);
      float warm = smoothstep(0.06, 0.3, col.r - col.b) * smoothstep(0.3, 0.75, col.r);
      float fl = 0.9 + 0.1 * sin(t * 8.3) * sin(t * 5.1 + 1.3) + 0.04 * sin(t * 23.0);
      col *= mix(1.0, fl * 1.06, warm * win * uLive);

      // Drifting ground mist, thickest over and around the pond.
      vec2 mp = world.xz * 0.22 + vec2(t * 0.035, t * 0.012);
      float mist = smoothstep(0.38, 0.85, fbm(mp));
      float nearPond = 1.0 - smoothstep(0.7, 1.6, length((world.xz - uPond.xy) / (uPond.zw * 1.8)));
      float low = 1.0 - smoothstep(0.0, 1.8, world.y);
      col = mix(col, uMistColor, (mist * nearPond * 0.42 + 0.07 * mist) * low * uLive);

      // Candle: reveal what is hidden near it and light surfaces turned toward it.
      vec3 L = uCandlePos - world;
      float dist = length(L);
      float flick = 0.93 + 0.07 * sin(t * 13.0) * sin(t * 7.3 + 1.7);
      float reveal = (1.0 - smoothstep(2.0, 3.2, dist / flick)) * uCandle;
      col = mix(col, hid, reveal);
      float atten = (1.0 / (1.0 + pow(dist / 1.9, 2.0))) * (1.0 - smoothstep(4.0, 6.5, dist));
      float lam = clamp(dot(N, L / max(dist, 1e-3)), 0.0, 1.0) * 0.82 + 0.18;
      float light = uCandle * atten * lam * flick;
      col = col * (1.0 - uCandle * 0.38 * (1.0 - smoothstep(0.0, 0.3, atten))) + col * uCandleTint * light * 2.4;
      // A little warm haze so the light reads even on dark grass.
      col += uCandleTint * light * 0.07;

      gl_FragColor = vec4(col * uFade, 1.0);
      if (uDebug > 0.5) gl_FragColor = vec4(fract(world.x * 0.25), clamp(world.y / 4.0, 0.0, 1.0), fract(world.z * 0.25), 1.0);
      if (uDebug > 1.5) gl_FragColor = vec4(vec3(light), 1.0);
      gl_FragDepth = d;
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

// Soft contact shadow under the feet.
const contactMat = new THREE.ShaderMaterial({
  transparent: true,
  depthWrite: false,
  vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `varying vec2 vUv; void main() { float d = length(vUv - 0.5) * 2.0; gl_FragColor = vec4(0.0, 0.01, 0.03, 0.5 * smoothstep(1.0, 0.2, d)); }`,
});

// The figure's silhouette laid on the ground, stretched away from the low moon.
const MOON_FLAT = new THREE.Vector2(S.MOON_DIR.x, S.MOON_DIR.z).normalize();
const MOON_ELEV = Math.asin(S.MOON_DIR.y);
const castMat = (actor) => new THREE.ShaderMaterial({
  transparent: true,
  depthWrite: false,
  uniforms: { uMap: actor.mesh.material.uniforms.uMap, uFlip: actor.mesh.material.uniforms.uFlip },
  vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `
    uniform sampler2D uMap; uniform float uFlip; varying vec2 vUv;
    void main() {
      vec2 uv = vec2(mix(vUv.x, 1.0 - vUv.x, uFlip), vUv.y);
      float a = texture2D(uMap, uv, 3.0).a;
      gl_FragColor = vec4(0.0, 0.01, 0.04, a * 0.6 * (1.0 - vUv.y * 0.6));
    }`,
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
    this.contact = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), contactMat);
    this.contact.scale.set(0.75, 1, 0.42);
    this.contact.renderOrder = 0.5;
    scene.add(this.contact);
    // Plane lying on the ground with its "up" pointing away from the moon.
    this.cast = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0).rotateX(-Math.PI / 2), castMat(this));
    this.cast.rotation.y = Math.atan2(MOON_FLAT.x, MOON_FLAT.y);
    this.cast.renderOrder = 0.4;
    this.cast.frustumCulled = false;
    scene.add(this.cast);
    this.setSprite(sprites.front);
  }
  setSprite(s) {
    this.current = s;
    this.mesh.material.uniforms.uMap.value = s.tex;
    const h = this.height * PITCH_COS;
    this.mesh.scale.set(h * s.aspect, h, 1);
    this.cast.scale.set(this.height * s.aspect * 0.9, 1, this.height / Math.tan(MOON_ELEV) * 0.75);
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
    this.contact.position.set(this.pos.x, 0.03, this.pos.z);
    this.contact.scale.x = 0.75 - hop * 1.5;
    this.cast.position.set(this.pos.x, 0.025, this.pos.z);
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
  bgUniforms.uMistColor.value.set(...st.mist);
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
  // The candle is held at chest height, a little in front of the hero.
  bgUniforms.uCandlePos.value.set(hero.pos.x + 0.2, 1.15, hero.pos.z + 0.2);
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
  const [depth, normal, mask] = await Promise.all([
    loadTex('img/blockout/depth.png', { raw: true }), loadTex('img/blockout/normal.png'), loadTex('img/blockout/mask.png'),
  ]);
  bgUniforms.uDepth.value = depth;
  bgUniforms.uNormal.value = normal;
  bgUniforms.uMask.value = mask;
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
