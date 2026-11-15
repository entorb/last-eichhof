import { describe, expect, it } from "vitest"
import { runWeaponsSelfCheck } from "./weapons.ts"

describe("runWeaponsSelfCheck", () => {
  it("passes", () => {
    expect(() => runWeaponsSelfCheck()).not.toThrow()
  })
})
