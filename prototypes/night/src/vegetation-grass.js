// Meadow grass, May wildflowers, seed heads, reeds and cattails.
// - Grass/flowers/seed heads: camera-following instanced patches (vegetation-grass-patches.js),
//   placed on the exact terrain surface from baked fields (vegetation-grass-fields.js), animated
//   entirely in the vertex shader with the shared wind uniforms. Layer LAYER_NO_REFLECT, no shadows cast.
// - Reeds/cattails: one static merged mesh ringing the pond (vegetation-grass-reeds.js), layer 0,
//   casts shadows and shows in the water reflection.
import { bakeFields } from './vegetation-grass-fields.js';
import { buildPatches } from './vegetation-grass-patches.js';
import { buildReeds } from './vegetation-grass-reeds.js';

export async function build(ctx) {
  const t0 = performance.now();
  const fields = bakeFields(ctx);
  const t1 = performance.now();
  const patches = buildPatches(ctx, fields);
  for (const m of patches) ctx.scene.add(m);
  const reeds = buildReeds(ctx, fields);
  if (reeds) ctx.scene.add(reeds);
  const t2 = performance.now();

  // After every module has built (first frame), clear grass out of buildings / big props.
  let stamped = false;
  ctx.onUpdate(() => {
    if (stamped) return;
    stamped = true;
    fields.stampColliders(ctx.world.colliders);
  });

  let tris = 0;
  for (const m of patches) tris += m.userData.instances * m.userData.trisPerInstance;
  const reedTris = reeds ? reeds.geometry.index.count / 3 : 0;
  console.log(`[grass] fields ${(t1 - t0).toFixed(0)} ms, meshes ${(t2 - t1).toFixed(0)} ms; patch tris ${tris}, reed tris ${reedTris} (${patches.map((m) => m.name + ':' + m.userData.instances).join(' ')})`);
  if (ctx.params.has('vegtexdebug')) {
    // Show the painted atlases on screen (debug only).
    const imgs = [patches[2].material.userData.tex, reeds && reeds.material.userData.tex].filter(Boolean);
    imgs.forEach((t, i) => {
      const cv = t.image;
      cv.style.cssText = `position:fixed;left:${8 + i * 520}px;top:8px;width:512px;height:512px;z-index:99;background:#556;`;
      document.body.appendChild(cv);
    });
  }
  if (ctx.params.has('terrainmatte')) {
    // Debug experiment only (not used in normal runs): what the meadow looks like on a matte ground.
    const t = ctx.scene.getObjectByName('terrain');
    if (t) {
      t.material.onBeforeCompile = (sh) => {
        sh.fragmentShader = sh.fragmentShader.replace('#include <lights_physical_fragment>', '#include <lights_physical_fragment>\nmaterial.specularColor *= 0.2; material.specularF90 = 0.2;');
      };
      t.material.customProgramCacheKey = () => 'terrain-matte-test';
      t.material.needsUpdate = true;
    }
  }
  if (ctx.params.has('nopatches')) for (const m of patches) m.visible = false;
  if (ctx.params.has('noreeds') && reeds) reeds.visible = false;
  if (ctx.params.has('nograss')) {
    for (const m of patches) m.visible = false;
    if (reeds) reeds.visible = false;
  }
}
