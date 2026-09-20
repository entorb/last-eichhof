import { Sound } from "phaser"
import type { Samples } from "./samples"

type Wave = OscillatorType

const EPS = 0.0001

export class Synth {
  private readonly ctx: AudioContext | null = null
  private readonly out: AudioNode | null = null
  private readonly noiseBuffer: AudioBuffer | null = null

  constructor(
    manager: Sound.BaseSoundManager,
    private readonly samples: Samples,
  ) {
    if (manager instanceof Sound.WebAudioSoundManager) {
      this.ctx = manager.context
      this.out = manager.destination
      this.noiseBuffer = this.makeNoise(this.ctx)
    }
  }

  setLevel(level: number): void {
    this.samples.setLevel(level)
  }

  get running(): boolean {
    return this.ctx !== null && this.ctx.state === "running"
  }

  now(): number {
    return this.ctx ? this.ctx.currentTime : 0
  }

  note(freq: number, dur: number, type: Wave = "square", gain = 0.08, when?: number): void {
    const ctx = this.ctx
    const out = this.out
    if (!ctx || !out) return
    const t = when ?? ctx.currentTime
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, t)
    g.gain.setValueAtTime(EPS, t)
    g.gain.exponentialRampToValueAtTime(gain, t + 0.006)
    g.gain.exponentialRampToValueAtTime(EPS, t + dur)
    osc.connect(g).connect(out)
    osc.start(t)
    osc.stop(t + dur + 0.02)
  }

  noise(dur: number, gain = 0.2, filterHz = 1800, when?: number): void {
    const ctx = this.ctx
    const out = this.out
    if (!ctx || !out || !this.noiseBuffer) return
    const t = when ?? ctx.currentTime
    const src = ctx.createBufferSource()
    src.buffer = this.noiseBuffer
    const filter = ctx.createBiquadFilter()
    filter.type = "lowpass"
    filter.frequency.setValueAtTime(filterHz, t)
    filter.frequency.exponentialRampToValueAtTime(Math.max(80, filterHz * 0.25), t + dur)
    const g = ctx.createGain()
    g.gain.setValueAtTime(gain, t)
    g.gain.exponentialRampToValueAtTime(EPS, t + dur)
    src.connect(filter).connect(g).connect(out)
    src.start(t)
    src.stop(t + dur + 0.02)
  }

  private sweep(from: number, to: number, dur: number, type: Wave, gain: number): void {
    const ctx = this.ctx
    const out = this.out
    if (!ctx || !out) return
    const t = ctx.currentTime
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(from, t)
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t + dur)
    g.gain.setValueAtTime(EPS, t)
    g.gain.exponentialRampToValueAtTime(gain, t + 0.006)
    g.gain.exponentialRampToValueAtTime(EPS, t + dur)
    osc.connect(g).connect(out)
    osc.start(t)
    osc.stop(t + dur + 0.02)
  }

  private arp(freqs: number[], step: number, dur: number, type: Wave, gain: number): void {
    const ctx = this.ctx
    if (!ctx) return
    const t0 = ctx.currentTime
    freqs.forEach((f, i) => {
      this.note(f, dur, type, gain, t0 + i * step)
    })
  }

  private makeNoise(ctx: AudioContext): AudioBuffer {
    const len = Math.floor(ctx.sampleRate * 0.5)
    const buf = ctx.createBuffer(1, len, ctx.sampleRate)
    const data = buf.getChannelData(0)
    // getRandomValues takes at most 65536 bytes per call: fill in chunks.
    const bits = new Uint16Array(len)
    for (let i = 0; i < len; i += 32768) {
      crypto.getRandomValues(bits.subarray(i, i + 32768))
    }
    for (const [i, v] of bits.entries()) data[i] = v / 32768 - 1
    return buf
  }

  laser(): void {
    this.sweep(900, 260, 0.11, "square", 0.09)
  }

  enemyShot(): void {
    if (this.samples.enemyShot()) return
    this.sweep(320, 140, 0.14, "sawtooth", 0.06)
  }

  hit(): void {
    this.noise(0.2, 0.18, 2400)
    this.sweep(240, 80, 0.18, "square", 0.1)
  }

  explosion(): void {
    if (this.samples.explosion()) return
    this.noise(0.45, 0.24, 1600)
    this.sweep(180, 50, 0.4, "sawtooth", 0.1)
  }

  bossExplosion(): void {
    if (this.samples.explosion(true)) return
    this.explosion()
  }

  uiMove(): void {
    this.note(440, 0.05, "square", 0.045)
  }

  uiConfirm(): void {
    this.arp([660, 990], 0.06, 0.08, "square", 0.06)
  }

  buy(): void {
    this.arp([523, 659, 784], 0.07, 0.1, "triangle", 0.09)
  }

  sell(): void {
    this.arp([784, 587, 392], 0.07, 0.1, "triangle", 0.09)
  }

  checkpoint(): void {
    if (this.samples.levelCue()) return
    this.arp([659, 880], 0.09, 0.12, "square", 0.07)
  }

  win(): void {
    this.arp([523, 659, 784, 1046], 0.11, 0.16, "square", 0.09)
  }

  gameOver(): void {
    if (this.samples.play("tod")) return
    this.arp([392, 330, 262, 196], 0.16, 0.22, "sawtooth", 0.09)
  }
}
