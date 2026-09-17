import { describe, expect, it } from "vitest";
import {
  BASE_SHIP_SPEED,
  MAX_SPEEDUPS,
  newRun,
  runRunSelfCheck,
  SPEEDUP_STEP,
  shipSpeed,
} from "./run";

describe("run", () => {
  it("passes the in-game self check", () => {
    expect(() => runRunSelfCheck()).not.toThrow();
  });

  it("resets every per-game value on a new game", () => {
    const dirty = newRun();
    dirty.money = 999;
    dirty.score = 12345;
    dirty.level = 4;
    dirty.lives = 1;
    dirty.speedUps = 2;
    dirty.godMode = true;
    dirty.loadout.push({ defId: "kanone", dx: 0, dy: 0 });

    const fresh = newRun();
    expect(fresh).toMatchObject({
      money: 0,
      score: 0,
      level: 1,
      speedUps: 0,
      godMode: false,
    });
    expect(fresh.loadout).toEqual([{ defId: "lager", dx: 0, dy: 0 }]);
  });

  it("matches the DOS ship speed curve", () => {
    expect(BASE_SHIP_SPEED).toBe(240);
    expect(SPEEDUP_STEP).toBe(120);
    expect(MAX_SPEEDUPS).toBe(2);
    const run = newRun();
    expect(shipSpeed(run)).toBe(240);
    run.speedUps = 1;
    expect(shipSpeed(run)).toBe(360);
    run.speedUps = 2;
    expect(shipSpeed(run)).toBe(480);
  });
});
