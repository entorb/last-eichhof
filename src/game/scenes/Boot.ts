import { type GameObjects, Math as PhaserMath, Scene } from "phaser"
import { generateUiIcons, runUiIconsSelfCheck, UI_ICON_KEYS } from "../art/uiIcons"
import { getMusic, initAudio, runAudioSelfCheck, runSoundsSelfCheck } from "../audio"
import { SPRITE_SHEETS } from "../data/enemySprites"
import { FOES } from "../data/foeRosters"
import { runLevelsSelfCheck } from "../data/levels"
import { runPathSelfCheck } from "../data/path"
import { runRunSelfCheck } from "../data/run"
import { SOUNDS } from "../data/sounds"
import { runStatsSelfCheck } from "../data/stats"
import { loadSettings, runStoreSelfCheck } from "../data/store"
import { runWeaponsSelfCheck, WEAPONS } from "../data/weapons"
import { runControlsSelfCheck } from "../input/controls"

export class Boot extends Scene {
  constructor() {
    super("Boot")
  }

  preload() {
    for (const sheet of SPRITE_SHEETS) {
      this.load.spritesheet(sheet.key, sheet.file, {
        frameWidth: sheet.frameWidth,
        frameHeight: sheet.frameHeight,
      })
    }
    for (const sound of SOUNDS) {
      this.load.audio(sound.key, sound.file)
    }
  }

  create() {
    this.makeSprite("cork", 12, 26, (g) => {
      g.fillStyle(0x9c7b45)
      g.fillRoundedRect(0, 0, 12, 26, 4)
      g.fillStyle(0xcaa46a)
      g.fillRoundedRect(2, 2, 8, 22, 3)
      g.fillStyle(0xe0c896)
      g.fillRect(3, 4, 2, 16)
    })

    this.makeSprite("pellet", 10, 10, (g) => {
      g.fillStyle(0xff5c5c)
      g.fillCircle(5, 5, 5)
      g.fillStyle(0xffd0d0)
      g.fillCircle(5, 5, 2)
    })

    this.makeStars("stars-far", 140, 2, 0.15, 0.5)
    this.makeStars("stars-near", 50, 3, 0.6, 1)
    this.makeWeaponIcons()
    generateUiIcons(this)

    this.createAnims()

    // Dev-only: vitest already runs the self-checks, so production skips them.
    if (import.meta.env.DEV) this.devSelfChecks()

    initAudio(this.sound)
    this.sound.volume = 0.8
    getMusic().setEnabled(loadSettings().music)
    this.scene.start("Menu")
  }

  private createAnims() {
    for (const sheet of SPRITE_SHEETS) {
      if (sheet.frames <= 1) continue
      this.anims.create({
        key: sheet.key,
        frames: this.anims.generateFrameNumbers(sheet.key, {
          start: 0,
          end: sheet.frames - 1,
        }),
        frameRate: sheet.frameRate,
        repeat: sheet.key === "explosion" ? 0 : -1,
      })
    }
  }

  private devSelfChecks() {
    this.assertTextures(
      SPRITE_SHEETS.map((s) => s.key),
      "texture",
    )
    this.assertTextures(["cork", "pellet", "stars-far", "stars-near"], "texture")
    this.assertTextures(UI_ICON_KEYS, "icon")
    this.assertTextures(
      (Object.keys(FOES) as (keyof typeof FOES)[]).map((kind) => FOES[kind].texture),
      "foe texture",
    )
    this.assertTextures(
      WEAPONS.map((w) => `wpn-${w.id}`),
      "icon",
    )

    runPathSelfCheck()
    runLevelsSelfCheck()
    runRunSelfCheck()
    runStoreSelfCheck()
    runStatsSelfCheck()
    runWeaponsSelfCheck()
    runControlsSelfCheck()
    runUiIconsSelfCheck()
    runAudioSelfCheck()
    runSoundsSelfCheck()
  }

  private assertTextures(keys: readonly string[], what: string) {
    for (const key of keys) {
      if (!this.textures.exists(key)) {
        throw new Error(`selfcheck: missing ${what} ${key}`)
      }
    }
  }

  private makeSprite(key: string, w: number, h: number, draw: (g: GameObjects.Graphics) => void) {
    const g = this.make.graphics({ x: 0, y: 0 })
    draw(g)
    g.generateTexture(key, w, h)
    g.destroy()
  }

  private makeWeaponIcons() {
    const generated = new Set(SPRITE_SHEETS.map((s) => s.key))
    WEAPONS.forEach((w, i) => {
      if (generated.has(`wpn-${w.id}`)) return
      this.makeSprite(`wpn-${w.id}`, 24, 36, (g) => {
        const body = w.tint
        const dark = shade(body, 0.55)
        const light = shade(body, 1.3)
        g.fillStyle(dark)
        g.fillRect(9, 0, 6, 10)
        g.fillStyle(light)
        g.fillRect(8, 0, 8, 4)
        g.fillStyle(body)
        g.fillRoundedRect(4, 8, 16, 28, 4)
        g.fillStyle(light, 0.6)
        g.fillRect(6, 10, 3, 22)
        g.fillStyle(0xf5e6b8)
        g.fillRect(6, 16, 12, 10)
        g.fillStyle(dark)
        const v = i % 4
        if (v === 0) {
          g.fillRect(6, 18, 12, 3)
        } else if (v === 1) {
          g.fillRect(6, 18, 12, 2)
          g.fillRect(6, 22, 12, 2)
        } else if (v === 2) {
          g.fillCircle(12, 21, 3)
        } else {
          g.fillRect(10, 16, 4, 10)
        }
      })
    })
  }

  private makeStars(key: string, count: number, size: number, minA: number, maxA: number) {
    const g = this.make.graphics({ x: 0, y: 0 })
    // Seeded by key, so every boot draws the same stars (stable snapshots).
    const rnd = new PhaserMath.RandomDataGenerator([key])
    for (let i = 0; i < count; i++) {
      g.fillStyle(0xffffff, rnd.realInRange(minA, maxA))
      g.fillRect(rnd.between(0, 255), rnd.between(0, 255), size, size)
    }
    g.generateTexture(key, 256, 256)
    g.destroy()
  }
}

function shade(color: number, factor: number): number {
  const c = (v: number) => Math.min(255, Math.round(v * factor))
  return (c((color >> 16) & 0xff) << 16) | (c((color >> 8) & 0xff) << 8) | c(color & 0xff)
}
