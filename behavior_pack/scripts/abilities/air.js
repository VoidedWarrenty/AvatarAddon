import { EntityDamageCause, system } from "@minecraft/server";
import { V, eyePos, lookDir, broadcastSound, safeRun } from "../util.js";
import { spawnBurst, spawnRing, spawnBeam, spawnExplosion, spawnAura } from "../fx.js";

function damageEntities(dim, center, radius, damage, source) {
  const ents = dim.getEntities({ location: center, maxDistance: radius, excludeTypes: ["item"] });
  for (const e of ents) {
    if (e.id === source.id) continue;
    safeRun(() => e.applyDamage(damage, { cause: EntityDamageCause.magic, damagingEntity: source }));
  }
}

export const AIR = [
  {
    id: "air.blast",
    name: "Air Blast",
    desc: "Sharp wind blasts foes back.",
    cooldown: 15,
    run(player) {
      const dim = player.dimension;
      const dir = lookDir(player);
      const from = eyePos(player);
      broadcastSound(dim, "mob.phantom.swoop", from, 1.5, 1);
      for (let d = 1; d <= 8; d++) {
        const p = V.add(from, V.scale(dir, d));
        spawnBurst(dim, p, "air", 6, 0.3);
      }
      const target = V.add(from, V.scale(dir, 4));
      const ents = dim.getEntities({ location: target, maxDistance: 3, excludeTypes: ["item"] });
      for (const e of ents) {
        if (e.id === player.id) continue;
        safeRun(() => e.applyDamage(3, { cause: EntityDamageCause.magic, damagingEntity: player }));
        safeRun(() => e.applyKnockback(dir.x, dir.z, 2.5, 0.6));
      }
    },
  },
  {
    id: "air.scooter",
    name: "Air Scooter",
    desc: "Ride a ball of wind — fast movement.",
    cooldown: 60,
    run(player) {
      const dim = player.dimension;
      broadcastSound(dim, "mob.phantom.flap", player.location, 1.5, 1.2);
      safeRun(() => player.addEffect("speed", 160, { amplifier: 3, showParticles: false }));
      safeRun(() => player.addEffect("jump_boost", 160, { amplifier: 2, showParticles: false }));
      let t = 0;
      const h = system.runInterval(() => {
        if (t++ >= 32 || !player.isValid()) return system.clearRun(h);
        spawnRing(dim, player.location, "air", 0.8, 12);
      }, 5);
    },
  },
  {
    id: "air.shield",
    name: "Wind Shield",
    desc: "Whirling winds deflect harm.",
    cooldown: 180,
    run(player) {
      const dim = player.dimension;
      broadcastSound(dim, "mob.phantom.ambient", player.location, 1.5, 1);
      safeRun(() => player.addEffect("resistance", 140, { amplifier: 3, showParticles: false }));
      let t = 0;
      const h = system.runInterval(() => {
        if (t++ >= 14 || !player.isValid()) return system.clearRun(h);
        spawnAura(dim, player.location, "air", 1.3, 14);
        const ents = dim.getEntities({ location: player.location, maxDistance: 2.5, excludeTypes: ["item"] });
        for (const e of ents) {
          if (e.id === player.id) continue;
          safeRun(() => e.applyKnockback((e.location.x - player.location.x) * 0.3, (e.location.z - player.location.z) * 0.3, 1.6, 0.3));
        }
      }, 5);
    },
  },
  {
    id: "air.tornado",
    name: "Tornado",
    desc: "Summon a whirlwind that lifts and damages foes.",
    cooldown: 120,
    run(player) {
      const dim = player.dimension;
      const dir = lookDir(player);
      const center = V.add(player.location, V.scale({ x: dir.x, y: 0, z: dir.z }, 4));
      broadcastSound(dim, "mob.phantom.swoop", center, 1.5, 0.6);
      let t = 0;
      const h = system.runInterval(() => {
        if (t++ >= 20 || !player.isValid()) return system.clearRun(h);
        for (let y = 0; y < 5; y++) {
          const a = (t * 0.6 + y * 0.7);
          const r = 1.5 + y * 0.1;
          const p = { x: center.x + Math.cos(a) * r, y: center.y + y * 0.5, z: center.z + Math.sin(a) * r };
          spawnBurst(dim, p, "air", 3, 0.15);
        }
        const ents = dim.getEntities({ location: center, maxDistance: 3, excludeTypes: ["item"] });
        for (const e of ents) {
          if (e.id === player.id) continue;
          safeRun(() => e.applyDamage(1.5, { cause: EntityDamageCause.magic, damagingEntity: player }));
          safeRun(() => e.applyKnockback(0, 0, 0, 1.2));
        }
      }, 3);
    },
  },
  {
    id: "air.jump",
    name: "Air Jump",
    desc: "Launch skyward on a cushion of air.",
    cooldown: 40,
    run(player) {
      const dim = player.dimension;
      broadcastSound(dim, "mob.phantom.flap", player.location, 1.5, 1.4);
      safeRun(() => player.applyImpulse({ x: 0, y: 1.6, z: 0 }));
      spawnRing(dim, player.location, "air", 1.2, 24);
      spawnBurst(dim, player.location, "air", 20, 0.8);
    },
  },
  {
    id: "air.sonic",
    name: "Sonic Burst",
    desc: "A compressed sonic wave punches through enemies.",
    cooldown: 60,
    run(player) {
      const dim = player.dimension;
      const dir = lookDir(player);
      const from = eyePos(player);
      broadcastSound(dim, "mob.warden.sonic_boom", from, 1.5, 1);
      spawnBeam(dim, from, dir, "air", 20);
      for (let d = 1; d <= 20; d++) {
        const p = V.add(from, V.scale(dir, d));
        const ents = dim.getEntities({ location: p, maxDistance: 1.5, excludeTypes: ["item"] });
        for (const e of ents) {
          if (e.id === player.id) continue;
          safeRun(() => e.applyDamage(6, { cause: EntityDamageCause.sonicBoom, damagingEntity: player }));
          safeRun(() => e.applyKnockback(dir.x, dir.z, 2, 0.4));
        }
      }
    },
  },
  {
    id: "air.suffocate",
    name: "Suffocate",
    desc: "Rip air from your target's lungs.",
    cooldown: 140,
    run(player) {
      const hit = player.getEntitiesFromViewDirection({ maxDistance: 25 })[0];
      if (!hit) return;
      const e = hit.entity;
      broadcastSound(player.dimension, "mob.phantom.death", e.location, 1.5, 0.6);
      spawnBurst(player.dimension, e.location, "air", 20, 1.2);
      safeRun(() => e.addEffect("weakness", 100, { amplifier: 3, showParticles: false }));
      safeRun(() => e.addEffect("slowness", 100, { amplifier: 3, showParticles: false }));
      safeRun(() => e.addEffect("nausea", 140, { amplifier: 0, showParticles: false }));
      safeRun(() => e.applyDamage(5, { cause: EntityDamageCause.magic, damagingEntity: player }));
    },
  },
  {
    id: "air.slice",
    name: "Wind Slice",
    desc: "Razor arc of compressed air.",
    cooldown: 30,
    run(player) {
      const dim = player.dimension;
      const dir = lookDir(player);
      const from = eyePos(player);
      broadcastSound(dim, "mob.phantom.swoop", from, 2, 1);
      for (let i = -6; i <= 6; i++) {
        const a = i * 0.15;
        const rot = { x: dir.x * Math.cos(a) - dir.z * Math.sin(a), y: dir.y, z: dir.x * Math.sin(a) + dir.z * Math.cos(a) };
        for (let d = 1; d <= 8; d++) {
          const p = V.add(from, V.scale(rot, d));
          spawnBurst(dim, p, "air", 1, 0.05);
          const ents = dim.getEntities({ location: p, maxDistance: 0.8, excludeTypes: ["item"] });
          for (const e of ents) {
            if (e.id === player.id) continue;
            safeRun(() => e.applyDamage(4, { cause: EntityDamageCause.magic, damagingEntity: player }));
          }
        }
      }
    },
  },
];
