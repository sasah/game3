// Distant silhouettes, cheap and fog-blended: a post windmill (вітряк) with four lattice sails
// turning very slowly, a wooden three-domed church with crosses, and the neighbouring village
// (white huts under hip roofs, a few candlelit windows that bloom, haystacks, a well sweep).
import * as THREE from 'three';
import { box, pole, lathe, srgb, mat4 } from './architecture-geo.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

// Flat convex polygon (fan) with its own normal.
function poly(pts) {
  const pos = [], nrm = [];
  const n = new THREE.Vector3().subVectors(pts[1], pts[0]).cross(new THREE.Vector3().subVectors(pts[2], pts[0])).normalize();
  for (let i = 1; i < pts.length - 1; i++) {
    for (const p of [pts[0], pts[i], pts[i + 1]]) { pos.push(p.x, p.y, p.z); nrm.push(n.x, n.y, n.z); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  return g;
}

function hipRoof(B, M, hw, hd, yE, yR, col) {
  const rl = Math.max(0.05, hw - hd);
  const E0 = V(-hw, yE, hd), E1 = V(hw, yE, hd), E2 = V(hw, yE, -hd), E3 = V(-hw, yE, -hd);
  const R0 = V(-rl, yR, 0), R1 = V(rl, yR, 0);
  const m = [0.9, 0, 0, 0];
  B.add(poly([E0, E1, R1, R0]), M, col, m);
  B.add(poly([E1, E2, R1]), M, col, m);
  B.add(poly([E2, E3, R0, R1]), M, col, m);
  B.add(poly([E3, E0, R0]), M, col, m);
  B.add(poly([E0, E3, E2, E1]), M, col.clone().multiplyScalar(0.5), m);
}

const mul = (A, B) => new THREE.Matrix4().multiplyMatrices(A, B);

export function buildWindmill(ctx, far, rng) {
  const { world } = ctx;
  const P = world.LAYOUT.windmill;
  const gy = world.heightAt(P.x, P.z) - 0.2;
  const yaw = Math.atan2(0 - P.x, -4 - P.z); // sails face the village
  const M = mat4(P.x, gy, P.z, 0, yaw, 0);
  const wood = srgb(0.25, 0.22, 0.19), dark = srgb(0.16, 0.14, 0.12);
  const L = (x, y, z) => V(x, y, z).applyMatrix4(M);
  const m = [0.9, 0, 0, 0];
  // Trestle and central post.
  far.add(pole(L(0, -0.5, 0), L(0, 3.6, 0), 0.3, 0.26, 6), undefined, dark, m);
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    far.add(pole(L(sx * 1.8, -0.2, sz * 1.8), L(sx * 0.2, 2.3, sz * 0.2), 0.12, 0.1, 4), undefined, dark, m);
  }
  // Cabin with a gable roof (ridge front-back) and a bit of lean.
  const C = mul(M, mat4(0, 0, 0, 0.0, 0, 0.015));
  far.add(box(3.5, 4.3, 4.1), mul(C, mat4(0, 5.75, 0)), wood, m);
  far.add(box(3.7, 0.2, 4.3), mul(C, mat4(0, 3.6, 0)), dark, m);
  const e = 2.05, h0 = 7.9, h1 = 9.75;
  const rc = srgb(0.17, 0.155, 0.14);
  const RM = mul(C, mat4(0, 0, 0));
  far.add(poly([V(-e, h0, 2.3), V(0, h1, 2.3), V(0, h1, -2.3), V(-e, h0, -2.3)]), RM, rc, m);
  far.add(poly([V(0, h1, 2.3), V(e, h0, 2.3), V(e, h0, -2.3), V(0, h1, -2.3)]), RM, rc, m);
  far.add(poly([V(-1.75, h0, 2.05), V(1.75, h0, 2.05), V(0, h1 - 0.1, 2.05)]), RM, wood, m);
  far.add(poly([V(1.75, h0, -2.05), V(-1.75, h0, -2.05), V(0, h1 - 0.1, -2.05)]), RM, wood, m);
  // Tail pole (водило) and back stair.
  far.add(pole(L(0, 3.8, -2.0), L(0.3, 0.2, -8.5), 0.17, 0.12, 5), undefined, dark, m);
  far.add(pole(L(-0.5, 3.6, -2.1), L(-0.6, 0.0, -5.6), 0.09, 0.09, 4), undefined, dark, m);
  far.add(pole(L(0.5, 3.6, -2.1), L(0.4, 0.0, -5.6), 0.09, 0.09, 4), undefined, dark, m);
  // Axle stub.
  const hub = L(0, 7.3, 2.55);
  far.add(pole(L(0, 7.2, 1.9), hub, 0.22, 0.2, 6), undefined, dark, m);

  // Sails: separate mesh spinning about the (slightly tilted) axle.
  const sails = new (far.constructor)();
  const sm = [0.9, 0, 0, 0];
  const sc = srgb(0.3, 0.27, 0.23);
  for (let k = 0; k < 4; k++) {
    const R = mat4(0, 0, 0, 0, 0, (k * Math.PI) / 2);
    sails.add(box(0.26, 7.1, 0.22), mul(R, mat4(0, 3.45, 0)), sc, sm);
    sails.add(box(0.14, 5.4, 0.12), mul(R, mat4(1.75, 4.25, 0.05)), sc, sm);
    for (let j = 0; j < 11; j++) {
      const r = 1.65 + j * 0.52;
      sails.add(box(1.8, 0.1, 0.08), mul(R, mat4(0.85, r, 0.05)), sc, sm);
    }
    sails.add(box(0.1, 5.4, 0.08), mul(R, mat4(0.9, 4.25, 0.06)), sc, sm);
  }
  return { sails, hub, yaw };
}

export function buildChurch(ctx, far, rng) {
  const { world } = ctx;
  const P = world.LAYOUT.church;
  const gy = world.heightAt(P.x, P.z) - 0.4;
  const M = mat4(P.x, gy, P.z, 0, 0.08, 0);
  const wall = srgb(0.24, 0.21, 0.18), roof = srgb(0.15, 0.145, 0.14), dome = srgb(0.2, 0.2, 0.21), cross = srgb(0.62, 0.57, 0.46);
  const m = [0.85, 0, 0, 0];
  const frames = [{ x: -6.8, R: 2.5, Hb: 5.0, tiers: 1, s: 0.78 }, { x: 0, R: 3.3, Hb: 6.4, tiers: 2, s: 1 }, { x: 6.8, R: 2.5, Hb: 5.0, tiers: 1, s: 0.78 }];
  const domeProf = [[0.001, 0], [0.55, 0], [0.95, 0.35], [1.15, 0.85], [1.05, 1.35], [0.62, 1.85], [0.22, 2.15], [0.12, 2.35], [0.001, 2.45]];
  for (const f of frames) {
    const F = mul(M, mat4(f.x, 0, 0, 0, Math.PI / 8, 0));
    const add = (g, y, col) => far.add(g, mul(F, mat4(0, y, 0)), col, m);
    add(new THREE.CylinderGeometry(f.R, f.R * 1.03, f.Hb + 0.5, 8), (f.Hb - 0.5) / 2, wall);
    add(new THREE.CylinderGeometry(f.R * 1.02, f.R + 1.0, 0.85, 8, 1, true), 2.75, roof);
    let y = f.Hb, r = f.R;
    for (let t = 0; t < f.tiers; t++) {
      const r2 = r * 0.68;
      add(new THREE.CylinderGeometry(r2, r + 0.45, 1.3 * f.s, 8, 1, true), y + 0.65 * f.s, roof);
      y += 1.0 * f.s;
      add(new THREE.CylinderGeometry(r2, r2, 1.9 * f.s, 8), y + 0.95 * f.s, wall);
      y += 1.9 * f.s;
      r = r2;
    }
    const dr = 0.78 * f.s;
    add(new THREE.CylinderGeometry(dr, r + 0.35, 1.0 * f.s, 8, 1, true), y + 0.5 * f.s, roof);
    y += 0.8 * f.s;
    add(new THREE.CylinderGeometry(dr, dr, 1.0 * f.s, 8), y + 0.5 * f.s, wall);
    y += 1.0 * f.s;
    const dg = lathe(domeProf.map(([a, b]) => [a * f.s, b * f.s]), 12);
    add(dg, y, dome);
    y += 2.45 * f.s;
    const cs = f.s;
    add(box(0.13, 2.2 * cs, 0.13), y + 1.0 * cs, cross);
    add(box(1.0 * cs, 0.11, 0.11), y + 1.45 * cs, cross);
    far.add(box(0.7 * cs, 0.1, 0.1), mul(F, mat4(0, y + 0.55 * cs, 0, 0, 0, 0.35)), cross, m);
  }
  // Connecting low roofs between the frames.
  for (const sx of [-1, 1]) {
    far.add(box(3.0, 3.6, 4.2), mul(M, mat4(sx * 3.5, 1.4, 0)), wall, m);
    far.add(box(3.2, 0.3, 4.8), mul(M, mat4(sx * 3.5, 3.35, 0, 0, 0, 0)), roof, m);
  }
}

export function buildVillage(ctx, far, rng) {
  const { world } = ctx;
  const Vg = world.LAYOUT.village;
  const white = srgb(0.62, 0.61, 0.58), roof = srgb(0.2, 0.18, 0.15), glass = srgb(0.04, 0.05, 0.06);
  const warm = new THREE.Color().setRGB(1.0, 0.52, 0.2);
  const m = [0.9, 0, 0, 0];
  const huts = [];
  let tries = 0;
  while (huts.length < Vg.count && tries++ < 400) {
    const x = Vg.x0 + (Vg.x1 - Vg.x0) * rng(), z = Vg.z0 + (Vg.z1 - Vg.z0) * rng();
    if (huts.some((h) => Math.hypot(h.x - x, h.z - z) < 7.5)) continue;
    huts.push({ x, z });
  }
  let lit = 0;
  huts.forEach((h, i) => {
    const w = 5.5 + 2.0 * rng(), d = 3.8 + 0.8 * rng();
    const yaw = 0.35 + (rng() - 0.5) * 0.7;
    const gy = Math.min(world.heightAt(h.x - 2, h.z), world.heightAt(h.x + 2, h.z), world.heightAt(h.x, h.z)) - 0.15;
    const M = mat4(h.x, gy, h.z, 0, yaw, 0);
    far.add(box(w, 2.5, d), mul(M, mat4(0, 1.1, 0)), white.clone().multiplyScalar(0.9 + 0.15 * rng()), m);
    hipRoof(far, M, w / 2 + 0.75, d / 2 + 0.75, 2.15, 4.3 + 0.6 * rng(), roof.clone().multiplyScalar(0.8 + 0.4 * rng()));
    far.add(box(0.45, 1.2, 0.45), mul(M, mat4(w * 0.15, 4.2, -0.3)), white, m);
    const isLit = i % 3 !== 1 && lit < 5;
    const nWin = 2 + (rng() < 0.4 ? 1 : 0);
    for (let k = 0; k < nWin; k++) {
      const x = (k - (nWin - 1) / 2) * w * 0.3 + (k === 0 ? -0.4 : 0);
      const g = new THREE.PlaneGeometry(0.55, 0.62);
      const on = isLit && (k === 0 || rng() < 0.35);
      if (on) lit++;
      far.add(g, mul(M, mat4(x, 1.3, d / 2 + 0.02)), on ? warm : glass, on ? [0.5, 0, 6.5 + 2 * rng(), 0.2 + rng()] : [0.3, 0, 0, 0]);
    }
    if (rng() < 0.6) {
      // Haystack nearby.
      const a = rng() * 6.28, r = 5 + 2 * rng();
      const sx = h.x + Math.cos(a) * r, sz = h.z + Math.sin(a) * r;
      const sg = world.heightAt(sx, sz);
      far.add(lathe([[0.001, -0.2], [1.5, -0.2], [1.45, 1.0], [1.0, 2.0], [0.4, 2.6], [0.001, 2.8]], 8), mat4(sx, sg, sz), srgb(0.3, 0.27, 0.22), m);
    }
  });
  // One distant well sweep.
  if (huts.length > 2) {
    const h = huts[2];
    const x = h.x + 5.5, z = h.z + 3.0, gy = world.heightAt(x, z);
    const c = srgb(0.2, 0.18, 0.16);
    far.add(pole(V(x, gy - 0.3, z), V(x, gy + 4.0, z), 0.14, 0.11, 4), undefined, c, m);
    far.add(pole(V(x - 2.0, gy + 2.6, z - 0.4), V(x + 4.6, gy + 7.6, z + 0.9), 0.1, 0.07, 4), undefined, c, m);
    far.add(pole(V(x + 4.6, gy + 7.6, z + 0.9), V(x + 4.6, gy + 1.4, z + 0.9), 0.05, 0.05, 4), undefined, c, m);
  }
  return { huts: huts.length, lit };
}
