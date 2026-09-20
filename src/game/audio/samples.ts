import { Sound } from "phaser"
import { LEVEL_CUES, type LevelCues, SOUNDS } from "../data/sounds"

export interface SampleConfig {
  volume?: number
  rate?: number
}

// Plays the extracted original DOS samples through Phaser's sound manager.
// No-ops when the manager is not Web Audio (e.g. NoAudio fallback).
export class Samples {
  private readonly manager: Sound.BaseSoundManager | null = null
  private track: Sound.BaseSound | null = null
  private trackKey: string | null = null
  private level = 1

  constructor(manager: Sound.BaseSoundManager) {
    if (manager instanceof Sound.WebAudioSoundManager) this.manager = manager
  }

  get available(): boolean {
    return this.manager !== null
  }

  has(key: string): boolean {
    return SOUNDS.some((s) => s.key === key)
  }

  setLevel(level: number): void {
    this.level = level
  }

  play(key: string | null | undefined, config: SampleConfig = {}): boolean {
    if (!this.manager || !key || !this.has(key)) return false
    return this.manager.play(key, config)
  }

  loop(key: string | null | undefined, volume = 0.5): void {
    if (!this.manager || !key || !this.has(key)) return
    if (this.trackKey === key) return
    this.stopTrack()
    const sound = this.manager.add(key, { loop: true, volume })
    sound.play()
    this.track = sound
    this.trackKey = key
  }

  stopTrack(): void {
    if (this.track) {
      this.track.stop()
      this.track.destroy()
    }
    this.track = null
    this.trackKey = null
  }

  private cue(name: keyof LevelCues): string | null {
    return LEVEL_CUES[this.level]?.[name] ?? null
  }

  enemyShot(): boolean {
    return this.play(this.cue("enemyShot"))
  }

  explosion(boss = false): boolean {
    return this.play(this.cue(boss ? "bossExplosion" : "explosion"))
  }

  levelCue(): boolean {
    return this.play(this.cue("cue"))
  }
}

export function runSoundsSelfCheck(): void {
  const assert = (cond: boolean, msg: string) => {
    if (!cond) throw new Error(`selfcheck: ${msg}`)
  }
  assert(SOUNDS.length > 0, "sounds manifest not empty")
  for (const s of SOUNDS) {
    assert(s.key.length > 0, `sound key for ${s.source}`)
    assert(s.file.startsWith("assets/sounds/"), `sound file for ${s.key}`)
    assert(s.seconds > 0, `sound duration for ${s.key}`)
  }
  for (const [level, cues] of Object.entries(LEVEL_CUES)) {
    for (const [name, key] of Object.entries(cues)) {
      if (key === null) continue
      assert(
        SOUNDS.some((s) => s.key === key),
        `level ${level} ${name} references missing ${key}`,
      )
    }
  }
}
