import { type GameObjects, Geom, Input, Scene, type Types } from "phaser";
import { getMusic, getSamples, getSfx } from "../audio";
import { getLevel, LEVELS } from "../data/levels";
import { at } from "../data/lookup";
import { PLAY } from "../data/playfield";
import { getRun, MAX_SPEEDUPS, type Run, shipSpeed } from "../data/run";
import { loadSettings } from "../data/store";
import {
  canPlace,
  GRID,
  MAX_WEAPONS,
  sellValue,
  snap,
  UPGRADES,
  type Upgrade,
  WEAPONS,
  type Weapon,
  weaponById,
  weaponStats,
} from "../data/weapons";
import * as Flow from "../flow";
import { resolveTouchControls } from "../input/controls";
import { TouchPad } from "../input/touchpad";

const PLACE = { x: PLAY.cx, y: 320, w: 360, h: 240 };
// DOS shop used a 4 px grid and a 4 px margin inside the placement area.
const MARGIN = 12;
const WHITE = "#ffffff";
const DIM = "#7f8ea3";
const GOLD = "#ffd54a";

interface Item {
  label: () => string;
  activate: () => void;
  icon?: string;
  weapon?: Weapon;
}

type Mode = "shop" | "weapons" | "upgrades" | "sell" | "place";

export class Shop extends Scene {
  private run!: Run;
  private mode: Mode = "shop";
  private select = 0;
  private items: { text: GameObjects.Text; def: Item }[] = [];
  private dynamic: GameObjects.GameObject[] = [];
  private moneyText!: GameObjects.Text;
  private infoText!: GameObjects.Text;
  private message!: GameObjects.Text;

  private weaponInfo!: GameObjects.Text;

  private cursors!: Types.Input.Keyboard.CursorKeys;
  private keyW!: Input.Keyboard.Key;
  private keyS!: Input.Keyboard.Key;
  private keyA!: Input.Keyboard.Key;
  private keyD!: Input.Keyboard.Key;
  private keyFire!: Input.Keyboard.Key;
  private keyEnter!: Input.Keyboard.Key;
  private keyEsc!: Input.Keyboard.Key;

  private pending: Weapon | null = null;
  private ghost: GameObjects.Image | null = null;
  private ghostBox: GameObjects.Rectangle | null = null;
  private ghostX = 0;
  private ghostY = 0;
  private touch = false;
  private pad: TouchPad | null = null;

  constructor() {
    super("Shop");
  }

  create() {
    this.run = getRun();
    this.mode = "shop";
    this.select = 0;
    this.pending = null;
    this.ghost = null;
    this.ghostBox = null;

    this.add
      .rectangle(0, 0, PLAY.w, PLAY.h, 0x05060d)
      .setOrigin(0)
      .setDepth(-20);
    this.add
      .text(PLAY.cx, 60, "SHOP", {
        fontFamily: "monospace",
        fontSize: "48px",
        color: WHITE,
      })
      .setOrigin(0.5)
      .setDepth(10);
    this.moneyText = this.add
      .text(PLAY.cx, 120, "", {
        fontFamily: "monospace",
        fontSize: "28px",
        color: GOLD,
      })
      .setOrigin(0.5)
      .setDepth(10);
    this.infoText = this.add
      .text(PLAY.cx, 170, "", {
        fontFamily: "monospace",
        fontSize: "20px",
        color: DIM,
        align: "center",
      })
      .setOrigin(0.5)
      .setDepth(10);
    this.message = this.add
      .text(PLAY.cx, 660, "", {
        fontFamily: "monospace",
        fontSize: "24px",
        color: "#ff8080",
      })
      .setOrigin(0.5)
      .setDepth(10);
    this.weaponInfo = this.add
      .text(720, 340, "", {
        fontFamily: "monospace",
        fontSize: "22px",
        color: GOLD,
        align: "center",
      })
      .setOrigin(0.5)
      .setDepth(10)
      .setVisible(false);

    const kb = this.input.keyboard;
    if (!kb) throw new Error("Keyboard input unavailable");
    this.cursors = kb.createCursorKeys();
    this.keyW = kb.addKey(Input.Keyboard.KeyCodes.W);
    this.keyS = kb.addKey(Input.Keyboard.KeyCodes.S);
    this.keyA = kb.addKey(Input.Keyboard.KeyCodes.A);
    this.keyD = kb.addKey(Input.Keyboard.KeyCodes.D);
    this.keyFire = kb.addKey(Input.Keyboard.KeyCodes.SPACE);
    this.keyEnter = kb.addKey(Input.Keyboard.KeyCodes.ENTER);
    this.keyEsc = kb.addKey(Input.Keyboard.KeyCodes.ESC);
    this.touch = resolveTouchControls(
      loadSettings().controls,
      this.sys.game.device.input.touch,
    );
    if (this.touch) this.pad = new TouchPad(this);

    this.rebuild();
    getMusic().setScene("shop");
    this.updateMusic();
  }

  update() {
    const pad = this.pad?.poll();
    const down =
      Input.Keyboard.JustDown(this.cursors.down) ||
      Input.Keyboard.JustDown(this.keyS) ||
      pad?.down === true;
    const up =
      Input.Keyboard.JustDown(this.cursors.up) ||
      Input.Keyboard.JustDown(this.keyW) ||
      pad?.up === true;
    const left =
      Input.Keyboard.JustDown(this.cursors.left) ||
      Input.Keyboard.JustDown(this.keyA) ||
      pad?.left === true;
    const right =
      Input.Keyboard.JustDown(this.cursors.right) ||
      Input.Keyboard.JustDown(this.keyD) ||
      pad?.right === true;
    const confirm =
      Input.Keyboard.JustDown(this.keyFire) ||
      Input.Keyboard.JustDown(this.keyEnter) ||
      pad?.confirm === true;
    const back = Input.Keyboard.JustDown(this.keyEsc) || pad?.back === true;

    if (this.mode === "place") {
      this.updatePlacement(down, up, left, right, confirm, back);
      return;
    }

    if (this.items.length === 0) return;
    if (down) {
      this.select = (this.select + 1) % this.items.length;
      this.refresh();
      getSfx().uiMove();
    }
    if (up) {
      this.select = (this.select - 1 + this.items.length) % this.items.length;
      this.refresh();
      getSfx().uiMove();
    }
    if (back) {
      getSfx().uiConfirm();
      if (this.mode === "shop") {
        this.continueToNextLevel();
      } else {
        this.goto("shop");
      }
      return;
    }
    if (confirm) {
      getSfx().uiConfirm();
      this.items[this.select]?.def.activate();
    }
  }

  private updatePlacement(
    down: boolean,
    up: boolean,
    left: boolean,
    right: boolean,
    confirm: boolean,
    back: boolean,
  ) {
    if (back) {
      this.pending = null;
      this.message.setText("");
      this.goto("shop");
      return;
    }
    const step = GRID;
    if (left) this.ghostX -= step;
    if (right) this.ghostX += step;
    if (up) this.ghostY -= step;
    if (down) this.ghostY += step;
    if (left || right || up || down) getSfx().uiMove();
    const w = this.pending?.w ?? 24;
    const h = this.pending?.h ?? 36;
    this.ghostX = this.clampGhost(this.ghostX, PLACE.x, PLACE.w, w);
    this.ghostY = this.clampGhost(this.ghostY, PLACE.y, PLACE.h, h);
    if (this.ghost) this.ghost.setPosition(this.ghostX, this.ghostY);
    if (this.ghostBox) this.ghostBox.setPosition(this.ghostX, this.ghostY);
    if (!confirm || !this.pending) return;

    const candidate = {
      defId: this.pending.id,
      dx: snap(this.ghostX - PLACE.x),
      dy: snap(this.ghostY - PLACE.y),
    };
    if (!canPlace(this.run.loadout, candidate)) {
      this.message.setText("OVERLAP");
      getSfx().hit();
      return;
    }
    this.run.money -= this.pending.cost;
    this.run.loadout.push(candidate);
    this.pending = null;
    this.message.setText("");
    getSfx().buy();
    this.goto("shop");
  }

  // DOS shop placement: the weapon stays inside the area with a 4 px margin,
  // snapped to the 4 px grid (both scaled 3x here).
  private clampGhost(
    v: number,
    center: number,
    size: number,
    sprite: number,
  ): number {
    const off = snap(v - center);
    const lo = Math.ceil((size / -2 + MARGIN + sprite / 2) / GRID) * GRID;
    const hi = Math.floor((size / 2 - MARGIN - sprite / 2) / GRID) * GRID;
    return center + Math.max(lo, Math.min(hi, off));
  }

  private rebuild() {
    for (const d of this.dynamic) d.destroy();
    this.dynamic = [];
    this.items = [];
    this.message.setText("");
    this.moneyText.setText(`MONEY ${this.run.money}`);
    const next = getLevel(Math.min(this.run.level + 1, LEVELS.length));
    this.infoText.setText(
      `LEVEL ${this.run.level}   WEAPONS ${this.run.loadout.length}/${MAX_WEAPONS}   SPEED ${shipSpeed(this.run)}\nNEXT: ${next.name}`,
    );

    if (this.mode === "place") {
      this.weaponInfo.setVisible(false);
      this.buildPlacement();
      return;
    }

    let defs: Item[];
    switch (this.mode) {
      case "weapons":
        defs = this.weaponItems();
        break;
      case "upgrades":
        defs = this.upgradeItems();
        break;
      case "sell":
        defs = this.sellItems();
        break;
      default:
        defs = this.shopItems();
        break;
    }
    const compact = this.mode !== "shop";
    const startY = compact ? 210 : 240;
    const step = compact ? 34 : 42;
    this.items = defs.map((def, i) => {
      const y = startY + i * step;
      if (def.icon) {
        const icon = this.add
          .image(206, y + 11, def.icon)
          .setDepth(10)
          .setInteractive({ useHandCursor: true });
        icon.on("pointerdown", () => this.activateItem(i));
        icon.setScale(30 / icon.height);
        this.dynamic.push(icon);
      }
      const text = this.add
        .text(240, y, def.label(), {
          fontFamily: "monospace",
          fontSize: compact ? "22px" : "26px",
          color: DIM,
          align: "left",
        })
        .setDepth(10)
        .setInteractive({ useHandCursor: true });
      text.on("pointerdown", () => this.activateItem(i));
      this.dynamic.push(text);
      return { text, def };
    });
    this.refresh();
  }

  private activateItem(i: number) {
    const item = this.items[i];
    if (!item) return;
    this.select = i;
    getSfx().uiConfirm();
    this.refresh();
    item.def.activate();
  }

  private shopItems(): Item[] {
    return [
      {
        label: () => "CONTINUE",
        activate: () => this.continueToNextLevel(),
        icon: "ui-forward",
      },
      {
        label: () => "BUY WEAPONS",
        activate: () => this.goto("weapons"),
        icon: "ui-buy",
      },
      {
        label: () => "BUY UPGRADES",
        activate: () => this.goto("upgrades"),
        icon: "ui-upgrade",
      },
      {
        label: () => "SELL WEAPON",
        activate: () => this.goto("sell"),
        icon: "ui-sell",
      },
    ];
  }

  private weaponItems(): Item[] {
    const items: Item[] = WEAPONS.filter((w) => !w.starter).map((w) => ({
      label: () => `${w.name.padEnd(16, ".")} ${w.cost}`,
      activate: () => this.startBuy(w),
      icon: `wpn-${w.id}`,
      weapon: w,
    }));
    items.push({
      label: () => "BACK",
      activate: () => this.goto("shop"),
    });
    return items;
  }

  private upgradeItems(): Item[] {
    const items: Item[] = UPGRADES.map((u) => ({
      label: () => `${u.name.padEnd(16, ".")} ${u.cost}`,
      activate: () => this.buyUpgrade(u),
    }));
    items.push({
      label: () => "BACK",
      activate: () => this.goto("shop"),
    });
    return items;
  }

  private sellItems(): Item[] {
    const items: Item[] = this.run.loadout.map((p, i) => {
      const w = weaponById(p.defId);
      return {
        label: () => `${w.name.padEnd(16, ".")} +${sellValue(w.cost)}`,
        activate: () => this.sell(i),
        icon: `wpn-${w.id}`,
        weapon: w,
      };
    });
    items.push({
      label: () => "BACK",
      activate: () => this.goto("shop"),
    });
    return items;
  }

  private buildPlacement() {
    const w = this.pending;
    if (!w) return;
    // DOS starts the ghost at the top-left corner of the placement area.
    this.ghostX = this.clampGhost(
      PLACE.x - PLACE.w / 2 + MARGIN + w.w / 2,
      PLACE.x,
      PLACE.w,
      w.w,
    );
    this.ghostY = this.clampGhost(
      PLACE.y - PLACE.h / 2 + MARGIN + w.h / 2,
      PLACE.y,
      PLACE.h,
      w.h,
    );

    const box = this.add.graphics().setDepth(5);
    box.lineStyle(2, 0x334155);
    box.strokeRect(
      PLACE.x - PLACE.w / 2,
      PLACE.y - PLACE.h / 2,
      PLACE.w,
      PLACE.h,
    );
    box.fillStyle(0x1e293b, 0.4);
    box.fillRect(
      PLACE.x - PLACE.w / 2,
      PLACE.y - PLACE.h / 2,
      PLACE.w,
      PLACE.h,
    );
    this.dynamic.push(box);

    for (const p of this.run.loadout) {
      const placed = weaponById(p.defId);
      const icon = this.add
        .image(PLACE.x + p.dx, PLACE.y + p.dy, `wpn-${placed.id}`)
        .setDepth(6);
      this.dynamic.push(icon);
    }

    this.ghost = this.add
      .image(this.ghostX, this.ghostY, `wpn-${w.id}`)
      .setAlpha(0.6)
      .setDepth(7);
    this.dynamic.push(this.ghost);

    this.ghostBox = this.add
      .rectangle(this.ghostX, this.ghostY, w.w, w.h)
      .setStrokeStyle(2, 0xffffff)
      .setDepth(8);
    this.dynamic.push(this.ghostBox);

    if (this.touch) {
      this.ghost.setInteractive({
        hitArea: new Geom.Rectangle(
          -w.w / 2 - 24,
          -w.h / 2 - 24,
          w.w + 48,
          w.h + 48,
        ),
        hitAreaCallback: Geom.Rectangle.Contains,
        draggable: true,
        useHandCursor: true,
      });
      this.ghost.on(
        "drag",
        (_pointer: Input.Pointer, dragX: number, dragY: number) => {
          this.ghostX = this.clampGhost(dragX, PLACE.x, PLACE.w, w.w);
          this.ghostY = this.clampGhost(dragY, PLACE.y, PLACE.h, w.h);
          this.ghost?.setPosition(this.ghostX, this.ghostY);
          this.ghostBox?.setPosition(this.ghostX, this.ghostY);
        },
      );
    }

    const hint = this.add
      .text(
        PLAY.cx,
        PLACE.y + PLACE.h / 2 + 40,
        this.touch
          ? "DRAG MOVE   OK PLACE   ESC CANCEL"
          : "ARROWS MOVE   SPACE/ENTER PLACE   ESC CANCEL",
        {
          fontFamily: "monospace",
          fontSize: "22px",
          color: DIM,
        },
      )
      .setOrigin(0.5)
      .setDepth(10);
    this.dynamic.push(hint);
  }

  private refresh() {
    this.items.forEach((it, i) => {
      it.text.setColor(i === this.select ? WHITE : DIM);
    });
    const w = this.items[this.select]?.def.weapon;
    if (!w) {
      this.weaponInfo.setVisible(false);
      return;
    }
    const { dir, dmg } = weaponStats(w);
    this.weaponInfo
      .setText(`DIRECTION  ${dir}\nDAMAGE  ${dmg}`)
      .setVisible(true);
  }

  private goto(mode: Mode) {
    this.mode = mode;
    this.select = 0;
    this.rebuild();
    this.updateMusic();
  }

  private updateMusic() {
    const samples = getSamples();
    if (this.mode === "sell") samples.loop("sell");
    else samples.loop("buy");
  }

  private startBuy(w: Weapon) {
    if (this.run.money < w.cost) {
      this.message.setText("NOT ENOUGH MONEY");
      getSfx().hit();
      return;
    }
    if (this.run.loadout.length >= MAX_WEAPONS) {
      this.message.setText("NO PLACE TO PUT");
      getSfx().hit();
      return;
    }
    this.pending = w;
    this.message.setText("");
    this.goto("place");
  }

  private buyUpgrade(u: Upgrade) {
    if (this.run.money < u.cost) {
      this.message.setText("NOT ENOUGH MONEY");
      getSfx().hit();
      return;
    }
    if (u.kind === "speedup") {
      if (this.run.speedUps >= MAX_SPEEDUPS) {
        this.message.setText("ONLY 2 SPEEDUPS");
        getSfx().hit();
        return;
      }
      this.run.speedUps++;
    } else {
      this.run.lives++;
    }
    this.run.money -= u.cost;
    this.message.setText("");
    getSfx().buy();
    this.rebuild();
  }

  private sell(index: number) {
    if (this.run.loadout.length <= 1) {
      this.message.setText("KEEP ONE WEAPON");
      getSfx().hit();
      return;
    }
    const w = weaponById(at(this.run.loadout, index).defId);
    this.run.money += sellValue(w.cost);
    this.run.loadout.splice(index, 1);
    this.select = 0;
    getSfx().sell();
    this.rebuild();
  }

  private continueToNextLevel() {
    Flow.continueToNextLevel(this.scene, this.run);
  }
}
