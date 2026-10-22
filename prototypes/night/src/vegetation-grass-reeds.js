// Reeds (очерет) and cattails (рогіз) ringing the pond: one static merged mesh on layer 0, so the
// beds cast moon shadows and show in the water reflection. Stems, plumes and cattail heads are
// camera-facing ribbons expanded in the vertex shader (round from every side, a few triangles);
// leaves are real twisted, arching strips. Sway is computed in the shader from the shared wind.
import * as THREE from 'three';
import { fbm2, smoothstep, clamp, mix } from './noise.js';
import { GLSL_VEG_COMMON, GLSL_TRANSLUCENT } from './vegetation-grass-glsl.js';

function segDist(px, pz, ax, az, bx, bz) {
  const vx = bx - ax, vz = bz - az;
  const t = clamp(((px - ax) * vx + (pz - az) * vz) / (vx * vx + vz * vz || 1), 0, 1);
  return Math.hypot(px - (ax + vx * t), pz - (az + vz * t));
}

class GeoBuilder {
  constructor() {
    this.pos = []; this.nrm = []; this.col = []; this.root = []; this.wind = []; this.bill = []; this.idx = [];
  }
  get count() { return this.pos.length / 3; }
  vert(p, n, c, root, wind, bill) {
    this.pos.push(p.x, p.y, p.z);
    this.nrm.push(n.x, n.y, n.z);
    this.col.push(c.r, c.g, c.b);
    this.root.push(root[0], root[1], root[2]);
    this.wind.push(wind[0], wind[1], wind[2], wind[3]);
    this.bill.push(bill);
    return this.count - 1;
  }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nrm, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.setAttribute('aRoot', new THREE.Float32BufferAttribute(this.root, 3));
    g.setAttribute('aWind', new THREE.Float32BufferAttribute(this.wind, 4));
    g.setAttribute('aBill', new THREE.Float32BufferAttribute(this.bill, 1));
    g.setIndex(this.idx);
    g.computeBoundingSphere();
    return g;
  }
}

const _p = new THREE.Vector3(), _n = new THREE.Vector3(), _t = new THREE.Vector3(), _w = new THREE.Vector3();
const _c = new THREE.Color();

// Ribbon along a polyline of centre points; expanded toward the camera in the shader.
// widths[i] is the half-width at point i (0 at a pointed tip).
function ribbon(B, pts, widths, colors, root, phase, baseY, trans, rough) {
  const H = root[2];
  const n = pts.length;
  let prev = -1;
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)];
    _t.subVectors(b, a).normalize();
    const k = Math.pow(clamp((pts[i].y - baseY) / H, 0, 1.2), 1.5);
    const wnd = [k, phase, trans, rough];
    if (widths[i] <= 0) {
      const v = B.vert(pts[i], _t, colors[i], root, wnd, 0.0001);
      if (prev >= 0) B.idx.push(prev, prev + 1, v);
      prev = -1;
    } else {
      const l = B.vert(pts[i], _t, colors[i], root, wnd, -widths[i]);
      B.vert(pts[i], _t, colors[i], root, wnd, widths[i]);
      if (prev >= 0) B.idx.push(prev, prev + 1, l, prev + 1, l + 1, l);
      prev = l;
    }
  }
}

// A flat strap leaf: rises from `base`, leans out along azimuth `az`, arches by `bend`, twists.
function leaf(B, base, az, lean, bend, len, width, twist, segs, colA, colB, root, phase, baseY, droop = 0) {
  const H = root[2];
  const ca = Math.cos(az), sa = Math.sin(az);
  const side0 = new THREE.Vector3(-sa, 0, ca);
  const p = base.clone();
  let prevL = -1;
  const ds = len / segs;
  for (let j = 0; j <= segs; j++) {
    const t = j / segs;
    const alpha = lean + bend * Math.pow(t, 1.6) + droop * t * t;
    _t.set(Math.sin(alpha) * ca, Math.cos(alpha), Math.sin(alpha) * sa);
    // width axis: horizontal side vector twisted about the tangent
    const tw = twist * t;
    _w.copy(side0).applyAxisAngle(_t, tw);
    _n.crossVectors(_w, _t).normalize();
    const wdt = width * (t < 0.7 ? 1 - 0.15 * t : (1 - t) / 0.3 * 0.895);
    const hk = clamp((p.y - baseY) / H, 0, 1.2);
    const k = Math.pow(hk, 1.5);
    _c.copy(colA).lerp(colB, Math.pow(t, 1.3)).multiplyScalar(mix(0.32, 1, smoothstep(0, 0.35, hk)));
    const wnd = [k, phase + t * 0.6, 0.45 + 0.55 * t, 0.42];
    if (j === segs) {
      const v = B.vert(p, _n, _c, root, wnd, 0);
      B.idx.push(prevL, prevL + 1, v);
    } else {
      _p.copy(p).addScaledVector(_w, -wdt * 0.5);
      const l = B.vert(_p, _n, _c, root, wnd, 0);
      _p.copy(p).addScaledVector(_w, wdt * 0.5);
      B.vert(_p, _n, _c, root, wnd, 0);
      if (prevL >= 0) B.idx.push(prevL, prevL + 1, l, prevL + 1, l + 1, l);
      prevL = l;
    }
    p.addScaledVector(_t, ds);
  }
}

export function buildReeds(ctx, fields) {
  const { world } = ctx;
  const L = world.LAYOUT, P = L.pond;
  const low = ctx.quality === 'low';
  const rng = ctx.rng(7177);
  const R = (a, b) => a + (b - a) * rng();
  const C = (h) => new THREE.Color(h);

  const pier = L.pier;
  const hut = L.hut;
  const start = L.start;
  const moonXZ = new THREE.Vector2(world.MOON_DIR.x, world.MOON_DIR.z).normalize();
  // Where reeds may not stand (or thin out): pier, path landing, the main view lines.
  function openness(x, z) {
    let w = smoothstep(1.3, 2.6, segDist(x, z, pier.x, pier.z0 + 1.2, pier.x, pier.z1 - 1.0));
    w *= smoothstep(1.9, 3.6, world.distToPath(x, z));
    if (z > P.cz) {
      // From the start spot across the pond toward the hut on the hill.
      const d = segDist(x, z, start.x, start.z, (start.x + hut.x) * 0.5, (start.z + hut.z) * 0.5);
      w *= mix(0.0, 1, smoothstep(4.0, 9.5, d));
    } else {
      // Under the hut (its reflection) and along the moon path seen from the yard.
      const d1 = segDist(x, z, hut.x, hut.z, P.cx, P.cz);
      w *= mix(0.3, 1, smoothstep(1.2, 3.5, d1));
      const d2 = segDist(x, z, -1, -19, -1 + moonXZ.x * 9, -19 + moonXZ.y * 9);
      w *= mix(0.35, 1, smoothstep(1.0, 2.8, d2));
    }
    return w;
  }

  const cosR = Math.cos(P.rot), sinR = Math.sin(P.rot);
  const minSp = low ? 0.42 : 0.3;
  const cells = new Map();
  const key = (x, z) => `${Math.floor(x / minSp)},${Math.floor(z / minSp)}`;
  function farEnough(x, z) {
    const cx = Math.floor(x / minSp), cz = Math.floor(z / minSp);
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) {
      const l = cells.get(`${cx + a},${cz + b}`);
      if (l) for (const q of l) if (Math.hypot(q[0] - x, q[1] - z) < minSp) return false;
    }
    return true;
  }
  // Point on the shore band: angle in the ellipse frame, normalized pond distance td.
  function shorePoint(ang, td) {
    const ux = Math.cos(ang), uz = Math.sin(ang);
    const wx = ux * P.rx * cosR - uz * P.rz * sinR, wz = ux * P.rx * sinR + uz * P.rz * cosR;
    const k = world.pondDist(P.cx + wx, P.cz + wz);
    return [P.cx + wx * (td / k), P.cz + wz * (td / k)];
  }

  // Reed beds: dense stands along the shore with open water between them. Plants get shorter
  // toward the ends of a bed, which gives each stand a natural mound-like silhouette.
  const clumps = [];
  const nBeds = low ? 20 : 30;
  const perBed = low ? 11 : 17;
  for (let b = 0; b < nBeds; b++) {
    const a0 = (b + R(0.1, 0.9)) / nBeds * Math.PI * 2;
    const halfW = R(0.035, 0.1) * (rng() < 0.3 ? 1.8 : 1);
    const [bx, bz] = shorePoint(a0, 0.95);
    const bedOpen = openness(bx, bz);
    if (bedOpen < 0.25) continue;
    const want = Math.round(perBed * (halfW / 0.07) * R(0.6, 1.3) * bedOpen);
    let got = 0;
    for (let tries = 0; tries < want * 12 && got < want; tries++) {
      const u = R(-1, 1);
      const ang = a0 + u * halfW;
      const td = 0.87 + 0.16 * Math.pow(rng(), 0.9);
      const [x, z] = shorePoint(ang, td);
      const h = world.heightAt(x, z);
      if (h < -0.62 || h > 0.3) continue;
      const open = openness(x, z);
      if (rng() > open) continue;
      if (!farEnough(x, z)) continue;
      const kk = key(x, z);
      if (!cells.has(kk)) cells.set(kk, []);
      cells.get(kk).push([x, z]);
      const along = 1 - Math.pow(Math.abs(u), 2.2) * 0.75; // taller in the middle of the bed
      clumps.push({ x, z, h, td, open, along });
      got++;
    }
  }
  // A few loose stragglers between the beds.
  for (let tries = 0; tries < (low ? 40 : 80); tries++) {
    const [x, z] = shorePoint(rng() * Math.PI * 2, 0.9 + 0.12 * rng());
    const h = world.heightAt(x, z);
    if (h < -0.5 || h > 0.25) continue;
    const open = openness(x, z);
    if (rng() > open * 0.5 || !farEnough(x, z)) continue;
    clumps.push({ x, z, h, td: 1, open, along: 0.45 });
  }

  const B = new GeoBuilder();
  const leafSegs = low ? 4 : 5;
  const cat = {
    leafA: [C('#263220'), C('#2d3a28'), C('#283628')],
    leafB: [C('#5c6a45'), C('#67704c'), C('#566a58')],
    stem: C('#4f603b'), head: C('#3a281d'), spike: C('#5a4b37'),
  };
  const reed = {
    fresh: C('#3b4c30'), freshTip: C('#5c6a3e'),
    dry: C('#57513f'), dryTip: C('#6f6753'),
    plume: C('#6a6358'), plumeTip: C('#857d6f'),
  };
  const pts = [], wid = [], cols = [];

  for (const cl of clumps) {
    const depth = Math.max(0, -cl.h);
    const scale = (0.62 + 0.38 * cl.open) * (0.45 + 0.55 * cl.along) * (rng() < 0.15 ? 0.7 : 1);
    const Hs = clamp((R(1.4, 2.5) + depth * 0.5) * scale, 0.8, 2.7);
    const baseY = cl.h - 0.04;
    const root = [cl.x, cl.z, Hs + depth];
    const isCattail = rng() < (cl.td < 0.95 ? 0.8 : 0.6);
    const spread = R(0.15, 0.38);

    if (isCattail) {
      const nLeaves = Math.round(R(low ? 6 : 9, low ? 10 : 16) * (0.65 + 0.35 * cl.along));
      const palette = Math.floor(rng() * 3);
      for (let i = 0; i < nLeaves; i++) {
        const r = spread * Math.sqrt(rng()), a = rng() * Math.PI * 2;
        const base = new THREE.Vector3(cl.x + Math.cos(a) * r, baseY, cl.z + Math.sin(a) * r);
        const az = a + R(-0.6, 0.6);
        const tallLeaf = rng() < 0.6;
        leaf(B, base, az, tallLeaf ? R(0.03, 0.22) : R(0.2, 0.55), tallLeaf ? R(0.15, 0.9) : R(0.6, 1.6),
          (Hs + depth) * (tallLeaf ? R(0.75, 1.02) : R(0.45, 0.75)), R(0.03, 0.05), R(-0.7, 0.7), leafSegs,
          cat.leafA[palette], cat.leafB[palette].clone().multiplyScalar(R(0.85, 1.15)), root, rng() * 6.28, baseY);
      }
      const nStems = rng() < 0.75 ? (rng() < 0.35 ? 2 : 1) : 0;
      for (let s = 0; s < nStems; s++) {
        const a = rng() * Math.PI * 2, r = spread * 0.6 * rng();
        const lean = R(0.02, 0.09), laz = rng() * Math.PI * 2;
        const top = (Hs + depth) * R(0.85, 1.05);
        const headLen = R(0.13, 0.22), headW = R(0.011, 0.017);
        const bx = cl.x + Math.cos(a) * r, bz = cl.z + Math.sin(a) * r;
        const at = (y) => new THREE.Vector3(bx + Math.cos(laz) * lean * y * y / top, baseY + y, bz + Math.sin(laz) * lean * y * y / top);
        const ph = rng() * 6.28;
        // stem
        pts.length = wid.length = cols.length = 0;
        const stemTop = top - headLen;
        for (let j = 0; j <= 4; j++) {
          const y = (stemTop * j) / 4;
          pts.push(at(y)); wid.push(0.0045 * (1 - 0.3 * j / 4));
          cols.push(cat.stem.clone().multiplyScalar(mix(0.35, 1, smoothstep(0, 0.4, (y - depth) / Hs + 0.1))));
        }
        ribbon(B, pts, wid, cols, root, ph, baseY, 0.4, 0.78);
        // brown head (rounded ends) and the thin spike above
        pts.length = wid.length = cols.length = 0;
        const hs = [0, 0.12, 0.5, 0.88, 1];
        const hw = [0.6, 1, 1.05, 0.95, 0.55];
        for (let j = 0; j < hs.length; j++) {
          pts.push(at(stemTop + headLen * hs[j])); wid.push(headW * hw[j]);
          cols.push(cat.head.clone().multiplyScalar(0.85 + 0.25 * hs[j]));
        }
        ribbon(B, pts, wid, cols, root, ph, baseY, 0.15, 0.85);
        pts.length = wid.length = cols.length = 0;
        const sp = R(0.08, 0.16);
        pts.push(at(top), at(top + sp * 0.6), at(top + sp)); wid.push(0.0035, 0.0025, 0);
        cols.push(cat.spike, cat.spike, cat.spike);
        ribbon(B, pts, wid, cols, root, ph, baseY, 0.3, 0.7);
      }
    } else {
      // Phragmites: tall stems with leaves along them; last year's stalks are pale with plumes.
      const nStems = Math.round(R(2, low ? 3 : 4.5));
      for (let s = 0; s < nStems; s++) {
        const dry = rng() < 0.42;
        const a = rng() * Math.PI * 2, r = spread * Math.sqrt(rng());
        const bx = cl.x + Math.cos(a) * r, bz = cl.z + Math.sin(a) * r;
        const top = (Hs + depth) * R(0.8, 1.08);
        const lean = R(0.04, 0.3), laz = a + R(-0.5, 0.5);
        const at = (y) => new THREE.Vector3(bx + Math.cos(laz) * lean * y * y / top, baseY + y, bz + Math.sin(laz) * lean * y * y / top);
        const ph = rng() * 6.28;
        const cA = dry ? reed.dry : reed.fresh, cB = dry ? reed.dryTip : reed.freshTip;
        pts.length = wid.length = cols.length = 0;
        const segs = 5;
        for (let j = 0; j <= segs; j++) {
          const y = (top * j) / segs;
          pts.push(at(y)); wid.push(0.0042 * (1 - 0.45 * j / segs));
          cols.push(cA.clone().lerp(cB, j / segs).multiplyScalar(mix(0.32, 1, smoothstep(0, 0.4, (y - depth) / Hs + 0.1))));
        }
        ribbon(B, pts, wid, cols, root, ph, baseY, 0.4, 0.78);
        // stem leaves, alternating, drooping
        const nl = dry ? Math.round(R(1, 3)) : Math.round(R(4, low ? 5 : 7));
        for (let i = 0; i < nl; i++) {
          const y = top * mix(0.3, 0.88, (i + R(0, 0.7)) / nl);
          const lb = at(y);
          const laz2 = laz + (i % 2 ? Math.PI : 0) + R(-0.7, 0.7);
          leaf(B, lb, laz2, R(0.5, 0.95), R(0.4, 1.3), R(0.25, 0.5) * (dry ? 0.8 : 1), R(0.026, 0.04), R(-0.5, 0.5), low ? 2 : 3,
            dry ? reed.dry : reed.fresh, dry ? reed.dryTip : reed.freshTip, root, ph + i, baseY);
        }
        if ((dry && rng() < 0.6) || rng() < 0.06) {
          // nodding plume
          pts.length = wid.length = cols.length = 0;
          const pl = R(0.16, 0.28), pw = R(0.018, 0.028);
          const pd = laz + R(-0.6, 0.6);
          const tp = at(top);
          const ns = low ? 3 : 4;
          for (let j = 0; j <= ns; j++) {
            const t = j / ns;
            const dropA = R(0.25, 0.4) + t * R(0.6, 1.1);
            const off = new THREE.Vector3(Math.cos(pd) * Math.sin(dropA) * pl * t, Math.cos(dropA) * pl * t * 0.85, Math.sin(pd) * Math.sin(dropA) * pl * t);
            pts.push(tp.clone().add(off));
            wid.push(j === ns ? 0 : pw * Math.pow(Math.sin(Math.PI * Math.min(1, 0.15 + t * 0.95)), 0.6));
            cols.push(reed.plume.clone().lerp(reed.plumeTip, t).multiplyScalar(R(0.9, 1.1)));
          }
          ribbon(B, pts, wid, cols, root, ph, baseY, 0.95, 0.8);
        }
      }
      // a few basal leaves
      const nb = Math.round(R(3, low ? 4 : 7));
      for (let i = 0; i < nb; i++) {
        const a = rng() * Math.PI * 2, r = spread * Math.sqrt(rng());
        const base = new THREE.Vector3(cl.x + Math.cos(a) * r, baseY, cl.z + Math.sin(a) * r);
        leaf(B, base, a + R(-0.5, 0.5), R(0.15, 0.5), R(0.5, 1.4), (Hs + depth) * R(0.35, 0.6), R(0.03, 0.045), R(-0.6, 0.6), leafSegs - 2,
          reed.fresh, reed.freshTip, root, rng() * 6.28, baseY);
      }
    }
  }

  if (!B.count) return null;
  const geo = B.geometry();

  const uniforms = {
    uTime: ctx.uniforms.uTime,
    uWindStrength: ctx.uniforms.uWindStrength,
    uWindDir: ctx.uniforms.uWindDir,
    uTransCol: { value: new THREE.Color('#d8e6b0') },
  };
  const PARS = /* glsl */ `
${GLSL_VEG_COMMON}
attribute vec3 aRoot;
attribute vec4 aWind;
attribute float aBill;
varying float vVegTrans;
varying float vReedRough;
void reedDeform( inout vec3 p, inout vec3 n ) {
  float gust;
  float w = vegWind( aRoot.xy, gust );
  float k = aWind.x;
  float ph = aWind.y;
  float Hh = aRoot.z;
  float sway = w * 0.075 * Hh + sin( uTime * ( 0.8 + fract( ph * 3.7 ) * 0.5 ) + ph ) * 0.03 * Hh * ( 0.45 + 0.35 * uWindStrength );
  vec2 perp = vec2( -uWindDir.y, uWindDir.x );
  float flick = sin( uTime * ( 2.1 + fract( ph * 7.1 ) * 1.6 ) + ph * 5.0 ) * 0.022 * uWindStrength;
  vec2 d = ( uWindDir * sway + perp * flick * Hh ) * k;
  p.xz += d;
  p.y -= dot( d, d ) / ( 2.0 * max( Hh * pow( max( k, 0.0 ), 0.667 ), 0.25 ) );
  if ( aBill != 0.0 ) {
    vec3 axis = normalize( n );
    vec3 side = normalize( cross( axis, cameraPosition - p ) );
    p += side * aBill;
    n = normalize( cross( side, axis ) + side * sign( aBill ) * 1.6 );
  }
}
`;
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0, side: THREE.DoubleSide });
  mat.defines = { VEG_SOFTEN: '0.12' };
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${PARS}`)
      .replace('#include <beginnormal_vertex>', 'vec3 rPos = position;\nvec3 objectNormal = normal;\nreedDeform( rPos, objectNormal );\nvVegTrans = aWind.z;\nvReedRough = aWind.w;')
      .replace('#include <begin_vertex>', 'vec3 transformed = rPos;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vReedRough;')
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = vReedRough;')
      .replace('#include <normal_fragment_begin>', `#include <normal_fragment_begin>
  { vec3 vegUp = normalize( ( viewMatrix * vec4( 0.0, 1.0, 0.0, 0.0 ) ).xyz ); normal = normalize( mix( normal, vegUp, VEG_SOFTEN ) ); }`)
      .replace('#include <lights_physical_pars_fragment>', `#include <lights_physical_pars_fragment>\n${GLSL_TRANSLUCENT}`);
  };
  mat.customProgramCacheKey = () => 'veg-reeds';

  const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, side: THREE.DoubleSide });
  depth.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${PARS}`)
      .replace('#include <begin_vertex>', 'vec3 transformed = position;\nvec3 rN = normal;\nreedDeform( transformed, rN );');
  };
  depth.customProgramCacheKey = () => 'veg-reeds-depth';

  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'reeds';
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.customDepthMaterial = depth;
  // Sway can push vertices a little outside the rest-pose bounds.
  geo.boundingSphere.radius += 1.0;
  mesh.userData.clumps = clumps.length;
  console.log(`[grass] reeds: ${clumps.length} clumps, ${geo.index.count / 3} tris`);
  if (ctx.params.has('reeddebug')) console.log('[reeddebug] ' + JSON.stringify(clumps.map((c) => [+c.x.toFixed(2), +c.z.toFixed(2), +c.along.toFixed(2)])));
  return mesh;
}
