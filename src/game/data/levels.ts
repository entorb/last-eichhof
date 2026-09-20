import { FOES, ROSTERS, type RosterSpawn } from "./foeRosters"
import { at } from "./lookup"
import { PLAY } from "./playfield"

export interface LevelDef {
  n: number
  name: string
  bg: number
  starTint: number
  bosses: number
  checkpoints: number[]
  bonusScore: number
  bonusMoney: number
  build(): RosterSpawn[]
}

const BG = [0x05060d, 0x0a0512, 0x00120f, 0x140707, 0x0d0a00]
const TINT = [0xffffff, 0xc9a6ff, 0x8affc1, 0xff9a8a, 0xffd54a]

export const LEVELS: LevelDef[] = ROSTERS.map((roster, i) => ({
  n: i + 1,
  name: roster.name,
  bg: at(BG, i),
  starTint: at(TINT, i),
  bosses: roster.bosses,
  checkpoints: roster.checkpoints,
  bonusScore: roster.bonusScore,
  bonusMoney: roster.bonusMoney,
  build: () => roster.spawns.map((s) => ({ ...s })),
}))

export function getLevel(n: number): LevelDef {
  const idx = Math.max(0, Math.min(LEVELS.length - 1, n - 1))
  return at(LEVELS, idx)
}

export function runLevelsSelfCheck(): void {
  const assert = (cond: boolean, msg: string) => {
    if (!cond) throw new Error(`selfcheck: ${msg}`)
  }
  assert(LEVELS.length === 5, "five levels")
  assert(BG.length === LEVELS.length, "one bg per level")
  assert(TINT.length === LEVELS.length, "one star tint per level")
  LEVELS.forEach((lvl, i) => {
    assert(lvl.n === i + 1, `level ${i + 1} number`)
    const spawns = lvl.build()
    assert(spawns.length > 0, `level ${i + 1} has spawns`)
    for (let j = 1; j < spawns.length; j++) {
      assert(at(spawns, j - 1).at <= at(spawns, j).at, `level ${i + 1} sorted`)
    }
    const bosses = spawns.filter((s) => !s.cmd && FOES[s.kind].role === "boss")
    assert(bosses.length === lvl.bosses, `level ${i + 1} boss count`)
    assert(lvl.bosses >= 1, `level ${i + 1} has bosses`)
    const bossAt = at(bosses, 0).at
    let prevCp = -1
    for (const cp of lvl.checkpoints) {
      assert(cp > prevCp, `level ${i + 1} checkpoints sorted`)
      assert(cp < bossAt, `level ${i + 1} checkpoint before boss`)
      prevCp = cp
    }
    for (const s of spawns) {
      if (s.cmd) continue
      assert(s.x >= -PLAY.w && s.x <= PLAY.w * 2, `level ${i + 1} x in range`)
      assert(s.y >= -PLAY.h && s.y <= PLAY.h * 2, `level ${i + 1} y in range`)
    }
  })
  assert(getLevel(0).n === 1, "getLevel clamps low")
  assert(getLevel(99).n === 5, "getLevel clamps high")

  // DOS `initlevel` adds the `.DSC` bonus score/money at level start.
  for (const lvl of LEVELS) {
    assert(lvl.bonusScore >= 0, `level ${lvl.n} bonus score`)
    assert(lvl.bonusMoney >= 0, `level ${lvl.n} bonus money`)
  }
  assert(
    LEVELS.some((lvl) => lvl.bonusScore > 0),
    "some level grants bonus score",
  )
}
