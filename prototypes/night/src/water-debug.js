// Test-only stand-ins (?wproxy=1) for the hut and trees, used to check the pond reflection while
// the architecture / tree modules are still stubs. Never built without the param.
import * as THREE from 'three';

export function buildProxies(ctx) {
  const { world, scene } = ctx;
  const L = world.LAYOUT;
  const g = new THREE.Group();
  const wall = new THREE.MeshStandardMaterial({ color: '#e8e4da', roughness: 0.9 });
  const roof = new THREE.MeshStandardMaterial({ color: '#4a4030', roughness: 1 });
  const tree = new THREE.MeshStandardMaterial({ color: '#1e2a18', roughness: 1 });
  const H = L.hut;
  const hut = new THREE.Mesh(new THREE.BoxGeometry(H.width, 2.6, H.depth), wall);
  hut.position.set(H.x, world.YARD_Y + 1.3, H.z);
  hut.rotation.y = H.rotY;
  const r = new THREE.Mesh(new THREE.ConeGeometry(4.2, 2.6, 4), roof);
  r.scale.set(1.3, 1, 0.75);
  r.position.set(H.x, world.YARD_Y + 3.9, H.z);
  r.rotation.y = H.rotY + Math.PI / 4;
  g.add(hut, r);
  for (const [x, z] of L.poplars) {
    const m = new THREE.Mesh(new THREE.ConeGeometry(1.6, 16, 10), tree);
    m.position.set(x, world.heightAt(x, z) + 8, z);
    g.add(m);
  }
  for (const [x, z] of L.willows) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(3.2, 12, 8), tree);
    m.position.set(x, world.heightAt(x, z) + 3.5, z);
    g.add(m);
  }
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  scene.add(g);
}
