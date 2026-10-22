// Species generators for the trees module. Each grows a seeded skeleton (trunk -> limbs -> shoots /
// twigs), emits bark tubes into S.bark (reflected) or S.twig (fine twigs, main view only) and foliage
// cards / strands into S.fol (or S.folNR for bushes). S: { bark, twig, fol, folNR, R (atlas
// regions), hi, q (count scale), qd (card density), world }.
import { noise2 } from './noise.js';
import {
  TAU, add, sub, mul, madd, norm, vlen, dot, cross, lerp3, deviate, dirAz, randPerp, grow, at, treeInfo,
} from './vegetation-trees-geo.js';

// Bark tints (linear multipliers on the shared bark texture).
const BARK = {
  willow: [0.92, 0.86, 0.76],
  poplar: [0.8, 0.8, 0.76],
  cherry: [0.34, 0.31, 0.3],
  elder: [0.85, 0.8, 0.7],
};
// Foliage tints (multipliers on the painted atlas).
const FOL = {
  willow: [0.8, 0.88, 0.84],
  strand: [0.78, 0.88, 0.8],
  poplar: [0.5, 0.6, 0.55],
  blossom: [0.88, 0.88, 0.86],
  bush: [0.95, 1.05, 0.95],
};
const GOLDEN = 2.39996;
const sstep = (e0, e1, x) => { const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
const pick = (R, names, rng) => R[names[Math.floor(rng() * names.length) % names.length]];
const horiz = (v) => { const l = Math.hypot(v[0], v[2]) || 1; return [v[0] / l, 0, v[2] / l]; };

// Orientation for a card lying roughly on the crown surface: facing outward (with scatter), its up
// axis the world up projected into the card plane and rolled a little. Returns [U, Nc].
function tangentFrame(rng, out, scatter = 0.5, roll = 0.9) {
  const Nc = norm(add(out, [(rng() - 0.5) * scatter * 2, (rng() - 0.5) * scatter * 2, (rng() - 0.5) * scatter * 2]));
  let U = add([0, 1, 0], mul(Nc, -Nc[1]));
  if (vlen(U) < 0.15) U = add([1, 0, 0], mul(Nc, -Nc[0]));
  U = norm(U);
  const r = (rng() - 0.5) * 2 * roll;
  const V = cross(Nc, U);
  return [norm(add(mul(U, Math.cos(r)), mul(V, Math.sin(r)))), Nc];
}

// Close the top of a trunk with a rounded, knobbly head (pollard).
function capDome(br, k = 1) {
  const n = br.pts.length;
  const d = norm(sub(br.pts[n - 1], br.pts[n - 2]));
  const rl = br.rad[n - 1];
  for (const [f, rf] of [[0.3, 0.93], [0.55, 0.75], [0.72, 0.45]]) {
    br.pts.push(madd(br.pts[n - 1], d, rl * f * k));
    br.rad.push(rl * rf);
    br.s.push(br.s[n - 1] + rl * f * k);
    br.sway.push(br.sway[n - 1]);
  }
}

// ---------------------------------------------------------------- Lombardy poplar
// A dense, dark flame-shaped column: steep branches hugging the trunk give the structure seen in the
// gaps, and the crown volume is filled with upward-pointing sprays (so it never reads as fir tiers).
export function poplar(S, x, z, rng) {
  const y0 = S.world.heightAt(x, z) - 0.25;
  const H = 18.5 + rng() * 6.5;
  const tree = treeInfo([x, y0, z], rng(), H, 0.3 + rng() * 0.12);
  const r0 = 0.26 + rng() * 0.08;
  const trunkL = H * 0.93;
  const trunk = grow(rng, [x, y0, z], [(rng() - 0.5) * 0.05, 1, (rng() - 0.5) * 0.05], trunkL,
    { step: 1.0, wob: 0.05, r0, r1: 0.02, taper: 0.8, phase: rng() });
  S.bark.tube(trunk, tree, { seg: S.hi ? 12 : 8, gnarl: 0.08, twist: 0.2, flare: 0.6, col: BARK.poplar, moss: 0.35 });

  const hb = 1.3 + rng() * 1.3;
  const Rmax = H * (0.08 + rng() * 0.02);
  // Crown radius over relative crown height t: full low down, widest near a third, flame tip.
  const pseed = rng() * 50;
  const prof = (t) => Rmax * Math.pow(Math.max(0, Math.sin(Math.PI * Math.pow(Math.min(1, Math.max(0, t)), 0.62))), 0.7) *
    (1 + 0.16 * noise2(t * 5.5, pseed) + 0.08 * noise2(t * 13, pseed + 7));
  const lobeA = rng() * TAU;
  const crown = { c: [x, y0 + hb + (H - hb) * 0.42, z], r: [Rmax * 1.05, (H - hb) * 0.6, Rmax * 1.05], k: 0.8 };
  const fol = [0.55, 0, 0.55];
  const regs = ['poplarA', 'poplarB', 'poplarC'];
  const branches = [];
  const nB = Math.round((30 + rng() * 8) * S.q);
  let az = rng() * TAU;
  for (let i = 0; i < nB; i++) {
    const t = Math.min(0.95, (i + 0.25 + rng() * 0.6) / nB);
    const h = hb + (trunkL - hb - 0.8) * t;
    const a = at(trunk, h / trunkL);
    az += GOLDEN + (rng() - 0.5) * 0.7;
    const tc = (h - hb) / (H - hb);
    const pol = 0.2 + (1 - tc) * 0.22 + rng() * 0.12;
    const reach = Math.max(0.25, prof(tc + 0.08) - 0.4) * (0.7 + rng() * 0.4);
    const L = Math.min(reach / Math.sin(pol), (y0 + H - a.p[1]) * 1.02);
    if (L < 0.6) continue;
    const d = dirAz(pol, az);
    const br = grow(rng, madd(a.p, d, -a.r * 0.4), d, L,
      { step: 0.7, trop: 0.08, wob: 0.35, r0: Math.min(a.r * 0.5, 0.022 + 0.045 * (1 - tc)), r1: 0.006, sway0: a.sway, swayGain: 0.045, phase: rng() });
    S.bark.tube(br, tree, { seg: S.hi ? 5 : 4, col: BARK.poplar });
    branches.push(br);
  }
  // Fill the column: attach each spray to the nearest branch point (for its sway), pointing up.
  const nCards = Math.round(900 * S.q);
  const sizeK = Math.pow(1 / S.q, 0.35);
  for (let i = 0; i < nCards; i++) {
    const tc = Math.pow(rng(), 0.9) * 0.97;
    const y = y0 + hb + (H - hb) * tc - 0.4;
    const R = prof(tc);
    const u = Math.pow(rng(), 0.55);
    const caz = rng() * TAU;
    const tA = Math.min(1, (y - y0) / trunkL);
    const ta = at(trunk, tA);
    const lobe = 1 + 0.14 * Math.cos(caz - lobeA - tc * 3.0) + 0.08 * noise2(Math.cos(caz) * 2 + pseed, tc * 7);
    const ox = Math.cos(caz) * R * u * 0.82 * lobe, oz = Math.sin(caz) * R * u * 0.82 * lobe;
    const A = [ta.p[0] + ox, y, ta.p[2] + oz];
    const out = [Math.cos(caz), 0, Math.sin(caz)];
    const U = norm(add([0, 1, 0], [out[0] * (0.15 + 0.45 * u) + (rng() - 0.5) * 0.5, 0, out[2] * (0.15 + 0.45 * u) + (rng() - 0.5) * 0.5]));
    const w = (0.75 + rng() * 0.45) * (1 - 0.35 * tc) * sizeK;
    // Sway with the trunk plus a little more toward the outside; phase of a branch at this height.
    const sway = ta.sway + 0.075 * u;
    const phase = branches.length ? branches[Math.max(0, Math.min(branches.length - 1, Math.floor(tc * branches.length + (rng() - 0.5) * 3)))].phase : trunk.phase;
    S.fol.card(A, U, randPerp(rng, U), w, w * 1.1, pick(S.R, regs, rng), tree,
      { crown, col: FOL.poplar, fol, sway, phase, flutter: 0.04, fold: 0.25, aoMin: 0.25 });
  }
  return { r: r0 + 0.12, H };
}

// ---------------------------------------------------------------- Sour cherry in blossom
export function cherry(S, x, z, rng, o = {}) {
  const y0 = S.world.heightAt(x, z) - 0.12;
  const sc = o.scale ?? (0.85 + rng() * 0.35);
  const H = 4.2 * sc;
  const tree = treeInfo([x, y0, z], rng(), H, 0.05);
  const ht = (0.65 + rng() * 0.5) * sc;
  const tr = (0.07 + rng() * 0.035) * sc;
  const lean = norm([(rng() - 0.5) * 0.35, 1, (rng() - 0.5) * 0.35]);
  const trunk = grow(rng, [x, y0, z], lean, ht, { step: 0.2, wob: 0.5, r0: tr, r1: tr * 0.85, taper: 1, phase: rng() });
  S.bark.tube(trunk, tree, { seg: S.hi ? 10 : 7, gnarl: 0.1, twist: 0.8, flare: 0.3, col: BARK.cherry, smooth: 1, moss: 0.25 });
  const top = trunk.pts[trunk.pts.length - 1];
  const cH = Math.max(1.8, H - (top[1] - y0));
  const crown = { c: [top[0], top[1] + cH * 0.5, top[2]], r: [cH * 0.66, cH * 0.56, cH * 0.66], k: 0.68 };
  const leafy = o.leafy ?? rng() * 0.45;
  const fol = [1.0, 1.0, 0.45];
  const regB = ['cherryA', 'cherryC'], regL = ['cherryB', 'cherryD'];
  const sizeK = Math.pow(1 / S.q, 0.3);
  const blossomCard = (b, scale = 1, extraOut = 0.3) => {
    const out = norm(sub(b.p, crown.c));
    const w = (0.42 + rng() * 0.2) * Math.sqrt(sc) * scale * sizeK;
    const reg = pick(S.R, rng() < leafy ? regL : regB, rng);
    let U, Nc, A;
    if (rng() < 0.65) {
      // Lying on the crown surface around the twig: reads as a soft cloud of blossom.
      [U, Nc] = tangentFrame(rng, out, 0.45, 1.1);
      A = madd(b.p, U, -w * 0.4);
    } else {
      U = norm(add(add(mul(b.d, 0.5), mul(out, extraOut + rng() * 0.3)), [(rng() - 0.5) * 1.1, 0.35 + rng() * 0.3, (rng() - 0.5) * 1.1]));
      Nc = randPerp(rng, U);
      A = madd(b.p, randPerp(rng, b.d), rng() * 0.05);
    }
    S.fol.card(A, U, Nc, w, w, reg, tree,
      { crown, col: FOL.blossom, fol, sway: b.sway, phase: b.phase, flutter: 0.018, fold: 0.18, aoMin: 0.3, tipSway: 0.04 });
  };

  const limbs = [];
  const nL = 3 + Math.floor(rng() * 3);
  const az0 = rng() * TAU;
  for (let k = 0; k < nL; k++) {
    const az = az0 + (k + (rng() - 0.5) * 0.55) * TAU / nL;
    const a = at(trunk, 0.72 + rng() * 0.28);
    const L = (1.4 + rng() * 0.9) * sc;
    const limb = grow(rng, a.p, dirAz(0.48 + rng() * 0.42, az), L,
      { step: 0.2, trop: 0.14, wob: 0.6, r0: tr * (0.6 + rng() * 0.12), r1: 0.016, taper: 0.9, sway0: 0, swayGain: 0.03, phase: rng() });
    S.bark.tube(limb, tree, { seg: S.hi ? 7 : 5, gnarl: 0.05, col: BARK.cherry, smooth: 1 });
    limbs.push(limb);
  }
  if (rng() < 0.6) {
    const a = at(trunk, 1);
    const limb = grow(rng, a.p, norm(add(lean, [(rng() - 0.5) * 0.3, 0.5, (rng() - 0.5) * 0.3])), (1.2 + rng() * 0.7) * sc,
      { step: 0.2, trop: 0.1, wob: 0.6, r0: tr * 0.55, r1: 0.014, sway0: 0, swayGain: 0.035, phase: rng() });
    S.bark.tube(limb, tree, { seg: S.hi ? 6 : 5, col: BARK.cherry, smooth: 1 });
    limbs.push(limb);
  }
  for (const limb of limbs) {
    // Spurs along older wood bloom too.
    for (let t = 0.4 + rng() * 0.15; t < 0.97; t += 0.2 / (S.qd * limb.L)) blossomCard(at(limb, t), 0.9, 0.5);
    const nS = 5 + Math.floor(rng() * 3);
    for (let j = 0; j < nS; j++) {
      const t = 0.25 + 0.75 * (j + rng() * 0.7) / nS;
      const a = at(limb, t);
      const out = norm(sub(a.p, crown.c));
      const d = norm(add(deviate(a.d, 0.45 + rng() * 0.55, rng() * TAU), mul(out, 0.55)));
      const L2 = (0.5 + rng() * 0.6) * sc * (1 - 0.25 * t);
      const sec = grow(rng, a.p, d, L2,
        { step: 0.13, trop: -0.12, wob: 0.9, r0: Math.max(0.009, Math.min(a.r * 0.65, 0.02)), r1: 0.004, sway0: a.sway, swayGain: 0.05, phase: limb.phase + rng() * 0.15 });
      S.bark.tube(sec, tree, { seg: S.hi ? 4 : 3, col: BARK.cherry, smooth: 1 });
      for (let s = 0.25 + rng() * 0.12; s <= 1.0; s += 0.1 / (S.qd * L2)) blossomCard(at(sec, s));
      const nT = Math.round((2 + Math.floor(rng() * 2)) * (S.hi ? 1 : 0.6));
      for (let q = 0; q < nT; q++) {
        const b = at(sec, 0.3 + rng() * 0.6);
        const td = norm(add(deviate(b.d, 0.5 + rng() * 0.5, rng() * TAU), mul(out, 0.4)));
        const tw = grow(rng, b.p, td, (0.2 + rng() * 0.25) * sc,
          { step: 0.14, trop: -0.2, wob: 1.0, r0: 0.006, r1: 0.003, sway0: b.sway, swayGain: 0.06, phase: b.phase });
        S.twig.tube(tw, tree, { seg: 3, col: BARK.cherry, smooth: 1, close: false });
        const e = at(tw, 1);
        blossomCard(e, 1.0);
        if (rng() < 0.5 * S.qd) blossomCard(at(tw, 0.5), 0.9);
      }
    }
  }
  return { r: tr + 0.1, H };
}

// ---------------------------------------------------------------- Pollarded white willow (верба)
export function willowPollard(S, x, z, rng, toWater) {
  const y0 = S.world.heightAt(x, z) - 0.3;
  const ht = 2.3 + rng() * 0.9;
  const r0 = 0.36 + rng() * 0.1;
  const leanA = 0.12 + rng() * 0.16;
  const d0 = norm([toWater[0] * Math.sin(leanA), Math.cos(leanA), toWater[2] * Math.sin(leanA)]);
  const tree = treeInfo([x, y0, z], rng(), ht + 4.5, 0.1);
  const trunk = grow(rng, [x, y0, z], d0, ht, { step: 0.22, wob: 0.35, trop: 0.05, r0, r1: r0 * 0.84, taper: 1, phase: rng() });
  for (let i = 0; i < trunk.pts.length; i++) trunk.rad[i] *= 1 + 0.3 * sstep(0.55, 0.97, trunk.s[i] / trunk.L);
  const nT = trunk.pts.length;
  const hc = trunk.pts[nT - 1];
  const headR = trunk.rad[nT - 1];
  const hd = norm(sub(trunk.pts[nT - 1], trunk.pts[nT - 2]));
  capDome(trunk, 1.1);
  S.bark.tube(trunk, tree, { seg: S.hi ? 16 : 10, gnarl: 0.22, twist: 0.55, flare: 0.5, col: BARK.willow, moss: 0.85 });

  const crown = { c: madd(madd(hc, [0, 1, 0], 2.1), d0, 0.4), r: [3.4, 2.5, 3.4], k: 0.75 };
  const fol = [0.85, 0, 0.5];
  const regs = ['willowA', 'willowB', 'willowC', 'willowB'];
  const wands = ['wandA', 'wandB'];
  const shoot = (p, d, L, sway0, phase, r0s) => {
    const pol = Math.acos(Math.min(1, Math.max(-1, d[1])));
    const sh = grow(rng, p, d, L, { step: 0.4, trop: pol > 0.55 ? -0.04 : 0.05, wob: 0.3, r0: r0s, r1: 0.006, sway0, swayGain: 0.06, phase });
    S.bark.tube(sh, tree, { seg: S.hi ? 5 : 4, col: BARK.willow });
    // Wand cards follow the shoot (two crossed planes), fan sprays fill between them.
    const sizeK = Math.pow(1 / S.q, 0.3);
    const wh = (0.95 + rng() * 0.25) * sizeK;
    for (let s = 0.25 + rng() * 0.2; s < sh.L - 0.2; s += wh * (0.55 + rng() * 0.2) / S.qd) {
      const b = at(sh, s / sh.L);
      const U = norm(add(b.d, [(rng() - 0.5) * 0.25, 0, (rng() - 0.5) * 0.25]));
      const N1 = randPerp(rng, U);
      const w = wh * (0.42 + rng() * 0.1);
      const reg = pick(S.R, wands, rng);
      const o = { crown, col: FOL.willow, fol, sway: b.sway, phase: b.phase, flutter: 0.03, fold: 0.15, tipSway: 0.05 };
      S.fol.card(b.p, U, N1, w, wh, reg, tree, o);
      if (rng() < 0.75 * S.qd) S.fol.card(b.p, U, norm(cross(U, N1)), w, wh, pick(S.R, wands, rng), tree, o);
      if (rng() < 0.3) {
        const fw = (0.6 + rng() * 0.3) * sizeK;
        const [FU, FN] = tangentFrame(rng, norm(sub(b.p, crown.c)), 0.5, 0.6);
        S.fol.card(madd(b.p, FU, -fw * 0.45), FU, FN, fw, fw * 1.1, pick(S.R, regs, rng), tree,
          { crown, col: FOL.willow, fol, sway: b.sway, phase: b.phase, flutter: 0.03, fold: 0.2 });
      }
    }
  };
  // A few thick old limbs that escaped the last pollarding, each with its own shoots.
  const nMaj = 1 + Math.floor(rng() * 3);
  for (let k = 0; k < nMaj; k++) {
    const az = rng() * TAU;
    const pol = 0.35 + rng() * 0.4;
    const dd = norm(add(dirAz(pol, az), mul(hd, 0.3)));
    const start = madd(madd(hc, [Math.cos(az), 0, Math.sin(az)], headR * 0.45), hd, headR * 0.2);
    const limb = grow(rng, start, dd, 1.6 + rng() * 1.3, { step: 0.3, trop: 0.25, wob: 0.45, r0: 0.11 + rng() * 0.05, r1: 0.06, sway0: 0, swayGain: 0.015, phase: rng() });
    S.bark.tube(limb, tree, { seg: S.hi ? 8 : 6, gnarl: 0.12, twist: 0.4, col: BARK.willow, moss: 0.5 });
    const ns = Math.round((4 + rng() * 3) * S.q);
    for (let i = 0; i < ns; i++) {
      const a = at(limb, 0.6 + 0.4 * rng());
      const sd = norm(add(deviate([0, 1, 0], 0.1 + rng() * 0.6, rng() * TAU), mul(a.d, 0.4)));
      shoot(a.p, sd, 2.2 + rng() * 1.6, a.sway, limb.phase + rng() * 0.2, 0.03 + rng() * 0.015);
    }
  }
  // Crown of shoots from the knobbly head.
  const nS = Math.round((24 + rng() * 10) * S.q);
  let az = rng() * TAU;
  for (let i = 0; i < nS; i++) {
    az += GOLDEN + (rng() - 0.5) * 0.4;
    const pol = 0.06 + 0.82 * Math.pow(rng(), 0.85);
    const start = madd(madd(hc, [Math.cos(az), 0, Math.sin(az)], headR * (0.25 + 0.6 * pol)), hd, headR * (0.45 - 0.3 * pol));
    const d = norm(add(dirAz(pol, az), mul(hd, 0.25)));
    shoot(start, d, (2.3 + rng() * 1.8) * (1 - 0.22 * pol), 0, rng(), 0.03 + rng() * 0.022);
  }
  return { r: r0 + 0.18, H: ht + 4.5 };
}

// ---------------------------------------------------------------- Weeping willow
export function willowWeeping(S, x, z, rng, toWater) {
  const world = S.world;
  const y0 = world.heightAt(x, z) - 0.3;
  const ht = 2.0 + rng() * 0.8;
  const r0 = 0.4 + rng() * 0.1;
  const leanA = 0.16 + rng() * 0.16;
  const d0 = norm([toWater[0] * Math.sin(leanA), Math.cos(leanA), toWater[2] * Math.sin(leanA)]);
  const tree = treeInfo([x, y0, z], rng(), ht + 7, 0.12);
  const trunk = grow(rng, [x, y0, z], d0, ht, { step: 0.22, wob: 0.3, trop: 0.03, r0, r1: r0 * 0.8, taper: 1, phase: rng() });
  S.bark.tube(trunk, tree, { seg: S.hi ? 16 : 10, gnarl: 0.18, twist: 0.45, flare: 0.45, col: BARK.willow, moss: 0.85 });
  const top = trunk.pts[trunk.pts.length - 1];
  const crown = { c: madd(madd(top, [0, 1, 0], 2.6), d0, 1.2), r: [5.6, 4.4, 5.6], k: 0.7 };
  const folS = [0.85, 0, 0.6], folC = [0.85, 0, 0.5];
  const strands = ['strandA', 'strandB', 'strandC', 'strandD'];
  const cards = ['willowA', 'willowC'];
  const azW = Math.atan2(toWater[2], toWater[0]);
  const nL = 3 + Math.floor(rng() * 2) + (S.hi ? 1 : 0);
  let nStr = 0;
  const hang = (b, out) => {
    const ground = Math.max(world.heightAt(b.p[0], b.p[2]), 0);
    const maxLen = b.p[1] - ground - (0.2 + rng() * 0.7);
    if (maxLen < 0.6) return;
    const len = Math.min(6.5, maxLen * (0.55 + rng() * 0.42));
    const w = Math.min(0.75, Math.max(0.32, len * 0.17)) * (0.9 + rng() * 0.3);
    S.fol.strand(b.p, len, w, rng() * TAU, pick(S.R, strands, rng), tree,
      { crown, col: FOL.strand, fol: folS, sway: b.sway, phase: b.phase, out, twist: (rng() - 0.5) * 1.4,
        segs: Math.max(3, Math.round(len / (S.hi ? 0.55 : 0.85))), strandGain: 0.075, drift: 0.08 + rng() * 0.1 });
    nStr++;
  };
  for (let k = 0; k < nL; k++) {
    const az = azW + (k + (rng() - 0.5) * 0.6) * TAU / nL;
    const a = at(trunk, 0.8 + rng() * 0.2);
    const limb = grow(rng, a.p, dirAz(0.25 + rng() * 0.35, az), 5.4 + rng() * 2.2,
      { step: 0.35, trop: -0.075, wob: 0.3, r0: r0 * (0.42 + rng() * 0.12), r1: 0.035, taper: 0.85, sway0: 0, swayGain: 0.02, phase: rng() });
    S.bark.tube(limb, tree, { seg: S.hi ? 9 : 6, gnarl: 0.07, twist: 0.3, col: BARK.willow, moss: 0.4 });
    // Crown dome: sprays along the upper limb.
    for (let t = 0.25 + rng() * 0.1; t < 1.0; t += 0.11 / S.qd) {
      const b = at(limb, t);
      const out = horiz(sub(b.p, top));
      const U = norm(add(add([0, 0.6, 0], mul(out, 0.6)), [(rng() - 0.5) * 0.6, (rng() - 0.5) * 0.4, (rng() - 0.5) * 0.6]));
      const w = 0.9 + rng() * 0.45;
      S.fol.card(madd(b.p, randPerp(rng, b.d), rng() * 0.25), U, randPerp(rng, U), w, w, pick(S.R, cards, rng), tree,
        { crown, col: FOL.willow, fol: folC, sway: b.sway, phase: b.phase, flutter: 0.03, droop: 0.15 });
    }
    const nSec = Math.round((7 + rng() * 3) * S.q);
    for (let j = 0; j < nSec; j++) {
      const t = 0.25 + 0.75 * (j + rng() * 0.8) / nSec;
      const a2 = at(limb, t);
      const out = horiz(sub(a2.p, top));
      const d = norm(add(add(deviate(a2.d, 0.5 + rng() * 0.5, rng() * TAU), mul(out, 0.5)), [0, -0.15, 0]));
      const L2 = 1.4 + rng() * 1.7;
      const sec = grow(rng, a2.p, d, L2,
        { step: 0.3, trop: -0.4, wob: 0.5, r0: Math.min(0.05, Math.max(0.018, a2.r * 0.5)), r1: 0.006, sway0: a2.sway, swayGain: 0.05, phase: limb.phase + rng() * 0.3 });
      S.bark.tube(sec, tree, { seg: S.hi ? 5 : 4, col: BARK.willow });
      for (let s = 0.2 + rng() * 0.15; s <= 1.0; s += 0.19 / (S.qd * L2)) {
        const b = at(sec, s);
        hang(b, horiz(sub(b.p, top)));
      }
      if (rng() < 0.7) {
        const b = at(sec, 0.15 + rng() * 0.3);
        const U = norm(add([0, 0.7, 0], mul(out, 0.6 + rng() * 0.4)));
        const w = 0.85 + rng() * 0.4;
        S.fol.card(b.p, U, randPerp(rng, U), w, w, pick(S.R, cards, rng), tree,
          { crown, col: FOL.willow, fol: folC, sway: b.sway, phase: b.phase, flutter: 0.03, droop: 0.2 });
      }
    }
    // The limb's own outer half hangs strands too.
    for (let t = 0.55; t <= 1.0; t += 0.08) {
      const b = at(limb, t);
      hang(b, horiz(sub(b.p, top)));
    }
  }
  return { r: r0 + 0.18, H: ht + 7, strands: nStr };
}

// ---------------------------------------------------------------- Elder / guelder-rose bush
export function bush(S, x, z, rng, flowering) {
  const y0 = S.world.heightAt(x, z) - 0.06;
  const H = 1.7 + rng() * 1.1;
  const tree = treeInfo([x, y0, z], rng(), H, 0.06);
  const crown = { c: [x, y0 + H * 0.55, z], r: [H * 0.62, H * 0.5, H * 0.62], k: 0.75 };
  const fol = [0.7, flowering ? 0.12 : 0, 0.5];
  const regs = flowering ? ['bushB', 'bushA', 'bushB'] : ['bushA', 'bushA', 'bushB'];
  const nStem = 5 + Math.floor(rng() * 4);
  for (let k = 0; k < nStem; k++) {
    const az = rng() * TAU;
    const pol = 0.12 + rng() * 0.55;
    const start = [x + Math.cos(az) * 0.18 * rng(), y0, z + Math.sin(az) * 0.18 * rng()];
    const stem = grow(rng, start, dirAz(pol, az), H * (0.85 + rng() * 0.3) / Math.cos(pol * 0.6),
      { step: 0.25, trop: -0.12, wob: 0.6, r0: 0.02 + rng() * 0.015, r1: 0.005, sway0: 0, swayGain: 0.05, phase: rng() });
    S.twig.tube(stem, tree, { seg: S.hi ? 4 : 3, col: BARK.elder });
    for (let s = 0.12 + rng() * 0.1; s <= 1.0; s += 0.2 / (S.qd * stem.L)) {
      const b = at(stem, s);
      const out = norm(sub(b.p, [x, y0, z]));
      const U = norm(add(add(b.d, mul(out, 0.6)), [(rng() - 0.5) * 0.5, 0.2, (rng() - 0.5) * 0.5]));
      const w = 0.5 + rng() * 0.3;
      S.folNR.card(b.p, U, randPerp(rng, U), w, w, pick(S.R, regs, rng), tree,
        { crown, col: FOL.bush, fol, sway: b.sway, phase: b.phase, flutter: 0.025, aoMin: 0.55 });
    }
  }
  const nFill = Math.round(30 * S.q);
  for (let i = 0; i < nFill; i++) {
    const az = rng() * TAU, el = -0.5 + rng() * 1.7;
    const dir = [Math.cos(az) * Math.cos(el), Math.sin(el), Math.sin(az) * Math.cos(el)];
    const A = [crown.c[0] + dir[0] * crown.r[0] * 0.45, crown.c[1] + dir[1] * crown.r[1] * 0.4 - 0.2, crown.c[2] + dir[2] * crown.r[2] * 0.45];
    const U = norm(add(dir, [0, 0.5, 0]));
    const w = 0.55 + rng() * 0.3;
    S.folNR.card(A, U, randPerp(rng, U), w, w, pick(S.R, regs, rng), tree,
      { crown, col: FOL.bush, fol, sway: 0.03, phase: rng(), flutter: 0.025, aoMin: 0.55 });
  }
  return { r: 0.62, H };
}

export { vlen, dot, lerp3 };
