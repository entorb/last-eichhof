import type { GameObjects, Scene } from "phaser";

export type PadAction = "up" | "down" | "left" | "right" | "confirm" | "back";

export interface PadState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  confirm: boolean;
  back: boolean;
}

interface ButtonDef {
  action: PadAction;
  label: string;
  x: number;
  y: number;
}

const BUTTONS: ButtonDef[] = [
  { action: "up", label: "▲", x: 112, y: 552 },
  { action: "down", label: "▼", x: 112, y: 636 },
  { action: "left", label: "◀", x: 68, y: 594 },
  { action: "right", label: "▶", x: 156, y: 594 },
  { action: "confirm", label: "OK", x: 892, y: 594 },
  { action: "back", label: "ESC", x: 812, y: 660 },
];

// On-screen d-pad + confirm/back for Menu and Shop in touch mode. Poll it once
// per frame: `poll()` returns the buttons pressed this frame and clears them.
export class TouchPad {
  private readonly pressed = new Set<PadAction>();
  private objects: GameObjects.Text[] = [];

  constructor(scene: Scene) {
    for (const b of BUTTONS) {
      const text = scene.add
        .text(b.x, b.y, b.label, {
          fontFamily: "monospace",
          fontSize: "30px",
          color: "#cfe3ff",
          backgroundColor: "rgba(20,28,44,0.6)",
        })
        .setOrigin(0.5)
        .setPadding(10, 6, 10, 6)
        .setDepth(500)
        .setInteractive({ useHandCursor: true });
      text.on("pointerdown", () => this.pressed.add(b.action));
      this.objects.push(text);
    }
  }

  poll(): PadState {
    const state: PadState = {
      up: this.pressed.has("up"),
      down: this.pressed.has("down"),
      left: this.pressed.has("left"),
      right: this.pressed.has("right"),
      confirm: this.pressed.has("confirm"),
      back: this.pressed.has("back"),
    };
    this.pressed.clear();
    return state;
  }

  destroy(): void {
    for (const o of this.objects) o.destroy();
    this.objects = [];
    this.pressed.clear();
  }
}
