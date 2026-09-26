import type { Scene } from "phaser"
import { SPRITE_SHEETS, type SpriteSheetDef } from "../data/enemySprites"
import { FOES } from "../data/foeRosters"
import { type GraphicsMode, loadSettings } from "../data/store"
import { WEAPONS } from "../data/weapons"
import {
  drawFoeArt,
  FOE_ART,
  FOE_ART_KEYS,
  type FoeArtDef,
  type FoeMotion,
  foeAspect,
} from "./foeArt"
import { drawRigArt, RIG_ART_KEYS } from "./rigArt"
import type { Ctx } from "./vector"

export const MODERN_PREFIX = "m-"

export const CORK_W = 12
export const CORK_H = 26
export const PELLET_W = 10
export const PELLET_H = 10

const RIG_KEYS = new Set(RIG_ART_KEYS)
const FOE_KEYS = new Set(FOE_ART_KEYS)
const MODERN_KEYS = new Set([...RIG_KEYS, ...FOE_KEYS])

const PELLETS: { key: string; w: number; h: number }[] = [
  { key: "cork", w: CORK_W, h: CORK_H },
  { key: "pellet", w: PELLET_W, h: PELLET_H },
]

export interface ModernSheet {
  key: string
  frames: number
  frameWidth: number
  frameHeight: number
}

/** Every texture the modern skin paints, in `SPRITE_SHEETS` order plus the two
 *  procedural extras. The DOS twin of each lives under the same `key`. */
export function modernSheets(): ModernSheet[] {
  const extras: ModernSheet[] = PELLETS.map((p) => ({
    key: p.key,
    frames: 1,
    frameWidth: p.w,
    frameHeight: p.h,
  }))
  return [
    ...SPRITE_SHEETS.map((s) => ({
      key: s.key,
      frames: s.frames,
      frameWidth: s.frameWidth,
      frameHeight: s.frameHeight,
    })),
    ...extras,
  ]
}

let activeMode: GraphicsMode = "original"
let generated = false

export function graphicsMode(): GraphicsMode {
  return activeMode
}

export function setGraphicsMode(mode: GraphicsMode): void {
  activeMode = mode
}

export function dosKey(key: string): string {
  return key.startsWith(MODERN_PREFIX) ? key.slice(MODERN_PREFIX.length) : key
}

export function hasModernArt(key: string): boolean {
  return MODERN_KEYS.has(dosKey(key))
}

/** Texture key for the active skin. Keys with no modern twin pass through. */
export function texKey(key: string): string {
  const base = dosKey(key)
  if (activeMode !== "modern" || !MODERN_KEYS.has(base)) return base
  return `${MODERN_PREFIX}${base}`
}

export function modernKey(key: string): string {
  return `${MODERN_PREFIX}${dosKey(key)}`
}

function applyMotion(ctx: Ctx, i: number, n: number, motion: FoeMotion) {
  const phase = n > 1 ? (i / n) * Math.PI * 2 : 0
  if (motion === "swing") {
    ctx.rotate(Math.sin(phase) * 0.5)
    return
  }
  if (motion === "pulse") {
    const s = 1 + 0.06 * Math.sin(phase)
    ctx.scale(s, s)
    return
  }
  if (motion === "spin") ctx.rotate(phase)
}

function drawModernFrame(
  ctx: Ctx,
  key: string,
  i: number,
  n: number,
  w: number,
  h: number,
): boolean {
  if (drawRigArt(key, ctx, w, h, i, n)) return true
  const def = FOE_ART[key]
  if (!def) return false
  const motion = def.motion ?? "spin"
  const [dw, dh] = subjectSize(def, motion, n, w, h)
  ctx.save()
  ctx.translate(w / 2, h / 2)
  applyMotion(ctx, i, n, motion)
  drawFoeArt(ctx, key, dw, dh, i, n)
  ctx.restore()
  return true
}

// A subject that actually spins gets its own proportions inside the rotation
// envelope; a single-frame one fills the frame so its box hugs the artwork.
function subjectSize(
  def: FoeArtDef,
  motion: FoeMotion,
  n: number,
  w: number,
  h: number,
): [number, number] {
  if (motion !== "spin" || n <= 1) return [w, h]
  const len = Math.min(w, h) * 0.92
  const ratio = foeAspect(def.art)
  return ratio >= 1 ? [len, len / ratio] : [len * ratio, len]
}

function buildTexture(
  scene: Scene,
  key: string,
  frames: number,
  frameWidth: number,
  frameHeight: number,
) {
  const full = modernKey(key)
  if (scene.textures.exists(full)) scene.textures.remove(full)
  const tex = scene.textures.createCanvas(full, frameWidth * frames, frameHeight)
  if (!tex) throw new Error(`selfcheck: could not create ${full}`)
  drawModernSheet(tex.context, { key, frames, frameWidth, frameHeight })
  for (let i = 0; i < frames; i++) {
    tex.add(String(i), 0, i * frameWidth, 0, frameWidth, frameHeight)
  }
  tex.refresh()
}

/** Paints one whole modern sheet. Pure Canvas2D, so `src/skins.html` can use it. */
export function drawModernSheet(ctx: Ctx, sheet: ModernSheet): void {
  const { key, frames, frameWidth: w, frameHeight: h } = sheet
  for (let i = 0; i < frames; i++) {
    // Move to the frame slot before clipping: the clip is in frame-local space,
    // so anything drawn afterwards has to share that transform.
    ctx.save()
    ctx.translate(i * w, 0)
    ctx.beginPath()
    ctx.rect(0, 0, w, h)
    ctx.clip()
    drawModernFrame(ctx, key, i, frames, w, h)
    ctx.restore()
  }
}

function buildSheet(scene: Scene, sheet: SpriteSheetDef) {
  buildTexture(scene, sheet.key, sheet.frames, sheet.frameWidth, sheet.frameHeight)
}

/** Both key spaces a sheet exists in, so a mid-game mode switch always has art. */
export function sheetKeys(sheet: SpriteSheetDef): string[] {
  return hasModernArt(sheet.key) ? [sheet.key, modernKey(sheet.key)] : [sheet.key]
}

export function applySkin(scene: Scene): void {
  activeMode = loadSettings().graphics
  if (generated) return
  generated = true
  for (const sheet of SPRITE_SHEETS) buildSheet(scene, sheet)
  for (const p of PELLETS) buildTexture(scene, p.key, 1, p.w, p.h)
}

function allTextures(): string[] {
  const keys = new Set<string>()
  for (const sheet of SPRITE_SHEETS) keys.add(sheet.key)
  for (const p of PELLETS) keys.add(p.key)
  for (const kind of Object.keys(FOES) as (keyof typeof FOES)[]) {
    const spec = FOES[kind]
    keys.add(spec.texture)
    for (const step of spec.path ?? []) {
      if (step.t === "sprite") keys.add(step.texture)
    }
  }
  for (const w of WEAPONS) {
    for (const em of [...w.emitters, ...w.emitters.flatMap((e) => e.release?.shots ?? [])]) {
      keys.add(em.sprite)
    }
  }
  return [...keys]
}

export function runModernSkinSelfCheck(): void {
  const assert = (cond: boolean, msg: string) => {
    if (!cond) throw new Error(`selfcheck: ${msg}`)
  }

  assert(MODERN_PREFIX === "m-", "modern prefix")
  assert(dosKey("m-ship") === "ship", "dosKey strips")
  assert(dosKey("ship") === "ship", "dosKey keeps dos")
  assert(modernKey("m-ship") === "m-ship", "modernKey is idempotent")

  const sheets = SPRITE_SHEETS.map((s) => s.key)
  for (const key of sheets) {
    assert(hasModernArt(key), `no modern art for sheet ${key}`)
  }
  for (const p of PELLETS) {
    assert(hasModernArt(p.key), `no modern art for ${p.key}`)
    assert(p.w > 0 && p.h > 0, `bad size for ${p.key}`)
  }
  for (const key of allTextures()) {
    assert(hasModernArt(key), `no modern art for texture ${key}`)
  }
  for (const w of WEAPONS) {
    const mount = `wpn-${w.id}`
    assert(hasModernArt(mount), `no modern art for mount ${mount}`)
    assert(sheets.filter((k) => k === mount).length === 1, `mount sheet ${mount} missing`)
  }
  const stale = FOE_ART_KEYS.filter((k) => !sheets.includes(k))
  assert(stale.length === 0, `foe art for unknown sheets: ${stale.join(", ")}`)
  assert(FOE_ART_KEYS.length === 84, `expected 84 foe sheets, got ${FOE_ART_KEYS.length}`)
  assert(RIG_ART_KEYS.length === 26, `expected 26 rig sheets, got ${RIG_ART_KEYS.length}`)
}
