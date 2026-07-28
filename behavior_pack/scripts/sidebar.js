import { world, DisplaySlotId, system } from "@minecraft/server";
import { loadState } from "./state.js";
import { getElement, getAbility } from "./abilities/index.js";
import { safeRun } from "./util.js";

const OBJ_ID = "avatar_hud";
let objective;
let lastSig = "";

function ensureObjective() {
  if (objective) {
    try { if (objective.isValid()) return objective; } catch {}
    objective = undefined;
  }
  try { objective = world.scoreboard.getObjective(OBJ_ID); } catch {}
  if (!objective) {
    try { objective = world.scoreboard.addObjective(OBJ_ID, "§6§lAVATAR"); } catch {}
  }
  if (objective) {
    try { world.scoreboard.setObjectiveAtDisplaySlot(DisplaySlotId.Sidebar, { objective }); } catch {}
  }
  return objective;
}

function clearAll(obj) {
  let parts = [];
  try { parts = obj.getParticipants(); } catch {}
  for (const p of parts) {
    try { obj.removeParticipant(p); } catch {}
  }
}

function pad(line, i) {
  return `${line}§r${"§0".repeat(i)}`;
}

export function renderSidebar() {
  const players = world.getPlayers();
  if (!players.length) return;
  const player = players[0];
  const obj = ensureObjective();
  if (!obj) return;
  const st = loadState(player);
  const el = st.element ? getElement(st.element) : null;
  const preset = st.presets[st.activePreset];

  const lines = [];
  lines.push(el ? `${el.color}${el.name}` : "§8No element");
  lines.push(`§7Preset: §e${st.presetNames[st.activePreset]}`);
  lines.push("§8——————————");
  for (let i = 0; i < 9; i++) {
    const abId = preset[i];
    const ab = abId ? getAbility(abId) : null;
    const label = ab ? `§f${ab.name}` : "§8—";
    lines.push(`§e${i + 1} §7▸ ${label}`);
  }

  const padded = lines.map((l, i) => pad(l, i));
  const sig = padded.join("|") + "@" + player.id;
  if (sig === lastSig) return;
  lastSig = sig;

  safeRun(() => clearAll(obj));
  for (let i = 0; i < padded.length; i++) {
    try { obj.setScore(padded[i], padded.length - i); } catch {}
  }
}

export function startSidebarLoop() {
  system.runInterval(() => safeRun(renderSidebar), 10);
}

export function bustSidebarCache() { lastSig = ""; }
