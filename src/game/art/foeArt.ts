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

export type FoeArtId =
  | "apple"
  | "bar"
  | "barrel"
  | "bottle"
  | "brain"
  | "can"
  | "cap"
  | "castle"
  | "chip"
  | "citrus"
  | "clock"
  | "cocktail"
  | "crate"
  | "crest"
  | "domino"
  | "dollar"
  | "emblem"
  | "glass"
  | "mug"
  | "pills"
  | "pot"
  | "rock"
  | "santa"
  | "skull"
  | "swing"
  | "tankard"
  | "toilet"
  | "truck"
  | "windows"

export interface FoeArtDef {
  art: FoeArtId
  motion?: FoeMotion
  glass?: number
  accent?: number
  word?: string
}

interface ArtFrame extends Frame {
  glass?: number
  accent?: number
  word?: string
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
const GLASS_CLEAR = 0xd6dde6
const GLASS_WHITE = 0xf2f4f0
const GLASS_YELLOW = 0xd8bb2a
const GLASS_ORANGE = 0xd2661f
const GLASS_PINK = 0xd0407a
const GLASS_MAGENTA = 0xc23a9a
const GLASS_RED = 0xc0392b
const GLASS_CYAN = 0x2ab5c4
const GLASS_TEAL = 0x138f9c
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
  ctx.fillStyle = linear(ctx, x, y, x, y + h, CREAM, mix(CREAM, accent, 0.22))
  roundRectPath(ctx, x, y, w, h, Math.min(h * 0.2, w * 0.1))
  ctx.fill()
  ctx.fillStyle = css(accent, 0.9)
  ctx.fillRect(x, y + h * 0.72, w, h * 0.12)
  ctx.fillRect(x, y + h * 0.1, w, h * 0.08)
}

function shadeRow(ctx: Ctx, x: number, y: number, w: number, h: number) {
  ctx.fillStyle = linear(ctx, x, y, x, y + h, 0xffffff, 0x000000, 0.25, 0.1)
  ctx.fillRect(x, y, w, h)
}

const ART: Record<FoeArtId, Draw> = {
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
    labelPlate(ctx, -lw / 2, -h * 0.02, lw, h * 0.34, g)
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

  tankard(f) {
    const { ctx, w, h } = f
    const bw = w * 0.8
    const bh = h * 0.84
    ctx.beginPath()
    ctx.moveTo(-bw / 2, -bh / 2)
    ctx.lineTo(-bw * 0.44, bh / 2)
    ctx.lineTo(bw * 0.44, bh / 2)
    ctx.lineTo(bw / 2, -bh / 2)
    ctx.closePath()
    ctx.fillStyle = linear(ctx, -bw / 2, 0, bw / 2, 0, shade(WOOD, 1.1), WOOD_DARK)
    ctx.fill()
    ctx.fillStyle = css(0xffffff, 0.16)
    ctx.fillRect(-bw * 0.28, -bh * 0.42, bw * 0.12, bh * 0.8)
    ctx.fillStyle = css(STEEL, 0.85)
    ctx.fillRect(-bw / 2, -bh * 0.3, bw, bh * 0.09)
    ctx.fillRect(-bw / 2, bh * 0.24, bw, bh * 0.09)
    ctx.fillStyle = linear(ctx, 0, -bh * 0.9, 0, -bh * 0.5, FOAM, 0xdfd2a0)
    ellipsePath(ctx, 0, -bh * 0.5, bw * 0.5, bh * 0.12)
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

  rock(f) {
    const { ctx, w, h } = f
    const pts: [number, number][] = []
    const n = 9
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2
      const r = 0.5 + 0.16 * Math.sin(a * 3 + f.i * 0.9) + 0.08 * Math.cos(a * 5)
      pts.push([Math.cos(a) * w * r, Math.sin(a) * h * r])
    }
    polyPath(ctx, pts)
    ctx.fillStyle = linear(ctx, -w / 2, -h / 2, w / 2, h / 2, 0xd6dae2, 0x6b7280)
    ctx.fill()
    polyPath(ctx, pts)
    shadeRow(ctx, 0, -h * 0.5, w, h)
    ctx.fillStyle = css(0xffffff, 0.4)
    circlePath(ctx, -w * 0.14, -h * 0.18, Math.min(w, h) * 0.1)
    ctx.fill()
  },

  citrus(f) {
    const { ctx, w, h } = f
    const r = Math.min(w, h) * 0.46
    circlePath(ctx, 0, 0, r)
    ctx.fillStyle = radial(ctx, -r * 0.3, -r * 0.3, r * 0.1, r, 0xfff08a, GLASS_YELLOW)
    ctx.fill()
    ctx.strokeStyle = css(shade(GLASS_YELLOW, 0.7), 0.8)
    ctx.lineWidth = Math.max(0.8, r * 0.08)
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.lineTo(Math.cos(a) * r * 0.86, Math.sin(a) * r * 0.86)
      ctx.stroke()
    }
    circlePath(ctx, 0, 0, r * 0.1)
    ctx.fillStyle = css(0xfffbe0)
    ctx.fill()
    ctx.fillStyle = css(0x4caf50, 0.95)
    ctx.save()
    ctx.rotate(-0.6)
    ctx.fillRect(r * 0.6, -r * 0.14, r * 0.5, r * 0.28)
    ctx.restore()
  },

  bar(f) {
    const { ctx, w, h } = f
    const bw = w * 0.98
    const bh = Math.max(2, h * 0.46)
    ctx.fillStyle = linear(ctx, 0, -bh / 2, 0, bh / 2, mix(WOOD, 0xffffff, 0.2), WOOD_DARK)
    roundRectPath(ctx, -bw / 2, -bh / 2, bw, bh, bh * 0.35)
    ctx.fill()
    ctx.fillStyle = css(0xffffff, 0.18)
    ctx.fillRect(-bw * 0.44, -bh * 0.3, bw * 0.88, bh * 0.22)
    ctx.fillStyle = css(shade(WOOD_DARK, 0.7), 0.75)
    ctx.fillRect(-bw * 0.24, -bh * 0.12, bw * 0.07, bh * 0.24)
    ctx.fillRect(bw * 0.17, -bh * 0.12, bw * 0.07, bh * 0.24)
  },

  truck(f) {
    const { ctx, w, h } = f
    const accent = f.accent ?? 0x1f4fa0
    const bodyW = w * 0.94
    const bodyH = h * 0.56
    const wheelR = h * 0.17
    const top = -h * 0.3
    ctx.fillStyle = linear(ctx, 0, top, 0, top + bodyH, mix(accent, 0xffffff, 0.45), accent)
    roundRectPath(ctx, -bodyW / 2, top, bodyW, bodyH, h * 0.06)
    ctx.fill()
    ctx.fillStyle = linear(ctx, 0, top, 0, top + bodyH, 0xffffff, 0x000000, 0.22, 0.1)
    roundRectPath(ctx, -bodyW / 2, top, bodyW, bodyH, h * 0.06)
    ctx.fill()
    ctx.fillStyle = css(0x0d1524, 0.92)
    for (let k = 0; k < 4; k++) {
      roundRectPath(
        ctx,
        -bodyW * 0.36 + k * bodyW * 0.2,
        top + bodyH * 0.16,
        bodyW * 0.14,
        bodyH * 0.3,
        2,
      )
      ctx.fill()
    }
    ctx.fillStyle = css(CREAM, 0.95)
    ctx.fillRect(-bodyW * 0.44, top + bodyH * 0.62, bodyW * 0.88, bodyH * 0.3)
    ctx.fillStyle = css(accent, 0.95)
    ctx.fillRect(-bodyW * 0.44, top + bodyH * 0.62, bodyW * 0.88, bodyH * 0.07)
    wordmark(
      ctx,
      f.word ?? "EICHHOF",
      0,
      top + bodyH * 0.78,
      Math.min(bodyH * 0.22, bodyW * 0.11),
      accent,
      0.9,
      800,
      bodyW * 0.82,
    )
    ctx.fillStyle = linear(ctx, 0, -h * 0.42, 0, -h * 0.28, 0xffffff, 0x2a3346, 0.5, 0.9)
    roundRectPath(ctx, -bodyW * 0.5, -h * 0.44, bodyW, h * 0.16, h * 0.04)
    ctx.fill()
    for (const x of [-bodyW * 0.3, bodyW * 0.28]) {
      circlePath(ctx, x, h * 0.32, wheelR)
      ctx.fillStyle = css(0x14161d)
      ctx.fill()
      circlePath(ctx, x, h * 0.32, wheelR * 0.42)
      ctx.fillStyle = css(0x8b93a3)
      ctx.fill()
    }
  },

  emblem(f) {
    const { ctx, w, h } = f
    const accent = f.accent ?? 0x1f4fa0
    ctx.fillStyle = linear(ctx, 0, -h / 2, 0, h / 2, CREAM, mix(CREAM, accent, 0.16))
    ellipsePath(ctx, 0, 0, w * 0.49, h * 0.49)
    ctx.fill()
    ctx.strokeStyle = css(accent, 0.9)
    ctx.lineWidth = Math.max(1, h * 0.045)
    ellipsePath(ctx, 0, 0, w * 0.45, h * 0.45)
    ctx.stroke()
    const badgeR = Math.min(w, h) * 0.3
    const badgeY = -h * 0.12
    ctx.fillStyle = radial(
      ctx,
      -badgeR * 0.3,
      badgeY,
      badgeR * 0.1,
      badgeR,
      accent,
      shade(accent, 0.6),
    )
    circlePath(ctx, 0, badgeY, badgeR)
    ctx.fill()
    ctx.fillStyle = css(readableOn(accent), 0.95)
    polyPath(ctx, [
      [-badgeR * 0.5, badgeY - badgeR * 0.16],
      [badgeR * 0.5, badgeY - badgeR * 0.16],
      [badgeR * 0.32, badgeY + badgeR * 0.5],
      [0, badgeY + badgeR * 0.18],
      [-badgeR * 0.32, badgeY + badgeR * 0.5],
    ])
    ctx.fill()
    const bandH = h * 0.18
    const bandY = h * 0.3
    ctx.fillStyle = css(accent, 0.95)
    roundRectPath(ctx, -w * 0.36, bandY, w * 0.72, bandH, bandH * 0.28)
    ctx.fill()
    wordmark(
      ctx,
      f.word ?? "EICHHOF",
      0,
      bandY + bandH * 0.56,
      bandH * 0.8,
      readableOn(accent),
      1,
      800,
      w * 0.68,
    )
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
    const brick = mix(0xb03a2e, 0x000000, 0.1)
    ctx.fillStyle = linear(ctx, -hw, 0, hw, 0, mix(brick, 0xffffff, 0.22), shade(brick, 0.62))
    ctx.fillRect(-hw, -h * 0.1, w * 0.92, h * 0.56)
    ctx.fillStyle = css(shade(brick, 0.5))
    for (let k = 0; k < 5; k++) ctx.fillRect(-hw + k * w * 0.12, -h * 0.24, w * 0.1, h * 0.15)
    ctx.fillStyle = css(0x2a0d0a, 0.9)
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

  domino(f) {
    const { ctx, w, h } = f
    const dw = w * 0.9
    const dh = h * 0.9
    ctx.fillStyle = linear(ctx, -dw / 2, 0, dw / 2, 0, 0xf6f7f4, 0xb9bec6)
    roundRectPath(ctx, -dw / 2, -dh / 2, dw, dh, Math.min(dw, dh) * 0.14)
    ctx.fill()
    ctx.strokeStyle = css(0x2a2e36, 0.8)
    ctx.lineWidth = Math.max(0.8, h * 0.03)
    ctx.beginPath()
    ctx.moveTo(-dw / 2, 0)
    ctx.lineTo(dw / 2, 0)
    ctx.stroke()
    ctx.fillStyle = css(0x1a1c22, 0.9)
    const r = Math.min(dw, dh) * 0.09
    for (const [x, y] of [
      [-dw * 0.24, -dh * 0.24],
      [dw * 0.24, -dh * 0.24],
      [0, -dh * 0.1],
      [-dw * 0.24, dh * 0.24],
      [dw * 0.24, dh * 0.24],
    ] as const) {
      circlePath(ctx, x, y, r)
      ctx.fill()
    }
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
    const cols = 4
    const rows = 2
    const pad = Math.min(w, h) * 0.12
    const cw = (w - pad * 2) / cols
    const ch = (h - pad * 2) / rows
    const arm = Math.min(cw, ch) * 0.36
    ctx.fillStyle = css(0x1c1f26, 0.92)
    for (let r = 0; r < rows; r++) {
      for (let c2 = 0; c2 < cols; c2++) {
        const x = -w / 2 + pad + cw * (c2 + 0.5)
        const y = -h / 2 + pad + ch * (r + 0.5)
        roundRectPath(ctx, x - arm, y - arm * 0.34, arm * 2, arm * 0.68, arm * 0.3)
        ctx.fill()
        roundRectPath(ctx, x - arm * 0.34, y - arm, arm * 0.68, arm * 2, arm * 0.3)
        ctx.fill()
      }
    }
  },

  windows(f) {
    const { ctx, w, h } = f
    const colors = [0xe03a2f, 0x4caf50, 0x2b6fd0, 0xe8c33a]
    const pad = w * 0.06
    const s = (w - pad * 2) / 2
    const sk = Math.sin(f.n > 1 ? (f.i / f.n) * Math.PI * 2 : 0) * s * 0.06
    for (let k = 0; k < 4; k++) {
      const color = colors[k] ?? 0xffffff
      const col = k % 2
      const row = (k / 2) | 0
      const x = -w / 2 + pad + col * s + (row === 0 ? sk : -sk)
      const y = -h / 2 + pad + row * s
      ctx.fillStyle = linear(ctx, x, y, x + s, y + s, mix(color, 0xffffff, 0.3), color)
      ctx.fillRect(x, y, s * 0.96, s * 0.96)
    }
  },

  apple(f) {
    const { ctx, w, h } = f
    const r = Math.min(w, h) * 0.34
    ctx.fillStyle = linear(ctx, -r, -r, r, r, 0xfa5252, 0xb01e1e)
    ctx.beginPath()
    ctx.moveTo(0, -r * 0.5)
    ctx.bezierCurveTo(r * 1.2, -r * 1.2, r * 1.5, r * 0.3, r * 0.6, r * 1.15)
    ctx.bezierCurveTo(r * 0.2, r * 1.3, -r * 0.2, r * 1.3, -r * 0.6, r * 1.15)
    ctx.bezierCurveTo(-r * 1.5, r * 0.3, -r * 1.2, -r * 1.2, 0, -r * 0.5)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = css(0xffffff, 0.35)
    ctx.beginPath()
    ctx.ellipse(-r * 0.5, -r * 0.4, r * 0.28, r * 0.16, -0.6, 0, Math.PI * 2)
    ctx.fill()
    ctx.save()
    ctx.rotate(0.35)
    ctx.fillStyle = css(0xffffff, 0.9)
    roundRectPath(ctx, r * 0.1, -r * 0.3, r * 0.12, r * 0.7, r * 0.06)
    ctx.fill()
    ctx.restore()
    ctx.fillStyle = css(0xffffff, 0.95)
    circlePath(ctx, r * 0.95, -r * 0.1, r * 0.22)
    ctx.fill()
    ctx.fillStyle = css(0x2f8f3a, 0.95)
    ctx.save()
    ctx.rotate(-0.5)
    ctx.beginPath()
    ctx.ellipse(-r * 0.2, -r * 0.95, r * 0.4, r * 0.18, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
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

  swing(f) {
    const { ctx, w, h } = f
    const hh = h / 2
    ctx.fillStyle = linear(ctx, 0, -hh, 0, hh, 0xeef1f4, 0x9aa3ad)
    roundRectPath(ctx, -w * 0.4, -hh, w * 0.8, h * 0.16, h * 0.07)
    ctx.fill()
    ctx.fillStyle = linear(ctx, -w * 0.1, 0, w * 0.1, 0, STEEL, STEEL_DARK)
    ctx.fillRect(-w * 0.09, -hh * 0.7, w * 0.18, h * 0.6)
    ctx.fillStyle = radial(
      ctx,
      0,
      hh * 0.1,
      w * 0.02,
      w * 0.34,
      mix(WOOD, 0xffffff, 0.4),
      WOOD_DARK,
    )
    circlePath(ctx, 0, hh * 0.1, w * 0.28)
    ctx.fill()
    ctx.fillStyle = css(0xffffff, 0.3)
    circlePath(ctx, -w * 0.1, hh * 0.02, w * 0.1)
    ctx.fill()
  },

  chip(f) {
    const { ctx, w, h } = f
    const s = Math.min(w, h) * 0.6
    ctx.fillStyle = linear(ctx, -s / 2, -s / 2, s / 2, s / 2, 0x8ef2a8, 0x2f8f4a)
    roundRectPath(ctx, -s / 2, -s / 2, s, s, s * 0.16)
    ctx.fill()
    ctx.strokeStyle = css(0xeafff0, 0.7)
    ctx.lineWidth = Math.max(0.6, s * 0.08)
    roundRectPath(ctx, -s / 2, -s / 2, s, s, s * 0.16)
    ctx.stroke()
  },

  cap(f) {
    const { ctx, w, h } = f
    const r = Math.min(w, h) * 0.46
    circlePath(ctx, 0, 0, r)
    ctx.fillStyle = radial(ctx, -r * 0.3, -r * 0.3, r * 0.1, r, 0xffe07a, GLASS_ORANGE)
    ctx.fill()
    ctx.strokeStyle = css(shade(GLASS_ORANGE, 0.7), 0.9)
    ctx.lineWidth = Math.max(0.8, r * 0.14)
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2
      ctx.beginPath()
      ctx.moveTo(Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55)
      ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r)
      ctx.stroke()
    }
    circlePath(ctx, 0, 0, r * 0.5)
    ctx.fillStyle = css(0xfff4d0, 0.9)
    ctx.fill()
  },
}

// Natural width/length of each subject. A spin strip's frame is the rotation
// envelope, so a bottle must be drawn tall inside it instead of stretched to the
// frame box, otherwise the rotation reads as a squashed smear.
const FOE_ASPECT: Record<FoeArtId, number> = {
  apple: 1,
  bar: 3,
  barrel: 0.92,
  bottle: 0.32,
  brain: 1.5,
  can: 0.42,
  cap: 1,
  castle: 0.92,
  chip: 1,
  citrus: 1,
  clock: 1,
  cocktail: 0.72,
  crate: 1,
  crest: 1.05,
  domino: 2.6,
  dollar: 0.5,
  emblem: 1.6,
  glass: 0.5,
  mug: 0.66,
  pills: 2.4,
  pot: 1.1,
  rock: 1,
  santa: 0.8,
  skull: 1.1,
  swing: 0.85,
  tankard: 0.55,
  toilet: 0.95,
  truck: 2.6,
  windows: 1.2,
}

export function foeAspect(art: FoeArtId): number {
  return FOE_ASPECT[art]
}

export const FOE_ART: Record<string, FoeArtDef> = {
  "l0-s0": { art: "emblem", word: "MILD", accent: 0x2f7d32 },
  "l0-s2": { art: "bottle", glass: GLASS_GREEN },

  "l1-s0": { art: "bottle", glass: GLASS_AMBER },
  "l1-s1": { art: "emblem", word: "KOENIG", accent: 0x1f4fa0 },
  "l1-s2": { art: "barrel" },
  "l1-s3": { art: "crate" },
  "l1-s4": { art: "castle" },
  "l1-s5": { art: "truck", accent: 0xb03028, word: "EICHHOF", motion: "none" },
  "l1-s6": { art: "truck", accent: 0x1f4fa0, word: "EICHHOF" },
  "l1-s7": { art: "truck", accent: 0x2f7d32, word: "BIER" },
  "l1-s9": { art: "glass", glass: GLASS_YELLOW },
  "l1-s11": { art: "bottle", glass: GLASS_GREEN },
  "l1-s12": { art: "citrus" },
  "l1-s13": { art: "truck", accent: 0x3a3f4a, word: "BIER", motion: "pulse" },
  "l1-s14": { art: "rock", motion: "none" },
  "l1-s15": { art: "truck", accent: 0x2f6f4a, word: "EICHHOF" },
  "l1-s18": { art: "bar", motion: "swing" },
  "l1-s19": { art: "bar", motion: "swing" },

  "l2-s1": { art: "cap" },
  "l2-s2": { art: "bottle", glass: GLASS_WHITE },
  "l2-s3": { art: "emblem", word: "X", accent: 0x2b6fd0 },
  "l2-s4": { art: "emblem", word: "V", accent: 0xd2661f },
  "l2-s5": { art: "emblem", word: "Y", accent: 0x1d7a3c },
  "l2-s6": { art: "barrel" },
  "l2-s7": { art: "bottle", glass: GLASS_WHITE },
  "l2-s8": { art: "bottle", glass: GLASS_YELLOW },
  "l2-s9": { art: "bottle", glass: GLASS_WHITE },
  "l2-s10": { art: "bottle", glass: GLASS_YELLOW },
  "l2-s11": { art: "bottle", glass: GLASS_WHITE },
  "l2-s12": { art: "emblem", word: "X", accent: 0x2b6fd0 },
  "l2-s13": { art: "crest", accent: 0xd0202c },
  "l2-s14": { art: "mug", glass: STEEL },
  "l2-s15": { art: "mug", glass: GLASS_YELLOW },
  "l2-s16": { art: "mug", glass: GLASS_YELLOW },
  "l2-s17": { art: "mug", glass: GLASS_ORANGE },
  "l2-s18": { art: "pot", glass: 0x1a44c8 },
  "l2-s19": { art: "bottle", glass: GLASS_ORANGE },
  "l2-s20": { art: "emblem", word: "LOEWENBRAEU", accent: 0x1f6fc0 },
  "l2-s22": { art: "emblem", word: "PAULANER", accent: 0x1a44c8 },
  "l2-s23": { art: "truck", accent: 0xd8dde4, word: "BIER" },
  "l2-s24": { art: "bottle", glass: GLASS_WHITE },
  "l2-s25": { art: "bottle", glass: GLASS_AMBER },
  "l2-s26": { art: "truck", accent: 0x1a44c8, word: "HEINEKEN" },
  "l2-s27": { art: "bottle", glass: GLASS_CLEAR },
  "l2-s28": { art: "bar", motion: "swing" },
  "l2-s29": { art: "bar", motion: "swing" },
  "l2-s30": { art: "cap" },

  "l3-s2": { art: "barrel" },
  "l3-s3": { art: "tankard" },
  "l3-s4": { art: "cocktail", glass: GLASS_RED },
  "l3-s5": { art: "cocktail", glass: GLASS_GREEN },
  "l3-s6": { art: "cocktail", glass: GLASS_PINK },
  "l3-s9": { art: "emblem", word: "JACK DANIELS", accent: 0x2a2620 },
  "l3-s10": { art: "emblem", word: "MOONSHINE", accent: 0x1a44c8 },
  "l3-s11": { art: "emblem", word: "WHISKEY", accent: 0x1a2620 },
  "l3-s12": { art: "bottle", glass: GLASS_GREEN },
  "l3-s13": { art: "santa", motion: "none" },
  "l3-s14": { art: "citrus" },
  "l3-s15": { art: "emblem", word: "MILD", accent: 0x2f7d32 },
  "l3-s16": { art: "cocktail", glass: GLASS_PINK },
  "l3-s17": { art: "domino" },

  "l4-s1": { art: "emblem", word: "ALKA-SELZER", accent: 0x2b4fc0 },
  "l4-s2": { art: "mug", glass: GLASS_RED },
  "l4-s3": { art: "mug", glass: GLASS_MAGENTA },
  "l4-s4": { art: "swing", motion: "swing" },
  "l4-s5": { art: "mug", glass: GLASS_CYAN },
  "l4-s6": { art: "mug", glass: GLASS_TEAL },
  "l4-s7": { art: "chip" },
  "l4-s8": { art: "clock", motion: "none" },
  "l4-s9": { art: "clock", motion: "none" },
  "l4-s10": { art: "brain" },
  "l4-s11": { art: "rock", motion: "none" },
  "l4-s13": { art: "toilet" },
  "l4-s14": { art: "pot", glass: GLASS_BLUE },
  "l4-s15": { art: "windows" },
  "l4-s16": { art: "cocktail", glass: GLASS_MAGENTA },
  "l4-s17": { art: "dollar" },
  "l4-s18": { art: "cocktail", glass: GLASS_GREEN },
  "l4-s20": { art: "skull" },
  "l4-s21": { art: "emblem", word: "ASPIRIN", accent: 0x1d7a3c },
  "l4-s22": { art: "pills" },
  "l4-s23": { art: "apple" },
  "l4-s24": { art: "cap" },
  "l4-s26": { art: "bottle", glass: GLASS_GREEN },
}

export const FOE_ART_KEYS: string[] = Object.keys(FOE_ART)

export function drawFoeArt(ctx: Ctx, key: string, w: number, h: number, i: number, n: number) {
  const def = FOE_ART[key]
  const draw = def ? ART[def.art] : undefined
  if (!def || !draw) return
  draw({ ctx, w, h, i, n, glass: def.glass, accent: def.accent, word: def.word })
}
