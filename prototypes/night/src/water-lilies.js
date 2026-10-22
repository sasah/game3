// A few young water-lily pads (May: leaves only, no flowers yet) in the sheltered shallows,
// away from the walkway, plus the scheduler for rings from fish rising.
import * as THREE from 'three';

export function buildLilies(ctx, ground) {
  const { world } = ctx;
  const L = world.LAYOUT;
  const rnd = ctx.rng(9001);
  const pier = L.pier;
  const centers = [];
  let guard = 0;
  while (centers.length < 4 && guard++ < 4000) {
    const x = -18 + rnd() * 36, z = -18 + rnd() * 24;
    const d = -ground.heightAt(x, z);
    if (d < 0.25 || d > 0.7) continue;
    if (Math.hypot(x - pier.x, z - (pier.z0 + pier.z1) / 2) < 7) continue;
    if (Math.hypot(x - L.start.x, z - L.start.z) < 9) continue;
    // Keep the mirror of the hut clear (seen from the south bank).
    if (x > -10 && x < 7 && z < -7) continue;
    if (centers.some((c) => Math.hypot(c[0] - x, c[1] - z) < 7)) continue;
    centers.push([x, z]);
  }
  const pads = [];
  for (const [cx, cz] of centers) {
    const n = 5 + Math.floor(rnd() * 6);
    let tries = 0;
    while (pads.length < 60 && tries++ < n * 30 && pads.filter((p) => p.c === cx).length < n) {
      const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * 1.6;
      const x = cx + Math.cos(a) * r, z = cz + Math.sin(a) * r;
      const rad = 0.09 + rnd() * 0.08;
      const d = -ground.heightAt(x, z);
      if (d < 0.12) continue;
      if (pads.some((p) => Math.hypot(p.x - x, p.z - z) < (p.rad + rad) * 0.95)) continue;
      pads.push({ x, z, rad, c: cx, rot: rnd() * Math.PI * 2, tone: rnd() });
    }
  }
  if (!pads.length) return null;

  const SEG = 18;
  const pos = [], col = [], nor = [], idx = [];
  const cA = new THREE.Color('#243418'), cB = new THREE.Color('#3a4a22'), cR = new THREE.Color('#4a3424');
  const tmp = new THREE.Color();
  for (const p of pads) {
    const base = pos.length / 3;
    const notch = 0.32 + rnd() * 0.12;   // V cut toward the stem
    const tiltX = (rnd() - 0.5) * 0.03, tiltZ = (rnd() - 0.5) * 0.03;
    tmp.copy(cA).lerp(cB, p.tone);
    pos.push(p.x, world.WATER_LEVEL + 0.012, p.z);
    col.push(tmp.r * 0.85, tmp.g * 0.85, tmp.b * 0.85);
    nor.push(0, 1, 0);
    for (let i = 0; i <= SEG; i++) {
      const t = i / SEG;
      const a = p.rot + notch / 2 + t * (Math.PI * 2 - notch);
      const wob = 1 + 0.05 * Math.sin(a * 3 + p.tone * 9) + 0.03 * Math.sin(a * 7 + p.tone * 4);
      const rr = p.rad * wob;
      const ex = Math.cos(a) * rr, ez = Math.sin(a) * rr;
      // Rim curls up a little and is slightly reddish (young leaves).
      pos.push(p.x + ex, world.WATER_LEVEL + 0.016 + ex * tiltX * 10 + ez * tiltZ * 10, p.z + ez);
      const rim = 0.25 + 0.25 * Math.sin(a * 2 + p.tone * 5);
      const c2 = tmp.clone().lerp(cR, rim * 0.5);
      col.push(c2.r, c2.g, c2.b);
      nor.push(-Math.cos(a) * 0.18, 1, -Math.sin(a) * 0.18);
    }
    for (let i = 0; i < SEG; i++) idx.push(base, base + 2 + i, base + 1 + i);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setIndex(idx);
  geo.computeBoundingSphere();
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.42, metalness: 0, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'lily-pads';
  mesh.receiveShadow = true;
  mesh.layers.set(world.LAYER_NO_REFLECT);
  ctx.scene.add(mesh);
  return { mesh, count: pads.length };
}

// Rings: each slot respawns on its own rhythm at a random open-water spot.
export function scheduleRings(ctx, ground, ringUniforms) {
  const { world } = ctx;
  const pier = world.LAYOUT.pier;
  const slots = ringUniforms.map((v, i) => ({ v, next: 1.5 + i * 2.7, rnd: ctx.rng(777 + i * 13) }));
  const spawn = (s, t) => {
    if (s.again) {
      // A second, smaller ring from the same fish.
      s.again = false;
      s.v.set(s.v.x, s.v.y, t, s.v.w * 0.6);
      s.next = t + 4 + s.rnd() * 9;
      return;
    }
    for (let k = 0; k < 40; k++) {
      const x = -15 + s.rnd() * 30, z = -15 + s.rnd() * 18;
      if (-ground.heightAt(x, z) < 0.5) continue;
      if (Math.abs(x - pier.x) < 1.5 && z > pier.z1 - 1) continue;
      s.v.set(x, z, t, 0.6 + s.rnd() * 0.6);
      s.again = s.rnd() < 0.3;
      s.next = t + (s.again ? 0.8 : 4 + s.rnd() * 9);
      return;
    }
    s.next = t + 2;
  };
  ctx.onUpdate((dt, t) => {
    for (const s of slots) if (t >= s.next) spawn(s, t);
  });
  // Shots start at t≈0: show one ring already spreading.
  if (ctx.params.has('shot')) spawn(slots[0], Number(ctx.params.get('t') || 0) - 1.6);
  if (ctx.params.has('wring')) {
    const [x, z] = ctx.params.get('wring').split(',').map(Number);
    slots[1].v.set(x, z, Number(ctx.params.get('t') || 0) - 1.2, 1);
    slots[1].next = 1e9;
  }
}
