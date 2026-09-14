import { describe, expect, it } from "vitest";
import {
  type MoveKeys,
  moveVector,
  resolveTouchControls,
  runControlsSelfCheck,
} from "./controls";

const none: MoveKeys = {
  left: false,
  right: false,
  up: false,
  down: false,
};

describe("resolveTouchControls", () => {
  it("honours explicit modes regardless of device", () => {
    expect(resolveTouchControls("touch", false)).toBe(true);
    expect(resolveTouchControls("keyboard", true)).toBe(false);
  });

  it("auto follows the device touch flag", () => {
    expect(resolveTouchControls("auto", true)).toBe(true);
    expect(resolveTouchControls("auto", false)).toBe(false);
  });
});

describe("moveVector", () => {
  it("is zero with no input", () => {
    expect(moveVector(none, { x: 0, y: 0 })).toEqual({ x: 0, y: 0 });
  });

  it("normalizes keyboard diagonals", () => {
    const v = moveVector({ ...none, right: true, down: true }, { x: 0, y: 0 });
    expect(Math.hypot(v.x, v.y)).toBeCloseTo(1);
    expect(v.x).toBeCloseTo(Math.SQRT1_2);
  });

  it("passes analog stick values through below full tilt", () => {
    expect(moveVector(none, { x: 0.5, y: 0 })).toEqual({ x: 0.5, y: 0 });
  });

  it("clamps combined keyboard + stick to unit length", () => {
    const v = moveVector({ ...none, right: true }, { x: 1, y: 0 });
    expect(Math.hypot(v.x, v.y)).toBeCloseTo(1);
  });
});

describe("runControlsSelfCheck", () => {
  it("passes", () => {
    expect(() => runControlsSelfCheck()).not.toThrow();
  });
});
