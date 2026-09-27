export type Ctx = CanvasRenderingContext2D

export interface Frame {
  ctx: Ctx
  w: number
  h: number
  i: number
  n: number
}

export function css(color: number, a = 1): string {
  const r = (color >> 16) & 0xff
  const g = (color >> 8) & 0xff
  const b = color & 0xff
  return `rgba(${r}, ${g}, ${b}, ${a})`
}

export function shade(color: number, factor: number): number {
  const c = (v: number) => Math.min(255, Math.max(0, Math.round(v * factor)))
  return (c((color >> 16) & 0xff) << 16) | (c((color >> 8) & 0xff) << 8) | c(color & 0xff)
}

export function mix(a: number, b: number, t: number): number {
  const c = (shift: number) =>
    Math.round(((a >> shift) & 0xff) + (((b >> shift) & 0xff) - ((a >> shift) & 0xff)) * t)
  return (c(16) << 16) | (c(8) << 8) | c(0)
}

export function linear(
  ctx: Ctx,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  from: number,
  to: number,
  a0 = 1,
  a1 = 1,
): CanvasGradient {
  const g = ctx.createLinearGradient(x0, y0, x1, y1)
  g.addColorStop(0, css(from, a0))
  g.addColorStop(1, css(to, a1))
  return g
}

export function radial(
  ctx: Ctx,
  x: number,
  y: number,
  r0: number,
  r1: number,
  from: number,
  to: number,
  a0 = 1,
  a1 = 1,
): CanvasGradient {
  const g = ctx.createRadialGradient(x, y, r0, x, y, r1)
  g.addColorStop(0, css(from, a0))
  g.addColorStop(1, css(to, a1))
  return g
}

export function roundRectPath(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2))
  ctx.beginPath()
  ctx.moveTo(x + rr, y)
  ctx.arcTo(x + w, y, x + w, y + h, rr)
  ctx.arcTo(x + w, y + h, x, y + h, rr)
  ctx.arcTo(x, y + h, x, y, rr)
  ctx.arcTo(x, y, x + w, y, rr)
  ctx.closePath()
}

export function polyPath(ctx: Ctx, pts: readonly (readonly [number, number])[]) {
  const first = pts[0]
  if (!first) return
  ctx.beginPath()
  ctx.moveTo(first[0], first[1])
  for (const p of pts.slice(1)) ctx.lineTo(p[0], p[1])
  ctx.closePath()
}

export function ellipsePath(ctx: Ctx, x: number, y: number, rx: number, ry: number) {
  ctx.beginPath()
  ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, Math.PI * 2)
  ctx.closePath()
}

export function circlePath(ctx: Ctx, x: number, y: number, r: number) {
  ctx.beginPath()
  ctx.arc(x, y, Math.max(0.1, r), 0, Math.PI * 2)
  ctx.closePath()
}

export function stroke(
  ctx: Ctx,
  color: number,
  width: number,
  a = 1,
  join: CanvasLineJoin = "round",
) {
  ctx.strokeStyle = css(color, a)
  ctx.lineWidth = Math.max(0.5, width)
  ctx.lineJoin = join
  ctx.stroke()
}

export function glow(ctx: Ctx, x: number, y: number, r: number, color: number, blur: number) {
  ctx.save()
  ctx.shadowColor = css(color)
  ctx.shadowBlur = blur
  ctx.fillStyle = css(color)
  circlePath(ctx, x, y, r)
  ctx.fill()
  ctx.restore()
}

export function spec(ctx: Ctx, x: number, y: number, w: number, h: number, a = 0.5) {
  ctx.fillStyle = linear(ctx, x, y, x + w, y + h, 0xffffff, 0xffffff, a, 0)
  ctx.fillRect(x, y, w, h)
}

export function wordmark(
  ctx: Ctx,
  text: string,
  x: number,
  y: number,
  size: number,
  color: number,
  a = 1,
  weight = 800,
  maxW = 0,
) {
  if (text.length === 0) return
  ctx.save()
  ctx.fillStyle = css(color, a)
  const family = 'system-ui, "Segoe UI", Helvetica, Arial, sans-serif'
  ctx.font = `${weight} ${size}px ${family}`
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  // Shrink to the plate instead of letting fillText squeeze the glyphs (which
  // also breaks centring, because Chrome keeps the unsqueezed metrics).
  const measured = ctx.measureText(text).width
  if (maxW > 0 && measured > maxW) {
    ctx.font = `${weight} ${(size * maxW) / measured}px ${family}`
  }
  ctx.fillText(text, x, y)
  ctx.restore()
}

/** Ink or cream, whichever stays legible on `color`. */
export function readableOn(color: number): number {
  const l =
    0.2126 * ((color >> 16) & 0xff) + 0.7152 * ((color >> 8) & 0xff) + 0.0722 * (color & 0xff)
  return l > 140 ? 0x1b1d24 : 0xf4ecd8
}

export function arc(
  ctx: Ctx,
  x: number,
  y: number,
  r: number,
  from: number,
  to: number,
  color: number,
  width: number,
) {
  ctx.beginPath()
  ctx.arc(x, y, Math.max(0.1, r), from, to)
  ctx.strokeStyle = css(color)
  ctx.lineWidth = Math.max(0.5, width)
  ctx.lineCap = "round"
  ctx.stroke()
}
