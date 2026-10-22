// Canvas-painted textures for the trees module: fissured bark (albedo + normal map), one foliage
// atlas (willow sprays and hanging strands, poplar sprays, cherry blossom, elder / viburnum) and an
// atlas of distant tree silhouettes. Leaves are painted one by one (many small leaves per card), then
// the colour is bled into the transparent texels so mip filtering never produces dark fringes.
import * as THREE from 'three';

const TAU = Math.PI * 2;

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

const hsl = (h, s, l, a = 1) => `hsla(${h.toFixed(1)},${s.toFixed(1)}%,${l.toFixed(1)}%,${a})`;

// Canvas (transparent background) -> sRGB DataTexture with colour bled into transparent texels.
function toTexture(renderer, c, { mean = [60, 70, 50] } = {}) {
  const w = c.width, h = c.height;
  const src = c.getContext('2d').getImageData(0, 0, w, h).data;
  const blur = (px) => {
    const b = makeCanvas(w, h);
    const g = b.getContext('2d');
    g.filter = `blur(${px}px)`;
    g.drawImage(c, 0, 0);
    if (px > 8) g.drawImage(b, 0, 0); // thicken the wide halo
    return g.getImageData(0, 0, w, h).data;
  };
  const near = blur(Math.max(2, Math.round(w / 512) * 2));
  const far = blur(Math.max(8, Math.round(w / 64)));
  const out = new Uint8Array(w * h * 4);
  for (let i = 0; i < out.length; i += 4) {
    const a = src[i + 3];
    out[i + 3] = a;
    if (a > 252) { out[i] = src[i]; out[i + 1] = src[i + 1]; out[i + 2] = src[i + 2]; continue; }
    let r, gg, b;
    if (near[i + 3] > 6) { r = near[i]; gg = near[i + 1]; b = near[i + 2]; }
    else if (far[i + 3] > 1) { r = far[i]; gg = far[i + 1]; b = far[i + 2]; }
    else { r = mean[0]; gg = mean[1]; b = mean[2]; }
    const k = a / 255;
    out[i] = src[i] * k + r * (1 - k);
    out[i + 1] = src[i + 1] * k + gg * (1 - k);
    out[i + 2] = src[i + 2] * k + b * (1 - k);
  }
  const tex = new THREE.DataTexture(out, w, h, THREE.RGBAFormat, THREE.UnsignedByteType);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  tex.needsUpdate = true;
  return tex;
}

// ---------- painting primitives ----------

// Leaf pointing along +x from the origin, two-tone halves (light/shade across the midrib).
const SHAPES = {
  lance: [0.22, 1.0, 0.72, 0.62],  // willow: long and narrow
  delta: [0.02, 1.5, 0.42, 0.95],  // poplar: widest near the base, pointed
  ellip: [0.2, 1.25, 0.78, 0.75],  // cherry / elder leaflets
  round: [0.1, 1.4, 0.85, 1.1],
};
function leaf(g, x, y, ang, len, wid, colA, colB, rib, shape = 'lance') {
  const [ax, ay, bx, by] = SHAPES[shape];
  g.save();
  g.translate(x, y);
  g.rotate(ang);
  g.fillStyle = colA;
  g.beginPath();
  g.moveTo(0, 0);
  g.bezierCurveTo(len * ax, -wid * ay, len * bx, -wid * by, len, 0);
  g.closePath();
  g.fill();
  g.fillStyle = colB;
  g.beginPath();
  g.moveTo(0, 0);
  g.bezierCurveTo(len * ax, wid * ay, len * bx, wid * by, len, 0);
  g.closePath();
  g.fill();
  if (rib && len > 12) {
    g.strokeStyle = rib;
    g.lineWidth = Math.max(0.5, wid * 0.14);
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(len * 0.88, 0);
    g.stroke();
  }
  g.restore();
}

// Wavy twig as a polyline: start point, heading, length, curvature, wobble.
function twigPath(rng, x, y, ang, len, curve, wobble, n = 14) {
  const pts = [[x, y, ang]];
  let a = ang;
  const step = len / n;
  for (let i = 0; i < n; i++) {
    a += curve / n + (rng() - 0.5) * wobble;
    x += Math.cos(a) * step;
    y += Math.sin(a) * step;
    pts.push([x, y, a]);
  }
  return pts;
}
function strokeTwig(g, pts, w0, w1, col) {
  g.strokeStyle = col;
  g.lineCap = 'round';
  for (let i = 0; i < pts.length - 1; i++) {
    const t = i / (pts.length - 1);
    g.lineWidth = w0 + (w1 - w0) * t;
    g.beginPath();
    g.moveTo(pts[i][0], pts[i][1]);
    g.lineTo(pts[i + 1][0], pts[i + 1][1]);
    g.stroke();
  }
}
// Point and heading at fraction t along a twig polyline.
function along(pts, t) {
  const f = t * (pts.length - 1);
  const i = Math.min(pts.length - 2, Math.floor(f));
  const k = f - i;
  const a = pts[i], b = pts[i + 1];
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
}
function inside(x, y, r) {
  return x > r.x + 2 && x < r.x + r.w - 2 && y > r.y + 2 && y < r.y + r.h - 2;
}
function leafFits(r, x, y, ang, len) {
  return inside(x, y, r) && inside(x + Math.cos(ang) * len, y + Math.sin(ang) * len, r);
}

// ---------- foliage cells (r = {x, y, w, h} in canvas pixels, s = pixel scale) ----------

// Willow spray (Salix alba): twigs fanning up from the bottom centre, narrow grey-green leaves with
// silvery undersides. `upright` narrows the fan (pollard shoots).
function paintWillowSpray(g, r, s, rng, upright) {
  const twigs = 5 + Math.floor(rng() * 3);
  const leaves = [];
  for (let k = 0; k < twigs; k++) {
    const bx = r.x + r.w * (0.5 + (rng() - 0.5) * 0.12), by = r.y + r.h * 0.985;
    const spread = upright ? 0.75 : 1.5;
    const a0 = -Math.PI / 2 + ((k + 0.5) / twigs - 0.5) * spread + (rng() - 0.5) * 0.25;
    const len = r.h * (0.6 + rng() * 0.33);
    const pts = twigPath(rng, bx, by, a0, len, (rng() - 0.5) * 0.8, 0.12);
    strokeTwig(g, pts, 3.0 * s, 0.7 * s, hsl(35, 18, 22));
    const n = Math.floor(len / (7.5 * s));
    for (let i = 2; i < n; i++) {
      const t = i / n;
      const [x, y, a] = along(pts, t);
      const side = i % 2 ? 1 : -1;
      const la = a + side * (0.35 + rng() * 0.45);
      const ll = (36 + rng() * 22) * s * (1 - 0.45 * t * t);
      if (!leafFits(r, x, y, la, ll)) continue;
      leaves.push([x, y, la, ll, ll * (0.11 + rng() * 0.05)]);
    }
  }
  // Paint in random order so silvery and green leaves interleave.
  for (let i = leaves.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [leaves[i], leaves[j]] = [leaves[j], leaves[i]]; }
  for (const [x, y, a, l, w] of leaves) {
    const silver = rng() < 0.38;
    const L = silver ? 50 + rng() * 14 : 27 + rng() * 13;
    const S = silver ? 7 + rng() * 6 : 15 + rng() * 10;
    const H = silver ? 105 + rng() * 25 : 78 + rng() * 18;
    leaf(g, x, y, a, l, w, hsl(H, S, L), hsl(H, S, L * 0.8), hsl(H, S * 0.7, L * 1.15, 0.6), 'lance');
  }
}

// Hanging willow strand: 3-4 pendulous twigs from the top edge, narrow leaves pointing down.
function paintStrand(g, r, s, rng) {
  const n = 3 + (rng() < 0.6 ? 1 : 0);
  const leaves = [];
  for (let k = 0; k < n; k++) {
    const x = r.x + r.w * (0.18 + 0.64 * (k + 0.5) / n + (rng() - 0.5) * 0.08);
    const end = 0.62 + rng() * 0.36;
    const len = r.h * end;
    const pts = twigPath(rng, x, r.y + 1, Math.PI / 2 + (rng() - 0.5) * 0.05, len, (rng() - 0.5) * 0.12, 0.035, 28);
    strokeTwig(g, pts, 2.0 * s, 0.6 * s, hsl(40, 16, 24));
    const m = Math.floor(len / (5.2 * s));
    for (let i = 1; i < m; i++) {
      const t = i / m;
      const [lx, ly, a] = along(pts, t);
      const side = i % 2 ? 1 : -1;
      const la = a + side * (0.22 + rng() * 0.35);
      const ll = (24 + rng() * 14) * s * (1 - 0.5 * Math.pow(t, 3)) * (t < 0.06 ? 0.6 : 1);
      if (!leafFits(r, lx, ly, la, ll)) continue;
      leaves.push([lx, ly, la, ll, ll * (0.11 + rng() * 0.04)]);
    }
  }
  for (let i = leaves.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [leaves[i], leaves[j]] = [leaves[j], leaves[i]]; }
  for (const [x, y, a, l, w] of leaves) {
    const silver = rng() < 0.35;
    const L = silver ? 50 + rng() * 12 : 29 + rng() * 12;
    const S = silver ? 8 + rng() * 6 : 18 + rng() * 10;
    const H = silver ? 100 + rng() * 25 : 76 + rng() * 16;
    leaf(g, x, y, a, l, w, hsl(H, S, L), hsl(H, S, L * 0.78), null, 'lance');
  }
}

// Lombardy poplar spray: narrow fan of twigs crowded with small deltoid leaves on petioles.
function paintPoplarSpray(g, r, s, rng) {
  const twigs = 6 + Math.floor(rng() * 3);
  const leaves = [];
  for (let k = 0; k < twigs; k++) {
    const bx = r.x + r.w * (0.5 + (rng() - 0.5) * 0.2), by = r.y + r.h * 0.985;
    const a0 = -Math.PI / 2 + ((k + 0.5) / twigs - 0.5) * 1.1 + (rng() - 0.5) * 0.2;
    const len = r.h * (0.55 + rng() * 0.4);
    const pts = twigPath(rng, bx, by, a0, len, (rng() - 0.5) * 0.4, 0.1);
    strokeTwig(g, pts, 2.6 * s, 0.7 * s, hsl(30, 12, 24));
    const n = Math.floor(len / (8 * s));
    for (let i = 1; i < n; i++) {
      const t = i / n;
      const [x, y, a] = along(pts, t);
      for (const side of [-1, 1]) {
        if (rng() < 0.2) continue;
        const pa = a + side * (0.6 + rng() * 0.7);
        const pl = (6 + rng() * 6) * s;
        const px = x + Math.cos(pa) * pl, py = y + Math.sin(pa) * pl;
        const la = pa + (rng() - 0.5) * 0.9 - side * 0.25;
        const ll = (22 + rng() * 14) * s * (1 - 0.35 * t);
        if (!leafFits(r, px, py, la, ll)) continue;
        leaves.push([x, y, px, py, la, ll, ll * (0.42 + rng() * 0.12)]);
      }
    }
  }
  for (let i = leaves.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [leaves[i], leaves[j]] = [leaves[j], leaves[i]]; }
  g.lineWidth = 0.8 * s;
  for (const [x, y, px, py, a, l, w] of leaves) {
    g.strokeStyle = hsl(70, 20, 30);
    g.beginPath(); g.moveTo(x, y); g.lineTo(px, py); g.stroke();
    const under = rng() < 0.25;
    const L = under ? 40 + rng() * 10 : 22 + rng() * 12;
    const H = 88 + rng() * 22;
    const S = under ? 14 + rng() * 8 : 26 + rng() * 14;
    leaf(g, px, py, a, l, w, hsl(H, S, L), hsl(H, S, L * 0.75), hsl(H, S, L * 1.3, 0.5), 'delta');
  }
}

// One cherry flower: five overlapping round petals, a greenish heart and yellow anthers.
function flower(g, x, y, rad, rng, rot, squash) {
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  g.scale(1, squash);
  const L = 90 + rng() * 6;
  for (let p = 0; p < 5; p++) {
    const a = rot + p * TAU / 5 + (rng() - 0.5) * 0.25;
    const pr = rad * (0.5 + rng() * 0.08);
    const cx = Math.cos(a) * rad * 0.5, cy = Math.sin(a) * rad * 0.5;
    g.fillStyle = hsl(48 + rng() * 20, 18 + rng() * 15, L - p * 0.6);
    g.beginPath(); g.arc(cx, cy, pr, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(120,125,105,0.35)';
    g.lineWidth = 0.7;
    g.beginPath(); g.arc(cx, cy, pr, a + 0.9, a + TAU - 0.9); g.stroke();
  }
  g.fillStyle = hsl(75, 35, 52);
  g.beginPath(); g.arc(0, 0, rad * 0.24, 0, TAU); g.fill();
  g.fillStyle = hsl(48, 75, 58);
  for (let k = 0; k < 9; k++) {
    const a = k * TAU / 9 + rng() * 0.3, d = rad * (0.28 + rng() * 0.16);
    g.beginPath(); g.arc(Math.cos(a) * d, Math.sin(a) * d, Math.max(0.6, rad * 0.06), 0, TAU); g.fill();
  }
  g.restore();
}

// Cherry spray in full blossom: dark twigs, umbels of 2-5 flowers on pedicels, buds and a few
// young leaves (more leaves when `leafy`).
function paintBlossom(g, r, s, rng, leafy) {
  const twigs = 3 + Math.floor(rng() * 3);
  const items = [];
  for (let k = 0; k < twigs; k++) {
    const bx = r.x + r.w * (0.5 + (rng() - 0.5) * 0.2), by = r.y + r.h * 0.985;
    const a0 = -Math.PI / 2 + ((k + 0.5) / twigs - 0.5) * 1.6 + (rng() - 0.5) * 0.3;
    const len = r.h * (0.5 + rng() * 0.42);
    const pts = twigPath(rng, bx, by, a0, len, (rng() - 0.5) * 0.9, 0.22, 10);
    strokeTwig(g, pts, 4.2 * s, 1.4 * s, hsl(12, 22, 15));
    const n = Math.floor(len / (24 * s));
    for (let i = 1; i <= n; i++) {
      const t = Math.min(1, i / n + (rng() - 0.5) * 0.08);
      const [x, y, a] = along(pts, t);
      // young leaves at the spur
      const nl = leafy ? 2 + Math.floor(rng() * 2) : (rng() < 0.45 ? 1 : 0);
      for (let q = 0; q < nl; q++) {
        const la = a + (rng() < 0.5 ? -1 : 1) * (0.5 + rng() * 0.9);
        const ll = (leafy ? 38 + rng() * 22 : 22 + rng() * 14) * s;
        if (leafFits(r, x, y, la, ll)) items.push({ type: 'leaf', x, y, a: la, l: ll, w: ll * 0.3 });
      }
      const nf = 2 + Math.floor(rng() * 4);
      for (let f = 0; f < nf; f++) {
        const pa = a + (rng() - 0.5) * 2.6;
        const pl = (8 + rng() * 14) * s;
        const fx = x + Math.cos(pa) * pl, fy = y + Math.sin(pa) * pl;
        const rad = (10 + rng() * 4.5) * s;
        if (!inside(fx - rad, fy - rad, r) || !inside(fx + rad, fy + rad, r)) continue;
        items.push({ type: 'ped', x, y, fx, fy });
        if (rng() < 0.12) items.push({ type: 'bud', x: fx, y: fy, rad: rad * 0.42 });
        else items.push({ type: 'fl', x: fx, y: fy, rad, rot: rng() * TAU, sq: 0.55 + rng() * 0.45, z: rng() });
      }
    }
  }
  // pedicels, then leaves, then flowers back to front
  g.lineWidth = 1.1 * s;
  for (const it of items) if (it.type === 'ped') { g.strokeStyle = hsl(80, 30, 34); g.beginPath(); g.moveTo(it.x, it.y); g.lineTo(it.fx, it.fy); g.stroke(); }
  for (const it of items) if (it.type === 'leaf') {
    const L = 30 + rng() * 10;
    leaf(g, it.x, it.y, it.a, it.l, it.w, hsl(82 + rng() * 10, 42, L), hsl(86, 40, L * 0.78), hsl(80, 30, L * 1.3, 0.5), 'ellip');
  }
  const fl = items.filter((it) => it.type === 'fl' || it.type === 'bud').sort((a, b) => (a.z ?? 0) - (b.z ?? 0));
  for (const it of fl) {
    if (it.type === 'bud') { g.fillStyle = hsl(345, 25, 86); g.beginPath(); g.arc(it.x, it.y, it.rad, 0, TAU); g.fill(); }
    else flower(g, it.x, it.y, it.rad, rng, it.rot, it.sq);
  }
}

// Elder spray: pinnate leaves (5-7 leaflets on a rachis); `flowers` adds viburnum lace-cap heads.
function paintBushSpray(g, r, s, rng, flowers) {
  const twigs = 4 + Math.floor(rng() * 2);
  const comp = [];
  for (let k = 0; k < twigs; k++) {
    const bx = r.x + r.w * (0.5 + (rng() - 0.5) * 0.15), by = r.y + r.h * 0.985;
    const a0 = -Math.PI / 2 + ((k + 0.5) / twigs - 0.5) * 1.7;
    const len = r.h * (0.45 + rng() * 0.35);
    const pts = twigPath(rng, bx, by, a0, len, (rng() - 0.5) * 0.6, 0.12, 10);
    strokeTwig(g, pts, 3.2 * s, 1.2 * s, hsl(32, 15, 25));
    for (let i = 2; i <= 5; i++) {
      const [x, y, a] = along(pts, i / 5);
      for (const side of [-1, 1]) comp.push([x, y, a + side * (0.7 + rng() * 0.5), (60 + rng() * 40) * s]);
    }
  }
  for (const [x, y, a, len] of comp) {
    const ex = x + Math.cos(a) * len, ey = y + Math.sin(a) * len;
    if (!inside(ex, ey, r)) continue;
    g.strokeStyle = hsl(70, 18, 26); g.lineWidth = 1.2 * s;
    g.beginPath(); g.moveTo(x, y); g.lineTo(ex, ey); g.stroke();
    const pairs = 2 + Math.floor(rng() * 2);
    const H = 92 + rng() * 18, Lb = 20 + rng() * 9, S = 24 + rng() * 12;
    for (let p = 0; p < pairs; p++) {
      const t = 0.3 + 0.6 * p / pairs;
      const px = x + Math.cos(a) * len * t, py = y + Math.sin(a) * len * t;
      for (const side of [-1, 1]) {
        const la = a + side * (0.95 + rng() * 0.3);
        const ll = (24 + rng() * 10) * s;
        if (leafFits(r, px, py, la, ll)) leaf(g, px, py, la, ll, ll * 0.33, hsl(H, S, Lb), hsl(H, S, Lb * 0.75), hsl(H, S, Lb * 1.4, 0.5), 'ellip');
      }
    }
    if (leafFits(r, ex, ey, a, 26 * s)) leaf(g, ex, ey, a + (rng() - 0.5) * 0.3, 28 * s, 9 * s, hsl(H, S, Lb), hsl(H, S, Lb * 0.75), null, 'ellip');
  }
  if (!flowers) return;
  const heads = 3 + Math.floor(rng() * 3);
  for (let h = 0; h < heads; h++) {
    const cx = r.x + r.w * (0.22 + rng() * 0.56), cy = r.y + r.h * (0.15 + rng() * 0.45);
    const R = (30 + rng() * 14) * s;
    // fertile centre: dense cream dots
    for (let i = 0; i < 70; i++) {
      const a = rng() * TAU, d = Math.sqrt(rng()) * R * 0.62;
      g.fillStyle = hsl(60, 25, 70 + rng() * 15);
      g.beginPath(); g.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.7, 1.6 * s, 0, TAU); g.fill();
    }
    // sterile rim flowers
    const n = 7 + Math.floor(rng() * 4);
    for (let i = 0; i < n; i++) {
      const a = i * TAU / n + rng() * 0.3;
      flower(g, cx + Math.cos(a) * R * 0.8, cy + Math.sin(a) * R * 0.56, (8 + rng() * 3) * s, rng, rng() * TAU, 0.7 + rng() * 0.3);
    }
  }
}

// ---------- public builders ----------

// Atlas layout in units of the 512-px cell at high quality (x, y, w, h).
const LAYOUT = {
  willowA: [0, 0, 1, 1], willowB: [1, 0, 1, 1], poplarA: [2, 0, 1, 1], poplarB: [3, 0, 1, 1],
  cherryA: [0, 1, 1, 1], cherryB: [1, 1, 1, 1], bushA: [2, 1, 1, 1], bushB: [3, 1, 1, 1],
  strandA: [0, 2, 0.375, 2], strandB: [0.375, 2, 0.375, 2], strandC: [0.75, 2, 0.375, 2], strandD: [1.125, 2, 0.375, 2],
  cherryC: [1.5, 2, 1, 1], willowC: [2.5, 2, 1, 1], poplarC: [1.5, 3, 1, 1], cherryD: [2.5, 3, 1, 1],
};

export function buildFoliageAtlas(renderer, rng, quality) {
  const cell = quality === 'low' ? 256 : 512;
  const s = cell / 512;
  const W = cell * 4, H = cell * 4;
  const c = makeCanvas(W, H);
  const g = c.getContext('2d');
  const regions = {};
  const t0 = performance.now();
  for (const [name, [cx, cy, cw, ch]] of Object.entries(LAYOUT)) {
    const r = { x: Math.round(cx * cell), y: Math.round(cy * cell), w: Math.round(cw * cell), h: Math.round(ch * cell) };
    // UV rect (v measured from the top row; DataTexture rows are not flipped)
    regions[name] = [r.x / W, r.y / H, (r.x + r.w) / W, (r.y + r.h) / H];
    if (name.startsWith('willow')) paintWillowSpray(g, r, s, rng, name === 'willowB');
    else if (name.startsWith('strand')) paintStrand(g, r, s, rng);
    else if (name.startsWith('poplar')) paintPoplarSpray(g, r, s, rng);
    else if (name.startsWith('cherry')) paintBlossom(g, r, s, rng, name === 'cherryB' || name === 'cherryD');
    else if (name === 'bushA') paintBushSpray(g, r, s, rng, false);
    else if (name === 'bushB') paintBushSpray(g, r, s, rng, true);
  }
  const t1 = performance.now();
  const tex = toTexture(renderer, c, { mean: [70, 78, 58] });
  return { tex, regions, canvas: c, ms: [t1 - t0, performance.now() - t1] };
}

// Fissured bark: interlacing ridges over dark furrows (tileable both ways). Returns albedo and a
// tangent-space normal map derived from the same height field.
export function buildBark(renderer, rng, quality) {
  const W = quality === 'low' ? 128 : 256, H = W * 2;
  const c = makeCanvas(W, H);
  const g = c.getContext('2d');
  g.fillStyle = '#262019';
  g.fillRect(0, 0, W, H);
  const s = W / 256;
  // Ridges: long lens shapes, drawn with 3x3 wrap so the tile is seamless.
  const ridges = Math.round(260);
  for (let i = 0; i < ridges; i++) {
    const x = rng() * W, y = rng() * H;
    const len = (40 + rng() * 120) * s, wid = (4 + rng() * 9) * s;
    const ang = Math.PI / 2 + (rng() - 0.5) * 0.35;
    const L = 30 + rng() * 34;
    const grad = g.createLinearGradient(-wid, 0, wid, 0);
    grad.addColorStop(0, hsl(30, 12, L * 0.55));
    grad.addColorStop(0.45, hsl(32, 10, L));
    grad.addColorStop(1, hsl(30, 12, L * 0.5));
    for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) {
      g.save();
      g.translate(x + ox * W, y + oy * H);
      g.rotate(ang - Math.PI / 2);
      g.fillStyle = grad;
      g.beginPath();
      g.moveTo(0, -len / 2);
      g.bezierCurveTo(wid * 1.3, -len * 0.2, wid * 1.3, len * 0.2, 0, len / 2);
      g.bezierCurveTo(-wid * 1.3, len * 0.2, -wid * 1.3, -len * 0.2, 0, -len / 2);
      g.fill();
      g.restore();
    }
  }
  // Cross cracks and lichen specks.
  for (let i = 0; i < 90; i++) {
    const x = rng() * W, y = rng() * H, l = (3 + rng() * 8) * s;
    g.strokeStyle = 'rgba(18,14,10,0.7)';
    g.lineWidth = (0.8 + rng()) * s;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + l, y + (rng() - 0.5) * 3); g.stroke();
  }
  for (let i = 0; i < 140; i++) {
    const x = rng() * W, y = rng() * H;
    g.fillStyle = rng() < 0.5 ? 'rgba(120,128,104,0.35)' : 'rgba(150,150,135,0.25)';
    g.beginPath(); g.arc(x, y, (0.8 + rng() * 2.4) * s, 0, TAU); g.fill();
  }
  const img = g.getImageData(0, 0, W, H).data;
  const height = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) height[i] = (img[i * 4] * 0.3 + img[i * 4 + 1] * 0.5 + img[i * 4 + 2] * 0.2) / 255;
  const nrm = new Uint8Array(W * H * 4);
  const k = 5.0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const hx = height[y * W + ((x + 1) % W)] - height[y * W + ((x - 1 + W) % W)];
      const hy = height[((y + 1) % H) * W + x] - height[((y - 1 + H) % H) * W + x];
      let nx = -hx * k, ny = hy * k, nz = 1;
      const l = Math.hypot(nx, ny, nz);
      const i = (y * W + x) * 4;
      nrm[i] = (nx / l * 0.5 + 0.5) * 255;
      nrm[i + 1] = (ny / l * 0.5 + 0.5) * 255;
      nrm[i + 2] = (nz / l * 0.5 + 0.5) * 255;
      nrm[i + 3] = 255;
    }
  }
  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  const normalMap = new THREE.DataTexture(nrm, W, H, THREE.RGBAFormat, THREE.UnsignedByteType);
  normalMap.wrapS = normalMap.wrapT = THREE.RepeatWrapping;
  normalMap.generateMipmaps = true;
  normalMap.minFilter = THREE.LinearMipmapLinearFilter;
  normalMap.magFilter = THREE.LinearFilter;
  normalMap.needsUpdate = true;
  return { map, normalMap, canvas: c };
}

// Distant tree silhouettes: 8 cells (1:2) - round crowns, a pair, willow mounds, poplars, a group.
export const FAR_CELLS = [
  { kind: 'round', w: 1 }, { kind: 'round', w: 1 }, { kind: 'pair', w: 1 }, { kind: 'mound', w: 1 },
  { kind: 'poplar', w: 1 }, { kind: 'poplar', w: 1 }, { kind: 'group', w: 1 }, { kind: 'mound', w: 1 },
];

function blobCrown(g, rng, cx, cy, rx, ry, n, rMin, rMax, lum) {
  for (let i = 0; i < n; i++) {
    const a = rng() * TAU, d = Math.sqrt(rng());
    const x = cx + Math.cos(a) * d * rx, y = cy + Math.sin(a) * d * ry;
    const rr = rMin + rng() * (rMax - rMin);
    // darker low in the crown, lighter top (sky light)
    const v = (y - (cy - ry)) / (2 * ry);
    g.fillStyle = hsl(110 + rng() * 30, 18 + rng() * 10, lum * (1.15 - 0.45 * v) * (0.85 + rng() * 0.3));
    g.beginPath(); g.arc(x, y, rr, 0, TAU); g.fill();
  }
}

export function buildFarAtlas(renderer, rng, quality) {
  const cw = quality === 'low' ? 128 : 256, ch = cw * 2;
  const W = cw * FAR_CELLS.length, H = ch;
  const c = makeCanvas(W, H);
  const g = c.getContext('2d');
  const s = cw / 256;
  const cells = [];
  FAR_CELLS.forEach((cell, i) => {
    const x0 = i * cw;
    cells.push([x0 / W, 0, (x0 + cw) / W, 1]);
    const trunk = (x, y0, y1, w) => {
      g.strokeStyle = hsl(30, 10, 10); g.lineWidth = w;
      g.beginPath(); g.moveTo(x, y1); g.lineTo(x + (rng() - 0.5) * 4 * s, y0); g.stroke();
    };
    if (cell.kind === 'round') {
      const cx = x0 + cw / 2, top = ch * (0.18 + rng() * 0.1);
      trunk(cx, ch * 0.6, ch, 9 * s);
      for (let k = 0; k < 5; k++) {
        const lx = cx + (rng() - 0.5) * cw * 0.35, ly = top + ch * (0.12 + rng() * 0.25);
        blobCrown(g, rng, lx, ly, cw * (0.2 + rng() * 0.12), ch * (0.1 + rng() * 0.06), 160, 5 * s, 13 * s, 22);
      }
    } else if (cell.kind === 'pair') {
      for (const f of [0.33, 0.68]) {
        const cx = x0 + cw * f;
        trunk(cx, ch * 0.65, ch, 7 * s);
        blobCrown(g, rng, cx, ch * (0.45 + rng() * 0.1), cw * 0.2, ch * 0.18, 260, 4 * s, 11 * s, 20);
      }
    } else if (cell.kind === 'mound') {
      const cx = x0 + cw / 2;
      trunk(cx, ch * 0.75, ch, 12 * s);
      blobCrown(g, rng, cx, ch * 0.7, cw * 0.44, ch * 0.2, 420, 4 * s, 12 * s, 20);
      // hanging fringe
      for (let k = 0; k < 60; k++) {
        const x = cx + (rng() - 0.5) * cw * 0.84, y = ch * (0.72 + rng() * 0.08);
        g.strokeStyle = hsl(115, 16, 16 + rng() * 6); g.lineWidth = (2 + rng() * 3) * s;
        g.beginPath(); g.moveTo(x, y); g.lineTo(x + (rng() - 0.5) * 3, y + ch * (0.08 + rng() * 0.12)); g.stroke();
      }
    } else if (cell.kind === 'poplar') {
      const cx = x0 + cw / 2;
      trunk(cx, ch * 0.8, ch, 6 * s);
      for (let k = 0; k < 520; k++) {
        const v = rng();
        const y = ch * (0.03 + 0.85 * v);
        const prof = Math.pow(Math.sin(Math.PI * Math.pow(Math.min(1, (y / ch - 0.03) / 0.85), 0.72)), 0.85);
        const x = cx + (rng() - 0.5) * 2 * cw * 0.15 * prof;
        g.fillStyle = hsl(115 + rng() * 20, 20, 13 + rng() * 9);
        g.beginPath(); g.arc(x, y, (3 + rng() * 6) * s * (0.5 + prof * 0.6), 0, TAU); g.fill();
      }
    } else {
      // group: a big round tree with a smaller one and a poplar behind
      const cx = x0 + cw / 2;
      for (let k = 0; k < 240; k++) {
        const y = ch * (0.08 + 0.6 * rng());
        const prof = Math.sin(Math.PI * Math.min(1, (y / ch - 0.08) / 0.6));
        g.fillStyle = hsl(118, 18, 14 + rng() * 6);
        g.beginPath(); g.arc(cx + cw * 0.22 + (rng() - 0.5) * cw * 0.16 * prof, y, (3 + rng() * 5) * s, 0, TAU); g.fill();
      }
      trunk(cx - cw * 0.1, ch * 0.7, ch, 8 * s);
      blobCrown(g, rng, cx - cw * 0.1, ch * 0.5, cw * 0.32, ch * 0.18, 300, 5 * s, 12 * s, 21);
      blobCrown(g, rng, cx + cw * 0.2, ch * 0.7, cw * 0.2, ch * 0.1, 120, 4 * s, 9 * s, 19);
    }
  });
  const tex = toTexture(renderer, c, { mean: [30, 40, 32] });
  return { tex, cells, canvas: c };
}
