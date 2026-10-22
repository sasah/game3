// Ground mist over the pond and the hollows by the shore: a few stacked horizontal sheets with
// drifting fbm, optical depth growing at grazing angles, soft intersection with the ground (baked
// height map), forward-scattering toward the moon and a fade near the eye. One draw call.
import * as THREE from 'three';

const vertexShader = /* glsl */ `
  #include <fog_pars_vertex>
  attribute float aLayer;
  varying vec3 vWorld;
  varying float vLayer;
  void main() {
    vLayer = aLayer;
    vec4 wp = modelMatrix * vec4( position, 1.0 );
    vWorld = wp.xyz;
    vec4 mvPosition = viewMatrix * wp;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }`;

const fragmentShader = /* glsl */ `
  #include <fog_pars_fragment>
  uniform sampler2D tNoise;
  uniform sampler2D tGround;
  uniform vec4 uGroundXform;
  uniform vec2 uDrift;
  uniform float uTime;
  uniform vec2 uWindDir;
  uniform vec3 uMoonDir;
  uniform vec3 uMistColor;
  uniform float uDensity;
  varying vec3 vWorld;
  varying float vLayer;
  void main() {
    vec4 gm = texture2D( tGround, vWorld.xz * uGroundXform.xy + uGroundXform.zw );
    float ground = max( gm.r, 0.0 );
    float above = vWorld.y - ground;
    // Soft where the sheet meets the bank, thinning out higher above the local ground.
    float soft = smoothstep( 0.03, 0.5, above ) * ( 1.0 - smoothstep( 0.7, 1.7, above ) );

    vec2 p = vWorld.xz;
    vec2 wd = uWindDir;
    vec2 q = vec2( dot( p, wd ), dot( p, vec2( - wd.y, wd.x ) ) ) - vec2( uDrift.x, 0.0 ) * ( 1.0 + 0.25 * vLayer );
    // Wisps stretched downwind, slowly evolving; a broad layer keeps whole banks of it coming and going.
    float n1 = texture2D( tNoise, q * vec2( 0.021, 0.065 ) + vec2( vLayer * 0.37, vLayer * 0.71 ) ).r;
    float n2 = texture2D( tNoise, q * vec2( 0.07, 0.15 ) + vec2( 0.5 + uTime * 0.004, vLayer * 0.53 ) ).g;
    float n3 = texture2D( tNoise, p * 0.017 + vec2( uDrift.y * 0.0015, 0.3 * vLayer ) ).b;
    float n = n1 * 0.5 + n2 * 0.3 + n3 * 0.3;
    float dens = gm.g * soft * smoothstep( 0.48, 0.82, n );

    vec3 ray = vWorld - cameraPosition;
    float dist = length( ray );
    vec3 rd = ray / dist;
    float sinA = max( abs( rd.y ), 0.06 );
    float tau = dens * uDensity / sinA;
    float a = 1.0 - exp( - tau );
    a *= smoothstep( 1.5, 8.0, dist );
    a = min( a, 0.45 );

    float mu = max( dot( rd, uMoonDir ), 0.0 );
    vec3 col = uMistColor * ( 0.7 + 0.5 * mu * mu + 2.4 * pow( mu, 10.0 ) );
    gl_FragColor = vec4( col, a );
    #include <fog_fragment>
  }`;

export function buildMist(ctx, ground, noise) {
  const { world, quality } = ctx;
  const heights = quality === 'high' ? [0.22, 0.48, 0.8, 1.15] : [0.3, 0.75];
  // Keep only cells where some mist can exist (mask > 0 at a corner) to limit overdraw.
  const cell = 2;
  const W = ground.W, H = ground.H, s = ground.step;
  const x0 = ground.gx0, z0 = ground.gz0, x1 = x0 + (W - 1) * s, z1 = z0 + (H - 1) * s;
  const nx = Math.floor((x1 - x0) / cell), nz = Math.floor((z1 - z0) / cell);
  const pos = [], lay = [], idx = [];
  heights.forEach((y, li) => {
    const vid = new Map();
    const v = (i, j) => {
      const k = j * (nx + 1) + i;
      let id = vid.get(k);
      if (id === undefined) {
        id = pos.length / 3;
        pos.push(x0 + i * cell, world.WATER_LEVEL + y, z0 + j * cell);
        lay.push(li);
        vid.set(k, id);
      }
      return id;
    };
    for (let j = 0; j < nz; j++) {
      for (let i = 0; i < nx; i++) {
        const cx = x0 + i * cell, cz = z0 + j * cell;
        let m = 0, hmin = Infinity;
        for (let a = 0; a <= 2; a++) for (let b = 0; b <= 2; b++) {
          m = Math.max(m, ground.mistAt(cx + a * cell / 2, cz + b * cell / 2));
          hmin = Math.min(hmin, ground.heightAt(cx + a * cell / 2, cz + b * cell / 2));
        }
        if (m < 0.02 || hmin > y + 0.02) continue;
        const A = v(i, j), B = v(i + 1, j), C = v(i, j + 1), D = v(i + 1, j + 1);
        idx.push(A, C, B, B, C, D);
      }
    }
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('aLayer', new THREE.Float32BufferAttribute(lay, 1));
  geo.setIndex(idx);
  geo.computeBoundingSphere();

  const uniforms = THREE.UniformsUtils.merge([THREE.UniformsLib.fog]);
  Object.assign(uniforms, {
    tNoise: { value: noise },
    tGround: { value: ground.tex },
    uGroundXform: { value: ground.xform },
    uDrift: { value: new THREE.Vector2() },
    uTime: ctx.uniforms.uTime,
    uWindDir: ctx.uniforms.uWindDir,
    uMoonDir: { value: world.MOON_DIR.clone().normalize() },
    uMistColor: { value: new THREE.Color().setRGB(0.1, 0.128, 0.148) },
    uDensity: { value: quality === 'high' ? 0.042 : 0.075 },
  });
  const mat = new THREE.ShaderMaterial({
    name: 'PondMist',
    uniforms, vertexShader, fragmentShader,
    fog: true,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.name = 'pond-mist';
  mesh.layers.set(world.LAYER_NO_REFLECT);
  mesh.renderOrder = 2;
  mesh.frustumCulled = true;
  ctx.scene.add(mesh);

  const drift = uniforms.uDrift.value;
  ctx.onUpdate((dt) => {
    const ws = ctx.uniforms.uWindStrength.value;
    drift.x += dt * (0.12 + 0.16 * ws);
    drift.y += dt;
  });
  return { mesh, triangles: idx.length / 3 };
}
