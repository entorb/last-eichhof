import { describe, expect, it } from "vitest";
import { FOES } from "./foeRosters";
import { LEVELS, runLevelsSelfCheck } from "./levels";

describe("levels", () => {
  it("passes the in-game self check", () => {
    expect(() => runLevelsSelfCheck()).not.toThrow();
  });

  // `checkWin` only needs `bossesLeft <= 0` (DOS `nbigboss == 0`), so an
  // unkillable scheduled boss would soft-lock the level forever.
  it("never schedules an invincible or transparent boss", () => {
    for (const level of LEVELS) {
      for (const spawn of level.build()) {
        if (spawn.cmd) continue;
        const foe = FOES[spawn.kind];
        if (foe.role !== "boss") continue;
        expect(foe.invincible ?? false, `${spawn.kind} invincible`).toBe(false);
        expect(foe.transparent ?? false, `${spawn.kind} transparent`).toBe(
          false,
        );
      }
    }
  });

  it("counts every scheduled boss and spawns it after t=0", () => {
    for (const level of LEVELS) {
      const bosses = level
        .build()
        .filter((s) => !s.cmd && FOES[s.kind].role === "boss");
      expect(bosses.length, `level ${level.n} boss count`).toBe(level.bosses);
      expect(bosses.length).toBeGreaterThan(0);
      for (const boss of bosses) {
        expect(boss.at, `${boss.kind} spawn time`).toBeGreaterThan(0);
      }
    }
  });

  it("spawns every foe inside the cull envelope", () => {
    for (const level of LEVELS) {
      for (const spawn of level.build()) {
        if (spawn.cmd) continue;
        expect(spawn.x, `${spawn.kind} x`).toBeGreaterThanOrEqual(-960);
        expect(spawn.x, `${spawn.kind} x`).toBeLessThanOrEqual(1920);
        expect(spawn.y, `${spawn.kind} y`).toBeGreaterThanOrEqual(-720);
        expect(spawn.y, `${spawn.kind} y`).toBeLessThanOrEqual(1440);
      }
    }
  });

  // The `.DSC` bonus is the DOS `initlevel` value (GAMEPLAY.C): it is added to
  // score/money at level start and feeds the end-of-level money conversion.
  it("carries the DOS .DSC bonus score and money", () => {
    expect(LEVELS.map((l) => l.bonusScore)).toEqual([
      0, 20000, 20000, 50000, 20000,
    ]);
    expect(LEVELS.map((l) => l.bonusMoney)).toEqual([400, 20, 560, 440, 0]);
  });

  // DOS adds the raw signed `foe.score`, so a boss can cost more than the
  // chaff is worth. Keep the negative values instead of clamping them.
  it("keeps negative boss scores", () => {
    const bosses = Object.values(FOES).filter((f) => f.role === "boss");
    expect(bosses.some((f) => f.score < 0)).toBe(true);
  });
});
