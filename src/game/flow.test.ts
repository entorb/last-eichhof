import { beforeEach, describe, expect, it, vi } from "vitest";
import { LEVELS } from "./data/levels";
import { endRun, getRun, hasRun, newRun } from "./data/run";
import * as Flow from "./flow";

type Call = [name: string, ...args: unknown[]];

function makeSwitcher() {
  const calls: Call[] = [];
  const push = (name: string, ...args: unknown[]) => {
    calls.push([name, ...args]);
  };
  return {
    calls,
    start: (scene: string, data?: object) => push("start", scene, data),
    launch: (scene: string, data?: object) => push("launch", scene, data),
    resume: (scene: string) => push("resume", scene),
    pause: (scene: string) => push("pause", scene),
    stop: (scene: string) => push("stop", scene),
    bringToTop: (scene: string) => push("bringToTop", scene),
  };
}

beforeEach(() => {
  endRun();
});

describe("scene flow", () => {
  it("Menu START GAME creates a fresh run and starts Game", () => {
    const s = makeSwitcher();
    Flow.startNewGame(s);
    const run = getRun();
    expect(run.level).toBe(1);
    expect(run.score).toBe(0);
    expect(hasRun()).toBe(true);
    expect(s.calls).toEqual([["start", "Game", undefined]]);
  });

  it("Game ESC pauses Game and overlays the pause Menu", () => {
    const s = makeSwitcher();
    Flow.pauseGame(s);
    expect(s.calls).toEqual([
      ["pause", "Game"],
      ["launch", "Menu", { pause: true }],
      ["bringToTop", "Menu"],
    ]);
  });

  it("pause RESUME keeps the same run and closes the Menu", () => {
    const run = newRun();
    run.level = 3;
    run.score = 1234;
    const s = makeSwitcher();
    Flow.resumeGame(s);
    expect(s.calls).toEqual([
      ["resume", "Game"],
      ["stop", "Menu"],
    ]);
    expect(getRun()).toBe(run);
    expect(getRun().level).toBe(3);
    expect(getRun().score).toBe(1234);
  });

  it("pause END GAME aborts the run and opens Menu on the scores", () => {
    newRun();
    const abortGame = vi.fn(() => endRun());
    const s = makeSwitcher();
    Flow.endGameAndShowScores(s, { abortGame });
    expect(abortGame).toHaveBeenCalledOnce();
    expect(hasRun()).toBe(false);
    expect(s.calls).toEqual([
      ["stop", "Game"],
      ["start", "Menu", { pause: false, scores: true }],
    ]);
  });

  it("level cleared goes to Shop and keeps the run (except the last level)", () => {
    const s = makeSwitcher();
    newRun();
    Flow.finishLevel(s, 1);
    expect(s.calls).toEqual([["start", "Shop", undefined]]);
    expect(hasRun()).toBe(true);
  });

  it("final level win ends the run and returns to Menu", () => {
    const s = makeSwitcher();
    newRun();
    Flow.finishLevel(s, LEVELS.length);
    expect(s.calls).toEqual([["start", "Menu", { pause: false }]]);
    expect(hasRun()).toBe(false);
  });

  it("game over ends the run and returns to Menu", () => {
    const s = makeSwitcher();
    newRun();
    Flow.endGame(s);
    expect(s.calls).toEqual([["start", "Menu", { pause: false }]]);
    expect(hasRun()).toBe(false);
  });

  it("Menu is reset to non-pause after a pause overlay (stale data bug)", () => {
    const s = makeSwitcher();
    newRun();
    Flow.pauseGame(s); // launches Menu with { pause: true }
    Flow.endGame(s);
    const last = s.calls[s.calls.length - 1];
    expect(last).toEqual(["start", "Menu", { pause: false }]);
  });

  it("Shop continue advances the same run and caps at the last level", () => {
    const run = newRun();
    run.level = 2;
    run.money = 500;
    run.score = 999;
    const s = makeSwitcher();
    Flow.continueToNextLevel(s, run);
    expect(run.level).toBe(3);
    expect(run.money).toBe(500);
    expect(run.score).toBe(999);
    expect(s.calls).toEqual([["start", "Game", undefined]]);
    for (let i = 0; i < LEVELS.length; i++) Flow.continueToNextLevel(s, run);
    expect(run.level).toBe(LEVELS.length);
  });

  it("walks Menu → Game → Pause → Game → Shop → Game → … → Menu", () => {
    const s = makeSwitcher();
    Flow.startNewGame(s); // Menu → Game
    const run = getRun();
    run.score = 100;

    Flow.pauseGame(s); // Game → Pause (overlay)
    Flow.resumeGame(s); // Pause → Game
    expect(getRun()).toBe(run);
    expect(getRun().score).toBe(100);

    while (run.level < LEVELS.length) {
      Flow.finishLevel(s, run.level); // Game → Shop
      expect(hasRun()).toBe(true);
      Flow.continueToNextLevel(s, run); // Shop → Game
    }
    Flow.finishLevel(s, run.level); // final Game → Menu
    expect(hasRun()).toBe(false);
    expect(s.calls[s.calls.length - 1]).toEqual([
      "start",
      "Menu",
      { pause: false },
    ]);
  });
});
