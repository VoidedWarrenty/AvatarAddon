import { MolangVariableMap, system } from "@minecraft/server";
import { V, safeRun } from "./util.js";

function mv(dir = { x: 0, y: 1, z: 0 }) {
  const m = new MolangVariableMap();
  try { m.setVector3("variable.direction", dir); } catch {}
  try { m.setVector3("variable.axis", dir); } catch {}
  try { m.setColorRGB("variable.color", { red: 1, green: 1, blue: 1 }); } catch {}
  return m;
}

export function spawnP(dim, id, pos, dir) {
  try { dim.spawnParticle(id, pos, mv(dir)); } catch {}
}

const PALETTE = {
  fire: [
    ["minecraft:basic_flame_particle", 4],
    ["minecraft:campfire_smoke_particle", 1],
  ],
  ember: [
    ["minecraft:basic_flame_particle", 3],
    ["minecraft:soul_flame_particle", 1],
    ["minecraft:campfire_smoke_particle", 1],
  ],
  water: [
    ["minecraft:conduit_particle", 3],
    ["minecraft:sculk_soul_particle", 1],
  ],
  ice: [
    ["minecraft:snowflake_particle", 4],
    ["minecraft:conduit_particle", 1],
  ],
  earth: [
    ["minecraft:falling_dust_dirt_particle", 3],
    ["minecraft:falling_dust_gravel_particle", 1],
    ["minecraft:basic_smoke_particle", 1],
  ],
  air: [
    ["minecraft:critical_hit_emitter", 2],
    ["minecraft:evocation_fang_particle", 1],
  ],
  lightning: [
    ["avatar:blue_bolt", 5],
    ["avatar:blue_spark", 3],
  ],
  heal: [
    ["minecraft:heart_particle", 1],
  ],
};

function pick(color) {
  const palette = PALETTE[color] || PALETTE.fire;
  const total = palette.reduce((a, p) => a + p[1], 0);
  let r = Math.random() * total;
  for (const [id, w] of palette) {
    r -= w;
    if (r <= 0) return id;
  }
  return palette[0][0];
}

export function spawnBurst(dim, pos, color, count = 24, radius = 1.2, dir) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const b = Math.acos(2 * Math.random() - 1);
    const r = Math.random() * radius;
    const p = {
      x: pos.x + Math.sin(b) * Math.cos(a) * r,
      y: pos.y + Math.cos(b) * r,
      z: pos.z + Math.sin(b) * Math.sin(a) * r,
    };
    spawnP(dim, pick(color), p, dir);
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
  const step = 0.35;
  const steps = Math.floor(length / step);
  for (let i = 0; i < steps; i++) {
    const p = V.add(from, V.scale(dir, i * step));
    spawnBurst(dim, p, color, 2, 0.1, dir);
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
  try { dim.spawnParticle("minecraft:huge_explosion_emitter", pos, mv()); } catch {}
  for (let r = 0.5; r <= radius; r += 0.4) {
    spawnRing(dim, pos, color, r, Math.floor(8 * r));
  }
  spawnBurst(dim, pos, color, 40, radius * 0.6);
}

export function spawnTrail(dim, pos, back, color, length = 1.5) {
  const step = 0.25;
  const steps = Math.floor(length / step);
  for (let i = 0; i < steps; i++) {
    const t = i * step;
    const p = V.add(pos, V.scale(back, t));
    spawnBurst(dim, p, color, 2, 0.15);
  }
}

export function spawnForkedBolt(dim, from, initialDir, color = "lightning", length = 24, depth = 3) {
  let pos = { ...from };
  let d = { ...initialDir };
  const segLen = 1.1;
  const steps = Math.max(1, Math.floor(length / segLen));
  for (let i = 0; i < steps; i++) {
    d = V.norm({
      x: d.x + (Math.random() - 0.5) * 0.55,
      y: d.y + (Math.random() - 0.5) * 0.45,
      z: d.z + (Math.random() - 0.5) * 0.55,
    });
    const next = V.add(pos, V.scale(d, segLen));
    const drawSteps = 8;
    for (let s = 0; s <= drawSteps; s++) {
      const t = s / drawSteps;
      const p = {
        x: pos.x + (next.x - pos.x) * t,
        y: pos.y + (next.y - pos.y) * t,
        z: pos.z + (next.z - pos.z) * t,
      };
      spawnBurst(dim, p, color, 2, 0.06, d);
    }
    if (depth > 0 && Math.random() < 0.4) {
      const branch = V.norm({
        x: d.x + (Math.random() - 0.5) * 1.8,
        y: d.y + (Math.random() - 0.5) * 1.8,
        z: d.z + (Math.random() - 0.5) * 1.8,
      });
      spawnForkedBolt(dim, next, branch, color, length * 0.35, depth - 1);
    }
    pos = next;
  }
}

export function damageAlongPath(dim, from, dir, length, radius, source, damageFn) {
  const step = 1.0;
  const seen = new Set();
  let pos = { ...from };
  for (let d = 0; d <= length; d += step) {
    const ents = dim.getEntities({ location: pos, maxDistance: radius, excludeTypes: ["item"] });
    for (const e of ents) {
      if (e.id === source.id) continue;
      if (seen.has(e.id)) continue;
      seen.add(e.id);
      damageFn(e);
    }
    pos = V.add(pos, V.scale(dir, step));
  }
}

// Animated forked bolt — segments render over time, damage fires as each
// segment reaches an entity. `onEntityHit(entity, segmentIndex)` is called
// once per entity (globally deduped across the bolt + all branches).
export function animatedForkedBolt(dim, start, initialDir, opts) {
  const {
    color = "lightning",
    length = 24,
    segLen = 0.7,
    segmentsPerTick = 4,
    hitRadius = 1.6,
    branchChance = 0.35,
    depth = 3,
    source,
    onSegment,
    onEntityHit,
    seen,
  } = opts;
  const totalSteps = Math.max(1, Math.floor(length / segLen));
  const hitSet = seen || new Set();
  let pos = { ...start };
  let d = { ...initialDir };
  let step = 0;
  const handle = system.runInterval(() => {
    for (let sub = 0; sub < segmentsPerTick; sub++) {
      if (step >= totalSteps) { system.clearRun(handle); return; }
      d = V.norm({
        x: d.x + (Math.random() - 0.5) * 0.5,
        y: d.y + (Math.random() - 0.5) * 0.45,
        z: d.z + (Math.random() - 0.5) * 0.5,
      });
      const next = V.add(pos, V.scale(d, segLen));
      // draw segment
      const draws = 6;
      for (let s = 0; s <= draws; s++) {
        const t = s / draws;
        const p = {
          x: pos.x + (next.x - pos.x) * t,
          y: pos.y + (next.y - pos.y) * t,
          z: pos.z + (next.z - pos.z) * t,
        };
        try {
          const m = mv(d);
          for (let k = 0; k < 2; k++) dim.spawnParticle(pickPalette(color), p, m);
        } catch {}
      }
      if (onSegment) safeRun(() => onSegment(next, d, step));
      // per-segment entity hit
      if (source && onEntityHit) {
        try {
          const ents = dim.getEntities({ location: next, maxDistance: hitRadius, excludeTypes: ["item"] });
          for (const e of ents) {
            if (e.id === source.id) continue;
            if (hitSet.has(e.id)) continue;
            hitSet.add(e.id);
            safeRun(() => onEntityHit(e, step));
          }
        } catch {}
      }
      // branch
      if (depth > 0 && Math.random() < branchChance) {
        const branch = V.norm({
          x: d.x + (Math.random() - 0.5) * 1.8,
          y: d.y + (Math.random() - 0.5) * 1.8,
          z: d.z + (Math.random() - 0.5) * 1.8,
        });
        animatedForkedBolt(dim, next, branch, {
          ...opts, length: length * 0.4, depth: depth - 1, seen: hitSet,
        });
      }
      pos = next;
      step++;
    }
  }, 1);
}

// small internal helper mirroring pick() but exported name kept private
function pickPalette(color) {
  return pick(color);
}
