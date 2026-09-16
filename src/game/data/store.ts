export type Difficulty = "easy" | "normal" | "hard";
export type GraphicsMode = "retro" | "modern";
export type ControlsMode = "auto" | "touch" | "keyboard";

export interface GameResult {
  score: number;
  level: number;
  won: boolean;
  at: number;
}

export interface Settings {
  difficulty: Difficulty;
  graphics: GraphicsMode;
  controls: ControlsMode;
  autoFire: boolean;
  music: boolean;
}

export const DIFFICULTY: Record<
  Difficulty,
  { label: string; lives: number; foeSpeed: number }
> = {
  easy: { label: "EASY", lives: 5, foeSpeed: 0.85 },
  normal: { label: "NORMAL", lives: 4, foeSpeed: 1 },
  hard: { label: "HARD", lives: 3, foeSpeed: 1.2 },
};

export const DIFFICULTY_ORDER: Difficulty[] = ["easy", "normal", "hard"];

export const GRAPHICS: Record<GraphicsMode, { label: string }> = {
  retro: { label: "RETRO" },
  modern: { label: "MODERN" },
};

export const GRAPHICS_ORDER: GraphicsMode[] = ["modern", "retro"];

export type ResultSort = "points" | "date";

const RESULTS_KEY = "eichhof.results";
const SETTINGS_KEY = "eichhof.settings";

export const DEFAULT_SETTINGS: Settings = {
  difficulty: "normal",
  graphics: "retro",
  controls: "auto",
  autoFire: false,
  music: true,
};

function isResult(v: unknown): v is GameResult {
  if (typeof v !== "object" || v === null) return false;
  const r = v as Record<string, unknown>;
  return (
    typeof r.score === "number" &&
    Number.isFinite(r.score) &&
    typeof r.level === "number" &&
    Number.isFinite(r.level) &&
    typeof r.won === "boolean" &&
    typeof r.at === "number" &&
    Number.isFinite(r.at)
  );
}

export function parseResults(raw: string | null): GameResult[] {
  if (!raw) return [];
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(data)) return [];
  return data.filter(isResult);
}

export function addResult(
  results: GameResult[],
  result: GameResult,
): GameResult[] {
  return [result, ...results];
}

// "points" ranks every game ever played by score (ties to the older run);
// "date" is newest first. The scores screen shows the whole list.
export function sortResults(
  results: GameResult[],
  sort: ResultSort,
): GameResult[] {
  return [...results].sort(
    sort === "points"
      ? (a, b) => b.score - a.score || a.at - b.at
      : (a, b) => b.at - a.at,
  );
}

export function clampScroll(
  scroll: number,
  total: number,
  rows: number,
): number {
  return Math.max(0, Math.min(Math.max(0, total - rows), scroll));
}

export function parseSettings(raw: string | null): Settings {
  if (!raw) return { ...DEFAULT_SETTINGS };
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
  if (typeof data !== "object" || data === null) return { ...DEFAULT_SETTINGS };
  const obj = data as Record<string, unknown>;
  const difficulty =
    obj.difficulty === "easy" ||
    obj.difficulty === "normal" ||
    obj.difficulty === "hard"
      ? obj.difficulty
      : DEFAULT_SETTINGS.difficulty;
  const graphics =
    obj.graphics === "retro" || obj.graphics === "modern"
      ? obj.graphics
      : DEFAULT_SETTINGS.graphics;
  const controls =
    obj.controls === "auto" ||
    obj.controls === "touch" ||
    obj.controls === "keyboard"
      ? obj.controls
      : DEFAULT_SETTINGS.controls;
  const autoFire =
    typeof obj.autoFire === "boolean"
      ? obj.autoFire
      : DEFAULT_SETTINGS.autoFire;
  const music =
    typeof obj.music === "boolean" ? obj.music : DEFAULT_SETTINGS.music;
  return { difficulty, graphics, controls, autoFire, music };
}

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage unavailable (private mode, quota) — keep playing without persistence.
  }
}

export function loadResults(): GameResult[] {
  return parseResults(safeGet(RESULTS_KEY));
}

export function saveResults(results: GameResult[]): void {
  safeSet(RESULTS_KEY, JSON.stringify(results));
}

export function recordGameResult(result: GameResult): GameResult[] {
  const next = addResult(loadResults(), result);
  saveResults(next);
  return next;
}

export function loadSettings(): Settings {
  return parseSettings(safeGet(SETTINGS_KEY));
}

export function saveSettings(settings: Settings): void {
  safeSet(SETTINGS_KEY, JSON.stringify(settings));
}

export function runStoreSelfCheck(): void {
  const assert = (cond: boolean, msg: string) => {
    if (!cond) throw new Error(`selfcheck: ${msg}`);
  };

  assert(parseResults(null).length === 0, "empty results");
  assert(parseResults("not json").length === 0, "garbage results");
  assert(parseResults(JSON.stringify({ a: 1 })).length === 0, "non-array");

  const a: GameResult = { score: 10, level: 1, won: false, at: 1 };
  const b: GameResult = { score: 30, level: 1, won: true, at: 2 };
  const c: GameResult = { score: 20, level: 1, won: false, at: 3 };
  const list = addResult(addResult(addResult([], a), b), c);
  assert(list.length === 3, "addResult size");
  assert(list[0] === c, "newest first");

  const byPoints = sortResults(list, "points");
  assert(
    byPoints[0].score === 30 && byPoints[1].score === 20,
    "points sort order",
  );
  assert(byPoints.length === 3, "points sort keeps all results");
  const byDate = sortResults(list, "date");
  assert(byDate[0] === c && byDate[2] === a, "date sort newest first");

  const tie1: GameResult = { score: 20, level: 1, won: false, at: 9 };
  const tie2: GameResult = { score: 20, level: 1, won: false, at: 4 };
  assert(
    sortResults([tie1, tie2], "points")[0] === tie2,
    "tie breaks to older result",
  );

  assert(clampScroll(0, 0, 10) === 0, "scroll empty");
  assert(clampScroll(5, 3, 10) === 0, "scroll clamps high");
  assert(clampScroll(-1, 50, 10) === 0, "scroll clamps low");
  assert(clampScroll(100, 50, 10) === 40, "scroll clamps to max");
  assert(clampScroll(3, 50, 10) === 3, "scroll keeps in range");

  const many = Array.from({ length: 120 }, (_, i) => ({
    score: i,
    level: 1,
    won: false,
    at: i,
  }));
  assert(addResult(many, a).length === 121, "results not capped");

  assert(parseSettings(null).difficulty === "normal", "default settings");
  assert(parseSettings("garbage").difficulty === "normal", "bad settings");
  assert(
    parseSettings(JSON.stringify({ difficulty: "hard" })).difficulty === "hard",
    "valid settings",
  );
  assert(
    parseSettings(JSON.stringify({ difficulty: "nope" })).difficulty ===
      "normal",
    "invalid difficulty",
  );
  assert(
    parseSettings(JSON.stringify({ difficulty: "hard" })).graphics === "retro",
    "graphics defaults retro",
  );
  assert(
    parseSettings(JSON.stringify({ graphics: "retro" })).graphics === "retro",
    "valid graphics",
  );
  assert(
    parseSettings(JSON.stringify({ graphics: "nope" })).graphics === "retro",
    "invalid graphics",
  );
  assert(
    parseSettings(JSON.stringify({ difficulty: "hard", graphics: "retro" }))
      .difficulty === "hard",
    "keeps difficulty with graphics",
  );
  assert(parseSettings(null).controls === "auto", "controls defaults auto");
  assert(
    parseSettings(JSON.stringify({ controls: "touch" })).controls === "touch",
    "valid controls",
  );
  assert(
    parseSettings(JSON.stringify({ controls: "nope" })).controls === "auto",
    "invalid controls",
  );
  assert(parseSettings(null).autoFire === false, "auto-fire defaults off");
  assert(
    parseSettings(JSON.stringify({ autoFire: true })).autoFire === true,
    "valid auto-fire",
  );
  assert(
    parseSettings(JSON.stringify({ autoFire: "yes" })).autoFire === false,
    "invalid auto-fire",
  );
  assert(parseSettings(null).music === true, "music defaults on");
  assert(
    parseSettings(JSON.stringify({ music: false })).music === false,
    "valid music",
  );
  assert(
    parseSettings(JSON.stringify({ music: "yes" })).music === true,
    "invalid music",
  );
}
