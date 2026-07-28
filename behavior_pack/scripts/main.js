import { world, system, ItemStack } from "@minecraft/server";
import { openMain } from "./ui.js";
import { startInputLoop, forgetPlayer, onPlayerAttack } from "./input.js";
import { loadState, saveState } from "./state.js";
import { tickTempBlocks } from "./abilities/earth.js";
import { startSidebarLoop, bustSidebarCache } from "./sidebar.js";
import { msg, safeRun } from "./util.js";

const CHAT_COMMANDS = new Set([
  "!avatar", ".avatar", ".a", "!a",
  ".menu", "!menu",
  ".help", "!help",
  ".p1", ".p2", ".p3",
]);

function handleCommand(player, cmd) {
  if (cmd === ".p1" || cmd === ".p2" || cmd === ".p3") {
    const idx = parseInt(cmd.slice(2), 10) - 1;
    const st = loadState(player);
    st.activePreset = idx;
    saveState(player, st);
    bustSidebarCache();
    msg(player, `§aActive preset: §e${st.presetNames[idx]}`);
    return;
  }
  openMain(player);
}

const beforeChat = world.beforeEvents && world.beforeEvents.chatSend;
if (beforeChat && typeof beforeChat.subscribe === "function") {
  beforeChat.subscribe((ev) => {
    const cmd = ev.message.trim().toLowerCase();
    if (!CHAT_COMMANDS.has(cmd)) return;
    ev.cancel = true;
    const player = ev.sender;
    system.run(() => safeRun(() => handleCommand(player, cmd)));
  });
} else if (world.afterEvents && world.afterEvents.chatSend) {
  world.afterEvents.chatSend.subscribe((ev) => {
    const cmd = ev.message.trim().toLowerCase();
    if (!CHAT_COMMANDS.has(cmd)) return;
    const player = ev.sender;
    system.run(() => safeRun(() => handleCommand(player, cmd)));
  });
}

system.afterEvents.scriptEventReceive.subscribe((ev) => {
  if (!ev.id.startsWith("avatar:")) return;
  const player = ev.sourceEntity;
  if (!player || player.typeId !== "minecraft:player") return;
  const sub = ev.id.slice("avatar:".length);
  const cmd = sub === "menu" || sub === "a" ? ".a"
    : sub === "p1" || sub === "p2" || sub === "p3" ? `.${sub}`
    : null;
  if (!cmd) return;
  system.run(() => safeRun(() => handleCommand(player, cmd)));
});

if (world.afterEvents.entityHitEntity) {
  world.afterEvents.entityHitEntity.subscribe((ev) => {
    const p = ev.damagingEntity;
    if (!p || p.typeId !== "minecraft:player") return;
    safeRun(() => onPlayerAttack(p));
  });
}
if (world.afterEvents.entityHitBlock) {
  world.afterEvents.entityHitBlock.subscribe((ev) => {
    const p = ev.damagingEntity;
    if (!p || p.typeId !== "minecraft:player") return;
    safeRun(() => onPlayerAttack(p));
  });
}

if (world.afterEvents.itemUse) {
  world.afterEvents.itemUse.subscribe((ev) => {
    if (ev.itemStack && ev.itemStack.typeId === "avatar:scroll") {
      const p = ev.source;
      if (!p || p.typeId !== "minecraft:player") return;
      system.run(() => safeRun(() => openMain(p)));
    }
  });
}

function giveScrollIfMissing(player) {
  const invComp = safeRun(() => player.getComponent("minecraft:inventory"));
  if (!invComp) return;
  const cont = invComp.container;
  if (!cont) return;
  for (let i = 0; i < cont.size; i++) {
    const it = safeRun(() => cont.getItem(i));
    if (it && it.typeId === "avatar:scroll") return;
  }
  const stack = safeRun(() => new ItemStack("avatar:scroll", 1));
  if (stack) safeRun(() => cont.addItem(stack));
}

world.afterEvents.playerSpawn.subscribe((ev) => {
  const p = ev.player;
  if (ev.initialSpawn) {
    system.runTimeout(() => {
      msg(p, "§6Avatar loaded — §fright-click your Avatar Scroll§6 to open the menu.");
    }, 40);
  }
  system.runTimeout(() => safeRun(() => giveScrollIfMissing(p)), 20);
  bustSidebarCache();
});

world.afterEvents.playerLeave.subscribe((ev) => {
  forgetPlayer(ev.playerId);
});

startInputLoop();
startSidebarLoop();

system.runInterval(() => {
  tickTempBlocks();
}, 20);
