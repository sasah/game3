// Procedural reed-bed card texture: two variants side by side (each 256 x 512), dozens of
// tapered, arching cattail/reed leaves painted with canvas 2D. Alpha marks the leaves; colour is
// the final albedo (sRGB), darker at the base, with lighter, slightly yellowed tips.
import * as THREE from 'three';

export function reedCardTexture(renderer, rng, size = 512) {
  const W = size, H = size, VW = W / 2;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  g.clearRect(0, 0, W, H);
  const R = (a, b) => a + (b - a) * rng();
  const px = size / 512;

  for (let v = 0; v < 2; v++) {
    const x0 = v * VW;
    const n = v === 0 ? 52 : 40;
    // Back leaves first (darker), front leaves last (lighter): fake depth inside the card.
    for (let i = 0; i < n; i++) {
      const depth = i / n;
      const bx = x0 + VW * 0.5 + (rng() - 0.5) * VW * 0.5;
      const len = H * (rng() < 0.35 ? R(0.3, 0.6) : R(0.55, 0.99)) * (v === 1 ? 0.92 : 1);
      let lean = R(-0.5, 0.5);
      let bend = Math.sign(lean || 1) * R(0.1, 1.3) * (rng() < 0.25 ? -0.4 : 1);
      const w0 = R(4.5, 9) * px;
      const steps = 18;
      // Integrate the centreline; shrink lean/bend until the leaf stays inside the variant.
      let pts;
      for (let attempt = 0; attempt < 6; attempt++) {
        pts = [];
        let x = bx, y = H + 2, ok = true;
        for (let s = 0; s <= steps; s++) {
          const t = s / steps;
          const a = lean + bend * Math.pow(t, 1.7);
          pts.push([x, y, a]);
          x += Math.sin(a) * len / steps;
          y -= Math.cos(a) * len / steps;
          if (x < x0 + 6 || x > x0 + VW - 6 || y < 4) ok = false;
        }
        if (ok) break;
        lean *= 0.6; bend *= 0.6;
      }
      const left = [], right = [];
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const [x, y, a] = pts[s];
        const w = w0 * (t < 0.68 ? 1 - 0.2 * t : (1 - t) / 0.32 * 0.864) * 0.5;
        const nx = Math.cos(a), ny = Math.sin(a);
        left.push([x - nx * w, y - ny * w]);
        right.push([x + nx * w, y + ny * w]);
      }
      const [tx, ty] = pts[steps];
      const grad = g.createLinearGradient(bx, H, tx, ty);
      const lum = R(0.55, 1.0) * (0.7 + 0.45 * depth);
      const hue = rng();
      const base = [26, 34, 24], mid = hue < 0.5 ? [70, 84, 56] : [62, 80, 66], tip = rng() < 0.3 ? [112, 112, 80] : [88, 100, 72];
      const col = (c3, k) => `rgb(${Math.round(c3[0] * k)},${Math.round(c3[1] * k)},${Math.round(c3[2] * k)})`;
      grad.addColorStop(0, col(base, 0.9));
      grad.addColorStop(0.35, col(mid, lum * 0.8));
      grad.addColorStop(1, col(tip, lum));
      g.fillStyle = grad;
      g.beginPath();
      g.moveTo(left[0][0], left[0][1]);
      for (let s = 1; s <= steps; s++) g.lineTo(left[s][0], left[s][1]);
      for (let s = steps; s >= 0; s--) g.lineTo(right[s][0], right[s][1]);
      g.closePath();
      g.fill();
      // Midrib highlight on some leaves: catches the moon on a real leaf.
      if (rng() < 0.5) {
        g.strokeStyle = `rgba(150,160,130,${0.18 * lum})`;
        g.lineWidth = 1 * px;
        g.beginPath();
        g.moveTo(pts[2][0], pts[2][1]);
        for (let s = 3; s < steps; s++) g.lineTo(pts[s][0], pts[s][1]);
        g.stroke();
      }
    }
  }

  // Harden the alpha a little (canvas antialiasing leaves soft fringes).
  const img = g.getImageData(0, 0, W, H);
  const d = img.data;
  for (let i = 3; i < d.length; i += 4) d[i] = d[i] > 90 ? 255 : Math.round(d[i] * 1.4);
  g.putImageData(img, 0, 0);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  return tex;
}
