import { DIFFICULTY, loadSettings } from "./store";
import type { Placement } from "./weapons";

export const BASE_SHIP_SPEED = 270;
export const SPEEDUP_STEP = 45;
export const MAX_SPEEDUPS = 2;

export interface Run {
  level: number;
  money: number;
  score: number;
  lives: number;
  speedUps: number;
  loadout: Placement[];
}

let current: Run | null = null;

export function hasRun(): boolean {
  return current !== null;
}

export function newRun(): Run {
  current = {
    level: 1,
    money: 0,
    score: 0,
    lives: DIFFICULTY[loadSettings().difficulty].lives,
    speedUps: 0,
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
