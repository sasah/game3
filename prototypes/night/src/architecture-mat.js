// Materials for the architecture module.
// - uber: MeshStandardMaterial driven by vertex color + aMat (roughness, wood-grain amount,
//   emissive strength, candle flicker seed). Wood, pots, glass, candlelit panes, iron, far
//   silhouettes all share it (one draw call per mesh). Optional: back faces keep "up" normals
//   (thin double-sided withies), reduced fog for the distant silhouettes.
// - wall: whitewashed clay (canvas albedo + normal map, vertex tint), with a little extra
//   "luminosity" on moonlit faces (Kuindzhi's glowing walls).
// - thatch / fringe: straw textures.
import * as THREE from 'three';

export function uberMaterial(ctx, grainTex, { side = THREE.FrontSide, far = 0, flipVert = false, key = '' } = {}) {
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0, map: grainTex, side });
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = ctx.uniforms.uTime;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec4 aMat;\nvarying vec4 vMat;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvMat = aMat;');
    let fs = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec4 vMat;\nuniform float uTime;')
      .replace('#include <map_fragment>', `#ifdef USE_MAP
  diffuseColor.rgb *= mix( vec3( 1.0 ), texture2D( map, vMapUv ).rgb, vMat.y );
#endif`)
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = vMat.x;')
      .replace('#include <emissivemap_fragment>', `{
  float fl = 1.0;
  if ( vMat.w > 0.0 ) {
    float tt = uTime + vMat.w * 37.0;
    fl = 0.9 + 0.06 * sin( tt * 7.3 ) + 0.04 * sin( tt * 17.9 ) * sin( tt * 3.1 );
  }
  totalEmissiveRadiance = vColor.rgb * vMat.z * fl;
}`);
    if (flipVert) {
      fs = fs.replace('#include <normal_fragment_begin>', `#include <normal_fragment_begin>
  if ( ! gl_FrontFacing ) {
    vec3 upV = normalize( ( viewMatrix * vec4( 0.0, 1.0, 0.0, 0.0 ) ).xyz );
    normal -= 2.0 * dot( normal, upV ) * upV;
  }`);
    }
    if (far) {
      const chunk = THREE.ShaderChunk.fog_fragment.replace('gl_FragColor.rgb = mix(', `fogTotal *= ${far.toFixed(3)};\n  gl_FragColor.rgb = mix(`);
      fs = fs.replace('#include <fog_fragment>', chunk);
    }
    sh.fragmentShader = fs;
  };
  mat.customProgramCacheKey = () => `arch-uber-${side}-${far}-${flipVert}-${key}`;
  return mat;
}

// Extra moon "glow" on whitewash: a soft wrap term toward the moon so lit walls read luminous
// silver-white (not just blue-lit gray) and the falloff around bulges stays gentle.
export function wallMaterial(ctx, tex, normalScale = 0.9) {
  const mat = new THREE.MeshStandardMaterial({
    map: tex.map,
    normalMap: tex.normal,
    normalScale: new THREE.Vector2(normalScale, normalScale),
    vertexColors: true,
    roughness: 0.92,
    metalness: 0,
  });
  const uniforms = {
    uMoonDirW: { value: ctx.world.MOON_DIR.clone() },
    uGlow: { value: new THREE.Color().setRGB(0.2, 0.235, 0.26) },
  };
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWN;')
      .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\nvWN = normalize( mat3( modelMatrix ) * objectNormal );');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWN;\nuniform vec3 uMoonDirW;\nuniform vec3 uGlow;')
      .replace('#include <aomap_fragment>', `#include <aomap_fragment>
  {
    float wrap = clamp( ( dot( normalize( vWN ), uMoonDirW ) + 0.15 ) / 1.15, 0.0, 1.0 );
    float sh = 1.0;
    #if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
      sh = getShadow( directionalShadowMap[ 0 ], directionalLightShadows[ 0 ].shadowMapSize, directionalLightShadows[ 0 ].shadowIntensity, directionalLightShadows[ 0 ].shadowBias, directionalLightShadows[ 0 ].shadowRadius, vDirectionalShadowCoord[ 0 ] );
    #endif
    reflectedLight.indirectDiffuse += diffuseColor.rgb * uGlow * wrap * wrap * mix( 0.25, 1.0, sh );
  }`);
  };
  mat.customProgramCacheKey = () => 'arch-wall';
  return mat;
}

export function thatchMaterial(tex) {
  const mat = new THREE.MeshStandardMaterial({
    map: tex.map,
    normalMap: tex.normal,
    normalScale: new THREE.Vector2(1.0, 1.0),
    vertexColors: true,
    roughness: 0.88,
    metalness: 0,
  });
  return mat;
}

export function fringeMaterial(map) {
  return new THREE.MeshStandardMaterial({
    map,
    alphaTest: 0.5,
    side: THREE.DoubleSide,
    vertexColors: true,
    roughness: 0.9,
    metalness: 0,
  });
}
