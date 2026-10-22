// Pond surface: tessellated water sheet clipped to the basin, planar reflection rendered from a
// mirrored camera (layer 0 only, reduced resolution), wind-driven procedural ripples, fresnel
// over a dark absorbing water body, a moon glitter path and soft depth-faded shoreline.
import * as THREE from 'three';
import { GLSL_NOISE } from './noise.js';

const vertexShader = /* glsl */ `
  #include <common>
  #include <fog_pars_vertex>
  #include <shadowmap_pars_vertex>
  uniform mat4 uTexMatrix;
  varying vec4 vRefl;
  varying vec3 vWorld;
  varying vec2 vProj;
  void main() {
    vProj = vec2( projectionMatrix[ 0 ][ 0 ], projectionMatrix[ 1 ][ 1 ] );
    #include <beginnormal_vertex>
    #include <defaultnormal_vertex>
    #include <begin_vertex>
    #include <project_vertex>
    #include <worldpos_vertex>
    #include <shadowmap_vertex>
    #include <fog_vertex>
    vWorld = ( modelMatrix * vec4( position, 1.0 ) ).xyz;
    vRefl = uTexMatrix * vec4( position, 1.0 );
  }`;

const fragmentShader = /* glsl */ `
  #include <common>
  #include <packing>
  #include <fog_pars_fragment>
  #include <bsdfs>
  #include <lights_pars_begin>
  #include <shadowmap_pars_fragment>
  #include <shadowmask_pars_fragment>

  uniform sampler2D tRefl;
  uniform sampler2D tReflDepth;
  uniform sampler2D tRipple;
  uniform sampler2D tNoise;
  uniform sampler2D tGround;
  uniform vec4 uGroundXform;
  uniform vec4 uFlow;          // accumulated downwind drift (m) for: patches, big, mid, small
  uniform float uTime;
  uniform float uWindStrength;
  uniform vec2 uWindDir;
  uniform vec3 uMoonDir;
  uniform vec3 uMoonColor;
  uniform vec3 uBodyColor;
  uniform float uAbsorb;
  uniform float uDistort;
  uniform float uReflBoost;
  uniform vec4 uRings[ 4 ];    // x, z, start time, amplitude
  varying vec4 vRefl;
  varying vec3 vWorld;
  varying vec2 vProj;

  ${GLSL_NOISE}

  // Same lattice as the sky's bright star layer, so the pond mirrors the actual stars.
  float starRefl( vec3 d ) {
    vec3 a = abs( d );
    vec2 uv; float face;
    if ( a.x >= a.y && a.x >= a.z ) { uv = d.yz / a.x; face = d.x > 0.0 ? 0.0 : 1.0; }
    else if ( a.y >= a.z ) { uv = d.xz / a.y; face = d.y > 0.0 ? 2.0 : 3.0; }
    else { uv = d.xy / a.z; face = d.z > 0.0 ? 4.0 : 5.0; }
    vec2 g = uv * 140.0;
    vec2 seed = floor( g ) + face * 131.7;
    float pick = hash12( seed );
    if ( pick > 0.16 ) return 0.0;
    vec2 pos = vec2( hash12( seed + 3.1 ), hash12( seed + 7.7 ) ) * 0.7 + 0.15;
    float mag = pow( hash12( seed + 11.3 ), 6.0 );
    float dist = length( fract( g ) - pos );
    return smoothstep( 0.16, 0.0, dist ) * ( 0.1 + 3.0 * mag );
  }

  vec2 rippleLayer( vec2 q, float tile, float ang, float drift, vec2 off ) {
    float c = cos( ang ), s = sin( ang );
    mat2 R = mat2( c, s, -s, c );
    vec2 uv = ( R * q ) / tile + off;
    uv.x -= drift / tile;
    vec2 t = texture2D( tRipple, uv ).rg * 2.0 - 1.0;
    return ( t * R ) * 3.0; // back to wind space, unit RMS
  }

  void main() {
    vec3 P = vWorld;
    vec3 toCam = cameraPosition - P;
    float dist = length( toCam );
    vec3 V = toCam / dist;

    vec4 gm = texture2D( tGround, P.xz * uGroundXform.xy + uGroundXform.zw );
    float depth = - gm.r;
    float edge = smoothstep( 0.0, 0.07, depth );

    // Wind-aligned frame: u downwind, v across.
    vec2 wd = uWindDir;
    vec2 wp = vec2( - wd.y, wd.x );
    vec2 q = vec2( dot( P.xz, wd ), dot( P.xz, wp ) );

    // Gust patches ("cat's paws") drifting downwind; mirror-calm water between them.
    float wind = clamp( ( uWindStrength - 0.4 ) / 1.6, 0.0, 1.0 );
    float g1 = texture2D( tNoise, q * vec2( 0.026, 0.04 ) + vec2( - uFlow.x * 0.026, 0.13 ) ).r;
    float g2 = texture2D( tNoise, q * 0.071 + vec2( - uFlow.x * 0.09, uTime * 0.004 ) ).g;
    float gust = smoothstep( 0.68 - 0.1 * wind, 0.92, g1 * 0.65 + g2 * 0.35 );
    float shelter = smoothstep( 0.05, 0.8, depth );
    float rough = ( 0.04 + gust * ( 0.25 + 0.6 * wind ) ) * shelter;

    // Ripple slopes, wind space. The big layer is always there: slow swell that bends reflections.
    float fine = 1.0 - smoothstep( 6.0, 30.0, dist );
    vec2 sl = rippleLayer( q, 9.0, 0.0, uFlow.y, vec2( 0.0 ) ) * ( 0.0045 + 0.004 * wind );
    sl += rippleLayer( q, 2.6, 0.42, uFlow.z, vec2( 0.31, 0.17 ) ) * 0.026 * rough;
    sl += rippleLayer( q, 0.93, -0.55, uFlow.w, vec2( 0.73, 0.41 ) ) * 0.022 * rough;
    #ifndef WATER_LOW
    sl += rippleLayer( q, 0.41, 1.2, uFlow.w * 1.3, vec2( 0.11, 0.87 ) ) * 0.016 * rough * fine;
    #endif
    vec2 slope = sl.x * wd + sl.y * wp;

    // Rings from rising fish.
    for ( int i = 0; i < 4; i ++ ) {
      vec4 Rg = uRings[ i ];
      float age = uTime - Rg.z;
      if ( age > 0.0 && age < 7.0 ) {
        vec2 dv = P.xz - Rg.xy;
        float r = length( dv ) + 1e-4;
        float x = r - ( 0.05 + age * 0.3 );
        float w = 0.035 + 0.05 * age;
        float env = exp( - x * x / w ) * exp( - age * 0.6 ) * Rg.w * smoothstep( 0.0, 0.15, age );
        float k = 26.0 / ( 1.0 + 0.25 * age );
        slope += ( dv / r ) * ( - sin( k * x ) * env * 0.16 );
      }
    }
    slope *= edge;

    vec3 N = normalize( vec3( - slope.x, 1.0, - slope.y ) );
    float NdV = clamp( dot( N, V ), 0.02, 1.0 );
    float F = 0.02 + 0.98 * pow( 1.0 - NdV, 5.0 );
    F = min( 1.0, F * uReflBoost );

    // Planar reflection, displaced the way a tilted facet bends the reflected ray:
    // along the view (vertical streaks) by cos, across it by sin of the grazing angle.
    vec2 fwd = normalize( - toCam.xz + 1e-5 );
    vec2 perp = vec2( - fwd.y, fwd.x );
    float sinA = clamp( V.y, 0.0, 1.0 );
    float cosA = sqrt( 1.0 - sinA * sinA );
    vec2 uv = vRefl.xy / vRefl.w;
    vec2 off = vec2( dot( slope, perp ) * sinA * vProj.x, dot( slope, fwd ) * cosA * vProj.y );
    uv += off * uDistort;
    vec2 uvc = clamp( uv, vec2( 0.002 ), vec2( 0.998 ) );
    vec3 refl = texture2D( tRefl, uvc ).rgb;
    // Stars caught in the still water where the mirror shows open sky (depth cleared = 1).
    vec3 Rd = reflect( - V, N );
    #ifndef WATER_LOW
    if ( Rd.y > 0.03 && texture2D( tReflDepth, uvc ).r > 0.99999 ) {
      float st = starRefl( Rd ) * smoothstep( 0.03, 0.3, Rd.y ) * ( 1.0 - smoothstep( 0.85, 0.995, dot( Rd, uMoonDir ) ) );
      refl += vec3( 0.75, 0.82, 1.0 ) * st * 0.3;
    }
    #endif

    // Moon glitter: Beckmann lobe on the rippled normal; sub-pixel roughness grows with distance
    // (ripples lost to filtering) so the far path stays a broad shimmering band.
    vec3 L = uMoonDir;
    vec3 Hh = normalize( L + V );
    float NdH = max( dot( N, Hh ), 1e-3 );
    float m = 0.05 + 0.06 * rough + dist * 0.0012;
    float m2 = m * m, c2 = NdH * NdH;
    float D = exp( ( c2 - 1.0 ) / ( m2 * c2 ) ) / ( 3.14159 * m2 * c2 * c2 );
    float VdH = max( dot( V, Hh ), 0.0 );
    float Fh = 0.02 + 0.98 * pow( 1.0 - VdH, 5.0 );
    vec3 glitter = uMoonColor * ( Fh * D / ( 4.0 * NdV ) ) * step( 0.0, dot( N, L ) );
    // Sparkle: concentrate the unresolved glitter into twinkling glints (mean stays ~1).
    float tw = texture2D( tNoise, q * vec2( 2.9, 1.3 ) + vec2( - uFlow.w * 2.9, 0.0 ) ).a;
    #ifdef WATER_LOW
    tw *= 0.72;
    #else
    tw *= texture2D( tNoise, q * vec2( 2.1, 0.9 ) + vec2( uTime * 0.05, - uFlow.z * 0.9 ) ).a;
    #endif
    float sparkle = mix( 1.0, 0.25 + 6.0 * smoothstep( 0.22, 0.5, tw ), fine * 0.85 );
    glitter *= sparkle;
    // Broad silver sheen under the glints (Kuindzhi's luminous path), no sparkle.
    float mb = 0.14 + 0.08 * rough;
    float mb2 = mb * mb;
    float Db = exp( ( c2 - 1.0 ) / ( mb2 * c2 ) ) / ( 3.14159 * mb2 * c2 * c2 );
    glitter += uMoonColor * ( 0.35 * Fh * Db / ( 4.0 * NdV ) );
    float gl = dot( glitter, vec3( 0.3333 ) );
    if ( gl > 0.002 ) glitter *= getShadowMask();

    // Dark water body: light from the bottom is absorbed along the refracted path.
    float T = exp( - depth * uAbsorb / max( sinA, 0.2 ) );
    vec3 rgbP = refl * F + uBodyColor * ( 1.0 - F ) * ( 1.0 - T ) + glitter;
    float aP = 1.0 - ( 1.0 - F ) * T;
    rgbP *= edge;
    aP *= edge;

    gl_FragColor = vec4( rgbP / max( aP, 1e-4 ), aP );
    #if WATER_DEBUG == 1
      gl_FragColor = vec4( refl, 1.0 );
    #elif WATER_DEBUG == 2
      gl_FragColor = vec4( vec3( F ), 1.0 );
    #elif WATER_DEBUG == 3
      gl_FragColor = vec4( glitter, 1.0 );
    #elif WATER_DEBUG == 6
      gl_FragColor = vec4( rough, gust, length( slope ) * 20.0, 1.0 );
    #elif WATER_DEBUG == 4
      gl_FragColor = vec4( N * 0.5 + 0.5, 1.0 ) * 0.3;
    #endif
    #include <fog_fragment>
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    gl_FragColor.rgb *= gl_FragColor.a;
  }`;

export function buildSurface(ctx, maps, ripples, noise) {
  const { camera, world, quality, params } = ctx;
  const ground = maps;
  const WL = world.WATER_LEVEL;

  // Sheet: ground-grid cells that dip below the water (exact against the terrain triangles).
  const pos = [], idx = [];
  const vid = new Map();
  const W = ground.W, H = ground.H, step = ground.step;
  const vtx = (i, j) => {
    const key = j * W + i;
    let v = vid.get(key);
    if (v === undefined) {
      v = pos.length / 3;
      pos.push(ground.gx0 + i * step, WL, ground.gz0 + j * step);
      vid.set(key, v);
    }
    return v;
  };
  for (let j = 0; j < H - 1; j++) {
    for (let i = 0; i < W - 1; i++) {
      const h = ground.height;
      const lo = Math.min(h[j * W + i], h[j * W + i + 1], h[(j + 1) * W + i], h[(j + 1) * W + i + 1]);
      if (lo > WL + 0.02) continue;
      const a = vtx(i, j), b = vtx(i + 1, j), c = vtx(i, j + 1), d = vtx(i + 1, j + 1);
      idx.push(a, c, b, b, c, d);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const nrm = new Float32Array(pos.length);
  for (let i = 1; i < nrm.length; i += 3) nrm[i] = 1;
  geo.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  geo.setIndex(idx);
  geo.computeBoundingSphere();
  geo.computeBoundingBox();

  // Reflection target: linear HDR so the moon keeps its punch for bloom.
  const reflScale = Number(params.get('reflScale')) || (quality === 'high' ? 0.5 : 0.3);
  const maxW = quality === 'high' ? 1280 : 512;
  const maxPix = quality === 'high' ? 1280 * 720 : 512 * 288; // portrait phones too
  const depthTex = new THREE.DepthTexture(16, 16);
  const rt = new THREE.WebGLRenderTarget(16, 16, { type: THREE.HalfFloatType, samples: 0, depthBuffer: true, depthTexture: depthTex });
  rt.texture.generateMipmaps = false;
  rt.texture.minFilter = THREE.LinearFilter;
  rt.texture.magFilter = THREE.LinearFilter;

  const textureMatrix = new THREE.Matrix4();
  const uniforms = THREE.UniformsUtils.merge([THREE.UniformsLib.lights, THREE.UniformsLib.fog]);
  Object.assign(uniforms, {
    tRefl: { value: rt.texture },
    tReflDepth: { value: depthTex },
    tRipple: { value: ripples },
    tNoise: { value: noise },
    tGround: { value: ground.tex },
    uGroundXform: { value: ground.xform },
    uTexMatrix: { value: textureMatrix },
    uFlow: { value: new THREE.Vector4() },
    uTime: ctx.uniforms.uTime,
    uWindStrength: ctx.uniforms.uWindStrength,
    uWindDir: ctx.uniforms.uWindDir,
    uMoonDir: { value: world.MOON_DIR.clone().normalize() },
    uMoonColor: { value: new THREE.Color().setRGB(1.0, 0.96, 0.86).multiplyScalar(0.02) },
    uBodyColor: { value: new THREE.Color().setRGB(0.0045, 0.0105, 0.0105) },
    uAbsorb: { value: 3.2 },
    uDistort: { value: 1.0 },
    uReflBoost: { value: 1.12 },
    uRings: { value: [0, 1, 2, 3].map(() => new THREE.Vector4(0, 0, -100, 0)) },
  });
  const mat = new THREE.ShaderMaterial({
    name: 'PondWater',
    defines: Object.assign({ WATER_DEBUG: Number(params.get('wdebug') || 0) }, quality === 'low' ? { WATER_LOW: 1 } : {}),
    uniforms,
    vertexShader,
    fragmentShader,
    lights: true,
    fog: true,
    transparent: false, // stays in the opaque queue, drawn after other opaques (renderOrder)
    depthWrite: true,
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
    blendSrcAlpha: THREE.ZeroFactor,
    blendDstAlpha: THREE.OneFactor,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'pond-water';
  mesh.renderOrder = 5;
  mesh.receiveShadow = true;
  mesh.castShadow = false;

  // Mirrored camera (Lengyel oblique near plane on the water plane).
  const vcam = new THREE.PerspectiveCamera();
  vcam.matrixWorldAutoUpdate = false;
  vcam.layers.set(0);
  vcam.layers.enable(world.LAYER_REFLECT_ONLY);
  const normal = new THREE.Vector3(0, 1, 0);
  const planePoint = new THREE.Vector3(0, WL, 0);
  const camPos = new THREE.Vector3(), view = new THREE.Vector3(), target = new THREE.Vector3();
  const lookAt = new THREE.Vector3(), rot = new THREE.Matrix4(), look = new THREE.Matrix4();
  const plane = new THREE.Plane(), clip = new THREE.Vector4(), qv = new THREE.Vector4();
  const bufSize = new THREE.Vector2();
  const clipBias = 0.003;
  const reflEnabled = params.get('refl') !== '0';

  mesh.onBeforeRender = (r, scene, cam) => {
    if (cam !== camera || !reflEnabled) return;
    r.getDrawingBufferSize(bufSize);
    let w = Math.max(64, Math.round(bufSize.x * reflScale));
    let h = Math.max(36, Math.round(bufSize.y * reflScale));
    if (w > maxW) { h = Math.round(h * maxW / w); w = maxW; }
    if (w * h > maxPix) { const k = Math.sqrt(maxPix / (w * h)); w = Math.round(w * k); h = Math.round(h * k); }
    if (rt.width !== w || rt.height !== h) rt.setSize(w, h);

    camPos.setFromMatrixPosition(cam.matrixWorld);
    if (camPos.y <= WL) return;
    view.set(camPos.x, 2 * WL - camPos.y, camPos.z);
    rot.extractRotation(cam.matrixWorld);
    lookAt.set(0, 0, -1).applyMatrix4(rot).add(camPos);
    target.copy(planePoint).sub(lookAt).reflect(normal).negate().add(planePoint);
    vcam.position.copy(view);
    vcam.up.set(0, 1, 0).applyMatrix4(rot).reflect(normal);
    // (Object3D.lookAt would read the stale matrixWorld since auto update is off.)
    look.lookAt(view, target, vcam.up);
    vcam.quaternion.setFromRotationMatrix(look);
    vcam.updateMatrix();
    vcam.matrixWorld.copy(vcam.matrix);
    vcam.matrixWorldInverse.copy(vcam.matrixWorld).invert();
    // Fog is computed from cameraPosition (taken from matrixWorld); the height fog would explode
    // for a camera below the water, so the shaders get the real eye position instead.
    vcam.matrixWorld.elements[12] = camPos.x;
    vcam.matrixWorld.elements[13] = camPos.y;
    vcam.matrixWorld.elements[14] = camPos.z;
    vcam.far = cam.far;
    vcam.near = cam.near;
    vcam.projectionMatrix.copy(cam.projectionMatrix);

    textureMatrix.set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
    textureMatrix.multiply(vcam.projectionMatrix).multiply(vcam.matrixWorldInverse).multiply(mesh.matrixWorld);

    plane.setFromNormalAndCoplanarPoint(normal, planePoint).applyMatrix4(vcam.matrixWorldInverse);
    clip.set(plane.normal.x, plane.normal.y, plane.normal.z, plane.constant);
    const e = vcam.projectionMatrix.elements;
    qv.set((Math.sign(clip.x) + e[8]) / e[0], (Math.sign(clip.y) + e[9]) / e[5], -1, (1 + e[10]) / e[14]);
    clip.multiplyScalar(2 / clip.dot(qv));
    e[2] = clip.x; e[6] = clip.y; e[10] = clip.z + 1 - clipBias; e[14] = clip.w;

    mesh.visible = false;
    const prevRT = r.getRenderTarget();
    const prevXR = r.xr.enabled;
    const prevShadow = r.shadowMap.autoUpdate;
    r.xr.enabled = false;
    r.shadowMap.autoUpdate = false;
    r.setRenderTarget(rt);
    r.state.buffers.depth.setMask(true);
    if (r.autoClear === false) r.clear();
    r.render(scene, vcam);
    r.xr.enabled = prevXR;
    r.shadowMap.autoUpdate = prevShadow;
    r.setRenderTarget(prevRT);
    mesh.visible = true;
  };

  // Wind drift accumulators (integrated so gusts change speed without jumps).
  const flow = uniforms.uFlow.value;
  ctx.onUpdate((dt) => {
    const ws = ctx.uniforms.uWindStrength.value;
    flow.x += dt * (0.35 + 0.5 * ws);
    flow.y += dt * (0.05 + 0.04 * ws);
    flow.z += dt * (0.12 + 0.12 * ws);
    flow.w += dt * (0.09 + 0.1 * ws);
  });

  ctx.scene.add(mesh);
  return { mesh, uniforms, rt };
}
