// World layout and terrain: the single source of truth every module builds against.
// Units are meters, +y is up, +z is south, -z is north. Water surface is y = 0.
import * as THREE from 'three';
import { fbm2, smoothstep, mix, clamp } from './noise.js';

export const WATER_LEVEL = 0;

// Objects on this layer are seen by the main camera but skipped by the water reflection
// (fine grass, particles). Use obj.layers.set(LAYER_NO_REFLECT).
export const LAYER_NO_REFLECT = 2;
// Seen only by the water reflection (cheaper stand-ins for expensive main-view geometry).
export const LAYER_REFLECT_ONLY = 3;

// Direction toward the moon: low in the south, a little to the east (about 17° high).
export const MOON_DIR = new THREE.Vector3(0.35, 0.32, 1.0).normalize();

export const LAYOUT = {
  start: { x: 5, z: 13, yaw: 0.21, pitch: 0.02 },
  // Pond (став): rotated ellipse; the hut stands on the hill behind its north bank.
  pond: { cx: 0, cz: -6, rx: 16, rz: 9, rot: 0.15 },
  // White mazanka; front (door, windows) faces +z rotated by rotY toward the moon.
  hut: { x: -3, z: -26, rotY: 0.3, width: 9, depth: 5 },
  yardRadius: 9,
  // Dirt path from the south meadow around the east shore up to the hut door.
  path: [
    [5, 16], [10, 9], [15, 0], [16, -9], [12, -16], [6, -20], [1, -21.5], [-1.5, -22.8],
  ],
  pathWidth: 1.7,
  // Wooden walkway (кладка) out into the pond from the south bank.
  pier: { x: -4, z0: 4.8, z1: -0.6, width: 1.2, deckY: 0.42 },
  willows: [[-15.5, -3], [-11.5, 3.6], [14.5, -12.5], [9.5, 4.2], [-17, -12], [17.5, -3]],
  poplars: [[-13, -34], [-8, -36], [3, -35.5], [8.5, -33], [-19, -30], [14, -36]],
  orchard: { x0: 5, x1: 16, z0: -32, z1: -21, count: 11 },
  frontCherries: [[-8.5, -20.5], [2.5, -21.0]],
  // Wattle fence (плетень) around the yard; gap near the path entrance.
  fence: [[-13, -20], [-2.4, -20], null, [-0.4, -20], [5, -20], [5, -32], [-13, -32], [-13, -20]],
  well: { x: -10, z: -22.5 },
  // Distant silhouettes beyond the walkable area.
  windmill: { x: 58, z: -92 },
  church: { x: -28, z: -128 },
  village: { x0: -72, x1: -38, z0: -74, z1: -52, count: 8 },
  bounds: { cx: 0, cz: -10, r: 42 },
};

const P = LAYOUT.pond;
const cosR = Math.cos(P.rot), sinR = Math.sin(P.rot);

// Normalized distance to the pond outline: < 1 inside the water.
export function pondDist(x, z) {
  const dx = x - P.cx, dz = z - P.cz;
  const lx = dx * cosR + dz * sinR, lz = -dx * sinR + dz * cosR;
  const d = Math.hypot(lx / P.rx, lz / P.rz);
  const a = Math.atan2(lz, lx);
  const wobble = 1 + 0.09 * fbm2(Math.cos(a) * 1.7 + 3.1, Math.sin(a) * 1.7 - 2.2, 3);
  return d * wobble;
}

function distToSegment(px, pz, ax, az, bx, bz) {
  const vx = bx - ax, vz = bz - az;
  const t = clamp(((px - ax) * vx + (pz - az) * vz) / (vx * vx + vz * vz), 0, 1);
  return Math.hypot(px - (ax + vx * t), pz - (az + vz * t));
}

export function distToPath(x, z) {
  const p = LAYOUT.path;
  let best = Infinity;
  for (let i = 0; i < p.length - 1; i++) {
    best = Math.min(best, distToSegment(x, z, p[i][0], p[i][1], p[i + 1][0], p[i + 1][1]));
  }
  return best;
}

// 1 on the trodden path, 0 off it.
export function pathMask(x, z) {
  const w = LAYOUT.pathWidth * (0.85 + 0.25 * fbm2(x * 0.3, z * 0.3, 2));
  return 1 - smoothstep(w * 0.35, w * 0.65, distToPath(x, z));
}

function rawHeight(x, z) {
  let h = 0.55 + 0.35 * fbm2(x * 0.03, z * 0.03) + 0.12 * fbm2(x * 0.13 + 7, z * 0.13 - 3, 3);
  // The hill to the north where the hut stands.
  h += 2.5 * smoothstep(-7, -25, z) * (0.85 + 0.15 * fbm2(x * 0.05, z * 0.05, 2));
  // Rolling hills that frame the horizon.
  const r = Math.hypot(x - LAYOUT.bounds.cx, z - LAYOUT.bounds.cz);
  h += smoothstep(48, 115, r) * (5 + 9 * (0.5 + 0.5 * fbm2(x * 0.011 + 4, z * 0.011, 3)));
  return h;
}

const H = LAYOUT.hut;
export const YARD_Y = rawHeight(H.x, H.z);

export function heightAt(x, z) {
  let h = rawHeight(x, z);
  // Flatten the yard around the hut.
  const dy = Math.hypot(x - H.x, z - H.z);
  h = mix(h, YARD_Y + 0.04 * fbm2(x * 0.4, z * 0.4, 2), 1 - smoothstep(LAYOUT.yardRadius - 2, LAYOUT.yardRadius + 3, dy));
  // Pond basin with a soft shore.
  const d = pondDist(x, z);
  h = mix(h, -1.5 + 0.45 * d, 1 - smoothstep(0.72, 1.12, d));
  // Trodden path is slightly sunken.
  h -= 0.05 * pathMask(x, z);
  return h;
}

// Approximate surface normal from finite differences.
export function normalAt(x, z, out = new THREE.Vector3()) {
  const e = 0.25;
  const hx = heightAt(x + e, z) - heightAt(x - e, z);
  const hz = heightAt(x, z + e) - heightAt(x, z - e);
  return out.set(-hx, 2 * e, -hz).normalize();
}

// 0..1 how suitable a spot is for meadow grass (no water, path, yard floor or steep banks).
export function grassMask(x, z) {
  const h = heightAt(x, z);
  if (h < 0.08) return 0;
  let m = 1 - pathMask(x, z);
  const dy = Math.hypot(x - H.x, z - H.z);
  m *= mix(0.25, 1, smoothstep(5.5, 8.5, dy)); // trodden yard
  const d = pondDist(x, z);
  m *= smoothstep(0.98, 1.06, d); // wet mud strip at the shore
  return clamp(m, 0, 1);
}

// Colliders for walking: circles {x, z, r} and oriented boxes {x, z, hw, hd, rot}.
export const colliders = [];

export function addCircleCollider(x, z, r) {
  colliders.push({ type: 'circle', x, z, r });
}

export function addBoxCollider(x, z, hw, hd, rot = 0) {
  colliders.push({ type: 'box', x, z, hw, hd, rot });
}

export function onPier(x, z) {
  const p = LAYOUT.pier;
  return Math.abs(x - p.x) <= p.width / 2 && z <= p.z0 && z >= p.z1;
}

// Ground height for the walker, including the pier deck.
export function walkHeightAt(x, z) {
  if (onPier(x, z)) return Math.max(LAYOUT.pier.deckY, heightAt(x, z));
  return heightAt(x, z);
}

export function isWalkable(x, z) {
  const b = LAYOUT.bounds;
  if (Math.hypot(x - b.cx, z - b.cz) > b.r) return false;
  if (!onPier(x, z) && heightAt(x, z) < 0.1) return false;
  for (const c of colliders) {
    if (c.type === 'circle') {
      if (Math.hypot(x - c.x, z - c.z) < c.r) return false;
    } else {
      const dx = x - c.x, dz = z - c.z;
      const cs = Math.cos(c.rot), sn = Math.sin(c.rot);
      const lx = dx * cs - dz * sn, lz = dx * sn + dz * cs;
      if (Math.abs(lx) < c.hw && Math.abs(lz) < c.hd) return false;
    }
  }
  return true;
}
