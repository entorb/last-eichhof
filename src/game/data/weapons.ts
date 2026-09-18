import { SPRITE_SHEETS } from "./enemySprites";

// Placement grid: the DOS shop moved/placed on a 4 px grid, scaled 3x.
export const GRID = 12;
export const MAX_WEAPONS = 7;
export const SELL_RATE = 3 / 4;

export type ShotKind = "straight" | "homing" | "reflect";

export interface Emitter {
  // Release offset from the mount (DOS `shotstrc.shotx/shoty`, ×3 for web px).
  ox: number;
  oy: number;
  vx: number;
  vy: number;
  power: number;
  kind: ShotKind;
  // DOS projectile sprite key (`shot-<n>`, WEAPONS.SLI).
  sprite: string;
  // Lifetime in seconds for non-straight shots (DOS path length / 20 Hz).
  life?: number;
  release?: Release;
}

export interface Release {
  after: number;
  shots: Omit<Emitter, "release">[];
}

export interface Weapon {
  id: string;
  name: string;
  cost: number;
  period: number;
  w: number;
  h: number;
  tint: number;
  starter: boolean;
  emitters: Emitter[];
}

const UP = (
  power: number,
  speed: number,
  ox: number,
  oy: number,
  sprite: string,
): Emitter => ({ ox, oy, vx: 0, vy: -speed, power, kind: "straight", sprite });

// Exactly the nine DOS arms (`.WPN`), each firing its DOS shot script
// (WPNPATH.C). `.WPN` `shot` index → shot header in `WEAPONS.SHT`:
//   lager 0 (build0 straight), stange 12 (build12), pony 14 (build1415,
//   Pony Reflector), barbara 10 (build1011, V-shot), dunkel 13 (build13,
//   homing), can33 6 (build67, side shots), chuebeli 9 (build9, Humpe back
//   shot), pokal 1 (build12345, burst), kanone 8 (build8 cannon).
// DOS path deltas are px/frame at 20 Hz on a 320×220 field; web is 3× and
// px/s, so velocity = delta * 60. DOS reload is `period + 1` frames.
// `ox`/`oy` and `sprite` are the DOS `shotstrc.shotx/shoty/sprite` (offsets
// ×3); `shot-<n>` sheets come from WEAPONS.SLI. Costs are the DOS `.WPN` values.
export const WEAPONS: Weapon[] = [
  {
    id: "lager",
    name: "EICHHOF LAGER",
    cost: 0,
    period: 200,
    w: 30,
    h: 90,
    tint: 0xffffff,
    starter: true,
    emitters: [UP(2, 840, 0, -3, "shot-9")],
  },
  {
    id: "stange",
    name: "STANGE",
    cost: 300,
    period: 350,
    w: 30,
    h: 75,
    tint: 0xffd54a,
    starter: false,
    emitters: [UP(3, 600, 0, -18, "shot-10")],
  },
  {
    id: "pony",
    name: "PONY",
    cost: 335,
    period: 250,
    w: 30,
    h: 75,
    tint: 0xf0a52e,
    starter: false,
    emitters: [
      {
        ox: 6,
        oy: -3,
        vx: -360,
        vy: -840,
        power: 2,
        kind: "reflect",
        sprite: "shot-13",
        life: 0.8,
        release: {
          after: 0.01,
          shots: [
            {
              ox: 0,
              oy: 0,
              vx: 360,
              vy: -840,
              power: 2,
              kind: "reflect",
              sprite: "shot-13",
              life: 0.75,
            },
          ],
        },
      },
    ],
  },
  {
    id: "barbara",
    name: "BARBARA BRAEU",
    cost: 320,
    period: 250,
    w: 30,
    h: 75,
    tint: 0xffb3d9,
    starter: false,
    emitters: [
      {
        ox: 6,
        oy: -3,
        vx: -360,
        vy: -840,
        power: 2,
        kind: "straight",
        sprite: "shot-12",
        release: {
          after: 0.01,
          shots: [
            {
              ox: 0,
              oy: 0,
              vx: 360,
              vy: -840,
              power: 2,
              kind: "straight",
              sprite: "shot-12",
            },
          ],
        },
      },
    ],
  },
  {
    id: "dunkel",
    name: "DUNKEL",
    cost: 300,
    period: 300,
    w: 30,
    h: 75,
    tint: 0x8a6238,
    starter: false,
    emitters: [
      {
        ox: 6,
        oy: -3,
        vx: 0,
        vy: -720,
        power: 2,
        kind: "homing",
        sprite: "shot-11",
        life: 1,
      },
    ],
  },
  {
    id: "can33",
    name: "CAN 33CL",
    cost: 240,
    period: 350,
    w: 30,
    h: 42,
    tint: 0xc8ccd4,
    starter: false,
    emitters: [
      {
        ox: 0,
        oy: 0,
        vx: -600,
        vy: 0,
        power: 2,
        kind: "straight",
        sprite: "shot-17",
        release: {
          after: 0.01,
          shots: [
            {
              ox: 48,
              oy: 0,
              vx: 600,
              vy: 0,
              power: 2,
              kind: "straight",
              sprite: "shot-16",
            },
          ],
        },
      },
    ],
  },
  {
    id: "chuebeli",
    name: "CHUEBELI",
    cost: 260,
    period: 300,
    w: 42,
    h: 36,
    tint: 0xc77dff,
    starter: false,
    emitters: [
      {
        ox: 0,
        oy: 24,
        vx: 0,
        vy: 600,
        power: 3,
        kind: "straight",
        sprite: "shot-14",
      },
    ],
  },
  {
    id: "pokal",
    name: "POKAL",
    cost: 400,
    period: 1050,
    w: 36,
    h: 60,
    tint: 0x9fe0ff,
    starter: false,
    emitters: [
      {
        ox: 6,
        oy: -24,
        vx: 0,
        vy: -360,
        power: 6,
        kind: "straight",
        sprite: "shot-10",
        release: {
          after: 0.65,
          shots: [
            {
              ox: -18,
              oy: -18,
              vx: -360,
              vy: -360,
              power: 3,
              kind: "straight",
              sprite: "shot-18",
            },
            {
              ox: 18,
              oy: -18,
              vx: 360,
              vy: -360,
              power: 3,
              kind: "straight",
              sprite: "shot-19",
            },
            {
              ox: 18,
              oy: 18,
              vx: 360,
              vy: 360,
              power: 3,
              kind: "straight",
              sprite: "shot-20",
            },
            {
              ox: -18,
              oy: 18,
              vx: -360,
              vy: 360,
              power: 2,
              kind: "straight",
              sprite: "shot-21",
            },
          ],
        },
      },
    ],
  },
  {
    id: "kanone",
    name: "XENON 2 CANNON",
    cost: 540,
    period: 450,
    w: 48,
    h: 87,
    tint: 0xff5c5c,
    starter: false,
    emitters: [UP(6, 600, 12, -36, "shot-15")],
  },
];

const WEAPON_BY_ID: Record<string, Weapon> = Object.fromEntries(
  WEAPONS.map((w) => [w.id, w]),
);

export function weaponById(id: string): Weapon {
  const w = WEAPON_BY_ID[id];
  if (!w) throw new Error(`unknown weapon ${id}`);
  return w;
}

export type UpgradeKind = "speedup" | "extralife";

export interface Upgrade {
  id: string;
  name: string;
  cost: number;
  kind: UpgradeKind;
}

// The two DOS `.WPN` upgrade arms (exact names): "I WANT TO BE FAST" 200,
// "BONUS GUTTERE" (extra life) 30.
export const UPGRADES: Upgrade[] = [
  { id: "speedup", name: "I WANT TO BE FAST", cost: 200, kind: "speedup" },
  { id: "extralife", name: "BONUS GUTTERE", cost: 30, kind: "extralife" },
];

export interface Placement {
  defId: string;
  dx: number;
  dy: number;
}

// DOS `weaponmanager`: `deltam = (score - scoreold + 1500) / 2500; money += deltam * 5`.
// C integer division truncates toward zero, so use `trunc` (not `floor`) to
// match negative deltas (a level can end score-negative when boss kills cost
// more than the chaff is worth).
export function moneyForLevel(scoreDelta: number): number {
  return Math.trunc((scoreDelta + 1500) / 2500) * 5;
}

export function sellValue(cost: number): number {
  return Math.floor(cost * SELL_RATE);
}

export function snap(v: number): number {
  return Math.round(v / GRID) * GRID;
}

// Direction/damage summary for the shop display. `dmg` is the main shot only
// (the arm's own power) — released sub-shots are not counted.
export function weaponStats(w: Weapon): { dir: string; dmg: number } {
  const kinds = new Set(w.emitters.map((e) => e.kind));
  const shots = w.emitters.flatMap((e) =>
    e.release ? [e, ...e.release.shots] : [e],
  );
  const dmg = w.emitters.reduce((sum, e) => sum + e.power, 0);
  let up = 0;
  let down = 0;
  let side = 0;
  for (const s of shots) {
    if (s.vy < 0) up++;
    else if (s.vy > 0) down++;
    if (s.vx !== 0) side++;
  }
  if (kinds.has("homing")) return { dir: "HOMING", dmg };
  if (kinds.has("reflect")) return { dir: "REFLECT", dmg };
  if (up > 0 && side > 0) return { dir: "V-PATTERN", dmg };
  if (up > 0) return { dir: "UP", dmg };
  if (down > 0) return { dir: "DOWN", dmg };
  if (side > 0) return { dir: "SIDES", dmg };
  return { dir: "?", dmg };
}

export function placementsOverlap(a: Placement, b: Placement): boolean {
  const wa = weaponById(a.defId);
  const wb = weaponById(b.defId);
  return (
    Math.abs(a.dx - b.dx) < (wa.w + wb.w) / 2 &&
    Math.abs(a.dy - b.dy) < (wa.h + wb.h) / 2
  );
}

export function canPlace(
  loadout: Placement[],
  candidate: Placement,
  ignoreIndex = -1,
): boolean {
  return loadout.every(
    (p, i) => i === ignoreIndex || !placementsOverlap(p, candidate),
  );
}

export function runWeaponsSelfCheck(): void {
  const assert = (cond: boolean, msg: string) => {
    if (!cond) throw new Error(`selfcheck: ${msg}`);
  };

  assert(moneyForLevel(0) === 0, "money floor base");
  assert(moneyForLevel(999) === 0, "money just below step");
  assert(moneyForLevel(1000) === 5, "money first step");
  assert(moneyForLevel(10000) === 20, "money large");
  assert(moneyForLevel(-3000) === 0, "money truncates toward zero");
  assert(moneyForLevel(-4000) === -5, "money can go negative");
  assert(sellValue(2000) === 1500, "sell 75%");
  assert(sellValue(601) === 450, "sell floors");

  assert(weaponById("can33").cost === 240, "dos cost can33");
  assert(weaponById("kanone").cost === 540, "dos cost kanone");
  assert(UPGRADES[1]?.cost === 30, "dos cost extra life");

  assert(snap(0) === 0, "snap origin");
  assert(snap(12) === 12, "snap on grid");
  assert(snap(18) === 24, "snap up");
  assert(snap(-18) === -12, "snap negative");

  const a: Placement = { defId: "lager", dx: 0, dy: 0 };
  const b: Placement = { defId: "lager", dx: 10, dy: 0 };
  const c: Placement = { defId: "lager", dx: 40, dy: 0 };
  assert(placementsOverlap(a, b), "overlap close");
  assert(!placementsOverlap(a, c), "no overlap far");
  assert(!canPlace([a], b), "canPlace rejects overlap");
  assert(canPlace([a], c), "canPlace accepts clear");
  assert(canPlace([a], a, 0), "canPlace ignores self");

  assert(
    WEAPONS[0]?.starter === true && WEAPONS[0].cost === 0,
    "starter weapon",
  );
  assert(
    WEAPONS.every((w) => w.emitters.length > 0 && w.period > 0),
    "weapons complete",
  );
  assert(
    new Set(WEAPONS.map((w) => w.id)).size === WEAPONS.length,
    "weapon ids unique",
  );
  assert(WEAPONS.filter((w) => w.starter).length === 1, "exactly one starter");
  for (const w of WEAPONS) {
    const sheet = SPRITE_SHEETS.find((s) => s.key === `wpn-${w.id}`);
    if (sheet) {
      assert(
        sheet.frameWidth === w.w && sheet.frameHeight === w.h,
        `mount size ${w.id}`,
      );
    }
    const shots = w.emitters.flatMap((e) =>
      e.release ? [e, ...e.release.shots] : [e],
    );
    for (const s of shots) {
      assert(
        SPRITE_SHEETS.some((sheet) => sheet.key === s.sprite),
        `shot sprite ${w.id}: ${s.sprite}`,
      );
    }
  }
  // The nine DOS arms (`.WPN`), no more, no less.
  assert(WEAPONS.length === 9, "nine dos weapons");
  for (const id of [
    "pony",
    "stange",
    "dunkel",
    "barbara",
    "can33",
    "chuebeli",
    "kanone",
    "pokal",
  ]) {
    assert(id in WEAPON_BY_ID, `has weapon ${id}`);
  }
  assert(
    weaponById("pokal").emitters.some(
      (e) => (e.release?.shots.length ?? 0) > 0,
    ),
    "pokal releases sub-shots",
  );
  assert(
    weaponById("pony").emitters.some((e) => e.release),
    "pony reflector releases sub-shot",
  );
  assert(
    weaponById("barbara").emitters.some((e) => e.release),
    "barbara v-shot releases sub-shot",
  );
  assert(
    WEAPONS.every((w) =>
      w.emitters.every((e) => !e.release || e.release.after > 0),
    ),
    "release delay positive",
  );

  const stats: Record<string, [string, number]> = {
    lager: ["UP", 2],
    stange: ["UP", 3],
    pony: ["REFLECT", 2],
    barbara: ["V-PATTERN", 2],
    dunkel: ["HOMING", 2],
    can33: ["SIDES", 2],
    chuebeli: ["DOWN", 3],
    pokal: ["V-PATTERN", 6],
    kanone: ["UP", 6],
  };
  for (const [id, [dir, dmg]] of Object.entries(stats)) {
    assert(id in WEAPON_BY_ID, `stats weapon ${id}`);
    const got = weaponStats(weaponById(id));
    assert(
      got.dir === dir && got.dmg === dmg,
      `stats ${id}: got ${got.dir}/${got.dmg}, want ${dir}/${dmg}`,
    );
  }
}
