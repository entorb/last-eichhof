import type { Scene } from "phaser"

// Off-canvas steering. The canvas is a fixed 960x720 letterbox inside #app, so
// on wide landscape screens the strips beside it are empty DOM area that Phaser
// never sees. Track raw pointer drags there and expose them as a force in game
// pixels (same units as the rex VirtualJoyStick), so `Game` can feed both
// through `stickFromForce`.
export class EdgeStick {
  private pointerId: number | null = null
  private startX = 0
  private startY = 0
  private fx = 0
  private fy = 0
  private readonly scene: Scene
  private readonly canvas: HTMLCanvasElement
  private readonly onDown: (() => void) | undefined

  constructor(scene: Scene, onDown?: () => void) {
    this.scene = scene
    this.canvas = scene.game.canvas
    this.onDown = onDown
    window.addEventListener("pointerdown", this.down)
    window.addEventListener("pointermove", this.move)
    window.addEventListener("pointerup", this.up)
    window.addEventListener("pointercancel", this.up)
    scene.events.once("shutdown", () => this.destroy())
  }

  get forceX(): number {
    return this.fx
  }

  get forceY(): number {
    return this.fy
  }

  destroy(): void {
    window.removeEventListener("pointerdown", this.down)
    window.removeEventListener("pointermove", this.move)
    window.removeEventListener("pointerup", this.up)
    window.removeEventListener("pointercancel", this.up)
    this.pointerId = null
  }

  private readonly down = (e: PointerEvent) => {
    if (this.pointerId !== null || this.ignore(e.target)) return
    this.pointerId = e.pointerId
    this.startX = e.clientX
    this.startY = e.clientY
    this.fx = 0
    this.fy = 0
    // Capture so a drag that crosses onto the canvas can't also start Phaser's
    // joystick mid-gesture; the plugin needs a pointerdown/over on its own zone.
    if (e.target instanceof Element) {
      e.target.setPointerCapture(e.pointerId)
    }
    this.onDown?.()
  }

  private readonly move = (e: PointerEvent) => {
    if (e.pointerId !== this.pointerId) return
    const scale = this.scene.scale.displayScale
    this.fx = (e.clientX - this.startX) * scale.x
    this.fy = (e.clientY - this.startY) * scale.y
  }

  private readonly up = (e: PointerEvent) => {
    if (e.pointerId !== this.pointerId) return
    this.pointerId = null
    this.fx = 0
    this.fy = 0
  }

  private ignore(target: EventTarget | null): boolean {
    if (target === this.canvas) return true
    return target instanceof Element && target.closest("#rotate") !== null
  }
}
