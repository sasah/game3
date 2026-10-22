// Pond module: water surface with planar reflection, ground mist, fireflies, lily pads, fish rings.
// Debug params: water=0 (skip module), refl=0 (no reflection pass), mist=0, flies=0,
// reflScale=0.5, fireflies=N.
import { makeRippleTexture, makeNoiseTexture, bakeGround } from './water-maps.js';
import { buildSurface } from './water-surface.js';
import { buildMist } from './water-mist.js';
import { buildFireflies } from './water-fireflies.js';
import { buildLilies, scheduleRings } from './water-lilies.js';

export async function build(ctx) {
  if (ctx.params.get('water') === '0') return;
  if (ctx.params.get('wproxy') === '1') (await import('./water-debug.js')).buildProxies(ctx);
  const t0 = performance.now();
  const ground = bakeGround(ctx, { x0: -32, x1: 32, z0: -30, z1: 18 });
  const ripples = makeRippleTexture(128);
  const noise = makeNoiseTexture(128);
  const t1 = performance.now();
  const surface = buildSurface(ctx, ground, ripples, noise);
  const off = (k) => ctx.params.get(k) === '0';
  const mist = off('mist') ? { triangles: 0 } : buildMist(ctx, ground, noise);
  const flies = off('flies') ? { count: 0 } : buildFireflies(ctx);
  const lilies = buildLilies(ctx, ground);
  scheduleRings(ctx, ground, surface.uniforms.uRings.value);
  console.log(`[water] maps ${(t1 - t0).toFixed(0)} ms, ground ${ground.W}x${ground.H}, ` +
    `water ${surface.mesh.geometry.index.count / 3} tris, mist ${mist.triangles} tris, ` +
    `fireflies ${flies.count}, lily pads ${lilies ? lilies.count : 0}`);
  if (typeof window !== 'undefined') window.__water = { surface, mist, flies, lilies, ground };
}
