import { world, system } from "@minecraft/server";
import { openMain } from "./ui.js";
import { startInputLoop, forgetPlayer } from "./input.js";
import { loadState, saveState } from "./state.js";
import { tickTempBlocks } from "./abilities/earth.js";
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

world.afterEvents.playerSpawn.subscribe((ev) => {
  if (!ev.initialSpawn) return;
  const p = ev.player;
  system.runTimeout(() => {
    msg(p, "§6Avatar loaded — triple-tap Sneak or run §f/scriptevent avatar:menu§6.");
  }, 40);
});

world.afterEvents.playerLeave.subscribe((ev) => {
  forgetPlayer(ev.playerId);
});

startInputLoop();

system.runInterval(() => {
  tickTempBlocks();
}, 20);
