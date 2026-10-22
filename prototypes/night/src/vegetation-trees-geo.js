// Geometry kit for the trees module: branch skeletons grown as polylines, smooth tapered bark
// tubes (parallel-transport frames, gnarled cross-sections, root flare, normals from the actual
// surface) and foliage cards / hanging willow strands with baked crown normals, crown occlusion and
// the per-vertex wind weights read by vegetation-trees-mat.js (aTree, aWind).
import * as THREE from 'three';
import { noise2 } from './noise.js';

export const TAU = Math.PI * 2;
export const add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
export const madd = (a, b, s) => [a[0] + b[0] * s, a[1] + b[1] * s, a[2] + b[2] * s];
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const vlen = (a) => Math.hypot(a[0], a[1], a[2]);
export const norm = (a) => { const l = vlen(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
export const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const sstep = (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };

// Two unit vectors perpendicular to unit t.
export function perp(t) {
  const a = Math.abs(t[1]) < 0.95 ? [0, 1, 0] : [1, 0, 0];
  const n = norm(cross(a, t));
  return [n, cross(t, n)];
}
// Direction at polar angle `pol` from axis t and azimuth `az` around it.
export function deviate(t, pol, az) {
  const [n, b] = perp(t);
  const s = Math.sin(pol), c = Math.cos(pol), ca = Math.cos(az), sa = Math.sin(az);
  return norm([t[0] * c + (n[0] * ca + b[0] * sa) * s, t[1] * c + (n[1] * ca + b[1] * sa) * s, t[2] * c + (n[2] * ca + b[2] * sa) * s]);
}
// World direction from polar angle (0 = straight up) and compass azimuth (x = cos, z = sin).
export const dirAz = (pol, az) => [Math.sin(pol) * Math.cos(az), Math.cos(pol), Math.sin(pol) * Math.sin(az)];
// Random unit vector perpendicular to t.
export function randPerp(rng, t) {
  const [n, b] = perp(t);
  const a = rng() * TAU;
  return norm(add(mul(n, Math.cos(a)), mul(b, Math.sin(a))));
}

// Grow a branch as a polyline. o: step, trop (curvature toward +y per meter, negative droops),
// wob (wandering curvature), pull + pullK (curvature toward a direction), r0, r1, taper,
// sway0 / swayGain (wind sway in meters at the base and its growth along the branch), phase.
export function grow(rng, p0, d0, L, o) {
  const n = Math.max(2, Math.ceil(L / (o.step || 0.4)));
  const ds = L / n;
  const pts = [p0.slice()];
  let d = norm(d0), p = p0.slice();
  let w = [0, 0, 0];
  for (let i = 1; i <= n; i++) {
    w = madd(mul(w, 0.62), [rng() - 0.5, rng() - 0.5, rng() - 0.5], 0.9);
    let nd = madd(d, w, (o.wob || 0) * ds);
    if (o.trop) nd = madd(nd, [0, 1, 0], o.trop * ds);
    if (o.pull) nd = madd(nd, o.pull, (o.pullK || 0) * ds);
    if (o.minY !== undefined && nd[1] < o.minY) nd[1] = o.minY;
    d = norm(nd);
    p = madd(p, d, ds);
    pts.push(p);
  }
  return finishBranch(pts, o);
}

export function finishBranch(pts, o) {
  const s = [0];
  for (let i = 1; i < pts.length; i++) s.push(s[i - 1] + vlen(sub(pts[i], pts[i - 1])));
  const L = s[s.length - 1];
  const taper = o.taper ?? 1;
  const rad = s.map((si) => o.r1 + (o.r0 - o.r1) * Math.pow(1 - si / L, taper));
  const g = o.swayGain || 0, s0 = o.sway0 || 0;
  const sway = s.map((si) => s0 + g * Math.pow(si, 1.3));
  return { pts, s, rad, sway, L, phase: o.phase ?? 0 };
}

// Point, direction, radius and sway at fraction t along a branch.
export function at(br, t) {
  const target = Math.min(1, Math.max(0, t)) * br.L;
  const s = br.s;
  let i = 0;
  while (i < s.length - 2 && s[i + 1] < target) i++;
  const k = Math.min(1, Math.max(0, (target - s[i]) / Math.max(1e-6, s[i + 1] - s[i])));
  return {
    p: lerp3(br.pts[i], br.pts[i + 1], k),
    d: norm(sub(br.pts[i + 1], br.pts[i])),
    r: br.rad[i] + (br.rad[i + 1] - br.rad[i]) * k,
    sway: br.sway[i] + (br.sway[i + 1] - br.sway[i]) * k,
    phase: br.phase,
  };
}

// Per-tree constants baked into every vertex: root (world), seed, height and trunk bend.
export function treeInfo(root, seed, H, bend) {
  return { root, seed, H, bend };
}
function bendAt(tree, y) {
  const h = Math.min(1.3, Math.max(0, (y - tree.root[1]) / tree.H));
  return tree.bend * h * h;
}

class Builder {
  constructor(extraName, extraSize) {
    this.pos = []; this.nrm = []; this.uv = []; this.col = []; this.tree = []; this.wind = []; this.extra = []; this.idx = [];
    this.extraName = extraName; this.extraSize = extraSize;
  }
  get vcount() { return this.pos.length / 3; }
  get tris() { return this.idx.length / 3; }
  vert(p, n, u, v, c, tree, sway, phase, flutter, extra) {
    this.pos.push(p[0], p[1], p[2]);
    this.nrm.push(n[0], n[1], n[2]);
    this.uv.push(u, v);
    this.col.push(c[0], c[1], c[2]);
    this.tree.push(tree.root[0], tree.root[1], tree.root[2], tree.seed);
    this.wind.push(bendAt(tree, p[1]), sway, phase, flutter);
    for (let k = 0; k < extra.length; k++) this.extra.push(extra[k]);
  }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nrm, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.setAttribute('aTree', new THREE.Float32BufferAttribute(this.tree, 4));
    g.setAttribute('aWind', new THREE.Float32BufferAttribute(this.wind, 4));
    g.setAttribute(this.extraName, new THREE.Float32BufferAttribute(this.extra, this.extraSize));
    const n = this.vcount;
    g.setIndex(n > 65535 ? new THREE.Uint32BufferAttribute(this.idx, 1) : new THREE.Uint16BufferAttribute(this.idx, 1));
    g.computeBoundingSphere();
    g.boundingSphere.radius += 2; // wind sway
    return g;
  }
}

// Bark tubes. Extra attribute aBark: x = smooth bark (cherry), y = moss amount.
export class BarkBuilder extends Builder {
  constructor() { super('aBark', 2); }

  // o: seg, gnarl (cross-section lumps), twist (spiral of the lumps), flare (root buttresses),
  // uRep (texture repeats around), col [r,g,b], smooth 0..1, moss 0..1, flutter, close (cap tip)
  tube(br, tree, o) {
    const P = br.pts.slice(), R = br.rad.slice(), S = br.s.slice(), W = br.sway.slice();
    const n0 = P.length;
    // Close the tip with a short cone.
    if (o.close !== false) {
      const d = norm(sub(P[n0 - 1], P[n0 - 2]));
      const rl = R[n0 - 1];
      P.push(madd(P[n0 - 1], d, rl * 0.9));
      R.push(rl * 0.05);
      S.push(S[n0 - 1] + rl * 0.9);
      W.push(W[n0 - 1]);
    }
    const n = P.length;
    const seg = o.seg;
    const T = [];
    for (let i = 0; i < n; i++) T.push(norm(sub(P[Math.min(n - 1, i + 1)], P[Math.max(0, i - 1)])));
    let [N] = perp(T[0]);
    const Ns = [], Bs = [];
    for (let i = 0; i < n; i++) {
      if (i > 0) N = norm(madd(N, T[i], -dot(N, T[i])));
      Ns.push(N);
      Bs.push(cross(T[i], N));
    }
    const seed = (tree.seed * 97.3 + (br.phase || 0) * 13.1) % 50;
    const gn = o.gnarl || 0, fl = o.flare || 0, tw = o.twist || 0;
    const grid = new Float32Array(n * (seg + 1) * 3);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j <= seg; j++) {
        const th = (j % seg) / seg * TAU;
        const c = Math.cos(th), s = Math.sin(th);
        let r = R[i];
        if (gn || fl) {
          const tc = Math.cos(th + tw * S[i]), ts = Math.sin(th + tw * S[i]);
          if (gn) r *= 1 + gn * (0.7 * noise2(tc * 1.2 + seed, ts * 1.2 + S[i] * 0.7) + 0.3 * noise2(tc * 2.6 - seed, ts * 2.6 + S[i] * 1.9));
          if (fl) {
            const lobes = Math.max(0, noise2(c * 1.9 + seed * 0.3, s * 1.9 - seed));
            r *= 1 + fl * Math.exp(-S[i] / 0.45) * (0.35 + 1.3 * lobes);
          }
        }
        const k = (i * (seg + 1) + j) * 3;
        grid[k] = P[i][0] + (Ns[i][0] * c + Bs[i][0] * s) * r;
        grid[k + 1] = P[i][1] + (Ns[i][1] * c + Bs[i][1] * s) * r;
        grid[k + 2] = P[i][2] + (Ns[i][2] * c + Bs[i][2] * s) * r;
      }
    }
    const G = (i, j) => { const k = (i * (seg + 1) + j) * 3; return [grid[k], grid[k + 1], grid[k + 2]]; };
    const base = this.vcount;
    const circ = TAU * R[0];
    const uRep = o.uRep || Math.max(1, Math.round(circ / 0.85));
    const vScale = Math.max(0.25, 2 * circ / uRep);
    const v0 = (tree.seed * 7.3 + (br.phase || 0) * 3.1) % 1;
    const col = o.col, smooth = o.smooth || 0, moss = o.moss || 0;
    for (let i = 0; i < n; i++) {
      const ip = Math.min(n - 1, i + 1), im = Math.max(0, i - 1);
      for (let j = 0; j <= seg; j++) {
        const jp = j === seg ? 1 : j + 1, jm = j === 0 ? seg - 1 : j - 1;
        const p = G(i, j);
        let nr = cross(sub(G(i, jp), G(i, jm)), sub(G(ip, j), G(im, j)));
        const radial = sub(p, P[i]);
        if (vlen(nr) < 1e-9 || R[i] < 1e-3) nr = vlen(radial) > 1e-6 ? radial : T[i];
        nr = norm(nr);
        if (dot(nr, radial) < 0 && vlen(radial) > 1e-5) nr = mul(nr, -1);
        // Darker, mossy foot; moss and lichen on the shaded north side of old trunks.
        const foot = 1 - 0.3 * Math.exp(-S[i] / 0.6);
        const north = Math.max(0, -nr[2]) * moss * (0.4 + 0.6 * Math.exp(-S[i] / 2.5));
        const c3 = [
          col[0] * foot * (1 - north * 0.45),
          col[1] * foot * (1 - north * 0.12),
          col[2] * foot * (1 - north * 0.55),
        ];
        this.vert(p, nr, j / seg * uRep, v0 + S[i] / vScale, c3, tree, W[i], br.phase || 0, o.flutter || 0, [smooth, north]);
      }
    }
    for (let i = 0; i < n - 1; i++) {
      for (let j = 0; j < seg; j++) {
        const a = base + i * (seg + 1) + j, b = a + seg + 1;
        this.idx.push(a, a + 1, b, a + 1, b + 1, b);
      }
    }
  }
}

// Foliage cards and strands. Extra attribute aFol: x = translucency, y = blossom glow, z = edge thinning.
export class FolBuilder extends Builder {
  constructor() { super('aFol', 3); }

  // Shade a foliage vertex inside its crown: normal bent toward the crown surface, occlusion deep
  // inside and low in the crown.
  shade(p, cardN, crown, col, aoMin) {
    const c = crown.c, r = crown.r;
    const q = [(p[0] - c[0]) / r[0], (p[1] - c[1]) / r[1], (p[2] - c[2]) / r[2]];
    const e = vlen(q);
    const g = norm([q[0] / r[0], q[1] / r[1], q[2] / r[2]]);
    const cn = dot(cardN, g) < 0 ? mul(cardN, -1) : cardN;
    const nrm = norm(add(lerp3(cn, g, crown.k ?? 0.72), [0, crown.up ?? 0.25, 0]));
    const ao = (aoMin + (1 - aoMin) * sstep(0.1, 1.0, e)) * (0.78 + 0.22 * sstep(-1, 0.6, q[1]));
    return [nrm, [col[0] * ao, col[1] * ao, col[2] * ao]];
  }

  // Card: bottom-centre at A, up axis U, facing Nc (unit, perpendicular to U), folded along its
  // centre line. region = [u0, vTop, u1, vBottom].
  card(A, U, Nc, w, h, region, tree, o) {
    const Rt = norm(cross(U, Nc));
    const base = this.vcount;
    const fold = (o.fold ?? 0.22) * w;
    const fol = o.fol;
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 3; col++) {
        const cx = col * 0.5 - 0.5;
        let p = madd(madd(A, Rt, cx * w), U, row * h);
        if (col === 1) p = madd(p, Nc, fold);
        if (row === 1 && o.droop) p = madd(p, [0, -1, 0], o.droop * h);
        const [nr, c] = this.shade(p, Nc, o.crown, o.col, o.aoMin ?? 0.4);
        const u = region[0] + (region[2] - region[0]) * (col * 0.5);
        const v = row === 0 ? region[3] : region[1];
        this.vert(p, nr, u, v, c, tree, o.sway + row * h * (o.tipSway ?? 0.03), o.phase, o.flutter ?? 0.025, fol);
      }
    }
    this.idx.push(base, base + 1, base + 3, base + 1, base + 4, base + 3, base + 1, base + 2, base + 4, base + 2, base + 5, base + 4);
  }

  // Hanging strand ribbon from top point A: length len, width w, facing yaw, drifting outward
  // along `out` (horizontal). Sway grows down the strand and its phase lags so it whips.
  strand(A, len, w, yaw, region, tree, o) {
    const segs = o.segs || 6;
    const base = this.vcount;
    const out = o.out;
    const twist = o.twist || 0;
    const fol = o.fol;
    for (let k = 0; k <= segs; k++) {
      const t = k / segs;
      const a = yaw + twist * t;
      const Rt = [Math.cos(a), 0, Math.sin(a)];
      // Leaves out from the branch, then hangs nearly plumb.
      const drift = (o.drift ?? 0.12) * len * Math.sqrt(t);
      const c = [A[0] + out[0] * drift, A[1] - len * t, A[2] + out[2] * drift];
      const ww = w * (1 - 0.15 * t);
      for (let side = 0; side < 2; side++) {
        const p = madd(c, Rt, (side - 0.5) * ww);
        const fn = norm([out[0], 0.25, out[2]]);
        const [nr, cc] = this.shade(p, fn, o.crown, o.col, o.aoMin ?? 0.5);
        const u = side === 0 ? region[0] : region[2];
        const v = region[1] + (region[3] - region[1]) * t;
        const sway = o.sway + (o.strandGain ?? 0.09) * Math.pow(len * t, 1.3);
        this.vert(p, nr, u, v, cc, tree, sway, o.phase + 0.11 * t * len, o.flutter ?? 0.03, fol);
      }
    }
    for (let k = 0; k < segs; k++) {
      const a = base + k * 2;
      this.idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
}
