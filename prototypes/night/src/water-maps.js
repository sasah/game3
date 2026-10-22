// Procedural data textures for the pond module: tileable ripple slopes, tileable fbm noise and a
// baked ground map (terrain height + mist mask) aligned with the terrain mesh grid.
import * as THREE from 'three';
import { mulberry32, fbm2, smoothstep } from './noise.js';

// Tileable slope map built from integer-wavenumber sine waves (exactly periodic in the tile).
// RG = slope along u / v (unit-RMS pattern, stored as rms * 1/3 → value range covers ±3σ),
// B = height, A = 1. The shader multiplies by the target RMS slope of each layer.
export function makeRippleTexture(N = 128, seed = 11) {
  const rng = mulberry32(seed);
  const waves = [];
  for (let i = 0; i < 44; i++) {
    const r = 2 + Math.pow(rng(), 1.5) * 21;
    // Ripples mostly travel downwind (+u) with a wide spread; a few cross waves.
    let ang = (rng() - 0.5) * 2;
    ang = Math.sign(ang) * ang * ang * 1.7;
    if (rng() < 0.18) ang += (rng() - 0.5) * Math.PI * 1.6;
    let m = Math.round(Math.cos(ang) * r), n = Math.round(Math.sin(ang) * r);
    if (m === 0 && n === 0) m = 2;
    const k = Math.hypot(m, n);
    waves.push({ m, n, a: Math.pow(k, -1.35) * (0.5 + rng()), p: rng() * Math.PI * 2 });
  }
  const sx = new Float32Array(N * N), sz = new Float32Array(N * N), hh = new Float32Array(N * N);
  const TAU = Math.PI * 2;
  let s2 = 0, hmax = 1e-6;
  // Separable phases: cos/sin(a + b) from per-column and per-row tables (no trig in the loop).
  const cu = new Float32Array(N), su = new Float32Array(N), cv = new Float32Array(N), sv = new Float32Array(N);
  for (const w of waves) {
    for (let k = 0; k < N; k++) {
      const a = TAU * w.m * k / N + w.p, b = TAU * w.n * k / N;
      cu[k] = Math.cos(a); su[k] = Math.sin(a); cv[k] = Math.cos(b); sv[k] = Math.sin(b);
    }
    const am = w.a * TAU * w.m, an = w.a * TAU * w.n;
    for (let y = 0; y < N; y++) {
      const cy = cv[y], sy = sv[y], row = y * N;
      for (let x = 0; x < N; x++) {
        const c = cu[x] * cy - su[x] * sy, s = su[x] * cy + cu[x] * sy;
        const i = row + x;
        hh[i] += w.a * s;
        sx[i] += am * c;
        sz[i] += an * c;
      }
    }
  }
  for (let i = 0; i < N * N; i++) {
    s2 += sx[i] * sx[i] + sz[i] * sz[i];
    hmax = Math.max(hmax, Math.abs(hh[i]));
  }
  const rms = Math.sqrt(s2 / (N * N * 2));
  const data = new Uint8Array(N * N * 4);
  const enc = (v) => Math.max(0, Math.min(255, Math.round((v * 0.5 + 0.5) * 255)));
  for (let i = 0; i < N * N; i++) {
    data[i * 4] = enc(sx[i] / (3 * rms));
    data[i * 4 + 1] = enc(sz[i] / (3 * rms));
    data[i * 4 + 2] = enc(hh[i] / hmax);
    data[i * 4 + 3] = 255;
  }
  const tex = new THREE.DataTexture(data, N, N, THREE.RGBAFormat, THREE.UnsignedByteType);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

// Tileable fbm noise from periodic value-noise lattices: R soft (4 cells), G medium (8 cells),
// B very soft (2 cells), A fine (16 cells).
function lattice(P, seed) {
  const L = new Float32Array(P * P);
  for (let j = 0; j < P; j++) {
    for (let i = 0; i < P; i++) {
      let h = Math.imul(i, 374761393) + Math.imul(j, 668265263) + Math.imul(seed, 2246822519);
      h = Math.imul(h ^ (h >>> 13), 1274126177);
      L[j * P + i] = ((h ^ (h >>> 16)) >>> 0) / 4294967296;
    }
  }
  return L;
}

export function makeNoiseTexture(N = 128) {
  const data = new Uint8Array(N * N * 4);
  const acc = new Float32Array(N * N);
  const cfg = [[4, 4, 3], [8, 4, 7], [2, 3, 13], [16, 3, 19]];
  cfg.forEach(([base, oct, seed], c) => {
    acc.fill(0);
    let amp = 0.5, norm = 0, P = base;
    for (let o = 0; o < oct; o++) {
      const L = lattice(P, seed + o * 31);
      const k = P / N;
      for (let y = 0; y < N; y++) {
        const gy = y * k, iy = Math.floor(gy), fy = gy - iy, uy = fy * fy * (3 - 2 * fy);
        const r0 = (iy % P) * P, r1 = ((iy + 1) % P) * P;
        for (let x = 0; x < N; x++) {
          const gx = x * k, ix = Math.floor(gx), fx = gx - ix, ux = fx * fx * (3 - 2 * fx);
          const i0 = ix % P, i1 = (ix + 1) % P;
          const a = L[r0 + i0], b = L[r0 + i1], cc = L[r1 + i0], d = L[r1 + i1];
          acc[y * N + x] += amp * (a + (b - a) * ux + (cc - a) * uy + (a - b - cc + d) * ux * uy);
        }
      }
      norm += amp; amp *= 0.5; P *= 2;
    }
    for (let i = 0; i < N * N; i++) {
      const n = Math.max(0, Math.min(1, (acc[i] / norm - 0.5) * 1.6 + 0.5)); // stretch contrast
      data[i * 4 + c] = Math.round(n * 255);
    }
  });
  const tex = new THREE.DataTexture(data, N, N, THREE.RGBAFormat, THREE.UnsignedByteType);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.needsUpdate = true;
  return tex;
}

// Ground map over a region around the pond. Texel centers sit exactly on terrain mesh vertices
// (when the terrain mesh is found), so GPU bilinear filtering reproduces the rendered terrain
// height closely: R = ground height, G = mist mask, B = 0, A = 1 (half float, filterable).
export function bakeGround(ctx, region) {
  const { world, scene } = ctx;
  const terrain = scene.getObjectByName('terrain');
  let step = 1, gx0, gz0, read = null;
  if (terrain && terrain.geometry && terrain.geometry.parameters && terrain.geometry.parameters.widthSegments) {
    const g = terrain.geometry, p = g.parameters, pos = g.attributes.position;
    const segs = p.widthSegments, s = p.width / segs;
    const x0 = pos.getX(0), z0 = pos.getZ(0);
    // Sanity check the expected PlaneGeometry layout.
    if (Math.abs(pos.getX(1) - x0 - s) < 1e-3 && Math.abs(pos.getZ(segs + 1) - z0 - s) < 1e-3) {
      step = s;
      const ix0 = Math.floor((region.x0 - x0) / s), iz0 = Math.floor((region.z0 - z0) / s);
      gx0 = x0 + ix0 * s; gz0 = z0 + iz0 * s;
      read = (i, j) => {
        const ix = ix0 + i, iz = iz0 + j;
        if (ix < 0 || iz < 0 || ix > segs || iz > segs) return world.heightAt(gx0 + i * s, gz0 + j * s);
        return pos.getY(iz * (segs + 1) + ix);
      };
    }
  }
  if (!read) {
    step = 1; gx0 = Math.floor(region.x0); gz0 = Math.floor(region.z0);
    read = (i, j) => world.heightAt(gx0 + i * step, gz0 + j * step);
  }
  const W = Math.ceil((region.x1 - gx0) / step) + 1;
  const H = Math.ceil((region.z1 - gz0) / step) + 1;
  const height = new Float32Array(W * H);
  const mist = new Float32Array(W * H);
  const half = new Uint16Array(W * H * 4);
  const toH = THREE.DataUtils.toHalfFloat;
  for (let j = 0; j < H; j++) {
    for (let i = 0; i < W; i++) {
      const x = gx0 + i * step, z = gz0 + j * step;
      const h = read(i, j);
      const d = world.pondDist(x, z);
      // Thickest along the reedy shores and in the hollows, thinner over open water so the
      // mirror of the hut stays readable.
      let m = (0.4 + 0.6 * smoothstep(0.5, 0.95, d)) * (1 - smoothstep(1.15, 1.75, d));
      m *= 1 - smoothstep(0.7, 2.0, h);
      m *= 0.5 + 0.5 * (0.5 + 0.5 * fbm2(x * 0.07 + 11.3, z * 0.07 - 4.1, 3));
      // Fade to nothing at the region border (texture clamps to its edge).
      const edge = Math.min(i, j, W - 1 - i, H - 1 - j);
      m *= smoothstep(0, 4, edge);
      const k = j * W + i;
      height[k] = h; mist[k] = m;
      half[k * 4] = toH(h);
      half[k * 4 + 1] = toH(m);
      half[k * 4 + 2] = 0;
      half[k * 4 + 3] = toH(1);
    }
  }
  const tex = new THREE.DataTexture(half, W, H, THREE.RGBAFormat, THREE.HalfFloatType);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  // uv = xz * scale + offset hits texel centers at grid vertices.
  const xform = new THREE.Vector4(1 / (step * W), 1 / (step * H), 0.5 / W - gx0 / (step * W), 0.5 / H - gz0 / (step * H));
  function sample(arr, x, z) {
    const fx = Math.max(0, Math.min(W - 1.001, (x - gx0) / step));
    const fz = Math.max(0, Math.min(H - 1.001, (z - gz0) / step));
    const i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j;
    const a = arr[j * W + i], b = arr[j * W + i + 1], c = arr[(j + 1) * W + i], d = arr[(j + 1) * W + i + 1];
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  return {
    tex, xform, W, H, step, gx0, gz0, height, mist,
    heightAt: (x, z) => sample(height, x, z),
    mistAt: (x, z) => sample(mist, x, z),
  };
}
