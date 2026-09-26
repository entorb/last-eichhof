import { describe, expect, it } from "vitest"
import { SPRITE_SHEETS } from "../data/enemySprites"
import { FOES } from "../data/foeRosters"
import { WEAPONS } from "../data/weapons"
import { FOE_ART, FOE_ART_KEYS } from "./foeArt"
import { RIG_ART_KEYS } from "./rigArt"
import {
  dosKey,
  hasModernArt,
  modernKey,
  runModernSkinSelfCheck,
  setGraphicsMode,
  texKey,
} from "./skin"

describe("modern graphics skin", () => {
  it("passes its self-check", () => {
    expect(() => runModernSkinSelfCheck()).not.toThrow()
  })

  it("resolves both key spaces symmetrically", () => {
    setGraphicsMode("original")
    expect(texKey("ship")).toBe("ship")
    expect(texKey("m-ship")).toBe("ship")
    setGraphicsMode("modern")
    expect(texKey("ship")).toBe("m-ship")
    expect(texKey("m-ship")).toBe("m-ship")
    expect(dosKey(texKey("l2-s13"))).toBe("l2-s13")
    setGraphicsMode("original")
  })

  it("leaves mode-independent keys alone", () => {
    setGraphicsMode("modern")
    for (const key of ["stars-far", "stars-near", "ui-graphics", "missing-key"]) {
      expect(texKey(key), key).toBe(key)
    }
    setGraphicsMode("original")
  })

  it("gives every sprite sheet a modern twin with matching geometry", () => {
    for (const sheet of SPRITE_SHEETS) {
      expect(hasModernArt(sheet.key), sheet.key).toBe(true)
      expect(modernKey(sheet.key), sheet.key).toBe(`m-${sheet.key}`)
    }
  })

  it("covers every texture the game asks for", () => {
    const keys = new Set<string>()
    for (const kind of Object.keys(FOES) as (keyof typeof FOES)[]) {
      const spec = FOES[kind]
      keys.add(spec.texture)
      for (const step of spec.path ?? []) {
        if (step.t === "sprite") keys.add(step.texture)
      }
    }
    for (const w of WEAPONS) {
      keys.add(`wpn-${w.id}`)
      for (const em of [...w.emitters, ...w.emitters.flatMap((e) => e.release?.shots ?? [])]) {
        keys.add(em.sprite)
      }
    }
    keys.add("cork")
    keys.add("pellet")
    keys.add("ship")
    keys.add("explosion")
    expect(keys.size).toBeGreaterThan(100)
    for (const key of keys) {
      expect(hasModernArt(key), key).toBe(true)
    }
  })

  it("maps exactly the 84 DOS foe sheets and 26 rig sheets", () => {
    const sheetKeys = new Set(SPRITE_SHEETS.map((s) => s.key))
    expect(FOE_ART_KEYS.length).toBe(84)
    for (const key of FOE_ART_KEYS) {
      expect(sheetKeys.has(key), key).toBe(true)
      expect(FOE_ART[key]?.art, key).toBeTruthy()
    }
    expect(RIG_ART_KEYS.length).toBe(26)
    for (const key of RIG_ART_KEYS) {
      expect(new Set(RIG_ART_KEYS).has(key), key).toBe(true)
    }
  })
})
