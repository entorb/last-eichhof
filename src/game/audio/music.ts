import type { Samples } from "./samples";
import type { Synth } from "./synth";

const STEPS = 16;

const N = {
  C2: 65.41,
  D2: 73.42,
  E2: 82.41,
  F2: 87.31,
  G2: 98.0,
  A2: 110.0,
  C3: 130.81,
  E3: 164.81,
  G3: 196.0,
  A3: 220.0,
  C4: 261.63,
  D4: 293.66,
  E4: 329.63,
  F4: 349.23,
  G4: 392.0,
  A4: 440.0,
  C5: 523.25,
  E5: 659.25,
  G5: 784.0,
};

export interface Pattern {
  bpm: number;
  bass: number[];
  lead: number[];
}

export const TITLE: Pattern = {
  bpm: 96,
  bass: [N.C2, 0, 0, 0, N.G2, 0, 0, 0, N.A2, 0, 0, 0, N.F2, 0, 0, 0],
  lead: [N.E4, 0, N.G4, 0, N.A4, 0, N.G4, 0, N.E4, 0, N.D4, 0, N.C4, 0, 0, 0],
};

export const GAME: Pattern = {
  bpm: 132,
  bass: [
    N.C2,
    N.C2,
    0,
    N.C2,
    N.G2,
    0,
    N.G2,
    0,
    N.A2,
    N.A2,
    0,
    N.A2,
    N.F2,
    0,
    N.F2,
    0,
  ],
  lead: [
    N.C4,
    0,
    N.E4,
    N.G4,
    0,
    N.E4,
    N.C4,
    0,
    N.D4,
    0,
    N.F4,
    N.A4,
    0,
    N.F4,
    N.D4,
    0,
  ],
};

export function stepDuration(bpm: number): number {
  return 60 / bpm / 4;
}

export function nextStep(step: number): number {
  return (step + 1) % STEPS;
}

export type MusicScene = "menu" | "game" | "scores" | "shop";

export class Music {
  private pattern: Pattern | null = null;
  private scene: MusicScene = "menu";
  private enabled = true;
  private step = 0;
  private nextTime = 0;
  private timer: number | null = null;

  constructor(
    private readonly synth: Synth,
    private readonly samples: Samples,
  ) {}

  // Music off silences the synth patterns; SFX (Synth one-shots, Samples) stay.
  setEnabled(enabled: boolean): void {
    if (this.enabled === enabled) return;
    this.enabled = enabled;
    if (enabled) this.setScene(this.scene);
    else this.stop();
  }

  // Menu/scores/game music is synthesized; the original TITLE/HS samples are
  // copyright-protected and intentionally not shipped.
  setScene(scene: MusicScene): void {
    this.scene = scene;
    this.samples.stopTrack();
    if (!this.enabled) {
      this.stopSynth();
      return;
    }
    if (scene === "shop") {
      // Shop drives its own buy/sell sample loop; silence the game pattern.
      this.stopSynth();
      return;
    }
    const pattern = scene === "game" ? GAME : TITLE;
    if (this.pattern === pattern) return;
    this.play(pattern);
  }

  stop(): void {
    this.stopSynth();
    this.samples.stopTrack();
  }

  private stopSynth(): void {
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
    this.pattern = null;
  }

  private play(pattern: Pattern): void {
    this.stopSynth();
    this.pattern = pattern;
    this.step = 0;
    this.nextTime = 0;
    this.timer = setInterval(() => this.tick(), 25);
  }

  private tick(): void {
    const p = this.pattern;
    if (!p || !this.synth.running) return;
    const now = this.synth.now();
    if (this.nextTime < now) this.nextTime = now + 0.05;
    const dur = stepDuration(p.bpm);
    while (this.nextTime < now + 0.12) {
      const i = this.step;
      const bass = p.bass[i];
      const lead = p.lead[i];
      if (bass)
        this.synth.note(bass, dur * 0.9, "triangle", 0.16, this.nextTime);
      if (lead) this.synth.note(lead, dur * 0.7, "square", 0.05, this.nextTime);
      this.nextTime += dur;
      this.step = nextStep(this.step);
    }
  }
}

export function runAudioSelfCheck(): void {
  const assert = (cond: boolean, msg: string) => {
    if (!cond) throw new Error(`selfcheck: ${msg}`);
  };
  for (const [name, p] of Object.entries({ TITLE, GAME })) {
    assert(p.bpm > 0, `${name} bpm`);
    assert(p.bass.length === STEPS, `${name} bass length`);
    assert(p.lead.length === STEPS, `${name} lead length`);
    assert(
      [...p.bass, ...p.lead].every((f) => Number.isFinite(f) && f >= 0),
      `${name} frequencies`,
    );
  }
  assert(stepDuration(120) > 0, "step duration");
  assert(nextStep(15) === 0, "step wraps");
  assert(nextStep(0) === 1, "step advances");
}
