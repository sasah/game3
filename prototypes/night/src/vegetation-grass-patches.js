// Camera-following meadow patches. Each patch is one instanced draw call: a tile of jittered
// offsets is wrapped around a centre pushed ahead of the camera (so nearly every instance lands in
// the view), positions stay fixed in the world. In the vertex shader each instance is thinned by the
// baked mask, placed on the exact terrain surface, shaped, bent by the shared wind and coloured.
// Nothing is animated on the CPU; per frame the CPU only moves two vec2 uniforms per patch.
import * as THREE from 'three';
import { GLSL_VEG_COMMON, GLSL_PATCH_PARS, GLSL_TRANSLUCENT, GLSL_NORMAL_SOFTEN } from './vegetation-grass-glsl.js';

const lin = (hex) => new THREE.Color(hex);

// ---------- templates ----------

// Tuft of `blades` tapered blades: nq quads + a tip triangle each.
// position = (side -1..1, t along the blade, blade index).
function tuftTemplate(blades, nq) {
  const pos = [], idx = [];
  for (let b = 0; b < blades; b++) {
    const base = pos.length / 3;
    for (let j = 0; j <= nq; j++) {
      const t = 1 - Math.pow(1 - j / (nq + 1), 1.25);
      pos.push(-1, t, b, 1, t, b);
    }
    pos.push(0, 1, b);
    for (let j = 0; j < nq; j++) {
      const a = base + 2 * j;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    idx.push(base + 2 * nq, base + 2 * nq + 1, base + 2 * nq + 2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  return g;
}

// Ribbon (camera-facing in the shader) with `part` id: x = side, y = t.
function pushRibbon(pos, part, idx, nq, partId, tip) {
  const base = pos.length / 3;
  for (let j = 0; j <= nq; j++) {
    const t = j / (nq + (tip ? 1 : 0));
    pos.push(-1, t, 0, 1, t, 0);
    part.push(partId, partId);
  }
  for (let j = 0; j < nq; j++) {
    const a = base + 2 * j;
    idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  if (tip) {
    pos.push(0, 1, 0);
    part.push(partId);
    const a = base + 2 * nq;
    idx.push(a, a + 1, a + 2);
  }
}

// Flower: stem ribbon (part 0), petal star (part 1, unit disc in xz), raised centre (part 2).
function flowerTemplate(petals, stemQ) {
  const pos = [], part = [], idx = [];
  pushRibbon(pos, part, idx, stemQ, 0, false);
  const c0 = pos.length / 3;
  pos.push(0, 0, 0); part.push(1);
  for (let i = 0; i < petals * 2; i++) {
    const a = (i / (petals * 2)) * Math.PI * 2;
    const r = i % 2 === 0 ? 1 : 0.62;
    pos.push(Math.cos(a) * r, 0, Math.sin(a) * r);
    part.push(1);
  }
  for (let i = 0; i < petals * 2; i++) idx.push(c0, c0 + 1 + i, c0 + 1 + ((i + 1) % (petals * 2)));
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aPart', new THREE.Float32BufferAttribute(part, 1));
  g.setIndex(idx);
  return g;
}

// Seed stalk: stem ribbon (part 0) + spindle head ribbon with a tip (part 1).
function seedTemplate(stemQ, headQ) {
  const pos = [], part = [], idx = [];
  pushRibbon(pos, part, idx, stemQ, 0, false);
  pushRibbon(pos, part, idx, headQ, 1, true);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('aPart', new THREE.Float32BufferAttribute(part, 1));
  g.setIndex(idx);
  return g;
}

function jitterGrid(tile, density, rng) {
  const n = Math.max(1, Math.round(tile * Math.sqrt(density)));
  const c = tile / n;
  const arr = new Float32Array(n * n * 2);
  let k = 0;
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      arr[k++] = (i + 0.06 + rng() * 0.88) * c;
      arr[k++] = (j + 0.06 + rng() * 0.88) * c;
    }
  }
  return { arr, count: n * n };
}

// ---------- shader bodies (replace <beginnormal_vertex>; must define objectNormal and vegPos) ----------

const GRASS_PARS = /* glsl */ `
uniform vec3 uGrassRoot, uGrassTipA, uGrassTipB, uGrassSilver, uGrassDry, uGrassWet;
varying vec3 vVegCol;
varying float vVegTrans;
`;

const GRASS_MAIN = /* glsl */ `
  // ---- tuft (per instance) ----
  vec2 gp = vegWrap();
  float gd = distance( gp, uCam );
  float gj = gd + ( hash12( gp * 4.71 + 1.3 ) - 0.5 ) * FADE_JITTER;
  float keep = smoothstep( uFade.x, uFade.y, gj ) * ( 1.0 - smoothstep( uFade.z, uFade.w, gj ) );
  if ( keep <= 0.0 ) VEG_CULL
  vec4 gm = vegMask( gp );
  float clump = vnoise( gp * 0.29 + 4.0 ) * 0.5 + 0.5;
  float clumpS = vnoise( gp * 1.9 - 2.0 ) * 0.5 + 0.5;
  float dens = gm.r * mix( 0.62, 1.0, smoothstep( 0.15, 0.7, clump ) ) * mix( 0.8, 1.0, clumpS );
  if ( hash12( gp * 1.731 + 0.37 ) > dens * keep * uDensity ) VEG_CULL
  float tall = gm.g;
  float Ht = mix( 0.62, 1.25, clump ) * mix( 0.75, 1.15, clumpS ) * mix( 0.42, 1.9, tall );
  Ht *= 1.0 - 0.55 * smoothstep( uFade.z - 6.0, uFade.w, gd );
  float gy = vegTerrain( gp );
  if ( vegOffscreen( vec3( gp.x, gy + 0.25 * Ht, gp.y ), 0.55 * Ht + 0.3 ) ) VEG_CULL
  float gust;
  float wind = vegWind( gp, gust );
  float patchC = vnoise( gp * 0.11 + 7.0 ) * 0.5 + 0.5;
  float patchC2 = vnoise( gp * 0.43 - 3.0 ) * 0.5 + 0.5;

  // ---- blade ----
  float bi = position.z;
  vec2 bs = gp + vec2( bi * 0.1371, bi * 0.2913 );
  vec4 r1 = vec4( hash12( bs * 2.117 + 5.13 ), hash12( bs * 0.913 + 11.7 ), hash12( bs * 3.31 + 2.9 ), hash12( bs * 1.37 + 0.2 ) );
  vec4 r2 = vec4( hash12( bs * 5.37 + 8.1 ), hash12( bs * 0.61 + 3.3 ), hash12( bs * 7.13 - 4.4 ), hash12( bs * 2.71 + 6.6 ) );
  float ra = r1.w * 6.2831853;
  vec2 root = gp + vec2( cos( ra ), sin( ra ) ) * ( sqrt( r2.y ) * TUFT_R );
  float H = clamp( mix( 0.17, 0.5, pow( r1.x, 1.4 ) ) * Ht, 0.07, 0.72 );
  float W = mix( 0.015, 0.028, r1.z ) * GRASS_WSCALE * mix( 1.0, 0.82, tall );
  float ang = ra + ( r1.y - 0.5 ) * 1.8; // lean out of the tuft
  vec2 fdir = vec2( cos( ang ), sin( ang ) );
  float flutter = sin( uTime * ( 2.2 + r2.z * 2.4 ) + r2.w * 6.2831 + gp.x * 0.7 ) * ( 0.05 + 0.07 * uWindStrength );
  float phi0 = mix( 0.12, 1.1, r2.x * r2.x ) * ( 0.6 + H * 1.2 );
  vec2 bendV = fdir * phi0 + uWindDir * ( wind * ( 0.25 + H * 1.5 ) + flutter );
  float bl = length( bendV );
  float phi = clamp( bl, 0.001, 2.3 );
  vec2 bdir = bendV / max( bl, 1e-4 );

  float t = position.y;
  float s = position.x;
  // Bend grows toward the tip (stiff base, arching blade): angle phi * t^1.5, integrated.
  float a = phi * t * sqrt( t );
  float sa = sin( a ), ca = cos( a );
  float am = phi * pow( t * 0.5, 1.5 );
  float up = H * t * 0.5 * ( cos( am ) + ca );
  float fw = H * t * 0.5 * ( sin( am ) + sa );
  float tw = ( r2.x - 0.5 ) * 1.8 * t;
  vec2 wax = vec2( -fdir.y, fdir.x );
  wax = vec2( wax.x * cos( tw ) - wax.y * sin( tw ), wax.x * sin( tw ) + wax.y * cos( tw ) );
  float wid = W * ( 1.0 - t * t * t ) * ( 1.0 - 0.25 * t );
  vec3 wv = vec3( wax.x, 0.0, wax.y );
  vec3 vegPos = vec3( root.x, gy - 0.035, root.y ) + vec3( bdir.x * fw, up, bdir.y * fw ) + wv * ( s * wid * 0.5 );
  vec3 tang = vec3( bdir.x * sa, ca, bdir.y * sa );
  vec3 objectNormal = normalize( cross( wv, tang ) );
  objectNormal = normalize( objectNormal + wv * ( s * 0.55 ) );

  vec3 cRoot = uGrassRoot * mix( 0.8, 1.2, r2.z );
  vec3 cTip = mix( uGrassTipA, uGrassTipB, smoothstep( 0.25, 0.8, patchC ) );
  cTip = mix( cTip, uGrassSilver, smoothstep( 0.35, 1.0, patchC2 ) * ( 0.25 + 0.5 * r1.x ) );
  float dry = step( r2.w, 0.035 + 0.1 * smoothstep( 0.55, 0.9, patchC2 ) );
  cTip = mix( cTip, uGrassDry, dry * 0.75 );
  cTip = mix( cTip, uGrassWet, gm.a * 0.55 );
  cTip *= mix( 0.72, 1.12, r1.z ) * mix( 0.62, 1.1, hash12( gp * 0.37 + 9.1 ) );
  vec3 col = mix( cRoot, cTip, smoothstep( 0.0, 0.9, t ) );
  col *= mix( 0.38, 1.0, smoothstep( 0.0, 0.7, t ) );
  col *= 1.0 + gust * 0.3 * t;
  vVegCol = col;
  vVegTrans = t * mix( 0.55, 1.0, r1.z );
`;

const FLOWER_PARS = /* glsl */ `
attribute float aPart;
uniform vec3 uDaisy, uDaisyC, uButter, uBlue, uClover, uStem;
varying vec3 vVegCol;
varying float vVegTrans;
`;

const FLOWER_MAIN = /* glsl */ `
  vec2 gp = vegWrap();
  float gd = distance( gp, uCam );
  vec4 r1 = vec4( hash12( gp * 1.913 + 0.71 ), hash12( gp * 2.417 + 3.13 ), hash12( gp * 0.713 + 1.7 ), hash12( gp * 3.91 + 9.9 ) );
  float gj = gd + ( hash12( gp * 4.1 + 7.3 ) - 0.5 ) * FADE_JITTER;
  float keep = 1.0 - smoothstep( uFade.z, uFade.w, gj );
  vec4 gm = vegMask( gp );
  float drift = smoothstep( 0.1, 0.7, vnoise( gp * 0.6 + 2.0 ) * 0.5 + 0.5 );
  if ( r1.x > gm.b * keep * uDensity * mix( 0.35, 1.0, drift ) ) VEG_CULL
  float type = r1.y;
  float H, R, cup;
  vec3 petal, centre;
  if ( type < 0.48 ) {        // chamomile / ox-eye daisy
    H = mix( 0.2, 0.46, r1.z ); R = mix( 0.017, 0.027, r1.w ); cup = 0.12; petal = uDaisy; centre = uDaisyC;
  } else if ( type < 0.7 ) {  // buttercup
    H = mix( 0.24, 0.5, r1.z ); R = mix( 0.011, 0.016, r1.w ); cup = 0.55; petal = uButter; centre = uButter * 0.8;
  } else if ( type < 0.88 ) { // forget-me-not / bugle, pale blue
    H = mix( 0.12, 0.3, r1.z ); R = mix( 0.009, 0.014, r1.w ); cup = 0.15; petal = uBlue; centre = uDaisyC * 0.9;
  } else {                    // white clover, low ball
    H = mix( 0.06, 0.15, r1.z ); R = mix( 0.011, 0.015, r1.w ); cup = -1.2; petal = uClover; centre = uClover;
  }
  H *= 1.0 + gm.g * 0.7;
  float gy = vegTerrain( gp );
  vec3 gbase = vec3( gp.x, gy - 0.02, gp.y );
  if ( vegOffscreen( gbase + vec3( 0.0, H * 0.5, 0.0 ), H * 0.6 + 0.2 ) ) VEG_CULL

  vec4 r2 = vec4( hash12( gp * 5.1 + 2.2 ), hash12( gp * 6.3 - 1.1 ), hash12( gp * 0.37 + 4.4 ), hash12( gp * 8.9 + 0.5 ) );
  float gust;
  float wind = vegWind( gp, gust );
  float ang = r2.x * 6.2831853;
  vec2 fdir = vec2( cos( ang ), sin( ang ) );
  float flutter = sin( uTime * ( 1.7 + r2.z * 2.0 ) + r2.w * 6.28 ) * ( 0.04 + 0.05 * uWindStrength );
  vec2 bendV = fdir * mix( 0.05, 0.45, r2.y ) + uWindDir * ( wind * ( 0.15 + H * 1.1 ) + flutter );
  float bl = length( bendV );
  float phi = clamp( bl, 0.001, 1.6 );
  vec2 bdir = bendV / max( bl, 1e-4 );

  vec3 vegPos, objectNormal;
  if ( aPart < 0.5 ) {
    float t = position.y;
    float a = phi * t, sa = sin( a ), ca = cos( a );
    vec3 p = gbase + vec3( bdir.x * H * ( 1.0 - ca ) / phi, H * sa / phi, bdir.y * H * ( 1.0 - ca ) / phi );
    vec3 tang = vec3( bdir.x * sa, ca, bdir.y * sa );
    vec3 side = normalize( cross( tang, cameraPosition - p ) );
    vegPos = p + side * ( position.x * 0.0022 * ( 1.2 - 0.4 * t ) );
    objectNormal = normalize( cross( side, tang ) + side * position.x * 0.6 );
    vVegCol = uStem * mix( 0.3, 1.0, t );
    vVegTrans = 0.3;
  } else {
    float sa = sin( phi ), ca = cos( phi );
    vec3 top = gbase + vec3( bdir.x * H * ( 1.0 - ca ) / phi, H * sa / phi, bdir.y * H * ( 1.0 - ca ) / phi );
    vec3 tang = vec3( bdir.x * sa, ca, bdir.y * sa );
    // Heads turn up and a little toward the moon.
    vec3 n = normalize( tang + vec3( uMoonDir.x, 0.0, uMoonDir.z ) * 0.55 + vec3( r2.z - 0.5, 0.0, r2.w - 0.5 ) * 0.6 );
    vec3 u = normalize( cross( n, vec3( 0.0, 0.0, 1.0 ) ) );
    vec3 v = cross( n, u );
    float pa = r2.y * 6.2831853;
    vec2 dc = vec2( position.x * cos( pa ) - position.z * sin( pa ), position.x * sin( pa ) + position.z * cos( pa ) );
    float rr = length( position.xz );
    float lift = cup * rr * rr * R * 0.6 + ( rr < 0.01 ? R * 0.25 : 0.0 );
    if ( cup < -0.5 ) lift = ( sqrt( max( 1.0 - rr * rr, 0.0 ) ) - 0.4 ) * R * 0.9;
    vegPos = top + ( u * dc.x + v * dc.y ) * R + n * lift;
    objectNormal = normalize( n + ( u * dc.x + v * dc.y ) * ( cup < -0.5 ? 1.2 : -cup * 0.8 ) );
    vVegCol = rr < 0.01 ? centre : petal * mix( 0.75, 1.0, rr );
    vVegTrans = 0.7;
  }
`;

const SEED_PARS = /* glsl */ `
attribute float aPart;
uniform vec3 uSeedStem, uSeedHeadA, uSeedHeadB;
varying vec3 vVegCol;
varying float vVegTrans;
`;

const SEED_MAIN = /* glsl */ `
  vec2 gp = vegWrap();
  float gd = distance( gp, uCam );
  vec4 r1 = vec4( hash12( gp * 1.33 + 4.71 ), hash12( gp * 2.91 + 0.13 ), hash12( gp * 0.517 + 6.7 ), hash12( gp * 3.17 + 1.9 ) );
  float gj = gd + ( hash12( gp * 3.3 + 2.3 ) - 0.5 ) * FADE_JITTER;
  float keep = 1.0 - smoothstep( uFade.z, uFade.w, gj );
  vec4 gm = vegMask( gp );
  float clump = vnoise( gp * 0.37 + 9.0 ) * 0.5 + 0.5;
  float dens = gm.r * mix( 0.15, 1.0, gm.g * gm.g ) * smoothstep( 0.25, 0.75, clump );
  if ( r1.x > dens * keep * uDensity ) VEG_CULL
  float panicle = step( 0.72, r1.y );
  float H = mix( 0.36, 0.7, r1.z ) * mix( 0.75, 1.3, gm.g );
  float Lh = panicle > 0.5 ? mix( 0.07, 0.12, r1.w ) : mix( 0.035, 0.085, r1.w );
  float Wh = panicle > 0.5 ? mix( 0.014, 0.022, r1.w ) : mix( 0.006, 0.009, r1.w );
  float L = H + Lh;
  float gy = vegTerrain( gp );
  vec3 gbase = vec3( gp.x, gy - 0.02, gp.y );
  if ( vegOffscreen( gbase + vec3( 0.0, L * 0.5, 0.0 ), L * 0.7 + 0.2 ) ) VEG_CULL

  vec4 r2 = vec4( hash12( gp * 5.9 + 2.0 ), hash12( gp * 6.7 - 3.1 ), hash12( gp * 0.47 + 1.4 ), hash12( gp * 9.3 + 2.5 ) );
  float gust;
  float wind = vegWind( gp, gust );
  float ang = r2.x * 6.2831853;
  vec2 fdir = vec2( cos( ang ), sin( ang ) );
  float flutter = sin( uTime * ( 1.9 + r2.z * 2.2 ) + r2.w * 6.28 ) * ( 0.05 + 0.06 * uWindStrength );
  vec2 bendV = fdir * ( mix( 0.1, 0.45, r2.y ) + panicle * 0.5 ) + uWindDir * ( wind * ( 0.2 + L * 1.3 ) + flutter );
  float bl = length( bendV );
  float phi = clamp( bl, 0.001, 2.0 );
  vec2 bdir = bendV / max( bl, 1e-4 );
  // Arc parameter along the whole stalk; the head bends more (nodding panicles).
  float t = aPart < 0.5 ? position.y * ( H / L ) : ( H + position.y * Lh ) / L;
  float a = phi * t * t * 1.4 / ( 0.4 + t );
  float sa = sin( a ), ca = cos( a );
  vec3 p = gbase + vec3( bdir.x * L * t * sa * 0.9, L * t * mix( 1.0, ca, 0.5 ), bdir.y * L * t * sa * 0.9 );
  vec3 tang = normalize( vec3( bdir.x * sa, ca, bdir.y * sa ) );
  vec3 side = normalize( cross( tang, cameraPosition - p ) );
  float w;
  vec3 objectNormal;
  if ( aPart < 0.5 ) {
    w = 0.0017 * ( 1.2 - 0.4 * position.y );
    vVegCol = uSeedStem * mix( 0.3, 1.0, position.y );
    vVegTrans = 0.3;
  } else {
    float ht = position.y;
    w = Wh * pow( max( sin( 3.14159 * min( ht * 1.08, 1.0 ) ), 0.0 ), 0.7 ) * 0.5;
    vVegCol = mix( uSeedHeadA, uSeedHeadB, r2.y ) * mix( 0.7, 1.05, ht );
    vVegTrans = 0.9;
  }
  vec3 vegPos = p + side * ( position.x * w );
  objectNormal = normalize( cross( side, tang ) + side * position.x * 0.7 );
`;

// ---------- material / mesh ----------

function makePatch(ctx, fields, o) {
  const { world } = ctx;
  const rng = ctx.rng(o.seed);
  const grid = jitterGrid(o.tile, o.density, rng);
  const geo = new THREE.InstancedBufferGeometry();
  geo.index = o.template.index;
  for (const [k, v] of Object.entries(o.template.attributes)) geo.setAttribute(k, v);
  geo.setAttribute('aOff', new THREE.InstancedBufferAttribute(grid.arr, 2));
  geo.instanceCount = grid.count;

  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: o.roughness, metalness: 0, side: THREE.DoubleSide });
  mat.defines = Object.assign({ VEG_SOFTEN: '0.26', VEG_SPEC: '0.28', GRASS_WSCALE: '1.0', TUFT_R: '0.05', FADE_JITTER: '1.0' }, o.defines || {});
  const center = { value: new THREE.Vector2() };
  const uniforms = Object.assign({
    uTime: ctx.uniforms.uTime,
    uWindStrength: ctx.uniforms.uWindStrength,
    uWindDir: ctx.uniforms.uWindDir,
    uCenter: center,
    uCam: o.cam,
    uTile: { value: o.tile },
    uFade: { value: new THREE.Vector4(...o.fade) },
    uDensity: { value: o.keep ?? 1 },
    uMoonDir: { value: world.MOON_DIR.clone() },
    tVegH: { value: fields.heightTex },
    uVegH: { value: fields.heightInfo },
    uVegHSize: { value: fields.heightSize },
    tVegM: { value: fields.maskTex },
    uVegM: { value: fields.maskInfo },
    uTransCol: { value: o.trans },
  }, o.uniforms);
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${GLSL_VEG_COMMON}\n${GLSL_PATCH_PARS}\n${o.pars}`)
      .replace('#include <beginnormal_vertex>', o.main)
      .replace('#include <begin_vertex>', 'vec3 transformed = vegPos;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vVegCol;')
      .replace('#include <color_fragment>', '#include <color_fragment>\n\tdiffuseColor.rgb *= vVegCol;')
      .replace('#include <normal_fragment_begin>', GLSL_NORMAL_SOFTEN)
      .replace('#include <lights_physical_fragment>', '#include <lights_physical_fragment>\n\tmaterial.specularColor *= VEG_SPEC;')
      .replace('#include <lights_physical_pars_fragment>', `#include <lights_physical_pars_fragment>\n${GLSL_TRANSLUCENT}`);
  };
  mat.customProgramCacheKey = () => 'veg-patch-' + o.kind;

  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'grass-' + o.name;
  mesh.frustumCulled = false;
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  mesh.layers.set(world.LAYER_NO_REFLECT);
  mesh.userData.instances = grid.count;
  mesh.userData.trisPerInstance = o.template.index.count / 3;
  mesh.userData.center = center.value;
  // Radius that must stay inside the tile: the fade end plus the dither jitter.
  mesh.userData.reach = o.fade[3] + 0.5 * Number(mat.defines.FADE_JITTER);
  mesh.userData.tile = o.tile;
  return mesh;
}

// Centre of the axis-aligned box around the visible ground wedge (camera +- margin, arc of
// radius `reach` across the horizontal field of view). The tile is sized so the box fits.
const _fwd = new THREE.Vector3();
function wedgeCenter(out, cx, cz, fx, fz, half, reach, margin) {
  let x0 = cx - margin, x1 = cx + margin, z0 = cz - margin, z1 = cz + margin;
  const base = Math.atan2(fz, fx);
  const add = (a) => {
    const x = cx + Math.cos(a) * reach, z = cz + Math.sin(a) * reach;
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (z < z0) z0 = z; if (z > z1) z1 = z;
  };
  add(base - half); add(base + half); add(base);
  // Axis extremes that fall inside the wedge.
  for (let k = -4; k <= 4; k++) {
    const a = k * Math.PI / 2;
    let d = a - base;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    if (Math.abs(d) < half) add(a);
  }
  out.set((x0 + x1) * 0.5, (z0 + z1) * 0.5);
}

export function buildPatches(ctx, fields) {
  const low = ctx.quality === 'low';
  const cam = { value: new THREE.Vector2(ctx.camera.position.x, ctx.camera.position.z) };

  const grassU = {
    uGrassRoot: { value: lin('#1f301b') },
    uGrassTipA: { value: lin('#4f6c3a') },
    uGrassTipB: { value: lin('#627a42') },
    uGrassSilver: { value: lin('#7f978a') },
    uGrassDry: { value: lin('#8f8a68') },
    uGrassWet: { value: lin('#3f5f52') },
  };
  const trans = lin('#c8e0a0');

  // Near: dense tufts of curved 7-triangle blades. Mid: sparser tufts of wide 3-triangle blades.
  const close = makePatch(ctx, fields, {
    name: 'close', kind: 'grass', seed: 101, cam,
    template: tuftTemplate(4, 2),
    tile: low ? 7.0 : 8.6, density: low ? 44 : 64,
    fade: low ? [-9, -8, 2.6, 3.4] : [-9, -8, 3.6, 4.6], keep: 1,
    roughness: 0.8, trans, pars: GRASS_PARS, main: GRASS_MAIN, uniforms: grassU,
    defines: { FADE_JITTER: '0.8' },
  });
  const near = makePatch(ctx, fields, {
    name: 'near', kind: 'grass', seed: 151, cam,
    template: tuftTemplate(low ? 3 : 4, 2),
    tile: low ? 10.6 : 13.6, density: low ? 24 : 28,
    fade: low ? [2.6, 3.4, 4.6, 5.7] : [3.6, 4.6, 6.0, 7.6],
    roughness: 0.8, trans, pars: GRASS_PARS, main: GRASS_MAIN, uniforms: grassU,
    defines: { FADE_JITTER: '0.8' },
  });
  const mid = makePatch(ctx, fields, {
    name: 'mid', kind: 'grass-mid', seed: 202, cam,
    template: tuftTemplate(2, 1),
    tile: low ? 32.5 : 41.5, density: low ? 5.5 : 8,
    fade: low ? [4.6, 5.7, 15.0, 19.2] : [6.0, 7.6, 19.5, 24.5],
    roughness: 0.75, trans, pars: GRASS_PARS, main: GRASS_MAIN, uniforms: grassU,
    defines: { GRASS_WSCALE: '2.7', TUFT_R: '0.12', FADE_JITTER: '1.5' },
  });
  const flowers = makePatch(ctx, fields, {
    name: 'flowers', kind: 'flowers', seed: 303, cam,
    template: flowerTemplate(low ? 5 : 6, 2),
    tile: low ? 19 : 25.5, density: low ? 2.2 : 3.4,
    fade: low ? [-9, -8, 8, 10.5] : [-9, -8, 11, 14.5],
    roughness: 0.6, trans: lin('#e8f0d8'), pars: FLOWER_PARS, main: FLOWER_MAIN,
    defines: { VEG_SOFTEN: '0.15', FADE_JITTER: '2.0' },
    uniforms: {
      uDaisy: { value: lin('#c9ccc2') },
      uDaisyC: { value: lin('#b39a3c') },
      uButter: { value: lin('#c2b35c') },
      uBlue: { value: lin('#7d93c2') },
      uClover: { value: lin('#c4c0bc') },
      uStem: { value: lin('#3e5232') },
    },
  });
  const seeds = makePatch(ctx, fields, {
    name: 'seeds', kind: 'seeds', seed: 404, cam,
    template: seedTemplate(2, low ? 2 : 3),
    tile: low ? 17 : 24, density: low ? 2.0 : 3.2,
    fade: low ? [-9, -8, 7.5, 9.5] : [-9, -8, 10.5, 13.5],
    roughness: 0.75, trans: lin('#e0e4c0'), pars: SEED_PARS, main: SEED_MAIN,
    defines: { VEG_SOFTEN: '0.2', FADE_JITTER: '2.0' },
    uniforms: {
      uSeedStem: { value: lin('#575e42') },
      uSeedHeadA: { value: lin('#6e6c5c') },
      uSeedHeadB: { value: lin('#625a66') },
    },
  });
  const patches = [close, near, mid, flowers, seeds];

  const DEG = Math.PI / 180;
  function update() {
    const c = ctx.camera;
    cam.value.set(c.position.x, c.position.z);
    c.getWorldDirection(_fwd);
    let fx = _fwd.x, fz = _fwd.z;
    const l = Math.hypot(fx, fz);
    if (l < 1e-4) { fx = 0; fz = -1; } else { fx /= l; fz /= l; }
    const halfH = Math.atan(Math.tan(c.fov * DEG * 0.5) * c.aspect) + 0.13;
    for (const m of patches) {
      const { reach, tile } = m.userData;
      // Never ask for more than the tile can hold (ultra-wide screens lose the far corners).
      const half = Math.min(halfH, Math.asin(Math.min(1, (tile - 0.4) / (2 * reach))), Math.PI * 0.75);
      wedgeCenter(m.userData.center, c.position.x, c.position.z, fx, fz, half, reach, 1.2);
    }
  }
  update();
  ctx.onUpdate(update);
  return patches;
}
