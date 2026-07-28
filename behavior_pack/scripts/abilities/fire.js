import { EntityDamageCause, system } from "@minecraft/server";
import { V, eyePos, lookDir, broadcastSound, safeRun } from "../util.js";
import { spawnBurst, spawnTrail, spawnRing, spawnBeam, spawnExplosion, spawnAura } from "../fx.js";

function damageEntities(dim, center, radius, damage, source, cause = EntityDamageCause.fire, ignite = 0) {
  const ents = dim.getEntities({ location: center, maxDistance: radius, excludeTypes: ["item"] });
  for (const e of ents) {
    if (e.id === source.id) continue;
    safeRun(() => e.applyDamage(damage, { cause, damagingEntity: source }));
    if (ignite > 0) safeRun(() => e.setOnFire(ignite, true));
  }
}

function projectile(player, opts) {
  const dim = player.dimension;
  const dir = lookDir(player);
  let pos = V.add(eyePos(player), V.scale(dir, 0.5));
  let ticks = 0;
  const speed = opts.speed ?? 1.1;
  const max = opts.max ?? 40;
  const radius = opts.radius ?? 1.0;
  const onTick = opts.onTick ?? (() => {});
  const onHit = opts.onHit ?? (() => {});
  const handle = system.runInterval(() => {
    for (let sub = 0; sub < 2; sub++) {
      const next = V.add(pos, V.scale(dir, speed * 0.5));
      onTick(dim, pos, dir);
      const nearby = dim.getEntities({ location: next, maxDistance: radius, excludeTypes: ["item"] });
      const hit = nearby.find((e) => e.id !== player.id);
      let blockHit = false;
      try {
        const b = dim.getBlock(next);
        if (b && !b.isAir && !b.isLiquid) blockHit = true;
      } catch {}
      pos = next;
      if (hit || blockHit || ticks > max) {
        onHit(dim, pos, dir, hit, player);
        system.clearRun(handle);
        return;
      }
      ticks++;
    }
  }, 1);
}

export const FIRE = [
  {
    id: "fire.blast",
    name: "Fire Blast",
    desc: "Short cone of flame that ignites nearby foes.",
    cooldown: 20,
    run(player) {
      const dim = player.dimension;
      const dir = lookDir(player);
      const from = eyePos(player);
      broadcastSound(dim, "mob.blaze.shoot", from, 1.2, 1);
      for (let i = 1; i <= 6; i++) {
        const p = V.add(from, V.scale(dir, i * 0.5));
        spawnBurst(dim, p, "fire", 6, 0.5 + i * 0.05);
      }
      const target = V.add(from, V.scale(dir, 3));
      damageEntities(dim, target, 3, 5, player, EntityDamageCause.fire, 4);
    },
  },
  {
    id: "fire.ball",
    name: "Fireball",
    desc: "Explosive fireball projectile.",
    cooldown: 40,
    run(player) {
      broadcastSound(player.dimension, "mob.ghast.fireball", eyePos(player), 1, 1);
      projectile(player, {
        speed: 1.2, max: 60, radius: 1.2,
        onTick: (dim, pos, dir) => {
          spawnBurst(dim, pos, "fire", 6, 0.35);
          spawnTrail(dim, pos, V.scale(dir, -1), "fire", 1.2);
        },
        onHit: (dim, pos, dir, ent, caster) => {
          spawnExplosion(dim, pos, "fire", 3);
          broadcastSound(dim, "random.explode", pos, 1, 1.2);
          damageEntities(dim, pos, 4, 8, caster, EntityDamageCause.fire, 6);
        },
      });
    },
  },
  {
    id: "fire.whip",
    name: "Fire Whip",
    desc: "Long, thin whip of flame slashes ahead.",
    cooldown: 15,
    run(player) {
      const dim = player.dimension;
      const dir = lookDir(player);
      const from = eyePos(player);
      broadcastSound(dim, "mob.blaze.hit", from, 1.5, 1);
      for (let i = 1; i <= 12; i++) {
        const p = V.add(from, V.scale(dir, i * 0.6));
        spawnBurst(dim, p, "fire", 4, 0.2);
      }
      const target = V.add(from, V.scale(dir, 5));
      damageEntities(dim, target, 1.5, 6, player, EntityDamageCause.fire, 3);
    },
  },
  {
    id: "fire.shield",
    name: "Fire Shield",
    desc: "Wreath yourself in flame; damages attackers, boosts defense.",
    cooldown: 200,
    run(player) {
      const dim = player.dimension;
      broadcastSound(dim, "mob.blaze.ambient", player.location, 1, 1);
      safeRun(() => player.addEffect("resistance", 100, { amplifier: 1, showParticles: false }));
      safeRun(() => player.addEffect("fire_resistance", 200, { amplifier: 0, showParticles: false }));
      let t = 0;
      const h = system.runInterval(() => {
        if (t++ >= 20 || !player.isValid()) return system.clearRun(h);
        spawnAura(dim, player.location, "fire", 1.3, 12);
        damageEntities(dim, player.location, 2.2, 2, player, EntityDamageCause.fire, 3);
      }, 5);
    },
  },
  {
    id: "fire.lightning",
    name: "Lightning",
    desc: "Instant lightning beam of massive damage.",
    cooldown: 80,
    run(player) {
      const dim = player.dimension;
      const dir = lookDir(player);
      const from = eyePos(player);
      broadcastSound(dim, "ambient.weather.thunder", from, 1.5, 1.3);
      spawnBeam(dim, from, dir, "lightning", 30);
      let hitCount = 0;
      for (let d = 1; d <= 30; d += 1) {
        const p = V.add(from, V.scale(dir, d));
        const ents = dim.getEntities({ location: p, maxDistance: 1.5, excludeTypes: ["item"] });
        for (const e of ents) {
          if (e.id === player.id) continue;
          safeRun(() => e.applyDamage(14, { cause: EntityDamageCause.lightning, damagingEntity: player }));
          spawnExplosion(dim, e.location, "lightning", 1.5);
          hitCount++;
        }
        if (hitCount) break;
      }
    },
  },
  {
    id: "fire.combustion",
    name: "Combustion",
    desc: "Focus and detonate the air at your gaze.",
    cooldown: 100,
    run(player) {
      const dim = player.dimension;
      const dir = lookDir(player);
      const eye = eyePos(player);
      let charge = 0;
      broadcastSound(dim, "mob.wither.spawn", eye, 1.8, 0.8);
      const h = system.runInterval(() => {
        if (!player.isValid()) return system.clearRun(h);
        spawnBurst(dim, V.add(eye, V.scale(dir, 0.6)), "fire", 6, 0.2);
        charge++;
        if (charge >= 5) {
          system.clearRun(h);
          const hit = player.getEntitiesFromViewDirection({ maxDistance: 40 })[0];
          const target = hit ? hit.entity.location : V.add(eye, V.scale(dir, 20));
          spawnExplosion(dim, target, "fire", 5);
          broadcastSound(dim, "random.explode", target, 1, 0.6);
          damageEntities(dim, target, 6, 14, player, EntityDamageCause.fire, 8);
        }
      }, 4);
    },
  },
  {
    id: "fire.jet",
    name: "Jet Propulsion",
    desc: "Launch yourself along your view with fire trail.",
    cooldown: 60,
    run(player) {
      const dim = player.dimension;
      const dir = lookDir(player);
      broadcastSound(dim, "mob.ghast.charge", player.location, 1.2, 1);
      safeRun(() => player.applyImpulse({ x: dir.x * 2.5, y: dir.y * 2 + 0.4, z: dir.z * 2.5 }));
      let t = 0;
      const h = system.runInterval(() => {
        if (t++ >= 10 || !player.isValid()) return system.clearRun(h);
        spawnBurst(dim, player.location, "fire", 8, 0.4);
      }, 1);
    },
  },
  {
    id: "fire.wall",
    name: "Wall of Flame",
    desc: "Erect a wall of scorching flame in front of you.",
    cooldown: 90,
    run(player) {
      const dim = player.dimension;
      const dir = lookDir(player);
      const from = V.add(player.location, V.scale({ x: dir.x, y: 0, z: dir.z }, 2));
      const rightAxis = V.norm({ x: -dir.z, y: 0, z: dir.x });
      broadcastSound(dim, "mob.blaze.shoot", from, 0.8, 1);
      let t = 0;
      const h = system.runInterval(() => {
        if (t++ >= 12 || !player.isValid()) return system.clearRun(h);
        for (let i = -3; i <= 3; i++) {
          for (let y = 0; y < 3; y++) {
            const p = { x: from.x + rightAxis.x * i, y: from.y + y, z: from.z + rightAxis.z * i };
            spawnBurst(dim, p, "fire", 3, 0.2);
          }
        }
        damageEntities(dim, from, 4, 3, player, EntityDamageCause.fire, 4);
      }, 5);
    },
  },
];
