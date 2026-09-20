// Generate the PWA/favicon icons from the extracted ship sprite.
//
// Usage:
//   node scripts/gen-icons.mjs
//
// Source: public/assets/enemies/ship.png (10 frames of 30x90, see
// src/game/data/enemySprites.ts). Frame 0 (the beer-bottle ship) is centered on
// the game background colour and nearest-neighbor scaled into the sizes below.
// Outputs are committed, so re-run only when the source art changes.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { decodePng, encodePng } from "./lib/png.mjs"

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const SRC = resolve(ROOT, "public/assets/enemies/ship.png")
const OUT_DIR = resolve(ROOT, "public/icons")

const FRAMES = 10 // ship sheet frame count
const BG = [5, 6, 13] // #05060d, matches the game canvas

// Distance of a coordinate from its rounded corner: > radius means "inside the
// center block" and does not clip. Computed separately so no nested ternaries.
function cornerDist(v, radius, size) {
  if (v < radius) return radius - v
  if (v >= size - radius) return v - (size - radius - 1)
  return 0
}

function roundedRectMask(size, radius) {
  const mask = new Uint8Array(size * size).fill(1)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const cx = cornerDist(x, radius, size)
      const cy = cornerDist(y, radius, size)
      if (cx * cx + cy * cy > radius * radius) mask[y * size + x] = 0
    }
  }
  return mask
}

function renderIcon(frame, size, { radius = 0, contentScale = 0.72, opaque = true }) {
  const out = Buffer.alloc(size * size * 4)
  const mask = radius > 0 ? roundedRectMask(size, radius) : null
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4
      if (opaque && (!mask || mask[y * size + x])) {
        out[i] = BG[0]
        out[i + 1] = BG[1]
        out[i + 2] = BG[2]
        out[i + 3] = 255
      }
    }
  }

  const { fw, fh, rgba } = frame
  const h = Math.round(size * contentScale)
  const w = Math.round((h * fw) / fh)
  const ox = Math.round((size - w) / 2)
  const oy = Math.round((size - h) / 2)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const sx = Math.min(fw - 1, Math.floor((x * fw) / w))
      const sy = Math.min(fh - 1, Math.floor((y * fh) / h))
      const s = (sy * fw + sx) * 4
      if (rgba[s + 3] === 0) continue
      const i = ((oy + y) * size + ox + x) * 4
      out[i] = rgba[s]
      out[i + 1] = rgba[s + 1]
      out[i + 2] = rgba[s + 2]
      out[i + 3] = 255
    }
  }
  return encodePng(size, size, out)
}

const sheet = decodePng(readFileSync(SRC))
if (sheet.width % FRAMES !== 0) throw new Error("unexpected ship sheet width")
const fw = sheet.width / FRAMES
const fh = sheet.height
const rgba = Buffer.alloc(fw * fh * 4)
for (let y = 0; y < fh; y++) {
  const src = y * sheet.width * 4
  sheet.rgba.copy(rgba, y * fw * 4, src, src + fw * 4)
}
let visible = 0
for (let i = 3; i < rgba.length; i += 4) if (rgba[i] > 0) visible++
if (visible === 0) throw new Error("ship frame 0 is empty")
const frame = { fw, fh, rgba }

mkdirSync(OUT_DIR, { recursive: true })
const icons = [
  ["pwa-192x192.png", 192, { radius: 34 }],
  ["pwa-512x512.png", 512, { radius: 92 }],
  ["maskable-512x512.png", 512, { contentScale: 0.5 }],
  ["apple-touch-icon.png", 180, { radius: 0 }],
]
for (const [name, size, opts] of icons) {
  writeFileSync(resolve(OUT_DIR, name), renderIcon(frame, size, opts))
}
writeFileSync(
  resolve(ROOT, "public/favicon.png"),
  renderIcon(frame, 64, { contentScale: 0.9, opaque: false }),
)
console.log(`wrote ${icons.length} icons + favicon.png from ship frame 0`)
