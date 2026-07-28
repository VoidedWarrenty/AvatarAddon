import { EntityDamageCause, system } from "@minecraft/server";
import { V, eyePos, lookDir, broadcastSound, safeRun } from "../util.js";
import { spawnBurst, spawnRing, spawnBeam, spawnExplosion, spawnAura, spawnForkedBolt, damageAlongPath } from "../fx.js";

function damageAt(dim, center, radius, damage, source, cause = EntityDamageCause.fire, ignite = 0) {
  const ents = dim.getEntities({ location: center, maxDistance: radius, excludeTypes: ["item"] });
  for (const e of ents) {
    if (e.id === source.id) continue;
    safeRun(() => e.applyDamage(damage, { cause, damagingEntity: source }));
    if (ignite > 0) safeRun(() => e.setOnFire(ignite, true));
  }
}

function tryBlockHit(dim, pos) {
  try {
    const b = dim.getBlock({ x: Math.floor(pos.x), y: Math.floor(pos.y), z: Math.floor(pos.z) });
    if (b && !b.isAir && !b.isLiquid) return true;
  } catch {}
  return false;
}

// ---------- Fire Blast (PRIMED, 3 charges) ----------
function fireBlastPrime(player) {
  broadcastSound(player.dimension, "mob.blaze.ambient", player.location, 1.5, 1.2);
  return {};
}
function fireBlastPrimeTick(player, ctx, now) {
  if (now % 4 !== 0) return;
  spawnAura(player.dimension, player.location, "fire", 0.9, 6);
}
function fireBlastAttack(player) {
  const dim = player.dimension;
  const dir = lookDir(player);
  const from = eyePos(player);
  broadcastSound(dim, "mob.blaze.shoot", from, 1.5, 1);
  let pos = { ...from };
  let ticks = 0;
  const h = system.runInterval(() => {
    for (let s = 0; s < 2; s++) {
      pos = V.add(pos, V.scale(dir, 0.6));
      spawnBurst(dim, pos, "fire", 5, 0.35);
      const near = dim.getEntities({ location: pos, maxDistance: 1.2, excludeTypes: ["item"] })
        .find((e) => e.id !== player.id);
      if (near || tryBlockHit(dim, pos) || ticks++ > 30) {
        spawnExplosion(dim, pos, "fire", 2);
        damageAt(dim, pos, 2, 5, player, EntityDamageCause.fire, 3);
        system.clearRun(h);
        return;
      }
    }
  }, 1);
}

// ---------- Fire Sweep (PRIMED, 3 charges) ----------
function fireSweepPrime(player) {
  broadcastSound(player.dimension, "mob.blaze.ambient", player.location, 2, 0.85);
  return {};
}
function fireSweepPrimeTick(player, ctx, now) {
  if (now % 5 !== 0) return;
  spawnAura(player.dimension, player.location, "ember", 1.1, 8);
}
function fireSweepAttack(player) {
  const dim = player.dimension;
  const dir = lookDir(player);
  const from = eyePos(player);
  broadcastSound(dim, "mob.blaze.shoot", from, 1.5, 0.8);
  const arcSteps = 14;
  for (let i = 0; i < arcSteps; i++) {
    const angle = ((i / (arcSteps - 1)) - 0.5) * Math.PI * 0.9;
    const cos = Math.cos(angle), sin = Math.sin(angle);
    const swept = V.norm({ x: dir.x * cos - dir.z * sin, y: dir.y, z: dir.x * sin + dir.z * cos });
    for (let d = 1; d <= 4; d++) {
      const p = V.add(from, V.scale(swept, d));
      spawnBurst(dim, p, "fire", 3, 0.2);
      damageAt(dim, p, 1.0, 3, player, EntityDamageCause.fire, 2);
    }
  }
}

// ---------- Fire Whip (INSTANT) ----------
function fireWhipRun(player) {
  const dim = player.dimension;
  const dir = lookDir(player);
  const from = eyePos(player);
  broadcastSound(dim, "mob.blaze.hit", from, 1.5, 1);
  for (let i = 1; i <= 12; i++) {
    const p = V.add(from, V.scale(dir, i * 0.6));
    spawnBurst(dim, p, "fire", 4, 0.2);
  }
  damageAt(dim, V.add(from, V.scale(dir, 5)), 1.5, 6, player, EntityDamageCause.fire, 3);
}

// ---------- Fireball (INSTANT projectile) ----------
function fireballRun(player) {
  const dim = player.dimension;
  const dir = lookDir(player);
  const from = eyePos(player);
  broadcastSound(dim, "mob.ghast.fireball", from, 1, 1);
  let pos = { ...from };
  let ticks = 0;
  const h = system.runInterval(() => {
    for (let s = 0; s < 2; s++) {
      pos = V.add(pos, V.scale(dir, 0.6));
      spawnBurst(dim, pos, "fire", 6, 0.4);
      const near = dim.getEntities({ location: pos, maxDistance: 1.3, excludeTypes: ["item"] })
        .find((e) => e.id !== player.id);
      if (near || tryBlockHit(dim, pos) || ticks++ > 40) {
        spawnExplosion(dim, pos, "fire", 3);
        broadcastSound(dim, "random.explode", pos, 1, 1.2);
        damageAt(dim, pos, 4, 8, player, EntityDamageCause.fire, 5);
        system.clearRun(h);
        return;
      }
    }
  }, 1);
}

// ---------- Fire Shield (INSTANT) ----------
function fireShieldRun(player) {
  const dim = player.dimension;
  broadcastSound(dim, "mob.blaze.ambient", player.location, 1, 1);
  safeRun(() => player.addEffect("resistance", 100, { amplifier: 1, showParticles: false }));
  safeRun(() => player.addEffect("fire_resistance", 200, { amplifier: 0, showParticles: false }));
  let t = 0;
  const h = system.runInterval(() => {
    if (t++ >= 20 || !player.isValid()) return system.clearRun(h);
    spawnAura(dim, player.location, "fire", 1.3, 12);
    damageAt(dim, player.location, 2.2, 2, player, EntityDamageCause.fire, 3);
  }, 5);
}

// ---------- Lightning (CHARGEUP, BLUE, FORKED) ----------
function lightningStartCharge(player) {
  broadcastSound(player.dimension, "mob.warden.tendril_clicks", player.location, 1.2, 0.5);
  return {};
}
function lightningUpdate(player, ticks) {
  const dim = player.dimension;
  const eye = eyePos(player);
  const dir = lookDir(player);
  const hand = V.add(eye, V.scale(dir, 0.6));
  const intensity = Math.min(ticks / 30, 1);
  const r = 0.35 + intensity * 0.9;
  const count = Math.floor(4 + intensity * 14);
  spawnAura(dim, hand, "lightning", r, count);
  if (ticks % 6 === 0) {
    broadcastSound(dim, "mob.warden.sonic_charge", hand, 1, 0.9 + intensity * 0.8);
    for (let b = 0; b < Math.floor(intensity * 3) + 1; b++) {
      const d = V.norm({ x: (Math.random() - 0.5), y: (Math.random() - 0.5), z: (Math.random() - 0.5) });
      spawnForkedBolt(dim, hand, d, "lightning", 1.5 + intensity * 2, 1);
    }
  }
}
function lightningRelease(player, ticks) {
  const dim = player.dimension;
  const dir = lookDir(player);
  const from = eyePos(player);
  const power = Math.min(ticks / 30, 1);
  const length = 22 + power * 18;
  const damage = 8 + power * 12;
  broadcastSound(dim, "ambient.weather.thunder", from, 2.5, 1.4);
  broadcastSound(dim, "mob.warden.sonic_boom", from, 1.5, 1.2);
  for (let b = 0; b < 4; b++) {
    const startDir = V.norm({
      x: dir.x + (Math.random() - 0.5) * 0.12,
      y: dir.y + (Math.random() - 0.5) * 0.12,
      z: dir.z + (Math.random() - 0.5) * 0.12,
    });
    spawnForkedBolt(dim, from, startDir, "lightning", length, 3);
  }
  damageAlongPath(dim, from, dir, length, 1.8, player, (e) => {
    safeRun(() => e.applyDamage(damage, { cause: EntityDamageCause.lightning, damagingEntity: player }));
    spawnExplosion(dim, e.location, "lightning", 1.6);
  });
}

// ---------- Combustion (CHARGEUP + ARCING PROJECTILE) ----------
function combustionStartCharge(player) {
  broadcastSound(player.dimension, "mob.wither.spawn", player.location, 1.6, 0.6);
  return {};
}
function combustionUpdate(player, ticks) {
  const dim = player.dimension;
  const eye = eyePos(player);
  const dir = lookDir(player);
  const brow = V.add(eye, V.scale(dir, 0.5));
  const intensity = Math.min(ticks / 30, 1);
  spawnAura(dim, brow, "ember", 0.25 + intensity * 0.55, 4 + Math.floor(intensity * 10));
  if (intensity > 0.5) spawnBurst(dim, brow, "fire", 3, 0.2);
  if (ticks % 10 === 0) broadcastSound(dim, "mob.blaze.breathe", brow, 1.5, 1.2 + intensity * 0.4);
}
function combustionRelease(player, ticks) {
  const dim = player.dimension;
  const eye = eyePos(player);
  let pos = { ...eye };
  let dir = lookDir(player);
  const speed = 0.45;
  const power = Math.max(0.4, Math.min(ticks / 30, 1));
  const maxLife = 120;
  let life = 0;
  broadcastSound(dim, "mob.wither.shoot", pos, 1.5, 0.7);
  const h = system.runInterval(() => {
    if (!player.isValid()) return system.clearRun(h);
    const gaze = lookDir(player);
    dir = V.norm({
      x: dir.x * 0.93 + gaze.x * 0.07,
      y: dir.y * 0.93 + gaze.y * 0.07,
      z: dir.z * 0.93 + gaze.z * 0.07,
    });
    pos = V.add(pos, V.scale(dir, speed));
    spawnBurst(dim, pos, "ember", 5, 0.3);
    spawnBurst(dim, V.add(pos, V.scale(dir, -0.35)), "fire", 3, 0.2);
    const near = dim.getEntities({ location: pos, maxDistance: 1.7, excludeTypes: ["item"] })
      .find((e) => e.id !== player.id);
    if (near || tryBlockHit(dim, pos) || life++ > maxLife) {
      spawnExplosion(dim, pos, "ember", 4 + power * 2);
      broadcastSound(dim, "random.explode", pos, 1.5, 0.5);
      damageAt(dim, pos, 5 + power * 2, 10 + power * 8, player, EntityDamageCause.fire, 8);
      system.clearRun(h);
    }
  }, 1);
}

// ---------- Jet Propulsion (INSTANT) ----------
function jetRun(player) {
  const dim = player.dimension;
  const dir = lookDir(player);
  broadcastSound(dim, "mob.ghast.charge", player.location, 1.2, 1);
  safeRun(() => player.applyImpulse({ x: dir.x * 2.5, y: dir.y * 2 + 0.4, z: dir.z * 2.5 }));
  let t = 0;
  const h = system.runInterval(() => {
    if (t++ >= 10 || !player.isValid()) return system.clearRun(h);
    spawnBurst(dim, player.location, "fire", 8, 0.4);
  }, 1);
}

// ---------- Wall of Flame (INSTANT) ----------
function wallRun(player) {
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
    damageAt(dim, from, 4, 3, player, EntityDamageCause.fire, 4);
  }, 5);
}

// ---------- COMBO: Fire Arc ----------
export function fireArcCombo(player) {
  const dim = player.dimension;
  const dir = lookDir(player);
  const from = eyePos(player);
  broadcastSound(dim, "mob.blaze.shoot", from, 2, 0.6);
  broadcastSound(dim, "random.explode", from, 1.5, 1.2);
  const arcSteps = 26;
  for (let i = 0; i < arcSteps; i++) {
    const angle = ((i / (arcSteps - 1)) - 0.5) * Math.PI * 1.3;
    const cos = Math.cos(angle), sin = Math.sin(angle);
    const swept = V.norm({ x: dir.x * cos - dir.z * sin, y: dir.y, z: dir.x * sin + dir.z * cos });
    for (let d = 1; d <= 9; d++) {
      const p = V.add(from, V.scale(swept, d));
      spawnBurst(dim, p, "fire", 4, 0.3);
      damageAt(dim, p, 1.3, 5, player, EntityDamageCause.fire, 5);
    }
  }
}

// ---------- COMBO: Wheel of Fire ----------
export function wheelOfFireCombo(player) {
  const dim = player.dimension;
  const flat = V.norm({ x: lookDir(player).x, y: 0, z: lookDir(player).z });
  const right = V.norm({ x: -flat.z, y: 0, z: flat.x });
  const up = { x: 0, y: 1, z: 0 };
  broadcastSound(dim, "mob.blaze.ambient", player.location, 2, 0.5);
  broadcastSound(dim, "random.explode", player.location, 1.5, 0.4);
  let pos = V.add(player.location, V.scale(flat, 1.5));
  const speed = 0.5;
  let life = 0;
  const maxLife = 80;
  const h = system.runInterval(() => {
    if (life++ > maxLife) return system.clearRun(h);
    pos = V.add(pos, V.scale(flat, speed));
    for (let a = 0; a < 28; a++) {
      const t = (a / 28) * Math.PI * 2;
      const p = V.add(pos, V.add(V.scale(right, Math.cos(t) * 1.3), V.scale(up, Math.sin(t) * 1.3 + 1)));
      spawnBurst(dim, p, "fire", 2, 0.15);
    }
    damageAt(dim, V.add(pos, { x: 0, y: 1, z: 0 }), 1.7, 5, player, EntityDamageCause.fire, 5);
  }, 1);
}

export const FIRE_HIDDEN = {
  "fire.arc": {
    id: "fire.arc",
    name: "Fire Arc",
    desc: "COMBO — released by attack.",
    mode: "primed",
    charges: 1,
    primeTicks: 200,
    cooldown: 0,
    onPrime: () => ({}),
    onPrimeTick: (player, _c, now) => {
      if (now % 4 === 0) spawnAura(player.dimension, player.location, "ember", 1.4, 10);
    },
    onPrimeAttack: (player) => fireArcCombo(player),
  },
};

export const FIRE = [
  {
    id: "fire.blast",
    name: "Fire Blast",
    desc: "Prime, then attack up to 3 times to hurl a fire blast.",
    mode: "primed",
    charges: 3,
    primeTicks: 200,
    cooldown: 120,
    onPrime: fireBlastPrime,
    onPrimeTick: fireBlastPrimeTick,
    onPrimeAttack: fireBlastAttack,
  },
  {
    id: "fire.sweep",
    name: "Fire Sweep",
    desc: "Prime, then attack up to 3 times to sweep an arc of flame.",
    mode: "primed",
    charges: 3,
    primeTicks: 200,
    cooldown: 140,
    onPrime: fireSweepPrime,
    onPrimeTick: fireSweepPrimeTick,
    onPrimeAttack: fireSweepAttack,
  },
  {
    id: "fire.whip",
    name: "Fire Whip",
    desc: "Long, thin whip of flame slashes ahead.",
    mode: "instant",
    cooldown: 15,
    run: fireWhipRun,
  },
  {
    id: "fire.ball",
    name: "Fireball",
    desc: "Explosive fireball projectile.",
    mode: "instant",
    cooldown: 40,
    run: fireballRun,
  },
  {
    id: "fire.shield",
    name: "Fire Shield",
    desc: "Wreath yourself in flame; damages attackers, boosts defense.",
    mode: "instant",
    cooldown: 200,
    run: fireShieldRun,
  },
  {
    id: "fire.lightning",
    name: "Lightning",
    desc: "Hold sneak to charge blue forked lightning; release to fire.",
    mode: "chargeup",
    chargeMax: 30,
    cooldown: 120,
    startCharge: lightningStartCharge,
    updateCharge: lightningUpdate,
    release: lightningRelease,
  },
  {
    id: "fire.combustion",
    name: "Combustion",
    desc: "Hold sneak to charge; release a slow arcing detonation that follows your gaze.",
    mode: "chargeup",
    chargeMax: 30,
    cooldown: 140,
    startCharge: combustionStartCharge,
    updateCharge: combustionUpdate,
    release: combustionRelease,
  },
  {
    id: "fire.jet",
    name: "Jet Propulsion",
    desc: "Launch yourself along your view with a fire trail.",
    mode: "instant",
    cooldown: 60,
    run: jetRun,
  },
  {
    id: "fire.wall",
    name: "Wall of Flame",
    desc: "Erect a wall of scorching flame in front of you.",
    mode: "instant",
    cooldown: 90,
    run: wallRun,
  },
];
