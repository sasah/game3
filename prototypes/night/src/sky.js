// Night sky dome: Kuindzhi-like deep blue-green gradient, moon with halo, stars, the faint
// Milky Way (Чумацький шлях) and thin moonlit clouds. Outputs linear HDR (the moon blooms).
import * as THREE from 'three';
import { GLSL_NOISE } from './noise.js';

export const SKY_HORIZON = new THREE.Color().setRGB(0.055, 0.1, 0.13);

export function buildSky(ctx) {
  const uniforms = {
    uMoonDir: { value: ctx.world.MOON_DIR.clone() },
    uTime: ctx.uniforms.uTime,
    uHorizon: { value: SKY_HORIZON },
  };
  const mat = new THREE.ShaderMaterial({
    uniforms,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize( position );
        vec4 p = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
        gl_Position = p.xyww; // stay on the far plane
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uMoonDir;
      uniform float uTime;
      uniform vec3 uHorizon;
      varying vec3 vDir;
      ${GLSL_NOISE}

      float starLayer( vec3 d, float scale, float prob ) {
        vec3 a = abs( d );
        vec2 uv; float face;
        if ( a.x >= a.y && a.x >= a.z ) { uv = d.yz / a.x; face = d.x > 0.0 ? 0.0 : 1.0; }
        else if ( a.y >= a.z ) { uv = d.xz / a.y; face = d.y > 0.0 ? 2.0 : 3.0; }
        else { uv = d.xy / a.z; face = d.z > 0.0 ? 4.0 : 5.0; }
        vec2 g = uv * scale;
        vec2 cell = floor( g );
        vec2 seed = cell + face * 131.7;
        float pick = hash12( seed );
        if ( pick > prob ) return 0.0;
        vec2 pos = vec2( hash12( seed + 3.1 ), hash12( seed + 7.7 ) ) * 0.7 + 0.15;
        float dist = length( fract( g ) - pos );
        float mag = pow( hash12( seed + 11.3 ), 6.0 );
        float tw = 0.75 + 0.25 * sin( uTime * ( 1.5 + 3.0 * hash12( seed + 5.0 ) ) + pick * 50.0 );
        return smoothstep( 0.09, 0.0, dist ) * ( 0.25 + 3.0 * mag ) * tw;
      }

      void main() {
        vec3 d = normalize( vDir );
        float h = d.y;
        float md = dot( d, uMoonDir );

        // Base gradient: luminous teal-blue horizon to deep zenith.
        vec3 zen = vec3( 0.006, 0.014, 0.038 );
        vec3 mid = vec3( 0.018, 0.045, 0.085 );
        vec3 col = mix( uHorizon, mid, smoothstep( 0.0, 0.22, h ) );
        col = mix( col, zen, smoothstep( 0.2, 0.85, h ) );

        // Moon halo and broad glow.
        float mdp = max( md, 0.0 );
        col += vec3( 0.06, 0.085, 0.1 ) * pow( mdp, 6.0 );
        col += vec3( 0.16, 0.19, 0.2 ) * pow( mdp, 60.0 );
        col += vec3( 0.5, 0.52, 0.5 ) * pow( mdp, 900.0 );

        // Milky Way along a tilted great circle.
        vec3 mwAxis = normalize( vec3( 0.55, 0.35, -0.75 ) );
        float band = exp( -pow( dot( d, mwAxis ) / 0.16, 2.0 ) );
        float mwN = 0.5 + 0.5 * fbm( d.xz * 6.0 / ( abs( d.y ) + 0.6 ) + 3.0 );
        float moonWash = 1.0 - smoothstep( 0.6, 0.98, md );
        col += vec3( 0.012, 0.016, 0.024 ) * band * mwN * moonWash * smoothstep( 0.05, 0.35, h );

        // Stars fade near the horizon, near the moon and are washed out inside the Milky Way glow less.
        float stars = starLayer( d, 140.0, 0.16 ) + starLayer( d, 320.0, 0.1 ) * 0.6;
        stars *= smoothstep( 0.03, 0.3, h ) * ( 1.0 - smoothstep( 0.85, 0.995, md ) );
        stars *= 1.0 + 1.2 * band;
        col += vec3( 0.75, 0.82, 1.0 ) * stars * 0.22;

        // Thin clouds drifting low in the sky, silver-edged toward the moon.
        vec2 cp = d.xz / ( d.y + 0.12 ) * 1.6 + vec2( uTime * 0.004, uTime * 0.0015 );
        float c = fbm( cp * 0.9 ) * 0.6 + fbm( cp * 2.3 + 5.0 ) * 0.4;
        float cloud = smoothstep( 0.18, 0.62, c ) * smoothstep( 0.02, 0.12, h ) * ( 1.0 - smoothstep( 0.35, 0.7, h ) );
        vec3 cloudCol = mix( vec3( 0.02, 0.035, 0.05 ), vec3( 0.22, 0.25, 0.27 ), pow( mdp, 10.0 ) );
        col = mix( col, cloudCol, cloud * 0.55 );

        // Moon disc with faint maria, rim slightly warm.
        float ang = acos( clamp( md, -1.0, 1.0 ) );
        float R = 0.021;
        float disc = 1.0 - smoothstep( R * 0.9, R, ang );
        vec3 tA = normalize( cross( uMoonDir, vec3( 0.0, 1.0, 0.0 ) ) );
        vec3 tB = cross( tA, uMoonDir );
        vec2 mp = vec2( dot( d, tA ), dot( d, tB ) ) / R;
        float maria = smoothstep( 0.1, 0.6, fbm( mp * 1.6 + 2.0 ) );
        vec3 moonCol = vec3( 1.0, 0.97, 0.88 ) * ( 9.0 - 3.0 * maria );
        col = mix( col, moonCol, disc * ( 1.0 - cloud * 0.6 ) );

        // Below the horizon: dark land haze.
        col = mix( uHorizon * 0.55, col, smoothstep( -0.04, 0.015, h ) );
        gl_FragColor = vec4( col, 1.0 );
      }`,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(900, 48, 24), mat);
  sky.frustumCulled = false;
  sky.renderOrder = -10;
  ctx.scene.add(sky);
  ctx.onUpdate(() => sky.position.copy(ctx.camera.position));
  return sky;
}
