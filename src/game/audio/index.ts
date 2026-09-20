import type { Sound } from "phaser"
import { Music } from "./music"
import { Samples } from "./samples"
import { Synth } from "./synth"

let synth: Synth | null = null
let music: Music | null = null
let samples: Samples | null = null

export function initAudio(manager: Sound.BaseSoundManager): void {
  samples = new Samples(manager)
  synth = new Synth(manager, samples)
  music = new Music(synth, samples)
}

export function getSfx(): Synth {
  if (!synth) throw new Error("audio not initialized")
  return synth
}

export function getMusic(): Music {
  if (!music) throw new Error("audio not initialized")
  return music
}

export function getSamples(): Samples {
  if (!samples) throw new Error("audio not initialized")
  return samples
}

export { runAudioSelfCheck } from "./music"
export { runSoundsSelfCheck } from "./samples"
