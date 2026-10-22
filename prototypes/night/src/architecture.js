// Architecture module: the white mazanka on the hill, its yard (wattle fence with pots, well
// sweep, bench, woodpile, haystacks, cart), the pier on the pond, and the distant windmill,
// church and village. Merged geometry, few materials:
//   walls   (whitewash canvas texture + normal map)  layer 0, casts/receives shadows
//   thatch  (straw texture + normal map)             layer 0, casts/receives shadows
//   fringe  (alpha-tested straw ends under eaves)     LAYER_NO_REFLECT
//   props   (uber: wood, glass, candlelit panes, iron) layer 0, casts/receives shadows
//   detail  (uber, double-sided: withies, pots)       LAYER_NO_REFLECT, casts shadows
//   far     (uber, reduced fog, double-sided)         layer 0 + slowly turning windmill sails
// Debug params: arch=0 (skip), archstats=1 (per-mesh triangle log).
import * as THREE from 'three';
import { Builder, mat4 } from './architecture-geo.js';
import { makeWallTextures, makeThatchTextures, makeFringeTexture, makeGrainTexture } from './architecture-tex.js';
import { uberMaterial, wallMaterial, thatchMaterial, fringeMaterial } from './architecture-mat.js';
import { HUT, buildWallPieces, buildRoof, buildHutProps } from './architecture-hut.js';
import { buildFence, buildWell, buildPier, buildProps } from './architecture-yard.js';
import { buildWindmill, buildChurch, buildVillage } from './architecture-far.js';

export function build(ctx) {
  if (ctx.params.get('arch') === '0') return;
  const { scene, world, renderer } = ctx;
  const t0 = performance.now();
  const low = ctx.quality === 'low';
  const q = { low };
  const rng = ctx.rng(4242);
  const H = world.LAYOUT.hut;
  const hutM = mat4(H.x, world.YARD_Y, H.z, 0, H.rotY, 0);

  // Geometry.
  const wallB = new Builder(), thatchB = new Builder(), fringeB = new Builder();
  const propsB = new Builder(), detailB = new Builder(), farB = new Builder();
  const wallsInfo = buildWallPieces(q);
  for (const g of wallsInfo.pieces) wallB.add(g, hutM);
  const roof = buildRoof(q, rng);
  for (const g of roof.thatch) thatchB.add(g, hutM);
  fringeB.add(roof.fringe, hutM);
  const hutAdd = (geo, m, col, mat) => propsB.add(geo, m ? new THREE.Matrix4().multiplyMatrices(hutM, m) : hutM, col, mat);
  const hutProps = buildHutProps(q, rng, wallsInfo.O, wallsInfo.ops, roof, hutAdd);
  const fence = buildFence(ctx, propsB, detailB, q, rng);
  buildWell(ctx, propsB, q, rng);
  buildPier(ctx, propsB, q, rng);
  buildProps(ctx, propsB, detailB, thatchB, hutM, q, rng);
  const wm = buildWindmill(ctx, farB, rng);
  buildChurch(ctx, farB, rng);
  const village = buildVillage(ctx, farB, rng);
  const t1 = performance.now();

  // Textures.
  const tt = [performance.now()];
  const wallTex = makeWallTextures(renderer, low ? 512 : 1024, low ? 256 : 512, wallsInfo.tileU);
  tt.push(performance.now());
  const thatchTex = makeThatchTextures(renderer, low ? 256 : 512, ctx.rng(77));
  tt.push(performance.now());
  const fringeTex = makeFringeTexture(renderer, low ? 256 : 512, low ? 64 : 128, ctx.rng(78));
  tt.push(performance.now());
  const grainTex = makeGrainTexture(renderer, 128, 256);
  const t2 = performance.now();
  tt.push(t2);
  const texMs = tt.slice(1).map((t, i) => (t - tt[i]).toFixed(0)).join('/');

  // Materials + meshes.
  const wallMat = wallMaterial(ctx, wallTex);
  const thatchMat = thatchMaterial(thatchTex);
  const fringeMat = fringeMaterial(fringeTex);
  const propsMat = uberMaterial(ctx, grainTex);
  const detailMat = uberMaterial(ctx, grainTex, { side: THREE.DoubleSide, flipVert: true });
  const farMat = uberMaterial(ctx, null, { side: THREE.DoubleSide, far: 0.9 });
  const meshes = [];
  const mk = (b, mat, name, { cast = true, receive = true, layer = 0 } = {}) => {
    const mesh = new THREE.Mesh(b.build(), mat);
    mesh.name = name;
    mesh.castShadow = cast;
    mesh.receiveShadow = receive;
    if (layer) mesh.layers.set(layer);
    mesh.matrixAutoUpdate = false;
    mesh.updateMatrix();
    scene.add(mesh);
    meshes.push(mesh);
    return mesh;
  };
  mk(wallB, wallMat, 'hut-walls');
  mk(thatchB, thatchMat, 'hut-thatch');
  mk(fringeB, fringeMat, 'hut-fringe', { cast: false, layer: world.LAYER_NO_REFLECT });
  mk(propsB, propsMat, 'arch-props');
  mk(detailB, detailMat, 'arch-detail', { cast: !low, layer: world.LAYER_NO_REFLECT });
  mk(farB, farMat, 'arch-far', { cast: false, receive: false });

  const sails = new THREE.Mesh(wm.sails.build(), farMat);
  sails.name = 'windmill-sails';
  sails.position.copy(wm.hub);
  sails.rotation.set(-0.12, wm.yaw, 0.4, 'YXZ');
  scene.add(sails);
  meshes.push(sails);
  ctx.onUpdate((dt, t) => { sails.rotation.z = 0.4 + t * 0.045; });

  // Candle spill light from the bright window (no shadow), flickering with the panes.
  for (const l of hutProps.lights) {
    const light = new THREE.PointLight(new THREE.Color('#ffa24d'), 2.3, 8, 2);
    light.position.copy(l.pos).applyMatrix4(hutM);
    light.castShadow = false;
    scene.add(light);
    const base = light.intensity;
    ctx.onUpdate((dt, t) => {
      const tt = t + 0.4 * 37;
      light.intensity = base * (0.9 + 0.06 * Math.sin(tt * 7.3) + 0.04 * Math.sin(tt * 17.9) * Math.sin(tt * 3.1));
    });
  }

  // Walk colliders: the hut with its призьба.
  world.addBoxCollider(H.x, H.z, HUT.a + 0.62, HUT.b + 0.62, H.rotY);

  const t3 = performance.now();
  const tris = meshes.map((m) => [m.name, m.geometry.index.count / 3]);
  const total = tris.reduce((s, [, n]) => s + n, 0);
  console.log(`[arch] geometry ${(t1 - t0).toFixed(0)} ms, textures ${(t2 - t1).toFixed(0)} ms (wall/thatch/fringe/grain ${texMs}), meshes ${(t3 - t2).toFixed(0)} ms; ` +
    `${total} tris in ${meshes.length} meshes (${tris.map(([n, c]) => `${n}:${c}`).join(' ')}); pots ${fence.pots}, village huts ${village.huts} (${village.lit} lit windows)`);
  if (typeof window !== 'undefined') window.__arch = { meshes, wallTex, thatchTex };
}
