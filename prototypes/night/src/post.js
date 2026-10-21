// Post-processing: bloom for the moon, windows and fireflies; then tone mapping and a light
// film treatment (vignette, grain, cool shadows).
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

const FilmShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uVignette: { value: 0.32 },
    uGrain: { value: 0.035 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 ); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime, uVignette, uGrain;
    varying vec2 vUv;
    float h( vec2 p ) { return fract( sin( dot( p, vec2( 12.9898, 78.233 ) ) ) * 43758.5453 ); }
    void main() {
      vec4 c = texture2D( tDiffuse, vUv );
      float l = dot( c.rgb, vec3( 0.299, 0.587, 0.114 ) );
      // Cool the shadows a touch, keep highlights neutral-warm.
      c.rgb = mix( c.rgb * vec3( 0.94, 1.0, 1.08 ), c.rgb, smoothstep( 0.15, 0.6, l ) );
      vec2 q = vUv - 0.5;
      c.rgb *= 1.0 - uVignette * smoothstep( 0.25, 0.85, length( q * vec2( 1.1, 1.0 ) ) );
      c.rgb += ( h( vUv * 731.0 + fract( uTime * 7.3 ) * 91.0 ) - 0.5 ) * uGrain;
      gl_FragColor = c;
    }`,
};

export function createPost(ctx, size) {
  const { renderer, scene, camera, quality } = ctx;
  const rt = new THREE.WebGLRenderTarget(size.x, size.y, {
    type: THREE.HalfFloatType,
    samples: quality === 'high' ? 4 : 0,
  });
  const composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  const bloomScale = quality === 'high' ? 0.5 : 0.35;
  const bloom = new UnrealBloomPass(new THREE.Vector2(size.x * bloomScale, size.y * bloomScale), 0.55, 0.65, 0.92);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const film = new ShaderPass(FilmShader);
  composer.addPass(film);

  return {
    composer,
    bloom,
    render(t) {
      film.uniforms.uTime.value = t;
      composer.render();
    },
    setSize(w, h, pr) {
      composer.setPixelRatio(pr);
      composer.setSize(w, h);
    },
  };
}
