import { describe, expect, it } from "vitest";
import { FOES } from "./level1";
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

  // The tutorial's end boss loops and spawns 13×, so without `scoreScale` its
  // kill score alone would beat every later level.
  it("keeps the tutorial's score below every later level", () => {
    const maxScore = (lvl: (typeof LEVELS)[number]) =>
      lvl
        .build()
        .reduce(
          (sum, s) =>
            s.cmd ? sum : sum + Math.round(FOES[s.kind].score * lvl.scoreScale),
          0,
        );
    const later = Math.min(...LEVELS.slice(1).map(maxScore));
    expect(maxScore(LEVELS[0])).toBeLessThan(later);
  });
});
