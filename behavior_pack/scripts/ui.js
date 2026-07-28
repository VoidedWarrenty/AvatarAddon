import { ActionFormData, ModalFormData, MessageFormData } from "@minecraft/server-ui";
import { loadState, saveState, setBinding } from "./state.js";
import { ELEMENTS, getElement, getAbility } from "./abilities/index.js";
import { msg } from "./util.js";

const SLOT_LABEL = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

export function openMain(player) {
  const st = loadState(player);
  const el = st.element ? getElement(st.element) : null;
  const elemLine = el ? `${el.color}${el.name}§r` : "§8§oNone selected§r";
  const presetName = st.presetNames[st.activePreset];
  const body = [
    `§lElement:§r ${elemLine}`,
    `§lActive Preset:§r §e${presetName}§r  §8(${st.activePreset + 1}/3)`,
    "",
    "§oHold sneak, then press hotbar slot 1-9 to unleash a bound ability.§r",
  ].join("\n");
  const form = new ActionFormData()
    .title("§l§6Avatar: The Last Airbender§r")
    .body(body)
    .button("§6Choose Element")
    .button("§eBind Abilities")
    .button("§bSwitch Preset")
    .button("§dRename Preset")
    .button("§7How To Use")
    .button("§cClose");
  form.show(player).then((r) => {
    if (r.canceled) return;
    switch (r.selection) {
      case 0: openElement(player); break;
      case 1: if (!st.element) { msg(player, "§cPick an element first."); openElement(player); } else openBindList(player); break;
      case 2: openPreset(player); break;
      case 3: openRename(player); break;
      case 4: openHelp(player); break;
      default: break;
    }
  }).catch(() => {});
}

function openElement(player) {
  const st = loadState(player);
  const form = new ActionFormData()
    .title("§l§6Choose Your Element§r")
    .body("Pick a bending discipline. Switching resets no bindings — each preset stays where you left it.");
  const order = ["fire", "water", "earth", "air"];
  for (const id of order) {
    const e = ELEMENTS[id];
    const marker = st.element === id ? "§a✔ " : "";
    form.button(`${marker}${e.color}${e.name}§r`);
  }
  form.button("§7‹ Back");
  form.show(player).then((r) => {
    if (r.canceled) return;
    if (r.selection === 4) return openMain(player);
    const chosen = order[r.selection];
    st.element = chosen;
    saveState(player, st);
    msg(player, `§aElement set to ${ELEMENTS[chosen].color}${ELEMENTS[chosen].name}§r`);
    openMain(player);
  }).catch(() => {});
}

function openBindList(player) {
  const st = loadState(player);
  const preset = st.presets[st.activePreset];
  const form = new ActionFormData()
    .title(`§l§eBind Abilities§r §8[${st.presetNames[st.activePreset]}]`)
    .body("Pick a hotbar slot to bind. Empty slots do nothing when triggered.");
  for (let i = 0; i < 9; i++) {
    const abId = preset[i];
    const ab = abId ? getAbility(abId) : null;
    const label = ab ? `§eSlot ${SLOT_LABEL[i]}:§r §f${ab.name}§r` : `§7Slot ${SLOT_LABEL[i]}:§r §8(empty)§r`;
    form.button(label);
  }
  form.button("§c Clear All ");
  form.button("§7‹ Back");
  form.show(player).then((r) => {
    if (r.canceled) return;
    if (r.selection === 9) {
      st.presets[st.activePreset] = new Array(9).fill(null);
      saveState(player, st);
      msg(player, "§aPreset cleared.");
      return openBindList(player);
    }
    if (r.selection === 10) return openMain(player);
    openBindSlot(player, r.selection);
  }).catch(() => {});
}

function openBindSlot(player, slot) {
  const st = loadState(player);
  const el = getElement(st.element);
  if (!el) return openMain(player);
  const form = new ActionFormData()
    .title(`§l§eSlot ${SLOT_LABEL[slot]}§r — ${el.color}${el.name}§r`)
    .body(`Select an ability for §eslot ${SLOT_LABEL[slot]}§r.\nCurrent: §f${(() => { const a = getAbility(st.presets[st.activePreset][slot]); return a ? a.name : "§8(empty)§r"; })()}§r`);
  form.button("§8Clear Binding");
  for (const ab of el.abilities) {
    form.button(`§f${ab.name}§r\n§7${ab.desc}§r`);
  }
  form.button("§7‹ Back");
  form.show(player).then((r) => {
    if (r.canceled) return;
    if (r.selection === 0) {
      setBinding(st, slot, null);
      saveState(player, st);
      msg(player, `§aSlot ${SLOT_LABEL[slot]} cleared.`);
      return openBindList(player);
    }
    if (r.selection === el.abilities.length + 1) return openBindList(player);
    const chosen = el.abilities[r.selection - 1];
    setBinding(st, slot, chosen.id);
    saveState(player, st);
    msg(player, `§aSlot ${SLOT_LABEL[slot]}: §f${chosen.name}`);
    openBindList(player);
  }).catch(() => {});
}

function openPreset(player) {
  const st = loadState(player);
  const form = new ActionFormData()
    .title("§l§bSwitch Preset§r")
    .body("Active preset determines which bindings fire when you crouch + hotbar.");
  for (let i = 0; i < 3; i++) {
    const active = st.activePreset === i ? "§a✔ " : "";
    const filled = st.presets[i].filter(Boolean).length;
    form.button(`${active}§e${st.presetNames[i]}§r\n§7${filled}/9 bound§r`);
  }
  form.button("§7‹ Back");
  form.show(player).then((r) => {
    if (r.canceled) return;
    if (r.selection === 3) return openMain(player);
    st.activePreset = r.selection;
    saveState(player, st);
    msg(player, `§aActive preset: §e${st.presetNames[r.selection]}`);
    openMain(player);
  }).catch(() => {});
}

function openRename(player) {
  const st = loadState(player);
  const form = new ModalFormData()
    .title("§l§dRename Presets§r")
    .textField(`Preset 1 (currently: ${st.presetNames[0]})`, "Preset A")
    .textField(`Preset 2 (currently: ${st.presetNames[1]})`, "Preset B")
    .textField(`Preset 3 (currently: ${st.presetNames[2]})`, "Preset C");
  form.show(player).then((r) => {
    if (r.canceled) return;
    st.presetNames = r.formValues.map((v, i) => (String(v).trim() || st.presetNames[i] || `Preset ${String.fromCharCode(65 + i)}`));
    saveState(player, st);
    msg(player, "§aPreset names updated.");
    openMain(player);
  }).catch(() => {});
}

function openHelp(player) {
  const form = new MessageFormData()
    .title("§l§7How To Use§r")
    .body(
      "§l§6AVATAR ADDON§r\n\n" +
      "§eOpening this menu:§r  chat §f!avatar§r or §f.a§r\n" +
      "§eActivate an ability:§r  §fHold Sneak §7then press §f1-9§7 on your hotbar.§r\n" +
      "  When you release sneak, your original slot is restored.\n\n" +
      "§eQuick preset switch:§r chat §f.p1§r  §f.p2§r  §f.p3§r\n" +
      "§eClose menus:§r use ESC / back arrow.\n\n" +
      "§7Tip: you can bind different loadouts to each preset —\n" +
      "§7e.g. one for combat, one for mobility, one for utility.§r"
    )
    .button1("§aGot it")
    .button2("§7Back");
  form.show(player).then((r) => {
    if (r.canceled) return;
    if (r.selection === 1) openMain(player);
  }).catch(() => {});
}
