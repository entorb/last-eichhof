import { describe, expect, it } from "vitest"
import { FOES, type FoeKind } from "./foeRosters"

const ROLES = new Set(["chaff", "miniboss", "boss"])

describe("generated foe data", () => {
  it("gives every foe a valid role, texture and non-empty path", () => {
    for (const [kind, foe] of Object.entries(FOES)) {
      expect(ROLES.has(foe.role), `${kind} role`).toBe(true)
      expect(foe.texture.length, `${kind} texture`).toBeGreaterThan(0)
      const path = foe.path ?? []
      expect(path.length, `${kind} path`).toBeGreaterThan(0)
    }
  })

  it("gives every go/shot step a positive speed and every release a valid kind", () => {
    const kinds = new Set(Object.keys(FOES) as FoeKind[])
    for (const [kind, foe] of Object.entries(FOES)) {
      for (const step of foe.path ?? []) {
        if (step.t === "go" || step.t === "shot") {
          expect(step.speed, `${kind} speed`).toBeGreaterThan(0)
        }
        if (step.t === "release") {
          expect(kinds.has(step.kind), `${kind} -> ${step.kind}`).toBe(true)
        }
      }
    }
  })
})
