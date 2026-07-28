import { world, system } from "@minecraft/server";
import { loadState, getActivePreset } from "./state.js";
import { getAbility } from "./abilities/index.js";
import { msg, safeRun } from "./util.js";
import { recordActivation, tryCombo, forgetCombo } from "./combos.js";
import { addPrimed, tickPrimed, consumePrimedForAttack, forgetPrimed } from "./charges.js";

const perPlayer = new Map();

function ctxOf(player) {
  let c = perPlayer.get(player.id);
  if (!c) {
    c = {
      lastSneak: false,
      cooldowns: new Map(),
      charging: null,
    };
    perPlayer.set(player.id, c);
  }
  return c;
}

function abilityAt(player, slot) {
  const st = loadState(player);
  if (!st.element) return null;
  return getAbility(getActivePreset(st)[slot]);
}

function isReady(player, id) {
  return system.currentTick >= (ctxOf(player).cooldowns.get(id) || 0);
}

function setCd(player, id, ticks) {
  ctxOf(player).cooldowns.set(id, system.currentTick + ticks);
}

function fireInstant(player, ab) {
  msg(player, `§e${ab.name}`);
  safeRun(() => ab.run(player));
  setCd(player, ab.id, ab.cooldown || 20);
  recordActivation(player, ab.id);
  tryCombo(player, ab.id);
}

function primeAbility(player, ab) {
  const primedCtx = safeRun(() => ab.onPrime && ab.onPrime(player)) || {};
  addPrimed(player, {
    abilityId: ab.id,
    chargesLeft: ab.charges ?? 3,
    expiresTick: system.currentTick + (ab.primeTicks ?? 200),
    ctx: primedCtx,
  });
  msg(player, `§ePrimed §f${ab.name}§7 · ${ab.charges ?? 3} charges — attack to use`);
  setCd(player, ab.id, ab.cooldown || 100);
  recordActivation(player, ab.id);
  tryCombo(player, ab.id);
}

function startCharge(player, ab) {
  const startCtx = safeRun(() => ab.startCharge && ab.startCharge(player)) || {};
  ctxOf(player).charging = { abilityId: ab.id, startTick: system.currentTick, ctx: startCtx };
  msg(player, `§7Charging §e${ab.name}§7...`);
}

function releaseCharge(player) {
  const ctx = ctxOf(player);
  if (!ctx.charging) return;
  const ch = ctx.charging;
  ctx.charging = null;
  const ab = getAbility(ch.abilityId);
  if (!ab) return;
  const ticks = system.currentTick - ch.startTick;
  msg(player, `§e${ab.name}`);
  safeRun(() => ab.release && ab.release(player, ticks, ch.ctx));
  setCd(player, ab.id, ab.cooldown || 60);
  recordActivation(player, ab.id);
  tryCombo(player, ab.id);
}

function onSneakDown(player) {
  const ctx = ctxOf(player);
  if (ctx.charging) return;
  const ab = abilityAt(player, player.selectedSlotIndex);
  if (!ab) return;
  if (!isReady(player, ab.id)) {
    const left = ((ctx.cooldowns.get(ab.id) - system.currentTick) / 20).toFixed(1);
    msg(player, `§7${ab.name} §8· §c${left}s cd`);
    return;
  }
  const mode = ab.mode || "instant";
  if (mode === "instant") fireInstant(player, ab);
  else if (mode === "chargeup") startCharge(player, ab);
  else if (mode === "primed") primeAbility(player, ab);
}

export function startInputLoop() {
  system.runInterval(() => {
    for (const player of world.getPlayers()) {
      const ctx = ctxOf(player);
      const sneak = player.isSneaking;

      if (ctx.charging) {
        const ab = getAbility(ctx.charging.abilityId);
        const t = system.currentTick - ctx.charging.startTick;
        if (ab && ab.updateCharge) safeRun(() => ab.updateCharge(player, t, ctx.charging.ctx));
        if (!sneak) releaseCharge(player);
        else if (ab && ab.chargeMax && t >= ab.chargeMax) releaseCharge(player);
      }

      tickPrimed(player);

      if (sneak && !ctx.lastSneak) onSneakDown(player);
      ctx.lastSneak = sneak;
    }
  }, 1);
}

export function onPlayerAttack(player) {
  consumePrimedForAttack(player);
}

export function forgetPlayer(id) {
  perPlayer.delete(id);
  forgetPrimed(id);
  forgetCombo(id);
}
