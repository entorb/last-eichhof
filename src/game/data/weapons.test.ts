import { describe, expect, it } from "vitest"
import { runWeaponsSelfCheck } from "./weapons"

describe("runWeaponsSelfCheck", () => {
  it("passes", () => {
    expect(() => runWeaponsSelfCheck()).not.toThrow()
  })
})
