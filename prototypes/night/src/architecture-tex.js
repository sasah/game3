// Procedural canvas textures for the architecture module: whitewashed clay (albedo + normal),
// straw thatch (albedo + normal), hanging straw fringe (alpha) and weathered wood grain.
// All tileable where they repeat; generated once at build time.
import * as THREE from 'three';

function hashI(x, y, s) {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// Value noise in [-1, 1], periodic with integer periods px, py.
export function tnoise(x, y, px, py, s = 0) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
  const x0 = ((ix % px) + px) % px, x1 = (x0 + 1) % px;
  const y0 = ((iy % py) + py) % py, y1 = (y0 + 1) % py;
  const a = hashI(x0, y0, s), b = hashI(x1, y0, s), c = hashI(x0, y1, s), d = hashI(x1, y1, s);
  return (a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy) * 2 - 1;
}

export function tfbm(x, y, px, py, oct, s = 0) {
  let sum = 0, amp = 0.5, norm = 0, f = 1;
  for (let i = 0; i < oct; i++) {
    sum += amp * tnoise(x * f, y * f, px * f, py * f, s + i * 31);
    norm += amp;
    amp *= 0.5;
    f *= 2;
  }
  return sum / norm;
}

// Fast periodic fbm from precomputed lattice grids (period px, py in first-octave units).
function gridFbm(px, py, oct, seed) {
  const G = [];
  for (let i = 0; i < oct; i++) {
    const f = 1 << i, gx = px * f, gy = py * f;
    const g = new Float32Array(gx * gy);
    for (let y = 0; y < gy; y++) for (let x = 0; x < gx; x++) g[y * gx + x] = hashI(x, y, seed + i * 31) * 2 - 1;
    G.push({ g, gx, gy, f });
  }
  let norm = 0;
  for (let i = 0, a = 0.5; i < oct; i++, a *= 0.5) norm += a;
  return (x, y) => {
    let sum = 0, amp = 0.5;
    for (let i = 0; i < G.length; i++) {
      const { g, gx, gy, f } = G[i];
      const X = x * f, Y = y * f;
      const ix = Math.floor(X), iy = Math.floor(Y);
      let fx = X - ix, fy = Y - iy;
      fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
      const x0 = ((ix % gx) + gx) % gx, x1 = x0 + 1 === gx ? 0 : x0 + 1;
      const y0 = ((iy % gy) + gy) % gy, y1 = y0 + 1 === gy ? 0 : y0 + 1;
      const a = g[y0 * gx + x0], b = g[y0 * gx + x1], c = g[y1 * gx + x0], d = g[y1 * gx + x1];
      sum += amp * (a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy);
      amp *= 0.5;
    }
    return sum / norm;
  };
}

const sm = (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };

function heightToNormal(hf, W, H, strength, wrapY) {
  const img = new ImageData(W, H);
  const d = img.data;
  for (let y = 0; y < H; y++) {
    const yu = wrapY ? (y - 1 + H) % H : Math.max(0, y - 1);
    const yd = wrapY ? (y + 1) % H : Math.min(H - 1, y + 1);
    for (let x = 0; x < W; x++) {
      const xl = (x - 1 + W) % W, xr = (x + 1) % W;
      const dx = (hf[y * W + xr] - hf[y * W + xl]) * strength;
      const dy = (hf[yd * W + x] - hf[yu * W + x]) * strength;
      // Canvas rows go down, texture v goes up (flipY): n = (-dh/du, -dh/dv, 1).
      let nx = -dx, ny = dy, nz = 1;
      const l = Math.hypot(nx, ny, nz);
      nx /= l; ny /= l; nz /= l;
      const i = (y * W + x) * 4;
      d[i] = (nx * 0.5 + 0.5) * 255;
      d[i + 1] = (ny * 0.5 + 0.5) * 255;
      d[i + 2] = (nz * 0.5 + 0.5) * 255;
      d[i + 3] = 255;
    }
  }
  return img;
}

function canvasTex(renderer, img, srgb, wrapT = THREE.RepeatWrapping) {
  const c = document.createElement('canvas');
  c.width = img.width; c.height = img.height;
  c.getContext('2d').putImageData(img, 0, 0);
  return finishTex(renderer, c, srgb, wrapT);
}

function finishTex(renderer, canvas, srgb, wrapT = THREE.RepeatWrapping) {
  const t = new THREE.CanvasTexture(canvas);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = wrapT;
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  t.needsUpdate = true;
  return t;
}

// Whitewash over clay. The texture spans one horizontal tile (tileU meters, wraps) and the full
// wall height: v = (y + 0.25) / 2.6 for wall-local height y.
export const WALL_TEX_V = { y0: -0.25, h: 2.6 };

export function makeWallTextures(renderer, W, H, tileU) {
  const albedo = new ImageData(W, H);
  const A = albedo.data;
  const hf = new Float32Array(W * H);
  const PY = 100003;
  const vm = WALL_TEX_V.h / tileU; // vertical meters in tile units
  // Low-frequency terms on a coarse grid (bilinear), fine terms per pixel.
  const CW = W / 4, CH = H / 4;
  const coarse = new Float32Array(CW * CH * 3);
  for (let y = 0; y < CH; y++) {
    for (let x = 0; x < CW; x++) {
      const fx = x / CW, fy = (1 - (y + 0.5) / CH) * vm;
      const k = (y * CW + x) * 3;
      coarse[k] = tfbm(fx * 2, fy * 2, 2, PY, 3, 1);             // big blotches
      coarse[k + 1] = tfbm(fx * 7, fy * 7, 7, PY, 3, 2);         // worn patches
      coarse[k + 2] = tfbm(fx * 3, fy * 3, 3, PY, 2, 6);         // crack density
    }
  }
  const cs = (x, y, o) => {
    const gx = x / 4 - 0.5, gy = y / 4 - 0.5;
    const x0 = Math.floor(gx), y0 = Math.floor(gy);
    const tx = gx - x0, ty = gy - y0;
    const xa = (x0 + CW) % CW, xb = (x0 + 1) % CW;
    const ya = Math.max(0, Math.min(CH - 1, y0)), yb = Math.max(0, Math.min(CH - 1, y0 + 1));
    const a = coarse[(ya * CW + xa) * 3 + o], b = coarse[(ya * CW + xb) * 3 + o];
    const c = coarse[(yb * CW + xa) * 3 + o], d = coarse[(yb * CW + xb) * 3 + o];
    return (a + (b - a) * tx) * (1 - ty) + (c + (d - c) * tx) * ty;
  };
  const yMax = vm + 0.1;
  const nWarp = gridFbm(9, Math.ceil(yMax * 3) + 2, 1, 4);
  const nStreak = gridFbm(5, Math.ceil(yMax * 70) + 2, 2, 3);
  const nStreak2 = gridFbm(26, Math.ceil(yMax * 22) + 2, 1, 9);
  const nCrack = gridFbm(14, Math.ceil(yMax * 14) + 2, 3, 5);
  for (let y = 0; y < H; y++) {
    const fy = (1 - (y + 0.5) / H) * vm;
    const m = (1 - (y + 0.5) / H) * WALL_TEX_V.h + WALL_TEX_V.y0; // meters above wall base
    for (let x = 0; x < W; x++) {
      const fx = x / W;
      const blot = cs(x, y, 0), wornN = cs(x, y, 1), crackMask = cs(x, y, 2);
      // Horizontal-ish wavy brush strokes.
      const warp = nWarp(fx * 9, fy * 3) * 0.035;
      const streak = nStreak(fx * 5, Math.max(0, fy + warp) * 70);
      const streak2 = nStreak2(fx * 26, Math.max(0, fy - warp) * 22);
      const grain = hashI(x, y, 77) - 0.5;
      // Hairline cracks: contour lines of a noise field, only in some regions.
      const cn = nCrack(fx * 14, fy * 14);
      let crack = (1 - sm(0.0, 0.03, Math.abs(cn))) * sm(0.15, 0.4, crackMask);
      crack *= 0.6 + 0.4 * sm(1.6, 0.4, m);
      const baseZone = 1 - sm(0.1, 1.0, m);
      const worn = sm(0.4, 0.55, wornN * 0.75 + streak2 * 0.2 + baseZone * 0.28);
      const grime = 1 - sm(-0.05, 0.8, m + 0.25 * blot);

      const k = 1 + 0.045 * blot + 0.03 * streak + 0.02 * streak2 + 0.035 * grain;
      let r = 0.95 * k, g = 0.945 * k, b = 0.915 * k;
      const wk = worn * 0.8;
      r += (0.72 - r) * wk; g += (0.62 - g) * wk; b += (0.5 - b) * wk;
      const gk = grime * 0.7;
      r += (0.4 - r) * gk; g += (0.37 - g) * gk; b += (0.32 - b) * gk;
      const ck = 1 - 0.5 * crack;
      const i = (y * W + x) * 4;
      A[i] = Math.min(255, r * ck * 255);
      A[i + 1] = Math.min(255, g * ck * 255);
      A[i + 2] = Math.min(255, b * ck * 255);
      A[i + 3] = 255;
      hf[y * W + x] = 0.5 * blot + 0.35 * streak + 0.25 * streak2 + 0.12 * grain - 1.1 * crack - 0.35 * worn;
    }
  }
  const normal = heightToNormal(hf, W, H, W / 512 * 1.6, false);
  return {
    map: canvasTex(renderer, albedo, true, THREE.ClampToEdgeWrapping),
    normal: canvasTex(renderer, normal, false, THREE.ClampToEdgeWrapping),
  };
}

// Straw thatch: one tile = 1 m x 1 m, strands run along v (down the slope), three stepped
// courses with irregular butt edges; per-pixel lattice noise (fast, tileable both ways).
export function makeThatchTextures(renderer, N, rng) {
  const courses = 2;
  const albedo = new ImageData(N, N);
  const A = albedo.data;
  const hf = new Float32Array(N * N);
  const nS1 = gridFbm(70, 5, 2, 21), nS2 = gridFbm(190, 9, 1, 22), nS3 = gridFbm(31, 3, 2, 23);
  const nEdge = gridFbm(18, 1, 2, 24), nBlot = gridFbm(4, 4, 3, 13), nTip = gridFbm(120, 3, 1, 25);
  for (let y = 0; y < N; y++) {
    const fy = y / N;
    for (let x = 0; x < N; x++) {
      const fx = x / N;
      const fyp = fy + 0.06 * nEdge(fx * 18, 0.5) + 0.02 * nTip(fx * 120, fy * 3);
      const cf = ((fyp * courses) % courses + courses) % courses;
      const c = Math.floor(cf), cy = cf - c;
      const sx = fx + c * 0.371;
      const s1 = nS1(sx * 70, fy * 5), s2 = nS2(sx * 190, fy * 9), s3 = nS3(sx * 31, fy * 3);
      const strand = 0.5 * s1 + 0.32 * s2 + 0.18 * s3;
      const blot = nBlot(fx * 4, fy * 4);
      const shade = 0.82 + 0.18 * sm(0.0, 0.5, cy) + 0.05 * sm(0.85, 0.99, cy);
      const L = (0.38 + 0.27 * strand + 0.08 * blot) * shade;
      const warm = 0.5 + 0.5 * s3;
      const i = (y * N + x) * 4;
      A[i] = Math.min(255, 255 * L * (1.0 + 0.05 * warm));
      A[i + 1] = Math.min(255, 255 * L * (0.93 + 0.02 * warm));
      A[i + 2] = Math.min(255, 255 * L * (0.76 - 0.04 * warm));
      A[i + 3] = 255;
      hf[y * N + x] = 0.6 * strand + 0.3 * cy + 0.25 * blot;
    }
  }
  const normal = heightToNormal(hf, N, N, N / 512 * 2.0, true);
  return { map: canvasTex(renderer, albedo, true), normal: canvasTex(renderer, normal, false) };
}

// Hanging straw ends along the eaves: 0.5 m wide tile, attached at the top (v = 1).
export function makeFringeTexture(renderer, W, H, rng) {
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.lineCap = 'round';
  const n = Math.round(W * 1.8);
  for (let i = 0; i < n; i++) {
    const x = rng() * W;
    const len = H * (0.25 + 0.75 * Math.pow(rng(), 0.7));
    const ang = (rng() - 0.5) * 0.35;
    const L = 0.3 + 0.45 * rng();
    g.strokeStyle = `rgb(${(255 * L) | 0},${(235 * L) | 0},${(185 * L) | 0})`;
    g.lineWidth = W / 512 * (1.2 + 2.2 * rng());
    for (const ox of [-W, 0, W]) {
      g.beginPath();
      g.moveTo(x + ox, -2);
      g.lineTo(x + ox + Math.sin(ang) * len, Math.cos(ang) * len);
      g.stroke();
    }
  }
  // Dense root so the fringe keeps its mass in the mips.
  const grad = g.createLinearGradient(0, 0, 0, H * 0.3);
  grad.addColorStop(0, 'rgba(70,60,46,1)');
  grad.addColorStop(1, 'rgba(70,60,46,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, W, H * 0.3);
  return finishTex(renderer, c, true, THREE.ClampToEdgeWrapping);
}

// Weathered wood grain multiplier (linear data, ~0.55..1): u across 0.5 m, v along 1 m (grain).
export function makeGrainTexture(renderer, W, H) {
  const img = new ImageData(W, H);
  const d = img.data;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const fx = x / W, fy = y / H;
      const warp = tfbm(fx * 4, fy * 2, 4, 2, 2, 3) * 0.06;
      const lines = tfbm((fx + warp) * 48, fy * 3, 48, 3, 3, 1);
      const fibers = tnoise((fx + warp) * 160, fy * 6, 160, 6, 2);
      const blot = tfbm(fx * 3, fy * 2, 3, 2, 3, 5);
      const crack = 1 - sm(0.0, 0.05, Math.abs(tfbm((fx + warp) * 9, fy * 1, 9, 1, 2, 7)));
      let v = 0.84 + 0.1 * lines + 0.05 * fibers + 0.07 * blot - 0.35 * crack * sm(0.0, 0.3, blot + 0.2);
      v = Math.max(0.35, Math.min(1, v));
      const i = (y * W + x) * 4;
      d[i] = d[i + 1] = d[i + 2] = v * 255;
      d[i + 3] = 255;
    }
  }
  return canvasTex(renderer, img, false);
}
