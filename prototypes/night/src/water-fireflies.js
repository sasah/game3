// Fireflies: warm yellow-green glints drifting 0.4-2 m above the ground by the reeds, in the
// orchard and along the meadow edges. One Points draw, everything animated in the vertex shader.
// They stay on layer 0 (castShadow off) so the pond reflects them as well.
import * as THREE from 'three';

const vertexShader = /* glsl */ `
  #include <fog_pars_vertex>
  attribute vec4 aSeed; // phase 0..1, drift speed, blink period (s), sprite size (m)
  uniform float uTime;
  uniform float uViewH;
  varying float vI;
  void main() {
    float ph = aSeed.x * 6.2831853;
    float t = uTime * aSeed.y;
    vec3 p = position;
    p.x += sin( t * 0.71 + ph ) * 0.6 + sin( t * 1.73 + ph * 2.0 ) * 0.2;
    p.z += cos( t * 0.63 + ph * 1.3 ) * 0.6 + sin( t * 1.41 + ph * 3.0 ) * 0.2;
    p.y += sin( t * 0.87 + ph * 0.7 ) * 0.25 + sin( t * 2.3 + ph ) * 0.05;
    vec4 mvPosition = modelViewMatrix * vec4( p, 1.0 );
    gl_Position = projectionMatrix * mvPosition;

    // Slow pulse: quick rise, long soft decay, dark pause; a faint afterglow between flashes.
    float c = fract( uTime / aSeed.z + aSeed.x );
    float flash = smoothstep( 0.0, 0.08, c ) * ( 1.0 - smoothstep( 0.1, 0.45, c ) );
    float glow = 0.05 + flash;

    float px = aSeed.w * projectionMatrix[ 1 ][ 1 ] * uViewH * 0.5 / max( - mvPosition.z, 0.2 );
    float s = clamp( px, 3.5, 48.0 );
    vI = glow * min( 1.0, ( px * px ) / ( s * s ) );
    gl_PointSize = s;
    #include <fog_vertex>
  }`;

const fragmentShader = /* glsl */ `
  #include <fog_pars_fragment>
  uniform vec3 uColor;
  varying float vI;
  void main() {
    vec2 d = gl_PointCoord * 2.0 - 1.0;
    float r2 = dot( d, d );
    if ( r2 > 1.0 ) discard;
    float core = exp( - r2 * 22.0 );
    float halo = exp( - r2 * 4.0 ) * ( 1.0 - r2 );
    vec3 col = uColor * ( core * 12.0 + halo * 0.6 ) * vI;
    // Additive: fog should only dim the glow, never add its own color.
    gl_FragColor = vec4( 0.0, 0.0, 0.0, 1.0 );
    {
      #include <fog_fragment>
    }
    vec3 fogAdd = gl_FragColor.rgb;
    gl_FragColor = vec4( col, 1.0 );
    #include <fog_fragment>
    gl_FragColor.rgb = max( gl_FragColor.rgb - fogAdd, 0.0 );
  }`;

export function buildFireflies(ctx) {
  const { world, quality } = ctx;
  const L = world.LAYOUT;
  const rnd = ctx.rng(4242);
  const count = Number(ctx.params.get('fireflies')) || (quality === 'high' ? 110 : 72);
  const pos = new Float32Array(count * 3);
  const seed = new Float32Array(count * 4);
  const pier = L.pier;
  const okSpot = (x, z) => {
    const b = L.bounds;
    if (Math.hypot(x - b.cx, z - b.cz) > b.r + 4) return false;
    if (Math.abs(x - pier.x) < 1.2 && z < pier.z0 + 1 && z > pier.z1 - 1) return false;
    return world.heightAt(x, z) > 0.12;
  };
  let n = 0, guard = 0;
  while (n < count && guard++ < count * 200) {
    const r = rnd();
    let x, z, y0 = 0.4, y1 = 1.6;
    if (r < 0.38) {
      // By the reeds along the shore.
      const a = rnd() * Math.PI * 2, k = 1.02 + rnd() * 0.3;
      const P = L.pond, c = Math.cos(P.rot), s = Math.sin(P.rot);
      const lx = Math.cos(a) * P.rx * k, lz = Math.sin(a) * P.rz * k;
      x = P.cx + lx * c - lz * s; z = P.cz + lx * s + lz * c;
      y0 = 0.35; y1 = 1.3;
    } else if (r < 0.68) {
      const o = L.orchard;
      x = o.x0 - 1 + rnd() * (o.x1 - o.x0 + 2); z = o.z0 - 1 + rnd() * (o.z1 - o.z0 + 2);
      y0 = 0.5; y1 = 2.1;
    } else {
      // Meadow edges: along the path and around the willows.
      if (rnd() < 0.55) {
        const p = L.path, i = Math.floor(rnd() * (p.length - 1)), t = rnd();
        const side = (rnd() < 0.5 ? -1 : 1) * (1.6 + rnd() * 3.5);
        const dx = p[i + 1][0] - p[i][0], dz = p[i + 1][1] - p[i][1], len = Math.hypot(dx, dz);
        x = p[i][0] + dx * t - dz / len * side; z = p[i][1] + dz * t + dx / len * side;
      } else {
        const w = L.willows[Math.floor(rnd() * L.willows.length)];
        const a = rnd() * Math.PI * 2, d = 1.5 + rnd() * 4;
        x = w[0] + Math.cos(a) * d; z = w[1] + Math.sin(a) * d;
      }
      y0 = 0.4; y1 = 1.8;
    }
    if (!okSpot(x, z)) continue;
    pos[n * 3] = x;
    pos[n * 3 + 1] = world.heightAt(x, z) + y0 + Math.pow(rnd(), 1.4) * (y1 - y0);
    pos[n * 3 + 2] = z;
    seed[n * 4] = rnd();
    seed[n * 4 + 1] = 0.25 + rnd() * 0.45;
    seed[n * 4 + 2] = 2.2 + rnd() * 4.5;
    seed[n * 4 + 3] = 0.07 + rnd() * 0.05;
    n++;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos.subarray(0, n * 3), 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed.subarray(0, n * 4), 4));
  geo.computeBoundingSphere();

  const uniforms = THREE.UniformsUtils.merge([THREE.UniformsLib.fog]);
  Object.assign(uniforms, {
    uTime: ctx.uniforms.uTime,
    uViewH: { value: 540 },
    uColor: { value: new THREE.Color('#d9f27a') },
  });
  const mat = new THREE.ShaderMaterial({
    name: 'Fireflies',
    uniforms, vertexShader, fragmentShader,
    fog: true,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const pts = new THREE.Points(geo, mat);
  pts.name = 'fireflies';
  pts.frustumCulled = false;
  pts.castShadow = false;
  pts.renderOrder = 3;
  const size = new THREE.Vector2();
  pts.onBeforeRender = (r) => {
    const rt = r.getRenderTarget();
    uniforms.uViewH.value = rt ? rt.height : r.getDrawingBufferSize(size).y;
  };
  ctx.scene.add(pts);
  return { points: pts, count: n };
}
