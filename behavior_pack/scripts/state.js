const KEY = "avatar:state";

const DEFAULT_PRESET_NAMES = ["Preset A", "Preset B", "Preset C"];

function emptyPreset() {
  return new Array(9).fill(null);
}

function defaultState() {
  return {
    element: null,
    activePreset: 0,
    presetNames: [...DEFAULT_PRESET_NAMES],
    presets: [emptyPreset(), emptyPreset(), emptyPreset()],
  };
}

export function loadState(player) {
  try {
    const raw = player.getDynamicProperty(KEY);
    if (typeof raw === "string" && raw.length) {
      const parsed = JSON.parse(raw);
      return normalizeState(parsed);
    }
  } catch {}
  return defaultState();
}

function normalizeState(s) {
  const d = defaultState();
  if (!s || typeof s !== "object") return d;
  d.element = typeof s.element === "string" ? s.element : null;
  d.activePreset = Math.max(0, Math.min(2, s.activePreset | 0));
  if (Array.isArray(s.presetNames) && s.presetNames.length === 3) d.presetNames = s.presetNames.map(String);
  if (Array.isArray(s.presets) && s.presets.length === 3) {
    d.presets = s.presets.map((p) => {
      if (!Array.isArray(p)) return emptyPreset();
      const out = emptyPreset();
      for (let i = 0; i < 9; i++) out[i] = (typeof p[i] === "string" && p[i]) ? p[i] : null;
      return out;
    });
  }
  return d;
}

export function saveState(player, state) {
  try {
    player.setDynamicProperty(KEY, JSON.stringify(state));
  } catch {}
}

export function getActivePreset(state) {
  return state.presets[state.activePreset];
}

export function setBinding(state, slot, abilityId) {
  if (slot < 0 || slot > 8) return;
  state.presets[state.activePreset][slot] = abilityId || null;
}
