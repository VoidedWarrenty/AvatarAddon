import { system } from "@minecraft/server";
import { swapPrimed, clearPrimed, hasPrimed } from "./charges.js";
import { msg, safeRun } from "./util.js";
import { wheelOfFireCombo } from "./abilities/fire.js";

const history = new Map();
const WINDOW_TICKS = 100;
const MAX_LEN = 8;
const RECENT_CAST_TICKS = 60;

export function recordActivation(player, abilityId) {
  const arr = history.get(player.id) || [];
  const now = system.currentTick;
  arr.push({ id: abilityId, tick: now });
  while (arr.length && now - arr[0].tick > WINDOW_TICKS) arr.shift();
  while (arr.length > MAX_LEN) arr.shift();
  history.set(player.id, arr);
}

function tail(arr, ids, withinTicks) {
  if (arr.length < ids.length) return false;
  const w = arr.slice(-ids.length);
  for (let i = 0; i < ids.length; i++) if (w[i].id !== ids[i]) return false;
  return w[w.length - 1].tick - w[0].tick <= withinTicks;
}

export function tryCombo(player, justActivated) {
  const arr = history.get(player.id) || [];
  const now = system.currentTick;

  if (tail(arr, ["fire.sweep", "fire.ball", "fire.sweep"], WINDOW_TICKS)) {
    history.set(player.id, []);
    clearPrimed(player.id);
    msg(player, "§6§lCOMBO — Wheel of Fire!");
    safeRun(() => wheelOfFireCombo(player));
    return true;
  }

  if (justActivated === "fire.whip") {
    const charges = swapPrimed(player.id, "fire.blast", "fire.arc");
    if (charges > 0) {
      msg(player, `§6§lCOMBO — Fire Arc primed §7(${charges} attack${charges === 1 ? "" : "s"})`);
      return true;
    }
  }
  if (justActivated === "fire.blast") {
    const recentWhip = arr.some((e) => e.id === "fire.whip" && now - e.tick <= RECENT_CAST_TICKS);
    if (recentWhip) {
      const charges = swapPrimed(player.id, "fire.blast", "fire.arc");
      if (charges > 0) {
        msg(player, `§6§lCOMBO — Fire Arc primed §7(${charges} attack${charges === 1 ? "" : "s"})`);
        return true;
      }
    }
  }
  return false;
}

export function forgetCombo(playerId) { history.delete(playerId); }
