import { describe, expect, it, vi } from "vitest";
import { runAudioSelfCheck } from "./music";
import { runSoundsSelfCheck } from "./samples";

// samples.ts imports Phaser at runtime, which needs `window`; only its types
// and one class reference are used, so a stub is enough for the pure check.
vi.mock("phaser", () => ({ Sound: class {} }));

describe("audio self-checks", () => {
  it("music passes", () => {
    expect(() => runAudioSelfCheck()).not.toThrow();
  });

  it("sounds pass", () => {
    expect(() => runSoundsSelfCheck()).not.toThrow();
  });
});
