// The white mazanka: hand-plastered walls on a rounded-rectangle footprint with gentle bulges,
// inward lean and real window/door openings (soft chamfered reveals), the clay plinth bench
// (призьба), a thick hip thatch roof (rounded hips, belly, sagging ridge, shaggy eaves, ridge roll
// and crossed ridge poles), a whitewashed chimney, framed windows with mullions and painted
// shutters, a plank door, candlelit panes and a warm spill light.
// Everything is built in hut-local space (front = +z) and transformed by the hut matrix.
import * as THREE from 'three';
import { fbm2, smoothstep, clamp } from './noise.js';
import { box, tube, pole, roundedRect, strip, srgb, basis, mat4 } from './architecture-geo.js';
import { WALL_TEX_V } from './architecture-tex.js';

export const HUT = { a: 4.5, b: 2.5, r: 0.38, wallTop: 2.62, ov: 0.78, ridgeY: 5.5, eaveY: 2.48 };

// Outward displacement of the plastered wall surface (meters) at local (x, z), height y.
export function wallOff(x, z, y) {
  const bul = 0.026 * fbm2(x * 0.42 + 11.3, z * 0.42 + y * 0.55 - 4.1, 3) + 0.008 * fbm2(x * 1.9 + z * 1.3, y * 1.9, 2);
  const taper = -0.05 * clamp(y / 2.6, 0, 1);
  const foot = 0.035 * (1 - smoothstep(0.0, 0.4, y));
  return bul + taper + foot;
}

const WIN = { h0: 0.98, h1: 1.68 };
// side: outline segment (0 front, 2 east, 6 west); c: local x (front) or local z (sides).
export const OPENINGS = [
  { side: 0, c: -3.05, w: 0.64, ...WIN, kind: 'win', lit: 0.55 },
  { side: 0, c: -1.5, w: 0.64, ...WIN, kind: 'win', lit: 1.0, light: true },
  { side: 0, c: 0.5, w: 1.0, h0: 0.0, h1: 1.86, kind: 'door' },
  { side: 0, c: 2.65, w: 0.64, ...WIN, kind: 'win', lit: 0 },
  { side: 2, c: 0.95, w: 0.56, ...WIN, kind: 'win', lit: 0 },
  { side: 6, c: 0.35, w: 0.56, ...WIN, kind: 'win', lit: 0 },
];

function sOf(O, side, c) {
  const g = O.segs[side];
  const [x0, z0, dx, dz] = g.line;
  const px = side === 0 ? c : side === 2 ? O.a : -O.a;
  const pz = side === 0 ? O.b : c;
  return O.starts[side] + (px - x0) * dx + (pz - z0) * dz;
}

const tmp = { x: 0, z: 0, nx: 0, nz: 0, tx: 0, tz: 0 };

function wallTint(x, z, y, c) {
  const n = fbm2(x * 0.55 + 2.1, z * 0.55 + y * 0.8, 3);
  const k = (0.95 + 0.05 * n) * (1 - 0.1 * smoothstep(2.15, 2.62, y));
  c.setRGB(k, k * 0.997, k * 0.985);
}

// ---------------------------------------------------------------------------------------------
// Walls + reveals + призьба (+ chimney): wall material geometry pieces (local space).
export function buildWallPieces(q) {
  const O = roundedRect(HUT.a, HUT.b, HUT.r);
  const L = O.L;
  const S0 = O.starts[4] + O.Lf / 2; // seam in the middle of the back wall
  const norm = (s) => (s < S0 ? s + L : s);
  const tileN = Math.max(1, Math.round(L / 3.9));
  const tileU = L / tileN;
  const ops = OPENINGS.map((op) => {
    const sc = norm(sOf(O, op.side, op.c));
    return { ...op, sc, s0: sc - op.w / 2, s1: sc + op.w / 2 };
  });

  // Columns (arc length) with opening edges forced; rows (height) with sills/lintels forced.
  const ds = q.low ? 0.24 : 0.14;
  let cols = [{ s: S0, f: true }];
  for (let k = 0; k < 8; k++) {
    const g = O.segs[k];
    const n = g.arc ? (q.low ? 4 : 7) : Math.max(1, Math.ceil(g.L / ds));
    for (let i = 0; i < n; i++) cols.push({ s: norm(O.starts[k] + (g.L * i) / n), f: false });
  }
  for (const op of ops) cols.push({ s: op.s0, f: true }, { s: op.s1, f: true });
  cols.sort((p, r) => p.s - r.s);
  const kept = [];
  for (const c of cols) {
    const last = kept[kept.length - 1];
    if (!last || c.s - last.s > 0.035) kept.push(c);
    else if (c.f && !last.f) kept[kept.length - 1] = c;
  }
  const S = kept.map((c) => c.s);
  S.push(S0 + L);
  const Y = q.low
    ? [-0.3, 0, 0.45, 0.98, 1.68, 1.86, 2.25, HUT.wallTop]
    : [-0.3, 0, 0.2, 0.45, 0.72, 0.98, 1.22, 1.45, 1.68, 1.86, 2.08, 2.3, 2.47, HUT.wallTop];

  const wallPoint = (s, y, out) => {
    O.at(s, tmp);
    const off = wallOff(tmp.x, tmp.z, y);
    return out.set(tmp.x + tmp.nx * off, y, tmp.z + tmp.nz * off);
  };
  const uvOf = (s, y) => [(s - S0) / tileU, (y - WALL_TEX_V.y0) / WALL_TEX_V.h];

  // Wall grid.
  const nc = S.length, nr = Y.length;
  const pos = [], uv = [], col = [], idx = [];
  const v = new THREE.Vector3(), cc = new THREE.Color();
  for (let j = 0; j < nr; j++) {
    for (let i = 0; i < nc; i++) {
      wallPoint(S[i], Y[j], v);
      pos.push(v.x, v.y, v.z);
      uv.push(...uvOf(S[i], Y[j]));
      wallTint(v.x, v.z, v.y, cc);
      col.push(cc.r, cc.g, cc.b);
    }
  }
  const inOpening = (s, y) => ops.some((op) => s > op.s0 && s < op.s1 && y > op.h0 && y < op.h1);
  for (let j = 0; j < nr - 1; j++) {
    for (let i = 0; i < nc - 1; i++) {
      if (inOpening((S[i] + S[i + 1]) / 2, (Y[j] + Y[j + 1]) / 2)) continue;
      const A = j * nc + i, B = A + 1, C = A + nc, D = C + 1;
      idx.push(A, B, D, A, D, C);
    }
  }
  const wall = new THREE.BufferGeometry();
  wall.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  wall.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  wall.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  wall.setIndex(idx);
  wall.computeVertexNormals();
  const pieces = [wall];

  // Reveals: chamfered, plastered, darker toward the inside.
  const ins = 0.035, depth = 0.34;
  const revCol = (k, i, p, c) => { const s = [1, 0.96, 0.72][k]; wallTint(p.x, p.z, p.y, c); c.multiplyScalar(s); };
  for (const op of ops) {
    const ys = Y.filter((y) => y >= op.h0 - 1e-6 && y <= op.h1 + 1e-6);
    const ss = S.filter((s) => s >= op.s0 - 1e-6 && s <= op.s1 + 1e-6);
    const yLo = op.kind === 'door' ? op.h0 : op.h0 + ins;
    const yHi = op.h1 - ins;
    O.at(op.sc, tmp);
    const T = new THREE.Vector3(tmp.tx, 0, tmp.tz), N = new THREE.Vector3(tmp.nx, 0, tmp.nz);
    const base = (s) => { O.at(s, tmp); return new THREE.Vector3(tmp.x, 0, tmp.z); };
    const offAt = (s, y) => { O.at(s, tmp); return wallOff(tmp.x, tmp.z, y); };
    for (const [se, dir] of [[op.s0, 1], [op.s1, -1]]) {
      const b0 = base(se);
      const rows = [[], [], []];
      for (const y of ys) {
        const yc = clamp(y, yLo, yHi);
        rows[0].push(wallPoint(se, y, new THREE.Vector3()));
        rows[1].push(b0.clone().addScaledVector(T, dir * ins).addScaledVector(N, offAt(se, y) - ins).setY(yc));
        rows[2].push(b0.clone().addScaledVector(T, dir * ins).addScaledVector(N, -depth).setY(yc));
      }
      pieces.push(strip(rows, T.clone().multiplyScalar(dir), (k, i, p) => uvOf(se + dir * k * 0.06, p.y), revCol));
    }
    const edges = op.kind === 'door' ? [[op.h1, -1]] : [[op.h0, 1], [op.h1, -1]];
    for (const [ye, dir] of edges) {
      const rows = [[], [], []];
      for (const s of ss) {
        const sc = clamp(s, op.s0 + ins, op.s1 - ins);
        const bs = base(sc);
        rows[0].push(wallPoint(s, ye, new THREE.Vector3()));
        rows[1].push(bs.clone().addScaledVector(N, offAt(s, ye) - ins).setY(ye + dir * ins));
        rows[2].push(bs.clone().addScaledVector(N, -depth).setY(ye + dir * ins));
      }
      pieces.push(strip(rows, new THREE.Vector3(0, dir, 0), (k, i, p) => uvOf(ss[i], ye + dir * k * 0.05), revCol));
    }
  }

  // Призьба: clay bench around the base, interrupted at the door, darker ochre-brown clay.
  const door = ops.find((o) => o.kind === 'door');
  const pS0 = door.s1 + 0.03, pS1 = door.s0 + L - 0.03;
  const pCols = [pS0];
  for (const s of S) {
    const s2 = s < pS0 ? s + L : s;
    if (s2 > pS0 + 0.03 && s2 < pS1 - 0.03) pCols.push(s2);
  }
  pCols.push(pS1);
  pCols.sort((p, r) => p - r);
  const PR = [[null, 0.5], [0.07, 0.497], [0.16, 0.49], [0.24, 0.476], [0.3, 0.452], [0.34, 0.415], [0.358, 0.36], [0.366, 0.22], [0.375, 0.06], [0.39, -0.14]];
  const pRows = PR.map(() => []);
  const prPoint = (s, k, out) => {
    O.at(s, tmp);
    const [o0, y0] = PR[k];
    const w = 0.022 * fbm2(s * 0.9 + 3.3, 1.7, 2) * (k / (PR.length - 1));
    const lift = k <= 4 ? 0.014 * fbm2(s * 1.3 - 2.2, 4.1, 2) : 0;
    const o = o0 === null ? wallOff(tmp.x, tmp.z, 0.5) - 0.02 : o0 + w;
    return out.set(tmp.x + tmp.nx * o, y0 + lift, tmp.z + tmp.nz * o);
  };
  for (let k = 0; k < PR.length; k++) for (const s of pCols) pRows[k].push(prPoint(s, k, new THREE.Vector3()));
  const prCol = (k, i, p, c) => {
    const n = fbm2(p.x * 1.1 + 5.0, p.z * 1.1 + p.y * 2.0, 2);
    if (k <= 4) c.copy(srgb(0.86, 0.72, 0.56)).multiplyScalar(0.95 + 0.12 * n);
    else c.copy(srgb(0.76, 0.6, 0.45)).multiplyScalar((0.9 + 0.12 * n) * (k >= 8 ? 0.8 : 1));
  };
  pieces.push(strip(pRows, new THREE.Vector3(0, 1, 0), (k, i) => [((pCols[i] - S0) / tileU) * 0.37 + 0.31, 0.05 + k * 0.012], prCol));
  // End caps at the door.
  for (const [s, dir] of [[pS0, -1], [pS1, 1]]) {
    O.at(s, tmp);
    const T = new THREE.Vector3(tmp.tx, 0, tmp.tz).multiplyScalar(dir);
    const ring = PR.map((_, k) => prPoint(s, k, new THREE.Vector3()));
    const wb = prPoint(s, 0, new THREE.Vector3()).setY(-0.14);
    const p2 = [], i2 = [];
    for (const p of [wb, ...ring]) p2.push(p.x, p.y, p.z);
    for (let k = 1; k < ring.length; k++) i2.push(0, k, k + 1);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(p2, 3));
    g.setIndex(i2);
    // Fix winding toward T.
    const a = ring[0].clone().sub(wb), b = ring[1].clone().sub(wb);
    if (a.cross(b).dot(T) < 0) g.setIndex(i2.map((x, n) => (n % 3 === 1 ? i2[n + 1] : n % 3 === 2 ? i2[n - 1] : x)));
    g.computeVertexNormals();
    const n2 = p2.length / 3;
    g.setAttribute('uv', new THREE.Float32BufferAttribute(new Array(n2 * 2).fill(0.45), 2));
    const cl = srgb(0.5, 0.37, 0.26);
    g.setAttribute('color', new THREE.Float32BufferAttribute(new Array(n2).fill(0).flatMap(() => [cl.r, cl.g, cl.b]), 3));
    pieces.push(g);
  }

  // Chimney (whitewashed, sooty top) on the back slope near the ridge.
  const CO = roundedRect(0.27, 0.27, 0.09);
  const cx = 1.15, cz = -0.55;
  const cN = q.low ? 12 : 20;
  const cRings = [];
  const cYs = [4.3, 4.8, 5.3, 5.7, 6.0, 6.22];
  const ringAt = (Ob, y, grow, out) => {
    const r = [];
    for (let i = 0; i <= cN; i++) {
      Ob.at(((i % cN) / cN) * Ob.L, tmp);
      const o = grow + 0.006 * fbm2(tmp.x * 7 + y, tmp.z * 7, 2) - 0.012 * (y - 4.3) / 2;
      r.push(new THREE.Vector3(cx + tmp.x + tmp.nx * o, y, cz + tmp.z + tmp.nz * o));
    }
    return r;
  };
  for (const y of cYs) cRings.push(ringAt(CO, y, 0));
  const CO2 = roundedRect(0.33, 0.33, 0.11), CO3 = roundedRect(0.17, 0.17, 0.06);
  cRings.push(ringAt(CO2, 6.22, 0), ringAt(CO2, 6.31, 0), ringAt(CO3, 6.31, 0), ringAt(CO3, 6.05, 0));
  const chimCol = (k, i, p, c) => {
    const soot = smoothstep(5.75, 6.25, p.y) + (k >= cYs.length + 2 ? 1 : 0);
    const n = 0.95 + 0.05 * fbm2(p.x * 4, p.y * 4 + p.z * 4, 2);
    c.setRGB(n, n, n * 0.98).multiplyScalar(1 - 0.7 * clamp(soot, 0, 1));
  };
  pieces.push(strip(cRings, new THREE.Vector3(0, 0, 1), (k, i, p) => [i / cN * 0.27, 0.35 + (p.y - 4.3) * 0.3], chimCol));

  return { pieces, O, ops, tileU };
}

// ---------------------------------------------------------------------------------------------
// Thatch roof: top surface, cut edge, soffit (thatch material), fringe strip (alpha), ridge roll.
export function buildRoof(q, rng) {
  const A0 = HUT.a + HUT.ov, B0 = HUT.b + HUT.ov;
  const uc = 0.55, yR = HUT.ridgeY, yE = HUT.eaveY;
  const slope = (yR - yE) / (B0 - uc / 2);
  const surfY = (x, z, d) => {
    const u = Math.max(0, B0 - d);
    const f = u > uc ? slope * (u - uc / 2) : (slope * u * u) / (2 * uc);
    const belly = 0.1 * Math.sin(Math.PI * clamp(d / B0, 0, 1));
    const lump = 0.035 * fbm2(x * 0.85 + 4.2, z * 0.85 - 2.7, 2);
    const sag = 0.09 * (1 - Math.min(1, (x / 2.4) ** 2)) * (d / B0) ** 2;
    const droop = 0.06 * (1 - smoothstep(0, 0.45, d));
    return yR - f + belly + lump - sag - droop;
  };
  const rrOf = (bz) => Math.min(bz, 0.2 + 0.36 * bz);
  const outlineAt = (d) => roundedRect(A0 - d, Math.max(0, B0 - d), rrOf(Math.max(0, B0 - d)));

  const nF = q.low ? 26 : 40, nC = q.low ? 9 : 14, nS = q.low ? 9 : 14;
  const nPer = [nF, nC, nS, nC, nF, nC, nS, nC];
  const cols = [];
  for (let i = nF / 2; i < nF; i++) cols.push([4, i / nF]);
  for (const k of [5, 6, 7, 0, 1, 2, 3]) for (let i = 0; i < nPer[k]; i++) cols.push([k, i / nPer[k]]);
  for (let i = 0; i <= nF / 2; i++) cols.push([4, i / nF]);
  const NC = cols.length;

  // Texture u: arc length along a lower ring.
  const Om = outlineAt(0.8);
  const colU = [0];
  let px = null, pz = null;
  for (let c = 0; c < NC; c++) {
    Om.atSeg(cols[c][0], cols[c][1], tmp);
    if (c > 0) colU.push(colU[c - 1] + Math.hypot(tmp.x - px, tmp.z - pz));
    px = tmp.x; pz = tmp.z;
  }
  const NR = q.low ? 13 : 20;
  const sl = Math.sqrt(1 + slope * slope);
  const tint = (p, d, c) => {
    const eave = 1 - smoothstep(0.0, 1.8, d);
    const n = fbm2(p.x * 0.45 + 1.0, p.z * 0.45 + 7.0, 3);
    const rep = smoothstep(0.32, 0.5, fbm2(p.x * 0.33 + 9.0, p.z * 0.33 - 4.0, 2));
    c.setRGB(0.8 - 0.26 * eave, 0.8 - 0.2 * eave, 0.8 - 0.3 * eave).multiplyScalar(1 + 0.22 * n);
    c.r *= 1 + 0.22 * rep; c.g *= 1 + 0.16 * rep; c.b *= 1 - 0.04 * rep;
  };

  // Top surface rings.
  const top = [];
  for (let k = 0; k <= NR; k++) {
    const d = (B0 * k) / NR;
    const Ok = outlineAt(d);
    const row = [];
    for (let c = 0; c < NC; c++) {
      Ok.atSeg(cols[c][0], cols[c][1], tmp);
      const w = (1 - smoothstep(0, 1.1, d)) * (0.09 * fbm2(tmp.x * 0.7 + 1.3, tmp.z * 0.7 - 3.1, 2) + 0.025 * fbm2(tmp.x * 3.1, tmp.z * 3.1, 2));
      const x = tmp.x + tmp.nx * w, z = tmp.z + tmp.nz * w;
      const p = new THREE.Vector3(x, surfY(x, z, d), z);
      p.userData = { nx: tmp.nx, nz: tmp.nz, d };
      row.push(p);
    }
    top.push(row);
  }
  const cTop = new THREE.Color();
  const topGeo = strip(top, new THREE.Vector3(0, 1, -1), (k, i) => [colU[i], (B0 * k / NR) * sl], (k, i, p, c) => tint(p, B0 * k / NR, c));

  // Cut edge of the eaves, shaggy lower line.
  const shag = [];
  for (let c = 0; c < NC; c++) shag.push(c === NC - 1 ? shag[0] : (rng() - 0.5));
  const bottom = top[0].map((p, c) => {
    const { nx, nz } = p.userData;
    const th = 0.36 + 0.06 * fbm2(p.x * 1.3, p.z * 1.3, 2) + 0.07 * shag[c];
    return new THREE.Vector3(p.x - nx * 0.09, p.y - th, p.z - nz * 0.09);
  });
  const edgeGeo = strip([bottom, top[0]], new THREE.Vector3(0, -0.3, -1), (k, i) => [colU[i], k * 0.33], (k, i, p, c) => { tint(p, 0, c); c.multiplyScalar(0.78); });

  // Soffit: from the wall top line out to the eave bottom.
  const Ow = roundedRect(HUT.a + 0.01, HUT.b + 0.01, HUT.r + 0.02);
  const inner = [], mid = [];
  for (let c = 0; c < NC; c++) {
    Ow.atSeg(cols[c][0], cols[c][1], tmp);
    const p = new THREE.Vector3(tmp.x, HUT.wallTop - 0.06, tmp.z);
    inner.push(p);
    mid.push(p.clone().lerp(bottom[c], 0.5).add(new THREE.Vector3(0, 0.05, 0)));
  }
  const soffitGeo = strip([inner, mid, bottom], new THREE.Vector3(0, -1, 0), (k, i) => [colU[i], k * 0.45], (k, i, p, c) => c.setRGB(0.5, 0.47, 0.42));

  // Fringe of loose straw ends hanging under the cut edge.
  const fTop = bottom.map((p, c) => {
    const { nx, nz } = top[0][c].userData;
    return new THREE.Vector3(p.x - nx * 0.03, p.y + 0.04, p.z - nz * 0.03);
  });
  const fBot = bottom.map((p, c) => {
    const { nx, nz } = top[0][c].userData;
    const len = 0.27 * (0.7 + 0.6 * (0.5 + 0.5 * fbm2(p.x * 2.1, p.z * 2.1, 2)));
    return new THREE.Vector3(p.x + nx * 0.07, p.y - len, p.z + nz * 0.07);
  });
  const fringeGeo = strip([fBot, fTop], new THREE.Vector3(0, 0, -1), (k, i) => [colU[i] / 0.5, k === 0 ? 0.0 : 0.985], (k, i, p, c) => { tint(p, 0, c); c.multiplyScalar(0.85); });

  // Ridge roll following the ridge and dipping down the hips.
  const xr = A0 - B0;
  const ridgePts = [], ridgeR = [];
  const nRidge = q.low ? 9 : 15;
  for (let i = 0; i <= nRidge; i++) {
    const x = -xr - 0.45 + ((2 * xr + 0.9) * i) / nRidge;
    const d = Math.abs(x) <= xr ? B0 : B0 - (Math.abs(x) - xr);
    ridgePts.push(new THREE.Vector3(x, surfY(x, 0, d) - 0.03, 0));
    ridgeR.push(0.15 * (1 - 0.55 * smoothstep(xr - 0.2, xr + 0.45, Math.abs(x))));
  }
  const ridgeGeo = tube(ridgePts, ridgeR, q.low ? 6 : 9, { rough: 0.14, seed: 3 });
  const rc = new THREE.Color();
  tint(new THREE.Vector3(0, 5, 0), B0, rc);
  const cAttr = ridgeGeo.attributes.color;
  for (let i = 0; i < cAttr.count; i++) cAttr.setXYZ(i, rc.r * 0.92, rc.g * 0.92, rc.b * 0.92);

  return { thatch: [topGeo, edgeGeo, soffitGeo, ridgeGeo], fringe: fringeGeo, surfY, B0, A0, xr, slope };
}

// ---------------------------------------------------------------------------------------------
// Wood/glass/iron parts of the hut (uber material), local space, added through hutAdd(geo, m, color, mat).
export function buildHutProps(q, rng, O, ops, roof, add) {
  const wood = srgb(0.36, 0.32, 0.27);
  const darkWood = srgb(0.24, 0.2, 0.16);
  const paint = srgb(0.32, 0.45, 0.46);
  const iron = srgb(0.07, 0.07, 0.075);
  const glass = srgb(0.05, 0.065, 0.08);
  const warm = new THREE.Color().setRGB(1.0, 0.5, 0.2);
  const M = new THREE.Matrix4();
  const lights = [];
  const vary = (c, k = 0.12) => c.clone().multiplyScalar(1 - k / 2 + k * rng());

  for (const op of ops) {
    O.at(op.sc, tmp);
    const T = new THREE.Vector3(tmp.tx, 0, tmp.tz), N = new THREE.Vector3(tmp.nx, 0, tmp.nz), Yv = new THREE.Vector3(0, 1, 0);
    const F = basis(T, Yv, N, new THREE.Vector3(tmp.x, 0, tmp.z));
    const yc = (op.h0 + op.h1) / 2;
    const offc = wallOff(tmp.x, tmp.z, yc);
    const at = (x, y, n, rx = 0, ry = 0, rz = 0) => M.multiplyMatrices(F, mat4(x, y, n, rx, ry, rz));
    const ins = 0.035;
    if (op.kind === 'win') {
      const iw = op.w - 2 * ins, ih = op.h1 - op.h0 - 2 * ins;
      const fw = 0.05, fd = 0.08, fn = -0.14;
      const yb = op.h0 + ins, yt = op.h1 - ins;
      const fc = vary(darkWood);
      add(box(iw, fw, fd, rng()), at(0, yb + fw / 2, fn), fc, [0.7, 0.8, 0, 0]);
      add(box(iw, fw, fd, rng()), at(0, yt - fw / 2, fn), fc, [0.7, 0.8, 0, 0]);
      add(box(fw, ih - 2 * fw, fd, rng()), at(-iw / 2 + fw / 2, yc, fn), fc, [0.7, 0.8, 0, 0]);
      add(box(fw, ih - 2 * fw, fd, rng()), at(iw / 2 - fw / 2, yc, fn), fc, [0.7, 0.8, 0, 0]);
      const gx0 = -iw / 2 + fw, gx1 = iw / 2 - fw, gy0 = yb + fw, gy1 = yt - fw;
      const ym = gy0 + (gy1 - gy0) * 0.56;
      add(box(0.032, gy1 - gy0, 0.05, rng()), at(0, (gy0 + gy1) / 2, fn), fc, [0.7, 0.8, 0, 0]);
      add(box(gx1 - gx0, 0.032, 0.05, rng()), at(0, ym, fn), fc, [0.7, 0.8, 0, 0]);
      // Panes.
      for (const [x0, x1] of [[gx0, 0], [0, gx1]]) {
        for (const [y0, y1, low] of [[gy0, ym, 1], [ym, gy1, 0]]) {
          const pg = new THREE.PlaneGeometry(x1 - x0, y1 - y0);
          const m = at((x0 + x1) / 2, (y0 + y1) / 2, fn - 0.015);
          if (op.lit > 0) {
            const k = op.lit * (low ? 3.4 : 2.5) * (0.9 + 0.2 * rng());
            add(pg, m, warm.clone().multiplyScalar(0.9 + 0.2 * rng()), [0.3, 0, k, 0.1 + rng()]);
          } else {
            add(pg, m, glass, [0.1, 0, 0, 0]);
          }
        }
      }
      // Sill board.
      add(box(op.w + 0.14, 0.035, 0.16, rng()), at(0, op.h0 - 0.018, offc + 0.035), vary(wood), [0.8, 0.9, 0, 0]);
      // Shutters, opened back against the wall.
      const wl = op.w / 2 + 0.03, hl = op.h1 - op.h0 + 0.08, th = 0.028;
      const sc = vary(paint, 0.2);
      for (const dir of [-1, 1]) {
        const hinge = mat4(dir * (op.w / 2 + 0.025), yc, offc + 0.03, 0, -dir * (0.14 + 0.1 * rng()), 0);
        const L0 = new THREE.Matrix4().multiplyMatrices(F, hinge);
        for (let b = 0; b < 3; b++) {
          const bw = wl / 3;
          const x = dir * (bw * (b + 0.5));
          add(box(bw - 0.006, hl - 0.01 * rng(), th, rng()), new THREE.Matrix4().multiplyMatrices(L0, mat4(x, 0, 0)), vary(sc, 0.1), [0.75, 0.55, 0, 0]);
        }
        for (const yy of [-0.27, 0.27]) {
          add(box(wl - 0.05, 0.07, 0.022, rng()), new THREE.Matrix4().multiplyMatrices(L0, mat4(dir * wl / 2, yy * hl, th / 2 + 0.011)), vary(sc, 0.1), [0.75, 0.55, 0, 0]);
        }
      }
      if (op.light) {
        const lp = new THREE.Vector3(0, op.h0 + 0.3, -0.24).applyMatrix4(F);
        lights.push({ pos: lp, op });
      }
    } else {
      // Door: frame, plank leaf, strap hinges, latch, step stone.
      const jw = 0.085, jd = 0.17;
      const iw = op.w - 2 * ins;
      const fc = vary(darkWood);
      add(box(jw, op.h1 - ins, jd, rng()), at(-iw / 2 + jw / 2, (op.h1 - ins) / 2, -0.07), fc, [0.75, 0.85, 0, 0]);
      add(box(jw, op.h1 - ins, jd, rng()), at(iw / 2 - jw / 2, (op.h1 - ins) / 2, -0.07), fc, [0.75, 0.85, 0, 0]);
      add(box(op.w + 0.34, 0.15, 0.22, rng()), at(0, op.h1 + 0.03, -0.05), fc, [0.75, 0.85, 0, 0]);
      const lw = iw - 2 * jw - 0.01, lh = op.h1 - ins - 0.04;
      const np = 4, pw = lw / np;
      for (let i = 0; i < np; i++) {
        const x = -lw / 2 + pw * (i + 0.5);
        add(box(pw - 0.008, lh - 0.02 * rng(), 0.045, rng()), at(x, 0.02 + lh / 2, -0.11 + 0.006 * (rng() - 0.5)), vary(wood, 0.18), [0.8, 0.95, 0, 0]);
      }
      for (const yy of [0.32, 1.5]) {
        add(box(lw * 0.62, 0.035, 0.008, 0), at(-lw / 2 + lw * 0.31, yy, -0.083), iron, [0.55, 0, 0, 0]);
      }
      add(box(0.035, 0.16, 0.04, rng()), at(lw / 2 - 0.1, 1.0, -0.07), darkWood, [0.6, 0.6, 0, 0]);
      add(box(op.w + 0.36, 0.17, 0.42, rng()), at(0.02, 0.025, offc + 0.2, 0, 0.03, 0), srgb(0.46, 0.44, 0.41), [0.85, 0.25, 0, 0]);
    }
  }

  // Crossed poles over the ridge (осідлини).
  const { surfY, B0 } = roof;
  for (const x of [-1.55, -0.52, 0.52, 1.55]) {
    const yS = surfY(x, 0, B0);
    const jx = (rng() - 0.5) * 0.08;
    for (const s of [1, -1]) {
      const a = new THREE.Vector3(x + jx, yS - 0.5, 0.62 * s);
      const b = new THREE.Vector3(x - jx, yS + 0.5, -0.38 * s);
      add(pole(a, b, 0.035, 0.028, 5, { bow: 0.02, seed: rng() * 10 }), undefined, vary(darkWood), [0.8, 0.8, 0, 0]);
    }
  }
  return { lights };
}
