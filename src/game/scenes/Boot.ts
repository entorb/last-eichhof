import { type GameObjects, Scene } from "phaser";
import { generateVectorArt } from "../art/vectorArt";
import { initAudio, runAudioSelfCheck, runSoundsSelfCheck } from "../audio";
import { SPRITE_SHEETS } from "../data/enemySprites";
import { FOES, runSelfCheck } from "../data/level1";
import { runLevelsSelfCheck } from "../data/levels";
import { runSkinsSelfCheck, skinKey } from "../data/skins";
import { SOUNDS } from "../data/sounds";
import { runStatsSelfCheck } from "../data/stats";
import { runStoreSelfCheck } from "../data/store";
import { runWeaponsSelfCheck, WEAPONS } from "../data/weapons";
import { runControlsSelfCheck } from "../input/controls";

export class Boot extends Scene {
  constructor() {
    super("Boot");
  }

  preload() {
    for (const sheet of SPRITE_SHEETS) {
      this.load.spritesheet(sheet.key, sheet.file, {
        frameWidth: sheet.frameWidth,
        frameHeight: sheet.frameHeight,
      });
    }
    for (const sound of SOUNDS) {
      this.load.audio(sound.key, sound.file);
    }
  }

  create() {
    this.makeSprite("cork", 12, 26, (g) => {
      g.fillStyle(0x9c7b45);
      g.fillRoundedRect(0, 0, 12, 26, 4);
      g.fillStyle(0xcaa46a);
      g.fillRoundedRect(2, 2, 8, 22, 3);
      g.fillStyle(0xe0c896);
      g.fillRect(3, 4, 2, 16);
    });

    this.makeSprite("pellet", 10, 10, (g) => {
      g.fillStyle(0xff5c5c);
      g.fillCircle(5, 5, 5);
      g.fillStyle(0xffd0d0);
      g.fillCircle(5, 5, 2);
    });

    this.makeStars("stars-far", 140, 2, 0.15, 0.5);
    this.makeStars("stars-near", 50, 3, 0.6, 1);
    this.makeWeaponIcons();
    this.makeUiIcons();

    generateVectorArt(this);

    for (const prefix of ["", "v-"] as const) {
      for (const sheet of SPRITE_SHEETS) {
        if (sheet.frames <= 1) continue;
        this.anims.create({
          key: `${prefix}${sheet.key}`,
          frames: this.anims.generateFrameNumbers(`${prefix}${sheet.key}`, {
            start: 0,
            end: sheet.frames - 1,
          }),
          frameRate: sheet.frameRate,
          repeat: sheet.key === "explosion" ? 0 : -1,
        });
      }
    }
    for (const sheet of SPRITE_SHEETS) {
      for (const mode of ["retro", "modern"] as const) {
        const key = skinKey(sheet.key, mode);
        if (!this.textures.exists(key)) {
          throw new Error(`selfcheck: missing texture ${key}`);
        }
      }
    }
    for (const extra of [
      "cork",
      "pellet",
      "stars-far",
      "stars-near",
      "ui-forward",
      "ui-buy",
      "ui-upgrade",
      "ui-sell",
    ]) {
      if (!this.textures.exists(skinKey(extra, "modern"))) {
        throw new Error(
          `selfcheck: missing texture ${skinKey(extra, "modern")}`,
        );
      }
    }
    for (const kind of Object.keys(FOES) as (keyof typeof FOES)[]) {
      if (!this.textures.exists(FOES[kind].texture)) {
        throw new Error(`selfcheck: missing foe texture ${FOES[kind].texture}`);
      }
    }
    for (const w of WEAPONS) {
      if (!this.textures.exists(`wpn-${w.id}`)) {
        throw new Error(`selfcheck: missing icon wpn-${w.id}`);
      }
    }

    runSelfCheck();
    runLevelsSelfCheck();
    runStoreSelfCheck();
    runStatsSelfCheck();
    runSkinsSelfCheck();
    runWeaponsSelfCheck();
    runControlsSelfCheck();
    runAudioSelfCheck();
    runSoundsSelfCheck();
    initAudio(this.sound);
    this.sound.volume = 0.8;
    this.scene.start("Menu");
  }

  private makeSprite(
    key: string,
    w: number,
    h: number,
    draw: (g: GameObjects.Graphics) => void,
  ) {
    const g = this.make.graphics({ x: 0, y: 0 });
    draw(g);
    g.generateTexture(key, w, h);
    g.destroy();
  }

  private makeWeaponIcons() {
    const generated = new Set(SPRITE_SHEETS.map((s) => s.key));
    WEAPONS.forEach((w, i) => {
      if (generated.has(`wpn-${w.id}`)) return;
      this.makeSprite(`wpn-${w.id}`, 24, 36, (g) => {
        const body = w.tint;
        const dark = shade(body, 0.55);
        const light = shade(body, 1.3);
        g.fillStyle(dark);
        g.fillRect(9, 0, 6, 10);
        g.fillStyle(light);
        g.fillRect(8, 0, 8, 4);
        g.fillStyle(body);
        g.fillRoundedRect(4, 8, 16, 28, 4);
        g.fillStyle(light, 0.6);
        g.fillRect(6, 10, 3, 22);
        g.fillStyle(0xf5e6b8);
        g.fillRect(6, 16, 12, 10);
        g.fillStyle(dark);
        const v = i % 4;
        if (v === 0) {
          g.fillRect(6, 18, 12, 3);
        } else if (v === 1) {
          g.fillRect(6, 18, 12, 2);
          g.fillRect(6, 22, 12, 2);
        } else if (v === 2) {
          g.fillCircle(12, 21, 3);
        } else {
          g.fillRect(10, 16, 4, 10);
        }
      });
    });
  }

  private makeUiIcons() {
    this.makeSprite("ui-forward", 24, 24, (g) => {
      g.fillStyle(0x2ea043);
      g.fillTriangle(5, 3, 5, 21, 21, 12);
      g.fillStyle(0x7ee787);
      g.fillTriangle(8, 7, 8, 17, 18, 12);
    });
    this.makeSprite("ui-buy", 24, 24, (g) => {
      g.fillStyle(0x7a3d00);
      g.fillRoundedRect(2, 2, 20, 20, 4);
      g.fillStyle(0xffb829);
      g.fillRoundedRect(5, 5, 14, 14, 3);
      g.fillStyle(0x7a3d00);
      g.fillRect(10, 8, 4, 8);
      g.fillRect(8, 10, 8, 4);
    });
    this.makeSprite("ui-upgrade", 24, 24, (g) => {
      g.fillStyle(0x1f6fcc);
      g.fillRoundedRect(2, 2, 20, 20, 4);
      g.fillStyle(0x4da3ff);
      g.fillRoundedRect(5, 5, 14, 14, 3);
      g.fillStyle(0x0b3a69);
      g.fillTriangle(12, 5, 20, 13, 4, 13);
      g.fillRect(10, 13, 4, 7);
    });
    this.makeSprite("ui-sell", 24, 24, (g) => {
      g.fillStyle(0x7a1420);
      g.fillCircle(12, 12, 11);
      g.fillStyle(0xff5f6e);
      g.fillCircle(12, 12, 9);
      g.fillStyle(0xffb3ba);
      g.fillCircle(12, 12, 4);
    });
  }

  private makeStars(
    key: string,
    count: number,
    size: number,
    minA: number,
    maxA: number,
  ) {
    const g = this.make.graphics({ x: 0, y: 0 });
    for (let i = 0; i < count; i++) {
      const a = minA + Math.random() * (maxA - minA);
      g.fillStyle(0xffffff, a);
      g.fillRect(
        Math.floor(Math.random() * 256),
        Math.floor(Math.random() * 256),
        size,
        size,
      );
    }
    g.generateTexture(key, 256, 256);
    g.destroy();
  }
}

function shade(color: number, factor: number): number {
  const c = (v: number) => Math.min(255, Math.round(v * factor));
  return (
    (c((color >> 16) & 0xff) << 16) |
    (c((color >> 8) & 0xff) << 8) |
    c(color & 0xff)
  );
}
