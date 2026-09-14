import type { GraphicsMode } from "./store";

// Retro uses the extracted DOS art directly (keys from SPRITE_SHEETS plus the
// procedural extras). Modern art is generated at boot under a `v-` prefix with
// the same frame layout, so callers only swap the texture/animation key.
export function skinKey(key: string, mode: GraphicsMode): string {
  return mode === "modern" ? `v-${key}` : key;
}

export function bgKey(level: number): string {
  return `v-bg-${level}`;
}

export function runSkinsSelfCheck(): void {
  const assert = (cond: boolean, msg: string) => {
    if (!cond) throw new Error(`selfcheck: ${msg}`);
  };
  assert(skinKey("ship", "retro") === "ship", "retro keeps key");
  assert(skinKey("ship", "modern") === "v-ship", "modern prefixes key");
  assert(skinKey("l1-s0", "modern") === "v-l1-s0", "modern foe key");
  assert(bgKey(3) === "v-bg-3", "bg key");
}
