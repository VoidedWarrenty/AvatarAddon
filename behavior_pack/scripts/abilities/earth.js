import { EntityDamageCause, system } from "@minecraft/server";
import { V, eyePos, lookDir, broadcastSound, safeRun } from "../util.js";
import { spawnBurst, spawnRing, spawnExplosion, spawnAura } from "../fx.js";

function damageEntities(dim, center, radius, damage, source, cause = EntityDamageCause.entityAttack) {
  const ents = dim.getEntities({ location: center, maxDistance: radius, excludeTypes: ["item"] });
  for (const e of ents) {
    if (e.id === source.id) continue;
    safeRun(() => e.applyDamage(damage, { cause, damagingEntity: source }));
  }
}

const TEMP_BLOCKS = [];

export function tickTempBlocks() {
  const now = Date.now();
  for (let i = TEMP_BLOCKS.length - 1; i >= 0; i--) {
    const tb = TEMP_BLOCKS[i];
    if (now >= tb.expires) {
      try { tb.dim.getBlock(tb.pos).setType(tb.original); } catch {}
      TEMP_BLOCKS.splice(i, 1);
    }
  }
}

function placeTemp(dim, pos, blockId, lifeMs) {
  try {
    const b = dim.getBlock(pos);
    if (!b) return;
    const original = b.typeId;
    if (original === blockId) return;
    if (original !== "minecraft:air" && !b.isLiquid && original !== "minecraft:short_grass" && original !== "minecraft:tall_grass") return;
    b.setType(blockId);
    TEMP_BLOCKS.push({ dim, pos: { x: pos.x, y: pos.y, z: pos.z }, original, expires: Date.now() + lifeMs });
  } catch {}
}

export const EARTH = [
  {
    id: "earth.rock",
    name: "Rock Throw",
    desc: "Hurl a boulder from the ground.",
    cooldown: 25,
    run(player) {
      const dim = player.dimension;
      const dir = lookDir(player);
      const from = eyePos(player);
      broadcastSound(dim, "dig.stone", from, 1.5, 0.7);
      let pos = from;
      let ticks = 0;
      const h = system.runInterval(() => {
        pos = V.add(pos, V.scale(dir, 1.0));
        spawnBurst(dim, pos, "earth", 8, 0.4);
        const near = dim.getEntities({ location: pos, maxDistance: 1.4, excludeTypes: ["item"] })
          .find((e) => e.id !== player.id);
        if (near || ticks++ > 30) {
          spawnExplosion(dim, pos, "earth", 2.5);
          broadcastSound(dim, "random.explode", pos, 1, 0.5);
          damageEntities(dim, pos, 3, 8, player);
          system.clearRun(h);
        }
      }, 1);
    },
  },
  {
    id: "earth.wall",
    name: "Earth Wall",
    desc: "Raise a temporary stone wall in front of you.",
    cooldown: 100,
    run(player) {
      const dim = player.dimension;
      const dir = lookDir(player);
      const from = V.add(player.location, V.scale({ x: dir.x, y: 0, z: dir.z }, 2));
      const rightAxis = V.norm({ x: -dir.z, y: 0, z: dir.x });
      broadcastSound(dim, "dig.stone", from, 1.5, 0.8);
      for (let i = -2; i <= 2; i++) {
        for (let y = 0; y < 3; y++) {
          const p = { x: Math.floor(from.x + rightAxis.x * i), y: Math.floor(from.y + y), z: Math.floor(from.z + rightAxis.z * i) };
          placeTemp(dim, p, "minecraft:cobblestone", 15000);
          spawnBurst(dim, p, "earth", 6, 0.5);
        }
      }
    },
  },
  {
    id: "earth.quake",
    name: "Earthquake",
    desc: "Slam the ground; enemies are launched upward.",
    cooldown: 90,
    run(player) {
      const dim = player.dimension;
      broadcastSound(dim, "random.explode", player.location, 1, 0.4);
      spawnRing(dim, player.location, "earth", 4, 40);
      spawnBurst(dim, player.location, "earth", 40, 3);
      const ents = dim.getEntities({ location: player.location, maxDistance: 5, excludeTypes: ["item"] });
      for (const e of ents) {
        if (e.id === player.id) continue;
        safeRun(() => e.applyDamage(7, { cause: EntityDamageCause.entityAttack, damagingEntity: player }));
        safeRun(() => e.applyKnockback(0, 0, 0, 1.2));
      }
    },
  },
  {
    id: "earth.shrapnel",
    name: "Metal Shrapnel",
    desc: "Barrage of iron fragments.",
    cooldown: 45,
    run(player) {
      const dim = player.dimension;
      const dir = lookDir(player);
      const from = eyePos(player);
      broadcastSound(dim, "random.anvil_land", from, 1.5, 1.5);
      for (let f = 0; f < 6; f++) {
        const spread = { x: dir.x + (Math.random() - 0.5) * 0.2, y: dir.y + (Math.random() - 0.5) * 0.2, z: dir.z + (Math.random() - 0.5) * 0.2 };
        for (let d = 1; d <= 12; d++) {
          const p = V.add(from, V.scale(spread, d));
          spawnBurst(dim, p, "earth", 1, 0.05);
          const near = dim.getEntities({ location: p, maxDistance: 1, excludeTypes: ["item"] })
            .find((e) => e.id !== player.id);
          if (near) {
            safeRun(() => near.applyDamage(3, { cause: EntityDamageCause.entityAttack, damagingEntity: player }));
            break;
          }
        }
      }
    },
  },
  {
    id: "earth.sand",
    name: "Sand Blast",
    desc: "Cone of blinding sand.",
    cooldown: 30,
    run(player) {
      const dim = player.dimension;
      const dir = lookDir(player);
      const from = eyePos(player);
      broadcastSound(dim, "step.sand", from, 1.5, 0.6);
      for (let d = 1; d <= 6; d++) {
        const p = V.add(from, V.scale(dir, d));
        spawnBurst(dim, p, "earth", 12, d * 0.15);
      }
      const target = V.add(from, V.scale(dir, 4));
      const ents = dim.getEntities({ location: target, maxDistance: 3, excludeTypes: ["item"] });
      for (const e of ents) {
        if (e.id === player.id) continue;
        safeRun(() => e.applyDamage(3, { cause: EntityDamageCause.entityAttack, damagingEntity: player }));
        safeRun(() => e.addEffect("blindness", 100, { amplifier: 0, showParticles: false }));
        safeRun(() => e.addEffect("slowness", 100, { amplifier: 1, showParticles: false }));
      }
    },
  },
  {
    id: "earth.boulder",
    name: "Boulder Barrage",
    desc: "Three heavy boulders in rapid succession.",
    cooldown: 90,
    run(player) {
      const dim = player.dimension;
      const dir = lookDir(player);
      let launched = 0;
      const launcher = system.runInterval(() => {
        if (launched++ >= 3 || !player.isValid()) return system.clearRun(launcher);
        broadcastSound(dim, "dig.stone", player.location, 1.5, 0.6);
        let pos = eyePos(player);
        let ticks = 0;
        const h = system.runInterval(() => {
          pos = V.add(pos, V.scale(dir, 1.1));
          spawnBurst(dim, pos, "earth", 10, 0.6);
          const near = dim.getEntities({ location: pos, maxDistance: 1.6, excludeTypes: ["item"] })
            .find((e) => e.id !== player.id);
          if (near || ticks++ > 20) {
            spawnExplosion(dim, pos, "earth", 2);
            damageEntities(dim, pos, 3, 6, player);
            system.clearRun(h);
          }
        }, 1);
      }, 6);
    },
  },
  {
    id: "earth.pillar",
    name: "Pillar Rise",
    desc: "A pillar of stone erupts beneath your target.",
    cooldown: 70,
    run(player) {
      const hit = player.getEntitiesFromViewDirection({ maxDistance: 30 })[0];
      const dim = player.dimension;
      const target = hit ? hit.entity.location : V.add(eyePos(player), V.scale(lookDir(player), 8));
      broadcastSound(dim, "dig.stone", target, 1.5, 0.7);
      for (let y = 0; y < 4; y++) {
        const p = { x: Math.floor(target.x), y: Math.floor(target.y - 1 + y), z: Math.floor(target.z) };
        placeTemp(dim, p, "minecraft:cobblestone", 12000);
        spawnBurst(dim, p, "earth", 6, 0.4);
      }
      if (hit) {
        safeRun(() => hit.entity.applyKnockback(0, 0, 0, 1.4));
        safeRun(() => hit.entity.applyDamage(4, { cause: EntityDamageCause.entityAttack, damagingEntity: player }));
      }
    },
  },
  {
    id: "earth.landslide",
    name: "Landslide",
    desc: "Ground shifts into cascading debris around you.",
    cooldown: 110,
    run(player) {
      const dim = player.dimension;
      broadcastSound(dim, "random.explode", player.location, 1, 0.5);
      for (let i = 0; i < 20; i++) {
        const a = Math.random() * Math.PI * 2;
        const r = Math.random() * 4 + 1;
        const p = { x: player.location.x + Math.cos(a) * r, y: player.location.y, z: player.location.z + Math.sin(a) * r };
        spawnBurst(dim, p, "earth", 8, 0.4);
      }
      const ents = dim.getEntities({ location: player.location, maxDistance: 5, excludeTypes: ["item"] });
      for (const e of ents) {
        if (e.id === player.id) continue;
        safeRun(() => e.applyDamage(5, { cause: EntityDamageCause.entityAttack, damagingEntity: player }));
        safeRun(() => e.addEffect("slowness", 100, { amplifier: 3, showParticles: false }));
      }
    },
  },
];
