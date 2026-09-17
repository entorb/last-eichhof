// Extract original DOS graphics from beer_exe/BEER.DAT into PNGs and generate
// the per-level enemy rosters/spawn schedules used by the web rewrite.
// See docs/beer_dat.md for the file formats.
//
// Usage:
//   node scripts/extract-sprites.mjs            write PNGs + contact sheet + TS data
//   node scripts/extract-sprites.mjs --catalog  also print an ASCII/colour catalog
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { encodePng } from "./lib/png.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DAT = resolve(ROOT, "beer_exe/BEER.DAT");
const XMODEC = resolve(ROOT, "beer_src/XMODEC.C");
const MAP = resolve(ROOT, "scripts/enemy-map.json");
const OUT_DIR = resolve(ROOT, "public/assets/enemies");
const SHEETS_OUT = resolve(ROOT, "src/game/data/enemySprites.ts");
const ROSTERS_OUT = resolve(ROOT, "src/game/data/foeRosters.ts");

const CATALOG = process.argv.includes("--catalog");
const LEVELS = 5;

// --- archive ---------------------------------------------------------------

const HDR_SIZE = 30;
const DIR_ENTRY = 24;

function parseArchive(buf) {
  const count = buf.readUInt16LE(HDR_SIZE + 2);
  const files = new Map();
  for (let i = 0; i < count; i++) {
    const off = HDR_SIZE + 4 + i * DIR_ENTRY;
    const name = buf
      .subarray(off, off + 14)
      .toString("latin1")
      .split("\0")[0]
      .toUpperCase();
    const size = buf.readUInt32LE(off + 14);
    const fptr = buf.readUInt32LE(off + 20);
    files.set(name, buf.subarray(fptr, fptr + size));
  }
  return files;
}

// --- sprite library (.SLI) -------------------------------------------------

function unpackPtr(packed) {
  return (packed >>> 16) * 16 + (packed & 0xffff);
}

function decodeSli(buf) {
  const count = buf.readUInt16LE(0);
  const sprites = [];
  for (let i = 0; i < count; i++) {
    const packed = buf.readUInt32LE(2 + i * 6);
    const flags = buf.readUInt16LE(2 + i * 6 + 4);
    const base = 2 + unpackPtr(packed);
    const xs = buf.readUInt16LE(base);
    const ys = buf.readUInt16LE(base + 2);
    const maxn = buf.readUInt16LE(base + 4);
    const data = buf.subarray(base + 6, base + 6 + xs * ys * maxn);
    sprites.push({ xs, ys, maxn, flags, data });
  }
  return sprites;
}

// --- foe library (.FOE) ----------------------------------------------------

// Path commands: 0x8000 END, 0x8001 SPRITE(+1), 0x8002 RELEASE(+3),
// 0x8004 CYCLE, 0x8005 MARK, 0x8006 SOUND(+1), else (dx,dy) pair.
// Each (dx,dy) pair is one 20 Hz frame of movement. CYCLE jumps back to the
// last MARK (the DOS engine resets the object to the MARK position), so the
// data after CYCLE is unreachable and decoding stops there.
function decodePath(buf, start) {
  const cmds = [];
  let pos = start;
  while (pos + 2 <= buf.length) {
    const w = buf.readUInt16LE(pos);
    pos += 2;
    if ((w & 0xfff0) === 0x8000) {
      if (w === 0x8000 || w === 0x8004) {
        if (w === 0x8004) cmds.push({ k: "cycle" });
        break;
      }
      if (w === 0x8001) {
        cmds.push({ k: "sprite", index: buf.readUInt16LE(pos) });
        pos += 2;
      } else if (w === 0x8002) {
        cmds.push({
          k: "release",
          foe: buf.readUInt16LE(pos),
          dx: buf.readInt16LE(pos + 2),
          dy: buf.readInt16LE(pos + 4),
        });
        pos += 6;
      } else if (w === 0x8005) {
        cmds.push({ k: "mark" });
      } else if (w === 0x8006) {
        cmds.push({ k: "sound", index: buf.readUInt16LE(pos) });
        pos += 2;
      } else break;
    } else {
      cmds.push({ k: "move", dx: (w << 16) >> 16, dy: buf.readInt16LE(pos) });
      pos += 2;
    }
  }
  return cmds;
}

function parseFoe(buf) {
  const count = buf.readUInt16LE(0);
  const foes = [];
  for (let i = 0; i < count; i++) {
    const base = 2 + unpackPtr(buf.readUInt32LE(2 + i * 4));
    foes.push({
      flags: buf.readInt16LE(base),
      shield: buf.readInt16LE(base + 2),
      score: buf.readInt16LE(base + 4),
      expl: buf.readInt16LE(base + 6),
      sprite: buf.readInt16LE(base + 8),
      speed: buf.readInt16LE(base + 10),
      path: base + 12,
    });
  }
  return foes;
}

// --- attack table (.TBL) ---------------------------------------------------

function parseTbl(buf) {
  const count = buf.readUInt16LE(0);
  const entries = [];
  for (let i = 0; i < count; i++) {
    const base = 2 + i * 8;
    entries.push({
      at: buf.readUInt16LE(base),
      x: buf.readInt16LE(base + 2),
      y: buf.readInt16LE(base + 4),
      foe: buf.readUInt16LE(base + 6),
    });
  }
  return entries;
}

// --- level description (.DSC) ----------------------------------------------

function parseDsc(buf) {
  return {
    text: buf
      .subarray(2, 42)
      .toString("latin1")
      .split("\0")[0]
      .replace(/\s+/g, " ")
      .trim(),
    nbigboss: buf.readInt16LE(42),
    score: buf.readUInt16LE(44),
    money: buf.readUInt16LE(46),
  };
}

// --- explosion sprites (.EXP) ----------------------------------------------

function parseExplosionSprites(buf) {
  const count = buf.readUInt16LE(0);
  const sprites = new Set();
  for (let i = 0; i < count; i++) {
    let pos = 2 + unpackPtr(buf.readUInt32LE(2 + i * 4));
    while (pos + 2 <= buf.length) {
      const w = buf.readUInt16LE(pos);
      pos += 2;
      if (w === 0x8000) break;
      if (w === 0x8001) {
        sprites.add(buf.readUInt16LE(pos));
        pos += 6;
      } else if (w === 0x8003) pos += 2;
      else if (w === 0x8005) pos += 6;
      else if (w === 0x8006) pos += 10;
    }
  }
  return sprites;
}

// --- palette ---------------------------------------------------------------

function parsePalette() {
  const src = readFileSync(XMODEC, "utf8");
  const m = src.match(/standardpal\[PALETTESIZE\]\s*=\s*\{([\s\S]*?)\};/);
  if (!m) throw new Error("standardpal not found in XMODEC.C");
  const bytes = [...m[1].matchAll(/0x([0-9a-fA-F]{2})/g)].map((x) =>
    Number.parseInt(x[1], 16),
  );
  if (bytes.length !== 768)
    throw new Error(`palette has ${bytes.length} bytes`);
  const pal = [];
  for (let i = 0; i < 256; i++) {
    const v = (c) => ((c << 2) | (c >> 4)) & 0xff;
    pal.push([v(bytes[i * 3]), v(bytes[i * 3 + 1]), v(bytes[i * 3 + 2])]);
  }
  return pal;
}

// --- rendering -------------------------------------------------------------

function renderSprite(sprite, pal, scale) {
  const { xs, ys, maxn, data } = sprite;
  const sw = xs * scale;
  const w = xs * maxn * scale;
  const h = ys * scale;
  const rgba = Buffer.alloc(w * h * 4);
  for (let f = 0; f < maxn; f++) {
    for (let y = 0; y < ys; y++) {
      for (let x = 0; x < xs; x++) {
        const idx = data[(f * ys + y) * xs + x];
        if (idx === 0) continue;
        const [r, g, b] = pal[idx];
        for (let sy = 0; sy < scale; sy++) {
          for (let sx = 0; sx < scale; sx++) {
            const px = (f * sw + x * scale + sx) * 4;
            const py = (y * scale + sy) * w * 4;
            rgba[py + px] = r;
            rgba[py + px + 1] = g;
            rgba[py + px + 2] = b;
            rgba[py + px + 3] = 255;
          }
        }
      }
    }
  }
  return { width: w, height: h, rgba };
}

// --- catalog (human inspection) -------------------------------------------

const RAMP = " .:-=+*#%@";

function catalog(libs, pal) {
  const lum = pal.map(([r, g, b]) => (0.299 * r + 0.587 * g + 0.114 * b) / 255);
  const ch = (i) =>
    i === 0 ? " " : RAMP[Math.max(1, Math.min(9, Math.round(lum[i] * 9)))];
  for (const [name, sprites] of libs) {
    console.log(`\n===== ${name} (${sprites.length} sprites) =====`);
    sprites.forEach((s, i) => {
      const double = (s.flags & 0x08) !== 0;
      console.log(
        `--- [${i}] ${s.xs}x${s.ys} frames=${s.maxn} flags=${s.flags.toString(16)} ${double ? "10fps" : "20fps"} ---`,
      );
      if (s.xs > 60 || s.ys > 60) {
        console.log("    (too large for ascii)");
        return;
      }
      for (let y = 0; y < s.ys; y++) {
        let line = "    ";
        for (let x = 0; x < s.xs; x++) line += ch(s.data[y * s.xs + x]);
        console.log(line);
      }
    });
  }
}

// --- main ------------------------------------------------------------------

const archive = parseArchive(readFileSync(DAT));
const pal = parsePalette();
const getRaw = (name) => {
  const raw = archive.get(name);
  if (!raw) throw new Error(`missing ${name}`);
  return raw;
};
const sliCache = new Map();
const getLib = (level) => {
  const key = level === "WEAPONS" ? "WEAPONS.SLI" : `LEVEL${level}.SLI`;
  if (!sliCache.has(key)) sliCache.set(key, decodeSli(getRaw(key)));
  return sliCache.get(key);
};

if (CATALOG) {
  catalog(
    ["WEAPONS", 0, 1, 2, 3, 4].map((n) => [
      n === "WEAPONS" ? "WEAPONS" : `LEVEL${n}`,
      getLib(n),
    ]),
    pal,
  );
}

const map = JSON.parse(readFileSync(MAP, "utf8"));
const scale = map.scale ?? 3;
mkdirSync(OUT_DIR, { recursive: true });

const sheets = [];
const written = new Set();

function emitSprite(key, level, index) {
  if (written.has(key)) return;
  const sprite = getLib(level)[index];
  if (!sprite) throw new Error(`${key}: ${level} has no sprite ${index}`);
  const { width, height, rgba } = renderSprite(sprite, pal, scale);
  writeFileSync(resolve(OUT_DIR, `${key}.png`), encodePng(width, height, rgba));
  const double = (sprite.flags & 0x08) !== 0;
  sheets.push({
    key,
    file: `assets/enemies/${key}.png`,
    frameWidth: sprite.xs * scale,
    frameHeight: sprite.ys * scale,
    frames: sprite.maxn,
    frameRate: double ? 10 : 20,
  });
  written.add(key);
}

// Fixed extras (ship + shared explosion).
for (const entry of map.extras) {
  emitSprite(entry.key, entry.level, entry.sprite);
}

// Shop weapon sprites (WEAPONS.SLI): the bottles mounted next to the ship.
// Emitted under `wpn-<id>` so the shop, HUD and the in-game mounts share them.
for (const [id, index] of Object.entries(map.weaponSprites ?? {})) {
  emitSprite(`wpn-${id}`, "WEAPONS", index);
}

// Projectile sprites (WEAPONS.SLI): `shotstrc.sprite` in WPNPATH.C. Emitted
// under `shot-<index>`; some are animated (lager, can33).
for (const index of map.shotSprites ?? []) {
  emitSprite(`shot-${index}`, "WEAPONS", index);
}

// --- build per-level rosters from .TBL/.FOE/.EXP/.DSC ----------------------

const COMMAND = {
  32768: "fieldOn",
  32769: "fieldOff",
  32771: "mark",
};

function roleFor(foe) {
  // The DOS "big boss" flag is not set on every end-of-level monster; the
  // final boss of a level carries a negative score instead.
  if (foe.flags & 0x01 || foe.score < 0) return "boss";
  if (foe.shield >= 15) return "miniboss";
  return "chaff";
}

// Replay a `.FOE` path into the web step list. Consecutive identical (dx,dy)
// frames are merged into one straight `go` (same 20 Hz timing), coords ×scale.
function buildFoePath(foe, level, foebuf, foes, valid) {
  const steps = [];
  let run = null;
  const flush = () => {
    if (!run) return;
    if (run.dx === 0 && run.dy === 0) {
      steps.push({ t: "wait", ms: run.count * 50 });
    } else {
      steps.push({
        t: "go",
        dx: run.dx * run.count * scale,
        dy: run.dy * run.count * scale,
        speed: Math.round(Math.hypot(run.dx, run.dy) * scale * 20 * 100) / 100,
      });
    }
    run = null;
  };
  for (const c of decodePath(foebuf, foe.path)) {
    if (c.k === "move") {
      if (run && run.dx === c.dx && run.dy === c.dy) run.count++;
      else {
        flush();
        run = { dx: c.dx, dy: c.dy, count: 1 };
      }
      continue;
    }
    flush();
    if (c.k === "mark") {
      steps.push({ t: "mark" });
    } else if (c.k === "cycle") {
      steps.push({ t: "loop" });
    } else if (c.k === "sprite") {
      const key = `l${level}-s${c.index}`;
      emitSprite(key, level, c.index);
      steps.push({ t: "sprite", texture: key });
    } else if (c.k === "release") {
      const rf = foes[c.foe];
      if (rf && rf.flags & 0x20) {
        // FOE_LINE: an aimed projectile (DOS line mode, speed px/tick).
        steps.push({ t: "shot", speed: rf.speed });
      } else if (rf && valid.has(c.foe) && roleFor(rf) !== "boss") {
        steps.push({
          t: "release",
          kind: `l${level}-f${c.foe}`,
          x: c.dx * scale,
          y: c.dy * scale,
        });
      }
    }
  }
  flush();
  return steps;
}

const roster = [];
const levels = [];

for (let level = 0; level < LEVELS; level++) {
  const foebuf = getRaw(`LEVEL${level}.FOE`);
  const foes = parseFoe(foebuf);
  const tbl = parseTbl(getRaw(`LEVEL${level}.TBL`));
  const explosions = parseExplosionSprites(getRaw(`LEVEL${level}.EXP`));
  const dsc = parseDsc(getRaw(`LEVEL${level}.DSC`));

  // Collect every foe reachable from the attack table (including released minions).
  const referenced = new Set();
  const queue = [];
  for (const e of tbl) {
    if (e.foe < 0x8000 && !referenced.has(e.foe)) {
      referenced.add(e.foe);
      queue.push(e.foe);
    }
  }
  while (queue.length) {
    const foe = foes[queue.pop()];
    if (!foe) continue;
    for (const c of decodePath(foebuf, foe.path)) {
      if (c.k === "release" && !referenced.has(c.foe)) {
        referenced.add(c.foe);
        queue.push(c.foe);
      }
    }
  }

  // Non-projectile, non-explosion foes form the roster.
  const valid = new Set();
  for (const fi of referenced) {
    const foe = foes[fi];
    if (!foe) continue;
    if (foe.flags & 0x20) continue; // FOE_LINE = projectile
    if (explosions.has(foe.sprite)) continue; // explosion animation
    valid.add(fi);
  }

  // One kind per valid foe. Movement, minion releases and projectiles all
  // come from the foe's own path (`buildFoePath`), exactly like DOS.
  const kinds = new Map();
  for (const fi of [...valid].sort((a, b) => a - b)) {
    const foe = foes[fi];
    const role = roleFor(foe);
    const kind = `l${level}-f${fi}`;
    const texture = `l${level}-s${foe.sprite}`;
    emitSprite(texture, level, foe.sprite);
    const spec = {
      texture,
      // Raw DOS `.FOE` shield: DOS `foehit` subtracts shot power from it.
      shield: foe.shield,
      // DOS adds the raw signed `foe.score` (GAMEASM.ASM `add score`), so a
      // boss with a negative score subtracts on death. Do not clamp.
      score: foe.score,
      role,
      invincible: (foe.flags & 0x02) !== 0 || undefined,
      transparent: (foe.flags & 0x04) !== 0 || undefined,
      path: buildFoePath(foe, level, foebuf, foes, valid),
    };
    kinds.set(kind, spec);
    roster.push({ kind, spec });
  }

  // Attack schedule (frame count / 20 Hz → seconds, coords ×3).
  const firstKind = kinds.keys().next().value ?? "l0-f0";
  const spawns = [];
  const marks = [];
  let bosses = 0;
  let firstBossAt = Number.POSITIVE_INFINITY;
  for (const e of tbl) {
    const at = e.at / 20;
    if (e.foe >= 0x8000) {
      const cmd = COMMAND[e.foe];
      if (!cmd) continue;
      spawns.push({ at, x: 0, y: 0, kind: firstKind, cmd });
      if (cmd === "mark") marks.push(at);
      continue;
    }
    const kind = `l${level}-f${e.foe}`;
    if (!kinds.has(kind)) continue;
    spawns.push({ at, x: e.x * scale, y: e.y * scale, kind });
    if (kinds.get(kind).role === "boss") {
      bosses++;
      firstBossAt = Math.min(firstBossAt, at);
    }
  }
  const checkpoints = marks
    .filter((t) => t < firstBossAt)
    .sort((a, b) => a - b);

  levels.push({
    name: dsc.text,
    // DOS `initlevel` adds these at level start (GAMEPLAY.C).
    bonusScore: dsc.score,
    bonusMoney: dsc.money,
    spawns,
    checkpoints,
    bosses,
  });
}

// contact sheet -------------------------------------------------------------

const cells = sheets
  .map(
    (s) => `    <figure>
      <img src="${s.key}.png" alt="${s.key}">
      <figcaption>${s.key}<br>${s.frameWidth}×${s.frameHeight} · ${s.frames}f · ${s.frameRate}fps</figcaption>
    </figure>`,
  )
  .join("\n");
writeFileSync(
  resolve(OUT_DIR, "contact.html"),
  `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>BEER.DAT sprite contact sheet</title>
<style>
  body { background:#111; color:#eee; font:14px monospace; margin:24px; }
  main { display:flex; flex-wrap:wrap; gap:18px; }
  figure { margin:0; background:#000; border:1px solid #333; padding:8px; text-align:center; }
  img { image-rendering: pixelated; background:#222; display:block; margin:0 auto 6px; }
  figcaption { font-size:11px; color:#9fe0ff; }
</style>
</head>
<body>
<h1>BEER.DAT sprite contact sheet</h1>
<main>
${cells}
</main>
</body>
</html>
`,
);

// generated TS metadata -----------------------------------------------------

writeFileSync(
  SHEETS_OUT,
  `// Generated by scripts/extract-sprites.mjs from scripts/enemy-map.json.
// Do not edit by hand; edit the map and re-run the script.
export interface SpriteSheetDef {
	key: string;
	file: string;
	frameWidth: number;
	frameHeight: number;
	frames: number;
	frameRate: number;
}

export const SPRITE_SHEETS: SpriteSheetDef[] = [
${sheets
  .map(
    (s) =>
      `\t{ key: ${JSON.stringify(s.key)}, file: ${JSON.stringify(s.file)}, frameWidth: ${s.frameWidth}, frameHeight: ${s.frameHeight}, frames: ${s.frames}, frameRate: ${s.frameRate} },`,
  )
  .join("\n")}
];
`,
);

const kindList = roster.map((r) => r.kind);
writeFileSync(
  ROSTERS_OUT,
  `// Generated by scripts/extract-sprites.mjs from beer_exe/BEER.DAT.
// Do not edit by hand; edit scripts/enemy-map.json and re-run the script.
export type FoeRole = "chaff" | "miniboss" | "boss";

export type FoeKind =
${kindList.map((k) => `\t| ${JSON.stringify(k)}`).join("\n")};

export type FoePathStep =
	| { t: "go"; dx: number; dy: number; speed: number }
	| { t: "wait"; ms: number }
	| { t: "mark" }
	| { t: "loop" }
	| { t: "sprite"; texture: string }
	| { t: "release"; kind: FoeKind; x: number; y: number }
	| { t: "shot"; speed: number };

export interface FoeSpec {
	texture: string;
	shield: number;
	score: number;
	role: FoeRole;
	invincible?: boolean;
	transparent?: boolean;
	path?: FoePathStep[];
}

export const FOES: Record<FoeKind, FoeSpec> = {
${roster
  .map((r) => `\t${JSON.stringify(r.kind)}: ${JSON.stringify(r.spec)},`)
  .join("\n")}
};

export type RosterCommand = "fieldOn" | "fieldOff" | "mark";

export interface RosterSpawn {
	at: number;
	x: number;
	y: number;
	kind: FoeKind;
	cmd?: RosterCommand;
}

export interface RosterLevel {
	name: string;
	bonusScore: number;
	bonusMoney: number;
	spawns: RosterSpawn[];
	checkpoints: number[];
	bosses: number;
}

export const ROSTERS: RosterLevel[] = ${JSON.stringify(levels, null, "\t")};
`,
);

console.log(
  `wrote ${sheets.length} PNGs + contact.html; ${roster.length} foes across ${levels.length} levels`,
);
console.log(`wrote ${SHEETS_OUT}`);
console.log(`wrote ${ROSTERS_OUT}`);
