// The holova's yard, shared by the blockout renderer (which produces the guide image the
// painting is made from, plus a depth map) and the game runtime (camera, walkable ground, actors).
// Units are meters, +y up. Buildings are aligned to the world axes; the camera looks from +x +z.
import * as THREE from 'three';

export const IMAGE = { width: 1536, height: 1024 };

// Classic 2.5D camera: 45° around, 30° down. Orthographic, so painting pixels map 1:1 to world.
export const CAMERA = {
  yaw: Math.PI / 4,
  pitch: THREE.MathUtils.degToRad(30),
  viewWidth: 26,
  target: new THREE.Vector3(-1.34, 0, -2.05),
  distance: 60,
  near: 1,
  far: 140,
};

export function makeCamera() {
  const h = CAMERA.viewWidth * IMAGE.height / IMAGE.width;
  const cam = new THREE.OrthographicCamera(-CAMERA.viewWidth / 2, CAMERA.viewWidth / 2, h / 2, -h / 2, CAMERA.near, CAMERA.far);
  const dir = new THREE.Vector3(
    Math.sin(CAMERA.yaw) * Math.cos(CAMERA.pitch),
    Math.sin(CAMERA.pitch),
    Math.cos(CAMERA.yaw) * Math.cos(CAMERA.pitch),
  );
  cam.position.copy(CAMERA.target).addScaledVector(dir, CAMERA.distance);
  cam.lookAt(CAMERA.target);
  cam.updateMatrixWorld();
  cam.updateProjectionMatrix();
  return cam;
}

// Moon from the front right, low: lights the hut's front and east walls, shadows fall up-screen.
export const MOON_DIR = new THREE.Vector3(0.75, 0.55, 0.38).normalize();

export const HUT = { x: -3.54, z: -2.12, w: 9, d: 5, wall: 2.3, ridge: 5.3 };
export const KOMORA = { x: 4.24, z: -5.66, w: 4, d: 3.4, wall: 2.0, ridge: 3.9 };
export const FENCE = { x0: -9, x1: 7.5, z0: -9, z1: 6, gate: [2.5, 4.5], h: 1.15 };
export const WELL = { x: -3.9, z: 4.3 };
export const POND = { x: 0.71, z: 12.0, rx: 4.6, rz: 3.4 };
export const BENCH = { x: -5.6, z: 1.05 };
export const HAYSTACK = { x: 2.8, z: -10.8 };
export const CHERRIES = [[-7, -6.5], [1.5, -7.6], [5.8, 1.5], [-7.2, 3.0]];
export const POPLARS = [[-11.3, -4.2], [-9.2, -7.8], [-6.0, -10.3]];
export const WILLOW = { x: -5.6, z: 10.6 };

// Where people stand. The holova waits by his door; the hero arrives through the gate.
export const SPOTS = {
  heroStart: { x: 5.0, z: 8.3 },
  holova: { x: -1.6, z: 1.7 },
  komoraDoor: { x: 4.24, z: -3.3 },
};

// Path (screen guide only): gate to the hut door, gate down to the pond.
export const PATH = [[-2.9, 0.7], [-1, 2.5], [1.5, 4.8], [3.5, 6], [3.6, 7.2], [2.8, 8.6]];

// Hidden trail the candle reveals (as painted): wet footprints from the pond, through the gate,
// up the path to the hut door.
export const TRAIL = [[2.6, 8.7], [3.4, 7.3], [3.5, 6.0], [1.5, 4.8], [-1, 2.5], [-2.6, 1.0]];

// Ground cells the walker may enter.
export function isWalkable(x, z) {
  const inYardBox = x > -13 && x < 12 && z > -11 && z < 16;
  if (!inYardBox) return false;
  // Pond.
  if (((x - POND.x) / (POND.rx - 0.4)) ** 2 + ((z - POND.z) / (POND.rz - 0.4)) ** 2 < 1) return false;
  // Buildings (with a little clearance).
  const box = (o, m = 0.35) => Math.abs(x - o.x) < o.w / 2 + m && Math.abs(z - o.z) < o.d / 2 + m;
  if (box(HUT) || box(KOMORA)) return false;
  // Fence lines, except the gate.
  const t = 0.35;
  const onFenceX = (z0) => Math.abs(z - z0) < t && x > FENCE.x0 - t && x < FENCE.x1 + t;
  const onFenceZ = (x0) => Math.abs(x - x0) < t && z > FENCE.z0 - t && z < FENCE.z1 + t;
  if (onFenceX(FENCE.z1) && !(x > FENCE.gate[0] && x < FENCE.gate[1])) return false;
  if (onFenceX(FENCE.z0) || onFenceZ(FENCE.x0) || onFenceZ(FENCE.x1)) return false;
  // Props.
  const near = (px, pz, r) => (x - px) ** 2 + (z - pz) ** 2 < r * r;
  if (near(WELL.x, WELL.z, 1.0) || near(HAYSTACK.x, HAYSTACK.z, 1.7) || near(WILLOW.x, WILLOW.z, 0.8)) return false;
  for (const [cx, cz] of CHERRIES) if (near(cx, cz, 0.5)) return false;
  if (Math.abs(x - BENCH.x) < 1.1 && Math.abs(z - BENCH.z) < 0.4) return false;
  return true;
}
