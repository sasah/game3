// First-person walking. Touch: left half = floating joystick, right half = drag to look.
// Desktop: WASD/arrows + mouse (click for pointer lock, or drag), Shift to walk faster.
import * as THREE from 'three';

const EYE = 1.62;

export function createControls(ctx, dom, ui) {
  const { camera, world } = ctx;
  const s = ctx.world.LAYOUT.start;
  const state = {
    x: s.x, z: s.z, yaw: s.yaw, pitch: s.pitch,
    groundY: world.walkHeightAt(s.x, s.z),
    move: new THREE.Vector2(), // x = strafe, y = forward, |v| <= 1
    keys: new Set(),
    bob: 0,
    enabled: false,
    speed: 0,
  };

  // Touch joystick + look.
  const touches = new Map();
  const R = 52;
  function onTouchStart(e) {
    if (!state.enabled) return;
    for (const t of e.changedTouches) {
      const left = t.clientX < window.innerWidth * 0.45;
      touches.set(t.identifier, { kind: left ? 'move' : 'look', x0: t.clientX, y0: t.clientY, x: t.clientX, y: t.clientY });
      if (left) ui.showStick(t.clientX, t.clientY);
    }
    e.preventDefault();
  }
  function onTouchMove(e) {
    for (const t of e.changedTouches) {
      const tr = touches.get(t.identifier);
      if (!tr) continue;
      if (tr.kind === 'look') {
        state.yaw -= (t.clientX - tr.x) * 0.0055;
        state.pitch -= (t.clientY - tr.y) * 0.0045;
      } else {
        let dx = t.clientX - tr.x0, dy = t.clientY - tr.y0;
        const len = Math.hypot(dx, dy);
        if (len > R) { dx *= R / len; dy *= R / len; }
        state.move.set(dx / R, -dy / R);
        ui.moveStick(dx, dy);
      }
      tr.x = t.clientX; tr.y = t.clientY;
    }
    e.preventDefault();
  }
  function onTouchEnd(e) {
    for (const t of e.changedTouches) {
      const tr = touches.get(t.identifier);
      if (tr && tr.kind === 'move') { state.move.set(0, 0); ui.hideStick(); }
      touches.delete(t.identifier);
    }
  }
  dom.addEventListener('touchstart', onTouchStart, { passive: false });
  dom.addEventListener('touchmove', onTouchMove, { passive: false });
  dom.addEventListener('touchend', onTouchEnd);
  dom.addEventListener('touchcancel', onTouchEnd);

  // Mouse look: pointer lock when available, drag otherwise.
  let dragging = false, lx = 0, ly = 0;
  dom.addEventListener('mousedown', (e) => {
    if (!state.enabled) return;
    if (dom.requestPointerLock && !document.pointerLockElement) {
      try { dom.requestPointerLock(); } catch (_) { /* drag fallback */ }
    }
    dragging = true; lx = e.clientX; ly = e.clientY;
  });
  window.addEventListener('mouseup', () => { dragging = false; });
  window.addEventListener('mousemove', (e) => {
    if (!state.enabled) return;
    if (document.pointerLockElement === dom) {
      state.yaw -= e.movementX * 0.0022;
      state.pitch -= e.movementY * 0.0022;
    } else if (dragging) {
      state.yaw -= (e.clientX - lx) * 0.004;
      state.pitch -= (e.clientY - ly) * 0.004;
      lx = e.clientX; ly = e.clientY;
    }
  });
  window.addEventListener('keydown', (e) => state.keys.add(e.code));
  window.addEventListener('keyup', (e) => state.keys.delete(e.code));
  window.addEventListener('blur', () => state.keys.clear());

  const fwd = new THREE.Vector3(), right = new THREE.Vector3();

  function update(dt) {
    state.pitch = Math.max(-1.25, Math.min(1.2, state.pitch));
    let mx = state.move.x, my = state.move.y;
    const k = state.keys;
    if (k.has('KeyW') || k.has('ArrowUp')) my += 1;
    if (k.has('KeyS') || k.has('ArrowDown')) my -= 1;
    if (k.has('KeyA')) mx -= 1;
    if (k.has('KeyD')) mx += 1;
    if (k.has('ArrowLeft')) state.yaw += dt * 1.6;
    if (k.has('ArrowRight')) state.yaw -= dt * 1.6;
    const mag = Math.min(1, Math.hypot(mx, my));
    if (mag > 1e-3) { const n = Math.hypot(mx, my); mx /= n; my /= n; }
    const fast = k.has('ShiftLeft') || k.has('ShiftRight') || mag > 0.97;
    const target = state.enabled ? mag * (fast ? 2.6 : 1.45) : 0;
    state.speed += (target - state.speed) * Math.min(1, dt * 5);

    fwd.set(-Math.sin(state.yaw), 0, -Math.cos(state.yaw));
    right.set(Math.cos(state.yaw), 0, -Math.sin(state.yaw));
    const stepX = (fwd.x * my + right.x * mx) * state.speed * dt;
    const stepZ = (fwd.z * my + right.z * mx) * state.speed * dt;
    // Slide along obstacles: try full step, then each axis.
    if (world.isWalkable(state.x + stepX, state.z + stepZ)) { state.x += stepX; state.z += stepZ; }
    else if (world.isWalkable(state.x + stepX, state.z)) state.x += stepX;
    else if (world.isWalkable(state.x, state.z + stepZ)) state.z += stepZ;

    const gy = world.walkHeightAt(state.x, state.z);
    state.groundY += (gy - state.groundY) * Math.min(1, dt * 8);
    state.bob += state.speed * dt * 5.2;
    const bobY = Math.sin(state.bob) * 0.035 * Math.min(1, state.speed);
    camera.position.set(state.x, state.groundY + EYE + bobY, state.z);
    camera.rotation.set(state.pitch, state.yaw, 0, 'YXZ');
  }

  return { state, update };
}
