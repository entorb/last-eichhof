import { FOES, type FoeKind } from "./foeRosters";
import { at } from "./lookup";

export type Vec = { x: number; y: number };

export type PathStep =
  | { t: "go"; dx: number; dy: number; speed: number }
  | { t: "line"; x: number; y: number; speed: number }
  | { t: "home"; speed: number; ms: number }
  | { t: "wait"; ms: number }
  | { t: "mark" }
  | { t: "loop" }
  | { t: "cycle"; times: number }
  | { t: "spawn"; kind: FoeKind }
  | { t: "sprite"; texture: string }
  | { t: "release"; kind: FoeKind; x: number; y: number }
  | { t: "shot"; speed: number };

export type PathEvent =
  | { t: "spawn"; kind: FoeKind }
  | { t: "sprite"; texture: string }
  | { t: "release"; kind: FoeKind; x: number; y: number }
  | { t: "shot"; speed: number };

type CmdState =
  | { kind: "none" }
  | { kind: "wait"; remaining: number }
  | { kind: "go"; remaining: number; ux: number; uy: number; speed: number }
  | { kind: "line"; x: number; y: number; speed: number }
  | { kind: "home"; remaining: number; speed: number };

export class PathRunner {
  pos: Vec;
  done = false;
  events: PathEvent[] = [];
  private cursor = 0;
  private markCursor = 0;
  private markPos: Vec | null = null;
  private readonly loops = new Map<number, number>();
  private state: CmdState = { kind: "none" };

  constructor(
    private readonly steps: PathStep[],
    start: Vec,
  ) {
    this.pos = { x: start.x, y: start.y };
  }

  update(dt: number, target?: Vec): boolean {
    if (this.done) return false;
    if (this.state.kind === "none") this.enter();
    let budget = dt;
    let guard = 0;
    while (budget > 0 && !this.done && guard++ < 256) {
      const s = this.state;
      if (s.kind === "none") break;
      budget = this.step(s, budget, target);
    }
    return !this.done;
  }

  private advance(): void {
    this.cursor++;
    this.enter();
  }

  private step(s: CmdState, budget: number, target?: Vec): number {
    switch (s.kind) {
      case "wait":
        return this.stepWait(s, budget);
      case "home":
        return this.stepHome(s, budget, target);
      case "go":
        return this.stepGo(s, budget);
      case "line":
        return this.stepLine(s, budget);
      // "none" is unreachable: update() bails on it before calling step.
      default:
        return budget;
    }
  }

  private stepWait(
    s: Extract<CmdState, { kind: "wait" }>,
    budget: number,
  ): number {
    const use = Math.min(budget, s.remaining / 1000);
    s.remaining -= use * 1000;
    if (s.remaining <= 0.001) this.advance();
    return budget - use;
  }

  private stepHome(
    s: Extract<CmdState, { kind: "home" }>,
    budget: number,
    target?: Vec,
  ): number {
    const use = Math.min(budget, s.remaining / 1000);
    if (target) {
      const dx = target.x - this.pos.x;
      const dy = target.y - this.pos.y;
      const dist = Math.hypot(dx, dy) || 1;
      this.pos.x += (dx / dist) * s.speed * use;
      this.pos.y += (dy / dist) * s.speed * use;
    } else {
      this.pos.y += s.speed * use;
    }
    s.remaining -= use * 1000;
    if (s.remaining <= 0.001) this.advance();
    return budget - use;
  }

  private stepGo(s: Extract<CmdState, { kind: "go" }>, budget: number): number {
    const step = Math.min(s.speed * budget, s.remaining);
    this.pos.x += s.ux * step;
    this.pos.y += s.uy * step;
    s.remaining -= step;
    if (s.remaining <= 0.001) this.advance();
    return budget - step / s.speed;
  }

  private stepLine(
    s: Extract<CmdState, { kind: "line" }>,
    budget: number,
  ): number {
    const dx = s.x - this.pos.x;
    const dy = s.y - this.pos.y;
    const dist = Math.hypot(dx, dy);
    if (dist <= 0.5) {
      this.advance();
      return budget;
    }
    const step = Math.min(s.speed * budget, dist);
    this.pos.x += (dx / dist) * step;
    this.pos.y += (dy / dist) * step;
    if (dist - step <= 0.5) this.advance();
    return budget - step / s.speed;
  }

  private enter(): void {
    let guard = 0;
    while (guard++ < 64) {
      const step = this.steps[this.cursor];
      if (!step) {
        this.done = true;
        this.state = { kind: "none" };
        return;
      }
      if (this.applyControl(step)) continue;
      this.setMotionState(step);
      return;
    }
    this.done = true;
  }

  /** Event/control steps (mark, loop, cycle, spawn, sprite, release, shot).
   *  Returns true when the step was consumed and the command cursor advanced. */
  private applyControl(step: PathStep): boolean {
    switch (step.t) {
      case "mark":
        this.markCursor = this.cursor + 1;
        this.markPos = { x: this.pos.x, y: this.pos.y };
        this.cursor++;
        return true;
      case "loop":
        this.cursor = this.markCursor;
        if (this.markPos) this.pos = { ...this.markPos };
        return true;
      case "cycle": {
        const used = this.loops.get(this.cursor) ?? 0;
        if (used >= step.times) {
          this.cursor++;
          return true;
        }
        this.loops.set(this.cursor, used + 1);
        this.cursor = this.markCursor;
        if (this.markPos) this.pos = { ...this.markPos };
        return true;
      }
      case "spawn":
        this.events.push({ t: "spawn", kind: step.kind });
        this.cursor++;
        return true;
      case "sprite":
        this.events.push({ t: "sprite", texture: step.texture });
        this.cursor++;
        return true;
      case "release":
        this.events.push({
          t: "release",
          kind: step.kind,
          x: step.x,
          y: step.y,
        });
        this.cursor++;
        return true;
      case "shot":
        this.events.push({ t: "shot", speed: step.speed });
        this.cursor++;
        return true;
      default:
        return false;
    }
  }

  /** Motion steps become a state that update() advances; defaults to home. */
  private setMotionState(step: PathStep): void {
    switch (step.t) {
      case "wait":
        this.state = { kind: "wait", remaining: step.ms };
        return;
      case "go": {
        const len = Math.hypot(step.dx, step.dy) || 1;
        this.state = {
          kind: "go",
          remaining: len,
          ux: step.dx / len,
          uy: step.dy / len,
          speed: step.speed,
        };
        return;
      }
      case "line":
        this.state = { kind: "line", x: step.x, y: step.y, speed: step.speed };
        return;
      case "home":
        this.state = { kind: "home", remaining: step.ms, speed: step.speed };
    }
  }
}

function weave(speed: number): PathStep[] {
  return [
    { t: "go", dx: 0, dy: 150, speed },
    { t: "mark" },
    { t: "go", dx: 100, dy: 0, speed: speed + 20 },
    { t: "go", dx: -100, dy: 0, speed: speed + 20 },
    { t: "loop" },
  ];
}

function diver(speed: number): PathStep[] {
  return [
    { t: "home", speed, ms: 2200 },
    { t: "go", dx: 0, dy: 900, speed: speed + 110 },
  ];
}

function zig(speed: number): PathStep[] {
  return [
    { t: "go", dx: 50, dy: 170, speed },
    { t: "go", dx: -100, dy: 200, speed },
    { t: "go", dx: 50, dy: 900, speed: speed + 90 },
  ];
}

function miniboss(speed: number): PathStep[] {
  return [
    { t: "go", dx: 0, dy: 320, speed },
    { t: "mark" },
    { t: "go", dx: 160, dy: 0, speed },
    { t: "go", dx: -160, dy: 0, speed },
    { t: "cycle", times: 4 },
    { t: "go", dx: 0, dy: 900, speed: speed + 170 },
  ];
}

const CHAFF_PATHS: PathStep[][] = [weave(190), diver(200), zig(240)];
const MINIBOSS_PATH = miniboss(85);
// Fallback for a foe with no real `.FOE` path (all extracted foes have one).
// Invincible/transparent foes can't be shot down, so the path must lead them
// off the screen; the level still ends because `Game` only needs `bossesLeft`.
const EXIT_PATH: PathStep[] = [
  { t: "go", dx: 0, dy: 300, speed: 150 },
  { t: "go", dx: 0, dy: 900, speed: 320 },
];
const BOSS_PATH: PathStep[] = [
  { t: "go", dx: 0, dy: 320, speed: 90 },
  { t: "mark" },
  { t: "go", dx: 180, dy: 0, speed: 70 },
  { t: "go", dx: -180, dy: 0, speed: 70 },
  { t: "loop" },
];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++)
    h = (h * 31 + (s.codePointAt(i) ?? 0)) >>> 0;
  return h;
}

export function pathFor(kind: FoeKind): PathStep[] {
  const spec = FOES[kind];
  // Always replay the original `.FOE` path when there is one. This includes
  // invincible/transparent foes (e.g. level 2's invincible miniboss `l1-f34`):
  // they keep their real enter/release/exit path instead of a generic exit.
  if (spec.path && spec.path.length > 0) return spec.path;
  if (spec.role === "boss") return BOSS_PATH;
  if (spec.invincible || spec.transparent) return EXIT_PATH;
  if (spec.role === "miniboss") return MINIBOSS_PATH;
  return at(CHAFF_PATHS, hash(kind) % CHAFF_PATHS.length);
}

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(`selfcheck: ${msg}`);
}

function checkPathStep(kind: FoeKind, s: PathStep, kinds: FoeKind[]): void {
  if (s.t === "go") {
    assert(s.speed > 0 && Number.isFinite(s.speed), `speed for ${kind}`);
  }
  if (s.t === "release") {
    assert(kinds.includes(s.kind), `release kind for ${kind}`);
  }
  if (s.t === "shot") {
    assert(s.speed > 0, `shot speed for ${kind}`);
  }
}

export function runPathSelfCheck(): void {
  const p = new PathRunner(
    [
      { t: "go", dx: 100, dy: 0, speed: 100 },
      { t: "wait", ms: 1000 },
      { t: "go", dx: 0, dy: 100, speed: 100 },
    ],
    { x: 0, y: 0 },
  );
  p.update(0.5);
  assert(Math.abs(p.pos.x - 50) < 0.001, `go half x=${p.pos.x}`);
  p.update(0.5);
  assert(Math.abs(p.pos.x - 100) < 0.001, `go full x=${p.pos.x}`);
  p.update(1);
  assert(Math.abs(p.pos.y) < 0.001 && !p.done, "wait held y");
  p.update(1);
  assert(Math.abs(p.pos.y - 100) < 0.001, `go y=${p.pos.y}`);
  assert(p.done, "path done");

  const loop = new PathRunner(
    [
      { t: "go", dx: 0, dy: 10, speed: 100 },
      { t: "mark" },
      { t: "go", dx: 10, dy: 0, speed: 100 },
      { t: "loop" },
    ],
    { x: 0, y: 0 },
  );
  for (let i = 0; i < 100; i++) loop.update(0.01);
  assert(!loop.done, "loop does not terminate");

  const cycle = new PathRunner(
    [
      { t: "go", dx: 0, dy: 10, speed: 100 },
      { t: "mark" },
      { t: "go", dx: 10, dy: 0, speed: 100 },
      { t: "cycle", times: 2 },
      { t: "go", dx: 0, dy: 10, speed: 100 },
    ],
    { x: 0, y: 0 },
  );
  for (let i = 0; i < 200; i++) cycle.update(0.01);
  assert(cycle.done, "bounded cycle terminates");

  const cmds = new PathRunner(
    [
      { t: "sprite", texture: "explosion" },
      { t: "go", dx: 5, dy: 0, speed: 100 },
    ],
    { x: 0, y: 0 },
  );
  cmds.update(0.01);
  assert(cmds.events.length === 1, `one event got ${cmds.events.length}`);
  const ev = cmds.events[0];
  assert(ev?.t === "sprite" && ev.texture === "explosion", "sprite event");

  const kinds = Object.keys(FOES) as FoeKind[];
  assert(kinds.length > 0, "foes defined");
  for (const k of kinds) {
    // DOS stores the raw signed score: a boss can be negative, chaff can be 0.
    assert(Number.isFinite(FOES[k].score), `score for ${k}`);
    assert(FOES[k].texture.length > 0, `texture for ${k}`);
    const path = FOES[k].path ?? [];
    assert(path.length > 0, `path for ${k}`);
    for (const s of path) checkPathStep(k, s, kinds);
    assert(pathFor(k).length > 0, `pathFor ${k}`);
    // Every extracted foe has a real path, so `pathFor` must replay it
    // verbatim — invincible/transparent/boss included.
    assert(pathFor(k) === FOES[k].path, `real path kept for ${k}`);
  }

  const events = new PathRunner(
    [
      { t: "go", dx: 10, dy: 0, speed: 100 },
      { t: "mark" },
      { t: "shot", speed: 6 },
      { t: "release", kind: at(kinds, 0), x: 3, y: -3 },
      { t: "loop" },
    ],
    { x: 0, y: 0 },
  );
  events.update(0.2);
  const eventTypes = new Set(events.events.map((e) => e.t));
  assert(eventTypes.has("shot"), "shot event");
  assert(eventTypes.has("release"), "release event");
  assert(
    Math.abs(events.pos.x - 10) < 0.001,
    `loop resets to mark x=${events.pos.x}`,
  );
  assert(
    Math.abs(events.pos.y) < 0.001,
    `loop resets to mark y=${events.pos.y}`,
  );
}
