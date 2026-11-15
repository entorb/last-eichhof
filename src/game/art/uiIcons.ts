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
  home: "ui-home",
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
  ctx.strokeStyle = css(0xff_ff_ff, 0.8)
  ctx.lineWidth = 1.5
  ctx.stroke()
}

const drawers: Record<string, Draw> = {
  "ui-forward": (ctx) => {
    glow(ctx, 0x59_d1_6b)
    ctx.fillStyle = linear(ctx, 0, 0, SIZE, SIZE, 0x7e_e7_87, 0x2e_a0_43)
    ctx.beginPath()
    ctx.moveTo(5, 3)
    ctx.lineTo(5, 21)
    ctx.lineTo(21, 12)
    ctx.closePath()
    ctx.fill()
  },

  "ui-buy": (ctx) => {
    badge(ctx, 0x7a_3d_00, 0xff_b8_29)
    ctx.fillStyle = css(0x5c_2d_00)
    ctx.fillRect(10, 8, 4, 8)
    ctx.fillRect(8, 10, 8, 4)
  },

  "ui-upgrade": (ctx) => {
    badge(ctx, 0x1f_6f_cc, 0x4d_a3_ff)
    ctx.fillStyle = css(0x0b_3a_69)
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
    glow(ctx, 0xff_5f_6e)
    const g = ctx.createRadialGradient(8, 8, 1, 12, 12, 12)
    g.addColorStop(0, css(0xff_b3_ba))
    g.addColorStop(0.55, css(0xff_5f_6e))
    g.addColorStop(1, css(0x7a_14_20))
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(12, 12, 11, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = css(0xff_e0_e3, 0.9)
    ctx.lineWidth = 1.5
    ctx.stroke()
  },

  "ui-play": (ctx) => {
    badge(ctx, 0x1f_7a_35, 0x2e_a0_43)
    ctx.fillStyle = css(0xff_ff_ff)
    ctx.beginPath()
    ctx.moveTo(9, 7)
    ctx.lineTo(9, 17)
    ctx.lineTo(17, 12)
    ctx.closePath()
    ctx.fill()
  },

  "ui-difficulty": (ctx) => {
    glow(ctx, 0xff_d5_4a)
    const bars: [number, number, number][] = [
      [4, 15, 5],
      [10, 10, 10],
      [16, 4, 16],
    ]
    for (const [x, y, h] of bars) {
      ctx.fillStyle = linear(ctx, 0, y, 0, y + h, 0xff_e0_8a, 0xb8_71_0f)
      roundRect(ctx, x, y, 4, h, 2)
      ctx.fill()
    }
  },

  "ui-scores": (ctx) => {
    glow(ctx, 0xff_d5_4a)
    ctx.fillStyle = linear(ctx, 0, 0, 0, 14, 0xff_e0_8a, 0xd9_9a_1c)
    roundRect(ctx, 6, 3, 12, 9, 2)
    ctx.fill()
    ctx.fillStyle = css(0xff_b8_29)
    ctx.fillRect(3, 5, 3, 5)
    ctx.fillRect(18, 5, 3, 5)
    ctx.fillStyle = css(0xb8_71_0f)
    ctx.fillRect(10, 12, 4, 5)
    ctx.fillStyle = css(0xd9_9a_1c)
    ctx.fillRect(6, 17, 12, 3)
  },

  "ui-options": (ctx) => {
    glow(ctx, 0x9a_a4_bf)
    ctx.save()
    ctx.translate(12, 12)
    ctx.fillStyle = linear(ctx, -10, -10, 10, 10, 0xd7_de_ee, 0x6b_7a_99)
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
    ctx.fillStyle = css(0x0b_0e_1a)
    ctx.beginPath()
    ctx.arc(12, 12, 3, 0, Math.PI * 2)
    ctx.fill()
  },

  "ui-fullscreen": (ctx) => {
    glow(ctx, 0x9f_e0_ff)
    ctx.strokeStyle = linear(ctx, 0, 0, SIZE, SIZE, 0xd7_f2_ff, 0x4a_a8_e0)
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
    glow(ctx, 0x4d_a3_ff)
    ctx.fillStyle = linear(ctx, 0, 0, 0, SIZE, 0x9b_c8_ff, 0x1f_6f_cc)
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
    glow(ctx, 0x7e_e7_87)
    ctx.strokeStyle = css(0x2e_a0_43)
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(8, 11)
    ctx.lineTo(16, 6)
    ctx.moveTo(8, 13)
    ctx.lineTo(16, 18)
    ctx.stroke()
    ctx.fillStyle = linear(ctx, 0, 0, SIZE, SIZE, 0x9a_f0_a3, 0x2e_a0_43)
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
    glow(ctx, 0x1f_6f_cc)
    ctx.fillStyle = linear(ctx, 0, 0, 0, SIZE, 0x4d_a3_ff, 0x1f_6f_cc)
    roundRect(ctx, 2, 5, 20, 14, 2)
    ctx.fill()
    ctx.strokeStyle = css(0xff_ff_ff, 0.85)
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(3, 6)
    ctx.lineTo(12, 13)
    ctx.lineTo(21, 6)
    ctx.stroke()
  },

  "ui-home": (ctx) => {
    glow(ctx, 0x7e_e7_87)
    ctx.fillStyle = linear(ctx, 0, 2, 0, SIZE, 0x9a_f0_a3, 0x2e_a0_43)
    // roof + walls in one path, door punched back out in the panel color
    ctx.beginPath()
    ctx.moveTo(12, 2)
    ctx.lineTo(23, 12)
    ctx.lineTo(19.5, 12)
    ctx.lineTo(19.5, 22)
    ctx.lineTo(4.5, 22)
    ctx.lineTo(4.5, 12)
    ctx.lineTo(1, 12)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = css(0x0b_0e_1a)
    roundRect(ctx, 9.5, 15, 5, 7, 1)
    ctx.fill()
  },

  "ui-back": (ctx) => {
    glow(ctx, 0x9a_a4_bf)
    ctx.strokeStyle = linear(ctx, 0, 0, SIZE, SIZE, 0xd7_de_ee, 0x6b_7a_99)
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
    glow(ctx, 0xc7_92_ea)
    ctx.fillStyle = linear(ctx, 0, 0, SIZE, SIZE, 0xe0_b3_ff, 0x8a_4f_d0)
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
    glow(ctx, 0xff_5f_6e)
    ctx.strokeStyle = linear(ctx, 0, 0, 0, SIZE, 0xff_b3_ba, 0xc0_33_40)
    ctx.lineWidth = 2
    ctx.strokeRect(3, 3, 11, 18)
    ctx.fillStyle = css(0xff_8a_95)
    ctx.fillRect(12, 11, 6, 2)
    ctx.beginPath()
    ctx.moveTo(17, 7)
    ctx.lineTo(22, 12)
    ctx.lineTo(17, 17)
    ctx.closePath()
    ctx.fill()
  },

  "ui-graphics": (ctx) => {
    glow(ctx, 0x9a_a4_bf)
    ctx.fillStyle = linear(ctx, 0, 0, 0, SIZE, 0xd7_de_ee, 0x6b_7a_99)
    ctx.beginPath()
    ctx.ellipse(12, 12, 10, 8.5, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = css(0x0b_0e_1a)
    ctx.beginPath()
    ctx.arc(16, 9, 2.2, 0, Math.PI * 2)
    ctx.fill()
    for (const [x, y, color] of [
      [7, 8, 0xff_5f_6e],
      [6, 14, 0xff_d5_4a],
      [12, 17, 0x4d_a3_ff],
      [17, 15, 0x7e_e7_87],
    ] as const) {
      ctx.fillStyle = css(color)
      ctx.beginPath()
      ctx.arc(x, y, 1.8, 0, Math.PI * 2)
      ctx.fill()
    }
  },

  "ui-autofire": (ctx) => {
    glow(ctx, 0xff_b8_29)
    ctx.strokeStyle = linear(ctx, 0, 0, 0, SIZE, 0xff_e0_8a, 0xb8_71_0f)
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
    ctx.fillStyle = css(0xff_b8_29)
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
  assert(UI_ICON_KEYS.length === 18, "expected 18 UI icons")
  assert(new Set(UI_ICON_KEYS).size === UI_ICON_KEYS.length, "icons unique")
  for (const key of UI_ICON_KEYS) {
    assert(key.startsWith("ui-"), `${key} needs ui- prefix`)
    assert(Boolean(drawers[key]), `${key} needs a drawer`)
  }
}
