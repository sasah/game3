// Yard pieces: wattle fence (плетень) with woven withies and clay pots on the stakes, a stile at
// the gap, the well sweep (журавель), the pier (кладка), a bench, woodpile with chopping block,
// haystacks (копиці) and an old cart (віз). Geometry goes into the builders passed in:
// props (uber, layer 0, casts shadows), detail (uber double-sided, fine stuff), thatch (straw).
import * as THREE from 'three';
import { fbm2, smoothstep, clamp } from './noise.js';
import { box, tube, pole, lathe, srgb, mat4 } from './architecture-geo.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const endGrain = srgb(1.25, 1.15, 1.0);

// Clay pots: lathe profiles (r, y) with the mouth at the top, closed with an inner wall.
const POTS = {
  jug: { h: 0.3, p: [[0.001, 0], [0.052, 0], [0.064, 0.012], [0.09, 0.06], [0.106, 0.12], [0.1, 0.172], [0.08, 0.212], [0.056, 0.236], [0.045, 0.256], [0.047, 0.284], [0.056, 0.3], [0.05, 0.302], [0.04, 0.29], [0.036, 0.26], [0.001, 0.25]] },
  makitra: { h: 0.23, p: [[0.001, 0], [0.085, 0], [0.098, 0.012], [0.145, 0.07], [0.185, 0.15], [0.2, 0.2], [0.212, 0.222], [0.206, 0.23], [0.19, 0.222], [0.176, 0.17], [0.136, 0.09], [0.08, 0.03], [0.001, 0.025]] },
  pot: { h: 0.21, p: [[0.001, 0], [0.058, 0], [0.082, 0.035], [0.1, 0.095], [0.097, 0.148], [0.08, 0.18], [0.084, 0.205], [0.078, 0.212], [0.07, 0.2], [0.066, 0.17], [0.001, 0.16]] },
};
const POT_STYLES = [
  { c: srgb(0.64, 0.39, 0.26), m: [0.78, 0, 0, 0] },
  { c: srgb(0.36, 0.23, 0.14), m: [0.2, 0, 0, 0] },
  { c: srgb(0.29, 0.31, 0.24), m: [0.24, 0, 0, 0] },
  { c: srgb(0.58, 0.5, 0.4), m: [0.5, 0, 0, 0] },
];

export function addPot(detail, kind, style, x, y, z, yaw, upside, segs, tilt = 0) {
  const P = POTS[kind];
  const g = lathe(P.p, segs);
  const m = upside ? mat4(x, y + P.h, z, Math.PI + tilt, yaw, 0) : mat4(x, y, z, tilt, yaw, 0);
  const base = style.c;
  const band = style === POT_STYLES[3] ? srgb(0.42, 0.24, 0.16) : null;
  detail.add(g, m, (p, c) => {
    const hh = upside ? (y + P.h - p.y) / P.h : (p.y - y) / P.h;
    c.copy(base).multiplyScalar(0.8 + 0.25 * smoothstep(0, 0.7, hh));
    if (band && hh > 0.58 && hh < 0.68) c.copy(band);
  }, style.m);
}

// ---------------------------------------------------------------------------------------------
export function buildFence(ctx, props, detail, q, rng) {
  const { world } = ctx;
  const lines = [];
  let cur = [];
  for (const p of world.LAYOUT.fence) {
    if (p === null) { if (cur.length > 1) lines.push(cur); cur = []; } else cur.push(p);
  }
  if (cur.length > 1) lines.push(cur);

  const stakeCol = srgb(0.4, 0.36, 0.31);
  const rodCols = [srgb(0.42, 0.34, 0.27), srgb(0.5, 0.46, 0.4), srgb(0.34, 0.28, 0.22), srgb(0.46, 0.4, 0.31), srgb(0.38, 0.35, 0.31)];
  const nRods = q.low ? 10 : 15;
  const rod0 = 0.14, rodTop = 0.93;
  const dy = (rodTop - rod0) / (nRods - 1);
  const hr = dy * 0.5;
  const A = 0.05;
  const placed = [];
  const potStakes = [];
  const up = V(0, 1, 0);

  lines.forEach((line, li) => {
    const stakes = [];
    let sAcc = 0;
    for (let e = 0; e < line.length - 1; e++) {
      const [x0, z0] = line[e], [x1, z1] = line[e + 1];
      const Le = Math.hypot(x1 - x0, z1 - z0);
      const n = Math.max(1, Math.round(Le / 0.5));
      for (let i = 0; i < n; i++) {
        const t = (i + (i > 0 ? (rng() - 0.5) * 0.3 : 0)) / n;
        stakes.push({ x: x0 + (x1 - x0) * t, z: z0 + (z1 - z0) * t, s: sAcc + Le * t, corner: i === 0 });
      }
      sAcc += Le;
      world.addBoxCollider((x0 + x1) / 2, (z0 + z1) / 2, Le / 2 + 0.06, 0.16, Math.atan2(-(z1 - z0), x1 - x0));
    }
    const last = line[line.length - 1];
    stakes.push({ x: last[0], z: last[1], s: sAcc, corner: true });
    const gapEnd = (st) => li === 0 ? st.s > sAcc - 0.05 : st.s < 0.05; // stakes flanking the stile

    for (const st of stakes) {
      st.gy = world.heightAt(st.x, st.z);
      st.post = gapEnd(st);
      st.h = st.post ? 1.4 : 1.0 + 0.18 * rng() + 0.06 * fbm2(st.s * 0.3, 2.0 + li) + (st.corner ? 0.08 : 0);
      st.lx = (rng() - 0.5) * 0.05 + 0.035 * fbm2(st.s * 0.15, 5.0 + li);
      st.lz = (rng() - 0.5) * 0.05 + 0.03 * fbm2(st.s * 0.13, 9.0 + li);
      st.r = st.post ? 0.065 : 0.03 + 0.014 * rng() + (st.corner ? 0.012 : 0);
      st.at = (y) => V(st.x + st.lx * y, st.gy + y, st.z + st.lz * y);
      if (placed.some((o) => Math.hypot(o.x - st.x, o.z - st.z) < 0.1)) continue;
      placed.push(st);
      const mid = st.at(st.h * 0.5);
      mid.x += (rng() - 0.5) * 0.03; mid.z += (rng() - 0.5) * 0.03;
      const tip = st.at(st.h);
      props.add(tube([st.at(-0.3), mid, tip], [st.r * 1.05, st.r, st.r * 0.8], q.low ? 5 : 6, { rough: 0.12, seed: rng() * 20, cap1: true, capColor: endGrain }), undefined, stakeCol.clone().multiplyScalar(0.85 + 0.3 * rng()), [0.85, 0.8, 0, 0]);
      if (!st.post && !st.corner) potStakes.push({ st, li, tip });
    }

    // Woven withies: each rod alternates sides of consecutive stakes; neighbours in opposite phase.
    const perGap = q.low ? 3 : 4;
    for (let k = 0; k < nRods; k++) {
      const partial = k >= nRods - 2 ? (k === nRods - 1 ? 0.25 : -0.05) : null;
      let run = null;
      const flush = () => {
        if (run && run.pts.length > 1) emitRibbon(detail, run, hr, up);
        run = null;
      };
      for (let i = 0; i < stakes.length - 1; i++) {
        const a = stakes[i], b = stakes[i + 1];
        const dx = b.x - a.x, dz = b.z - a.z, dl = Math.hypot(dx, dz);
        if (dl < 0.05) continue;
        const perp = V(-dz / dl, 0, dx / dl);
        const sgn = (i + k) % 2 ? 1 : -1;
        for (let m = 0; m < perGap; m++) {
          const t = m / perGap;
          const s = a.s + (b.s - a.s) * t;
          if (partial !== null && fbm2(s * 0.55 + k * 3.1, 7.7) < partial) { flush(); continue; }
          const sag = 0.035 * fbm2(s * 0.32, 1.3 + k * 0.05, 2) - 0.025 * Math.sin(Math.PI * ((s / 2.7) % 1));
          const y = rod0 + k * dy + sag + (rng() - 0.5) * 0.006;
          const p = a.at(y).lerp(b.at(y), t).addScaledVector(perp, A * Math.cos(Math.PI * t) * sgn);
          if (!run) {
            const segId = Math.floor(s / 2.4 + k * 0.37);
            const cc = rodCols[(segId * 7 + k * 3) % rodCols.length].clone().multiplyScalar(0.85 + 0.3 * rng());
            run = { pts: [], perps: [], s: [], col: cc };
          }
          run.pts.push(p); run.perps.push(perp); run.s.push(s);
        }
      }
      // Final point at the last stake.
      const lst = stakes[stakes.length - 1], prv = stakes[stakes.length - 2];
      if (run && prv) {
        const dx = lst.x - prv.x, dz = lst.z - prv.z, dl = Math.hypot(dx, dz) || 1;
        const perp = V(-dz / dl, 0, dx / dl);
        const sgn = (stakes.length - 2 + k) % 2 ? 1 : -1;
        const y = rod0 + k * dy;
        run.pts.push(lst.at(y).addScaledVector(perp, -A * sgn));
        run.perps.push(perp); run.s.push(lst.s);
      }
      flush();
    }

    // Stile (перелаз) at the gap: low rail between the tall posts and two step stumps.
    if (li === 0) {
      const a = stakes[stakes.length - 1];
      const other = lines[1] ? lines[1][0] : null;
      if (other) {
        const bx = other[0], bz = other[1], gyB = world.heightAt(bx, bz);
        props.add(pole(V(a.x, a.gy + 0.4, a.z), V(bx, gyB + 0.42, bz), 0.06, 0.055, 7, { bow: -0.03, rough: 0.1, seed: 4, cap0: true, cap1: true, capColor: endGrain }), undefined, stakeCol.clone().multiplyScalar(1.05), [0.85, 0.85, 0, 0]);
        const mx = (a.x + bx) / 2, mz = (a.z + bz) / 2;
        for (const side of [-1, 1]) {
          const sx = mx + 0.25 * (rng() - 0.5), sz = mz + side * 0.42;
          const gy = world.heightAt(sx, sz);
          props.add(tube([V(sx, gy - 0.1, sz), V(sx, gy + 0.2, sz)], [0.15, 0.14], 9, { rough: 0.12, seed: 9 + side, cap1: true, capColor: endGrain }), undefined, srgb(0.4, 0.35, 0.3), [0.85, 0.9, 0, 0]);
        }
      }
    }
  });

  // Pots on stakes: mostly near the entrance and the east corner (seen from the path).
  let lastPick = -10, n = 0;
  potStakes.forEach((ps, i) => {
    const { st, li, tip } = ps;
    const near = li === 1 ? st.s < 13 : st.s > 4.5;
    const far = li === 1 && st.s > 30 && st.s < 36;
    if (!(near || far) || i - lastPick < 2 || rng() > (near ? 0.55 : 0.4)) return;
    lastPick = i;
    const kinds = ['jug', 'jug', 'makitra', 'pot'];
    const kind = kinds[(n + Math.floor(rng() * 3)) % kinds.length];
    const style = POT_STYLES[Math.floor(rng() * POT_STYLES.length)];
    addPot(detail, kind, style, tip.x, tip.y - 0.05, tip.z, rng() * 6.28, true, q.low ? 10 : 16, (rng() - 0.5) * 0.15);
    n++;
  });
  return { pots: n };
}

function emitRibbon(detail, run, hr, up) {
  const pos = [], nrm = [], uv = [], idx = [];
  const nT = new THREE.Vector3(), nB = new THREE.Vector3();
  const N = run.pts.length;
  for (let m = 0; m < N; m++) {
    const p = run.pts[m], n = run.perps[m];
    nT.copy(n).multiplyScalar(0.75).addScaledVector(up, 0.66).normalize();
    nB.copy(n).multiplyScalar(0.75).addScaledVector(up, -0.66).normalize();
    const h = hr * (0.85 + 0.15 * Math.sin(m * 1.7 + run.s[m]));
    pos.push(p.x, p.y - h, p.z, p.x, p.y + h, p.z);
    nrm.push(nB.x, nB.y, nB.z, nT.x, nT.y, nT.z);
    uv.push(0, run.s[m], 0.08, run.s[m]);
  }
  for (let m = 0; m < N - 1; m++) {
    const a = 2 * m, b = a + 2, c = a + 1, d = b + 1;
    idx.push(a, b, c, b, d, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  detail.add(g, undefined, run.col, [0.72, 0.6, 0, 0]);
}

// ---------------------------------------------------------------------------------------------
export function buildWell(ctx, props, q, rng) {
  const { world } = ctx;
  const W = world.LAYOUT.well;
  const gy = world.heightAt(W.x, W.z);
  const logCol = srgb(0.38, 0.33, 0.28);
  const sides = q.low ? 6 : 8;
  // Log crib (зруб).
  let topY = gy;
  for (let c = 0; c < 5; c++) {
    const y = gy - 0.03 + 0.085 + c * 0.155;
    for (const s of [-1, 1]) {
      const L = 0.62 + 0.03 * rng();
      const r = 0.082 + 0.012 * rng();
      const a = c % 2 ? V(W.x + s * 0.46, y, W.z - L) : V(W.x - L, y, W.z + s * 0.46);
      const b = c % 2 ? V(W.x + s * 0.46, y, W.z + L) : V(W.x + L, y, W.z + s * 0.46);
      props.add(pole(a, b, r, r * 0.92, sides, { bow: 0.012, rough: 0.07, seed: rng() * 30, cap0: true, cap1: true, capColor: endGrain, bowDir: V(0, 1, 0) }), undefined, logCol.clone().multiplyScalar(0.85 + 0.3 * rng()), [0.85, 0.85, 0, 0]);
    }
    topY = y + 0.085;
  }
  // Dark shaft and a half lid.
  const shaft = new THREE.PlaneGeometry(0.85, 0.85).rotateX(-Math.PI / 2);
  props.add(shaft, mat4(W.x, gy + 0.2, W.z), srgb(0.01, 0.012, 0.014), [0.3, 0, 0, 0]);
  for (let i = 0; i < 3; i++) {
    props.add(box(1.05, 0.035, 0.2, rng()), mat4(W.x + 0.02 * (rng() - 0.5), topY + 0.018, W.z - 0.38 + i * 0.205, 0, (rng() - 0.5) * 0.05, 0), logCol.clone().multiplyScalar(0.95 + 0.2 * rng()), [0.85, 0.9, 0, 0]);
  }
  world.addCircleCollider(W.x, W.z, 0.85);

  // Trough (корито): hollowed log beside the well.
  const tr = { x: W.x + 0.55, z: W.z + 1.25, yaw: 0.35 };
  const tgy = world.heightAt(tr.x, tr.z);
  props.add(box(1.4, 0.24, 0.38, rng()), mat4(tr.x, tgy + 0.1, tr.z, 0, tr.yaw, 0), logCol, [0.85, 0.9, 0, 0]);
  props.add(new THREE.PlaneGeometry(1.25, 0.24).rotateX(-Math.PI / 2), mat4(tr.x, tgy + 0.225, tr.z, 0, tr.yaw, 0), srgb(0.03, 0.04, 0.05), [0.08, 0, 0, 0]);
  world.addBoxCollider(tr.x, tr.z, 0.75, 0.25, tr.yaw);

  // Forked post and sweep pole.
  const Pp = { x: -12.15, z: -26.85 };
  const pgy = world.heightAt(Pp.x, Pp.z);
  const D = V(W.x - Pp.x, 0, W.z - Pp.z);
  const dist = D.length();
  D.normalize();
  const side = V(-D.z, 0, D.x);
  const postCol = srgb(0.34, 0.3, 0.26);
  props.add(tube([V(Pp.x, pgy - 0.4, Pp.z), V(Pp.x + 0.03, pgy + 1.8, Pp.z - 0.02), V(Pp.x, pgy + 3.6, Pp.z)], [0.14, 0.12, 0.1], sides, { rough: 0.1, seed: 2 }), undefined, postCol, [0.85, 0.85, 0, 0]);
  for (const s of [-1, 1]) {
    const a = V(Pp.x, pgy + 3.5, Pp.z), b = V(Pp.x, pgy + 4.08, Pp.z).addScaledVector(side, s * 0.16);
    props.add(pole(a, b, 0.07, 0.05, 6, { bow: 0.02, seed: 5 + s, cap1: true, capColor: endGrain }), undefined, postCol, [0.85, 0.85, 0, 0]);
  }
  const P = V(Pp.x, pgy + 3.9, Pp.z);
  const alpha = 0.6;
  const dir3 = V(D.x * Math.cos(alpha), Math.sin(alpha), D.z * Math.cos(alpha));
  const L1 = (dist - 0.04) / Math.cos(alpha);
  const tip = P.clone().addScaledVector(dir3, L1);
  const tail = P.clone().addScaledVector(dir3, -2.6);
  props.add(pole(tail, tip, 0.085, 0.04, sides, { segs: 6, bow: 0.1, bowDir: V(0, -1, 0), rough: 0.06, seed: 8, cap0: true, cap1: true, capColor: endGrain }), undefined, srgb(0.4, 0.36, 0.31), [0.8, 0.85, 0, 0]);
  props.add(pole(P.clone().addScaledVector(side, -0.24), P.clone().addScaledVector(side, 0.24), 0.022, 0.022, 5), undefined, srgb(0.3, 0.27, 0.24), [0.8, 0.7, 0, 0]);
  // Counterweight: a lashed log hanging under the short end.
  const cw = tail.clone().add(V(0, -0.4, 0));
  props.add(pole(tail.clone().add(V(0, -0.05, 0)), cw.clone().add(V(0, 0.12, 0)), 0.012, 0.012, 4), undefined, srgb(0.25, 0.22, 0.18), [0.9, 0, 0, 0]);
  props.add(pole(cw.clone().addScaledVector(side, -0.34), cw.clone().addScaledVector(side, 0.34), 0.15, 0.14, sides, { rough: 0.1, seed: 12, cap0: true, cap1: true, capColor: endGrain }), undefined, srgb(0.33, 0.29, 0.25), [0.85, 0.9, 0, 0]);
  // Hanging pole (очеп) and the bucket.
  const bucketY = gy + 0.98;
  props.add(pole(tip.clone().add(V(0, 0.03, 0)), V(tip.x, bucketY + 0.34, tip.z), 0.024, 0.02, 5, { segs: 4, bow: 0.03, seed: 13 }), undefined, srgb(0.42, 0.38, 0.33), [0.8, 0.85, 0, 0]);
  const bucket = lathe([[0.001, 0], [0.115, 0], [0.12, 0.01], [0.15, 0.3], [0.142, 0.306], [0.13, 0.29], [0.1, 0.03], [0.001, 0.03]], q.low ? 10 : 14);
  const bc = srgb(0.4, 0.34, 0.27), hoop = srgb(0.08, 0.08, 0.08);
  props.add(bucket, mat4(tip.x, bucketY, tip.z, 0.05, 0.3, 0), (p, c) => {
    const h = p.y - bucketY;
    c.copy((h > 0.05 && h < 0.075) || (h > 0.235 && h < 0.26) ? hoop : bc);
  }, [0.8, 0, 0, 0]);
  props.add(pole(V(tip.x - 0.15, bucketY + 0.3, tip.z), V(tip.x + 0.15, bucketY + 0.3, tip.z), 0.008, 0.008, 4, { bow: 0.12, bowDir: V(0, 1, 0), segs: 5 }), undefined, hoop, [0.6, 0, 0, 0]);
  world.addCircleCollider(Pp.x, Pp.z, 0.3);
  return { tip };
}

// ---------------------------------------------------------------------------------------------
export function buildPier(ctx, props, q, rng) {
  const { world } = ctx;
  const pr = world.LAYOUT.pier;
  const deck = pr.deckY;
  const plankCol = srgb(0.46, 0.44, 0.4);
  const wet = srgb(0.2, 0.2, 0.19);
  const postCol = srgb(0.3, 0.28, 0.25);
  // Posts in pairs, the last pair standing up as mooring posts.
  const postZ = [pr.z0 - 0.25, pr.z0 - 1.6, pr.z0 - 2.95, pr.z0 - 4.3, pr.z1 + 0.12];
  postZ.forEach((z, i) => {
    for (const s of [-1, 1]) {
      const x = pr.x + s * (pr.width / 2 - 0.08) + (rng() - 0.5) * 0.04;
      const tall = i === postZ.length - 1;
      const topY = tall ? deck + 0.45 + 0.3 * rng() : deck - 0.06;
      const lx = (rng() - 0.5) * 0.12, lz = (rng() - 0.5) * 0.1;
      const r = 0.07 + 0.02 * rng();
      const pts = [V(x - lx, -1.6, z - lz), V(x + lx * 0.3 + (rng() - 0.5) * 0.03, 0.1, z), V(x + lx, topY, z + lz)];
      if (tall) pts.push(V(x + lx * 1.1 + 0.02, topY + 0.06, z + lz * 1.1));
      const radii = tall ? [r * 1.05, r, r * 0.9, r * 0.45] : [r * 1.05, r, r * 0.9];
      props.add(tube(pts, radii, 7, { rough: 0.22, seed: i * 2 + s, cap1: true, capColor: srgb(0.8, 0.75, 0.68) }), undefined, (p, c) => c.copy(p.y < 0.15 ? wet : postCol).multiplyScalar(0.85 + 0.15 * Math.sin(p.y * 9 + x * 5)), [0.88, 1.0, 0, 0]);
      if (i === postZ.length - 1) world.addCircleCollider(x, z, 0.12);
    }
  });
  // Stringers.
  for (const s of [-1, 1]) {
    const x = pr.x + s * (pr.width / 2 - 0.16);
    props.add(box(0.1, 0.12, pr.z0 - pr.z1 + 0.1, rng()), mat4(x, deck - 0.045 - 0.06, (pr.z0 + pr.z1) / 2), plankCol.clone().multiplyScalar(0.7), [0.85, 0.9, 0, 0]);
  }
  // Planks across, uneven, one missing and one broken.
  let z = pr.z0 + 0.05;
  let idx = 0;
  while (z > pr.z1 + 0.05) {
    const w = 0.17 + 0.09 * rng();
    const zc = z - w / 2;
    z -= w + 0.012 + 0.025 * rng();
    idx++;
    if (idx === 13) continue; // missing plank
    const broken = idx === 18;
    const len = broken ? 0.62 : pr.width + (rng() - 0.3) * 0.16;
    const xo = broken ? -0.28 : (rng() - 0.5) * 0.08;
    const th = 0.045;
    const y = deck - th / 2 + (rng() - 0.5) * 0.018;
    const m = mat4(pr.x + xo, y, zc, (rng() - 0.5) * 0.03, (rng() - 0.5) * 0.05, broken ? 0.06 : (rng() - 0.5) * 0.03);
    const cx = pr.x + xo;
    const c = plankCol.clone().multiplyScalar(0.8 + 0.3 * rng());
    props.add(box(len, th, w, rng() * 3, [3, 1, 1]), m, c, [0.82, 0.95, 0, 0], (v) => { v.y -= 0.012 * (1 - ((v.x - cx) / 0.65) ** 2); });
  }
}

// ---------------------------------------------------------------------------------------------
export function buildProps(ctx, props, detail, thatch, hutM, q, rng) {
  const { world } = ctx;
  const H = world.LAYOUT.hut;
  const wood = srgb(0.4, 0.35, 0.29);
  const local = (x, y, z, rx = 0, ry = 0, rz = 0) => new THREE.Matrix4().multiplyMatrices(hutM, mat4(x, y, z, rx, ry, rz));
  const toWorld = (x, z) => V(x, 0, z).applyMatrix4(hutM);

  // Bench (лава) under the front cherry, parallel to the hut.
  {
    const bx = 1.05, bz = -21.7, yaw = H.rotY + 0.06;
    const gy = world.heightAt(bx, bz);
    const m = mat4(bx, gy + 0.45, bz, 0, yaw, 0);
    props.add(box(1.9, 0.055, 0.32, rng()), m, wood, [0.8, 0.95, 0, 0]);
    const c = Math.cos(yaw), s = Math.sin(yaw);
    for (const [lx, lz] of [[-0.75, -0.1], [-0.75, 0.1], [0.75, -0.1], [0.75, 0.1]]) {
      const wx = bx + lx * c + lz * s, wz = bz - lx * s + lz * c;
      const fx = bx + lx * 1.2 * c + lz * 1.8 * s, fz = bz - lx * 1.2 * s + lz * 1.8 * c;
      props.add(pole(V(wx, gy + 0.46, wz), V(fx, gy - 0.05, fz), 0.03, 0.028, 5, { seed: lx + lz }), undefined, wood.clone().multiplyScalar(0.85), [0.85, 0.8, 0, 0]);
    }
    world.addBoxCollider(bx, bz, 1.0, 0.3, yaw);
    addPot(detail, 'jug', POT_STYLES[1], bx + 0.62 * c, gy + 0.475, bz - 0.62 * s, 1.0, false, q.low ? 10 : 16);
  }

  // Pots by the door on the призьба / ground.
  {
    const p1 = toWorld(-0.62, 2.69);
    addPot(detail, 'pot', POT_STYLES[3], p1.x, world.YARD_Y + 0.485, p1.z, 0.4, false, q.low ? 10 : 16);
    const p2 = toWorld(1.45, 3.2);
    addPot(detail, 'makitra', POT_STYLES[0], p2.x, world.heightAt(p2.x, p2.z) - 0.01, p2.z, 2.0, true, q.low ? 10 : 16, 0.05);
  }

  // Woodpile against the east wall (split logs, light end grain toward the yard) + posts.
  {
    const rows = q.low ? 6 : 7;
    for (let r = 0; r < rows; r++) {
      const nIn = r === rows - 1 ? 7 : 11;
      for (let i = 0; i < nIn; i++) {
        const zz = -2.1 + (1.6 / 10) * (i + (r === rows - 1 ? 2 : 0)) + (r % 2) * 0.07 + (rng() - 0.5) * 0.03;
        const yy = 0.07 + r * 0.13 + (rng() - 0.5) * 0.02;
        const len = 0.45 + 0.1 * rng();
        const x0 = 4.98 + (rng() - 0.5) * 0.05;
        const sides = rng() < 0.5 ? 3 : 4;
        const a = V(x0, yy, zz).applyMatrix4(hutM), b = V(x0 + len, yy + (rng() - 0.5) * 0.03, zz + (rng() - 0.5) * 0.04).applyMatrix4(hutM);
        props.add(pole(a, b, 0.075, 0.07, sides, { segs: 1, rough: 0.15, seed: rng() * 50, cap0: true, cap1: true, capColor: srgb(1.5, 1.3, 1.05) }), undefined, srgb(0.36, 0.31, 0.26).multiplyScalar(0.8 + 0.4 * rng()), [0.85, 0.9, 0, 0]);
      }
    }
    for (const zz of [-2.28, -0.4]) {
      const a = V(5.2, -0.2, zz).applyMatrix4(hutM), b = V(5.22, 1.05, zz).applyMatrix4(hutM);
      props.add(pole(a, b, 0.04, 0.035, 5, { cap1: true, capColor: endGrain }), undefined, wood, [0.85, 0.85, 0, 0]);
    }
    const c = toWorld(5.25, -1.25);
    world.addBoxCollider(c.x, c.z, 0.45, 1.05, H.rotY);
    // Chopping block with an axe.
    const cb = toWorld(6.15, -1.0);
    const gy = world.heightAt(cb.x, cb.z);
    props.add(tube([V(cb.x, gy - 0.05, cb.z), V(cb.x, gy + 0.44, cb.z)], [0.21, 0.2], 10, { rough: 0.1, seed: 31, cap1: true, capColor: srgb(1.4, 1.25, 1.05) }), undefined, srgb(0.35, 0.3, 0.25), [0.85, 0.9, 0, 0]);
    const ah = V(cb.x + 0.05, gy + 0.45, cb.z + 0.02);
    props.add(pole(ah, ah.clone().add(V(0.42, 0.42, 0.16)), 0.018, 0.016, 5), undefined, srgb(0.5, 0.42, 0.32), [0.6, 0.8, 0, 0]);
    props.add(box(0.16, 0.1, 0.03, 0), mat4(ah.x - 0.02, ah.y + 0.02, ah.z, 0, -0.36, -0.75), srgb(0.12, 0.12, 0.13), [0.45, 0, 0, 0]);
    world.addCircleCollider(cb.x, cb.z, 0.32);
  }

  // Haystacks (копиці) behind the hut.
  const stacks = [{ x: -10.5, z: -29.6, r: 1.45, h: 2.75 }, { x: -7.7, z: -30.85, r: 1.05, h: 2.0 }];
  for (const st of stacks) {
    const gy = world.heightAt(st.x, st.z);
    const prof = [[0.001, -0.15], [st.r * 0.97, -0.15], [st.r * 1.03, 0.25], [st.r, st.h * 0.42], [st.r * 0.85, st.h * 0.62], [st.r * 0.58, st.h * 0.8], [st.r * 0.28, st.h * 0.93], [0.001, st.h]];
    const g = lathe(prof, q.low ? 12 : 18);
    const P = g.attributes.position, U = g.attributes.uv;
    for (let i = 0; i < P.count; i++) {
      const x = P.getX(i), y = P.getY(i), z = P.getZ(i);
      const rr = Math.hypot(x, z);
      const k = 1 + 0.07 * fbm2(x * 1.3 + st.x, z * 1.3 + y * 0.9, 2);
      P.setXYZ(i, x * k, y + (rr > 0.01 ? 0.04 * fbm2(x * 2.0, z * 2.0, 2) : 0), z * k);
      U.setXY(i, U.getX(i) * st.r * 6.28, y * 1.1);
    }
    g.computeVertexNormals();
    thatch.add(g, mat4(st.x, gy, st.z, 0, rng() * 6, 0), srgb(1.05, 1.02, 0.95));
    props.add(pole(V(st.x, gy + st.h - 0.5, st.z), V(st.x + 0.05, gy + st.h + 0.55, st.z + 0.03), 0.03, 0.022, 5, { cap1: true }), undefined, wood, [0.85, 0.85, 0, 0]);
    world.addCircleCollider(st.x, st.z, st.r + 0.15);
  }

  // Old cart (віз) by the east side of the yard.
  buildCart(ctx, props, q, rng, { x: 3.25, z: -28.4, yaw: 0.12 });
}

function buildCart(ctx, props, q, rng, at) {
  const { world } = ctx;
  const gy = world.heightAt(at.x, at.z);
  const M = mat4(at.x, gy, at.z, 0, at.yaw, 0);
  const wood = srgb(0.36, 0.31, 0.26);
  const L = (x, y, z) => V(x, y, z).applyMatrix4(M);
  const mm = (x, y, z, rx = 0, ry = 0, rz = 0) => new THREE.Matrix4().multiplyMatrices(M, mat4(x, y, z, rx, ry, rz));
  const sides = q.low ? 4 : 6;
  // Wheels.
  for (const [wz, R] of [[-1.05, 0.5], [1.0, 0.42]]) {
    for (const s of [-1, 1]) {
      const cx = s * 0.72;
      const rim = new THREE.TorusGeometry(R, 0.035, 4, q.low ? 14 : 22);
      props.add(rim, mm(cx, R, wz, 0, Math.PI / 2, 0), wood.clone().multiplyScalar(0.8), [0.85, 0.7, 0, 0]);
      const nSp = 8;
      for (let k = 0; k < nSp; k++) {
        const a = (k / nSp) * Math.PI * 2 + rng() * 0.1;
        const p0 = L(cx, R, wz), p1 = L(cx, R + Math.sin(a) * (R - 0.03), wz + Math.cos(a) * (R - 0.03));
        props.add(pole(p0, p1, 0.02, 0.016, 4, { segs: 1 }), undefined, wood, [0.85, 0.8, 0, 0]);
      }
      props.add(pole(L(cx - 0.14 * s, R, wz), L(cx + 0.1 * s, R, wz), 0.075, 0.06, sides, { segs: 1, cap0: true, cap1: true }), undefined, wood.clone().multiplyScalar(0.7), [0.8, 0.6, 0, 0]);
    }
    props.add(pole(L(-0.85, R, wz), L(0.85, R, wz), 0.045, 0.045, sides, { segs: 2 }), undefined, wood.clone().multiplyScalar(0.6), [0.85, 0.6, 0, 0]);
  }
  // Bed and splayed ladder sides (драбини).
  const yb = 0.62;
  props.add(box(0.9, 0.04, 2.9, rng()), mm(0, yb, 0, 0.02, 0, 0), wood, [0.85, 0.95, 0, 0]);
  for (const s of [-1, 1]) {
    props.add(pole(L(s * 0.48, yb + 0.03, -1.6), L(s * 0.5, yb + 0.03, 1.55), 0.035, 0.035, 5, { segs: 2, cap0: true, cap1: true }), undefined, wood, [0.85, 0.9, 0, 0]);
    props.add(pole(L(s * 0.78, yb + 0.62, -1.75), L(s * 0.8, yb + 0.6, 1.7), 0.035, 0.032, 5, { segs: 3, bow: 0.02, cap0: true, cap1: true }), undefined, wood, [0.85, 0.9, 0, 0]);
    for (let k = 0; k < 9; k++) {
      const z = -1.45 + k * 0.36;
      props.add(pole(L(s * 0.49, yb + 0.03, z), L(s * 0.79, yb + 0.61, z + 0.02), 0.016, 0.015, 4, { segs: 1 }), undefined, wood.clone().multiplyScalar(0.9), [0.85, 0.8, 0, 0]);
    }
  }
  // Shaft (дишло) resting on the ground.
  props.add(pole(L(0, 0.5, 1.0), L(0.25, 0.06, 3.6), 0.05, 0.04, sides, { segs: 3, bow: 0.04, cap1: true }), undefined, wood, [0.85, 0.9, 0, 0]);
  world.addBoxCollider(at.x, at.z, 0.95, 1.85, at.yaw);
}
