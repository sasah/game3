// Distant groves on the horizon hills: cylindrical billboards from the silhouette atlas, placed as
// field-edge tree lines, clumps around the village gardens, poplars by the church and willows on the
// low southern ground. Fog does the atmospheric blending; one draw call.
import * as THREE from 'three';
import { FAR_CELLS } from './vegetation-trees-tex.js';

export function buildFar(ctx, cells, material) {
  const { world, quality } = ctx;
  const L = world.LAYOUT;
  const rng = ctx.rng(7111);
  const hi = quality !== 'low';
  const pos = [], corner = [], size = [], uv = [], col = [], nrm = [], idx = [];
  const kinds = {};
  FAR_CELLS.forEach((c, i) => { (kinds[c.kind] = kinds[c.kind] || []).push(i); });

  const v = L.village;
  const blocked = (x, z) => {
    if (Math.hypot(x - L.windmill.x, z - L.windmill.z) < 13) return true;
    if (Math.hypot(x - L.church.x, z - L.church.z) < 13) return true;
    if (x > v.x0 - 3 && x < v.x1 + 3 && z > v.z0 - 3 && z < v.z1 + 3) return true;
    return Math.hypot(x - L.bounds.cx, z - L.bounds.cz) < 50;
  };
  let count = 0;
  function tree(x, z, kind, h) {
    if (blocked(x, z)) return;
    const list = kinds[kind];
    const ci = list[Math.floor(rng() * list.length) % list.length];
    const [u0, v0, u1, v1] = cells[ci];
    const flip = rng() < 0.5;
    const y = world.heightAt(x, z) - 0.6;
    const w = h * 0.5 * (0.9 + rng() * 0.3);
    const base = pos.length / 3;
    const tint = 0.75 + rng() * 0.35;
    for (const [cx, cy] of [[-0.5, 0], [0.5, 0], [-0.5, 1], [0.5, 1]]) {
      pos.push(x, y, z);
      corner.push(cx, cy);
      size.push(w, h, rng());
      const uu = (cx + 0.5) * (flip ? -1 : 1) + (flip ? 1 : 0);
      uv.push(u0 + (u1 - u0) * uu, cy === 0 ? v1 : v0);
      col.push(0.62 * tint, 0.7 * tint, 0.66 * tint);
      nrm.push(0, 1, 0);
    }
    idx.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
    count++;
  }
  const B = L.bounds;
  const polar = (ang, r) => [B.cx + Math.sin(ang) * r, B.cz - Math.cos(ang) * r];

  // Tree lines along field edges and clumps on the hills.
  const nClusters = hi ? 30 : 22;
  for (let c = 0; c < nClusters; c++) {
    const ang = (c + rng() * 0.8) / nClusters * Math.PI * 2;
    // Keep the sky behind the hut and its poplars clear: groves there stand farther off.
    const north = Math.abs(Math.atan2(Math.sin(ang), Math.cos(ang))) < 0.55;
    const r = north ? 88 + rng() * 40 : 56 + rng() * 70;
    const [cx, cz] = polar(ang, r);
    const line = rng() < 0.55;
    const n = Math.round((line ? 6 + rng() * 9 : 3 + rng() * 6) * (hi ? 1 : 0.75));
    const dir = rng() * Math.PI;
    const spread = line ? 7 + rng() * 6 : 2.5 + rng() * 2;
    for (let i = 0; i < n; i++) {
      let x, z;
      if (line) {
        const t = (i - n / 2) * spread * 0.55 + (rng() - 0.5) * 2;
        x = cx + Math.cos(dir) * t + (rng() - 0.5) * 2.5;
        z = cz + Math.sin(dir) * t + (rng() - 0.5) * 2.5;
      } else {
        const a = rng() * Math.PI * 2, d = Math.sqrt(rng()) * spread * 2.2;
        x = cx + Math.cos(a) * d; z = cz + Math.sin(a) * d;
      }
      const k = rng();
      const kind = k < 0.45 ? 'round' : k < 0.62 ? 'pair' : k < 0.78 ? 'group' : k < 0.9 ? 'poplar' : 'mound';
      const h = kind === 'poplar' ? 14 + rng() * 6 : 8 + rng() * 5;
      tree(x, z, kind, h);
    }
  }
  // Village gardens: cherry/orchard clumps and a few poplars around the houses.
  for (let i = 0; i < (hi ? 26 : 18); i++) {
    const side = rng();
    let x, z;
    if (side < 0.45) { x = v.x0 - 6 + rng() * (v.x1 - v.x0 + 12); z = v.z0 - 4 - rng() * 9; }
    else if (side < 0.7) { x = v.x0 - 4 - rng() * 8; z = v.z0 + rng() * (v.z1 - v.z0); }
    else { x = v.x1 + 4 + rng() * 8; z = v.z0 + rng() * (v.z1 - v.z0); }
    const p = rng() < 0.22;
    tree(x, z, p ? 'poplar' : rng() < 0.5 ? 'round' : 'pair', p ? 16 + rng() * 6 : 7 + rng() * 4);
  }
  // Poplars standing by the church.
  for (let i = 0; i < 4; i++) {
    const a = -1.2 + i * 0.8 + (rng() - 0.5) * 0.3;
    tree(L.church.x + Math.cos(a) * (15 + rng() * 3), L.church.z + Math.sin(a) * (15 + rng() * 3), 'poplar', 19 + rng() * 6);
  }
  // Willows along the low wet ground to the south (dark against the moonlit sky).
  for (let i = 0; i < (hi ? 16 : 11); i++) {
    const ang = Math.PI * (0.55 + 0.9 * (i + rng() * 0.7) / 16);
    const [x, z] = polar(ang, 58 + rng() * 22);
    tree(x, z, rng() < 0.6 ? 'mound' : 'round', 8 + rng() * 5);
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aCorner', new THREE.Float32BufferAttribute(corner, 2));
  g.setAttribute('aSize', new THREE.Float32BufferAttribute(size, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setIndex(idx);
  const mesh = new THREE.Mesh(g, material);
  mesh.frustumCulled = false;
  mesh.name = 'trees-far';
  mesh.matrixAutoUpdate = false;
  return { mesh, count };
}
