# Avatar: The Last Airbender — Minecraft Bedrock Addon

Bending abilities with stunning particle FX, an in-game binding menu, three
switchable preset loadouts, and **no items required** to trigger anything.

## Features

- **4 elements** — Firebending, Waterbending, Earthbending, Airbending
- **8 abilities per element** (32 total): ranged projectiles, AoE bursts,
  shields, mobility, healing, disables, ultimates.
- **Stunning composite particle FX** built from vanilla particles (fireballs
  with smoke trails, ice spikes, sonic beams, tornados, explosions, etc.)
- **Custom in-game binding sub-menu** (Server-UI forms):
  - Choose element
  - Bind any ability to hotbar slots 1–9
  - Rename presets
  - Switch active preset
- **3 preset loadouts** — swap combat / mobility / utility on the fly
- **No items for activation.** Hold **Sneak**, then press hotbar slot **1–9**.
  Your original slot is restored automatically when you release.
- **Per-ability cooldowns** shown in the action bar
- **Persistent per-player state** via dynamic properties (survives relog)

## Controls

| Action | Input |
| --- | --- |
| Open the bending menu | **Triple-tap Sneak** (within ~1 s) |
| Also open menu | `/scriptevent avatar:menu` (works everywhere) |
| Also open menu | Chat `.a` (works only where `chatSend` is exposed) |
| Fire a bound ability | Hold **Sneak** + press hotbar slot **1–9** |
| Quick-switch preset | `/scriptevent avatar:p1` · `avatar:p2` · `avatar:p3` |

## Installation

1. Zip the `behavior_pack/` folder as `AvatarBP.mcpack`
2. Zip the `resource_pack/` folder as `AvatarRP.mcpack`
   *(the RP is a placeholder for future custom textures — the addon works
   from the BP alone, but pairing them keeps versions in sync)*
3. Open each `.mcpack` on your device to import
4. Create/edit a world. Under **Behavior Packs**, activate **Avatar: TLA BP**
   and enable **Beta APIs** in Experiments.
5. Under **Resource Packs**, activate **Avatar: TLA RP**.
6. Launch the world.
7. Chat `.a` to open the menu and pick your element.

## Requirements

- Minecraft Bedrock **1.21.50** or newer
- Experimental toggle: **Beta APIs** (for `@minecraft/server` scripting)

## Ability list

### Firebending 🔥
Fire Blast · Fireball · Fire Whip · Fire Shield · Lightning · Combustion · Jet
Propulsion · Wall of Flame

### Waterbending 💧
Water Jet · Ice Spikes · Water Whip · Healing Waters · Ice Prison · Bubble
Shield · Tsunami · Ice Slide

### Earthbending ⛰️
Rock Throw · Earth Wall · Earthquake · Metal Shrapnel · Sand Blast · Boulder
Barrage · Pillar Rise · Landslide

### Airbending 🌪️
Air Blast · Air Scooter · Wind Shield · Tornado · Air Jump · Sonic Burst ·
Suffocate · Wind Slice

## File layout

```
behavior_pack/
  manifest.json
  scripts/
    main.js           # entry: chat commands, spawn hooks, loops
    input.js          # sneak + hotbar → ability activation
    state.js          # per-player element + presets + bindings
    ui.js             # ActionForm / ModalForm menus
    fx.js             # particle helpers (bursts, trails, beams, auras)
    util.js           # vectors, look/eye, sound, timing
    abilities/
      index.js
      fire.js  water.js  earth.js  air.js
resource_pack/
  manifest.json
```

## Notes

- Ability activation deliberately avoids items so hotbar space stays free for
  regular play. Bindings are metaphorical, not physical.
- Earth Wall and Pillar Rise place real (temporary) blocks and restore the
  original block after ~12–15 seconds.
- Damage sources are tagged so death messages read sensibly
  (`by lightning`, `by fire`, etc.).
