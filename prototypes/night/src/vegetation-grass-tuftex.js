// Procedural grass-tuft atlas for the mid-distance meadow: 2 x 2 variants, each a tuft of curved,
// tapered blades (plus the odd seed stalk) painted with canvas 2D. Alpha marks the blades; colour
// is an albedo ramp (dark, occluded base -> lighter tips, some silvery or straw tips).
import * as THREE from 'three';

export function grassTuftTexture(renderer, rng, size = 512) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  g.clearRect(0, 0, size, size);
  const V = size / 2;
  const R = (a, b) => a + (b - a) * rng();
  const k = size / 512;
  const col = (c3, m) => `rgb(${Math.round(Math.min(255, c3[0] * m))},${Math.round(Math.min(255, c3[1] * m))},${Math.round(Math.min(255, c3[2] * m))})`;

  for (let v = 0; v < 4; v++) {
    const x0 = (v % 2) * V, y0 = Math.floor(v / 2) * V;
    g.save();
    g.beginPath(); g.rect(x0, y0, V, V); g.clip();
    const n = Math.round(R(22, 30));
    for (let i = 0; i < n; i++) {
      const depth = i / n;
      const bx = x0 + V * 0.5 + (rng() - 0.5) * V * (0.35 + 0.4 * rng());
      const by = y0 + V + 1;
      const len = V * R(0.35, 0.97);
      let lean = R(-0.55, 0.55);
      let bend = Math.sign(lean || 1) * R(0.1, 1.4);
      const w0 = R(5, 10) * k;
      const steps = 12;
      let pts;
      for (let attempt = 0; attempt < 6; attempt++) {
        pts = [];
        let x = bx, y = by, ok = true;
        for (let s = 0; s <= steps; s++) {
          const t = s / steps;
          const a = lean + bend * t * t;
          pts.push([x, y, a]);
          x += Math.sin(a) * len / steps;
          y -= Math.cos(a) * len / steps;
          if (x < x0 + 4 || x > x0 + V - 4 || y < y0 + 3) ok = false;
        }
        if (ok) break;
        lean *= 0.6; bend *= 0.6;
      }
      const left = [], right = [];
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const [x, y, a] = pts[s];
        const w = w0 * (1 - Math.pow(t, 2.2)) * 0.5;
        const nx = Math.cos(a), ny = Math.sin(a);
        left.push([x - nx * w, y - ny * w]);
        right.push([x + nx * w, y + ny * w]);
      }
      const [tx, ty] = pts[steps];
      const grad = g.createLinearGradient(bx, by, tx, ty);
      const lum = R(0.6, 1.05) * (0.75 + 0.4 * depth);
      const r = rng();
      const tip = r < 0.12 ? [150, 146, 112] : r < 0.4 ? [128, 150, 130] : r < 0.7 ? [104, 132, 74] : [86, 118, 66];
      grad.addColorStop(0, col([22, 34, 20], 1));
      grad.addColorStop(0.45, col([52, 76, 44], lum));
      grad.addColorStop(1, col(tip, lum));
      g.fillStyle = grad;
      g.beginPath();
      g.moveTo(left[0][0], left[0][1]);
      for (let s = 1; s <= steps; s++) g.lineTo(left[s][0], left[s][1]);
      for (let s = steps; s >= 0; s--) g.lineTo(right[s][0], right[s][1]);
      g.closePath();
      g.fill();
    }
    // A seed stalk or two on some variants.
    if (v % 2 === 1) {
      for (let i = 0; i < 2; i++) {
        const bx = x0 + V * R(0.35, 0.65), top = y0 + V * R(0.05, 0.2);
        g.strokeStyle = col([90, 96, 70], 1);
        g.lineWidth = 2 * k;
        g.beginPath(); g.moveTo(bx, y0 + V); g.quadraticCurveTo(bx + R(-12, 12) * k, (top + y0 + V) / 2, bx + R(-20, 20) * k, top); g.stroke();
      }
    }
    g.restore();
  }

  const img = g.getImageData(0, 0, size, size);
  const d = img.data;
  for (let i = 3; i < d.length; i += 4) d[i] = d[i] > 90 ? 255 : Math.round(d[i] * 1.4);
  g.putImageData(img, 0, 0);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  return tex;
}
