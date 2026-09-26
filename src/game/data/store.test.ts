import { describe, expect, it } from "vitest"
import {
  GRAPHICS_ORDER,
  loadSettings,
  parseSettings,
  runStoreSelfCheck,
  saveSettings,
} from "./store"

describe("runStoreSelfCheck", () => {
  it("passes", () => {
    expect(() => runStoreSelfCheck()).not.toThrow()
  })
})

describe("graphics setting", () => {
  it("defaults to modern and rejects junk", () => {
    expect(parseSettings(null).graphics).toBe("modern")
    expect(parseSettings("garbage").graphics).toBe("modern")
    expect(parseSettings(JSON.stringify({ graphics: "original" })).graphics).toBe("original")
    expect(parseSettings(JSON.stringify({ graphics: "pixel" })).graphics).toBe("modern")
  })

  it("cycles through both modes", () => {
    expect(GRAPHICS_ORDER).toEqual(["original", "modern"])
    const len = GRAPHICS_ORDER.length
    const at = (i: number) => {
      const mode = GRAPHICS_ORDER[(i + len) % len]
      if (!mode) throw new Error(`no mode at ${i}`)
      return mode
    }
    const idx = GRAPHICS_ORDER.indexOf("modern")
    const next = at(idx + 1)
    expect(next).toBe("original")
    expect(at(GRAPHICS_ORDER.indexOf(next) - 1)).toBe("modern")
  })
})

describe("loadSettings", () => {
  it("follows saves and hands out independent copies", () => {
    const store = new Map<string, string>()
    globalThis.localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
    } as Storage

    const a = loadSettings()
    a.autoFire = !a.autoFire
    expect(loadSettings().autoFire).not.toBe(a.autoFire)

    saveSettings(a)
    expect(loadSettings().autoFire).toBe(a.autoFire)
  })
})
