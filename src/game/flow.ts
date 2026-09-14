import { LEVELS } from "./data/levels";
import { endRun, newRun } from "./data/run";

export type SceneName = "Boot" | "Menu" | "Shop" | "Game";

// The slice of Phaser's ScenePlugin the flow needs. Scenes pass `this.scene`;
// tests pass a recorder, so the transitions are testable without Phaser.
export interface SceneSwitcher {
  start(scene: SceneName, data?: object): void;
  launch(scene: SceneName, data?: object): void;
  resume(scene: SceneName): void;
  pause(scene: SceneName): void;
  stop(scene: SceneName): void;
  bringToTop(scene: SceneName): void;
  restart(data?: object): void;
}

/** Menu → START GAME: fresh run, then Game. */
export function startNewGame(switcher: SceneSwitcher): void {
  newRun();
  switcher.start("Game");
}

/** Game ESC: pause Game and raise the pause Menu over it. */
export function pauseGame(switcher: SceneSwitcher): void {
  switcher.pause("Game");
  switcher.launch("Menu", { pause: true });
  switcher.bringToTop("Menu");
}

/** Pause Menu RESUME: Game keeps its run, Menu closes. */
export function resumeGame(switcher: SceneSwitcher): void {
  switcher.resume("Game");
  switcher.stop("Menu");
}

/** Pause Menu QUIT: record/abandon the run, Game stops, Menu restarts fresh. */
export function quitToMenu(
  switcher: SceneSwitcher,
  game: { abortGame(): void },
): void {
  game.abortGame();
  switcher.stop("Game");
  switcher.restart({ pause: false });
}

/** Game level cleared: Shop between levels, Menu (run over) after the last. */
export function finishLevel(switcher: SceneSwitcher, level: number): void {
  if (level >= LEVELS.length) {
    endRun();
    // Pass explicit data: `start` without it reuses the previous Menu data
    // (e.g. `{ pause: true }` from the pause overlay) and reopens paused.
    switcher.start("Menu", { pause: false });
  } else {
    switcher.start("Shop");
  }
}

/** Game over (lives gone): run ends, back to Menu. */
export function endGame(switcher: SceneSwitcher): void {
  endRun();
  switcher.start("Menu", { pause: false });
}

/** Shop continue: advance the same run one level (capped) and start Game. */
export function continueToNextLevel(
  switcher: SceneSwitcher,
  run: { level: number },
): void {
  run.level = Math.min(run.level + 1, LEVELS.length);
  switcher.start("Game");
}
