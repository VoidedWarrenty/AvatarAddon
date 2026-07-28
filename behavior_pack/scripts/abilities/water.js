import { EntityDamageCause, system } from "@minecraft/server";
import { V, eyePos, lookDir, broadcastSound, safeRun } from "../util.js";
import { spawnBurst, spawnTrail, spawnRing, spawnBeam, spawnExplosion, spawnAura } from "../fx.js";

function damageEntities(dim, center, radius, damage, source, cause = EntityDamageCause.magic) {
  const ents = dim.getEntities({ location: center, maxDistance: radius, excludeTypes: ["item"] });
  for (const e of ents) {
    if (e.id === source.id) continue;
    safeRun(() => e.applyDamage(damage, { cause, damagingEntity: source }));
  }
}

export const WATER = [
  {
    id: "water.jet",
    name: "Water Jet",
    desc: "Piercing beam of pressurized water.",
    cooldown: 25,
    run(player) {
      const dim = player.dimension;
      const dir = lookDir(player);
      const from = eyePos(player);
      broadcastSound(dim, "bucket.empty_water", from, 1.5, 1);
      spawnBeam(dim, from, dir, "water", 20);
      for (let d = 1; d <= 20; d++) {
        const p = V.add(from, V.scale(dir, d));
        damageEntities(dim, p, 1.2, 4, player);
      }
    },
  },
  {
    id: "water.ice_spikes",
    name: "Ice Spikes",
    desc: "A line of impaling ice erupts before you.",
    cooldown: 35,
    run(player) {
      const dim = player.dimension;
      const dir = lookDir(player);
      const from = player.location;
      broadcastSound(dim, "block.glass.break", from, 1.5, 1);
      let step = 1;
      const h = system.runInterval(() => {
        if (step > 8 || !player.isValid()) return system.clearRun(h);
        const p = V.add(from, V.scale({ x: dir.x, y: 0, z: dir.z }, step));
        spawnBurst(dim, p, "ice", 12, 0.5);
        damageEntities(dim, p, 1.5, 5, player);
        step++;
      }, 2);
    },
  },
  {
    id: "water.whip",
    name: "Water Whip",
    desc: "Fast arcing lash of water.",
    cooldown: 15,
    run(player) {
      const dim = player.dimension;
      const dir = lookDir(player);
      const from = eyePos(player);
      broadcastSound(dim, "random.splash", from, 1.5, 1);
      for (let i = 1; i <= 8; i++) {
        const t = i / 8;
        const arc = { x: dir.x, y: dir.y + Math.sin(t * Math.PI) * 0.4, z: dir.z };
        const p = V.add(from, V.scale(arc, i * 0.6));
        spawnBurst(dim, p, "water", 4, 0.2);
      }
      damageEntities(dim, V.add(from, V.scale(dir, 4)), 2, 5, player);
    },
  },
  {
    id: "water.heal",
    name: "Healing Waters",
    desc: "Restore health with soothing water.",
    cooldown: 200,
    run(player) {
      const dim = player.dimension;
      broadcastSound(dim, "random.levelup", player.location, 1.5, 1.4);
      safeRun(() => player.addEffect("regeneration", 100, { amplifier: 2, showParticles: false }));
      let t = 0;
      const h = system.runInterval(() => {
        if (t++ >= 6 || !player.isValid()) return system.clearRun(h);
        spawnAura(dim, player.location, "heal", 1.2, 8);
        spawnAura(dim, player.location, "water", 1.5, 6);
      }, 8);
    },
  },
  {
    id: "water.ice_prison",
    name: "Ice Prison",
    desc: "Freeze the target you're looking at.",
    cooldown: 100,
    run(player) {
      const hit = player.getEntitiesFromViewDirection({ maxDistance: 30 })[0];
      if (!hit) return;
      const e = hit.entity;
      broadcastSound(player.dimension, "block.glass.break", e.location, 1.5, 0.8);
      spawnBurst(player.dimension, e.location, "ice", 30, 1.4);
      safeRun(() => e.addEffect("slowness", 120, { amplifier: 4, showParticles: false }));
      safeRun(() => e.addEffect("weakness", 120, { amplifier: 2, showParticles: false }));
      safeRun(() => e.applyDamage(4, { cause: EntityDamageCause.freezing, damagingEntity: player }));
    },
  },
  {
    id: "water.shield",
    name: "Bubble Shield",
    desc: "Encase yourself in a protective bubble.",
    cooldown: 180,
    run(player) {
      const dim = player.dimension;
      broadcastSound(dim, "mob.dolphin.play", player.location, 1.5, 1);
      safeRun(() => player.addEffect("resistance", 160, { amplifier: 2, showParticles: false }));
      safeRun(() => player.addEffect("water_breathing", 160, { amplifier: 0, showParticles: false }));
      let t = 0;
      const h = system.runInterval(() => {
        if (t++ >= 16 || !player.isValid()) return system.clearRun(h);
        spawnAura(dim, player.location, "water", 1.5, 10);
      }, 5);
    },
  },
  {
    id: "water.tsunami",
    name: "Tsunami",
    desc: "Unleash a wave of water that knocks foes away.",
    cooldown: 140,
    run(player) {
      const dim = player.dimension;
      const dir = lookDir(player);
      const from = eyePos(player);
      broadcastSound(dim, "random.splash", from, 1.5, 0.6);
      const target = V.add(from, V.scale(dir, 5));
      spawnExplosion(dim, target, "water", 5);
      const ents = dim.getEntities({ location: target, maxDistance: 6, excludeTypes: ["item"] });
      for (const e of ents) {
        if (e.id === player.id) continue;
        safeRun(() => e.applyDamage(6, { cause: EntityDamageCause.magic, damagingEntity: player }));
        safeRun(() => e.applyKnockback(dir.x, dir.z, 3, 0.8));
      }
    },
  },
  {
    id: "water.ice_slide",
    name: "Ice Slide",
    desc: "Skate forward on a trail of ice at high speed.",
    cooldown: 80,
    run(player) {
      const dim = player.dimension;
      const dir = lookDir(player);
      broadcastSound(dim, "block.glass.step", player.location, 1.5, 1);
      safeRun(() => player.applyImpulse({ x: dir.x * 2.2, y: 0.25, z: dir.z * 2.2 }));
      safeRun(() => player.addEffect("speed", 100, { amplifier: 4, showParticles: false }));
      let t = 0;
      const h = system.runInterval(() => {
        if (t++ >= 20 || !player.isValid()) return system.clearRun(h);
        spawnBurst(dim, player.location, "ice", 6, 0.4);
      }, 1);
    },
  },
];
