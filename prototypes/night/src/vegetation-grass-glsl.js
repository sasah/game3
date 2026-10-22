// GLSL shared by the meadow patches and the reeds: terrain height lookup (exact triangle
// interpolation of the terrain mesh), baked mask, the shared gusty wind field, patch wrapping,
// cheap per-instance frustum rejection and the translucent light response.
import { GLSL_NOISE } from './noise.js';

export const GLSL_VEG_COMMON = /* glsl */ `
uniform float uTime;
uniform float uWindStrength;
uniform vec2 uWindDir;
${GLSL_NOISE}

// Traveling gust waves: rolling bands along the wind plus big drifting patches.
float vegWind( vec2 p, out float gust ) {
  vec2 wd = uWindDir;
  float along = dot( p, wd );
  float across = dot( p, vec2( -wd.y, wd.x ) );
  float t = uTime;
  float wave = sin( ( along - t * 3.4 ) * 0.62 + vnoise( vec2( across * 0.09, along * 0.03 - t * 0.1 ) ) * 3.0 );
  float wave2 = sin( ( along - t * 2.1 ) * 1.7 + across * 0.35 + vnoise( p * 0.21 ) * 2.0 );
  float patchN = vnoise( ( p - wd * t * 3.0 ) * 0.045 + 3.7 ) * 0.5 + 0.5;
  float g = smoothstep( -0.35, 1.0, wave ) * ( 0.3 + 0.7 * patchN ) + 0.18 * wave2;
  gust = clamp( g, 0.0, 1.0 );
  return uWindStrength * ( 0.22 + 0.78 * gust );
}
`;

export const GLSL_PATCH_PARS = /* glsl */ `
uniform vec2 uCenter;     // tile centre (pushed ahead of the camera so most instances are in view)
uniform vec2 uCam;        // camera xz, for distance fades
uniform float uTile;
uniform vec4 uFade;      // fade-in start/end, fade-out start/end (meters from the camera)
uniform float uDensity;
uniform vec3 uMoonDir;
uniform sampler2D tVegH;  // terrain heights (R32F, texelFetch)
uniform vec4 uVegH;       // origin x, origin z, 1/step, step
uniform vec2 uVegHSize;
uniform sampler2D tVegM;  // mask RGBA8
uniform vec4 uVegM;       // origin x, origin z, 1/size x, 1/size z
attribute vec2 aOff;

float vegTerrain( vec2 p ) {
  vec2 g = ( p - uVegH.xy ) * uVegH.z;
  vec2 gi = floor( g );
  vec2 f = g - gi;
  ivec2 i = clamp( ivec2( gi ), ivec2( 0 ), ivec2( uVegHSize ) - 2 );
  float ha = texelFetch( tVegH, i, 0 ).r;
  float hb = texelFetch( tVegH, i + ivec2( 0, 1 ), 0 ).r;
  float hc = texelFetch( tVegH, i + ivec2( 1, 1 ), 0 ).r;
  float hd = texelFetch( tVegH, i + ivec2( 1, 0 ), 0 ).r;
  if ( f.x + f.y <= 1.0 ) return ha + ( hd - ha ) * f.x + ( hb - ha ) * f.y;
  return hc + ( hb - hc ) * ( 1.0 - f.x ) + ( hd - hc ) * ( 1.0 - f.y );
}
vec4 vegMask( vec2 p ) {
  return textureLod( tVegM, ( p - uVegM.xy ) * uVegM.zw, 0.0 );
}
// World-stable position of this instance in the copy of the tile nearest the camera.
vec2 vegWrap() {
  return aOff + uTile * floor( ( uCenter - aOff ) / uTile + 0.5 );
}
// True when a sphere of radius r around p is certainly off screen.
bool vegOffscreen( vec3 p, float r ) {
  vec4 c = projectionMatrix * ( viewMatrix * vec4( p, 1.0 ) );
  float mx = r * abs( projectionMatrix[ 0 ][ 0 ] ) + 0.02;
  float my = r * abs( projectionMatrix[ 1 ][ 1 ] ) + 0.02;
  return c.w < -r || c.x > c.w + mx || c.x < -c.w - mx || c.y > c.w + my || c.y < -c.w - my;
}
#define VEG_CULL { gl_Position = vec4( 2.0, 2.0, 2.0, 1.0 ); return; }
#ifndef VEG_SPEC
  #define VEG_SPEC 1.0
#endif
`;

// Fragment side: thin-leaf transmission added to every direct light (moon, window lights).
export const GLSL_TRANSLUCENT = /* glsl */ `
uniform vec3 uTransCol;
varying float vVegTrans;
void RE_Direct_Veg( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
  RE_Direct_Physical( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
  float back = saturate( dot( -geometryViewDir, directLight.direction ) );
  float through = saturate( -dot( geometryNormal, directLight.direction ) );
  float tr = ( pow( back, 2.5 ) * 4.0 + through * 1.6 ) * vVegTrans;
  reflectedLight.directDiffuse += directLight.color * material.diffuseColor * uTransCol * ( tr * RECIPROCAL_PI );
}
#undef RE_Direct
#define RE_Direct RE_Direct_Veg
`;

// Blend shading normals toward the sky (soft, volumetric look of foliage), after the face flip.
// vVegUp (per vertex) lets arching blade tips face the sky more than their stiff bases.
export const GLSL_NORMAL_SOFTEN = /* glsl */ `
#include <normal_fragment_begin>
{
  vec3 vegUp = normalize( ( viewMatrix * vec4( 0.0, 1.0, 0.0, 0.0 ) ).xyz );
  normal = normalize( mix( normal, vegUp, VEG_SOFTEN + vVegUp ) );
}
`;
