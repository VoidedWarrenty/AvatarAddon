import { system } from "@minecraft/server";
import { getAbility } from "./abilities/index.js";
import { msg, safeRun } from "./util.js";

const primed = new Map();

export function addPrimed(player, entry) {
  const arr = primed.get(player.id) || [];
  arr.push(entry);
  primed.set(player.id, arr);
}

export function tickPrimed(player) {
  const arr = primed.get(player.id);
  if (!arr) return;
  const now = system.currentTick;
  for (let i = arr.length - 1; i >= 0; i--) {
    const e = arr[i];
    const ab = getAbility(e.abilityId);
    if (!ab || now >= e.expiresTick || e.chargesLeft <= 0) {
      safeRun(() => ab && ab.onPrimeEnd && ab.onPrimeEnd(player, e.ctx));
      arr.splice(i, 1);
      continue;
    }
    safeRun(() => ab.onPrimeTick && ab.onPrimeTick(player, e.ctx, now));
  }
  if (arr.length === 0) primed.delete(player.id);
}

export function consumePrimedForAttack(player) {
  const arr = primed.get(player.id);
  if (!arr || !arr.length) return false;
  const e = arr[arr.length - 1];
  const ab = getAbility(e.abilityId);
  if (!ab || !ab.onPrimeAttack) return false;
  e.chargesLeft--;
  safeRun(() => ab.onPrimeAttack(player, e.ctx));
  msg(player, `§e${ab.name} §7· ${Math.max(0, e.chargesLeft)} left`);
  if (e.chargesLeft <= 0) {
    safeRun(() => ab.onPrimeEnd && ab.onPrimeEnd(player, e.ctx));
    arr.pop();
    if (!arr.length) primed.delete(player.id);
  }
  return true;
}

export function hasPrimed(playerId, abilityId) {
  const arr = primed.get(playerId);
  return !!(arr && arr.some((e) => e.abilityId === abilityId));
}

export function primedCharges(playerId, abilityId) {
  const arr = primed.get(playerId);
  if (!arr) return 0;
  const e = arr.find((x) => x.abilityId === abilityId);
  return e ? e.chargesLeft : 0;
}

export function swapPrimed(playerId, fromId, toId) {
  const arr = primed.get(playerId);
  if (!arr) return 0;
  for (let i = 0; i < arr.length; i++) {
    if (arr[i].abilityId === fromId) {
      const charges = arr[i].chargesLeft;
      arr[i] = { abilityId: toId, chargesLeft: charges, expiresTick: system.currentTick + 200, ctx: {} };
      return charges;
    }
  }
  return 0;
}

export function clearPrimed(playerId) { primed.delete(playerId); }
export function forgetPrimed(playerId) { primed.delete(playerId); }
