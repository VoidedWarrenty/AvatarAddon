import { world, system } from "@minecraft/server";

export const V = {
  add: (a, b) => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }),
  sub: (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }),
  scale: (a, s) => ({ x: a.x * s, y: a.y * s, z: a.z * s }),
  mag: (a) => Math.hypot(a.x, a.y, a.z),
  norm: (a) => {
    const m = V.mag(a) || 1;
    return { x: a.x / m, y: a.y / m, z: a.z / m };
  },
  cross: (a, b) => ({
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  }),
  dot: (a, b) => a.x * b.x + a.y * b.y + a.z * b.z,
  dist: (a, b) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z),
};

export function eyePos(player) {
  const h = player.getHeadLocation();
  return { x: h.x, y: h.y, z: h.z };
}

export function lookDir(player) {
  return player.getViewDirection();
}

export function perp(dir) {
  const up = Math.abs(dir.y) < 0.9 ? { x: 0, y: 1, z: 0 } : { x: 1, y: 0, z: 0 };
  const right = V.norm(V.cross(dir, up));
  const upv = V.norm(V.cross(right, dir));
  return { right, up: upv };
}

export function sound(player, id, pitch = 1, vol = 1) {
  try {
    player.playSound(id, { pitch, volume: vol });
  } catch {}
}

export function broadcastSound(dim, id, pos, pitch = 1, vol = 1) {
  try {
    dim.playSound(id, pos, { pitch, volume: vol });
  } catch {}
}

export function msg(player, text) {
  try {
    player.onScreenDisplay.setActionBar(text);
  } catch {}
}

export function safeRun(fn, ...args) {
  try { return fn(...args); } catch (e) { /* swallow */ }
}

export function delay(ticks, fn) {
  return system.runTimeout(fn, ticks);
}

export function every(ticks, fn) {
  return system.runInterval(fn, ticks);
}
