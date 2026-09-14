import { type GameObjects, Input, Scale, Scene, type Types } from "phaser";
import { getMusic, getSamples, getSfx } from "../audio";
import { bgKey, skinKey } from "../data/skins";
import { readGlobalGames, reportGameStart } from "../data/stats";
import {
  clampScroll,
  DIFFICULTY,
  DIFFICULTY_ORDER,
  GRAPHICS,
  GRAPHICS_ORDER,
  type GraphicsMode,
  loadResults,
  loadSettings,
  saveSettings,
  TOP_N,
  topScores,
} from "../data/store";
import * as Flow from "../flow";
import { resolveTouchControls } from "../input/controls";
import { toggleFullscreen } from "../input/fullscreen";
import { TouchPad } from "../input/touchpad";
import type { Game } from "./Game";

type Mode = "menu" | "options" | "scores" | "pause";

interface Item {
  label: () => string;
  activate: () => void;
  cycle?: (dir: number) => void;
  pointerUp?: boolean;
}

const GOLD = "#ffd54a";
const DIM = "#8b90a6";
const WHITE = "#e8eaf2";

const HISTORY_ROWS = 15;

function fmtDate(at: number): string {
  const d = new Date(at);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function fmtScore(score: number): string {
  return String(score).padStart(7, " ");
}

export class Menu extends Scene {
  private starsFar!: GameObjects.TileSprite;
  private starsNear!: GameObjects.TileSprite;
  private graphics: GraphicsMode = "modern";

  private cursors!: Types.Input.Keyboard.CursorKeys;
  private keyW!: Input.Keyboard.Key;
  private keyS!: Input.Keyboard.Key;
  private keyA!: Input.Keyboard.Key;
  private keyD!: Input.Keyboard.Key;
  private keyEnter!: Input.Keyboard.Key;
  private keySpace!: Input.Keyboard.Key;
  private keyEsc!: Input.Keyboard.Key;

  private mode: Mode = "menu";
  private pauseMode = false;
  private select = 0;
  private items: { text: GameObjects.Text; def: Item }[] = [];
  private dynamic: GameObjects.GameObject[] = [];
  private scoresTab: "top" | "history" = "top";
  private historyScroll = 0;
  private scoreTabs: { text: GameObjects.Text; tab: "top" | "history" }[] = [];
  private scoreList: GameObjects.Text | null = null;
  private scoreFoot: GameObjects.Text | null = null;
  private globalGames: number | null = null;
  private statsText: GameObjects.Text | null = null;
  private statsRequest = 0;
  private touch = false;
  private pad: TouchPad | null = null;

  constructor() {
    super("Menu");
  }

  init(data?: { pause?: boolean }) {
    this.pauseMode = data?.pause === true;
  }

  create() {
    this.graphics = loadSettings().graphics;
    const modern = this.graphics === "modern";
    let overlayAlpha = 1;
    if (this.pauseMode) overlayAlpha = 0.72;
    else if (modern) overlayAlpha = 0;
    this.add
      .rectangle(0, 0, 960, 720, 0x05060d, overlayAlpha)
      .setOrigin(0)
      .setDepth(-20);
    this.add
      .image(0, 0, bgKey(1))
      .setOrigin(0)
      .setDepth(-21)
      .setVisible(modern && !this.pauseMode);
    this.starsFar = this.add
      .tileSprite(480, 360, 960, 720, skinKey("stars-far", this.graphics))
      .setDepth(-10)
      .setVisible(!this.pauseMode);
    this.starsNear = this.add
      .tileSprite(480, 360, 960, 720, skinKey("stars-near", this.graphics))
      .setDepth(-9)
      .setAlpha(0.7)
      .setVisible(!this.pauseMode);

    const kb = this.input.keyboard;
    if (!kb) throw new Error("Keyboard input unavailable");
    this.cursors = kb.createCursorKeys();
    this.keyW = kb.addKey(Input.Keyboard.KeyCodes.W);
    this.keyS = kb.addKey(Input.Keyboard.KeyCodes.S);
    this.keyA = kb.addKey(Input.Keyboard.KeyCodes.A);
    this.keyD = kb.addKey(Input.Keyboard.KeyCodes.D);
    this.keyEnter = kb.addKey(Input.Keyboard.KeyCodes.ENTER);
    this.keySpace = kb.addKey(Input.Keyboard.KeyCodes.SPACE);
    this.keyEsc = kb.addKey(Input.Keyboard.KeyCodes.ESC);
    this.touch = resolveTouchControls(
      loadSettings().controls,
      this.sys.game.device.input.touch,
    );
    if (this.touch) this.pad = new TouchPad(this);

    const syncFs = () => this.refresh();
    this.scale.on(Scale.Events.ENTER_FULLSCREEN, syncFs);
    this.scale.on(Scale.Events.LEAVE_FULLSCREEN, syncFs);
    this.events.once("shutdown", () => {
      this.scale.off(Scale.Events.ENTER_FULLSCREEN, syncFs);
      this.scale.off(Scale.Events.LEAVE_FULLSCREEN, syncFs);
    });

    this.mode = this.pauseMode ? "pause" : "menu";
    this.select = 0;
    this.rebuild();
    if (!this.pauseMode) {
      getMusic().setScene("menu");
      getSamples().play("menu");
    }
  }

  update(_time: number, delta: number) {
    const dt = Math.min(delta / 1000, 0.05);
    this.starsFar.tilePositionY -= 40 * dt;
    this.starsNear.tilePositionY -= 110 * dt;

    const pad = this.pad?.poll();
    const confirm =
      Input.Keyboard.JustDown(this.keyEnter) ||
      Input.Keyboard.JustDown(this.keySpace) ||
      pad?.confirm === true;
    const back = Input.Keyboard.JustDown(this.keyEsc) || pad?.back === true;
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

    if (this.mode === "scores") {
      this.updateScores(down, up, left, right, confirm, back);
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
    const current = this.items[this.select].def;
    if (current.cycle) {
      if (left) current.cycle(-1);
      if (right) current.cycle(1);
      if (left || right) getSfx().uiMove();
    }
    if (back && this.mode === "options") {
      getSfx().uiConfirm();
      this.goto("menu");
      return;
    }
    if (back && this.mode === "pause") {
      getSfx().uiConfirm();
      this.resumeGame();
      return;
    }
    if (confirm) {
      getSfx().uiConfirm();
      current.activate();
    }
  }

  private rebuild() {
    for (const o of this.dynamic) o.destroy();
    this.dynamic = [];
    this.items = [];
    this.scoreTabs = [];
    this.scoreList = null;
    this.scoreFoot = null;
    this.statsText = null;

    this.addStatic(480, 150, "THE LAST EICHHOF", 56, GOLD).setOrigin(0.5);

    const fullscreenEntry: Item | null = this.scale.fullscreen.available
      ? {
          label: () =>
            this.scale.isFullscreen ? "EXIT FULLSCREEN" : "FULLSCREEN",
          activate: () => toggleFullscreen(this),
          pointerUp: true,
        }
      : null;

    if (this.mode === "menu") {
      this.addStatic(480, 210, "Rewrite by Torben", 22, DIM).setOrigin(0.5);
      const defs: Item[] = [
        {
          label: () => "START GAME",
          activate: () => {
            reportGameStart();
            Flow.startNewGame(this.scene);
          },
        },
        {
          label: () =>
            `DIFFICULTY: ${DIFFICULTY[loadSettings().difficulty].label}`,
          activate: () => this.cycleDifficulty(1),
          cycle: (dir) => this.cycleDifficulty(dir),
        },
        { label: () => "TOP 10", activate: () => this.goto("scores") },
        { label: () => "OPTIONS", activate: () => this.goto("options") },
      ];
      if (fullscreenEntry) defs.splice(2, 0, fullscreenEntry);
      this.addItems(defs, 340);
      this.statsText = this.addStatic(
        480,
        610,
        this.globalGamesLabel(),
        20,
        DIM,
      ).setOrigin(0.5);
      this.addLinkRow(480, 652);
      this.loadGlobalGames();
    } else if (this.mode === "options") {
      this.addStatic(480, 220, "OPTIONS", 34, WHITE).setOrigin(0.5);
      const defs: Item[] = [
        {
          label: () => `GRAPHICS: ${GRAPHICS[loadSettings().graphics].label}`,
          activate: () => this.cycleGraphics(1),
          cycle: (dir) => this.cycleGraphics(dir),
        },
        {
          label: () => `AUTO-FIRE: ${loadSettings().autoFire ? "ON" : "OFF"}`,
          activate: () => this.toggleAutoFire(),
          cycle: () => this.toggleAutoFire(),
        },
        {
          label: () => "BACK",
          activate: () => this.goto("menu"),
        },
      ];
      this.addItems(defs, 320);
    } else if (this.mode === "pause") {
      this.addStatic(480, 220, "PAUSED", 34, WHITE).setOrigin(0.5);
      this.addItems(
        fullscreenEntry
          ? [
              { label: () => "RESUME", activate: () => this.resumeGame() },
              {
                label: () => "QUIT TO MENU",
                activate: () => this.quitToMenu(),
              },
              fullscreenEntry,
            ]
          : [
              { label: () => "RESUME", activate: () => this.resumeGame() },
              {
                label: () => "QUIT TO MENU",
                activate: () => this.quitToMenu(),
              },
            ],
        340,
      );
    } else {
      this.buildScores();
    }

    this.refresh();
  }

  private addItems(defs: Item[], startY: number) {
    defs.forEach((def, i) => {
      const text = this.addStatic(480, startY + i * 52, "", 30, DIM);
      text.setOrigin(0.5).setInteractive({ useHandCursor: true });
      text.on(def.pointerUp ? "pointerup" : "pointerdown", () =>
        this.activateItem(i),
      );
      this.items.push({ text, def });
    });
    this.select = Math.min(this.select, Math.max(0, defs.length - 1));
  }

  private activateItem(i: number) {
    const item = this.items[i];
    if (!item) return;
    this.select = i;
    getSfx().uiConfirm();
    this.refresh();
    item.def.activate();
  }

  private buildScores() {
    const tabs: ("top" | "history")[] = ["top", "history"];
    tabs.forEach((tab, i) => {
      const text = this.addStatic(
        400 + i * 160,
        200,
        tab === "top" ? "TOP 10" : "HISTORY",
        30,
        DIM,
      ).setOrigin(0.5);
      text.setInteractive({ useHandCursor: true });
      text.on("pointerdown", () => this.selectTab(tab));
      this.scoreTabs.push({ text, tab });
    });
    this.scoreList = this.addStatic(480, 250, "", 22, WHITE).setOrigin(0.5, 0);
    this.scoreFoot = this.addStatic(480, 660, "", 20, DIM).setOrigin(0.5);
    this.scoreFoot.setInteractive({ useHandCursor: true });
    this.scoreFoot.on("pointerdown", () => {
      getSfx().uiConfirm();
      this.goto("menu");
    });
    this.renderScores();
  }

  private selectTab(tab: "top" | "history") {
    if (this.scoresTab === tab) return;
    this.scoresTab = tab;
    this.historyScroll = 0;
    getSfx().uiMove();
    this.renderScores();
  }

  private renderScores() {
    for (const { text, tab } of this.scoreTabs) {
      const active = tab === this.scoresTab;
      const label = tab === "top" ? "TOP 10" : "HISTORY";
      text.setText(active ? `> ${label} <` : label);
      text.setColor(active ? GOLD : DIM);
    }

    const results = loadResults();
    const empty = "NO GAMES YET — PLAY ONE!";

    if (this.scoresTab === "top") {
      const header = " #   LITERS  LV  RESULT  DATE";
      const body = topScores(results, TOP_N)
        .map(
          (r, i) =>
            `${String(i + 1).padStart(2, " ")}  ${fmtScore(r.score)}  ` +
            `${String(r.level).padStart(2, " ")}  ${r.won ? "WON " : "LOST"}  ${fmtDate(r.at)}`,
        )
        .join("\n");
      this.scoreList?.setText(`${header}\n${body || empty}`);
      this.scoreFoot?.setText("ESC / ENTER — BACK");
      return;
    }

    const header = "    LITERS  LV  RESULT  DATE";
    this.historyScroll = clampScroll(
      this.historyScroll,
      results.length,
      HISTORY_ROWS,
    );
    const body = results
      .slice(this.historyScroll, this.historyScroll + HISTORY_ROWS)
      .map(
        (r) =>
          `  ${fmtScore(r.score)}  ${String(r.level).padStart(2, " ")}  ` +
          `${r.won ? "WON " : "LOST"}  ${fmtDate(r.at)}`,
      )
      .join("\n");
    this.scoreList?.setText(`${header}\n${body || empty}`);
    if (results.length > HISTORY_ROWS) {
      const from = this.historyScroll + 1;
      const to = Math.min(results.length, this.historyScroll + HISTORY_ROWS);
      this.scoreFoot?.setText(
        `${from}-${to} / ${results.length}   ▲▼ SCROLL    ESC / ENTER — BACK`,
      );
    } else {
      this.scoreFoot?.setText("ESC / ENTER — BACK");
    }
  }

  private updateScores(
    down: boolean,
    up: boolean,
    left: boolean,
    right: boolean,
    confirm: boolean,
    back: boolean,
  ) {
    if (left || right) {
      this.scoresTab = this.scoresTab === "top" ? "history" : "top";
      this.historyScroll = 0;
      getSfx().uiMove();
      this.renderScores();
      return;
    }
    if (this.scoresTab === "history" && (down || up)) {
      const next = clampScroll(
        this.historyScroll + (down ? 1 : -1),
        loadResults().length,
        HISTORY_ROWS,
      );
      if (next !== this.historyScroll) {
        this.historyScroll = next;
        getSfx().uiMove();
        this.renderScores();
      }
      return;
    }
    if (confirm || back) {
      getSfx().uiConfirm();
      this.goto("menu");
    }
  }

  private cycleDifficulty(dir: number) {
    const settings = loadSettings();
    const idx = DIFFICULTY_ORDER.indexOf(settings.difficulty);
    const next =
      DIFFICULTY_ORDER[
        (idx + dir + DIFFICULTY_ORDER.length) % DIFFICULTY_ORDER.length
      ];
    saveSettings({ ...settings, difficulty: next });
    this.refresh();
  }

  private cycleGraphics(dir: number) {
    const settings = loadSettings();
    const idx = GRAPHICS_ORDER.indexOf(settings.graphics);
    const next =
      GRAPHICS_ORDER[
        (idx + dir + GRAPHICS_ORDER.length) % GRAPHICS_ORDER.length
      ];
    saveSettings({ ...settings, graphics: next });
    this.refresh();
  }

  private toggleAutoFire() {
    const settings = loadSettings();
    saveSettings({ ...settings, autoFire: !settings.autoFire });
    this.refresh();
  }

  private goto(mode: Mode) {
    this.mode = mode;
    this.select = 0;
    if (mode === "scores") {
      this.scoresTab = "top";
      this.historyScroll = 0;
    }
    this.rebuild();
    if (mode === "scores") getMusic().setScene("scores");
    else if (mode === "menu") getMusic().setScene("menu");
  }

  private resumeGame() {
    getSamples().play("close");
    getMusic().setScene("game");
    Flow.resumeGame(this.scene);
  }

  private quitToMenu() {
    getSamples().play("close");
    const game = this.scene.get("Game") as Game;
    Flow.quitToMenu(this.scene, game);
  }

  private refresh() {
    for (const { text, def } of this.items) {
      const selected = text === this.items[this.select]?.text;
      text.setText(def.label()).setColor(selected ? GOLD : DIM);
    }
  }

  private addStatic(
    x: number,
    y: number,
    content: string,
    size: number,
    color: string,
  ): GameObjects.Text {
    const text = this.add
      .text(x, y, content, {
        fontFamily: "monospace",
        fontSize: `${size}px`,
        color,
        align: "left",
      })
      .setDepth(10);
    this.dynamic.push(text);
    return text;
  }

  private globalGamesLabel(): string {
    return `Global Games Played: ${this.globalGames ?? "—"}`;
  }

  private loadGlobalGames() {
    const request = ++this.statsRequest;
    void readGlobalGames().then((count) => {
      if (count === null || request !== this.statsRequest) return;
      this.globalGames = count;
      if (this.statsText?.active)
        this.statsText.setText(this.globalGamesLabel());
    });
  }

  private addLinkRow(x: number, y: number) {
    this.addLinkGroup(x, y, "Original DOS game:", [
      ["Wikipedia", "https://en.wikipedia.org/wiki/The_Last_Eichhof"],
      ["Download", "https://archive.org/download/TheLastEichhof/beer11.zip"],
      [
        "SourceCode",
        "http://ftp.lanet.lv/ftp/mirror/x2ftp/msdos/programming/gamesrc/beersrc.zip",
      ],
    ]);
    this.addLinkGroup(x, y + 28, "This game's", [
      ["Code", "https://github.com/entorb/last-eichhof"],
    ]);
  }

  // One "label: a b c" line where each link is its own selectable item, so
  // only the highlighted link changes color, not the whole line.
  private addLinkGroup(
    x: number,
    y: number,
    prefix: string,
    links: readonly (readonly [string, string])[],
  ) {
    const size = 18;
    const gap = 16;
    const parts: GameObjects.Text[] = [
      this.addStatic(0, y, prefix, size, DIM).setOrigin(0, 0.5),
    ];
    for (const [name, url] of links) {
      const def: Item = {
        label: () => name,
        activate: () => window.open(url, "_blank", "noopener"),
      };
      const text = this.addStatic(0, y, name, size, DIM)
        .setOrigin(0, 0.5)
        .setInteractive({ useHandCursor: true });
      const index = this.items.length;
      text.on("pointerdown", () => this.activateItem(index));
      this.items.push({ text, def });
      parts.push(text);
    }
    const widths = parts.map((p) => p.width);
    const total = widths.reduce((a, b) => a + b, 0) + gap * (parts.length - 1);
    let cx = x - total / 2;
    parts.forEach((part, i) => {
      part.setPosition(cx, y);
      cx += widths[i] + gap;
    });
  }
}
