import { describe, expect, it } from "vitest";
import { runUiIconsSelfCheck, UI_ICON_KEYS, UI_ICONS } from "./uiIcons";

describe("uiIcons", () => {
  it("exposes a unique, prefixed key per icon", () => {
    expect(new Set(UI_ICON_KEYS).size).toBe(UI_ICON_KEYS.length);
    for (const key of UI_ICON_KEYS) {
      expect(key.startsWith("ui-")).toBe(true);
    }
    expect(Object.values(UI_ICONS)).toEqual(UI_ICON_KEYS);
  });

  it("passes its self-check", () => {
    expect(() => runUiIconsSelfCheck()).not.toThrow();
  });
});
