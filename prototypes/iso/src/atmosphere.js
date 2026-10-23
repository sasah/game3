// Small living things over the painting: chimney smoke, falling cherry petals, moths at the lit
// windows, bats over the pond and an owl that sometimes glides across. Everything lives in world
// space and is depth-tested against the painting, so it passes behind roofs and trees.
import * as THREE from 'three';
import * as S from './scene.js';

const softPoints = (count, attrs, vertex, fragment, uniforms, blending = THREE.NormalBlending) => {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  for (const [name, size, fill] of attrs) {
    const a = new Float32Array(count * size);
    for (let i = 0; i < count; i++) for (let k = 0; k < size; k++) a[i * size + k] = fill(i, k);
    g.setAttribute(name, new THREE.BufferAttribute(a, size));
  }
  const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending, uniforms, vertexShader: vertex, fragmentShader: fragment });
  const p = new THREE.Points(g, m);
  p.frustumCulled = false;
  return p;
};

const rand = (i, k = 0) => {
  const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

// Chimney: top of the hut's chimney as modelled in the blockout.
const CHIMNEY = new THREE.Vector3(S.HUT.x + 1.2, S.HUT.ridge + 0.25, S.HUT.z - 0.3);
const WINDOWS = [[S.HUT.x - 2.4, 1.45, S.HUT.z + S.HUT.d / 2 + 0.25], [S.HUT.x + 2.4, 1.45, S.HUT.z + S.HUT.d / 2 + 0.25]];

function silhouette(draw, w = 128, h = 64) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = '#05060a';
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace;
  return t;
}

// Two wing poses per creature; the shader swaps them to flap.
const batUp = (g, w, h) => {
  g.beginPath(); g.ellipse(w / 2, h * 0.55, 6, 9, 0, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.moveTo(w / 2, h * 0.5);
  g.quadraticCurveTo(w * 0.3, h * 0.05, w * 0.05, h * 0.2); g.quadraticCurveTo(w * 0.2, h * 0.35, w * 0.18, h * 0.5);
  g.quadraticCurveTo(w * 0.33, h * 0.45, w / 2, h * 0.62);
  g.quadraticCurveTo(w * 0.67, h * 0.45, w * 0.82, h * 0.5); g.quadraticCurveTo(w * 0.8, h * 0.35, w * 0.95, h * 0.2);
  g.quadraticCurveTo(w * 0.7, h * 0.05, w / 2, h * 0.5); g.fill();
};
const batDown = (g, w, h) => {
  g.beginPath(); g.ellipse(w / 2, h * 0.45, 6, 9, 0, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.moveTo(w / 2, h * 0.4);
  g.quadraticCurveTo(w * 0.3, h * 0.55, w * 0.1, h * 0.85); g.quadraticCurveTo(w * 0.25, h * 0.7, w * 0.3, h * 0.75);
  g.quadraticCurveTo(w * 0.4, h * 0.6, w / 2, h * 0.55);
  g.quadraticCurveTo(w * 0.6, h * 0.6, w * 0.7, h * 0.75); g.quadraticCurveTo(w * 0.75, h * 0.7, w * 0.9, h * 0.85);
  g.quadraticCurveTo(w * 0.7, h * 0.55, w / 2, h * 0.4); g.fill();
};
const owlGlide = (g, w, h) => {
  g.beginPath(); g.ellipse(w / 2, h * 0.5, 10, 14, 0, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.moveTo(w * 0.5, h * 0.42);
  g.bezierCurveTo(w * 0.35, h * 0.25, w * 0.12, h * 0.32, w * 0.02, h * 0.5);
  g.bezierCurveTo(w * 0.15, h * 0.5, w * 0.3, h * 0.58, w * 0.5, h * 0.6);
  g.bezierCurveTo(w * 0.7, h * 0.58, w * 0.85, h * 0.5, w * 0.98, h * 0.5);
  g.bezierCurveTo(w * 0.88, h * 0.32, w * 0.65, h * 0.25, w * 0.5, h * 0.42); g.fill();
};
const owlBeat = (g, w, h) => {
  g.beginPath(); g.ellipse(w / 2, h * 0.5, 10, 14, 0, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.moveTo(w * 0.5, h * 0.45);
  g.bezierCurveTo(w * 0.35, h * 0.3, w * 0.2, h * 0.1, w * 0.1, h * 0.05);
  g.bezierCurveTo(w * 0.2, h * 0.35, w * 0.3, h * 0.55, w * 0.5, h * 0.6);
  g.bezierCurveTo(w * 0.7, h * 0.55, w * 0.8, h * 0.35, w * 0.9, h * 0.05);
  g.bezierCurveTo(w * 0.8, h * 0.1, w * 0.65, h * 0.3, w * 0.5, h * 0.45); g.fill();
};

function flyer(scene, base, uniforms, poses, size) {
  const [a, b] = poses.map((p) => silhouette(p));
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uA: { value: a }, uB: { value: b }, uFlap: { value: 0 }, uAlpha: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
      uniform sampler2D uA, uB; uniform float uFlap, uAlpha; varying vec2 vUv;
      void main() {
        float a = mix(texture2D(uA, vUv).a, texture2D(uB, vUv).a, step(0.5, uFlap));
        if (a < 0.05) discard;
        gl_FragColor = vec4(0.02, 0.025, 0.04, a * uAlpha);
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(size * 2, size), m);
  mesh.quaternion.copy(base.quaternion);
  mesh.frustumCulled = false;
  mesh.renderOrder = 6;
  scene.add(mesh);
  return mesh;
}

export function buildAtmosphere({ scene, base, uniforms }) {
  const uPx = { value: 60 }; // device pixels per metre at the current zoom
  const common = { uTime: uniforms.uTime, uPx, uWind: { value: new THREE.Vector2(0.55, -0.25) } };

  // Chimney smoke: puffs rise, swell and drift with the wind.
  const smoke = softPoints(90, [['seed', 1, (i) => i / 90]], `
    attribute float seed; uniform float uTime, uPx; uniform vec2 uWind; varying float vA; varying float vSeed;
    void main() {
      float life = fract(uTime * 0.07 + seed);
      vec3 p = vec3(${CHIMNEY.x.toFixed(3)}, ${CHIMNEY.y.toFixed(3)}, ${CHIMNEY.z.toFixed(3)});
      p.y += life * 4.5;
      p.xz += uWind * life * life * 6.0 + vec2(sin(seed * 40.0 + uTime * 0.6), cos(seed * 23.0 + uTime * 0.5)) * life * 0.6;
      vA = smoothstep(0.0, 0.1, life) * (1.0 - smoothstep(0.35, 1.0, life)) * 0.27;
      vSeed = seed;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      gl_PointSize = (0.28 + life * 1.5) * uPx;
    }`, `
    varying float vA; varying float vSeed;
    float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float n(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
      return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
    void main() {
      vec2 q = gl_PointCoord - 0.5;
      float d = length(q) * 2.0;
      float wisp = 0.55 + 0.45 * n(q * 5.0 + vSeed * 40.0);
      gl_FragColor = vec4(vec3(0.6, 0.64, 0.72), vA * pow(smoothstep(1.0, 0.0, d), 1.6) * wisp);
    }`, common);
  smoke.renderOrder = 4;
  scene.add(smoke);

  // Cherry petals drifting down from the blossoming crowns.
  const P = 90;
  const petals = softPoints(P, [
    ['seed', 1, (i) => rand(i, 1)],
    ['origin', 3, (i, k) => {
      const t = S.CHERRIES[i % S.CHERRIES.length];
      return k === 0 ? t[0] + (rand(i, 2) - 0.5) * 2.4 : k === 1 ? 2.2 + rand(i, 3) * 1.4 : t[1] + (rand(i, 4) - 0.5) * 2.4;
    }],
  ], `
    attribute float seed; attribute vec3 origin; uniform float uTime, uPx; uniform vec2 uWind; varying float vA; varying float vSpin;
    void main() {
      float life = fract(uTime * (0.06 + seed * 0.05) + seed * 7.0);
      vec3 p = origin;
      p.y = mix(origin.y, 0.05, life);
      p.xz += uWind * life * 2.2 + vec2(sin(uTime * 2.3 + seed * 30.0), cos(uTime * 1.9 + seed * 17.0)) * 0.35 * life;
      vA = smoothstep(0.0, 0.05, life) * (1.0 - smoothstep(0.88, 1.0, life));
      vSpin = sin(uTime * 6.0 + seed * 50.0);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      gl_PointSize = 0.075 * uPx;
    }`, `
    varying float vA; varying float vSpin;
    void main() {
      vec2 q = gl_PointCoord - 0.5;
      q.x /= max(0.25, abs(vSpin));
      float d = length(q) * 2.0;
      gl_FragColor = vec4(vec3(0.92, 0.9, 0.95), vA * 0.85 * smoothstep(1.0, 0.6, d));
    }`, common);
  petals.renderOrder = 5;
  scene.add(petals);

  // Moths circling the candlelit windows.
  const M = 10;
  const moths = softPoints(M, [
    ['seed', 1, (i) => rand(i, 9)],
    ['origin', 3, (i, k) => WINDOWS[i % WINDOWS.length][k]],
  ], `
    attribute float seed; attribute vec3 origin; uniform float uTime, uPx; varying float vA;
    void main() {
      float t = uTime * (1.6 + seed * 1.2) + seed * 20.0;
      vec3 p = origin + vec3(sin(t) * 0.35 + sin(t * 3.1) * 0.08, cos(t * 1.3) * 0.25 + 0.1, cos(t) * 0.25 + 0.15);
      vA = 0.6 + 0.4 * sin(t * 7.0);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      gl_PointSize = 0.05 * uPx;
    }`, `
    varying float vA;
    void main() {
      float d = length(gl_PointCoord - 0.5) * 2.0;
      gl_FragColor = vec4(vec3(1.0, 0.85, 0.6), vA * smoothstep(1.0, 0.3, d));
    }`, common, THREE.AdditiveBlending);
  moths.renderOrder = 5;
  scene.add(moths);

  // Bats over the pond and the yard, an owl now and then.
  const bats = [0, 1, 2].map(() => flyer(scene, base, uniforms, [batUp, batDown], 0.32));
  const owl = flyer(scene, base, uniforms, [owlGlide, owlBeat], 0.75);
  const pond = new THREE.Vector3(S.POND.x, 0, S.POND.z);

  return {
    setPixelsPerMetre(px) { uPx.value = px; },
    update(t) {
      bats.forEach((b, i) => {
        const s = t * (0.55 + i * 0.13) + i * 2.1;
        b.position.set(
          pond.x - 3 + Math.sin(s) * 6 + Math.sin(s * 2.7) * 1.2,
          3.6 + Math.sin(s * 1.7 + i) * 1.1,
          pond.z - 4 + Math.sin(s * 2) * 4 + Math.cos(s * 3.3) * 0.8,
        );
        b.material.uniforms.uFlap.value = Math.sin(t * 22 + i * 3) > 0 ? 1 : 0;
        b.material.uniforms.uAlpha.value = 0.85;
      });
      // The owl crosses the yard high up every half minute or so.
      const period = 34, p = (t % period) / 9;
      if (p < 1) {
        owl.position.set(-14 + p * 30, 9 + Math.sin(p * Math.PI) * 1.5, -12 + p * 14);
        owl.material.uniforms.uAlpha.value = Math.sin(p * Math.PI) * 0.9;
        owl.material.uniforms.uFlap.value = (t * 2.2) % 3 < 0.5 ? 1 : 0;
      } else owl.material.uniforms.uAlpha.value = 0;
    },
  };
}
