import { world, system } from "@minecraft/server";
import { openMain } from "./ui.js";
import { startInputLoop, forgetPlayer } from "./input.js";
import { loadState, saveState } from "./state.js";
import { tickTempBlocks } from "./abilities/earth.js";
import { msg } from "./util.js";

const CHAT_COMMANDS = new Set([
  "!avatar", ".avatar", ".a", "!a",
  ".menu", "!menu",
  ".help", "!help",
  ".p1", ".p2", ".p3",
]);

world.beforeEvents.chatSend.subscribe((ev) => {
  const raw = ev.message.trim();
  const cmd = raw.toLowerCase();
  if (!CHAT_COMMANDS.has(cmd)) return;
  ev.cancel = true;
  const player = ev.sender;
  system.run(() => {
    if (cmd === ".p1" || cmd === ".p2" || cmd === ".p3") {
      const idx = parseInt(cmd.slice(2), 10) - 1;
      const st = loadState(player);
      st.activePreset = idx;
      saveState(player, st);
      msg(player, `§aActive preset: §e${st.presetNames[idx]}`);
      return;
    }
    openMain(player);
  });
});

world.afterEvents.playerSpawn.subscribe((ev) => {
  if (!ev.initialSpawn) return;
  const p = ev.player;
  system.runTimeout(() => {
    msg(p, "§6Avatar loaded — chat §f.a§6 to open the bending menu.");
  }, 40);
});

world.afterEvents.playerLeave.subscribe((ev) => {
  forgetPlayer(ev.playerId);
});

startInputLoop();

system.runInterval(() => {
  tickTempBlocks();
}, 20);
