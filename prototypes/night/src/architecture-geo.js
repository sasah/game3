// Geometry helpers for the architecture module: a merging builder (position, normal, uv, color,
// aMat = roughness, grain amount, emissive strength, flicker seed), boxes with meter-scaled UVs
// (grain along the long axis), swept tubes with per-point radius (bent stakes, poles, logs),
// lathes and a rounded-rectangle outline walked by arc length.
import * as THREE from 'three';
import { fbm2 } from './noise.js';

const _v = new THREE.Vector3();
const _n = new THREE.Vector3();
const _m3 = new THREE.Matrix3();
const _c = new THREE.Color();
const _c2 = new THREE.Color();
const ID = new THREE.Matrix4();
const WHITE = new THREE.Color(1, 1, 1);

// Color from sRGB components (vertex colors are linear).
export function srgb(r, g, b) {
  return new THREE.Color().setRGB(r, g, b, THREE.SRGBColorSpace);
}

export class Builder {
  constructor() {
    this.p = []; this.n = []; this.uv = []; this.c = []; this.m = []; this.i = [];
  }
  get vertexCount() { return this.p.length / 3; }
  get triangleCount() { return this.i.length / 3; }
  // color: THREE.Color or fn(worldPos, outColor). mat: [roughness, grain, emissive, flickerSeed].
  add(geo, matrix = ID, color = WHITE, mat = [0.8, 0.7, 0, 0], warp = null) {
    const P = geo.attributes.position, N = geo.attributes.normal, U = geo.attributes.uv;
    const C = geo.attributes.color, AM = geo.attributes.aMat;
    const base = this.vertexCount;
    _m3.getNormalMatrix(matrix);
    for (let k = 0; k < P.count; k++) {
      _v.fromBufferAttribute(P, k).applyMatrix4(matrix);
      if (warp) warp(_v);
      _n.fromBufferAttribute(N, k).applyMatrix3(_m3).normalize();
      this.p.push(_v.x, _v.y, _v.z);
      this.n.push(_n.x, _n.y, _n.z);
      if (U) this.uv.push(U.getX(k), U.getY(k)); else this.uv.push(0, 0);
      if (typeof color === 'function') color(_v, _c, k); else _c.copy(color);
      if (C) { _c2.fromBufferAttribute(C, k); _c.multiply(_c2); }
      this.c.push(_c.r, _c.g, _c.b);
      if (AM) this.m.push(AM.getX(k), AM.getY(k), AM.getZ(k), AM.getW(k));
      else this.m.push(mat[0], mat[1], mat[2], mat[3]);
    }
    if (geo.index) {
      const a = geo.index.array;
      for (let k = 0; k < a.length; k++) this.i.push(base + a[k]);
    } else {
      for (let k = 0; k < P.count; k++) this.i.push(base + k);
    }
    return this;
  }
  build() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    g.setAttribute('aMat', new THREE.Float32BufferAttribute(this.m, 4));
    const IA = this.vertexCount > 65535 ? THREE.Uint32BufferAttribute : THREE.Uint16BufferAttribute;
    g.setIndex(new IA(this.i, 1));
    g.computeBoundingSphere();
    g.computeBoundingBox();
    return g;
  }
}

// Box centered at the origin; UV in meters (u across / 0.5 m, v along the longest axis / 1 m).
export function box(sx, sy, sz, uvOff = 0, segs = null) {
  const g = segs ? new THREE.BoxGeometry(sx, sy, sz, segs[0], segs[1], segs[2]) : new THREE.BoxGeometry(sx, sy, sz);
  const P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv;
  const dims = [sx, sy, sz];
  const long = dims.indexOf(Math.max(sx, sy, sz));
  const c = [0, 0, 0];
  for (let i = 0; i < P.count; i++) {
    const ax = Math.abs(N.getX(i)) > 0.5 ? 0 : Math.abs(N.getY(i)) > 0.5 ? 1 : 2;
    c[0] = P.getX(i); c[1] = P.getY(i); c[2] = P.getZ(i);
    const va = long === ax ? (ax + 1) % 3 : long;
    const ua = 3 - ax - va;
    U.setXY(i, c[ua] / 0.5 + uvOff, c[va] + uvOff * 1.7);
  }
  return g;
}

// Matrix helpers.
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _s = new THREE.Vector3(1, 1, 1);
const _p = new THREE.Vector3();
export function mat4(x, y, z, rx = 0, ry = 0, rz = 0, order = 'YXZ') {
  _e.set(rx, ry, rz, order);
  _q.setFromEuler(_e);
  _p.set(x, y, z);
  return new THREE.Matrix4().compose(_p, _q, _s);
}

// Frame matrix from basis vectors (columns) and origin.
export function basis(T, Y, N, O) {
  return new THREE.Matrix4().makeBasis(T, Y, N).setPosition(O);
}

function jitter(i, j, seed) {
  return fbm2(i * 0.63 + seed * 1.37, j * 1.91 - seed * 0.71, 2);
}

// Tube swept along points (Vector3[]), radius per point. opts: rough, seed, cap0, cap1,
// capColor (Color multiplier for caps; sides get white), sides.
export function tube(pts, radii, sides, opts = {}) {
  const n = pts.length;
  const rough = opts.rough || 0, seed = opts.seed || 0;
  const T = [], Nn = [], B = [];
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    T.push(new THREE.Vector3().subVectors(b, a).normalize());
  }
  let nv = Math.abs(T[0].y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
  for (let i = 0; i < n; i++) {
    if (i > 0) nv = Nn[i - 1].clone();
    nv.addScaledVector(T[i], -nv.dot(T[i])).normalize();
    Nn.push(nv.clone());
    B.push(new THREE.Vector3().crossVectors(T[i], nv));
  }
  const pos = [], nrm = [], uv = [], col = [], idx = [];
  let rAvg = 0;
  for (const r of radii) rAvg += r / n;
  const circ = 2 * Math.PI * rAvg;
  let v = 0;
  const rings = [];
  for (let i = 0; i < n; i++) {
    if (i > 0) v += pts[i].distanceTo(pts[i - 1]);
    const ring = [];
    for (let j = 0; j <= sides; j++) {
      const a = ((j % sides) / sides) * Math.PI * 2;
      const ca = Math.cos(a), sa = Math.sin(a);
      const dx = Nn[i].x * ca + B[i].x * sa, dy = Nn[i].y * ca + B[i].y * sa, dz = Nn[i].z * ca + B[i].z * sa;
      const rr = radii[i] * (1 + rough * jitter(i, j % sides, seed));
      const px = pts[i].x + dx * rr, py = pts[i].y + dy * rr, pz = pts[i].z + dz * rr;
      ring.push([px, py, pz]);
      pos.push(px, py, pz);
      nrm.push(dx, dy, dz);
      uv.push((j / sides) * circ / 0.5 + seed * 0.37, v + seed * 0.61);
      col.push(1, 1, 1);
    }
    rings.push(ring);
  }
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < sides; j++) {
      const a = i * (sides + 1) + j, b = a + sides + 1;
      idx.push(a, a + 1, b, a + 1, b + 1, b);
    }
  }
  const cc = opts.capColor || WHITE;
  const cap = (i, dir) => {
    const t = T[i];
    const nx = t.x * dir, ny = t.y * dir, nz = t.z * dir;
    const c0 = pos.length / 3;
    pos.push(pts[i].x, pts[i].y, pts[i].z); nrm.push(nx, ny, nz); uv.push(0.5, 0.5); col.push(cc.r, cc.g, cc.b);
    for (let j = 0; j < sides; j++) {
      const p = rings[i][j];
      pos.push(p[0], p[1], p[2]); nrm.push(nx, ny, nz);
      uv.push(0.5 + 0.5 * Math.cos(j / sides * 6.283), 0.5 + 0.5 * Math.sin(j / sides * 6.283));
      col.push(cc.r, cc.g, cc.b);
    }
    for (let j = 0; j < sides; j++) {
      const a = c0 + 1 + j, b = c0 + 1 + ((j + 1) % sides);
      if (dir > 0) idx.push(c0, a, b); else idx.push(c0, b, a);
    }
  };
  if (opts.cap0) cap(0, -1);
  if (opts.cap1) cap(n - 1, 1);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  return g;
}

// Straight (optionally bowed) log/pole between two points.
export function pole(a, b, r0, r1, sides, opts = {}) {
  const segs = opts.segs || 3;
  const bow = opts.bow || 0;
  const dir = new THREE.Vector3().subVectors(b, a);
  const side = new THREE.Vector3(dir.z, 0, -dir.x);
  if (side.lengthSq() < 1e-6) side.set(1, 0, 0);
  side.normalize();
  if (opts.bowDir) side.copy(opts.bowDir);
  const pts = [], radii = [];
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const p = new THREE.Vector3().copy(a).addScaledVector(dir, t);
    p.addScaledVector(side, bow * Math.sin(Math.PI * t));
    pts.push(p);
    radii.push(r0 + (r1 - r0) * t);
  }
  return tube(pts, radii, sides, opts);
}

export function lathe(profile, segs) {
  return new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), segs);
}

// Rounded rectangle (half sizes a along x, b along z, corner radius r), walked by arc length:
// front edge (+z) toward +x, east edge (+x) toward -z, back edge toward -x, west edge toward +z.
// Outward normal (nx, nz). Segments: 0 front, 1 corner, 2 east, 3 corner, 4 back, 5, 6 west, 7.
export function roundedRect(a, b, r) {
  r = Math.max(0, Math.min(r, a, b));
  const Lf = 2 * (a - r), Ls = 2 * (b - r), Lc = (Math.PI * r) / 2;
  const segs = [
    { L: Lf, line: [-a + r, b, 1, 0], n: [0, 1] },
    { L: Lc, arc: [a - r, b - r, 0] },
    { L: Ls, line: [a, b - r, 0, -1], n: [1, 0] },
    { L: Lc, arc: [a - r, -b + r, Math.PI / 2] },
    { L: Lf, line: [a - r, -b, -1, 0], n: [0, -1] },
    { L: Lc, arc: [-a + r, -b + r, Math.PI] },
    { L: Ls, line: [-a, -b + r, 0, 1], n: [-1, 0] },
    { L: Lc, arc: [-a + r, b - r, 1.5 * Math.PI] },
  ];
  const starts = [];
  let L = 0;
  for (const g of segs) { starts.push(L); L += g.L; }
  function atSeg(k, f, out) {
    const g = segs[k];
    if (g.line) {
      const [x0, z0, dx, dz] = g.line;
      out.x = x0 + dx * g.L * f; out.z = z0 + dz * g.L * f; out.nx = g.n[0]; out.nz = g.n[1];
    } else {
      const [cx, cz, p0] = g.arc;
      const phi = p0 + (Math.PI / 2) * f;
      out.nx = Math.sin(phi); out.nz = Math.cos(phi);
      out.x = cx + r * out.nx; out.z = cz + r * out.nz;
    }
    out.tx = out.nz; out.tz = -out.nx; // direction of travel (increasing s)
    return out;
  }
  function at(s, out) {
    s = ((s % L) + L) % L;
    for (let k = 0; k < 8; k++) {
      if (s <= starts[k] + segs[k].L || k === 7) {
        return atSeg(k, segs[k].L > 0 ? Math.min(1, (s - starts[k]) / segs[k].L) : 0, out);
      }
    }
    return out;
  }
  return { L, Lf, Ls, Lc, segs, starts, at, atSeg, a, b, r };
}

// Quad strip between rows of points (rows[k][i] Vector3). Returns indexed geometry with flat-ish
// smooth normals; winding flipped if the first face disagrees with `expect`.
export function strip(rows, expect, uvFn, colFn) {
  const R = rows.length, C = rows[0].length;
  const pos = [], uv = [], col = [], idx = [];
  const cc = new THREE.Color();
  for (let k = 0; k < R; k++) {
    for (let i = 0; i < C; i++) {
      const p = rows[k][i];
      pos.push(p.x, p.y, p.z);
      const t = uvFn ? uvFn(k, i, p) : [i, k];
      uv.push(t[0], t[1]);
      if (colFn) colFn(k, i, p, cc); else cc.setRGB(1, 1, 1);
      col.push(cc.r, cc.g, cc.b);
    }
  }
  // Orientation test on the largest early face.
  const a = rows[0][0], b = rows[0][Math.min(1, C - 1)], c = rows[Math.min(1, R - 1)][0];
  const nrm = new THREE.Vector3().subVectors(b, a).cross(new THREE.Vector3().subVectors(c, a));
  const flip = nrm.dot(expect) < 0;
  for (let k = 0; k < R - 1; k++) {
    for (let i = 0; i < C - 1; i++) {
      const A = k * C + i, B2 = A + 1, Cc = A + C, D = Cc + 1;
      if (flip) idx.push(A, Cc, B2, B2, Cc, D);
      else idx.push(A, B2, Cc, B2, D, Cc);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

export { fbm2 };
