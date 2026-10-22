// Trees: gnarled pond willows (weeping and pollarded верба), Lombardy poplars behind the hut, the
// cherry orchard in full May blossom, elder / guelder-rose bushes and distant groves on the hills.
// - Skeletons are grown procedurally from world.LAYOUT (seeded), turned into smooth tapered bark
//   tubes and alpha-tested foliage cards / hanging strands (vegetation-trees-geo/-species.js).
// - Everything is merged per material into a handful of meshes: bark + foliage for the north group
//   (hut hill, poplars, orchard) and the pond group (willows), fine twigs and bushes on
//   LAYER_NO_REFLECT, and one billboard mesh for the far groves.
// - Wind lives in the vertex shaders (vegetation-trees-mat.js); the moon shadow uses matching
//   alpha-tested depth materials.
// Debug params: trees=0 (skip), treetex=1 (show atlases), treefar=0, treebush=0.
import * as THREE from 'three';
import { buildFoliageAtlas, buildBark, buildFarAtlas } from './vegetation-trees-tex.js';
import { makeBarkMaterial, makeFoliageMaterial, makeFarMaterial } from './vegetation-trees-mat.js';
import { BarkBuilder, FolBuilder, TAU } from './vegetation-trees-geo.js';
import { poplar, cherry, willowPollard, willowWeeping, bush } from './vegetation-trees-species.js';
import { buildFar } from './vegetation-trees-far.js';

function towardWater(world, x, z) {
  const e = 0.5;
  const gx = world.pondDist(x + e, z) - world.pondDist(x - e, z);
  const gz = world.pondDist(x, z + e) - world.pondDist(x, z - e);
  const l = Math.hypot(gx, gz) || 1;
  return [-gx / l, 0, -gz / l];
}

// Nearest spot to (x0, z0) passing `test` (spiral search), or null.
function relocate(x0, z0, test, R = 4.5) {
  if (test(x0, z0)) return [x0, z0];
  for (let r = 0.2; r <= R; r += 0.2) {
    for (let a = 0; a < TAU; a += 0.12) {
      const x = x0 + Math.cos(a) * r, z = z0 + Math.sin(a) * r;
      if (test(x, z)) return [x, z];
    }
  }
  return null;
}

export async function build(ctx) {
  if (ctx.params.get('trees') === '0') return;
  const { world, quality, params } = ctx;
  const L = world.LAYOUT;
  const hi = quality !== 'low';
  const t0 = performance.now();

  const atlas = buildFoliageAtlas(ctx.renderer, ctx.rng(7001), quality);
  const barkTex = buildBark(ctx.renderer, ctx.rng(7002), quality);
  const farAtlas = buildFarAtlas(ctx.renderer, ctx.rng(7003), quality);
  const t1 = performance.now();

  const H = L.hut;
  const hc = Math.cos(H.rotY), hs = Math.sin(H.rotY);
  const inHut = (x, z, m) => {
    const dx = x - H.x, dz = z - H.z;
    const lx = dx * hc - dz * hs, lz = dx * hs + dz * hc;
    return Math.abs(lx) < H.width / 2 + m && Math.abs(lz) < H.depth / 2 + m;
  };
  const fenceDist = (x, z) => {
    let best = Infinity;
    const f = L.fence;
    for (let i = 0; i < f.length - 1; i++) {
      const a = f[i], b = f[i + 1];
      if (!a || !b) continue;
      const vx = b[0] - a[0], vz = b[1] - a[1];
      const t = Math.max(0, Math.min(1, ((x - a[0]) * vx + (z - a[1]) * vz) / (vx * vx + vz * vz)));
      best = Math.min(best, Math.hypot(x - a[0] - vx * t, z - a[1] - vz * t));
    }
    return best;
  };

  const groups = { N: { bark: new BarkBuilder(), fol: new FolBuilder() }, P: { bark: new BarkBuilder(), fol: new FolBuilder() } };
  const twig = new BarkBuilder(), folNR = new FolBuilder();
  const q = hi ? 1 : 0.62, qd = hi ? 1 : 0.72;
  const kit = (g) => ({ bark: groups[g].bark, fol: groups[g].fol, twig, folNR, R: atlas.regions, hi, q, qd, world });
  const placed = []; // {x, z, r}
  const log = { willow: 0, poplar: 0, cherry: 0, bush: 0, strands: 0, moved: [] };

  // Willows on the shore, kept off the path.
  const weepingIdx = new Set([1, 2, 4]);
  L.willows.forEach(([wx, wz], i) => {
    const p = relocate(wx, wz, (x, z) => world.distToPath(x, z) >= 2.1 && world.pondDist(x, z) >= 1.05 && world.pondDist(x, z) < 1.3 && world.heightAt(x, z) > 0.15);
    if (!p) return;
    if (p[0] !== wx || p[1] !== wz) log.moved.push(`willow ${wx},${wz}->${p[0].toFixed(1)},${p[1].toFixed(1)}`);
    const rng = ctx.rng(7100 + i * 31);
    const dir = towardWater(world, p[0], p[1]);
    const g = p[1] < -17 ? 'N' : 'P';
    const res = weepingIdx.has(i) ? willowWeeping(kit(g), p[0], p[1], rng, dir) : willowPollard(kit(g), p[0], p[1], rng, dir);
    world.addCircleCollider(p[0], p[1], res.r);
    placed.push({ x: p[0], z: p[1], r: 3 });
    log.willow++;
    log.strands += res.strands || 0;
  });

  // Lombardy poplars behind the hut.
  L.poplars.forEach(([x, z], i) => {
    if (inHut(x, z, 1.0)) return;
    const res = poplar(kit('N'), x, z, ctx.rng(7200 + i * 17));
    world.addCircleCollider(x, z, res.r);
    placed.push({ x, z, r: 2 });
    log.poplar++;
  });

  // Cherries: the two by the hut front and the orchard east of the yard.
  const cherryOk = (x, z) => world.distToPath(x, z) >= 1.9 && !inHut(x, z, 1.4) && world.heightAt(x, z) > 0.3 && fenceDist(x, z) > 0.45 &&
    placed.every((p) => Math.hypot(p.x - x, p.z - z) > 2.4);
  L.frontCherries.forEach(([cx, cz], i) => {
    // Stay on the same side of the front fence as specified.
    const p = relocate(cx, cz, (x, z) => cherryOk(x, z) && (z < -20) === (cz < -20));
    if (!p) return;
    if (p[0] !== cx || p[1] !== cz) log.moved.push(`cherry ${cx},${cz}->${p[0].toFixed(1)},${p[1].toFixed(1)}`);
    const res = cherry(kit('N'), p[0], p[1], ctx.rng(7300 + i * 13), { scale: 1.05 + 0.1 * i });
    world.addCircleCollider(p[0], p[1], res.r);
    placed.push({ x: p[0], z: p[1], r: 2 });
    log.cherry++;
  });
  {
    const O = L.orchard;
    const orng = ctx.rng(7350);
    const cols = 3, rows = 4;
    const spots = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = O.x0 + 1.6 + (O.x1 - O.x0 - 2.4) * (c + 0.5) / cols + (orng() - 0.5) * 1.3 + (r % 2 ? 0.6 : -0.3);
        const z = O.z0 + 0.9 + (O.z1 - O.z0 - 1.4) * (r + 0.5) / rows + (orng() - 0.5) * 1.1;
        spots.push([x, z]);
      }
    }
    for (let i = spots.length - 1; i > 0; i--) { const j = Math.floor(orng() * (i + 1)); [spots[i], spots[j]] = [spots[j], spots[i]]; }
    let n = 0;
    for (const [sx, sz] of spots) {
      if (n >= O.count) break;
      const p = relocate(sx, sz, (x, z) => cherryOk(x, z) && x > O.x0 + 0.9 && x < O.x1 && z > O.z0 && z < O.z1 + 0.5, 1.2);
      if (!p) continue;
      const res = cherry(kit('N'), p[0], p[1], ctx.rng(7400 + n * 19));
      world.addCircleCollider(p[0], p[1], res.r);
      placed.push({ x: p[0], z: p[1], r: 1.6 });
      n++;
      log.cherry++;
    }
  }

  // Elder and guelder-rose (калина, in flower) by the fence and on the shore.
  if (params.get('treebush') !== '0') {
    const cands = [
      [-11.0, -18.6, 1], [-6.2, -18.7, 0], [-14.5, -25.5, 0], [-4.5, -33.4, 1], [-15.0, -31.0, 0],
      [-13.8, 0.6, 1], [-19.6, -7.5, 0], [12.4, 6.6, 0], [-8.5, 8.6, 1], [19.5, -8.0, 1], [-9.0, 5.2, 0],
    ];
    const pier = L.pier;
    const ok = (x, z) => world.pondDist(x, z) >= 1.12 && world.distToPath(x, z) >= 2.4 && !inHut(x, z, 1.5) && fenceDist(x, z) > 0.7 &&
      world.heightAt(x, z) > 0.2 && Math.hypot(x - L.start.x, z - L.start.z) > 4.5 &&
      !(Math.abs(x - pier.x) < 2.2 && z > pier.z1 - 1 && z < pier.z0 + 3) &&
      placed.every((p) => Math.hypot(p.x - x, p.z - z) > p.r + 0.9);
    cands.forEach(([bx, bz, flowering], i) => {
      const p = relocate(bx, bz, ok, 2.5);
      if (!p) return;
      const res = bush(kit(bz < -17 ? 'N' : 'P'), p[0], p[1], ctx.rng(7500 + i * 7), !!flowering);
      world.addCircleCollider(p[0], p[1], res.r);
      placed.push({ x: p[0], z: p[1], r: 1.2 });
      log.bush++;
    });
  }
  const t2 = performance.now();

  // Materials and meshes.
  const barkM = makeBarkMaterial(ctx, barkTex);
  const folM = makeFoliageMaterial(ctx, atlas.tex, { a2c: hi });
  const meshes = [];
  const tri = {};
  const add = (b, m, name, layer, cast) => {
    tri[name] = b.tris;
    if (!b.tris) return;
    const mesh = new THREE.Mesh(b.geometry(), m.mat);
    mesh.name = name;
    mesh.castShadow = cast;
    mesh.receiveShadow = true;
    mesh.customDepthMaterial = m.depth;
    mesh.matrixAutoUpdate = false;
    mesh.layers.set(layer);
    ctx.scene.add(mesh);
    meshes.push(mesh);
  };
  add(groups.N.bark, barkM, 'trees-bark-north', 0, true);
  add(groups.P.bark, barkM, 'trees-bark-pond', 0, true);
  add(groups.N.fol, folM, 'trees-foliage-north', 0, true);
  add(groups.P.fol, folM, 'trees-foliage-pond', 0, true);
  add(twig, barkM, 'trees-twigs', world.LAYER_NO_REFLECT, false);
  add(folNR, folM, 'trees-bushes', world.LAYER_NO_REFLECT, true);

  let farCount = 0;
  if (params.get('treefar') !== '0') {
    const far = buildFar(ctx, farAtlas.cells, makeFarMaterial(ctx, farAtlas.tex));
    ctx.scene.add(far.mesh);
    meshes.push(far.mesh);
    tri['trees-far'] = far.mesh.geometry.index.count / 3;
    farCount = far.count;
  }
  const t3 = performance.now();

  const total = Object.values(tri).reduce((a, b) => a + b, 0);
  console.log(`[trees] tex ${(t1 - t0).toFixed(0)} ms (atlas paint ${atlas.ms[0].toFixed(0)} + bleed ${atlas.ms[1].toFixed(0)}), skeletons ${(t2 - t1).toFixed(0)} ms, meshes ${(t3 - t2).toFixed(0)} ms; ` +
    `willows ${log.willow} (strands ${log.strands}), poplars ${log.poplar}, cherries ${log.cherry}, bushes ${log.bush}, far ${farCount}; ` +
    `meshes ${meshes.length}, tris ${total} (${Object.entries(tri).map(([k, v]) => k.replace('trees-', '') + ':' + v).join(' ')})` +
    (log.moved.length ? '; moved ' + log.moved.join(', ') : ''));

  if (params.has('treetex')) {
    [atlas.canvas, barkTex.canvas, farAtlas.canvas].forEach((cv, i) => {
      cv.style.cssText = `position:fixed;left:${8 + i * 330}px;top:8px;width:320px;height:${i === 2 ? 80 : 320}px;z-index:99;background:#456;`;
      document.body.appendChild(cv);
    });
  }
  if (typeof window !== 'undefined') window.__trees = { meshes, tri, atlas, log };
}
