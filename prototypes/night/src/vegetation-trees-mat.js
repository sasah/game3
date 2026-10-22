// Materials for the trees module. Built-in MeshStandardMaterial / MeshDepthMaterial patched with:
// - wind in the vertex shader from the shared uniforms (trunk bend, limb sway, hanging strands
//   swinging, leaf flutter), driven by baked per-vertex weights so branch and leaves move together;
// - foliage: crown normals (baked), thin-leaf translucency toward the moon, faint blossom glow,
//   edge-on card thinning and mip-aware alpha so distant crowns keep their mass;
// - matching depth materials so the moon shadow sways with the trees and leaf cards cast
//   leaf-shaped shadows.
import * as THREE from 'three';

export const GLSL_TREE_WIND = /* glsl */ `
uniform float uTime;
uniform float uWindStrength;
uniform vec2 uWindDir;
attribute vec4 aTree;  // xyz: tree root (world), w: per-tree seed 0..1
attribute vec4 aWind;  // x: trunk bend (m per unit wind), y: limb sway (m), z: phase 0..1, w: flutter (m)

vec3 treeWind( vec3 p ) {
  float t = uTime;
  vec2 wd = uWindDir;
  vec2 wp = vec2( - wd.y, wd.x );
  float ws = uWindStrength;
  float ph = aTree.w * 6.2831;
  // Broad gust fronts rolling across the meadow (same heading as the grass waves).
  float along = dot( aTree.xz, wd );
  float gust = 0.5 + 0.5 * sin( ( along - t * 3.4 ) * 0.085 + ph * 0.3 );
  gust *= gust;
  float lean = ws * ( 0.45 + 0.55 * gust );
  float sway = sin( t * 0.71 + ph ) * 0.6 + sin( t * 1.23 + ph * 1.9 ) * 0.4;
  vec3 off = vec3( 0.0 );
  off.xz += wd * aWind.x * ( lean + sway * 0.3 * ws );
  // Limbs and hanging strands: phase per limb (and drifting down a strand, so it whips).
  float bp = aWind.z * 6.2831;
  float b1 = sin( t * ( 1.35 + aWind.z * 0.7 ) + bp );
  float b2 = sin( t * ( 2.3 + aWind.z * 0.9 ) + bp * 2.7 );
  off.xz += ( wd * ( lean * 0.55 + b1 * 0.45 * ws ) + wp * ( b2 * 0.32 * ws ) ) * aWind.y;
  off.y -= ( 0.12 + 0.12 * b1 ) * aWind.y * ws * 0.5;
  // Leaf flutter.
  float f1 = sin( t * 10.7 + dot( p, vec3( 2.9, 2.1, 1.7 ) ) + bp * 5.0 );
  float f2 = sin( t * 7.9 + dot( p, vec3( -1.7, 2.6, 2.3 ) ) );
  off += vec3( f1, f2 * 0.7, f2 - f1 * 0.4 ) * aWind.w * ws * ( 0.45 + 0.55 * gust );
  return off;
}
`;

const VERT_WIND = /* glsl */ `
#include <begin_vertex>
transformed += treeWind( transformed );
`;

function windUniforms(ctx) {
  return {
    uTime: ctx.uniforms.uTime,
    uWindStrength: ctx.uniforms.uWindStrength,
    uWindDir: ctx.uniforms.uWindDir,
  };
}

function depthMaterial(ctx, key) {
  const m = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
  const u = windUniforms(ctx);
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, u);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\n' + GLSL_TREE_WIND)
      .replace('#include <begin_vertex>', VERT_WIND);
  };
  m.customProgramCacheKey = () => 'trees-depth-' + key;
  return m;
}

// Bark: one fissured texture for every species; aBark.x smooths it (cherry), aBark.y = moss.
export function makeBarkMaterial(ctx, bark) {
  const mat = new THREE.MeshStandardMaterial({
    map: bark.map,
    normalMap: bark.normalMap,
    normalScale: new THREE.Vector2(1.6, 1.6),
    vertexColors: true,
    roughness: 0.9,
    metalness: 0,
  });
  const u = windUniforms(ctx);
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, u);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\n' + GLSL_TREE_WIND + '\nattribute vec2 aBark;\nvarying vec2 vBark;\nvarying float vBarkV;')
      .replace('#include <begin_vertex>', VERT_WIND + '\nvBark = aBark;\nvBarkV = uv.y;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vBark;\nvarying float vBarkV;')
      .replace('#include <map_fragment>', /* glsl */ `
#ifdef USE_MAP
  vec4 barkTex = texture2D( map, vMapUv );
  // Cherry: smooth, dark, with faint horizontal lenticel bands.
  float lent = smoothstep( 0.82, 0.97, sin( vBarkV * 95.0 + barkTex.r * 4.0 ) );
  vec3 smoothBark = vec3( 0.30 ) * ( 1.0 - 0.35 * lent ) + barkTex.rgb * 0.25;
  diffuseColor.rgb *= mix( barkTex.rgb, smoothBark, vBark.x );
#endif`)
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n\tnormal = normalize( mix( normal, nonPerturbedNormal, vBark.x * 0.75 ) );')
      .replace('#include <lights_physical_fragment>', '#include <lights_physical_fragment>\n\tmaterial.roughness = mix( material.roughness, 0.72, vBark.x );\n\tmaterial.specularColor *= 0.6;');
  };
  mat.customProgramCacheKey = () => 'trees-bark';
  return { mat, depth: depthMaterial(ctx, 'bark') };
}

// Foliage: alpha-tested (alpha-to-coverage on MSAA at high) leaf / blossom / strand cards.
// aFol: x = translucency, y = blossom glow, z = edge-on thinning strength.
export function makeFoliageMaterial(ctx, atlas, { a2c }) {
  const mat = new THREE.MeshStandardMaterial({
    map: atlas,
    vertexColors: true,
    side: THREE.DoubleSide,
    roughness: 0.78,
    metalness: 0,
    alphaTest: 0.5,
  });
  mat.alphaToCoverage = !!a2c;
  const u = Object.assign(windUniforms(ctx), {
    uTransCol: { value: new THREE.Color('#a3b39b') },
    uGlowCol: { value: new THREE.Color().setRGB(0.05, 0.06, 0.08) },
    uMoonDirV: { value: new THREE.Vector3() },
  });
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, u);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\n' + GLSL_TREE_WIND + '\nattribute vec3 aFol;\nvarying vec3 vFol;')
      .replace('#include <begin_vertex>', VERT_WIND + '\nvFol = aFol;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vFol;\nuniform vec3 uTransCol;\nuniform vec3 uGlowCol;')
      .replace('#include <map_fragment>', /* glsl */ `
#include <map_fragment>
{
  // Keep coverage in the small mips so distant crowns do not dissolve.
  vec2 tsz = vec2( textureSize( map, 0 ) );
  vec2 dx = dFdx( vMapUv * tsz ), dy = dFdy( vMapUv * tsz );
  float lod = max( 0.0, 0.5 * log2( max( dot( dx, dx ), dot( dy, dy ) ) ) );
  diffuseColor.a = min( 1.0, diffuseColor.a * ( 1.0 + 0.28 * lod ) );
  // Thin out cards seen edge-on so the crown does not show flat planes.
  vec3 gN = normalize( cross( dFdx( vViewPosition ), dFdy( vViewPosition ) ) );
  float edge = abs( dot( gN, normalize( vViewPosition ) ) );
  diffuseColor.a *= mix( 1.0, smoothstep( 0.02, 0.4, edge ), vFol.z );
}`)
      // Crown normals are baked: use them on both faces (no flip on back faces).
      .replace('#include <normal_fragment_begin>', /* glsl */ `
float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
vec3 normal = normalize( vNormal );
vec3 nonPerturbedNormal = normal;`)
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n\ttotalEmissiveRadiance += diffuseColor.rgb * uGlowCol * vFol.y;')
      .replace('#include <lights_physical_fragment>', '#include <lights_physical_fragment>\n\tmaterial.specularColor *= 0.5;\n\tmaterial.specularF90 = 0.4;')
      .replace('#include <lights_physical_pars_fragment>', /* glsl */ `
#include <lights_physical_pars_fragment>
void RE_Direct_Tree( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
  // Soft wrap so the shadowed side of a crown is not dead black.
  float wrapNL = saturate( ( dot( geometryNormal, directLight.direction ) + 0.35 ) / 1.35 );
  reflectedLight.directDiffuse += wrapNL * directLight.color * BRDF_Lambert( material.diffuseColor );
  float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
  reflectedLight.directSpecular += dotNL * directLight.color * BRDF_GGX( directLight.direction, geometryViewDir, geometryNormal, material );
  // Moonlight through thin leaves and petals when looking toward the moon.
  float back = saturate( dot( - geometryViewDir, directLight.direction ) );
  float tr = ( pow( back, 4.0 ) * 1.5 + 0.2 * saturate( - dot( geometryNormal, directLight.direction ) ) ) * vFol.x;
  reflectedLight.directDiffuse += directLight.color * material.diffuseColor * uTransCol * ( tr * RECIPROCAL_PI );
}
#undef RE_Direct
#define RE_Direct RE_Direct_Tree`);
  };
  mat.customProgramCacheKey = () => 'trees-foliage-' + (a2c ? 'a2c' : 'at');
  return { mat, depth: depthMaterial(ctx, 'foliage') };
}

// Distant groves: camera-facing (cylindrical) billboards, normals bulged into a rough crown so the
// moon lights the near side of northern groves and leaves southern ones as silhouettes.
// position = billboard base (world); aCorner = (x -0.5..0.5, y 0..1); aSize = (w, h).
export function makeFarMaterial(ctx, tex) {
  const mat = new THREE.MeshStandardMaterial({
    map: tex,
    vertexColors: true,
    roughness: 0.95,
    metalness: 0,
    alphaTest: 0.5,
    side: THREE.DoubleSide,
  });
  const u = windUniforms(ctx);
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, u);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;\nuniform float uWindStrength;\nuniform vec2 uWindDir;\nattribute vec2 aCorner;\nattribute vec3 aSize;')
      .replace('#include <beginnormal_vertex>', /* glsl */ `
vec3 bbTo = cameraPosition - position;
bbTo.y = 0.0;
bbTo = normalize( bbTo );
vec3 bbRight = vec3( bbTo.z, 0.0, - bbTo.x );
vec3 objectNormal = normalize( bbTo * 0.7 + vec3( 0.0, 1.0, 0.0 ) * ( aCorner.y - 0.4 ) * 1.1 + bbRight * aCorner.x * 1.2 );`)
      .replace('#include <begin_vertex>', /* glsl */ `
vec3 transformed = position + bbRight * aCorner.x * aSize.x + vec3( 0.0, aCorner.y * aSize.y, 0.0 );
transformed.xz += uWindDir * aCorner.y * aCorner.y * aSize.y * 0.006 * uWindStrength * ( 0.7 + 0.3 * sin( uTime * 0.8 + aSize.z * 40.0 ) );`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <map_fragment>', /* glsl */ `
#include <map_fragment>
{
  vec2 tsz = vec2( textureSize( map, 0 ) );
  vec2 dx = dFdx( vMapUv * tsz ), dy = dFdy( vMapUv * tsz );
  float lod = max( 0.0, 0.5 * log2( max( dot( dx, dx ), dot( dy, dy ) ) ) );
  diffuseColor.a = min( 1.0, diffuseColor.a * ( 1.0 + 0.3 * lod ) );
}`)
      .replace('#include <normal_fragment_begin>', /* glsl */ `
float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
vec3 normal = normalize( vNormal );
vec3 nonPerturbedNormal = normal;`)
      .replace('#include <lights_physical_fragment>', '#include <lights_physical_fragment>\n\tmaterial.specularColor *= 0.3;');
  };
  mat.customProgramCacheKey = () => 'trees-far';
  return mat;
}
