import { FIRE, FIRE_HIDDEN } from "./fire.js";
import { WATER } from "./water.js";
import { EARTH } from "./earth.js";
import { AIR } from "./air.js";

export const ELEMENTS = {
  fire: { name: "Firebending", abilities: FIRE, color: "§c" },
  water: { name: "Waterbending", abilities: WATER, color: "§b" },
  earth: { name: "Earthbending", abilities: EARTH, color: "§a" },
  air: { name: "Airbending", abilities: AIR, color: "§7" },
};

export const ALL = {
  ...Object.fromEntries(FIRE.map((a) => [a.id, a])),
  ...Object.fromEntries(WATER.map((a) => [a.id, a])),
  ...Object.fromEntries(EARTH.map((a) => [a.id, a])),
  ...Object.fromEntries(AIR.map((a) => [a.id, a])),
  ...FIRE_HIDDEN,
};

export function getElement(id) { return ELEMENTS[id]; }
export function getAbility(id) { return ALL[id]; }
