// Simple massing model of the yard. Rendered once (headless) into a colour guide that the image
// model paints over, and into a depth map the runtime uses to put characters behind things.
import * as THREE from 'three';
import * as S from './scene.js';

const C = {
  ground: '#3f5233', path: '#8a7556', water: '#1f3a55', mud: '#4a4434',
  wall: '#f1eee4', prizba: '#7a5a3c', thatch: '#9c8457', door: '#4b3624', window: '#ffcf6e',
  shutter: '#3f5f86', fence: '#6b5638', wood: '#7c6446', stone: '#8b8b86',
  blossom: '#f4eef2', leaf: '#4d6b3b', poplar: '#2f4a33', willow: '#5f7a45', bark: '#4b3d31',
  hay: '#b49a5e', reed: '#6f7f4c',
};

const mat = (hex, extra = {}) => new THREE.MeshStandardMaterial({ color: new THREE.Color(hex), roughness: 0.9, ...extra });

function hipRoof(w, d, eaveY, ridgeY, over) {
  const W = w / 2 + over, D = d / 2 + over, R = Math.max(0.2, (w - d) / 2);
  const p = [
    [-W, eaveY, D], [W, eaveY, D], [W, eaveY, -D], [-W, eaveY, -D], // eave corners
    [-R, ridgeY, 0], [R, ridgeY, 0], // ridge ends
  ];
  const tris = [[0, 1, 5], [0, 5, 4], [1, 2, 5], [2, 3, 4], [2, 4, 5], [3, 0, 4]];
  const pos = [];
  for (const t of tris) for (const i of t) pos.push(...p[i]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

function house(o, opts) {
  const g = new THREE.Group();
  const walls = new THREE.Mesh(new THREE.BoxGeometry(o.w, o.wall, o.d), mat(C.wall));
  walls.position.y = o.wall / 2;
  g.add(walls);
  const prizba = new THREE.Mesh(new THREE.BoxGeometry(o.w + 0.5, 0.42, o.d + 0.5), mat(C.prizba));
  prizba.position.y = 0.21;
  g.add(prizba);
  const roof = new THREE.Mesh(hipRoof(o.w, o.d, o.wall - 0.05, o.ridge, 0.75), mat(C.thatch));
  g.add(roof);
  // Thick thatch edge.
  const eave = new THREE.Mesh(new THREE.BoxGeometry(o.w + 1.5, 0.28, o.d + 1.5), mat(C.thatch));
  eave.position.y = o.wall - 0.05;
  g.add(eave);
  const door = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.8, 0.08), mat(C.door));
  door.position.set(opts.doorX, 0.9 + 0.4, o.d / 2 + 0.03);
  g.add(door);
  for (const wx of opts.windows || []) {
    const win = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.7, 0.06), mat(C.window, { emissive: new THREE.Color(C.window), emissiveIntensity: opts.lit ? 1.4 : 0.15 }));
    win.position.set(wx, 1.45, o.d / 2 + 0.03);
    g.add(win);
    for (const s of [-1, 1]) {
      const sh = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.78, 0.05), mat(C.shutter));
      sh.position.set(wx + s * 0.6, 1.45, o.d / 2 + 0.05);
      g.add(sh);
    }
  }
  if (opts.sideWindow) {
    const win = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.7, 0.75), mat(C.window, { emissive: new THREE.Color(C.window), emissiveIntensity: 0.15 }));
    win.position.set(o.w / 2 + 0.03, 1.45, 0);
    g.add(win);
  }
  if (opts.chimney) {
    const ch = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.4, 0.6), mat(C.wall));
    ch.position.set(opts.chimney, o.ridge - 0.2, -0.3);
    g.add(ch);
  }
  g.position.set(o.x, 0, o.z);
  return g;
}

function fence(scene) {
  const F = S.FENCE, m = mat(C.fence);
  const runs = [
    [[F.x0, F.z1], [F.gate[0], F.z1]], [[F.gate[1], F.z1], [F.x1, F.z1]],
    [[F.x1, F.z1], [F.x1, F.z0]], [[F.x1, F.z0], [F.x0, F.z0]], [[F.x0, F.z0], [F.x0, F.z1]],
  ];
  for (const [[ax, az], [bx, bz]] of runs) {
    const len = Math.hypot(bx - ax, bz - az);
    const panel = new THREE.Mesh(new THREE.BoxGeometry(len, F.h, 0.14), m);
    panel.position.set((ax + bx) / 2, F.h / 2, (az + bz) / 2);
    panel.rotation.y = -Math.atan2(bz - az, bx - ax);
    scene.add(panel);
    const n = Math.max(2, Math.round(len / 1.3));
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const stake = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, F.h + 0.35, 6), mat(C.wood));
      stake.position.set(ax + (bx - ax) * t, (F.h + 0.35) / 2, az + (bz - az) * t);
      scene.add(stake);
      if (i % 3 === 1) {
        const pot = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), mat('#a0583a'));
        pot.position.set(stake.position.x, F.h + 0.42, stake.position.z);
        scene.add(pot);
      }
    }
  }
}

function tree(scene, x, z, kind) {
  const g = new THREE.Group();
  if (kind === 'cherry') {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 1.6, 8), mat(C.bark));
    trunk.position.y = 0.8;
    g.add(trunk);
    const blobs = [[0, 2.4, 0, 1.25], [0.7, 2.1, 0.3, 0.85], [-0.6, 2.2, -0.2, 0.9], [0.1, 2.9, -0.4, 0.8]];
    for (const [bx, by, bz, r] of blobs) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), mat(C.blossom));
      b.position.set(bx, by, bz);
      g.add(b);
    }
  } else if (kind === 'poplar') {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.3, 3, 8), mat(C.bark));
    trunk.position.y = 1.5;
    g.add(trunk);
    const crown = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 16), mat(C.poplar));
    crown.scale.set(1.5, 8.5, 1.5);
    crown.position.y = 10;
    g.add(crown);
  } else if (kind === 'willow') {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.55, 3.2, 10), mat(C.bark));
    trunk.position.set(0.3, 1.5, 0.3);
    trunk.rotation.set(0.2, 0, -0.2);
    g.add(trunk);
    const crown = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 16), mat(C.willow));
    crown.scale.set(2.4, 1.9, 2.3);
    crown.position.set(0.8, 4.2, 0.8);
    g.add(crown);
    const curtain = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.6, 2.6, 20, 1, true), mat(C.willow, { side: THREE.DoubleSide }));
    curtain.position.set(0.8, 2.8, 0.8);
    g.add(curtain);
  }
  g.position.set(x, 0, z);
  scene.add(g);
}

function well(scene) {
  const { x, z } = S.WELL;
  const head = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.85, 1.1), mat(C.wood));
  head.position.set(x, 0.42, z);
  scene.add(head);
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 3.6, 8), mat(C.wood));
  post.position.set(x - 1.6, 1.8, z - 1.2);
  scene.add(post);
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 7.5, 6), mat(C.wood));
  pole.position.set(x - 1.0, 3.6, z - 0.8);
  pole.rotation.set(0.35, 0, -1.05);
  scene.add(pole);
  const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 4.4, 4), mat(C.wood));
  rope.position.set(x + 0.15, 2.6, z + 0.05);
  scene.add(rope);
  const bucket = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.17, 0.35, 10), mat(C.wood));
  bucket.position.set(x + 0.15, 0.95, z + 0.05);
  scene.add(bucket);
}

function ground(scene) {
  const g = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), mat(C.ground));
  g.rotation.x = -Math.PI / 2;
  g.receiveShadow = true;
  scene.add(g);
  // Path as a ribbon of flat discs.
  const pm = mat(C.path);
  const P = S.PATH;
  for (let i = 0; i < P.length - 1; i++) {
    const [ax, az] = P[i], [bx, bz] = P[i + 1];
    const n = Math.ceil(Math.hypot(bx - ax, bz - az) / 0.4);
    for (let k = 0; k <= n; k++) {
      const t = k / n;
      const d = new THREE.Mesh(new THREE.CircleGeometry(0.75, 16), pm);
      d.rotation.x = -Math.PI / 2;
      d.position.set(ax + (bx - ax) * t, 0.01, az + (bz - az) * t);
      d.receiveShadow = true;
      scene.add(d);
    }
  }
  const mud = new THREE.Mesh(new THREE.CircleGeometry(1, 48), mat(C.mud));
  mud.rotation.x = -Math.PI / 2;
  mud.scale.set(S.POND.rx + 0.9, S.POND.rz + 0.9, 1);
  mud.position.set(S.POND.x, 0.015, S.POND.z);
  mud.receiveShadow = true;
  scene.add(mud);
  const water = new THREE.Mesh(new THREE.CircleGeometry(1, 48), mat(C.water, { roughness: 0.15, metalness: 0.2 }));
  water.rotation.x = -Math.PI / 2;
  water.scale.set(S.POND.rx, S.POND.rz, 1);
  water.position.set(S.POND.x, 0.02, S.POND.z);
  scene.add(water);
  // Reeds along the near shore.
  const rm = mat(C.reed);
  for (let i = 0; i < 70; i++) {
    const a = 0.6 + (i / 70) * 3.6 + Math.sin(i * 7.3) * 0.08;
    const r = 0.92 + 0.12 * Math.sin(i * 3.1);
    const reed = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 1.6 + 0.6 * Math.sin(i * 5.7), 4), rm);
    reed.position.set(S.POND.x + Math.cos(a) * S.POND.rx * r, 0.9, S.POND.z + Math.sin(a) * S.POND.rz * r);
    scene.add(reed);
  }
}

export function buildBlockout(scene) {
  ground(scene);
  scene.add(house(S.HUT, { doorX: 0.6, windows: [-2.4, 2.4], sideWindow: true, chimney: 1.2, lit: true }));
  scene.add(house(S.KOMORA, { doorX: 0, windows: [], chimney: 0 }));
  fence(scene);
  well(scene);
  for (const [x, z] of S.CHERRIES) tree(scene, x, z, 'cherry');
  for (const [x, z] of S.POPLARS) tree(scene, x, z, 'poplar');
  tree(scene, S.WILLOW.x, S.WILLOW.z, 'willow');
  const hay = new THREE.Mesh(new THREE.ConeGeometry(1.6, 2.8, 20), mat(C.hay));
  hay.position.set(S.HAYSTACK.x, 1.4, S.HAYSTACK.z);
  scene.add(hay);
  const bench = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.45, 0.45), mat(C.wood));
  bench.position.set(S.BENCH.x, 0.45, S.BENCH.z);
  scene.add(bench);
  scene.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
}

// Packs linear (orthographic) depth into 24 bits of RGB.
export const depthMaterial = new THREE.ShaderMaterial({
  side: THREE.DoubleSide,
  vertexShader: `void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `
    void main() {
      float d = clamp(gl_FragCoord.z, 0.0, 0.99999);
      vec3 enc = fract(d * vec3(1.0, 255.0, 65025.0));
      enc -= enc.yzz * vec3(1.0 / 255.0, 1.0 / 255.0, 0.0);
      gl_FragColor = vec4(enc, 1.0);
    }`,
});

export function render() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#1a2a40');
  buildBlockout(scene);
  const moon = new THREE.DirectionalLight('#dfe7ff', 2.6);
  moon.position.copy(S.MOON_DIR).multiplyScalar(50);
  moon.castShadow = true;
  moon.shadow.mapSize.set(4096, 4096);
  Object.assign(moon.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 120 });
  moon.shadow.bias = -0.0005;
  scene.add(moon, new THREE.HemisphereLight('#7f95c4', '#2a3322', 1.1));
  const cam = S.makeCamera();

  const out = {};
  const guide = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  guide.setPixelRatio(1);
  guide.setSize(S.IMAGE.width, S.IMAGE.height);
  guide.shadowMap.enabled = true;
  guide.shadowMap.type = THREE.PCFSoftShadowMap;
  guide.toneMapping = THREE.ACESFilmicToneMapping;
  guide.toneMappingExposure = 1.1;
  document.body.appendChild(guide.domElement);
  guide.render(scene, cam);
  out.guide = guide.domElement.toDataURL('image/png');

  const depth = new THREE.WebGLRenderer({ antialias: false, preserveDrawingBuffer: true });
  depth.setPixelRatio(1);
  depth.setSize(S.IMAGE.width, S.IMAGE.height);
  depth.outputColorSpace = THREE.LinearSRGBColorSpace;
  scene.background = new THREE.Color(1, 1, 1);
  scene.overrideMaterial = depthMaterial;
  depth.render(scene, cam);
  out.depth = depth.domElement.toDataURL('image/png');
  return out;
}
