import { describe, expect, it } from "vitest"
import { loadSettings, runStoreSelfCheck, saveSettings } from "./store"

describe("runStoreSelfCheck", () => {
  it("passes", () => {
    expect(() => runStoreSelfCheck()).not.toThrow()
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
