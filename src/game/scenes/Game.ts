import {
  type GameObjects,
  Geom,
  Input,
  Scene,
  Scenes,
  TintModes,
  type Types,
} from "phaser";
import VirtualJoyStick from "phaser4-rex-plugins/plugins/virtualjoystick.js";
import { getMusic, getSamples, getSfx } from "../audio";
import { FOES, type FoeKind, type RosterSpawn } from "../data/foeRosters";
import { getLevel, LEVELS } from "../data/levels";
import { clamp } from "../data/math";
import { PathRunner, pathFor } from "../data/path";
import { PLAY } from "../data/playfield";
import {
  endRun,
  getRun,
  hasRun,
  newRun,
  type Run,
  shipSpeed,
} from "../data/run";
import { DIFFICULTY, loadSettings, recordGameResult } from "../data/store";
import {
  type Emitter,
  moneyForLevel,
  type ShotKind,
  type Weapon,
  weaponById,
} from "../data/weapons";
import * as Flow from "../flow";
import {
  moveVector,
  resolveTouchControls,
  stickFromForce,
} from "../input/controls";
import { EdgeStick } from "../input/edgeStick";

const SHIELD_MS = 2500;
const LOSE_MS = 1200;
const WIN_MS = 2500;
const HOMING_TURN = 6;
const SPECIAL_LIFE = 2.5;
const HUD_H = PLAY.hud;
const TOP = HUD_H;
const BOTTOM = PLAY.h;
const JOY_RADIUS = 90;
const JOY_THUMB = 34;
const MAX_FOES = 26; // DOS `MAXFOES`

interface Enemy {
  sprite: GameObjects.Sprite;
  kind: FoeKind;
  shield: number;
  score: number;
  runner: PathRunner;
  hitFlash: number;
  scheduled: boolean;
}

interface Shot {
  sprite: GameObjects.Sprite;
  vx: number;
  vy: number;
  power: number;
  kind: ShotKind;
  age: number;
  life: number;
  tint: number;
  release?: { after: number; shots: Emitter[] };
}

interface Explosion {
  sprite: GameObjects.Sprite;
  age: number;
  life: number;
}

interface EnemyShot {
  sprite: GameObjects.Image;
  vx: number;
  vy: number;
}

interface Mounted {
  weapon: Weapon;
  dx: number;
  dy: number;
}

type State = "shield" | "play" | "dead" | "win" | "gameover";

export class Game extends Scene {
  private ship!: GameObjects.Sprite;
  private bg!: GameObjects.Rectangle;
  private hud!: GameObjects.Graphics;
  private starsFar!: GameObjects.TileSprite;
  private starsNear!: GameObjects.TileSprite;
  private scoreText!: GameObjects.Text;
  private livesText!: GameObjects.Text;
  private godText!: GameObjects.Text;
  private levelText!: GameObjects.Text;
  private mounts: { sprite: GameObjects.Sprite; dx: number; dy: number }[] = [];
  private message!: GameObjects.Text;
  private hint!: GameObjects.Text;

  private cursors!: Types.Input.Keyboard.CursorKeys;
  private keyA!: Input.Keyboard.Key;
  private keyD!: Input.Keyboard.Key;
  private keyW!: Input.Keyboard.Key;
  private keyS!: Input.Keyboard.Key;
  private keyFire!: Input.Keyboard.Key;

  private shots: Shot[] = [];
  private enemies: Enemy[] = [];
  private enemyShots: EnemyShot[] = [];
  private explosions: Explosion[] = [];
  private loadout: Mounted[] = [];
  private cooldowns: number[] = [];

  private run!: Run;
  private state: State = "shield";
  private stateTimer = 0;
  private score = 0;
  private levelStartScore = 0;
  private lives = 4;
  private diff = DIFFICULTY.normal;
  private resultRecorded = false;
  private levelTime = 0;
  private spawnIndex = 0;
  private queue: RosterSpawn[] = [];
  private bossesLeft = 1;
  private fieldOn = true;
  private checkpoints: number[] = [];
  private nextCheckpoint = 0;
  private flashText!: GameObjects.Text;
  private flashTimer = 0;
  private touch = false;
  private autoFire = false;
  private joystick: VirtualJoyStick | null = null;
  private joyRing: GameObjects.Arc | null = null;
  private joyThumb: GameObjects.Arc | null = null;
  private pauseButton: GameObjects.Text | null = null;
  private edgeStick: EdgeStick | null = null;

  constructor() {
    super("Game");
  }

  create() {
    const settings = loadSettings();
    this.autoFire = settings.autoFire;
    this.events.on(Scenes.Events.RESUME, () => {
      this.autoFire = loadSettings().autoFire;
    });
    this.touch = resolveTouchControls(
      settings.controls,
      this.sys.game.device.input.touch,
    );
    this.diff = DIFFICULTY[settings.difficulty];
    if (!hasRun()) newRun();
    this.run = getRun();
    this.bg = this.add
      .rectangle(0, 0, PLAY.w, PLAY.h, 0x05060d)
      .setOrigin(0)
      .setDepth(-20);
    this.starsFar = this.add
      .tileSprite(PLAY.w / 2, PLAY.h / 2, PLAY.w, PLAY.h, "stars-far")
      .setDepth(-10);
    this.starsNear = this.add
      .tileSprite(PLAY.w / 2, PLAY.h / 2, PLAY.w, PLAY.h, "stars-near")
      .setDepth(-9)
      .setAlpha(0.7);

    this.ship = this.add
      .sprite(PLAY.w / 2, BOTTOM - 70, "ship")
      .setDepth(10)
      .play("ship");

    this.hud = this.add.graphics().setDepth(100);
    this.drawHud();

    const style = {
      fontFamily: "monospace",
      fontSize: "24px",
      color: "#ffd54a",
    };
    this.scoreText = this.add.text(16, 12, "LITERS 0", style).setDepth(101);
    this.levelText = this.add
      .text(PLAY.w / 2, 12, "LEVEL 1", style)
      .setOrigin(0.5, 0)
      .setDepth(101);
    this.livesText = this.add
      .text(PLAY.w - 16, 12, "LIVES 4", style)
      .setOrigin(1, 0)
      .setDepth(101);
    this.godText = this.add
      .text(PLAY.w - 16, HUD_H + 4, "GOD MODE", {
        fontFamily: "monospace",
        fontSize: "22px",
        color: "#ff5c5c",
      })
      .setOrigin(1, 0)
      .setDepth(150)
      .setVisible(this.run.godMode);

    // Top-left MENU button, available in keyboard and touch mode alike.
    this.pauseButton = this.add
      .text(16, HUD_H + 8, "MENU", {
        fontFamily: "monospace",
        fontSize: "22px",
        color: "#9fe0ff",
        backgroundColor: "rgba(20,28,44,0.6)",
      })
      .setPadding(10, 4, 10, 4)
      .setDepth(300)
      .setInteractive({ useHandCursor: true });
    this.pauseButton.on("pointerdown", () => this.togglePause());

    this.message = this.add
      .text(PLAY.w / 2, PLAY.h / 2, "", {
        fontFamily: "monospace",
        fontSize: "48px",
        color: "#ffffff",
        align: "center",
      })
      .setOrigin(0.5)
      .setDepth(200);

    let hintText: string;
    if (this.touch) {
      hintText =
        "DRAG            MOVE\nAUTO            FIRE\nMENU / ESC      PAUSE";
    } else if (this.autoFire) {
      hintText =
        "ARROWS / WASD   MOVE\nAUTO            FIRE\nESC             MENU";
    } else {
      hintText =
        "ARROWS / WASD   MOVE\nSPACE           FIRE\nESC             MENU";
    }

    this.hint = this.add
      .text(PLAY.w / 2, 300, hintText, {
        fontFamily: "monospace",
        fontSize: "26px",
        color: "#9fe0ff",
        align: "left",
        lineSpacing: 8,
      })
      .setOrigin(0.5)
      .setDepth(150);

    this.flashText = this.add
      .text(PLAY.w / 2, TOP + 40, "", {
        fontFamily: "monospace",
        fontSize: "28px",
        color: "#9fe0ff",
      })
      .setOrigin(0.5)
      .setDepth(150)
      .setAlpha(0);

    const kb = this.input.keyboard;
    if (!kb) throw new Error("Keyboard input unavailable");
    this.cursors = kb.createCursorKeys();
    this.keyA = kb.addKey(Input.Keyboard.KeyCodes.A);
    this.keyD = kb.addKey(Input.Keyboard.KeyCodes.D);
    this.keyW = kb.addKey(Input.Keyboard.KeyCodes.W);
    this.keyS = kb.addKey(Input.Keyboard.KeyCodes.S);
    this.keyFire = kb.addKey(Input.Keyboard.KeyCodes.SPACE);
    kb.on("keydown-ESC", () => this.togglePause());
    kb.on("keydown-J", (e: KeyboardEvent) => {
      if (!e.repeat) this.jumpToNextCheckpoint();
    });
    kb.on("keydown-G", (e: KeyboardEvent) => {
      if (e.repeat) return;
      this.run.godMode = !this.run.godMode;
      this.godText.setVisible(this.run.godMode);
      if (this.run.godMode) this.run.money += 10000;
    });
    if (this.touch) this.buildTouchControls();

    this.resetLevel();
    getMusic().setScene("game");
    getSamples().play("go");
  }

  private buildTouchControls() {
    // Invisible input zone is the plugin base; it stays renderable (a Zone draws
    // nothing) so Phaser keeps hit-testing it, unlike an alpha-0 sprite.
    const zone = this.add.zone(PLAY.w / 2, BOTTOM - 130, 2, 2);
    const ring = this.add
      .circle(PLAY.w / 2, BOTTOM - 130, JOY_RADIUS, 0x0a0a12, 0.28)
      .setStrokeStyle(4, 0x9fe0ff, 0.55)
      .setDepth(50)
      .setAlpha(0);
    const thumb = this.add
      .circle(PLAY.w / 2, BOTTOM - 130, JOY_THUMB, 0x9fe0ff, 0.5)
      .setDepth(51)
      .setAlpha(0);
    this.joyRing = ring;
    this.joyThumb = thumb;
    // Floating stick: recentre on the touch point before the plugin samples it.
    // These listeners are registered before the plugin's own over/down handlers,
    // and pointerover can fire before pointerdown, so handle both.
    const place = (p: Input.Pointer) => {
      if (!p.isDown || this.state === "gameover") return;
      const pb = this.pauseButton?.getBounds();
      if (pb && Geom.Rectangle.Contains(pb, p.x, p.y)) return;
      zone.setPosition(p.x, p.y);
      ring.setPosition(p.x, p.y);
      thumb.setPosition(p.x, p.y);
      ring.setAlpha(1);
      thumb.setAlpha(1);
    };
    zone.on("pointerover", place);
    zone.on("pointerdown", place);
    this.joystick = new VirtualJoyStick(this, {
      x: PLAY.w / 2,
      y: BOTTOM - 130,
      radius: JOY_RADIUS,
      base: zone,
      thumb,
      dir: "8dir",
      forceMin: 6,
      fixed: true,
      enable: true,
    });
    // A wide hit area lets any play-area touch start the stick; the zone jumps
    // to the finger so the stick is relative to where the thumb landed.
    // `setInteractive` alone won't replace the plugin's circle hit area, so
    // clear the input component first.
    zone.removeInteractive();
    zone.setInteractive(
      new Geom.Rectangle(-2000, -2000, 4000, 4000),
      Geom.Rectangle.Contains,
    );
    this.joystick.setVisible(false);

    this.input.on("pointerup", () => {
      ring.setAlpha(0);
      thumb.setAlpha(0);
    });
    this.input.on("pointerdown", () => {
      if (this.state === "gameover") Flow.endGame(this.scene);
    });

    // Blank area beside the letterbox canvas also steers, and a tap there
    // continues after game over.
    this.edgeStick = new EdgeStick(this, () => {
      if (this.state === "gameover") Flow.endGame(this.scene);
    });
  }

  private togglePause() {
    if (
      this.state !== "play" &&
      this.state !== "shield" &&
      this.state !== "dead"
    ) {
      return;
    }
    this.joystick?.setVisible(false);
    this.joyRing?.setAlpha(0);
    this.joyThumb?.setAlpha(0);
    this.pauseButton?.setVisible(false);
    Flow.pauseGame(this.scene);
  }

  update(_time: number, delta: number) {
    const dt = Math.min(delta / 1000, 0.05);
    this.starsFar.tilePositionY -= 40 * (this.fieldOn ? 1 : 0) * dt;
    this.starsNear.tilePositionY -= 110 * (this.fieldOn ? 1 : 0) * dt;

    if (this.joystick) {
      const active = this.state === "shield" || this.state === "play";
      if (this.joystick.visible !== active) this.joystick.setVisible(active);
      if (!active) this.joyRing?.setAlpha(0);
    }
    if (this.pauseButton) {
      const active =
        this.state === "play" ||
        this.state === "shield" ||
        this.state === "dead";
      if (this.pauseButton.visible !== active) {
        this.pauseButton.setVisible(active);
      }
    }

    if (this.flashTimer > 0) {
      this.flashTimer -= delta;
      this.flashText.setAlpha(Math.max(0, this.flashTimer / 1000));
    }

    this.updateExplosions(dt);

    if (this.state === "shield") {
      this.stateTimer -= delta;
      this.moveShip(dt);
      this.ship.setAlpha(Math.floor(_time / 100) % 2 ? 0.35 : 1);
      if (this.stateTimer <= 0) {
        this.state = "play";
        this.ship.setAlpha(1);
        this.hint.setVisible(false);
      }
      return;
    }

    if (this.state === "play") {
      this.levelTime += dt;
      this.moveShip(dt);
      this.fire(dt);
      this.updateShots(dt);
      this.updateEnemies(dt);
      this.updateEnemyShots(dt);
      this.collide();
      this.spawnWaves();
      this.checkCheckpoints();
      this.checkWin();
      return;
    }

    if (this.state === "dead") {
      this.updateShots(dt);
      this.updateEnemies(dt);
      this.updateEnemyShots(dt);
      this.stateTimer -= delta;
      if (this.stateTimer <= 0) this.afterDeath();
      return;
    }

    if (this.state === "win") {
      this.stateTimer -= delta;
      if (this.stateTimer <= 0) Flow.finishLevel(this.scene, this.run.level);
      return;
    }

    if (Input.Keyboard.JustDown(this.keyFire)) {
      Flow.endGame(this.scene);
    }
  }

  /** Drop every live shot and enemy (and, on a full reset, the explosions). */
  private clearEntities(withExplosions = false) {
    for (const s of this.shots) s.sprite.destroy();
    for (const e of this.enemies) e.sprite.destroy();
    for (const b of this.enemyShots) b.sprite.destroy();
    this.shots = [];
    this.enemies = [];
    this.enemyShots = [];
    if (!withExplosions) return;
    for (const x of this.explosions) x.sprite.destroy();
    this.explosions = [];
  }

  private resetLevel() {
    this.clearEntities(true);

    const level = getLevel(this.run.level);
    // DOS `initlevel`: the `.DSC` bonus score/money is added at level start,
    // and the end-of-level money conversion measures the delta since before it.
    this.levelStartScore = this.run.score;
    this.run.score += level.bonusScore;
    this.run.money += level.bonusMoney;
    this.score = this.run.score;
    this.lives = this.run.lives;
    this.resultRecorded = false;
    this.levelTime = 0;
    this.spawnIndex = 0;
    getSfx().setLevel(this.run.level);
    this.queue = level.build();
    this.checkpoints = level.checkpoints;
    this.nextCheckpoint = 0;
    this.flashTimer = 0;
    this.flashText.setAlpha(0);
    this.bg.setFillStyle(level.bg);
    this.starsFar.setTint(level.starTint);
    this.starsNear.setTint(level.starTint);
    this.drawHud();
    this.bossesLeft = this.countBosses(this.queue, 0);
    this.fieldOn = true;
    this.state = "shield";
    this.stateTimer = SHIELD_MS;
    this.loadout = this.run.loadout.map((p) => ({
      weapon: weaponById(p.defId),
      dx: p.dx,
      dy: p.dy,
    }));
    this.cooldowns = this.loadout.map(() => 0);
    this.buildMounts();
    this.ship
      .setPosition(PLAY.w / 2, BOTTOM - 70)
      .setVisible(true)
      .setAlpha(1);
    this.message.setText("");
    this.hint.setVisible(true);
    this.updateHud();
  }

  private moveShip(dt: number) {
    const fx = (this.joystick?.forceX ?? 0) + (this.edgeStick?.forceX ?? 0);
    const fy = (this.joystick?.forceY ?? 0) + (this.edgeStick?.forceY ?? 0);
    const stick = stickFromForce(fx, fy, JOY_RADIUS);
    const { x: vx, y: vy } = moveVector(
      {
        left: this.cursors.left.isDown || this.keyA.isDown,
        right: this.cursors.right.isDown || this.keyD.isDown,
        up: this.cursors.up.isDown || this.keyW.isDown,
        down: this.cursors.down.isDown || this.keyS.isDown,
      },
      stick,
    );
    const speed = shipSpeed(this.run);
    const hw = this.ship.displayWidth / 2;
    const hh = this.ship.displayHeight / 2;
    this.ship.x = clamp(this.ship.x + vx * speed * dt, hw, PLAY.w - hw);
    this.ship.y = clamp(this.ship.y + vy * speed * dt, TOP + hh, BOTTOM - hh);
    this.updateMounts();
  }

  private fire(dt: number) {
    if (!this.autoFire && !this.keyFire.isDown && !this.touch) return;
    for (const [i, { weapon, dx, dy }] of this.loadout.entries()) {
      const left = (this.cooldowns[i] ?? 0) - dt;
      if (left > 0) {
        this.cooldowns[i] = left;
        continue;
      }
      this.cooldowns[i] = weapon.period / 1000;
      getSfx().laser();
      for (const em of weapon.emitters) {
        this.shots.push(
          this.makeShot(this.ship.x + dx, this.ship.y + dy, weapon.tint, em),
        );
      }
    }
  }

  private makeShot(x: number, y: number, tint: number, em: Emitter): Shot {
    // DOS projectile art (`shot-<n>`); fall back to a tinted cork if a sheet
    // is missing (the procedural fallback Boot also uses for mount icons).
    const texture = this.textures.exists(em.sprite) ? em.sprite : "cork";
    const sprite = this.add.sprite(x + em.ox, y + em.oy, texture).setDepth(5);
    if (this.anims.exists(texture)) sprite.play(texture);
    else if (texture === "cork") sprite.setTint(tint);
    return {
      sprite,
      vx: em.vx,
      vy: em.vy,
      power: em.power,
      kind: em.kind,
      age: 0,
      life: em.kind === "straight" ? 0 : (em.life ?? SPECIAL_LIFE),
      tint,
      release: em.release
        ? { after: em.release.after, shots: em.release.shots }
        : undefined,
    };
  }

  private releaseShots(parent: Shot) {
    const rel = parent.release;
    if (!rel) return;
    parent.release = undefined;
    for (const em of rel.shots) {
      this.shots.push(
        this.makeShot(parent.sprite.x, parent.sprite.y, parent.tint, em),
      );
    }
  }

  private updateShots(dt: number) {
    for (const s of this.shots) {
      s.age += dt;
      if (s.release && s.age >= s.release.after) this.releaseShots(s);
      if (s.kind === "homing") this.steerHoming(s, dt);
      s.sprite.x += s.vx * dt;
      s.sprite.y += s.vy * dt;
      if (s.kind === "reflect") this.bounce(s);
    }
    this.shots = this.shots.filter((s) => {
      const expired = s.kind !== "straight" && s.age > s.life;
      if (isOffscreen(s.sprite) || expired) {
        s.sprite.destroy();
        return false;
      }
      return true;
    });
  }

  private steerHoming(s: Shot, dt: number) {
    const target = this.nearestEnemy(s.sprite.x, s.sprite.y);
    if (!target) return;
    const speed = Math.hypot(s.vx, s.vy) || 1;
    const dx = target.sprite.x - s.sprite.x;
    const dy = target.sprite.y - s.sprite.y;
    const d = Math.hypot(dx, dy) || 1;
    const blend = Math.min(1, HOMING_TURN * dt);
    s.vx += ((dx / d) * speed - s.vx) * blend;
    s.vy += ((dy / d) * speed - s.vy) * blend;
  }

  private bounce(s: Shot) {
    const hw = s.sprite.displayWidth / 2;
    const hh = s.sprite.displayHeight / 2;
    if (s.sprite.x < hw) {
      s.sprite.x = hw;
      s.vx = Math.abs(s.vx);
    }
    if (s.sprite.x > PLAY.w - hw) {
      s.sprite.x = PLAY.w - hw;
      s.vx = -Math.abs(s.vx);
    }
    if (s.sprite.y < TOP + hh) {
      s.sprite.y = TOP + hh;
      s.vy = Math.abs(s.vy);
    }
    if (s.sprite.y > BOTTOM - hh) {
      s.sprite.y = BOTTOM - hh;
      s.vy = -Math.abs(s.vy);
    }
  }

  private nearestEnemy(x: number, y: number): Enemy | null {
    let best: Enemy | null = null;
    let bestDist = Number.POSITIVE_INFINITY;
    for (const e of this.enemies) {
      const d = (e.sprite.x - x) ** 2 + (e.sprite.y - y) ** 2;
      if (d < bestDist) {
        bestDist = d;
        best = e;
      }
    }
    return best;
  }

  private updateEnemies(dt: number) {
    const target = { x: this.ship.x, y: this.ship.y };
    // DOS foe speed comes from the path alone; only the web difficulty option
    // scales it (normal = 1, i.e. exact DOS).
    const scale = this.diff.foeSpeed;
    const count = this.enemies.length;
    for (let i = 0; i < count; i++) {
      const e = this.enemies[i];
      if (!e) continue;
      e.runner.update(dt * scale, target);
      e.sprite.setPosition(e.runner.pos.x, e.runner.pos.y);
      for (const ev of e.runner.events) {
        if (ev.t === "spawn") {
          this.spawnEnemy(ev.kind, e.sprite.x, e.sprite.y, false);
        } else if (ev.t === "release") {
          // DOS `FOERELEASEFOE` chains (a released minion may release its own).
          // Cap concurrent foes like DOS `MAXFOES` so a looping foe cannot
          // spawn without bound.
          if (this.state === "play" && this.enemies.length < MAX_FOES) {
            this.spawnEnemy(
              ev.kind,
              e.sprite.x + ev.x,
              e.sprite.y + ev.y,
              false,
            );
          }
        } else if (ev.t === "shot") {
          if (this.state === "play") {
            this.spawnEnemyShot(e.sprite.x, e.sprite.y, ev.speed);
          }
        } else {
          const texture = ev.texture;
          e.sprite.setTexture(texture);
          if (this.anims.exists(texture)) e.sprite.play(texture);
        }
      }
      e.runner.events.length = 0;
      if (e.hitFlash > 0) {
        e.hitFlash -= dt;
        if (e.hitFlash <= 0) e.sprite.clearTint();
      }
    }
    this.enemies = this.enemies.filter((e) => {
      const role = FOES[e.kind].role;
      // DOS destroys a foe when its path hits END. A boss that reaches END
      // without being killed still counts as defeated so `checkWin` can fire.
      if (e.runner.done) {
        e.sprite.destroy();
        if (e.scheduled && role === "boss") {
          this.bossesLeft = Math.max(0, this.bossesLeft - 1);
        }
        return false;
      }
      const p = e.runner.pos;
      // Match the spawn envelope asserted in levels.ts so foes that start
      // off-screen (e.g. level 2 x=-186) are not culled before entering.
      const gone =
        p.y > BOTTOM + 120 ||
        p.y < TOP - 400 ||
        p.x < -PLAY.w ||
        p.x > PLAY.w * 2;
      if (gone && role !== "boss") {
        e.sprite.destroy();
        return false;
      }
      return true;
    });
  }

  private collide() {
    const deadShots = new Set<Shot>();
    const deadEnemies = new Set<Enemy>();
    const deadEnemyShots = new Set<EnemyShot>();
    for (const shot of this.shots) {
      if (deadShots.has(shot)) continue;
      for (const b of this.enemyShots) {
        if (deadEnemyShots.has(b) || !overlap(shot.sprite, b.sprite)) continue;
        deadShots.add(shot);
        deadEnemyShots.add(b);
        break;
      }
      if (deadShots.has(shot)) continue;
      for (const e of this.enemies) {
        if (deadEnemies.has(e) || !overlap(shot.sprite, e.sprite)) continue;
        const spec = FOES[e.kind];
        if (spec.transparent) continue;
        if (spec.invincible) {
          // DOS `foehit`: an invincible foe kills the shot but is unharmed.
          deadShots.add(shot);
          break;
        }
        // DOS `foehit`: `shot.power -= foe.shield; foe.shield -= shot.power`.
        // A shot with power left over pierces and can hit further foes.
        const dmg = this.run.godMode ? 1e9 : shot.power;
        shot.power -= e.shield;
        e.shield -= dmg;
        if (e.shield <= 0) {
          deadEnemies.add(e);
          this.killEnemy(e);
        } else {
          e.hitFlash = 0.08;
          e.sprite.setTint(0xffffff).setTintMode(TintModes.FILL);
        }
        if (shot.power <= 0) {
          deadShots.add(shot);
          break;
        }
      }
    }
    if (this.state === "play") {
      for (const e of this.enemies) {
        if (!deadEnemies.has(e) && overlap(this.ship, e.sprite)) {
          this.playerHit();
          break;
        }
      }
      if (this.state === "play") {
        for (const b of this.enemyShots) {
          if (deadEnemyShots.has(b) || !overlap(this.ship, b.sprite)) continue;
          deadEnemyShots.add(b);
          this.playerHit();
          break;
        }
      }
    }
    for (const s of deadShots) s.sprite.destroy();
    for (const b of deadEnemyShots) b.sprite.destroy();
    this.shots = this.shots.filter((s) => !deadShots.has(s));
    this.enemyShots = this.enemyShots.filter((b) => !deadEnemyShots.has(b));
    this.enemies = this.enemies.filter((e) => !deadEnemies.has(e));
  }

  private killEnemy(e: Enemy) {
    this.score += e.score;
    this.spawnExplosion(e.sprite.x, e.sprite.y);
    const boss = e.scheduled && FOES[e.kind].role === "boss";
    if (boss) getSfx().bossExplosion();
    else getSfx().explosion();
    e.sprite.destroy();
    if (boss) {
      this.bossesLeft = Math.max(0, this.bossesLeft - 1);
      this.cameras.main.shake(400, 0.012);
    }
    this.updateHud();
  }

  private playerHit() {
    if (this.run.godMode) return;
    this.spawnExplosion(this.ship.x, this.ship.y);
    getSfx().hit();
    this.cameras.main.shake(220, 0.008);
    this.lives -= 1;
    this.ship.setVisible(false);
    this.updateMounts();
    this.state = "dead";
    this.stateTimer = LOSE_MS;
    this.updateHud();
  }

  private afterDeath() {
    if (this.lives <= 0) {
      this.state = "gameover";
      this.message.setText(
        this.touch ? "GAME OVER\nTAP TO CONTINUE" : "GAME OVER\nPRESS SPACE",
      );
      getSfx().gameOver();
      this.run.score = this.score;
      this.run.lives = 0;
      this.saveResult(false);
      return;
    }
    this.rewindToCheckpoint();
    this.ship
      .setPosition(PLAY.w / 2, BOTTOM - 70)
      .setVisible(true)
      .setAlpha(1);
    this.updateMounts();
    this.state = "shield";
    this.stateTimer = SHIELD_MS;
  }

  private checkCheckpoints() {
    if (this.nextCheckpoint >= this.checkpoints.length) return;
    const next = this.checkpoints[this.nextCheckpoint];
    if (next === undefined || this.levelTime < next) return;
    this.nextCheckpoint++;
    this.flashText.setText("CHECKPOINT").setAlpha(1);
    this.flashTimer = 1000;
    getSfx().checkpoint();
  }

  private rewindToCheckpoint() {
    if (this.checkpoints.length === 0) return;
    const t = this.checkpoints[this.nextCheckpoint - 1] ?? 0;
    // Every checkpoint sits before the first boss, so any live boss has a
    // spawn time > t and will be re-spawned; count future bosses only.
    const future = this.countBosses(this.queue, t);
    this.levelTime = t;
    const idx = this.queue.findIndex((s) => s.at > t);
    this.spawnIndex = idx === -1 ? this.queue.length : idx;
    this.clearEntities();
    this.bossesLeft = future;
    this.fieldOn = true;
  }

  private countBosses(
    queue: RosterSpawn[],
    from: number,
    inclusive = false,
  ): number {
    return queue.filter(
      (s) =>
        !s.cmd &&
        FOES[s.kind].role === "boss" &&
        (inclusive ? s.at >= from : s.at > from),
    ).length;
  }

  private jumpToNextCheckpoint() {
    if (this.state !== "play") return;
    const boss = this.queue.find((s) => !s.cmd && FOES[s.kind].role === "boss");
    const t = this.checkpoints[this.nextCheckpoint] ?? boss?.at;
    if (t === undefined || t <= this.levelTime) return;
    this.levelTime = t;
    const idx = this.queue.findIndex((s) => s.at >= t);
    this.spawnIndex = idx === -1 ? this.queue.length : idx;
    this.clearEntities();
    this.bossesLeft = this.countBosses(this.queue, t, true);
    this.fieldOn = true;
  }

  private spawnWaves() {
    let s = this.queue[this.spawnIndex];
    while (s && s.at <= this.levelTime) {
      this.spawnIndex++;
      if (s.cmd === "fieldOn") {
        this.fieldOn = true;
      } else if (s.cmd === "fieldOff") {
        this.fieldOn = false;
      } else if (s.cmd === "mark") {
        // ponytail: attack-table marker; the flat schedule needs no bookkeeping.
      } else {
        // DOS status bar sat at the bottom, so DOS y=0 is the play-area
        // top; shift spawns below the web HUD or top-hovering foes hide.
        this.spawnEnemy(s.kind, s.x, s.y + TOP);
      }
      s = this.queue[this.spawnIndex];
    }
  }

  private spawnEnemy(kind: FoeKind, x: number, y: number, scheduled = true) {
    const spec = FOES[kind];
    const runner = new PathRunner(pathFor(kind), { x, y });
    const texture = spec.texture;
    const sprite = this.add
      .sprite(x, y, texture)
      .setDepth(spec.role === "boss" ? 2 : 1);
    if (this.anims.exists(texture)) sprite.play(texture);
    const enemy: Enemy = {
      sprite,
      kind,
      shield: spec.shield,
      score: spec.score,
      runner,
      hitFlash: 0,
      scheduled,
    };
    this.enemies.push(enemy);
  }

  // DOS line mode: the shot heads for the ship's position at release, moving
  // `speed` Bresenham steps per 20 Hz tick (speed*60 web px/s on the dominant
  // axis) so it covers max(|dx|,|dy|) in max/speed ticks.
  private spawnEnemyShot(x: number, y: number, speed: number) {
    const dx = this.ship.x - x;
    const dy = this.ship.y - y;
    const d = Math.max(Math.abs(dx), Math.abs(dy)) || 1;
    const v = speed * 60;
    const sprite = this.add.image(x, y, "pellet").setDepth(4);
    getSfx().enemyShot();
    this.enemyShots.push({
      sprite,
      vx: (dx / d) * v,
      vy: (dy / d) * v,
    });
  }

  private updateEnemyShots(dt: number) {
    for (const b of this.enemyShots) {
      b.sprite.x += b.vx * dt;
      b.sprite.y += b.vy * dt;
    }
    this.enemyShots = this.enemyShots.filter((b) => {
      if (isOffscreen(b.sprite)) {
        b.sprite.destroy();
        return false;
      }
      return true;
    });
  }

  private checkWin() {
    // DOS wins as soon as every end-level boss is gone (`nbigboss == 0`);
    // it does not wait for surviving minions/chaff. This also means an
    // invincible looping foe can never soft-lock the level.
    if (this.bossesLeft <= 0) {
      this.state = "win";
      this.stateTimer = WIN_MS;
      getSfx().win();
      this.run.score = this.score;
      this.run.lives = this.lives;
      if (this.run.level >= LEVELS.length) {
        this.message.setText("GAME COMPLETE\nYOU WIN!");
        this.saveResult(true);
      } else {
        // DOS `weaponmanager` converts the level's score delta (bonus + kills)
        // into money before the shop, and is skipped on the final level.
        this.run.money += moneyForLevel(this.score - this.levelStartScore);
        this.message.setText("LEVEL CLEARED");
      }
    }
  }

  abortGame() {
    this.saveResult(false);
    endRun();
  }

  private saveResult(won: boolean) {
    if (this.resultRecorded) return;
    this.resultRecorded = true;
    recordGameResult({
      score: this.score,
      level: this.run.level,
      won,
      at: Date.now(),
    });
  }

  private spawnExplosion(x: number, y: number) {
    const key = "explosion";
    const sprite = this.add.sprite(x, y, key).setDepth(20).play(key);
    this.explosions.push({ sprite, age: 0, life: 0.5 });
  }

  private updateExplosions(dt: number) {
    this.explosions = this.explosions.filter((ex) => {
      ex.age += dt;
      const p = ex.age / ex.life;
      if (p >= 1) {
        ex.sprite.destroy();
        return false;
      }
      ex.sprite.setAlpha(1 - p);
      return true;
    });
  }

  private updateHud() {
    this.scoreText.setText(`LITERS ${this.score}`);
    this.livesText.setText(`LIVES ${this.lives}`);
    this.levelText.setText(
      `LEVEL ${this.run.level}  ${getLevel(this.run.level).name}`,
    );
  }

  // DOS draws every bought arm as an object next to the main bottle and moves
  // it with the ship. The starter (lager) is the ship itself, so skip it.
  private buildMounts() {
    for (const m of this.mounts) m.sprite.destroy();
    this.mounts = this.loadout
      .filter((m) => !m.weapon.starter)
      .map((m) => {
        const key = `wpn-${m.weapon.id}`;
        const sprite = this.add
          .sprite(this.ship.x + m.dx, this.ship.y + m.dy, key)
          .setDepth(11);
        if (this.anims.exists(key)) sprite.play(key);
        return { sprite, dx: m.dx, dy: m.dy };
      });
  }

  private updateMounts() {
    for (const m of this.mounts) {
      m.sprite
        .setPosition(this.ship.x + m.dx, this.ship.y + m.dy)
        .setVisible(this.ship.visible)
        .setAlpha(this.ship.alpha);
    }
  }

  private drawHud() {
    this.hud.clear();
    this.hud.fillStyle(0x0a0a12, 0.9);
    this.hud.fillRect(0, 0, PLAY.w, HUD_H);
  }
}

/** True once a sprite has left the play area by the shot cull margin. */
function isOffscreen(s: { x: number; y: number }): boolean {
  return s.y < TOP - 30 || s.y > BOTTOM + 30 || s.x < -30 || s.x > PLAY.w + 30;
}

function overlap(
  a: GameObjects.Image | GameObjects.Sprite,
  b: GameObjects.Image | GameObjects.Sprite,
): boolean {
  const ax = a.displayWidth / 2;
  const ay = a.displayHeight / 2;
  const bx = b.displayWidth / 2;
  const by = b.displayHeight / 2;
  return Math.abs(a.x - b.x) < ax + bx && Math.abs(a.y - b.y) < ay + by;
}
