// Replaces three.js fog chunks with distance fog + exponential height fog (mist hugging the water)
// tinted toward the moon. Must run before any material compiles. Custom ShaderMaterials get the
// same fog by setting `fog: true` and including the standard fog chunks.
import * as THREE from 'three';

const f = (v) => v.toFixed(5);

export function installHeightFog({ moonDir, base = 0.0, density = 0.05, falloff = 0.85, moonTint = [0.05, 0.065, 0.075] }) {
  const C = THREE.ShaderChunk;
  C.fog_pars_vertex = /* glsl */ `
#ifdef USE_FOG
  varying float vFogDepth;
  varying vec3 vFogWorldPos;
#endif`;
  C.fog_vertex = /* glsl */ `
#ifdef USE_FOG
  vFogDepth = - mvPosition.z;
  vFogWorldPos = ( inverse( viewMatrix ) * mvPosition ).xyz;
#endif`;
  C.fog_pars_fragment = /* glsl */ `
#ifdef USE_FOG
  uniform vec3 fogColor;
  varying float vFogDepth;
  varying vec3 vFogWorldPos;
  #ifdef FOG_EXP2
    uniform float fogDensity;
  #else
    uniform float fogNear;
    uniform float fogFar;
  #endif
#endif`;
  C.fog_fragment = /* glsl */ `
#ifdef USE_FOG
  vec3 fogRay = vFogWorldPos - cameraPosition;
  float fogDist = length( fogRay );
  vec3 fogDirN = fogRay / max( fogDist, 1e-3 );
  #ifdef FOG_EXP2
    float fogF = 1.0 - exp( - fogDensity * fogDensity * fogDist * fogDist );
  #else
    float fogF = smoothstep( fogNear, fogFar, fogDist );
  #endif
  // Analytic integral of density a * exp(-b * (y - base)) along the view ray.
  float hfB = ${f(falloff)};
  float hfY0 = max( cameraPosition.y - ${f(base)}, -2.0 );
  float hfDy = fogRay.y;
  float hfK = abs( hfDy ) > 1e-3 ? ( 1.0 - exp( - hfB * hfDy ) ) / ( hfB * hfDy ) : 1.0;
  float hfOpt = ${f(density)} * exp( - hfB * hfY0 ) * hfK * fogDist;
  float hfF = 1.0 - exp( - max( hfOpt, 0.0 ) );
  float fogTotal = clamp( 1.0 - ( 1.0 - fogF ) * ( 1.0 - hfF ), 0.0, 1.0 );
  float fogMoon = pow( max( dot( fogDirN, vec3( ${f(moonDir.x)}, ${f(moonDir.y)}, ${f(moonDir.z)} ) ), 0.0 ), 5.0 );
  vec3 fogCol = fogColor + vec3( ${moonTint.map(f).join(', ')} ) * fogMoon;
  gl_FragColor.rgb = mix( gl_FragColor.rgb, fogCol, fogTotal );
#endif`;
}
