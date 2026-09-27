import { describe, expect, it } from "vitest"
import { SPRITE_SHEETS } from "../data/enemySprites"
import { FOES } from "../data/foeRosters"
import { WEAPONS } from "../data/weapons"
import { FOE_ART, FOE_ART_KEYS } from "./foeArt"
import { RIG_ART_KEYS } from "./rigArt"
import {
  dosKey,
  drawModernSheetFrame,
  hasModernArt,
  modernKey,
  modernSheets,
  runModernSkinSelfCheck,
  setGraphicsMode,
  texKey,
} from "./skin"
import type { Ctx } from "./vector"

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

  // The DOS strips all animate (at least 3 distinct frames each), so a modern
  // twin whose generator ignores the frame index silently drops the animation.
  it("keeps every multi-frame sheet animated", () => {
    const dropped: string[] = []
    for (const sheet of modernSheets().filter((s) => s.frames > 1)) {
      const frames = Array.from({ length: sheet.frames }, (_, i) => {
        const log: string[] = []
        drawModernSheetFrame(recorder(log), sheet, i)
        // Drop the slot offset: it differs per frame even when the art does not.
        return log.slice(2).join("\n")
      })
      for (const f of frames) expect(f, `${sheet.key} draws nothing`).toMatch(/fill|stroke/)
      const distinct = new Set(frames).size
      if (distinct < Math.max(2, Math.ceil(sheet.frames * 0.75))) {
        dropped.push(`${sheet.key} ${distinct}/${sheet.frames}`)
      }
    }
    expect(dropped).toEqual([])
  })
})

/** Fake 2D context that logs every call and property write. */
function recorder(log: string[]): Ctx {
  const rec =
    (name: string) =>
    (...args: unknown[]) => {
      log.push(
        `${name}(${args.map((a) => (typeof a === "number" ? a.toFixed(2) : String(a))).join(",")})`,
      )
      if (name.startsWith("create")) return { addColorStop: rec("stop") }
      if (name === "measureText") return { width: String(args[0]).length * 10 }
      return undefined
    }
  return new Proxy({} as Ctx, {
    get: (_, prop) => rec(String(prop)),
    set: (_, prop, value) => {
      log.push(`${String(prop)}=${typeof value === "object" ? "obj" : String(value)}`)
      return true
    },
  })
}
