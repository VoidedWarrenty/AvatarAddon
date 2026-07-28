import { MolangVariableMap } from "@minecraft/server";
import { V, perp, safeRun } from "./util.js";

function tryParticle(dim, id, pos, mv) {
  try { dim.spawnParticle(id, pos, mv); } catch {}
}

export function colorMV(r, g, b, a = 1) {
  const mv = new MolangVariableMap();
  try { mv.setColorRGBA("variable.color", { red: r, green: g, blue: b, alpha: a }); } catch {}
  return mv;
}

export function spawnBurst(dim, pos, color, count = 24, radius = 1.2) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const b = Math.acos(2 * Math.random() - 1);
    const r = Math.random() * radius;
    const p = {
      x: pos.x + Math.sin(b) * Math.cos(a) * r,
      y: pos.y + Math.cos(b) * r,
      z: pos.z + Math.sin(b) * Math.sin(a) * r,
    };
    switch (color) {
      case "fire":
        tryParticle(dim, "minecraft:basic_flame_particle", p);
        if (i % 3 === 0) tryParticle(dim, "minecraft:campfire_smoke_particle", p);
        break;
      case "water":
        tryParticle(dim, "minecraft:water_splash_particle_manual", p);
        if (i % 4 === 0) tryParticle(dim, "minecraft:water_evaporation_manual", p);
        break;
      case "earth":
        tryParticle(dim, "minecraft:falling_dust_dirt_particle", p);
        if (i % 3 === 0) tryParticle(dim, "minecraft:falling_dust_gravel_particle", p);
        break;
      case "air":
        tryParticle(dim, "minecraft:critical_hit_emitter", p);
        if (i % 3 === 0) tryParticle(dim, "minecraft:evocation_fang_particle", p);
        break;
      case "lightning":
        tryParticle(dim, "minecraft:electric_spark_particle", p);
        if (i % 4 === 0) tryParticle(dim, "minecraft:redstone_torch_dust_particle", p);
        break;
      case "ice":
        tryParticle(dim, "minecraft:snowflake_particle", p);
        if (i % 4 === 0) tryParticle(dim, "minecraft:water_evaporation_manual", p);
        break;
      case "heal":
        tryParticle(dim, "minecraft:heart_particle", p);
        break;
    }
  }
}

export function spawnTrail(dim, pos, dir, color, length = 1.5) {
  const step = 0.25;
  const steps = Math.floor(length / step);
  const { right, up } = perp(dir);
  for (let i = 0; i < steps; i++) {
    const t = i * step;
    const spiral = Math.sin(t * 6 + Date.now() * 0.01) * 0.15;
    const off = V.add(V.scale(right, spiral), V.scale(up, Math.cos(t * 6) * 0.15));
    const p = V.add(V.add(pos, V.scale(dir, t)), off);
    spawnBurst(dim, p, color, 2, 0.15);
  }
}

export function spawnRing(dim, pos, color, radius = 2, count = 32) {
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const p = { x: pos.x + Math.cos(a) * radius, y: pos.y + 0.1, z: pos.z + Math.sin(a) * radius };
    spawnBurst(dim, p, color, 1, 0.08);
  }
}

export function spawnBeam(dim, from, dir, color, length = 24) {
  const step = 0.5;
  const steps = Math.floor(length / step);
  for (let i = 0; i < steps; i++) {
    const p = V.add(from, V.scale(dir, i * step));
    spawnBurst(dim, p, color, 3, 0.1);
  }
}

export function spawnAura(dim, pos, color, radius = 1.4, count = 20) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const h = Math.random() * 1.8 - 0.2;
    const p = { x: pos.x + Math.cos(a) * radius, y: pos.y + h, z: pos.z + Math.sin(a) * radius };
    spawnBurst(dim, p, color, 1, 0.05);
  }
}

export function spawnExplosion(dim, pos, color, radius = 3) {
  safeRun(() => dim.spawnParticle("minecraft:huge_explosion_emitter", pos));
  for (let r = 0.5; r <= radius; r += 0.4) {
    spawnRing(dim, pos, color, r, Math.floor(8 * r));
  }
  spawnBurst(dim, pos, color, 40, radius * 0.6);
}
