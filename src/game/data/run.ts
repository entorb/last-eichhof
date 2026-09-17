import { DIFFICULTY, loadSettings } from "./store";
import type { Placement } from "./weapons";

// DOS `STARTSHIPSPEED` 4 px/frame, `W_SPEEDUP` +2 px/frame, `MAXSHIPSPEED` 8
// (max 2 speedups). 20 Hz, 3× scale → ×60 px/s.
export const BASE_SHIP_SPEED = 240;
export const SPEEDUP_STEP = 120;
export const MAX_SPEEDUPS = 2;

export interface Run {
  level: number;
  money: number;
  score: number;
  lives: number;
  speedUps: number;
  godMode: boolean;
  loadout: Placement[];
}

let current: Run | null = null;

export function hasRun(): boolean {
  return current !== null;
}

// A fresh run resets every per-game value, so a new game never inherits money,
// score, lives, speedups or god mode from an earlier game.
export function newRun(): Run {
  current = {
    level: 1,
    money: 0,
    score: 0,
    lives: DIFFICULTY[loadSettings().difficulty].lives,
    speedUps: 0,
    godMode: false,
    loadout: [{ defId: "lager", dx: 0, dy: 0 }],
  };
  return current;
}

export function getRun(): Run {
  return current ?? newRun();
}

export function endRun(): void {
  current = null;
}

export function shipSpeed(run: Run): number {
  return BASE_SHIP_SPEED + run.speedUps * SPEEDUP_STEP;
}

export function runRunSelfCheck(): void {
  const assert = (cond: boolean, msg: string) => {
    if (!cond) throw new Error(`selfcheck: ${msg}`);
  };
  const dirty = newRun();
  dirty.money = 123;
  dirty.score = 456;
  dirty.level = 3;
  dirty.lives = 1;
  dirty.speedUps = 2;
  dirty.godMode = true;
  dirty.loadout.push({ defId: "kanone", dx: 0, dy: 0 });

  const fresh = newRun();
  assert(fresh.money === 0, "new run money resets");
  assert(fresh.score === 0, "new run score resets");
  assert(fresh.level === 1, "new run level resets");
  assert(fresh.speedUps === 0, "new run speedups reset");
  assert(!fresh.godMode, "new run god mode resets");
  assert(fresh.loadout.length === 1, "new run loadout resets");
  assert(fresh.loadout[0].defId === "lager", "new run keeps starter");
  endRun();
  assert(!hasRun(), "endRun clears the run");
}
