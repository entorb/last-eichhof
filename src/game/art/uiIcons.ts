import type { Scene } from "phaser"

// Procedural UI icons, shared by Menu and Shop.

type Ctx = CanvasRenderingContext2D
type Draw = (ctx: Ctx, w: number, h: number) => void

export const UI_ICONS = {
  forward: "ui-forward",
  buy: "ui-buy",
  upgrade: "ui-upgrade",
  sell: "ui-sell",
  play: "ui-play",
  difficulty: "ui-difficulty",
  scores: "ui-scores",
  options: "ui-options",
  fullscreen: "ui-fullscreen",
  install: "ui-install",
  share: "ui-share",
  contact: "ui-contact",
  back: "ui-back",
  music: "ui-music",
  exit: "ui-exit",
  graphics: "ui-graphics",
  autofire: "ui-autofire",
} as const

export const UI_ICON_KEYS: string[] = Object.values(UI_ICONS)

const SIZE = 24

function css(n: number, a = 1): string {
  const r = (n >> 16) & 0xff
  const g = (n >> 8) & 0xff
  const b = n & 0xff
  return `rgba(${r}, ${g}, ${b}, ${a})`
}

function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2))
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}

function glow(ctx: Ctx, color: number, a = 0.7) {
  ctx.save()
  ctx.globalAlpha = a
  ctx.shadowColor = css(color)
  ctx.shadowBlur = 14
  ctx.fillStyle = css(color)
  ctx.beginPath()
  ctx.arc(SIZE / 2, SIZE / 2, SIZE * 0.16, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function linear(
  ctx: Ctx,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  from: number,
  to: number,
): CanvasGradient {
  const g = ctx.createLinearGradient(x0, y0, x1, y1)
  g.addColorStop(0, css(from))
  g.addColorStop(1, css(to))
  return g
}

function badge(ctx: Ctx, dark: number, light: number) {
  glow(ctx, light)
  ctx.fillStyle = linear(ctx, 0, 0, 0, SIZE, light, dark)
  roundRect(ctx, 1.5, 1.5, 21, 21, 5)
  ctx.fill()
  ctx.strokeStyle = css(0xffffff, 0.8)
  ctx.lineWidth = 1.5
  ctx.stroke()
}

const drawers: Record<string, Draw> = {
  "ui-forward": (ctx) => {
    glow(ctx, 0x59d16b)
    ctx.fillStyle = linear(ctx, 0, 0, SIZE, SIZE, 0x7ee787, 0x2ea043)
    ctx.beginPath()
    ctx.moveTo(5, 3)
    ctx.lineTo(5, 21)
    ctx.lineTo(21, 12)
    ctx.closePath()
    ctx.fill()
  },

  "ui-buy": (ctx) => {
    badge(ctx, 0x7a3d00, 0xffb829)
    ctx.fillStyle = css(0x5c2d00)
    ctx.fillRect(10, 8, 4, 8)
    ctx.fillRect(8, 10, 8, 4)
  },

  "ui-upgrade": (ctx) => {
    badge(ctx, 0x1f6fcc, 0x4da3ff)
    ctx.fillStyle = css(0x0b3a69)
    ctx.beginPath()
    ctx.moveTo(12, 5)
    ctx.lineTo(20, 13)
    ctx.lineTo(12, 11)
    ctx.lineTo(4, 13)
    ctx.closePath()
    ctx.fill()
    ctx.fillRect(10, 11, 4, 8)
  },

  "ui-sell": (ctx) => {
    glow(ctx, 0xff5f6e)
    const g = ctx.createRadialGradient(8, 8, 1, 12, 12, 12)
    g.addColorStop(0, css(0xffb3ba))
    g.addColorStop(0.55, css(0xff5f6e))
    g.addColorStop(1, css(0x7a1420))
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(12, 12, 11, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = css(0xffe0e3, 0.9)
    ctx.lineWidth = 1.5
    ctx.stroke()
  },

  "ui-play": (ctx) => {
    badge(ctx, 0x1f7a35, 0x2ea043)
    ctx.fillStyle = css(0xffffff)
    ctx.beginPath()
    ctx.moveTo(9, 7)
    ctx.lineTo(9, 17)
    ctx.lineTo(17, 12)
    ctx.closePath()
    ctx.fill()
  },

  "ui-difficulty": (ctx) => {
    glow(ctx, 0xffd54a)
    const bars: [number, number, number][] = [
      [4, 15, 5],
      [10, 10, 10],
      [16, 4, 16],
    ]
    for (const [x, y, h] of bars) {
      ctx.fillStyle = linear(ctx, 0, y, 0, y + h, 0xffe08a, 0xb8710f)
      roundRect(ctx, x, y, 4, h, 2)
      ctx.fill()
    }
  },

  "ui-scores": (ctx) => {
    glow(ctx, 0xffd54a)
    ctx.fillStyle = linear(ctx, 0, 0, 0, 14, 0xffe08a, 0xd99a1c)
    roundRect(ctx, 6, 3, 12, 9, 2)
    ctx.fill()
    ctx.fillStyle = css(0xffb829)
    ctx.fillRect(3, 5, 3, 5)
    ctx.fillRect(18, 5, 3, 5)
    ctx.fillStyle = css(0xb8710f)
    ctx.fillRect(10, 12, 4, 5)
    ctx.fillStyle = css(0xd99a1c)
    ctx.fillRect(6, 17, 12, 3)
  },

  "ui-options": (ctx) => {
    glow(ctx, 0x9aa4bf)
    ctx.save()
    ctx.translate(12, 12)
    ctx.fillStyle = linear(ctx, -10, -10, 10, 10, 0xd7deee, 0x6b7a99)
    for (let i = 0; i < 8; i++) {
      ctx.save()
      ctx.rotate((i * Math.PI) / 4)
      roundRect(ctx, -1.8, -11, 3.6, 5, 1.2)
      ctx.fill()
      ctx.restore()
    }
    ctx.beginPath()
    ctx.arc(0, 0, 7, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
    ctx.fillStyle = css(0x0b0e1a)
    ctx.beginPath()
    ctx.arc(12, 12, 3, 0, Math.PI * 2)
    ctx.fill()
  },

  "ui-fullscreen": (ctx) => {
    glow(ctx, 0x9fe0ff)
    ctx.strokeStyle = linear(ctx, 0, 0, SIZE, SIZE, 0xd7f2ff, 0x4aa8e0)
    ctx.lineWidth = 2.5
    ctx.lineCap = "round"
    const c = 3
    const l = 8
    const corners: [number, number, number, number][] = [
      [c, l, c, c],
      [c, c, l, c],
      [SIZE - l, c, SIZE - c, c],
      [SIZE - c, c, SIZE - c, l],
      [SIZE - c, SIZE - l, SIZE - c, SIZE - c],
      [SIZE - c, SIZE - c, SIZE - l, SIZE - c],
      [l, SIZE - c, c, SIZE - c],
      [c, SIZE - c, c, SIZE - l],
    ]
    ctx.beginPath()
    for (const [x1, y1, x2, y2] of corners) {
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
    }
    ctx.stroke()
  },

  "ui-install": (ctx) => {
    glow(ctx, 0x4da3ff)
    ctx.fillStyle = linear(ctx, 0, 0, 0, SIZE, 0x9bc8ff, 0x1f6fcc)
    ctx.fillRect(10, 3, 4, 9)
    ctx.beginPath()
    ctx.moveTo(6, 10)
    ctx.lineTo(18, 10)
    ctx.lineTo(12, 16)
    ctx.closePath()
    ctx.fill()
    ctx.fillRect(4, 18, 16, 3)
  },

  "ui-share": (ctx) => {
    glow(ctx, 0x7ee787)
    ctx.strokeStyle = css(0x2ea043)
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(8, 11)
    ctx.lineTo(16, 6)
    ctx.moveTo(8, 13)
    ctx.lineTo(16, 18)
    ctx.stroke()
    ctx.fillStyle = linear(ctx, 0, 0, SIZE, SIZE, 0x9af0a3, 0x2ea043)
    for (const [x, y] of [
      [6, 12],
      [18, 5],
      [18, 19],
    ] as const) {
      ctx.beginPath()
      ctx.arc(x, y, 3.4, 0, Math.PI * 2)
      ctx.fill()
    }
  },

  "ui-contact": (ctx) => {
    glow(ctx, 0x1f6fcc)
    ctx.fillStyle = linear(ctx, 0, 0, 0, SIZE, 0x4da3ff, 0x1f6fcc)
    roundRect(ctx, 2, 5, 20, 14, 2)
    ctx.fill()
    ctx.strokeStyle = css(0xffffff, 0.85)
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(3, 6)
    ctx.lineTo(12, 13)
    ctx.lineTo(21, 6)
    ctx.stroke()
  },

  "ui-back": (ctx) => {
    glow(ctx, 0x9aa4bf)
    ctx.strokeStyle = linear(ctx, 0, 0, SIZE, SIZE, 0xd7deee, 0x6b7a99)
    ctx.lineWidth = 3
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
    ctx.beginPath()
    ctx.moveTo(15, 4)
    ctx.lineTo(7, 12)
    ctx.lineTo(15, 20)
    ctx.stroke()
  },

  "ui-music": (ctx) => {
    glow(ctx, 0xc792ea)
    ctx.fillStyle = linear(ctx, 0, 0, SIZE, SIZE, 0xe0b3ff, 0x8a4fd0)
    ctx.fillRect(9, 5, 2, 12)
    ctx.fillRect(18, 3, 2, 12)
    ctx.fillRect(9, 4, 11, 3)
    ctx.beginPath()
    ctx.arc(7, 17, 3.5, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(16, 15, 3.5, 0, Math.PI * 2)
    ctx.fill()
  },

  "ui-exit": (ctx) => {
    glow(ctx, 0xff5f6e)
    ctx.strokeStyle = linear(ctx, 0, 0, 0, SIZE, 0xffb3ba, 0xc03340)
    ctx.lineWidth = 2
    ctx.strokeRect(3, 3, 11, 18)
    ctx.fillStyle = css(0xff8a95)
    ctx.fillRect(12, 11, 6, 2)
    ctx.beginPath()
    ctx.moveTo(17, 7)
    ctx.lineTo(22, 12)
    ctx.lineTo(17, 17)
    ctx.closePath()
    ctx.fill()
  },

  "ui-graphics": (ctx) => {
    glow(ctx, 0x9aa4bf)
    ctx.fillStyle = linear(ctx, 0, 0, 0, SIZE, 0xd7deee, 0x6b7a99)
    ctx.beginPath()
    ctx.ellipse(12, 12, 10, 8.5, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = css(0x0b0e1a)
    ctx.beginPath()
    ctx.arc(16, 9, 2.2, 0, Math.PI * 2)
    ctx.fill()
    for (const [x, y, color] of [
      [7, 8, 0xff5f6e],
      [6, 14, 0xffd54a],
      [12, 17, 0x4da3ff],
      [17, 15, 0x7ee787],
    ] as const) {
      ctx.fillStyle = css(color)
      ctx.beginPath()
      ctx.arc(x, y, 1.8, 0, Math.PI * 2)
      ctx.fill()
    }
  },

  "ui-autofire": (ctx) => {
    glow(ctx, 0xffb829)
    ctx.strokeStyle = linear(ctx, 0, 0, 0, SIZE, 0xffe08a, 0xb8710f)
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(12, 12, 7, 0, Math.PI * 2)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(12, 2)
    ctx.lineTo(12, 7)
    ctx.moveTo(12, 17)
    ctx.lineTo(12, 22)
    ctx.moveTo(2, 12)
    ctx.lineTo(7, 12)
    ctx.moveTo(17, 12)
    ctx.lineTo(22, 12)
    ctx.stroke()
    ctx.fillStyle = css(0xffb829)
    ctx.beginPath()
    ctx.arc(12, 12, 2.2, 0, Math.PI * 2)
    ctx.fill()
  },
}

function makeIcon(scene: Scene, key: string, draw: Draw) {
  const tex = scene.textures.createCanvas(key, SIZE, SIZE)
  if (!tex) throw new Error(`selfcheck: could not create ${key}`)
  draw(tex.context, SIZE, SIZE)
  tex.refresh()
}

export function generateUiIcons(scene: Scene): void {
  for (const key of UI_ICON_KEYS) {
    const draw = drawers[key]
    if (!draw) throw new Error(`selfcheck: no drawer for ${key}`)
    makeIcon(scene, key, draw)
  }
}

export function runUiIconsSelfCheck(): void {
  const assert = (cond: boolean, msg: string) => {
    if (!cond) throw new Error(`selfcheck: ${msg}`)
  }
  assert(UI_ICON_KEYS.length === 17, "expected 17 UI icons")
  assert(new Set(UI_ICON_KEYS).size === UI_ICON_KEYS.length, "icons unique")
  for (const key of UI_ICON_KEYS) {
    assert(key.startsWith("ui-"), `${key} needs ui- prefix`)
    assert(Boolean(drawers[key]), `${key} needs a drawer`)
  }
}
