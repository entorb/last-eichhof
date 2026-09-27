import {
  arc,
  type Ctx,
  circlePath,
  css,
  ellipsePath,
  type Frame,
  glow,
  linear,
  mix,
  polyPath,
  radial,
  readableOn,
  roundRectPath,
  shade,
  stroke,
  wordmark,
} from "./vector"

export type FoeMotion = "spin" | "swing" | "pulse" | "none"

export interface FoeArtDef {
  art: FoeArtId
  motion?: FoeMotion
  glass?: number
  accent?: number
  word?: string
  /** Generator-specific look, e.g. an "open" stein lid or a "straw". */
  variant?: string
  /** Drawn upside down (the DOS falling/pouring bottles). */
  flip?: boolean
}

interface ArtFrame extends Frame {
  glass?: number
  accent?: number
  word?: string
  variant?: string
}

type Draw = (f: ArtFrame) => void

const CORK = 0xb98a4b
const CREAM = 0xf4ecd8
const INK = 0x1b1d24
const STEEL = 0xb9c2cf
const STEEL_DARK = 0x6b7484
const WOOD = 0xa8763f
const WOOD_DARK = 0x6b451f
const FOAM = 0xfff8e6
const LIME = 0x8bd450
const BONE = 0xe8e4d8

const GLASS_GREEN = 0x2f7d32
const GLASS_AMBER = 0xc98a1e
const GLASS_YELLOW = 0xd8bb2a
const GLASS_PINK = 0xd0407a
const GLASS_MAGENTA = 0xc23a9a
const GLASS_RED = 0xc0392b
const GLASS_CYAN = 0x2ab5c4
const GLASS_BLUE = 0x2b4fc0

function bottleBody(ctx: Ctx, w: number, h: number, neck: number) {
  const hw = w / 2
  const hh = h / 2
  const nw = Math.max(0.8, hw * neck)
  ctx.beginPath()
  ctx.moveTo(-nw, -hh)
  ctx.lineTo(-nw, -hh * 0.44)
  ctx.quadraticCurveTo(-nw, -hh * 0.08, -hw, hh * 0.04)
  ctx.lineTo(-hw, hh * 0.84)
  ctx.quadraticCurveTo(-hw, hh, 0, hh)
  ctx.quadraticCurveTo(hw, hh, hw, hh * 0.84)
  ctx.lineTo(hw, hh * 0.04)
  ctx.quadraticCurveTo(nw, -hh * 0.08, nw, -hh * 0.44)
  ctx.lineTo(nw, -hh)
  ctx.closePath()
}

function corkCap(ctx: Ctx, w: number, h: number, color: number) {
  const hw = w / 2
  const hh = h / 2
  const ch = Math.max(1.2, h * 0.07)
  const cw = hw * 0.42
  ctx.fillStyle = linear(ctx, -cw, -hh, cw, -hh + ch, shade(color, 1.25), color)
  roundRectPath(ctx, -cw, -hh, cw * 2, ch, Math.min(ch * 0.4, cw * 0.4))
  ctx.fill()
}

function labelPlate(ctx: Ctx, x: number, y: number, w: number, h: number, accent: number) {
  ctx.fillStyle = linear(ctx, x, y, x, y + h, CREAM, mix(CREAM, accent, 0.4))
  roundRectPath(ctx, x, y, w, h, Math.min(h * 0.2, w * 0.1))
  ctx.fill()
  ctx.fillStyle = css(accent, 0.9)
  ctx.fillRect(x, y + h * 0.72, w, h * 0.12)
  ctx.fillRect(x, y + h * 0.1, w, h * 0.08)
}

const EICHHOF_RED = 0xd0202c
const GLASS_BROWN = 0x7a4a22
const GLASS_WATER = 0x3af4ff

// The Eichhof brewery mark: two towers either side of a gated wall.
function eichhofMark(ctx: Ctx, x: number, y: number, s: number, color: number) {
  const u = s / 10
  ctx.fillStyle = css(color)
  ctx.fillRect(x - 5 * u, y - 3 * u, 3 * u, 8 * u)
  ctx.fillRect(x + 2 * u, y - 3 * u, 3 * u, 8 * u)
  ctx.fillRect(x - 2 * u, y - 0.5 * u, 4 * u, 5.5 * u)
  for (const cx of [-5, -3, 2, 4]) ctx.fillRect(x + cx * u, y - 5 * u, u, 2 * u)
  ctx.fillStyle = css(shade(color, 0.35))
  ctx.beginPath()
  ctx.moveTo(x - 1.2 * u, y + 5 * u)
  ctx.lineTo(x - 1.2 * u, y + 2 * u)
  ctx.arc(x, y + 2 * u, 1.2 * u, Math.PI, 0)
  ctx.lineTo(x + 1.2 * u, y + 5 * u)
  ctx.closePath()
  ctx.fill()
}

// A rampant heraldic lion, facing left.
function lionMark(ctx: Ctx, x: number, y: number, s: number, color: number) {
  const u = s / 10
  const pts: [number, number][] = [
    [-1, -5],
    [1, -5],
    [2, -3.5],
    [1.5, -2],
    [3, -1],
    [3, 1.5],
    [4, 3],
    [3.5, 5],
    [2, 5],
    [1.5, 3],
    [0, 2.5],
    [-1, 5],
    [-2.5, 5],
    [-1.5, 2],
    [-2, 0],
    [-4, -1.5],
    [-3.5, -2.5],
    [-1.5, -1.5],
    [-2.5, -3],
    [-4, -3.5],
    [-3, -4.5],
  ]
  polyPath(
    ctx,
    pts.map(([px, py]) => [x + px * u, y + py * u] as [number, number]),
  )
  ctx.fillStyle = css(color)
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(x + 3 * u, y + u)
  ctx.quadraticCurveTo(x + 5.5 * u, y - u, x + 4.5 * u, y - 4 * u)
  ctx.lineCap = "round"
  stroke(ctx, color, u * 0.8)
}

// The Bavarian blue-and-white lozenges.
function rautenBand(ctx: Ctx, x: number, y: number, bw: number, bh: number, color: number) {
  ctx.save()
  roundRectPath(ctx, x - bw / 2, y - bh / 2, bw, bh, bh * 0.12)
  ctx.clip()
  ctx.fillStyle = css(0xffffff)
  ctx.fillRect(x - bw / 2, y - bh / 2, bw, bh)
  const d = bh / 3
  ctx.fillStyle = css(color)
  for (let i = -1; i * d < bw + d; i++) {
    for (let j = -1; j <= 4; j++) {
      if ((i + j) % 2 !== 0) continue
      const cx = x - bw / 2 + i * d
      const cy = y - bh / 2 + j * d
      polyPath(ctx, [
        [cx, cy - d / 2],
        [cx + d / 2, cy],
        [cx, cy + d / 2],
        [cx - d / 2, cy],
      ])
      ctx.fill()
    }
  }
  ctx.restore()
  roundRectPath(ctx, x - bw / 2, y - bh / 2, bw, bh, bh * 0.12)
  stroke(ctx, color, bh * 0.08)
}

const spin = (f: Frame) => (f.n > 1 ? (f.i / f.n) * Math.PI * 2 : 0)

// Three spokes, so even a 2-frame strip (a half turn) shows the wheel moving.
function wheel(ctx: Ctx, x: number, y: number, r: number, phase: number) {
  circlePath(ctx, x, y, r)
  ctx.fillStyle = css(0x14161d)
  ctx.fill()
  circlePath(ctx, x, y, r * 0.86)
  stroke(ctx, 0x6b7484, r * 0.14)
  ctx.strokeStyle = css(0x8b93a3)
  ctx.lineWidth = Math.max(0.8, r * 0.18)
  ctx.lineCap = "round"
  for (let k = 0; k < 3; k++) {
    const a = phase + (k / 3) * Math.PI * 2
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + Math.cos(a) * r * 0.72, y + Math.sin(a) * r * 0.72)
    ctx.stroke()
  }
  circlePath(ctx, x, y, r * 0.26)
  ctx.fillStyle = css(0xb9c2cf)
  ctx.fill()
}

function applePath(ctx: Ctx, r: number) {
  ctx.beginPath()
  ctx.moveTo(0, -r * 0.5)
  ctx.bezierCurveTo(r * 1.2, -r * 1.2, r * 1.5, r * 0.3, r * 0.6, r * 1.15)
  ctx.bezierCurveTo(r * 0.2, r * 1.3, -r * 0.2, r * 1.3, -r * 0.6, r * 1.15)
  ctx.bezierCurveTo(-r * 1.5, r * 0.3, -r * 1.2, -r * 1.2, 0, -r * 0.5)
  ctx.closePath()
}

function appleLeaf(ctx: Ctx, r: number, color: number) {
  ctx.fillStyle = css(color, 0.95)
  ctx.save()
  ctx.rotate(-0.5)
  ctx.beginPath()
  ctx.ellipse(-r * 0.2, -r * 0.95, r * 0.4, r * 0.18, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

const ART = {
  bottle(f) {
    const { ctx, w, h } = f
    const g = f.glass ?? GLASS_AMBER
    bottleBody(ctx, w * 0.98, h * 0.98, 0.2)
    ctx.fillStyle = linear(
      ctx,
      -w / 2,
      0,
      w / 2,
      0,
      shade(g, 0.45),
      mix(shade(g, 0.7), 0xffffff, 0.45),
    )
    ctx.fill()
    bottleBody(ctx, w * 0.98, h * 0.98, 0.2)
    ctx.fillStyle = linear(ctx, -w / 2, 0, w / 2, 0, shade(g, 0.3), g, 1, 0.9)
    ctx.fill()
    ctx.fillStyle = linear(ctx, w * 0.1, -h / 2, w * 0.42, h / 2, 0xffffff, 0xffffff, 0.45, 0)
    ctx.fill()
    ctx.fillStyle = css(0xffffff, 0.5)
    ctx.fillRect(-w * 0.24, -h * 0.3, Math.max(0.8, w * 0.08), h * 0.72)
    const lw = w * 0.72
    labelPlate(ctx, -lw / 2, -h * 0.02, lw, h * 0.34, f.accent ?? g)
    corkCap(ctx, w, h, CORK)
    glow(ctx, 0, -h * 0.42, Math.max(0.6, w * 0.1), 0xfff0c0, w * 0.3)
  },

  can(f) {
    const { ctx, w, h } = f
    const g = f.glass ?? GLASS_CYAN
    const bw = w * 0.8
    const bh = h * 0.88
    ctx.fillStyle = linear(ctx, -bw / 2, 0, bw / 2, 0, shade(g, 0.4), mix(g, 0xffffff, 0.5))
    roundRectPath(ctx, -bw / 2, -bh / 2, bw, bh, Math.min(bw, bh) * 0.16)
    ctx.fill()
    ctx.fillStyle = linear(ctx, -bw / 2, 0, bw / 2, 0, shade(g, 0.75), g, 0.2, 0.85)
    roundRectPath(ctx, -bw / 2, -bh / 2, bw, bh, Math.min(bw, bh) * 0.16)
    ctx.fill()
    ctx.fillStyle = css(0xffffff, 0.45)
    ctx.fillRect(-bw * 0.3, -bh * 0.38, bw * 0.12, bh * 0.72)
    ctx.fillStyle = linear(ctx, 0, -bh / 2, 0, bh / 2, STEEL, shade(STEEL, 0.6))
    ellipsePath(ctx, 0, -bh / 2, bw / 2, bh * 0.11)
    ctx.fill()
    ctx.fillStyle = css(INK, 0.6)
    ellipsePath(ctx, 0, -bh / 2, bw * 0.3, bh * 0.06)
    ctx.fill()
    ctx.fillStyle = css(CREAM, 0.95)
    ctx.fillRect(-bw / 2, -bh * 0.04, bw, bh * 0.2)
    ctx.fillStyle = css(g, 0.95)
    ctx.fillRect(-bw / 2, bh * 0.1, bw, bh * 0.05)
  },

  mug(f) {
    const { ctx, w, h } = f
    const g = f.glass ?? GLASS_YELLOW
    const bw = w * 0.66
    const bh = h * 0.86
    ctx.strokeStyle = linear(ctx, w * 0.2, -h * 0.2, w * 0.5, h * 0.2, STEEL, STEEL_DARK)
    ctx.lineWidth = Math.max(1, w * 0.09)
    ctx.beginPath()
    ctx.arc(w * 0.3, 0, h * 0.2, -Math.PI * 0.5, Math.PI * 0.5)
    ctx.stroke()
    const bowl = () => {
      ctx.beginPath()
      ctx.moveTo(-bw / 2, -bh * 0.34)
      ctx.lineTo(-bw * 0.42, bh * 0.46)
      ctx.lineTo(bw * 0.42, bh * 0.46)
      ctx.lineTo(bw / 2, -bh * 0.34)
      ctx.closePath()
    }
    bowl()
    ctx.fillStyle = linear(ctx, -bw / 2, 0, bw / 2, 0, shade(g, 0.55), mix(g, 0xffffff, 0.55))
    ctx.fill()
    bowl()
    ctx.fillStyle = linear(ctx, -bw / 2, 0, bw / 2, 0, shade(g, 0.85), g, 0.15, 0.9)
    ctx.fill()
    ctx.fillStyle = css(0xffffff, 0.4)
    ctx.fillRect(-bw * 0.3, -bh * 0.24, bw * 0.1, bh * 0.6)
    ctx.fillStyle = linear(ctx, 0, -bh * 0.6, 0, -bh * 0.28, FOAM, 0xe8dcae)
    ellipsePath(ctx, 0, -bh * 0.34, bw * 0.56, bh * 0.14)
    ctx.fill()
    ctx.fillStyle = css(FOAM, 0.95)
    for (let k = 0; k < 3; k++) {
      circlePath(ctx, (k - 1) * bw * 0.22, -bh * 0.42, bw * 0.07)
      ctx.fill()
    }
  },

  glass(f) {
    const { ctx, w, h } = f
    const g = f.glass ?? GLASS_YELLOW
    const bw = w * 0.78
    ctx.beginPath()
    ctx.moveTo(-bw / 2, -h * 0.48)
    ctx.lineTo(-bw * 0.4, -h * 0.02)
    ctx.lineTo(bw * 0.4, -h * 0.02)
    ctx.lineTo(bw / 2, -h * 0.48)
    ctx.closePath()
    ctx.fillStyle = linear(ctx, -bw / 2, 0, bw / 2, 0, shade(g, 0.5), mix(g, 0xffffff, 0.4))
    ctx.fill()
    ctx.fillStyle = linear(ctx, 0, -h * 0.42, 0, -h * 0.06, mix(g, 0xffffff, 0.3), g, 0.95, 0.95)
    ctx.fill()
    ctx.fillStyle = linear(ctx, 0, -h * 0.62, 0, -h * 0.44, FOAM, 0xe6d9a8)
    ellipsePath(ctx, 0, -h * 0.48, bw * 0.52, h * 0.12)
    ctx.fill()
    ctx.fillStyle = css(0xffffff, 0.45)
    ctx.fillRect(-bw * 0.32, -h * 0.4, bw * 0.1, h * 0.3)
    ctx.fillStyle = linear(ctx, -w * 0.08, 0, w * 0.08, 0, STEEL, STEEL_DARK)
    ctx.fillRect(-w * 0.05, -h * 0.02, w * 0.1, h * 0.2)
    ctx.fillStyle = css(STEEL, 0.9)
    ellipsePath(ctx, 0, h * 0.44, w * 0.36, h * 0.05)
    ctx.fill()
  },

  barrel(f) {
    const { ctx, w, h } = f
    const rx = w * 0.44
    const ry = h * 0.48
    const skin = () => {
      ctx.beginPath()
      ctx.moveTo(-rx * 0.76, -ry)
      ctx.quadraticCurveTo(-rx * 1.16, 0, -rx * 0.76, ry)
      ctx.lineTo(rx * 0.76, ry)
      ctx.quadraticCurveTo(rx * 1.16, 0, rx * 0.76, -ry)
      ctx.closePath()
    }
    skin()
    ctx.fillStyle = linear(ctx, -rx, 0, rx, 0, WOOD_DARK, mix(WOOD, 0xffffff, 0.25))
    ctx.fill()
    skin()
    ctx.fillStyle = linear(ctx, -rx, 0, rx, 0, shade(WOOD, 1.05), WOOD, 0.15, 0.9)
    ctx.fill()
    ctx.strokeStyle = css(STEEL_DARK, 0.9)
    ctx.lineWidth = Math.max(1, w * 0.045)
    for (const y of [-ry * 0.6, 0, ry * 0.6]) {
      ctx.beginPath()
      ctx.moveTo(-rx * 1.02, y)
      ctx.quadraticCurveTo(0, y + ry * 0.08, rx * 1.02, y)
      ctx.stroke()
    }
    ctx.fillStyle = css(0xffffff, 0.14)
    ctx.fillRect(-rx * 0.5, -ry * 0.9, rx * 0.18, ry * 1.8)
  },

  crate(f) {
    const { ctx, w, h } = f
    const s = Math.min(w, h) * 0.92
    ctx.fillStyle = linear(ctx, -s / 2, -s / 2, s / 2, s / 2, mix(WOOD, 0xffffff, 0.2), WOOD_DARK)
    ctx.fillRect(-s / 2, -s / 2, s, s)
    ctx.strokeStyle = css(shade(WOOD_DARK, 0.8), 0.9)
    ctx.lineWidth = Math.max(1, s * 0.09)
    ctx.beginPath()
    ctx.moveTo(-s / 2, -s / 2)
    ctx.lineTo(s / 2, s / 2)
    ctx.moveTo(s / 2, -s / 2)
    ctx.lineTo(-s / 2, s / 2)
    ctx.stroke()
    ctx.strokeStyle = css(shade(WOOD_DARK, 0.6), 0.95)
    ctx.lineWidth = Math.max(1, s * 0.07)
    ctx.strokeRect(-s / 2, -s / 2, s, s)
    ctx.fillStyle = css(shade(WOOD_DARK, 0.7), 0.8)
    for (const [x, y] of [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ] as const) {
      circlePath(ctx, (x * s) / 2.6, (y * s) / 2.6, s * 0.06)
      ctx.fill()
    }
  },

  crest(f) {
    const { ctx, w, h } = f
    const red = f.accent ?? 0xd0202c
    const hw = w * 0.44
    const hh = h * 0.46
    const shield = () => {
      ctx.beginPath()
      ctx.moveTo(-hw, -hh)
      ctx.lineTo(hw, -hh)
      ctx.lineTo(hw, hh * 0.1)
      ctx.quadraticCurveTo(hw, hh * 0.75, 0, hh)
      ctx.quadraticCurveTo(-hw, hh * 0.75, -hw, hh * 0.1)
      ctx.closePath()
    }
    shield()
    ctx.fillStyle = linear(ctx, 0, -hh, 0, hh, mix(red, 0xffffff, 0.2), shade(red, 0.7))
    ctx.fill()
    ctx.save()
    ctx.clip()
    ctx.fillStyle = css(0x1d7a3c, 0.9)
    ctx.fillRect(0, -hh, hw, hh * 1.2)
    ctx.fillStyle = css(0xffffff, 0.85)
    ctx.fillRect(0, -hh, hw * 0.22, hh * 1.2)
    ctx.fillRect(hw * 0.78, -hh, hw * 0.22, hh * 1.2)
    ctx.fillStyle = css(0x2b6fd0, 0.85)
    ctx.fillRect(-hw, hh * 0.16, hw * 2, hh * 0.3)
    ctx.fillStyle = css(0xe8c33a, 0.9)
    ctx.fillRect(-hw, -hh * 0.06, hw * 2, hh * 0.16)
    const cells = 4
    const cw = (hw * 2) / cells
    ctx.fillStyle = css(0xffffff, 0.8)
    for (let r = 0; r < 2; r++) {
      for (let c2 = 0; c2 < cells; c2++) {
        if ((r + c2) % 2 === 0) continue
        ctx.fillRect(-hw + c2 * cw, hh * 0.16 + r * hh * 0.15, cw, hh * 0.15)
      }
    }
    ctx.restore()
    shield()
    stroke(ctx, 0xf5e2b0, Math.max(1.2, h * 0.035), 0.9)
  },

  castle(f) {
    const { ctx, w, h } = f
    const hw = w * 0.46
    const brick = 0xc8281c
    ctx.fillStyle = linear(ctx, -hw, 0, hw, 0, mix(brick, 0xffffff, 0.22), shade(brick, 0.62))
    ctx.fillRect(-hw, -h * 0.1, w * 0.92, h * 0.56)
    ctx.fillStyle = css(0x1e2026)
    for (const x of [-hw, hw - w * 0.24]) {
      polyPath(ctx, [
        [x, -h * 0.1],
        [x + w * 0.12, -h * 0.46],
        [x + w * 0.24, -h * 0.1],
      ])
      ctx.fill()
    }
    ctx.fillStyle = css(shade(brick, 1.12), 0.95)
    for (let r = 0; r < 4; r++) {
      for (let c2 = 0; c2 < 9; c2++) {
        ctx.fillRect(-hw + 0.02 * w + c2 * 0.1 * w, -h * 0.06 + r * h * 0.13, w * 0.07, h * 0.1)
      }
    }
    ctx.fillStyle = linear(ctx, 0, h * 0.2, 0, h * 0.46, 0x2a0d0a, 0x120605)
    ctx.beginPath()
    ctx.moveTo(-w * 0.12, h * 0.46)
    ctx.lineTo(-w * 0.12, h * 0.3)
    ctx.quadraticCurveTo(0, h * 0.12, w * 0.12, h * 0.3)
    ctx.lineTo(w * 0.12, h * 0.46)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = css(0x5c1a12, 0.7)
    ctx.lineWidth = Math.max(1, h * 0.012)
    for (let k = 0; k < 4; k++) {
      ctx.beginPath()
      ctx.moveTo(-hw, -h * 0.02 + k * h * 0.14)
      ctx.lineTo(hw, -h * 0.02 + k * h * 0.14)
      ctx.stroke()
    }
    ctx.strokeStyle = css(0xd8c15a, 0.95)
    ctx.lineWidth = Math.max(1, w * 0.014)
    for (const lean of [-0.16, 0.16]) {
      ctx.beginPath()
      ctx.moveTo(lean * w, h * 0.46)
      ctx.lineTo(lean * w, -h * 0.1)
      ctx.stroke()
      for (let k = 0; k < 5; k++) {
        const y = -h * 0.08 + k * h * 0.11
        const dir = k % 2 === 0 ? 1 : -1
        ctx.beginPath()
        ctx.moveTo(lean * w, y)
        ctx.quadraticCurveTo(lean * w + dir * w * 0.05, y - h * 0.05, lean * w, y - h * 0.08)
        ctx.stroke()
      }
    }
  },

  cocktail(f) {
    const { ctx, w, h } = f
    const top = f.glass ?? GLASS_PINK
    const bowlTop = -h * 0.34
    const bowl = () => {
      ctx.beginPath()
      ctx.moveTo(-w * 0.44, bowlTop)
      ctx.lineTo(-w * 0.12, h * 0.1)
      ctx.lineTo(w * 0.12, h * 0.1)
      ctx.lineTo(w * 0.44, bowlTop)
      ctx.closePath()
    }
    bowl()
    ctx.fillStyle = linear(ctx, 0, bowlTop, 0, h * 0.1, shade(top, 1.25), shade(top, 0.6))
    ctx.fill()
    ctx.save()
    ctx.clip()
    ctx.fillStyle = css(mix(top, 0xffffff, 0.35), 0.85)
    ctx.fillRect(-w * 0.5, bowlTop, w, h * 0.1)
    ctx.fillStyle = css(0xffffff, 0.5)
    ctx.fillRect(-w * 0.5, bowlTop, w, h * 0.05)
    ctx.fillStyle = css(LIME, 0.95)
    ctx.beginPath()
    ctx.ellipse(-w * 0.16, bowlTop + h * 0.02, w * 0.16, h * 0.045, 0.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
    bowl()
    stroke(ctx, 0xffffff, Math.max(0.8, w * 0.03), 0.5)
    ctx.fillStyle = linear(ctx, -w * 0.03, 0, w * 0.03, 0, 0xffffff, 0xb0b8c4)
    ctx.fillRect(-w * 0.03, h * 0.08, w * 0.06, h * 0.26)
    ctx.fillStyle = css(0xffffff, 0.85)
    ellipsePath(ctx, 0, h * 0.36, w * 0.26, h * 0.04)
    ctx.fill()
    ctx.strokeStyle = css(GLASS_RED, 0.95)
    ctx.lineWidth = Math.max(0.8, w * 0.035)
    ctx.beginPath()
    ctx.moveTo(w * 0.16, h * 0.1)
    ctx.lineTo(w * 0.3, -h * 0.46)
    ctx.stroke()
  },

  santa(f) {
    const { ctx, w, h } = f
    const t = f.n > 1 ? f.i / f.n : 0
    const sway = Math.sin(t * Math.PI * 2) * w * 0.12
    ctx.fillStyle = linear(ctx, 0, -h * 0.2, 0, h * 0.5, 0xf0464a, 0x8d1b22)
    ctx.beginPath()
    ctx.moveTo(-w * 0.3, h * 0.48)
    ctx.lineTo(-w * 0.22, -h * 0.18)
    ctx.lineTo(w * 0.22, -h * 0.18)
    ctx.lineTo(w * 0.3, h * 0.48)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = css(0x8d1b22, 0.9)
    ctx.fillRect(-w * 0.32, h * 0.4, w * 0.64, h * 0.1)
    ctx.fillStyle = css(0xffffff, 0.95)
    ctx.beginPath()
    ctx.moveTo(-w * 0.34, -h * 0.2)
    ctx.lineTo(w * 0.34, -h * 0.2)
    ctx.lineTo(w * 0.3, -h * 0.06)
    ctx.lineTo(-w * 0.3, -h * 0.06)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = radial(ctx, -w * 0.05, -h * 0.36, w * 0.03, w * 0.3, 0xfff4e2, 0xf6d3bc)
    circlePath(ctx, 0, -h * 0.36, w * 0.24)
    ctx.fill()
    ctx.fillStyle = css(0xffffff, 0.98)
    ctx.beginPath()
    ctx.moveTo(-w * 0.24, -h * 0.24)
    ctx.lineTo(w * 0.24, -h * 0.24)
    ctx.lineTo(w * 0.16, -h * 0.44)
    ctx.quadraticCurveTo(-w * 0.1, -h * 0.56, -w * 0.26, -h * 0.4)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = css(0xf0464a, 0.95)
    ctx.beginPath()
    ctx.moveTo(-w * 0.28, -h * 0.44)
    ctx.quadraticCurveTo(-w * 0.05, -h * 0.6, w * 0.3, -h * 0.46)
    ctx.quadraticCurveTo(0, -h * 0.5, -w * 0.28, -h * 0.4)
    ctx.closePath()
    ctx.fill()
    circlePath(ctx, w * 0.31, -h * 0.47, w * 0.07)
    ctx.fillStyle = css(0xffffff, 0.98)
    ctx.fill()
    ctx.fillStyle = css(0x2b2b33, 0.9)
    for (const dx of [-0.08, 0.08]) {
      circlePath(ctx, w * dx, -h * 0.38, w * 0.028)
      ctx.fill()
    }
    ctx.strokeStyle = css(0xf0464a, 0.95)
    ctx.lineWidth = Math.max(1, w * 0.09)
    ctx.lineCap = "round"
    ctx.beginPath()
    ctx.moveTo(-w * 0.24, -h * 0.02)
    ctx.lineTo(-w * 0.34 - sway, h * 0.22)
    ctx.moveTo(w * 0.24, -h * 0.02)
    ctx.lineTo(w * 0.34 + sway, h * 0.22)
    ctx.stroke()
  },

  dollar(f) {
    const { ctx, w, h } = f
    const g = f.glass ?? 0xe8c33a
    const size = Math.min(w, h) * 0.98
    wordmark(ctx, "$", 0, 0, size, shade(g, 0.7), 1, 900)
    wordmark(ctx, "$", -size * 0.02, -size * 0.03, size, g, 1, 900)
  },

  pills(f) {
    const { ctx, w, h } = f
    const card = f.accent ?? 0x2ec4a0
    ctx.fillStyle = linear(ctx, 0, -h / 2, 0, h / 2, mix(card, 0xffffff, 0.35), shade(card, 0.75))
    roundRectPath(ctx, -w * 0.48, -h * 0.46, w * 0.96, h * 0.92, h * 0.12)
    ctx.fill()
    const cols = 4
    const rows = 2
    const cw = (w * 0.9) / cols
    const ch = (h * 0.84) / rows
    const pr = Math.min(cw, ch) * 0.32
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = -w * 0.45 + cw * (col + 0.5)
        const y = -h * 0.42 + ch * (row + 0.5)
        ctx.fillStyle = radial(ctx, x - pr * 0.3, y - pr * 0.3, pr * 0.1, pr, 0x4a5060, 0x14161d)
        circlePath(ctx, x, y, pr)
        ctx.fill()
        ctx.fillStyle = css(0xffffff, 0.35)
        circlePath(ctx, x - pr * 0.35, y - pr * 0.35, pr * 0.22)
        ctx.fill()
      }
    }
  },

  rainbow(f) {
    const { ctx, w, h } = f
    const r = Math.min(w, h) * 0.34
    const stripes = [0x61bb46, 0xfdb827, 0xf5821f, 0xe03a3e, 0x963d97, 0x009ddc]
    ctx.save()
    applePath(ctx, r)
    ctx.clip()
    const top = -r * 0.9
    const band = (r * 2.25) / stripes.length
    for (const [k, color] of stripes.entries()) {
      ctx.fillStyle = linear(ctx, -r * 1.4, 0, r * 1.4, 0, mix(color, 0xffffff, 0.3), color)
      ctx.fillRect(-r * 1.5, top + k * band, r * 3, band + 0.5)
    }
    // The bite.
    ctx.globalCompositeOperation = "destination-out"
    circlePath(ctx, r * 1.12, r * 0.1, r * 0.36)
    ctx.fill()
    ctx.restore()
    appleLeaf(ctx, r, stripes[0] ?? LIME)
  },

  core(f) {
    const { ctx, w, h } = f
    const r = Math.min(w * 0.4, h * 0.3)
    const hh = h * 0.4
    ctx.beginPath()
    ctx.moveTo(-r, -hh * 0.72)
    ctx.quadraticCurveTo(0, -hh, r, -hh * 0.72)
    ctx.quadraticCurveTo(r * 0.15, 0, r, hh * 0.78)
    ctx.quadraticCurveTo(0, hh * 1.02, -r, hh * 0.78)
    ctx.quadraticCurveTo(-r * 0.15, 0, -r, -hh * 0.72)
    ctx.closePath()
    ctx.fillStyle = linear(ctx, -r, 0, r, 0, 0xfff6cf, 0xe2c97e)
    ctx.fill()
    for (const y of [-hh * 0.76, hh * 0.8]) {
      ctx.fillStyle = linear(ctx, -r, y, r, y, 0xc6e05a, 0x6f9a22)
      ellipsePath(ctx, 0, y, r * 1.02, hh * 0.13)
      ctx.fill()
    }
    ctx.fillStyle = css(0x5a3a1a, 0.9)
    ellipsePath(ctx, -r * 0.12, -hh * 0.1, r * 0.08, r * 0.14)
    ctx.fill()
    ellipsePath(ctx, r * 0.12, hh * 0.1, r * 0.08, r * 0.14)
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(0, -hh * 0.84)
    ctx.quadraticCurveTo(r * 0.05, -hh * 1.05, r * 0.25, -hh * 1.12)
    stroke(ctx, WOOD_DARK, r * 0.14)
  },

  coin(f) {
    const { ctx, w, h } = f
    const r = Math.min(w, h) * 0.46
    circlePath(ctx, 0, 0, r)
    ctx.fillStyle = radial(ctx, -r * 0.3, -r * 0.3, r * 0.1, r * 1.1, 0xffffff, 0x9aa3ad)
    ctx.fill()
    circlePath(ctx, 0, 0, r * 0.84)
    stroke(ctx, STEEL_DARK, r * 0.06, 0.8)
    wordmark(ctx, f.word ?? "5", 0, r * 0.04, r, STEEL_DARK, 0.9, 900, r * 1.4)
  },

  text(f) {
    const { ctx, w, h } = f
    const lines = (f.word ?? "").split(" ")
    const color = f.accent ?? 0xf2f4f7
    const lh = h / lines.length
    for (const [k, line] of lines.entries()) {
      const y = -h / 2 + lh * (k + 0.5)
      const size = lh * 0.9
      wordmark(ctx, line, size * 0.05, y + size * 0.06, size, shade(color, 0.3), 0.9, 900, w * 0.96)
      wordmark(ctx, line, 0, y, size, color, 1, 900, w * 0.96)
    }
  },

  loco(f) {
    const { ctx, w, h } = f
    const hw = w / 2
    const hh = h / 2
    const body = 0x2e323c
    const phase = spin(f)
    ctx.fillStyle = linear(
      ctx,
      0,
      -hh * 0.3,
      0,
      hh * 0.2,
      mix(body, 0xffffff, 0.35),
      shade(body, 0.6),
    )
    roundRectPath(ctx, -hw * 0.35, -hh * 0.3, w * 0.62, h * 0.4, h * 0.18)
    ctx.fill()
    ctx.fillStyle = linear(
      ctx,
      0,
      -hh * 0.6,
      0,
      hh * 0.3,
      mix(body, 0xffffff, 0.25),
      shade(body, 0.7),
    )
    roundRectPath(ctx, -hw * 0.95, -hh * 0.74, w * 0.3, h * 0.86, h * 0.05)
    ctx.fill()
    ctx.fillStyle = css(shade(body, 0.6))
    ctx.fillRect(-hw * 0.99, -hh * 0.84, w * 0.36, h * 0.1)
    ctx.fillStyle = css(0xffd27a, 0.9)
    roundRectPath(ctx, -hw * 0.86, -hh * 0.58, w * 0.12, h * 0.24, h * 0.03)
    ctx.fill()
    ctx.fillStyle = linear(ctx, hw * 0.56, 0, hw * 0.74, 0, mix(body, 0xffffff, 0.3), body)
    ctx.fillRect(hw * 0.58, -hh * 0.8, w * 0.07, h * 0.55)
    roundRectPath(ctx, hw * 0.54, -hh * 0.9, w * 0.15, h * 0.1, h * 0.03)
    ctx.fill()
    ellipsePath(ctx, hw * 0.1, -hh * 0.34, w * 0.05, h * 0.1)
    ctx.fill()
    ctx.fillStyle = css(0x14161d)
    ctx.fillRect(-hw * 0.95, hh * 0.1, w * 0.92, h * 0.08)
    ctx.fillStyle = css(0xc0392b)
    ctx.fillRect(hw * 0.88, hh * 0.02, w * 0.05, h * 0.2)
    const wr = h * 0.22
    const wy = hh - wr
    const xs = [-hw * 0.55, -hw * 0.05, hw * 0.45]
    for (const x of xs) wheel(ctx, x, wy, wr, phase)
    const px = Math.cos(phase) * wr * 0.55
    const py = Math.sin(phase) * wr * 0.55
    ctx.beginPath()
    ctx.moveTo((xs[0] ?? 0) + px, wy + py)
    ctx.lineTo((xs[2] ?? 0) + px, wy + py)
    ctx.lineCap = "round"
    stroke(ctx, 0xd8dde4, h * 0.035)
  },

  smoke(f) {
    const { ctx, w, h } = f
    const t = f.n > 1 ? f.i / f.n : 0
    const m = Math.min(w, h)
    const puffs: [number, number, number][] = [
      [-0.16, 0.24, 0.24],
      [0.16, 0.2, 0.22],
      [0, -0.04, 0.28],
      [-0.12, -0.28, 0.18],
      [0.14, -0.3, 0.16],
    ]
    for (const [k, [x, y, r]] of puffs.entries()) {
      const wob = Math.sin((t + k * 0.23) * Math.PI * 2)
      const rr = m * r * 1.35 * (1 + 0.1 * wob)
      const cx = x * w + wob * w * 0.03
      const cy = y * h
      ctx.fillStyle = radial(
        ctx,
        cx - rr * 0.3,
        cy - rr * 0.3,
        rr * 0.1,
        rr,
        0xe8eaee,
        0x6b7280,
        0.95,
        0.8,
      )
      circlePath(ctx, cx, cy, rr)
      ctx.fill()
    }
  },

  // The DOS foe is the After Dark flying toaster, so the wings must flap.
  toaster(f) {
    const { ctx, w, h } = f
    const flap = Math.sin(spin(f))
    const bw = w * 0.58
    const bh = h * 0.56
    const bx = -w * 0.42
    const by = -h * 0.16
    ctx.fillStyle = linear(ctx, 0, by - bh * 0.14, 0, by, 0xe8b060, 0xa8642a)
    roundRectPath(ctx, bx + bw * 0.2, by - bh * 0.14, bw * 0.46, bh * 0.2, bh * 0.05)
    ctx.fill()
    ctx.save()
    ctx.translate(bx + bw * 0.86, by + bh * 0.3)
    ctx.rotate(-0.35 - flap * 0.5)
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.quadraticCurveTo(w * 0.2, -h * 0.28, w * 0.44, -h * 0.12)
    ctx.quadraticCurveTo(w * 0.26, -h * 0.03, w * 0.34, h * 0.05)
    ctx.quadraticCurveTo(w * 0.16, h * 0.05, 0, h * 0.08)
    ctx.closePath()
    ctx.fillStyle = linear(ctx, 0, 0, w * 0.44, 0, 0xffffff, 0xcfd6e0)
    ctx.fill()
    stroke(ctx, 0x9aa3ad, Math.max(0.8, w * 0.012), 0.8)
    ctx.restore()
    ctx.fillStyle = linear(ctx, bx, 0, bx + bw, 0, 0xf2f4f7, 0x7f8896)
    roundRectPath(ctx, bx, by, bw, bh, bh * 0.2)
    ctx.fill()
    ctx.fillStyle = css(INK, 0.85)
    for (const y of [0.08, 0.2]) {
      roundRectPath(ctx, bx + bw * 0.14, by + bh * y, bw * 0.72, bh * 0.07, bh * 0.03)
      ctx.fill()
    }
    ctx.fillStyle = css(0xffffff, 0.45)
    ctx.fillRect(bx + bw * 0.12, by + bh * 0.4, bw * 0.12, bh * 0.48)
    ctx.fillStyle = css(STEEL_DARK)
    ctx.fillRect(bx - w * 0.04, by + bh * 0.42, w * 0.05, bh * 0.12)
  },

  brain(f) {
    const { ctx, w, h } = f
    const rx = w * 0.46
    const ry = h * 0.44
    const lobes: [number, number, number][] = [
      [-0.62, -0.2, 0.34],
      [-0.2, -0.52, 0.36],
      [0.26, -0.44, 0.34],
      [0.62, -0.08, 0.3],
      [-0.44, 0.4, 0.3],
      [0.16, 0.44, 0.3],
    ]
    ctx.fillStyle = linear(ctx, 0, ry * 0.2, 0, ry * 0.55, 0xd99070, 0x8c3f2c)
    ctx.beginPath()
    ctx.ellipse(0, ry * 0.46, rx * 0.24, ry * 0.26, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = radial(ctx, -rx * 0.28, -ry * 0.4, rx * 0.08, rx * 1.35, 0xf6c0a0, 0xa8543a)
    for (const [lx, ly, lr] of lobes) {
      ctx.beginPath()
      ctx.ellipse(rx * lx, ry * ly, rx * lr, ry * lr * 1.05, 0, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.strokeStyle = css(0x8c3f2c, 0.55)
    ctx.lineWidth = Math.max(1, w * 0.01)
    for (const [lx, ly] of lobes) {
      ctx.beginPath()
      ctx.moveTo(rx * lx * 0.2, ry * ly * 0.2)
      ctx.quadraticCurveTo(rx * lx * 0.7, ry * ly * 0.7, rx * lx * 0.95, ry * ly * 0.9)
      ctx.stroke()
    }
    ctx.fillStyle = css(0xffffff, 0.25)
    ctx.beginPath()
    ctx.ellipse(-rx * 0.44, -ry * 0.44, rx * 0.22, ry * 0.13, -0.4, 0, Math.PI * 2)
    ctx.fill()
  },

  pot(f) {
    const { ctx, w, h } = f
    const g = f.glass ?? GLASS_BLUE
    ctx.strokeStyle = css(shade(g, 0.75))
    ctx.lineWidth = Math.max(1.2, w * 0.09)
    ctx.beginPath()
    ctx.arc(w * 0.34, -h * 0.02, h * 0.2, -Math.PI * 0.55, Math.PI * 0.55)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(-w * 0.3, -h * 0.12)
    ctx.quadraticCurveTo(-w * 0.56, 0, -w * 0.32, h * 0.16)
    ctx.stroke()
    ctx.fillStyle = radial(
      ctx,
      -w * 0.12,
      -h * 0.1,
      w * 0.05,
      w * 0.44,
      mix(g, 0xffffff, 0.45),
      shade(g, 0.55),
    )
    ctx.beginPath()
    ctx.ellipse(0, h * 0.04, w * 0.36, h * 0.3, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = linear(ctx, 0, -h * 0.32, 0, -h * 0.14, mix(g, 0xffffff, 0.3), g)
    ctx.beginPath()
    ctx.ellipse(0, -h * 0.22, w * 0.22, h * 0.09, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = css(shade(g, 1.2))
    circlePath(ctx, 0, -h * 0.32, w * 0.06)
    ctx.fill()
    ctx.fillStyle = css(0xffffff, 0.35)
    ctx.beginPath()
    ctx.ellipse(-w * 0.14, -h * 0.04, w * 0.08, h * 0.14, -0.3, 0, Math.PI * 2)
    ctx.fill()
  },

  toilet(f) {
    const { ctx, w, h } = f
    const c = 0xeef1f4
    ctx.fillStyle = linear(ctx, -w / 2, 0, w / 2, 0, c, 0x9aa3ad)
    roundRectPath(ctx, -w * 0.44, -h * 0.46, w * 0.88, h * 0.28, w * 0.08)
    ctx.fill()
    ctx.fillStyle = css(0xb8c0c9)
    ctx.fillRect(-w * 0.4, -h * 0.22, w * 0.8, h * 0.05)
    ctx.fillStyle = linear(ctx, -w * 0.4, 0, w * 0.4, 0, c, 0x8d959f)
    ctx.beginPath()
    ctx.moveTo(-w * 0.44, -h * 0.16)
    ctx.lineTo(w * 0.44, -h * 0.16)
    ctx.bezierCurveTo(w * 0.5, h * 0.16, w * 0.3, h * 0.3, w * 0.16, h * 0.3)
    ctx.lineTo(-w * 0.16, h * 0.3)
    ctx.bezierCurveTo(-w * 0.3, h * 0.3, -w * 0.5, h * 0.16, -w * 0.44, -h * 0.16)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = css(0x5f6a76, 0.9)
    ctx.beginPath()
    ctx.ellipse(0, -h * 0.12, w * 0.3, h * 0.09, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = css(0x7fd4f0, 0.55)
    ctx.beginPath()
    ctx.ellipse(0, -h * 0.1, w * 0.24, h * 0.06, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = linear(ctx, -w * 0.18, 0, w * 0.18, 0, c, 0x8d959f)
    ctx.fillRect(-w * 0.18, h * 0.28, w * 0.36, h * 0.16)
    ctx.fillStyle = linear(ctx, -w * 0.3, 0, w * 0.3, 0, c, 0x8d959f)
    roundRectPath(ctx, -w * 0.3, h * 0.42, w * 0.6, h * 0.08, w * 0.03)
    ctx.fill()
  },

  skull(f) {
    const { ctx, w, h } = f
    const r = Math.min(w, h) * 0.3
    ctx.strokeStyle = css(BONE, 0.95)
    ctx.lineWidth = Math.max(1.5, r * 0.2)
    ctx.lineCap = "round"
    for (const dir of [1, -1]) {
      ctx.beginPath()
      ctx.moveTo(-w * 0.36, h * 0.4 * dir)
      ctx.lineTo(w * 0.36, -h * 0.4 * dir)
      ctx.stroke()
    }
    ctx.beginPath()
    ctx.moveTo(-r, r * 0.1)
    ctx.bezierCurveTo(-r * 1.1, -r * 1.15, r * 1.1, -r * 1.15, r, r * 0.1)
    ctx.bezierCurveTo(r * 0.9, r * 0.6, -r * 0.9, r * 0.6, -r, r * 0.1)
    ctx.closePath()
    ctx.fillStyle = radial(
      ctx,
      -r * 0.3,
      -r * 0.4,
      r * 0.1,
      r * 1.3,
      0xfffdf4,
      mix(BONE, 0x000000, 0.35),
    )
    ctx.fill()
    ctx.fillStyle = css(0x16181e, 0.92)
    for (const dx of [-0.42, 0.42]) {
      ctx.beginPath()
      ctx.ellipse(r * dx, -r * 0.16, r * 0.26, r * 0.3, dx < 0 ? 0.3 : -0.3, 0, Math.PI * 2)
      ctx.fill()
    }
    polyPath(ctx, [
      [0, r * 0.16],
      [r * 0.2, r * 0.44],
      [-r * 0.2, r * 0.44],
    ])
    ctx.fill()
    ctx.fillStyle = css(0x16181e, 0.7)
    for (const k of [-1, 0, 1]) ctx.fillRect(k * r * 0.34 - r * 0.05, r * 0.24, r * 0.1, r * 0.3)
  },

  clock(f) {
    const { ctx, w, h } = f
    const r = Math.min(w, h) * 0.36
    const ring = f.n > 1 && f.i % 2 !== 0 ? 0.86 : 1
    ctx.fillStyle = css(GLASS_RED, 0.95)
    for (const dx of [-0.78, 0.78]) {
      circlePath(ctx, r * dx, -r * 1.02, r * 0.42)
      ctx.fill()
    }
    ctx.fillStyle = css(shade(GLASS_RED, 0.7))
    ctx.fillRect(-r * 0.4, r * 0.96, r * 0.24, r * 0.3)
    ctx.fillRect(r * 0.16, r * 0.96, r * 0.24, r * 0.3)
    ctx.fillStyle = radial(
      ctx,
      -r * 0.3,
      -r * 0.3,
      r * 0.1,
      r * 1.2,
      0xff8a80,
      shade(GLASS_RED, 0.55),
    )
    circlePath(ctx, 0, 0, r)
    ctx.fill()
    ctx.fillStyle = radial(ctx, 0, 0, r * 0.1, r * 0.9, 0xfffdf6, 0xf0e4cc)
    circlePath(ctx, 0, 0, r * 0.86)
    ctx.fill()
    ctx.strokeStyle = css(0x3a3a44, 0.5)
    ctx.lineWidth = Math.max(0.6, r * 0.05)
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2
      ctx.beginPath()
      ctx.moveTo(Math.cos(a) * r * 0.78, Math.sin(a) * r * 0.78)
      ctx.lineTo(Math.cos(a) * r * 0.7, Math.sin(a) * r * 0.7)
      ctx.stroke()
    }
    const minute = -Math.PI / 2 + (f.i / Math.max(1, f.n)) * Math.PI * 2
    ctx.strokeStyle = css(0x1d1f26, 0.9)
    ctx.lineWidth = Math.max(0.8, r * 0.09)
    ctx.lineCap = "round"
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(Math.cos(minute) * r * 0.6 * ring, Math.sin(minute) * r * 0.6 * ring)
    ctx.moveTo(0, 0)
    ctx.lineTo(r * 0.4, r * 0.16)
    ctx.stroke()
    ctx.fillStyle = css(0x1d1f26)
    circlePath(ctx, 0, 0, r * 0.08)
    ctx.fill()
    if (f.n > 1) {
      for (let k = 0; k < 3; k++) {
        const a = -Math.PI / 2 + (k / 3) * Math.PI * 2
        arc(
          ctx,
          Math.cos(a) * r * 1.28,
          Math.sin(a) * r * 1.28,
          r * 0.16,
          0,
          Math.PI * 2,
          0xfff0b0,
          Math.max(0.8, r * 0.08),
        )
      }
    }
  },

  chip(f) {
    const { ctx, w, h } = f
    const s = Math.min(w, h) * 0.94
    ctx.fillStyle = linear(ctx, -s / 2, -s / 2, s / 2, s / 2, 0xf4fff4, 0xa8dcb0)
    roundRectPath(ctx, -s / 2, -s / 2, s, s, s * 0.16)
    ctx.fill()
    ctx.strokeStyle = css(0x7aa884, 0.7)
    ctx.lineWidth = Math.max(0.6, s * 0.08)
    roundRectPath(ctx, -s / 2, -s / 2, s, s, s * 0.16)
    ctx.stroke()
  },
  pacman(f) {
    const { ctx, w, h } = f
    const r = Math.min(w, h) * 0.48
    // Wide open, half, shut, half: the DOS chomp cycle.
    const mouth = 0.02 + 0.72 * Math.abs(Math.cos((f.n > 1 ? f.i / f.n : 0) * Math.PI))
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.arc(0, 0, r, mouth, Math.PI * 2 - mouth)
    ctx.closePath()
    ctx.fillStyle = radial(ctx, -r * 0.3, -r * 0.4, r * 0.1, r * 1.1, 0xfff27a, 0xd8b000)
    ctx.fill()
    stroke(ctx, 0x8a6d00, r * 0.05, 0.6)
    ctx.fillStyle = css(INK)
    circlePath(ctx, -r * 0.1, -r * 0.5, r * 0.13)
    ctx.fill()
  },

  keg(f) {
    const { ctx, w, h } = f
    const rx = w * 0.46
    const ry = h * 0.4
    const cy = -h * 0.07
    const face = () => ellipsePath(ctx, 0, cy, rx, ry)
    ctx.fillStyle = linear(ctx, 0, h * 0.2, 0, h * 0.5, STEEL, STEEL_DARK)
    ctx.fillRect(-w * 0.03, cy + ry * 0.6, w * 0.06, h * 0.36)
    ctx.fillStyle = linear(ctx, -w * 0.06, 0, w * 0.06, 0, 0xffe27a, 0xb8900a)
    roundRectPath(ctx, -w * 0.06, h * 0.36, w * 0.12, h * 0.13, h * 0.03)
    ctx.fill()
    face()
    ctx.fillStyle = radial(
      ctx,
      -rx * 0.2,
      cy - ry * 0.3,
      rx * 0.1,
      rx * 1.1,
      mix(WOOD, 0xffffff, 0.2),
      WOOD_DARK,
    )
    ctx.fill()
    ctx.save()
    face()
    ctx.clip()
    ctx.strokeStyle = css(shade(WOOD_DARK, 0.7), 0.8)
    ctx.lineWidth = Math.max(0.8, w * 0.012)
    for (let k = -3; k <= 3; k++) {
      ctx.beginPath()
      ctx.moveTo(k * rx * 0.28, cy - ry)
      ctx.lineTo(k * rx * 0.28, cy + ry)
      ctx.stroke()
    }
    ctx.restore()
    face()
    stroke(ctx, 0x3a2410, h * 0.04)
    eichhofMark(ctx, 0, cy - ry * 0.35, Math.min(rx, ry) * 0.5, shade(WOOD_DARK, 0.6))
  },

  lorry(f) {
    const { ctx, w, h } = f
    const hw = w / 2
    const hh = h / 2
    const accent = f.accent ?? 0x3fb0d0
    const wr = h * 0.17
    const wy = hh - wr
    const floor = wy - wr * 0.5
    const bedW = w * 0.6
    const bedTop = -hh * 0.05
    ctx.fillStyle = css(0x1a2440)
    ctx.fillRect(-hw * 0.96, floor - h * 0.02, w * 0.94, h * 0.07)
    for (let row = 0; row < 2; row++) {
      for (let k = 0; k < 5; k++) {
        const x = -hw * 0.94 + (k * bedW) / 5
        const y = bedTop - (row + 1) * h * 0.14
        ctx.fillStyle = linear(ctx, 0, y, 0, y + h * 0.13, mix(WOOD, 0xffffff, 0.2), WOOD_DARK)
        roundRectPath(ctx, x + 1, y, bedW / 5 - 2, h * 0.13, h * 0.02)
        ctx.fill()
      }
    }
    ctx.fillStyle = linear(ctx, 0, bedTop, 0, floor, 0xf4fbff, accent)
    roundRectPath(ctx, -hw * 0.96, bedTop, bedW, floor - bedTop, h * 0.03)
    ctx.fill()
    ctx.fillStyle = css(shade(accent, 0.6))
    ctx.fillRect(-hw * 0.96, bedTop + (floor - bedTop) * 0.6, bedW, h * 0.05)
    const cabX = -hw * 0.96 + bedW + w * 0.02
    const cabW = w * 0.94 - bedW - w * 0.02
    ctx.fillStyle = linear(ctx, 0, -hh * 0.4, 0, floor, 0xffffff, mix(accent, 0xffffff, 0.35))
    roundRectPath(ctx, cabX, -hh * 0.42, cabW * 0.6, floor + hh * 0.42, h * 0.06)
    ctx.fill()
    roundRectPath(ctx, cabX + cabW * 0.45, -hh * 0.02, cabW * 0.55, floor + hh * 0.02, h * 0.05)
    ctx.fill()
    ctx.fillStyle = css(0x1b2a44, 0.9)
    roundRectPath(ctx, cabX + cabW * 0.1, -hh * 0.32, cabW * 0.4, h * 0.16, h * 0.02)
    ctx.fill()
    eichhofMark(ctx, cabX + cabW * 0.3, hh * 0.18, h * 0.14, EICHHOF_RED)
    ctx.fillStyle = css(0xffe066)
    ctx.fillRect(cabX + cabW - w * 0.014, hh * 0.08, w * 0.014, h * 0.08)
    wheel(ctx, -hw * 0.6, wy, wr, spin(f))
    wheel(ctx, cabX + cabW * 0.62, wy, wr, spin(f))
  },

  case(f) {
    const { ctx, w, h } = f
    const c = f.accent ?? 0x1a44c8
    const bottle = f.glass ?? GLASS_BROWN
    const cw = w * 0.96
    const ch = h * 0.94
    const x = -cw / 2
    const y = -ch / 2
    ctx.fillStyle = linear(ctx, 0, y, 0, y + ch, mix(c, 0xffffff, 0.25), shade(c, 0.7))
    roundRectPath(ctx, x, y, cw, ch, ch * 0.05)
    ctx.fill()
    const oy = y + ch * 0.12
    const oh = ch * 0.2
    ctx.fillStyle = css(shade(c, 0.35))
    roundRectPath(ctx, x + cw * 0.14, oy, cw * 0.72, oh, oh * 0.35)
    ctx.fill()
    for (let k = 0; k < 4; k++) {
      const bx = x + cw * (0.26 + k * 0.16)
      ctx.fillStyle = linear(
        ctx,
        bx - cw * 0.035,
        0,
        bx + cw * 0.035,
        0,
        mix(bottle, 0xffffff, 0.3),
        shade(bottle, 0.6),
      )
      roundRectPath(ctx, bx - cw * 0.035, oy + oh * 0.2, cw * 0.07, oh * 0.8, cw * 0.01)
      ctx.fill()
      ctx.fillStyle = css(0xd8dde4)
      ctx.fillRect(bx - cw * 0.04, oy + oh * 0.1, cw * 0.08, oh * 0.22)
    }
    ctx.fillStyle = css(shade(c, 0.8))
    ctx.fillRect(x + cw * 0.04, y + ch * 0.06, cw * 0.05, ch * 0.88)
    ctx.fillRect(x + cw * 0.91, y + ch * 0.06, cw * 0.05, ch * 0.88)
    const ink = readableOn(c)
    if (f.word) wordmark(ctx, f.word, 0, y + ch * 0.64, ch * 0.2, ink, 0.95, 900, cw * 0.7)
    else eichhofMark(ctx, 0, y + ch * 0.6, ch * 0.26, ink)
  },

  boxcar(f) {
    const { ctx, w, h } = f
    const hw = w / 2
    const hh = h / 2
    ctx.fillStyle = linear(ctx, 0, -hh, 0, -hh * 0.62, 0xf4f5f7, 0x8a919c)
    roundRectPath(ctx, -hw, -hh * 0.92, w, h * 0.16, h * 0.04)
    ctx.fill()
    ctx.fillStyle = linear(ctx, 0, -hh * 0.62, 0, hh * 0.5, 0xffffff, 0xc4cad4)
    ctx.fillRect(-hw * 0.96, -hh * 0.62, w * 0.96, h * 0.56)
    ctx.strokeStyle = css(0x8a919c, 0.8)
    ctx.lineWidth = Math.max(0.8, h * 0.02)
    for (const x of [-0.3, 0.1, 0.5]) {
      ctx.beginPath()
      ctx.moveTo(hw * x, -hh * 0.6)
      ctx.lineTo(hw * x, hh * 0.48)
      ctx.stroke()
    }
    ctx.fillStyle = linear(ctx, 0, -hh * 0.5, 0, hh * 0.4, 0x3a3f4a, 0x14161d)
    ctx.fillRect(-hw * 0.26, -hh * 0.5, w * 0.14, h * 0.44)
    eichhofMark(ctx, -hw * 0.62, -hh * 0.1, h * 0.28, EICHHOF_RED)
    ctx.fillStyle = css(0x2a2e36)
    ctx.fillRect(-hw * 0.84, hh * 0.5, w * 0.84, h * 0.06)
    const wr = h * 0.13
    for (const x of [-hw * 0.64, hw * 0.64]) wheel(ctx, x, hh - wr, wr, spin(f))
  },

  // Crate debris: a long plank with a kink ...
  twig(f) {
    const { ctx, w, h } = f
    const line = () => {
      ctx.beginPath()
      ctx.moveTo(-w * 0.46, h * 0.18)
      ctx.lineTo(-w * 0.1, h * 0.18)
      ctx.lineTo(w * 0.08, -h * 0.18)
      ctx.lineTo(w * 0.46, -h * 0.18)
    }
    line()
    ctx.lineCap = "round"
    stroke(ctx, WOOD_DARK, h * 0.56)
    line()
    stroke(ctx, WOOD, h * 0.4)
    line()
    stroke(ctx, mix(WOOD, 0xffffff, 0.35), h * 0.08, 0.8)
  },

  // ... and a stepped chunk.
  chunk(f) {
    const { ctx, w, h } = f
    polyPath(ctx, [
      [-w * 0.46, -h * 0.42],
      [w * 0.02, -h * 0.42],
      [w * 0.02, -h * 0.04],
      [w * 0.46, -h * 0.04],
      [w * 0.46, h * 0.42],
      [-w * 0.1, h * 0.42],
      [-w * 0.1, h * 0.08],
      [-w * 0.46, h * 0.08],
    ])
    ctx.fillStyle = linear(ctx, -w / 2, -h / 2, w / 2, h / 2, mix(WOOD, 0xffffff, 0.25), WOOD_DARK)
    ctx.fill()
    stroke(ctx, shade(WOOD_DARK, 0.6), Math.max(0.8, h * 0.06), 0.9, "miter")
  },

  flash(f) {
    const { ctx, w, h } = f
    const r = Math.min(w, h) * 0.48
    const turn = (f.i % 2) * (Math.PI / 8)
    const pts: [number, number][] = []
    for (let k = 0; k < 16; k++) {
      const a = turn + (k / 16) * Math.PI * 2
      const d = k % 2 === 0 ? r : r * 0.72
      pts.push([Math.cos(a) * d, Math.sin(a) * d])
    }
    polyPath(ctx, pts)
    ctx.fillStyle = radial(ctx, 0, 0, 0, r, 0xffffff, 0xff7a1a, 1, 0.9)
    ctx.fill()
    ctx.fillStyle = radial(ctx, 0, 0, 0, r * 0.45, 0xffffff, 0xffe066, 1, 0.9)
    circlePath(ctx, 0, 0, r * (f.i % 2 === 0 ? 0.6 : 0.46))
    ctx.fill()
  },

  spark(f) {
    const { ctx, w, h } = f
    const r = Math.min(w, h) * 0.44
    glow(ctx, 0, 0, r * 0.7, 0xd8c020, r * 0.8)
    ctx.fillStyle = radial(ctx, r * 0.25, -r * 0.1, r * 0.05, r, 0xfffbd0, 0x8a7a00)
    circlePath(ctx, 0, 0, r)
    ctx.fill()
  },

  weizen(f) {
    const { ctx, w, h } = f
    const hw = w * 0.46
    const glassPath = () => {
      ctx.beginPath()
      ctx.moveTo(-hw * 0.6, h * 0.42)
      ctx.bezierCurveTo(-hw * 0.4, h * 0.1, -hw * 1.02, -h * 0.1, -hw * 0.95, -h * 0.42)
      ctx.lineTo(hw * 0.95, -h * 0.42)
      ctx.bezierCurveTo(hw * 1.02, -h * 0.1, hw * 0.4, h * 0.1, hw * 0.6, h * 0.42)
      ctx.closePath()
    }
    glassPath()
    ctx.fillStyle = linear(ctx, -hw, 0, hw, 0, 0xb08008, 0xfff06a)
    ctx.fill()
    glassPath()
    ctx.fillStyle = linear(ctx, -hw, 0, hw, 0, 0xe8c020, 0xf2d438, 0.2, 0.85)
    ctx.fill()
    ctx.fillStyle = css(0xffffff, 0.4)
    ctx.fillRect(-hw * 0.55, -h * 0.34, hw * 0.16, h * 0.6)
    ctx.fillStyle = linear(ctx, 0, -h * 0.5, 0, -h * 0.36, FOAM, 0xe6d9a8)
    roundRectPath(ctx, -hw, -h * 0.5, hw * 2, h * 0.13, h * 0.05)
    ctx.fill()
    ctx.fillStyle = linear(ctx, -hw, 0, hw, 0, STEEL, STEEL_DARK)
    ellipsePath(ctx, 0, h * 0.45, hw * 0.7, h * 0.04)
    ctx.fill()
    if (f.accent === undefined) return
    ctx.fillStyle = css(CREAM, 0.95)
    circlePath(ctx, 0, -h * 0.2, hw * 0.4)
    ctx.fill()
    ctx.fillStyle = css(f.accent)
    circlePath(ctx, 0, -h * 0.2, hw * 0.28)
    ctx.fill()
  },

  // Stoneware stein with a pewter lid, handle on the left like the DOS art.
  stein(f) {
    const { ctx, w, h } = f
    const c = f.glass ?? GLASS_BLUE
    const bx = -w * 0.16
    const bw = w * 0.62
    const top = -h * 0.26
    const bot = h * 0.48
    ctx.beginPath()
    ctx.moveTo(bx, top + h * 0.1)
    ctx.bezierCurveTo(
      bx - w * 0.36,
      top + h * 0.1,
      bx - w * 0.36,
      bot - h * 0.18,
      bx,
      bot - h * 0.18,
    )
    ctx.lineCap = "round"
    stroke(ctx, shade(c, 0.8), w * 0.1)
    ctx.fillStyle = linear(ctx, bx, 0, bx + bw, 0, shade(c, 0.5), mix(c, 0xffffff, 0.35))
    roundRectPath(ctx, bx, top, bw, bot - top, w * 0.04)
    ctx.fill()
    ctx.fillStyle = css(shade(c, 0.45), 0.8)
    for (const y of [top + h * 0.08, bot - h * 0.1]) ctx.fillRect(bx, y, bw, h * 0.04)
    for (let k = 0; k < 4; k++) {
      polyPath(ctx, [
        [bx + bw * (0.2 + k * 0.2), top + h * 0.26],
        [bx + bw * (0.28 + k * 0.2), top + h * 0.36],
        [bx + bw * (0.2 + k * 0.2), top + h * 0.46],
        [bx + bw * (0.12 + k * 0.2), top + h * 0.36],
      ])
      ctx.fill()
    }
    ctx.fillStyle = css(0xffffff, 0.3)
    ctx.fillRect(bx + bw * 0.62, top + h * 0.04, bw * 0.1, bot - top - h * 0.1)
    ctx.save()
    ctx.translate(bx - w * 0.02, top)
    if (f.variant === "open") ctx.rotate(-0.9)
    ctx.fillStyle = linear(ctx, 0, -h * 0.08, 0, 0, 0xeef1f4, STEEL_DARK)
    roundRectPath(ctx, 0, -h * 0.08, bw + w * 0.04, h * 0.09, h * 0.035)
    ctx.fill()
    ctx.fillStyle = css(STEEL)
    circlePath(ctx, bw * 0.55, -h * 0.1, w * 0.04)
    ctx.fill()
    ctx.restore()
    ctx.beginPath()
    ctx.moveTo(bx - w * 0.02, top)
    ctx.lineTo(bx - w * 0.12, top - h * 0.12)
    ctx.lineCap = "round"
    stroke(ctx, STEEL, w * 0.05)
  },

  tumbler(f) {
    const { ctx, w, h } = f
    const liquid = f.glass ?? 0x3a2210
    const straw = f.variant === "straw"
    const gw = w * (straw ? 0.62 : 0.84)
    const top = straw ? -h * 0.1 : -h * 0.47
    const bot = h * 0.48
    const cup = (y: number) => {
      ctx.beginPath()
      ctx.moveTo(-gw / 2, y)
      ctx.lineTo(gw / 2, y)
      ctx.lineTo(gw * 0.42, bot)
      ctx.lineTo(-gw * 0.42, bot)
      ctx.closePath()
    }
    if (straw) {
      ctx.beginPath()
      ctx.moveTo(gw * 0.08, top + (bot - top) * 0.5)
      ctx.lineTo(gw * 0.08, -h * 0.36)
      ctx.lineTo(gw * 0.34, -h * 0.48)
      ctx.lineCap = "round"
      stroke(ctx, 0xe0302a, w * 0.08)
    }
    cup(top)
    ctx.fillStyle = css(0xe6ecf2, 0.35)
    ctx.fill()
    cup(top + (bot - top) * 0.12)
    ctx.fillStyle = linear(
      ctx,
      -gw / 2,
      0,
      gw / 2,
      0,
      shade(liquid, 0.6),
      mix(liquid, 0xffffff, 0.25),
    )
    ctx.fill()
    ctx.fillStyle = css(0xffffff, 0.35)
    ctx.fillRect(-gw * 0.3, top + (bot - top) * 0.16, gw * 0.12, (bot - top) * 0.7)
    ellipsePath(ctx, 0, top, gw / 2, h * 0.03)
    stroke(ctx, 0xf2f6fa, Math.max(0.8, h * 0.02), 0.8)
    ctx.fillStyle = css(0xf2f6fa, 0.8)
    ctx.fillRect(-gw * 0.42, bot - h * 0.04, gw * 0.84, h * 0.04)
  },

  // A printed label or box front: `word` lines split on "|".
  label(f) {
    const { ctx, w, h } = f
    const base = f.glass ?? CREAM
    const ink = f.accent ?? INK
    ctx.fillStyle = linear(ctx, 0, -h / 2, 0, h / 2, mix(base, 0xffffff, 0.2), shade(base, 0.85))
    roundRectPath(ctx, -w * 0.48, -h * 0.47, w * 0.96, h * 0.94, Math.min(w, h) * 0.08)
    ctx.fill()
    roundRectPath(ctx, -w * 0.43, -h * 0.4, w * 0.86, h * 0.8, Math.min(w, h) * 0.05)
    stroke(ctx, ink, Math.max(0.8, h * 0.02), 0.6)
    ctx.fillStyle = css(ink, 0.9)
    ctx.fillRect(-w * 0.43, h * 0.26, w * 0.86, h * 0.05)
    const lines = (f.word ?? "").split("|")
    const lh = (h * 0.6) / lines.length
    for (const [k, line] of lines.entries()) {
      wordmark(ctx, line, 0, -h * 0.34 + lh * (k + 0.5), lh * 0.78, ink, 1, 900, w * 0.8)
    }
  },

  palm(f) {
    const { ctx, w, h } = f
    ctx.fillStyle = linear(ctx, 0, h * 0.3, 0, h * 0.48, 0xfff07a, 0xc8a020)
    ellipsePath(ctx, 0, h * 0.38, w * 0.47, h * 0.1)
    ctx.fill()
    const crown: [number, number] = [w * 0.02, -h * 0.22]
    ctx.beginPath()
    ctx.moveTo(-w * 0.02, h * 0.34)
    ctx.quadraticCurveTo(-w * 0.1, 0, crown[0], crown[1])
    ctx.lineCap = "round"
    stroke(ctx, 0x7a4a22, w * 0.06)
    const len = w * 0.42
    for (const a of [-2.8, -2.2, -1.5, -0.8, -0.2]) {
      ctx.save()
      ctx.translate(crown[0], crown[1])
      ctx.rotate(a)
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.quadraticCurveTo(len * 0.5, -len * 0.28, len, len * 0.18)
      ctx.quadraticCurveTo(len * 0.5, 0, 0, 0)
      ctx.fillStyle = linear(ctx, 0, 0, len, 0, 0x6fd24a, 0x1f7a2a)
      ctx.fill()
      ctx.restore()
    }
    ctx.fillStyle = css(0x5a3418)
    for (const dx of [-0.05, 0.05]) {
      circlePath(ctx, crown[0] + w * dx, crown[1] + h * 0.04, w * 0.04)
      ctx.fill()
    }
  },

  cup(f) {
    const { ctx, w, h } = f
    const c = f.glass ?? GLASS_RED
    const saucer = f.variant === "saucer"
    const cw = w * (saucer ? 0.56 : 0.66)
    const x = saucer ? -w * 0.36 : -w * 0.44
    const top = -h * 0.44
    const bot = saucer ? h * 0.3 : h * 0.46
    roundRectPath(
      ctx,
      x + cw - w * 0.04,
      top + (bot - top) * 0.16,
      w * 0.24,
      (bot - top) * 0.5,
      h * 0.06,
    )
    stroke(ctx, shade(c, 0.7), h * 0.08)
    ctx.beginPath()
    ctx.moveTo(x, top)
    ctx.lineTo(x + cw, top)
    ctx.lineTo(x + cw * 0.92, bot)
    ctx.quadraticCurveTo(x + cw / 2, bot + h * 0.03, x + cw * 0.08, bot)
    ctx.closePath()
    ctx.fillStyle = linear(ctx, x, 0, x + cw, 0, mix(c, 0xffffff, 0.35), shade(c, 0.55))
    ctx.fill()
    ctx.fillStyle = css(shade(c, 0.45))
    ellipsePath(ctx, x + cw / 2, top, cw / 2, h * 0.05)
    ctx.fill()
    ctx.fillStyle = css(0x3a2210)
    ellipsePath(ctx, x + cw / 2, top + h * 0.01, cw * 0.44, h * 0.035)
    ctx.fill()
    ctx.fillStyle = css(0xffffff, 0.35)
    ctx.fillRect(x + cw * 0.14, top + h * 0.08, cw * 0.1, (bot - top) * 0.7)
    if (!saucer) return
    ctx.fillStyle = linear(ctx, -w / 2, 0, w / 2, 0, mix(c, 0xffffff, 0.2), shade(c, 0.5))
    ellipsePath(ctx, 0, h * 0.37, w * 0.48, h * 0.09)
    ctx.fill()
  },

  // Coffee grinder: the crank turns once over the 12-frame strip.
  grinder(f) {
    const { ctx, w, h } = f
    const phase = spin(f)
    ctx.fillStyle = linear(ctx, 0, -h * 0.05, 0, h * 0.46, mix(WOOD, 0xffffff, 0.2), WOOD_DARK)
    roundRectPath(ctx, -w * 0.46, -h * 0.04, w * 0.92, h * 0.5, h * 0.04)
    ctx.fill()
    ctx.strokeStyle = css(shade(WOOD_DARK, 0.8), 0.5)
    ctx.lineWidth = Math.max(0.8, h * 0.02)
    for (const y of [0.12, 0.26, 0.38]) {
      ctx.beginPath()
      ctx.moveTo(-w * 0.44, h * y)
      ctx.lineTo(w * 0.44, h * y)
      ctx.stroke()
    }
    ctx.fillStyle = linear(ctx, 0, -h * 0.12, 0, -h * 0.03, 0xf2f4f7, STEEL_DARK)
    ctx.fillRect(-w * 0.46, -h * 0.12, w * 0.92, h * 0.09)
    const px = 0
    const py = -h * 0.2
    const ex = px + Math.cos(phase) * w * 0.36
    const ey = py + Math.sin(phase) * h * 0.1
    ctx.fillStyle = css(STEEL)
    ctx.fillRect(px - w * 0.02, py, w * 0.04, h * 0.1)
    ctx.beginPath()
    ctx.moveTo(px, py)
    ctx.lineTo(ex, ey)
    ctx.lineCap = "round"
    stroke(ctx, 0xdfe4ea, h * 0.06)
    ctx.fillStyle = linear(ctx, ex, ey - h * 0.2, ex, ey, mix(WOOD, 0xffffff, 0.3), WOOD_DARK)
    roundRectPath(ctx, ex - w * 0.04, ey - h * 0.2, w * 0.08, h * 0.2, w * 0.03)
    ctx.fill()
  },

  // A beer coaster: `glass` is the disc, `accent` the ring and lettering and
  // `variant` the brewery mark ("castle", "rauten" or "lion").
  emblem(f) {
    const { ctx, w, h } = f
    const base = f.glass ?? 0xf8f9f6
    const accent = f.accent ?? 0x2b6fd0
    const s = Math.min(w, h)
    ctx.fillStyle = radial(
      ctx,
      -w * 0.15,
      -h * 0.2,
      0,
      w * 0.6,
      mix(base, 0xffffff, 0.3),
      shade(base, 0.85),
    )
    ellipsePath(ctx, 0, 0, w * 0.49, h * 0.49)
    ctx.fill()
    ellipsePath(ctx, 0, 0, w * 0.42, h * 0.42)
    stroke(ctx, accent, s * 0.05)
    const word = f.word ?? ""
    const markY = word ? -h * 0.1 : 0
    const markS = s * (word ? 0.38 : 0.52)
    if (f.variant === "castle") eichhofMark(ctx, 0, markY, markS, EICHHOF_RED)
    if (f.variant === "lion") lionMark(ctx, 0, markY, markS, accent)
    if (f.variant === "rauten") rautenBand(ctx, 0, markY, w * 0.62, markS * 0.62, accent)
    if (!word) return
    const lines = word.split("|")
    const lh = (f.variant ? h * 0.2 : h * 0.44) / lines.length
    const y0 = f.variant ? h * 0.22 : 0
    for (const [k, line] of lines.entries()) {
      const y = y0 + lh * (k - (lines.length - 1) / 2)
      wordmark(ctx, line, 0, y, lh * 0.9, accent, 1, 900, w * (f.variant ? 0.56 : 0.66))
    }
  },

  windows(f) {
    const { ctx, w, h } = f
    ctx.fillStyle = linear(ctx, 0, -h / 2, 0, h / 2, 0xffffff, 0xd8dde4)
    roundRectPath(ctx, -w * 0.48, -h * 0.47, w * 0.96, h * 0.94, h * 0.04)
    ctx.fill()
    const colors = [0x2a2e36, 0xe03a2f, 0x2b6fd0, 0x2a2e36]
    for (let row = 0; row < 6; row++) {
      ctx.fillStyle = css(colors[Math.floor(row / 1.5)] ?? INK, 0.85)
      for (let col = 0; col < 4; col++) {
        ctx.fillRect(-w * 0.42 + col * w * 0.1, -h * 0.38 + row * h * 0.13, w * 0.05, h * 0.07)
      }
    }
    ctx.fillStyle = css(INK)
    roundRectPath(ctx, -w * 0.02, -h * 0.44, w * 0.48, h * 0.88, h * 0.04)
    ctx.fill()
    const flag = [0xe03a2f, 0x4caf50, 0x2b6fd0, 0xe8c33a]
    const sq = w * 0.17
    for (const [k, color] of flag.entries()) {
      const col = k % 2
      const row = Math.floor(k / 2)
      const x = w * 0.04 + col * (sq + w * 0.03)
      const y = -h * 0.3 + row * (sq * 1.2 + h * 0.04) + col * h * 0.04
      ctx.fillStyle = linear(ctx, x, y, x + sq, y + sq, mix(color, 0xffffff, 0.3), color)
      ctx.fillRect(x, y, sq, sq * 1.2)
    }
  },
} satisfies Record<string, Draw>

export type FoeArtId = keyof typeof ART

// Natural width/length of each subject. A spin strip's frame is the rotation
// envelope, so a bottle must be drawn tall inside it instead of stretched to the
// frame box, otherwise the rotation reads as a squashed smear.
const FOE_ASPECT: Record<FoeArtId, number> = {
  barrel: 0.92,
  bottle: 0.4,
  boxcar: 2.4,
  brain: 1.5,
  can: 0.42,
  case: 1.8,
  castle: 0.92,
  chip: 1,
  chunk: 1.25,
  clock: 1,
  cocktail: 0.72,
  coin: 1,
  core: 0.6,
  crate: 1,
  crest: 1.05,
  cup: 1.1,
  dollar: 0.5,
  emblem: 1.3,
  flash: 1,
  glass: 0.5,
  grinder: 1.6,
  keg: 1.1,
  label: 1.4,
  loco: 2.4,
  lorry: 2.6,
  mug: 0.66,
  pacman: 1,
  palm: 1,
  pills: 2.4,
  pot: 1.1,
  rainbow: 1,
  santa: 0.8,
  skull: 1.1,
  smoke: 1,
  spark: 1,
  stein: 0.9,
  text: 2.6,
  toaster: 1.2,
  toilet: 0.95,
  tumbler: 0.6,
  twig: 2.4,
  weizen: 0.4,
  windows: 1.2,
}

export function foeAspect(art: FoeArtId): number {
  return FOE_ASPECT[art]
}

export const FOE_ART: Record<string, FoeArtDef> = {
  "l0-s0": { art: "text", word: "ALPHA HELIX", accent: 0xc8ced8 },
  "l0-s2": { art: "bottle", glass: GLASS_GREEN, accent: EICHHOF_RED },

  "l1-s0": { art: "bottle", glass: GLASS_BROWN, accent: 0x3a8fd8 },
  "l1-s1": { art: "emblem", variant: "castle", accent: 0x5a6cf0 },
  "l1-s2": { art: "keg" },
  "l1-s3": { art: "crate" },
  "l1-s4": { art: "castle" },
  "l1-s5": { art: "lorry", motion: "none" },
  "l1-s6": { art: "case", accent: 0x1a44c8, glass: GLASS_BROWN },
  "l1-s7": { art: "case", accent: 0x1a44c8, glass: GLASS_GREEN, word: "BIER" },
  "l1-s9": { art: "glass", glass: GLASS_YELLOW },
  "l1-s11": { art: "bottle", glass: GLASS_GREEN, accent: EICHHOF_RED },
  "l1-s12": { art: "pacman", motion: "none" },
  "l1-s13": { art: "loco", motion: "none" },
  "l1-s14": { art: "smoke", motion: "none" },
  "l1-s15": { art: "boxcar", motion: "none" },
  "l1-s18": { art: "twig" },
  "l1-s19": { art: "chunk" },

  "l2-s1": { art: "flash", motion: "none" },
  "l2-s2": { art: "emblem", word: "FRANZIS|KANER", accent: 0x8a8f99 },
  "l2-s3": { art: "emblem", variant: "rauten", accent: 0x2b8fe0 },
  "l2-s4": { art: "emblem", variant: "lion", glass: 0xff9a4a, accent: 0xe8c020 },
  "l2-s5": { art: "emblem", word: "BIER", accent: 0x3a3fd0 },
  "l2-s6": { art: "barrel" },
  "l2-s7": { art: "bottle", glass: GLASS_BROWN, accent: 0x8a5a2a, flip: true },
  "l2-s8": { art: "weizen", accent: 0x8a5a2a },
  "l2-s9": { art: "weizen" },
  "l2-s10": { art: "weizen", accent: 0x3a3fd0 },
  "l2-s11": { art: "weizen", accent: 0x2b3fc0 },
  "l2-s12": { art: "emblem", variant: "rauten", accent: 0x2b8fe0 },
  "l2-s13": { art: "crest", accent: 0xd0202c },
  "l2-s14": { art: "mug", glass: STEEL },
  "l2-s15": { art: "mug", glass: GLASS_YELLOW },
  "l2-s16": { art: "mug", glass: GLASS_YELLOW },
  "l2-s17": { art: "stein", glass: GLASS_BLUE },
  "l2-s18": { art: "stein", glass: GLASS_BLUE, variant: "open" },
  "l2-s19": { art: "bottle", glass: GLASS_BROWN, accent: 0xe8a020, flip: true },
  "l2-s20": { art: "emblem", variant: "lion", word: "LÖWENBRÄU", accent: 0x2b8fe0 },
  "l2-s22": { art: "emblem", word: "PAULANER", glass: 0x1a2a7a, accent: 0xe8c020 },
  "l2-s23": { art: "case", accent: 0xc8ccd2, glass: GLASS_BROWN, word: "PAULANER" },
  "l2-s24": { art: "bottle", glass: GLASS_BROWN, accent: 0x2b3fc0, flip: true },
  "l2-s25": { art: "bottle", glass: GLASS_BROWN, accent: 0x2b3fc0 },
  "l2-s26": { art: "case", accent: 0x1a44c8, glass: GLASS_BROWN, word: "HEINEKEN", flip: true },
  "l2-s27": { art: "bottle", glass: GLASS_BROWN, accent: 0x2b3fc0 },
  "l2-s28": { art: "twig" },
  "l2-s29": { art: "chunk" },
  "l2-s30": { art: "spark" },

  "l3-s2": { art: "tumbler", glass: 0x4a2c14 },
  "l3-s3": { art: "tumbler", glass: 0x3a2210, variant: "straw" },
  "l3-s4": { art: "cocktail", glass: GLASS_RED },
  "l3-s5": { art: "cocktail", glass: GLASS_GREEN },
  "l3-s6": { art: "cocktail", glass: GLASS_MAGENTA },
  "l3-s9": {
    art: "label",
    word: "Jack Daniel's|Tennessee|WHISKEY",
    glass: 0x1e2026,
    accent: 0xf2f4f7,
  },
  "l3-s10": { art: "label", word: "MEDLEY'S|BOURBON", glass: 0xffffff, accent: 0x2b3fc0 },
  "l3-s11": { art: "palm" },
  "l3-s12": { art: "bottle", glass: GLASS_GREEN, accent: WOOD },
  "l3-s13": { art: "santa", motion: "none" },
  "l3-s14": { art: "pacman", motion: "none" },
  "l3-s15": { art: "text", word: "ALPHA HELIX", accent: 0xc8ced8 },
  "l3-s16": { art: "rainbow" },
  "l3-s17": { art: "text", word: "1600" },

  "l4-s1": { art: "label", word: "Alka-Seltzer", glass: 0x7ef0f4, accent: 0x0a1a6a },
  "l4-s2": { art: "cup", glass: 0xe8201c, variant: "saucer" },
  "l4-s3": { art: "cup", glass: 0xe030d0 },
  "l4-s4": { art: "grinder", motion: "none" },
  "l4-s5": { art: "tumbler", glass: GLASS_WATER },
  "l4-s6": { art: "tumbler", glass: GLASS_WATER },
  "l4-s7": { art: "chip" },
  "l4-s8": { art: "clock", motion: "none" },
  "l4-s9": { art: "clock", motion: "none" },
  "l4-s10": { art: "brain" },
  "l4-s11": { art: "toaster", motion: "none" },
  "l4-s13": { art: "toilet" },
  "l4-s14": { art: "pot", glass: GLASS_BLUE },
  "l4-s15": { art: "windows" },
  "l4-s16": { art: "rainbow" },
  "l4-s17": { art: "dollar" },
  "l4-s18": { art: "core" },
  "l4-s20": { art: "skull" },
  "l4-s21": { art: "label", word: "ASPIRIN", glass: 0xffffff, accent: 0x1d9a6c },
  "l4-s22": { art: "pills" },
  "l4-s23": { art: "coin" },
  "l4-s24": { art: "flash", motion: "none" },
  "l4-s26": { art: "bottle", glass: GLASS_GREEN, accent: EICHHOF_RED },
}

export const FOE_ART_KEYS: string[] = Object.keys(FOE_ART)

/** Draws one generator outside the foe table (e.g. a shop mount), centred on 0,0. */
export function drawArt(ctx: Ctx, art: FoeArtId, w: number, h: number): void {
  ART[art]({ ctx, w, h, i: 0, n: 1 })
}

export function drawFoeArt(ctx: Ctx, key: string, w: number, h: number, i: number, n: number) {
  const def = FOE_ART[key]
  const draw = def ? ART[def.art] : undefined
  if (!def || !draw) return
  draw({ ctx, w, h, i, n, ...def })
}
