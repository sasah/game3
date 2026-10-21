// Ground mesh: displaced grid with painted vertex colors (meadow, path, wet shore, pond bottom, yard)
// and a tiled procedural detail texture.
import * as THREE from 'three';
import { fbm2, smoothstep, mix } from './noise.js';

function detailTexture(renderer) {
  const N = 256;
  const c = document.createElement('canvas');
  c.width = c.height = N;
  const g = c.getContext('2d');
  const img = g.createImageData(N, N);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      // Tileable fbm via torus mapping.
      const a = (x / N) * Math.PI * 2, b = (y / N) * Math.PI * 2;
      const n = fbm2(Math.cos(a) * 3 + Math.sin(b) * 0.5, Math.sin(a) * 3 + Math.cos(b) * 3, 5);
      const n2 = fbm2(Math.cos(b) * 9 + 1.7, Math.sin(a) * 9 - 0.3, 3);
      let v = 0.82 + 0.13 * n + 0.07 * n2;
      if (((x * 7919 + y * 104729) % 997) < 9) v *= 0.75; // pebbles / specks
      const i = (y * N + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = Math.max(0, Math.min(255, v * 255));
      img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return tex;
}

export function buildTerrain(ctx) {
  const { world } = ctx;
  const SIZE = 280, SEG = ctx.quality === 'low' ? 200 : 280;
  const CX = 0, CZ = -12;
  const geo = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const uvs = geo.attributes.uv;

  const meadowA = new THREE.Color('#33502a');
  const meadowB = new THREE.Color('#465f2c');
  const meadowC = new THREE.Color('#2b4a3a');
  const dirt = new THREE.Color('#6e5d47');
  const yardC = new THREE.Color('#5e503e');
  const mud = new THREE.Color('#332e24');
  const bottom = new THREE.Color('#1f2419');
  const tmp = new THREE.Color();
  const H = world.LAYOUT.hut;

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) + CX, z = pos.getZ(i) + CZ;
    const y = world.heightAt(x, z);
    pos.setXYZ(i, x, y, z);
    uvs.setXY(i, x / 3, z / 3);

    const n1 = fbm2(x * 0.06, z * 0.06, 3), n2 = fbm2(x * 0.21 + 5, z * 0.21, 2);
    tmp.copy(meadowA).lerp(meadowB, smoothstep(-0.3, 0.5, n1)).lerp(meadowC, smoothstep(0.1, 0.7, n2) * 0.5);
    const yardT = 1 - smoothstep(4.5, 8.5, Math.hypot(x - H.x, z - H.z));
    tmp.lerp(yardC, yardT * mix(0.55, 0.95, 0.5 + 0.5 * n2));
    tmp.lerp(dirt, world.pathMask(x, z) * 0.9);
    const d = world.pondDist(x, z);
    tmp.lerp(mud, (1 - smoothstep(0.96, 1.1, d)) * 0.85);
    tmp.lerp(bottom, 1 - smoothstep(0.8, 0.97, d));
    colors[i * 3] = tmp.r; colors[i * 3 + 1] = tmp.g; colors[i * 3 + 2] = tmp.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  geo.computeBoundingSphere();

  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    map: detailTexture(ctx.renderer),
    roughness: 0.96,
    metalness: 0,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  mesh.name = 'terrain';
  ctx.scene.add(mesh);
  return mesh;
}
