import { world, system } from "@minecraft/server";
import { loadState, getActivePreset } from "./state.js";
import { getAbility } from "./abilities/index.js";
import { openMain } from "./ui.js";
import { msg, safeRun } from "./util.js";

const perPlayer = new Map();

function ctxOf(player) {
  let c = perPlayer.get(player.id);
  if (!c) {
    c = {
      lastSneak: false,
      sneakStartSlot: player.selectedSlotIndex,
      lastSlot: player.selectedSlotIndex,
      cooldowns: new Map(),
      recentSneakToggles: [],
    };
    perPlayer.set(player.id, c);
  }
  return c;
}

function tryFire(player, slot) {
  const st = loadState(player);
  if (!st.element) {
    msg(player, "§cNo element chosen — chat §f.a§c to open the menu.");
    return false;
  }
  const preset = getActivePreset(st);
  const abId = preset[slot];
  if (!abId) return false;
  const ab = getAbility(abId);
  if (!ab) return false;
  const ctx = ctxOf(player);
  const now = system.currentTick;
  const readyAt = ctx.cooldowns.get(abId) || 0;
  if (now < readyAt) {
    const left = ((readyAt - now) / 20).toFixed(1);
    msg(player, `§7${ab.name} §8— §c${left}s cd`);
    return false;
  }
  ctx.cooldowns.set(abId, now + ab.cooldown);
  msg(player, `§e${ab.name}`);
  safeRun(() => ab.run(player));
  return true;
}

export function startInputLoop() {
  system.runInterval(() => {
    for (const player of world.getPlayers()) {
      const ctx = ctxOf(player);
      const sneak = player.isSneaking;
      const slot = player.selectedSlotIndex;

      if (sneak && !ctx.lastSneak) {
        ctx.sneakStartSlot = slot;
        ctx.lastSlot = slot;
        const now = Date.now();
        ctx.recentSneakToggles.push(now);
        while (ctx.recentSneakToggles.length && now - ctx.recentSneakToggles[0] > 900) {
          ctx.recentSneakToggles.shift();
        }
        if (ctx.recentSneakToggles.length >= 3) {
          ctx.recentSneakToggles.length = 0;
          safeRun(() => openMain(player));
        }
        ctx.lastSneak = sneak;
        continue;
      }

      if (sneak && slot !== ctx.lastSlot) {
        tryFire(player, slot);
        const restore = ctx.sneakStartSlot;
        ctx.lastSlot = restore;
        system.run(() => { safeRun(() => { player.selectedSlotIndex = restore; }); });
      } else {
        ctx.lastSlot = slot;
      }
      ctx.lastSneak = sneak;
    }
  }, 1);
}

export function forgetPlayer(id) { perPlayer.delete(id); }
