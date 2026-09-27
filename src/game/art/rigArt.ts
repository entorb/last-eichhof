import { drawArt } from "./foeArt"
import {
  type Ctx,
  circlePath,
  css,
  ellipsePath,
  linear,
  mix,
  radial,
  roundRectPath,
  shade,
  spec,
} from "./vector"

const GLASS_GREEN = 0x2f7d32
const GLASS_AMBER = 0xc98a1e
const GLASS_YELLOW = 0xd8bb2a
const GLASS_CLEAR = 0xd6dde6
const GLASS_PINK = 0xd0407a
const GLASS_CYAN = 0x2ab5c4
const CORK = 0xb98a4b
const STEEL = 0xb9c2cf
const STEEL_DARK = 0x6b7484
const CREAM = 0xf4ecd8

const TAU = Math.PI * 2

type RigDraw = (ctx: Ctx, w: number, h: number, i: number, n: number) => void

const spinPhase = (i: number, n: number) => (n > 1 ? (i / n) * TAU : 0)

// A label wrapped round a bottle of radius `r`, turned by `phase` (0 = facing
// the viewer). This is what the DOS strips animate: the glass stays put and
// the label travels across it and disappears round the back.
function wrapLabel(ctx: Ctx, r: number, y: number, lh: number, phase: number, band: number) {
  const half = 0.95
  const p = Math.atan2(Math.sin(phase), Math.cos(phase))
  const lo = Math.max(p - half, -Math.PI / 2)
  const hi = Math.min(p + half, Math.PI / 2)
  if (lo >= hi) return
  const x0 = r * Math.sin(lo)
  const lw = r * Math.sin(hi) - x0
  ctx.fillStyle = css(CREAM, 0.95)
  ctx.fillRect(x0, y, lw, lh)
  ctx.fillStyle = css(band, 0.95)
  ctx.fillRect(x0, y, lw, lh * 0.2)
  ctx.fillRect(x0, y + lh * 0.74, lw, lh * 0.14)
  if (Math.abs(p) >= Math.PI / 2) return
  ellipsePath(ctx, r * Math.sin(p), y + lh * 0.47, r * 0.3 * Math.cos(p), lh * 0.17)
  ctx.fill()
}

function centered(ctx: Ctx, w: number, h: number, draw: (c: Ctx) => void) {
  ctx.save()
  ctx.translate(w / 2, h / 2)
  draw(ctx)
  ctx.restore()
}

function barrelBottle(ctx: Ctx, w: number, h: number, glass: number, label: number, phase: number) {
  const hw = w / 2
  const hh = h / 2
  const nw = hw * 0.44
  const shoulder = -hh * 0.44
  const body = () => {
    ctx.beginPath()
    ctx.moveTo(-nw, -hh)
    ctx.lineTo(-nw, shoulder)
    ctx.quadraticCurveTo(-hw * 0.92, shoulder + h * 0.06, -hw * 0.92, hh * 0.02)
    ctx.lineTo(-hw * 0.92, hh * 0.82)
    ctx.quadraticCurveTo(-hw * 0.92, hh, 0, hh)
    ctx.quadraticCurveTo(hw * 0.92, hh, hw * 0.92, hh * 0.82)
    ctx.lineTo(hw * 0.92, hh * 0.02)
    ctx.quadraticCurveTo(hw * 0.92, shoulder + h * 0.06, nw, shoulder)
    ctx.lineTo(nw, -hh)
    ctx.closePath()
  }
  body()
  ctx.fillStyle = linear(ctx, -hw, 0, hw, 0, shade(glass, 0.4), mix(glass, 0xffffff, 0.5))
  ctx.fill()
  body()
  ctx.fillStyle = linear(ctx, -hw, 0, hw, 0, shade(glass, 0.85), glass, 0.15, 0.9)
  ctx.fill()
  wrapLabel(ctx, hw * 0.92, -hh * 0.12, h * 0.34, phase, label)
  spec(ctx, hw * 0.3, -hh * 0.6, w * 0.2, h * 0.5, 0.35)
  ctx.fillStyle = linear(ctx, -nw, 0, nw, 0, shade(CORK, 1.2), CORK)
  roundRectPath(ctx, -nw * 0.9, -hh, nw * 1.8, h * 0.09, h * 0.03)
  ctx.fill()
}

function neckBottle(ctx: Ctx, w: number, h: number, glass: number, label: number, phase: number) {
  const hw = w / 2
  const hh = h / 2
  const nw = hw * 0.24
  const body = () => {
    ctx.beginPath()
    ctx.moveTo(-nw, -hh)
    ctx.lineTo(-nw, -hh * 0.5)
    ctx.quadraticCurveTo(-nw, -hh * 0.1, -hw * 0.86, hh * 0.06)
    ctx.lineTo(-hw * 0.86, hh * 0.8)
    ctx.quadraticCurveTo(-hw * 0.86, hh, 0, hh)
    ctx.quadraticCurveTo(hw * 0.86, hh, hw * 0.86, hh * 0.8)
    ctx.lineTo(hw * 0.86, hh * 0.06)
    ctx.quadraticCurveTo(nw, -hh * 0.1, nw, -hh * 0.5)
    ctx.lineTo(nw, -hh)
    ctx.closePath()
  }
  body()
  ctx.fillStyle = linear(ctx, -hw, 0, hw, 0, shade(glass, 0.4), mix(glass, 0xffffff, 0.5))
  ctx.fill()
  body()
  ctx.fillStyle = linear(ctx, -hw, 0, hw, 0, shade(glass, 0.85), glass, 0.15, 0.9)
  ctx.fill()
  wrapLabel(ctx, hw * 0.86, -hh * 0.22, h * 0.3, phase, label)
  spec(ctx, hw * 0.24, -hh * 0.85, w * 0.18, h * 0.42, 0.35)
  ctx.fillStyle = linear(ctx, -nw, 0, nw, 0, shade(CORK, 1.2), CORK)
  roundRectPath(ctx, -nw * 0.9, -hh, nw * 1.8, h * 0.08, h * 0.025)
  ctx.fill()
}

function goblet(ctx: Ctx, w: number, h: number, glass: number) {
  const hw = w / 2
  const hh = h / 2
  const bowl = () => {
    ctx.beginPath()
    ctx.moveTo(-hw * 0.92, -hh)
    ctx.lineTo(-hw * 0.7, hh * 0.1)
    ctx.lineTo(hw * 0.7, hh * 0.1)
    ctx.lineTo(hw * 0.92, -hh)
    ctx.closePath()
  }
  bowl()
  ctx.fillStyle = linear(ctx, -hw, 0, hw, 0, shade(glass, 0.45), mix(glass, 0xffffff, 0.55))
  ctx.fill()
  bowl()
  ctx.fillStyle = linear(ctx, 0, -hh, 0, hh * 0.1, mix(glass, 0xffffff, 0.3), glass, 0.9, 0.95)
  ctx.fill()
  ctx.fillStyle = linear(ctx, 0, -hh * 1.1, 0, -hh * 0.7, 0xfff8e6, 0xe6d9a8)
  ellipsePath(ctx, 0, -hh * 0.94, hw * 0.94, hh * 0.2)
  ctx.fill()
  spec(ctx, -hw * 0.5, -hh * 0.6, w * 0.16, h * 0.5, 0.4)
  ctx.fillStyle = linear(ctx, -hw * 0.12, 0, hw * 0.12, 0, STEEL, STEEL_DARK)
  ctx.fillRect(-hw * 0.12, hh * 0.08, w * 0.24, h * 0.36)
  ctx.fillStyle = css(STEEL, 0.95)
  ellipsePath(ctx, 0, hh * 0.88, hw * 0.72, hh * 0.12)
  ctx.fill()
}

function canRig(ctx: Ctx, w: number, h: number, i: number) {
  const hw = w / 2
  const hh = h / 2
  ctx.save()
  ctx.rotate(Math.sin((i / 13) * TAU) * 0.16)
  ctx.fillStyle = linear(
    ctx,
    -hw,
    0,
    hw,
    0,
    shade(GLASS_CYAN, 0.4),
    mix(GLASS_CYAN, 0xffffff, 0.55),
  )
  roundRectPath(ctx, -hw * 0.82, -hh, hw * 1.64, h * 0.96, w * 0.16)
  ctx.fill()
  ctx.fillStyle = linear(ctx, -hw, 0, hw, 0, shade(GLASS_CYAN, 0.8), GLASS_CYAN, 0.15, 0.9)
  roundRectPath(ctx, -hw * 0.82, -hh, hw * 1.64, h * 0.96, w * 0.16)
  ctx.fill()
  spec(ctx, -hw * 0.2, -hh * 0.7, w * 0.18, h * 0.6, 0.45)
  ctx.fillStyle = linear(ctx, 0, -hh, 0, -hh * 0.6, STEEL, shade(STEEL, 0.6))
  ellipsePath(ctx, 0, -hh, hw * 0.82, hh * 0.16)
  ctx.fill()
  ctx.fillStyle = css(CREAM, 0.95)
  ctx.fillRect(-hw * 0.82, -hh * 0.1, w * 0.82, h * 0.34)
  ctx.fillStyle = css(GLASS_CYAN, 0.95)
  ctx.fillRect(-hw * 0.82, hh * 0.14, w * 0.82, h * 0.1)
  ctx.restore()
}

function cannonRig(ctx: Ctx, w: number, h: number) {
  const hw = w / 2
  const hh = h / 2
  ctx.fillStyle = linear(ctx, -hw, 0, hw, 0, 0x59606f, 0x22262f)
  roundRectPath(ctx, -hw * 0.5, -hh, hw, h * 0.82, w * 0.12)
  ctx.fill()
  ctx.fillStyle = linear(ctx, -hw * 0.3, 0, hw * 0.3, 0, STEEL, STEEL_DARK)
  roundRectPath(ctx, -hw * 0.3, -hh * 0.2, hw * 0.6, h * 0.5, w * 0.1)
  ctx.fill()
  ctx.fillStyle = css(0x14161d)
  circlePath(ctx, 0, -hh * 0.86, hw * 0.3)
  ctx.fill()
  ctx.fillStyle = css(0xff8a3a, 0.9)
  circlePath(ctx, 0, -hh * 0.86, hw * 0.16)
  ctx.fill()
  ctx.fillStyle = css(0x8c96a8, 0.9)
  ctx.fillRect(-hw * 0.34, hh * 0.3, hw * 0.68, h * 0.12)
}

function energyBolt(ctx: Ctx, w: number, h: number, color: number, core: number, length: number) {
  // The teardrop follows the frame's long axis: DOS projectile frames are often
  // flat (a 30x6 cork), and rotating those into a vertical bolt would clip. It
  // also stays well inside the frame, since the frame is the shot's hit box.
  const vertical = h >= w
  const long = Math.max(w, h) * length * 0.62
  const short = Math.min(w, h) * 0.36
  ctx.save()
  if (!vertical) ctx.rotate(-Math.PI / 2)
  const teardrop = () => {
    ctx.beginPath()
    ctx.moveTo(0, -long / 2)
    ctx.quadraticCurveTo(short, -long * 0.05, short * 0.7, long * 0.26)
    ctx.quadraticCurveTo(0, long / 2, -short * 0.7, long * 0.26)
    ctx.quadraticCurveTo(-short, -long * 0.05, 0, -long / 2)
    ctx.closePath()
  }
  ctx.fillStyle = radial(ctx, 0, 0, 0, long * 0.9, color, color, 0.8, 0)
  circlePath(ctx, 0, 0, long * 0.85)
  ctx.fill()
  teardrop()
  ctx.fillStyle = linear(ctx, -short, 0, short, 0, shade(core, 0.5), core, 0.15, 0.95)
  ctx.fill()
  teardrop()
  ctx.fillStyle = linear(ctx, -short, 0, short, 0, color, shade(core, 1.1), 0.5, 0.9)
  ctx.fill()
  spec(ctx, -short * 0.45, -long * 0.4, short * 0.4, long * 0.7, 0.55)
  ctx.fillStyle = radial(ctx, 0, 0, 0, short * 1.05, 0xffffff, color, 0.95, 0.2)
  circlePath(ctx, 0, 0, short * 1)
  ctx.fill()
  ctx.restore()
}

function cannonBall(ctx: Ctx, w: number, h: number) {
  const r = Math.min(w, h) / 2
  ctx.fillStyle = radial(ctx, -r * 0.25, 0, r * 0.12, r * 1.2, 0x8c96a8, 0x2b3040)
  circlePath(ctx, 0, 0, r * 0.9)
  ctx.fill()
  ctx.fillStyle = radial(ctx, 0, -r * 0.2, r * 0.1, r * 0.8, 0xfff0a0, 0xd8802a, 0.5, 0)
  circlePath(ctx, 0, -r * 0.06, r * 0.75)
  ctx.fill()
  ctx.fillStyle = css(0xffffff, 0.5)
  circlePath(ctx, -r * 0.32, -r * 0.34, r * 0.2)
  ctx.fill()
}

function capsule(ctx: Ctx, w: number, h: number, a: number, b: number, i: number) {
  const vertical = h >= w
  const len = (vertical ? h : w) * 0.82
  const wide = (vertical ? w : h) * 0.6
  const r = wide / 2
  const pulse = 0.94 + 0.06 * Math.sin(i * 1.1)
  ctx.save()
  if (!vertical) ctx.rotate(Math.PI / 2)
  ctx.scale(1, pulse)
  ctx.fillStyle = css(b)
  roundRectPath(ctx, -r, -len / 2, r * 2, len, r)
  ctx.fill()
  ctx.fillStyle = linear(ctx, -r, -len / 2, r, -len * 0.1, a, shade(a, 0.85))
  roundRectPath(ctx, -r, -len / 2, r * 2, len * 0.44, r)
  ctx.fill()
  spec(ctx, -r * 0.55, -len * 0.3, r * 0.4, len * 0.5, 0.55)
  ctx.restore()
}

function cork(ctx: Ctx, w: number, h: number) {
  const hw = w / 2
  const hh = h / 2
  ctx.fillStyle = linear(ctx, -hw, 0, hw, 0, shade(CORK, 1.2), shade(CORK, 0.6))
  roundRectPath(ctx, -hw, -hh, w, h, Math.min(w, h) * 0.3)
  ctx.fill()
  spec(ctx, -hw * 0.4, -hh, w * 0.3, h, 0.35)
}

function shipFrame(ctx: Ctx, w: number, h: number, i: number, n: number) {
  const hw = w / 2
  const hh = h / 2
  const t = n > 1 ? i / n : 0
  const thrust = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(t * TAU))
  const body = () => {
    ctx.beginPath()
    ctx.moveTo(-hw * 0.86, hh * 0.62)
    ctx.lineTo(-hw * 0.8, -hh * 0.3)
    ctx.quadraticCurveTo(-hw * 0.7, -hh * 0.62, -hw * 0.3, -hh * 0.78)
    ctx.lineTo(-hw * 0.22, -hh)
    ctx.lineTo(hw * 0.22, -hh)
    ctx.lineTo(hw * 0.3, -hh * 0.78)
    ctx.quadraticCurveTo(hw * 0.7, -hh * 0.62, hw * 0.8, -hh * 0.3)
    ctx.lineTo(hw * 0.86, hh * 0.62)
    ctx.closePath()
  }
  ctx.fillStyle = radial(ctx, 0, hh * 0.9, 0, h * 0.5, 0xffe9a8, 0xff8a2a, 0.7 * thrust, 0)
  ctx.beginPath()
  ctx.moveTo(-hw * 0.5, hh * 0.4)
  ctx.quadraticCurveTo(0, hh + h * 0.42 * thrust, hw * 0.5, hh * 0.4)
  ctx.closePath()
  ctx.fill()
  body()
  ctx.fillStyle = linear(
    ctx,
    -hw,
    0,
    hw,
    0,
    shade(GLASS_GREEN, 0.35),
    mix(GLASS_GREEN, 0xffffff, 0.55),
  )
  ctx.fill()
  body()
  ctx.fillStyle = linear(ctx, -hw, 0, hw, 0, shade(GLASS_GREEN, 0.8), GLASS_GREEN, 0.1, 0.92)
  ctx.fill()
  spec(ctx, hw * 0.22, -hh * 0.6, w * 0.22, h * 0.6, 0.4)
  wrapLabel(ctx, hw * 0.8, -hh * 0.3, h * 0.34, spinPhase(i, n), 0xc0392b)
  ctx.fillStyle = linear(ctx, -hw * 0.3, 0, hw * 0.3, 0, 0xd8b483, CORK)
  roundRectPath(ctx, -hw * 0.3, -hh, hw * 0.6, h * 0.1, h * 0.03)
  ctx.fill()
}

function explosionFrame(ctx: Ctx, w: number, h: number, i: number, n: number) {
  const t = n > 1 ? i / (n - 1) : 0
  const hw = w / 2
  const hh = h / 2
  const grow = 0.25 + 0.75 * t
  const fade = 1 - t * 0.85
  const r = hw * grow
  // Opaque out to the inner radius, then a short falloff: a gradient that fades
  // from the centre reads as a washed tan disc instead of a fireball.
  ctx.fillStyle = radial(ctx, 0, 0, r * 0.55, r, 0xffb43c, 0xff4a08, fade, 0)
  circlePath(ctx, 0, 0, r)
  ctx.fill()
  ctx.fillStyle = radial(ctx, 0, 0, r * 0.3, r * 0.62, 0xfff6cc, 0xffd24a, fade, 0)
  circlePath(ctx, 0, 0, r * 0.62)
  ctx.fill()
  ctx.fillStyle = radial(ctx, 0, 0, 0, r * 0.3, 0xffffff, 0xfff0b0, fade, 0)
  circlePath(ctx, 0, 0, r * 0.3 * (1 - t * 0.45))
  ctx.fill()
  ctx.strokeStyle = css(0xfff6d0, 0.85 * fade)
  ctx.lineWidth = Math.max(1.5, hh * 0.13 * (1 - t * 0.5))
  circlePath(ctx, 0, 0, r * 0.95)
  ctx.stroke()
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * TAU + 0.26
    const d = r * (0.6 + 0.55 * ((k % 4) / 4))
    const len = hh * (0.3 - t * 0.16)
    ctx.fillStyle = css(k % 2 === 0 ? 0xfff2b0 : 0xff9a2a, 0.85 * fade)
    circlePath(ctx, Math.cos(a) * d, Math.sin(a) * d, Math.max(1, len * 0.5))
    ctx.fill()
  }
}

function pelletFrame(ctx: Ctx, w: number, h: number) {
  const r = Math.min(w, h) / 2
  ctx.fillStyle = radial(ctx, 0, 0, 0, r, 0xffb0a0, 0xd0281c, 0.9, 0)
  circlePath(ctx, 0, 0, r)
  ctx.fill()
  ctx.fillStyle = radial(ctx, -r * 0.3, -r * 0.3, 0, r * 0.7, 0xfff0e0, 0xff5c4a)
  circlePath(ctx, 0, 0, r * 0.66)
  ctx.fill()
  ctx.fillStyle = css(0xffffff, 0.85)
  circlePath(ctx, -r * 0.2, -r * 0.24, r * 0.22)
  ctx.fill()
}

const MOUNTS: Record<string, RigDraw> = {
  "wpn-lager": (ctx, w, h, i, n) => barrelBottle(ctx, w, h, GLASS_AMBER, 0xc0392b, spinPhase(i, n)),
  "wpn-pony": (ctx, w, h, i, n) => neckBottle(ctx, w, h, GLASS_CLEAR, 0x2b4fc0, spinPhase(i, n)),
  "wpn-barbara": (ctx, w, h, i, n) => neckBottle(ctx, w, h, GLASS_PINK, 0x7a3fb0, spinPhase(i, n)),
  "wpn-dunkel": (ctx, w, h) => neckBottle(ctx, w, h, GLASS_AMBER, GLASS_GREEN, 0),
  "wpn-stange": (ctx, w, h) => neckBottle(ctx, w, h, GLASS_CLEAR, GLASS_YELLOW, 0),
  "wpn-pokal": (ctx, w, h) => goblet(ctx, w, h, GLASS_YELLOW),
  "wpn-can33": canRig,
  // "Chuebeli" is a beer mug in the DOS shop, not an ammo drum.
  "wpn-chuebeli": (ctx, w, h) => drawArt(ctx, "mug", w, h),
  "wpn-kanone": cannonRig,
}

const SHOTS: Record<string, RigDraw> = {
  // A lone sine repeats itself mirrored (frame i == frame n/2 - i); the cosine
  // core flicker keeps all 8 frames distinct.
  "shot-9": (ctx, w, h, i, n) =>
    energyBolt(
      ctx,
      w,
      h,
      0xffd54a,
      mix(0xffd54a, 0xffffff, 0.5 + 0.5 * Math.cos(spinPhase(i, n))),
      0.62 + 0.3 * Math.sin(spinPhase(i, n)),
    ),
  "shot-10": (ctx, w, h) => energyBolt(ctx, w, h, 0x7ee0ff, 0xffffff, 0.86),
  "shot-11": (ctx, w, h) => energyBolt(ctx, w, h, 0x5fd35f, 0xe2ffe2, 0.86),
  "shot-12": (ctx, w, h) => energyBolt(ctx, w, h, 0xb4bac4, 0xf2f4f7, 0.86),
  "shot-13": (ctx, w, h) => energyBolt(ctx, w, h, 0xff7a6a, 0xffe2dc, 0.86),
  "shot-14": cannonBall,
  "shot-15": (ctx, w, h, i) => capsule(ctx, w, h, 0xd8322a, STEEL, i),
  "shot-16": (ctx, w, h, i) => capsule(ctx, w, h, 0x7ee0ff, 0xeaf8ff, i),
  "shot-17": (ctx, w, h, i) => capsule(ctx, w, h, 0x5a6cff, 0xdfe4ff, i),
  // The four DOS fireballs are all red; vary only the hot core.
  "shot-18": (ctx, w, h) => energyBolt(ctx, w, h, 0xff3a2a, 0xffe0c0, 0.82),
  "shot-19": (ctx, w, h) => energyBolt(ctx, w, h, 0xff5a2a, 0xfff0b0, 0.82),
  "shot-20": (ctx, w, h) => energyBolt(ctx, w, h, 0xff2a3a, 0xffd0d0, 0.82),
  "shot-21": (ctx, w, h) => energyBolt(ctx, w, h, 0xff4a2a, 0xffffff, 0.82),
}

const SOLOS: Record<string, (ctx: Ctx, w: number, h: number) => void> = {
  cork: cork,
  pellet: pelletFrame,
}

export const RIG_ART_KEYS: string[] = [
  "ship",
  "explosion",
  ...Object.keys(SOLOS),
  ...Object.keys(MOUNTS),
  ...Object.keys(SHOTS),
]

export function drawRigArt(
  key: string,
  ctx: Ctx,
  w: number,
  h: number,
  i: number,
  n: number,
): boolean {
  const solo = SOLOS[key]
  if (solo) {
    centered(ctx, w, h, (c) => solo(c, w, h))
    return true
  }
  if (key === "ship") {
    centered(ctx, w, h, (c) => shipFrame(c, w, h, i, n))
    return true
  }
  if (key === "explosion") {
    centered(ctx, w, h, (c) => explosionFrame(c, w, h, i, n))
    return true
  }
  const draw = MOUNTS[key] ?? SHOTS[key]
  if (!draw) return false
  centered(ctx, w, h, (c) => draw(c, w, h, i, n))
  return true
}
