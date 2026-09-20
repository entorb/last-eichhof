// Extract original DOS sounds from original_game/beer_exe/BEER.DAT into OGG Vorbis.
// See docs/beer_dat.md for the .SND file formats.
//
// Usage:
//   node scripts/extract-sounds.mjs            decode + encode + write manifest
//   node scripts/extract-sounds.mjs --catalog  also print metadata + usage
import { execFileSync } from "node:child_process"
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import ffmpegPath from "ffmpeg-static"

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const DAT = resolve(ROOT, "original_game/beer_exe/BEER.DAT")
const OUT_DIR = resolve(ROOT, "public/assets/sounds")
const TS_OUT = resolve(ROOT, "src/game/data/sounds.ts")
const TMP_DIR = resolve(ROOT, "node_modules/.cache/eichhof-sounds")

const CATALOG = process.argv.includes("--catalog")

// Standalone single-sample files: DOS name -> web key.
// TITLE.SND / HS.SND are copyright-protected music and intentionally not
// shipped; menu/scores music is synthesized instead (src/game/audio/music.ts).
const STANDALONE = {
  "MENU.SND": "menu",
  "GO.SND": "go",
  "CLOSE.SND": "close",
  "SELL.SND": "sell",
  "BUY.SND": "buy",
  "TOD.SND": "tod",
  "BLICK.SND": "blick",
  "LONGTIME.SND": "longtime",
}

// Stale files from levels/dates when these were still extracted.
const REMOVE_STALE = ["title.ogg", "hs.ogg"]

// --- archive ---------------------------------------------------------------

const HDR_SIZE = 30
const DIR_ENTRY = 24

function parseArchive(buf) {
  const count = buf.readUInt16LE(HDR_SIZE + 2)
  const files = new Map()
  for (let i = 0; i < count; i++) {
    const off = HDR_SIZE + 4 + i * DIR_ENTRY
    const name = buf
      .subarray(off, off + 14)
      .toString("latin1")
      .split("\0")[0]
      .toUpperCase()
    const size = buf.readUInt32LE(off + 14)
    const fptr = buf.readUInt32LE(off + 20)
    files.set(name, buf.subarray(fptr, fptr + size))
  }
  return files
}

// --- sound library (.SND) --------------------------------------------------

function readSnd(buf, at = 0) {
  const priority = buf.readInt16LE(at)
  const samplerate = buf.readInt16LE(at + 2) // kHz
  const flags = buf.readUInt16LE(at + 4)
  const len = buf.readUInt32LE(at + 6)
  const data = buf.subarray(at + 10, at + 10 + len)
  return { priority, samplerate, flags, len, data }
}

// Library layout: u16 count, count x {u16 off, u16 seg}, then sndstrc blocks.
// Linear pointer = seg*16 + off, relative to the pointer array (file offset 2).
function readSndLib(buf) {
  const count = buf.readUInt16LE(0)
  const out = []
  for (let i = 0; i < count; i++) {
    const off = buf.readUInt16LE(2 + i * 4)
    const seg = buf.readUInt16LE(2 + i * 4 + 2)
    out.push(readSnd(buf, 2 + seg * 16 + off))
  }
  return out
}

// --- Creative 4-bit ADPCM (SB command 0x75) --------------------------------

const SCALE_4 = [
  0, 1, 2, 3, 4, 5, 6, 7, 0, -1, -2, -3, -4, -5, -6, -7, 1, 3, 5, 7, 9, 11, 13, 15, -1, -3, -5, -7,
  -9, -11, -13, -15, 2, 6, 10, 14, 18, 22, 26, 30, -2, -6, -10, -14, -18, -22, -26, -30, 4, 12, 20,
  28, 36, 44, 52, 60, -4, -12, -20, -28, -36, -44, -52, -60,
]
const ADJUST_4 = [
  0, 0, 0, 0, 0, 16, 16, 16, 0, 0, 0, 0, 0, 16, 16, 16, 240, 0, 0, 0, 0, 16, 16, 16, 240, 0, 0, 0,
  0, 16, 16, 16, 240, 0, 0, 0, 0, 16, 16, 16, 240, 0, 0, 0, 0, 16, 16, 16, 240, 0, 0, 0, 0, 0, 0, 0,
  240, 0, 0, 0, 0, 0, 0, 0,
]

function decodeAdpcm4(data) {
  if (data.length === 0) return Buffer.alloc(0)
  const out = Buffer.alloc(1 + (data.length - 1) * 2)
  let reference = data[0]
  let scale = 0
  out[0] = reference
  let o = 1
  for (let i = 1; i < data.length; i++) {
    for (const nibble of [data[i] >> 4, data[i] & 0x0f]) {
      let samp = nibble + scale
      if (samp < 0) samp = 0
      else if (samp > 63) samp = 63
      let ref = reference + SCALE_4[samp]
      if (ref > 0xff) ref = 0xff
      else if (ref < 0) ref = 0
      reference = ref
      scale = (scale + ADJUST_4[samp]) & 0xff
      out[o++] = reference
    }
  }
  return out
}

function decodePcm(snd) {
  if (snd.flags & 0x0001) return decodeAdpcm4(snd.data)
  return Buffer.from(snd.data)
}

// --- level sound usage (.TBL / .FOE / .EXP) --------------------------------

function libPointers(buf) {
  const count = buf.readUInt16LE(0)
  const out = []
  for (let i = 0; i < count; i++) {
    const off = buf.readUInt16LE(2 + i * 4)
    const seg = buf.readUInt16LE(2 + i * 4 + 2)
    out.push(2 + seg * 16 + off)
  }
  return out
}

function addUsage(usage, idx, kind) {
  if (!usage.has(idx)) usage.set(idx, [])
  usage.get(idx).push(kind)
}

function readFoeUsage(usage, foe) {
  for (const at of libPointers(foe)) {
    const sprite = foe.readInt16LE(at + 8)
    let p = at + 12
    while (p + 2 <= foe.length) {
      const w = foe.readUInt16LE(p)
      if (w === 0x8000) break
      if (w === 0x8001) p += 4
      else if (w === 0x8002) p += 8
      else if (w === 0x8004 || w === 0x8005) p += 2
      else if (w === 0x8006) {
        addUsage(usage, foe.readInt16LE(p + 2), `foe:spr${sprite}`)
        p += 4
      } else p += 4
    }
  }
}

function readExpUsage(usage, exp) {
  for (const [i, at] of libPointers(exp).entries()) {
    let p = at + 2
    while (p + 2 <= exp.length) {
      const w = exp.readUInt16LE(p)
      if (w === 0x8000) break
      if (w === 0x8001) p += 6
      else if (w === 0x8002) p += 2
      else if (w === 0x8003) {
        addUsage(usage, exp.readInt16LE(p + 2), `expl#${i}`)
        p += 4
      } else if (w === 0x8004) p += 2
      else if (w === 0x8005) p += 2
      else if (w === 0x8006) p += 6
      else p += 2
    }
  }
}

function levelUsage(files, level) {
  const usage = new Map()

  const tbl = files.get(`LEVEL${level}.TBL`)
  if (tbl) {
    const count = tbl.readUInt16LE(0)
    for (let i = 0; i < count; i++) {
      const o = 2 + i * 8
      const time = tbl.readUInt16LE(o)
      const x = tbl.readInt16LE(o + 2)
      const foe = tbl.readUInt16LE(o + 6)
      if (foe === 0x8002) addUsage(usage, x, `attack@${time}`)
    }
  }

  const foe = files.get(`LEVEL${level}.FOE`)
  if (foe) readFoeUsage(usage, foe)

  const exp = files.get(`LEVEL${level}.EXP`)
  if (exp) readExpUsage(usage, exp)

  return usage
}

// Pick per-level cue samples from the usage map.
function pickCues(usage, seconds) {
  const of = (kind) =>
    [...usage.entries()]
      .filter(([, refs]) => refs.some((r) => r.startsWith(kind)))
      .sort((a, b) => b[1].length - a[1].length)
  const expl = of("expl")
  const foe = of("foe")
  const attack = of("attack")
  const longest = (list) =>
    list.slice().sort((a, b) => seconds[b[0]] - seconds[a[0]])[0]?.[0] ?? null
  return {
    explosion: expl[0]?.[0] ?? null,
    bossExplosion: longest(expl) ?? expl[0]?.[0] ?? null,
    enemyShot: foe[0]?.[0] ?? null,
    cue: attack[0]?.[0] ?? null,
  }
}

// --- OGG encoding ----------------------------------------------------------

function encodeOgg(key, pcm, rate) {
  const raw = resolve(TMP_DIR, `${key}.u8`)
  writeFileSync(raw, pcm)
  const ogg = resolve(OUT_DIR, `${key}.ogg`)
  execFileSync(
    ffmpegPath,
    [
      "-y",
      "-loglevel",
      "error",
      "-f",
      "u8",
      "-ar",
      String(rate),
      "-ac",
      "1",
      "-i",
      raw,
      "-c:a",
      "libvorbis",
      "-q:a",
      "4",
      ogg,
    ],
    { stdio: "inherit" },
  )
  rmSync(raw, { force: true })
  return ogg
}

// --- main ------------------------------------------------------------------

const archive = parseArchive(readFileSync(DAT))
mkdirSync(OUT_DIR, { recursive: true })
mkdirSync(TMP_DIR, { recursive: true })

for (const stale of REMOVE_STALE) rmSync(resolve(OUT_DIR, stale), { force: true })

const sounds = []
const levelCues = {}

for (const [dosName, key] of Object.entries(STANDALONE)) {
  const raw = archive.get(dosName)
  if (!raw) throw new Error(`missing ${dosName}`)
  const snd = readSnd(raw)
  const pcm = decodePcm(snd)
  const rate = snd.samplerate * 1000
  encodeOgg(key, pcm, rate)
  sounds.push({
    key,
    file: `assets/sounds/${key}.ogg`,
    seconds: +(pcm.length / rate).toFixed(3),
    source: `${dosName} (single, ${snd.flags & 1 ? "adpcm4" : "pcm8"})`,
  })
}

for (let level = 0; level < 5; level++) {
  const dosName = `LEVEL${level}.SND`
  const raw = archive.get(dosName)
  if (!raw) throw new Error(`missing ${dosName}`)
  const entries = readSndLib(raw)
  const usage = levelUsage(archive, level)
  const seconds = {}
  const webLevel = level + 1

  entries.forEach((snd, i) => {
    const key = `level${webLevel}-snd${i}`
    const pcm = decodePcm(snd)
    const rate = snd.samplerate * 1000
    encodeOgg(key, pcm, rate)
    seconds[i] = pcm.length / rate
    sounds.push({
      key,
      file: `assets/sounds/${key}.ogg`,
      seconds: +seconds[i].toFixed(3),
      source: `${dosName}#${i} (${snd.flags & 1 ? "adpcm4" : "pcm8"})`,
    })
  })

  const cues = pickCues(usage, seconds)
  levelCues[webLevel] = {
    explosion: cues.explosion === null ? null : `level${webLevel}-snd${cues.explosion}`,
    bossExplosion: cues.bossExplosion === null ? null : `level${webLevel}-snd${cues.bossExplosion}`,
    enemyShot: cues.enemyShot === null ? null : `level${webLevel}-snd${cues.enemyShot}`,
    cue: cues.cue === null ? null : `level${webLevel}-snd${cues.cue}`,
  }

  if (CATALOG) {
    console.log(`\n===== ${dosName} (${entries.length} sounds) =====`)
    entries.forEach((snd, i) => {
      const refs = (usage.get(i) ?? []).join(" ")
      console.log(
        `  #${i} pr${snd.priority} ${snd.samplerate}kHz ` +
          `${seconds[i].toFixed(2)}s ${snd.flags & 1 ? "adpcm4" : "pcm8 "} ${refs}`,
      )
    })
    console.log(`  cues: ${JSON.stringify(levelCues[webLevel])}`)
  }
}

// audition page -------------------------------------------------------------

const cards = sounds
  .map(
    (s) => `    <figure>
      <figcaption>${s.key}<br>${s.seconds}s<br><small>${s.source}</small></figcaption>
      <audio controls preload="none" src="${s.key}.ogg"></audio>
    </figure>`,
  )
  .join("\n")
const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>BEER.DAT sound audition</title>
<style>
  body { background:#111; color:#eee; font:13px monospace; margin:24px; }
  main { display:flex; flex-wrap:wrap; gap:14px; }
  figure { margin:0; background:#000; border:1px solid #333; padding:8px; width:230px; }
  figcaption { margin-bottom:6px; color:#9fe0ff; }
  audio { width:100%; }
</style>
</head>
<body>
<h1>BEER.DAT sound audition</h1>
<main>
${cards}
</main>
</body>
</html>
`
writeFileSync(resolve(OUT_DIR, "audition.html"), html)

// generated TS metadata -----------------------------------------------------

const ts = `// Generated by scripts/extract-sounds.mjs from original_game/beer_exe/BEER.DAT.
// Do not edit by hand; re-run the script.
// biome-ignore-all lint/suspicious/noApproximativeNumericConstant: generated durations
export interface SoundDef {
	key: string;
	file: string;
	seconds: number;
	source: string;
}

export interface LevelCues {
	explosion: string | null;
	bossExplosion: string | null;
	enemyShot: string | null;
	cue: string | null;
}

export const SOUNDS: SoundDef[] = [
${sounds
  .map(
    (s) =>
      `\t{ key: ${JSON.stringify(s.key)}, file: ${JSON.stringify(s.file)}, seconds: ${s.seconds}, source: ${JSON.stringify(s.source)} },`,
  )
  .join("\n")}
];

export const LEVEL_CUES: Record<number, LevelCues> = {
${Object.entries(levelCues)
  .map(
    ([lvl, c]) =>
      `\t${lvl}: { explosion: ${JSON.stringify(c.explosion)}, bossExplosion: ${JSON.stringify(c.bossExplosion)}, enemyShot: ${JSON.stringify(c.enemyShot)}, cue: ${JSON.stringify(c.cue)} },`,
  )
  .join("\n")}
};
`
writeFileSync(TS_OUT, ts)

rmSync(TMP_DIR, { recursive: true, force: true })

console.log(`wrote ${sounds.length} OGGs + audition.html to public/assets/sounds`)
console.log(`wrote ${TS_OUT}`)
