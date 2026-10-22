// Baked fields for the meadow: an exact copy of the terrain heights (so blades sit on the ground
// mesh, not on an approximation of it) and an RGBA mask driving the grass in the vertex shader:
//   R = grass density (world.grassMask minus buildings), G = tallness, B = flowers, A = shore wetness.
import * as THREE from 'three';
import { fbm2, smoothstep, clamp } from './noise.js';

function segDist(px, pz, ax, az, bx, bz) {
  const vx = bx - ax, vz = bz - az;
  const t = clamp(((px - ax) * vx + (pz - az) * vz) / (vx * vx + vz * vz || 1), 0, 1);
  return Math.hypot(px - (ax + vx * t), pz - (az + vz * t));
}

function fenceSegments(L) {
  const segs = [];
  const f = L.fence || [];
  for (let i = 0; i < f.length - 1; i++) {
    if (f[i] && f[i + 1]) segs.push([f[i][0], f[i][1], f[i + 1][0], f[i + 1][1]]);
  }
  return segs;
}

// Heights straight from the terrain mesh vertices + which diagonal its quads use.
function bakeHeight(ctx, x0, z0, x1, z1) {
  const { world, scene } = ctx;
  const terrain = scene.getObjectByName('terrain');
  const g = terrain && terrain.geometry;
  const prm = g && g.parameters;
  if (prm && prm.widthSegments && g.index) {
    const pos = g.attributes.position;
    const gx1 = prm.widthSegments + 1, gz1 = prm.heightSegments + 1;
    const X0 = pos.getX(0), Z0 = pos.getZ(0);
    const sx = pos.getX(1) - X0, sz = pos.getZ(gx1) - Z0;
    const idx = g.index.array;
    // PlaneGeometry: quad (a, b, c, d) -> (a, b, d) (b, c, d), a=(0,0) b=(0,1) c=(1,1) d=(1,0).
    const diagonalOk = idx[0] === 0 && idx[1] === gx1 && idx[2] === 1;
    const identity = terrain.matrixWorld.equals(new THREE.Matrix4());
    if (pos.count === gx1 * gz1 && sx > 0 && sz > 0 && Math.abs(sx - sz) < 1e-4 && diagonalOk && identity) {
      const ix0 = Math.max(0, Math.floor((x0 - X0) / sx));
      const ix1 = Math.min(gx1 - 1, Math.ceil((x1 - X0) / sx));
      const iz0 = Math.max(0, Math.floor((z0 - Z0) / sz));
      const iz1 = Math.min(gz1 - 1, Math.ceil((z1 - Z0) / sz));
      const w = ix1 - ix0 + 1, h = iz1 - iz0 + 1;
      const data = new Float32Array(w * h);
      for (let iz = 0; iz < h; iz++) {
        for (let ix = 0; ix < w; ix++) data[iz * w + ix] = pos.getY((iz + iz0) * gx1 + ix + ix0);
      }
      return { data, w, h, ox: X0 + ix0 * sx, oz: Z0 + iz0 * sz, step: sx };
    }
  }
  // Fallback: sample the height function on our own 1 m grid.
  const step = 1;
  const w = Math.ceil((x1 - x0) / step) + 1, h = Math.ceil((z1 - z0) / step) + 1;
  const data = new Float32Array(w * h);
  for (let iz = 0; iz < h; iz++) {
    for (let ix = 0; ix < w; ix++) data[iz * w + ix] = world.heightAt(x0 + ix * step, z0 + iz * step);
  }
  return { data, w, h, ox: x0, oz: z0, step };
}

export function bakeFields(ctx) {
  const { world } = ctx;
  const L = world.LAYOUT;
  const cx = L.bounds.cx, cz = L.bounds.cz;
  const R = L.bounds.r + 31; // walkable radius + farthest grass ring

  const hb = bakeHeight(ctx, cx - R - 2, cz - R - 2, cx + R + 2, cz + R + 2);
  const heightTex = new THREE.DataTexture(hb.data, hb.w, hb.h, THREE.RedFormat, THREE.FloatType);
  heightTex.minFilter = heightTex.magFilter = THREE.NearestFilter;
  heightTex.generateMipmaps = false;
  heightTex.needsUpdate = true;

  const STEP = ctx.quality === 'low' ? 0.6 : 0.5;
  const N = Math.ceil((2 * R) / STEP) + 1;
  const mx0 = cx - R, mz0 = cz - R;
  const data = new Uint8Array(N * N * 4);
  const fence = fenceSegments(L);
  const H = L.hut;
  const hc = Math.cos(H.rotY || 0), hs = Math.sin(H.rotY || 0);
  const O = L.orchard;
  const well = L.well;

  for (let iz = 0; iz < N; iz++) {
    const z = mz0 + iz * STEP;
    for (let ix = 0; ix < N; ix++) {
      const x = mx0 + ix * STEP;
      if (Math.hypot(x - cx, z - cz) > R + 1) continue;
      let g = world.grassMask(x, z);
      if (g <= 0.001) continue;
      // No blades through the hut walls or the well.
      const dx = x - H.x, dz = z - H.z;
      const lx = dx * hc - dz * hs, lz = dx * hs + dz * hc;
      if (Math.abs(lx) < H.width / 2 + 0.25 && Math.abs(lz) < H.depth / 2 + 0.25) g = 0;
      if (well && Math.hypot(x - well.x, z - well.z) < 1.0) g = 0;

      const pd = world.pondDist(x, z);
      const dp = world.distToPath(x, z);
      let df = 99;
      for (const s of fence) df = Math.min(df, segDist(x, z, s[0], s[1], s[2], s[3]));
      const dy = Math.hypot(dx, dz);
      const n1 = fbm2(x * 0.11 + 3.1, z * 0.11 - 7.3, 2);

      let tall = 0.36 + 0.14 * n1;
      tall += 0.42 * (1 - smoothstep(1.05, 1.45, pd)); // lush tall grass along the shore
      tall += 0.46 * (1 - smoothstep(0.2, 1.6, df)); // weeds along the wattle fence
      tall *= 0.3 + 0.7 * smoothstep(0.75, 3.0, dp); // trampled path edges
      tall *= 0.4 + 0.6 * smoothstep(5.5, 9.5, dy); // trodden yard

      // Wildflowers: more on the meadow edges (path verge, fence, shore, orchard), in drifts.
      const verge = smoothstep(0.9, 1.6, dp) * (1 - smoothstep(2.2, 4.5, dp));
      const fenceBand = smoothstep(0.35, 0.9, df) * (1 - smoothstep(1.6, 3.4, df));
      const shoreBand = smoothstep(1.07, 1.14, pd) * (1 - smoothstep(1.25, 1.5, pd));
      const ox = Math.max(O.x0 - x, x - O.x1, 0), oz = Math.max(O.z0 - z, z - O.z1, 0);
      const orch = Math.hypot(ox, oz);
      const orchBand = 1 - smoothstep(0.5, 3.5, orch);
      const edge = Math.max(verge, fenceBand, shoreBand * 0.8, orchBand * 0.75);
      const drift = smoothstep(-0.15, 0.45, fbm2(x * 0.085 - 2.0, z * 0.085 + 5.0, 3));
      const flowers = clamp((0.12 + 0.88 * edge) * (0.25 + 0.75 * drift), 0, 1) * smoothstep(0.3, 0.8, g);

      const wet = 1 - smoothstep(1.04, 1.32, pd);
      const i = (iz * N + ix) * 4;
      data[i] = Math.round(clamp(g, 0, 1) * 255);
      data[i + 1] = Math.round(clamp(tall, 0, 1) * 255);
      data[i + 2] = Math.round(flowers * 255);
      data[i + 3] = Math.round(wet * 255);
    }
  }

  const maskTex = new THREE.DataTexture(data, N, N, THREE.RGBAFormat, THREE.UnsignedByteType);
  maskTex.minFilter = maskTex.magFilter = THREE.LinearFilter;
  maskTex.generateMipmaps = false;
  maskTex.needsUpdate = true;

  // Called once after every module has built: clear grass inside large colliders (buildings,
  // well, benches) and thin it around tree trunks.
  function stampColliders(colliders) {
    let changed = false;
    for (const c of colliders || []) {
      if (c.type === 'box') {
        if (Math.min(c.hw, c.hd) < 0.45) continue; // fences and planks keep their weeds
        const cs = Math.cos(c.rot || 0), sn = Math.sin(c.rot || 0);
        const ext = Math.hypot(c.hw, c.hd) + 0.5;
        forTexels(c.x, c.z, ext, (x, z, i) => {
          const dx = x - c.x, dz = z - c.z;
          const lx = dx * cs - dz * sn, lz = dx * sn + dz * cs;
          if (Math.abs(lx) < c.hw + 0.12 && Math.abs(lz) < c.hd + 0.12) { data[i] = 0; changed = true; }
        });
      } else if (c.type === 'circle') {
        const rr = c.r;
        forTexels(c.x, c.z, rr + 0.6, (x, z, i) => {
          const d = Math.hypot(x - c.x, z - c.z);
          const k = rr >= 0.7 ? (d < rr + 0.1 ? 0 : 1) : smoothstep(rr * 0.6, rr + 0.5, d) * 0.8 + 0.2;
          if (k < 1) { data[i] = Math.round(data[i] * k); changed = true; }
        });
      }
    }
    if (changed) maskTex.needsUpdate = true;
  }

  function forTexels(x, z, r, fn) {
    const i0 = Math.max(0, Math.floor((x - r - mx0) / STEP)), i1 = Math.min(N - 1, Math.ceil((x + r - mx0) / STEP));
    const j0 = Math.max(0, Math.floor((z - r - mz0) / STEP)), j1 = Math.min(N - 1, Math.ceil((z + r - mz0) / STEP));
    for (let j = j0; j <= j1; j++) for (let k = i0; k <= i1; k++) fn(mx0 + k * STEP, mz0 + j * STEP, (j * N + k) * 4);
  }

  // CPU lookup of the baked mask (nearest), used by the reed placement.
  function maskAt(x, z, ch = 0) {
    const k = Math.round((x - mx0) / STEP), j = Math.round((z - mz0) / STEP);
    if (k < 0 || j < 0 || k >= N || j >= N) return 0;
    return data[(j * N + k) * 4 + ch] / 255;
  }

  return {
    heightTex, maskTex, maskAt, stampColliders,
    heightInfo: new THREE.Vector4(hb.ox, hb.oz, 1 / hb.step, hb.step),
    heightSize: new THREE.Vector2(hb.w, hb.h),
    maskInfo: new THREE.Vector4(mx0 - STEP * 0.5, mz0 - STEP * 0.5, 1 / (N * STEP), 1 / (N * STEP)),
  };
}
