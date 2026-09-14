import { describe, expect, it } from "vitest";
import {
  FOES,
  type FoeKind,
  PathRunner,
  pathFor,
  runSelfCheck,
} from "./level1";

const KINDS = Object.keys(FOES) as FoeKind[];

describe("pathFor", () => {
  it("replays the real .FOE path for every foe", () => {
    expect(KINDS.length).toBeGreaterThan(0);
    for (const kind of KINDS) {
      const path = FOES[kind].path;
      expect(path, `${kind} has a path`).toBeDefined();
      if (!path) continue;
      expect(path.length, `${kind} path length`).toBeGreaterThan(0);
      expect(pathFor(kind), `${kind} keeps its real path`).toBe(path);
    }
  });

  it("keeps the real path for invincible/transparent foes", () => {
    const special = KINDS.filter(
      (k) => FOES[k].invincible || FOES[k].transparent,
    );
    expect(special.length).toBeGreaterThan(0);
    for (const kind of special) {
      expect(pathFor(kind), `${kind} keeps its real path`).toBe(
        FOES[kind].path,
      );
    }
  });

  // Regression: level 2's invincible miniboss was overridden with EXIT_PATH,
  // so it flew straight off-screen instead of releasing its minions.
  it("keeps the invincible miniboss l1-f34 on its enter/release/retreat path", () => {
    const spec = FOES["l1-f34"];
    expect(spec.invincible).toBe(true);
    expect(pathFor("l1-f34")).toBe(spec.path);
    const releases = (spec.path ?? []).filter((s) => s.t === "release");
    expect(releases.length).toBeGreaterThan(0);
  });
});

describe("PathRunner", () => {
  it("consumes go distance over time and holds during wait", () => {
    const runner = new PathRunner(
      [
        { t: "go", dx: 100, dy: 0, speed: 100 },
        { t: "wait", ms: 1000 },
        { t: "go", dx: 0, dy: 100, speed: 100 },
      ],
      { x: 0, y: 0 },
    );
    runner.update(0.5);
    expect(runner.pos.x).toBeCloseTo(50);
    runner.update(0.5);
    expect(runner.pos.x).toBeCloseTo(100);
    runner.update(1);
    expect(runner.pos.y).toBeCloseTo(0);
    runner.update(1);
    expect(runner.pos.y).toBeCloseTo(100);
    expect(runner.done).toBe(true);
  });

  it("loops back to the mark position", () => {
    const runner = new PathRunner(
      [
        { t: "go", dx: 0, dy: 10, speed: 100 },
        { t: "mark" },
        { t: "go", dx: 10, dy: 0, speed: 100 },
        { t: "loop" },
      ],
      { x: 0, y: 0 },
    );
    for (let i = 0; i < 100; i++) runner.update(0.01);
    expect(runner.done).toBe(false);
    expect(runner.pos.x).toBeCloseTo(0);
    expect(runner.pos.y).toBeCloseTo(10);
  });

  it("terminates a bounded cycle", () => {
    const runner = new PathRunner(
      [
        { t: "go", dx: 0, dy: 10, speed: 100 },
        { t: "mark" },
        { t: "go", dx: 10, dy: 0, speed: 100 },
        { t: "cycle", times: 2 },
        { t: "go", dx: 0, dy: 10, speed: 100 },
      ],
      { x: 0, y: 0 },
    );
    for (let i = 0; i < 200; i++) runner.update(0.01);
    expect(runner.done).toBe(true);
  });

  it("emits release and shot events", () => {
    const runner = new PathRunner(
      [
        { t: "release", kind: "l1-f42", x: 1, y: 2 },
        { t: "shot", speed: 6 },
        { t: "go", dx: 5, dy: 0, speed: 100 },
      ],
      { x: 0, y: 0 },
    );
    runner.update(0.01);
    expect(runner.events.map((e) => e.t)).toEqual(["release", "shot"]);
  });
});

describe("runSelfCheck", () => {
  it("passes", () => {
    expect(() => runSelfCheck()).not.toThrow();
  });
});
