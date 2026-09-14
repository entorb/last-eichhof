import { SPRITE_SHEETS } from "./enemySprites";

// Placement grid: the DOS shop moved/placed on a 4 px grid, scaled 3x.
export const GRID = 12;
export const MAX_WEAPONS = 7;
export const SELL_RATE = 3 / 4;

export type ShotKind = "straight" | "homing" | "reflect";

export interface Emitter {
  ox: number;
  oy: number;
  vx: number;
  vy: number;
  power: number;
  kind: ShotKind;
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

const UP = (power: number, speed: number): Emitter => ({
  ox: 0,
  oy: 0,
  vx: 0,
  vy: -speed,
  power,
  kind: "straight",
});

export const WEAPONS: Weapon[] = [
  {
    id: "lager",
    name: "EICHHOF LAGER",
    cost: 0,
    period: 120,
    w: 30,
    h: 90,
    tint: 0xffffff,
    starter: true,
    emitters: [UP(2, 780)],
  },
  {
    id: "pony",
    name: "PONY",
    cost: 400,
    period: 110,
    w: 30,
    h: 75,
    tint: 0xf0a52e,
    starter: false,
    emitters: [UP(2, 760)],
  },
  {
    id: "stange",
    name: "STANGE",
    cost: 600,
    period: 150,
    w: 30,
    h: 75,
    tint: 0xffd54a,
    starter: false,
    emitters: [UP(3, 820)],
  },
  {
    id: "can33",
    name: "CAN 33CL",
    cost: 800,
    period: 150,
    w: 30,
    h: 42,
    tint: 0xc8ccd4,
    starter: false,
    emitters: [
      UP(1, 720),
      { ox: 0, oy: 0, vx: -190, vy: -700, power: 1, kind: "straight" },
      { ox: 0, oy: 0, vx: 190, vy: -700, power: 1, kind: "straight" },
    ],
  },
  {
    id: "vshot",
    name: "V-SHOT",
    cost: 900,
    period: 160,
    w: 24,
    h: 36,
    tint: 0xff9a3f,
    starter: false,
    emitters: [
      { ox: 0, oy: 0, vx: -210, vy: -740, power: 2, kind: "straight" },
      { ox: 0, oy: 0, vx: 210, vy: -740, power: 2, kind: "straight" },
    ],
  },
  {
    id: "humpe",
    name: "HUMPE",
    cost: 1200,
    period: 190,
    w: 24,
    h: 36,
    tint: 0xff8a5c,
    starter: false,
    emitters: [{ ox: 0, oy: 0, vx: 0, vy: 760, power: 3, kind: "straight" }],
  },
  {
    id: "dunkel",
    name: "DUNKEL",
    cost: 1400,
    period: 210,
    w: 30,
    h: 75,
    tint: 0x8a6238,
    starter: false,
    emitters: [UP(4, 800)],
  },
  {
    id: "pokal",
    name: "POKAL",
    cost: 1500,
    period: 170,
    w: 36,
    h: 60,
    tint: 0x9fe0ff,
    starter: false,
    emitters: [
      {
        ox: 0,
        oy: 0,
        vx: 0,
        vy: -720,
        power: 3,
        kind: "straight",
        release: {
          after: 0.26,
          shots: [
            { ox: 0, oy: 0, vx: -240, vy: -680, power: 2, kind: "straight" },
            { ox: 0, oy: 0, vx: 240, vy: -680, power: 2, kind: "straight" },
            { ox: 0, oy: 0, vx: -420, vy: -560, power: 2, kind: "straight" },
            { ox: 0, oy: 0, vx: 420, vy: -560, power: 2, kind: "straight" },
          ],
        },
      },
    ],
  },
  {
    id: "barbara",
    name: "BARBARA BRAEU",
    cost: 1800,
    period: 180,
    w: 30,
    h: 75,
    tint: 0xffb3d9,
    starter: false,
    emitters: [
      UP(3, 780),
      { ox: 0, oy: 0, vx: -170, vy: -760, power: 2, kind: "straight" },
      { ox: 0, oy: 0, vx: 170, vy: -760, power: 2, kind: "straight" },
    ],
  },
  {
    id: "seite",
    name: "SEITENSCHUSS",
    cost: 2000,
    period: 200,
    w: 24,
    h: 36,
    tint: 0x7dff9f,
    starter: false,
    emitters: [
      { ox: 0, oy: 0, vx: -780, vy: 0, power: 2, kind: "straight" },
      { ox: 0, oy: 0, vx: 780, vy: 0, power: 2, kind: "straight" },
    ],
  },
  {
    id: "chuebeli",
    name: "CHUEBELI",
    cost: 2500,
    period: 190,
    w: 42,
    h: 36,
    tint: 0xc77dff,
    starter: false,
    emitters: [
      UP(3, 800),
      { ox: 0, oy: 0, vx: -320, vy: -680, power: 2, kind: "straight" },
      { ox: 0, oy: 0, vx: 320, vy: -680, power: 2, kind: "straight" },
    ],
  },
  {
    id: "kanone",
    name: "XENON 2 CANNON",
    cost: 3000,
    period: 280,
    w: 48,
    h: 87,
    tint: 0xff5c5c,
    starter: false,
    emitters: [UP(6, 900)],
  },
  {
    id: "reflect",
    name: "PONY REFLECTOR",
    cost: 3500,
    period: 240,
    w: 24,
    h: 36,
    tint: 0x7dfff0,
    starter: false,
    emitters: [
      {
        ox: 0,
        oy: 0,
        vx: 0,
        vy: -700,
        power: 2,
        kind: "reflect",
        release: {
          after: 0.08,
          shots: [
            { ox: 0, oy: 0, vx: -300, vy: -640, power: 2, kind: "reflect" },
          ],
        },
      },
    ],
  },
  {
    id: "homing",
    name: "HOMING",
    cost: 4000,
    period: 320,
    w: 24,
    h: 36,
    tint: 0xc77dff,
    starter: false,
    emitters: [{ ox: 0, oy: 0, vx: 0, vy: -420, power: 2, kind: "homing" }],
  },
];

export const WEAPON_BY_ID: Record<string, Weapon> = Object.fromEntries(
  WEAPONS.map((w) => [w.id, w]),
);

export type UpgradeKind = "speedup" | "extralife";

export interface Upgrade {
  id: string;
  name: string;
  cost: number;
  kind: UpgradeKind;
}

export const UPGRADES: Upgrade[] = [
  { id: "speedup", name: "SPEED UP", cost: 1000, kind: "speedup" },
  { id: "extralife", name: "EXTRA LIFE", cost: 2000, kind: "extralife" },
];

export interface Placement {
  defId: string;
  dx: number;
  dy: number;
}

export function moneyForLevel(scoreDelta: number): number {
  return Math.floor((scoreDelta + 1500) / 2500) * 5;
}

export function sellValue(cost: number): number {
  return Math.floor(cost * SELL_RATE);
}

export function snap(v: number): number {
  return Math.round(v / GRID) * GRID;
}

// Direction/damage summary for the shop display.
export function weaponStats(w: Weapon): { dir: string; dmg: number } {
  const kinds = new Set(w.emitters.map((e) => e.kind));
  const shots = w.emitters.flatMap((e) =>
    e.release ? [e, ...e.release.shots] : [e],
  );
  let dmg = 0;
  let up = 0;
  let down = 0;
  let side = 0;
  for (const s of shots) {
    dmg += s.power;
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
  const wa = WEAPON_BY_ID[a.defId];
  const wb = WEAPON_BY_ID[b.defId];
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
  assert(sellValue(2000) === 1500, "sell 75%");
  assert(sellValue(601) === 450, "sell floors");

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

  assert(WEAPONS[0].starter && WEAPONS[0].cost === 0, "starter weapon");
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
  }
  for (const id of [
    "pony",
    "stange",
    "dunkel",
    "barbara",
    "can33",
    "chuebeli",
    "kanone",
    "vshot",
    "pokal",
    "homing",
    "reflect",
  ]) {
    assert(id in WEAPON_BY_ID, `has weapon ${id}`);
  }
  assert(
    WEAPON_BY_ID.pokal.emitters.some((e) => (e.release?.shots.length ?? 0) > 0),
    "pokal releases sub-shots",
  );
  assert(
    WEAPON_BY_ID.reflect.emitters.some((e) => e.release),
    "reflector releases sub-shot",
  );
  assert(
    WEAPONS.every((w) =>
      w.emitters.every((e) => !e.release || e.release.after > 0),
    ),
    "release delay positive",
  );

  const stats: Record<string, [string, number]> = {
    pony: ["UP", 2],
    stange: ["UP", 3],
    humpe: ["DOWN", 3],
    dunkel: ["UP", 4],
    pokal: ["V-PATTERN", 11],
    barbara: ["V-PATTERN", 7],
    seite: ["SIDES", 4],
    chuebeli: ["V-PATTERN", 7],
    kanone: ["UP", 6],
    reflect: ["REFLECT", 4],
    homing: ["HOMING", 2],
    vshot: ["V-PATTERN", 4],
    can33: ["V-PATTERN", 3],
  };
  for (const [id, [dir, dmg]] of Object.entries(stats)) {
    assert(id in WEAPON_BY_ID, `stats weapon ${id}`);
    const got = weaponStats(WEAPON_BY_ID[id]);
    assert(
      got.dir === dir && got.dmg === dmg,
      `stats ${id}: got ${got.dir}/${got.dmg}, want ${dir}/${dmg}`,
    );
  }
}
