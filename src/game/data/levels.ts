import { ROSTERS } from "./foeRosters";
import { FOES, PLAY, type Spawn } from "./level1";

export interface LevelDef {
  n: number;
  name: string;
  bg: number;
  starTint: number;
  bossHp: number;
  shieldBonus: number;
  bosses: number;
  checkpoints: number[];
  scoreScale: number;
  build(): Spawn[];
}

const BG = [0x05060d, 0x0a0512, 0x00120f, 0x140707, 0x0d0a00];
const TINT = [0xffffff, 0xc9a6ff, 0x8affc1, 0xff9a8a, 0xffd54a];
const SHIELD_BONUS = [0, 0, 1, 1, 2];
// Level 1 is the "EASY START" tutorial: its end boss loops and spawns 13×, so
// at the DOS per-boss score it alone would out-score every later level. Keep
// the tutorial's kills at a fraction so it stays the low-stakes opener.
const SCORE_SCALE = [0.3, 1, 1, 1, 1];

export const LEVELS: LevelDef[] = ROSTERS.map((roster, i) => ({
  n: i + 1,
  name: roster.name,
  bg: BG[i],
  starTint: TINT[i],
  bossHp: roster.bossHp,
  shieldBonus: SHIELD_BONUS[i],
  bosses: roster.bosses,
  checkpoints: roster.checkpoints,
  scoreScale: SCORE_SCALE[i],
  build: () => roster.spawns.map((s) => ({ ...s })),
}));

export function getLevel(n: number): LevelDef {
  const idx = Math.max(0, Math.min(LEVELS.length - 1, n - 1));
  return LEVELS[idx];
}

export function runLevelsSelfCheck(): void {
  const assert = (cond: boolean, msg: string) => {
    if (!cond) throw new Error(`selfcheck: ${msg}`);
  };
  assert(LEVELS.length === 5, "five levels");
  LEVELS.forEach((lvl, i) => {
    assert(lvl.n === i + 1, `level ${i + 1} number`);
    const spawns = lvl.build();
    assert(spawns.length > 0, `level ${i + 1} has spawns`);
    for (let j = 1; j < spawns.length; j++) {
      assert(spawns[j - 1].at <= spawns[j].at, `level ${i + 1} sorted`);
    }
    const bosses = spawns.filter((s) => !s.cmd && FOES[s.kind].role === "boss");
    assert(bosses.length === lvl.bosses, `level ${i + 1} boss count`);
    assert(lvl.bosses >= 1, `level ${i + 1} has bosses`);
    const bossAt = bosses[0].at;
    let prevCp = -1;
    for (const cp of lvl.checkpoints) {
      assert(cp > prevCp, `level ${i + 1} checkpoints sorted`);
      assert(cp < bossAt, `level ${i + 1} checkpoint before boss`);
      prevCp = cp;
    }
    for (const s of spawns) {
      if (s.cmd) continue;
      assert(s.x >= -PLAY.w && s.x <= PLAY.w * 2, `level ${i + 1} x in range`);
      assert(s.y >= -PLAY.h && s.y <= PLAY.h * 2, `level ${i + 1} y in range`);
    }
  });
  assert(getLevel(0).n === 1, "getLevel clamps low");
  assert(getLevel(99).n === 5, "getLevel clamps high");

  const maxScore = (lvl: LevelDef) =>
    lvl
      .build()
      .reduce(
        (sum, s) =>
          s.cmd ? sum : sum + Math.round(FOES[s.kind].score * lvl.scoreScale),
        0,
      );
  const later = Math.min(...LEVELS.slice(1).map(maxScore));
  assert(maxScore(LEVELS[0]) < later, "tutorial score below every later level");
}
