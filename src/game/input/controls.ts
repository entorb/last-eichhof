import type { ControlsMode } from "../data/store";

export function resolveTouchControls(
  mode: ControlsMode,
  deviceTouch: boolean,
): boolean {
  if (mode === "touch") return true;
  if (mode === "keyboard") return false;
  return deviceTouch;
}

export interface MoveKeys {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
}

export interface Stick {
  x: number;
  y: number;
}

export function moveVector(keys: MoveKeys, stick: Stick): Stick {
  let x = (keys.right ? 1 : 0) - (keys.left ? 1 : 0) + stick.x;
  let y = (keys.down ? 1 : 0) - (keys.up ? 1 : 0) + stick.y;
  const len = Math.hypot(x, y);
  if (len > 1) {
    x /= len;
    y /= len;
  }
  return { x, y };
}

// Analog force (game px) -> 8-direction stick: normalize by the joystick radius,
// clamp, and snap to the sign once past the dead zone. Shared by the on-canvas
// floating joystick and the off-canvas edge stick so both feel identical.
export function stickFromForce(
  fx: number,
  fy: number,
  radius: number,
  threshold = 0.25,
): Stick {
  const jx = Math.min(1, Math.max(-1, fx / radius));
  const jy = Math.min(1, Math.max(-1, fy / radius));
  return {
    x: Math.abs(jx) > threshold ? Math.sign(jx) : 0,
    y: Math.abs(jy) > threshold ? Math.sign(jy) : 0,
  };
}

export function runControlsSelfCheck(): void {
  const assert = (cond: boolean, msg: string) => {
    if (!cond) throw new Error(`selfcheck: ${msg}`);
  };

  assert(resolveTouchControls("touch", false), "touch forced on");
  assert(!resolveTouchControls("keyboard", true), "keyboard forced off");
  assert(resolveTouchControls("auto", true), "auto follows device on");
  assert(!resolveTouchControls("auto", false), "auto follows device off");

  const none: MoveKeys = {
    left: false,
    right: false,
    up: false,
    down: false,
  };
  const idle = moveVector(none, { x: 0, y: 0 });
  assert(idle.x === 0 && idle.y === 0, "idle vector");

  const diag = moveVector({ ...none, right: true, down: true }, { x: 0, y: 0 });
  assert(
    Math.abs(Math.hypot(diag.x, diag.y) - 1) < 1e-9,
    "diagonal normalized",
  );
  assert(Math.abs(diag.x - Math.SQRT1_2) < 1e-9, "diagonal x");
  assert(Math.abs(diag.y - Math.SQRT1_2) < 1e-9, "diagonal y");

  const analog = moveVector(none, { x: 0.5, y: 0 });
  assert(analog.x === 0.5 && analog.y === 0, "analog preserved");

  const combined = moveVector({ ...none, right: true }, { x: 1, y: 0 });
  assert(Math.abs(combined.x - 1) < 1e-9, "combined clamped");

  const dead = stickFromForce(10, 0, 90);
  assert(dead.x === 0 && dead.y === 0, "stick dead zone");
  const full = stickFromForce(90, -90, 90);
  assert(full.x === 1 && full.y === -1, "stick full tilt");
  const clamped = stickFromForce(1000, 0, 90);
  assert(clamped.x === 1, "stick clamped");
}
