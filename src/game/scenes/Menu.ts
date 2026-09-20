import { GameObjects, Geom, Input, Scale, Scene, type Types } from "phaser"
import { UI_ICONS } from "../art/uiIcons"
import { getMusic, getSamples, getSfx } from "../audio"
import { at } from "../data/lookup"
import { PLAY } from "../data/playfield"
import { readGlobalGames, reportGameStart } from "../data/stats"
import {
  clampScroll,
  DIFFICULTY,
  DIFFICULTY_ORDER,
  loadResults,
  loadSettings,
  type ResultSort,
  saveSettings,
  sortResults,
} from "../data/store"
import * as Flow from "../flow"
import { resolveTouchControls } from "../input/controls"
import { toggleFullscreen } from "../input/fullscreen"
import { TouchPad } from "../input/touchpad"
import { hasInstallPrompt, promptInstall } from "../pwa"
import type { Game } from "./Game"

type Mode = "menu" | "options" | "scores" | "pause" | "install"

interface Item {
  label: () => string
  activate: () => void
  cycle?: (dir: number) => void
  pointerUp?: boolean
  icon?: string
}

interface Entry {
  text: GameObjects.Text
  def: Item
  icon?: GameObjects.Image
  hit?: GameObjects.Zone
}

interface Layoutable {
  text: GameObjects.Text
  icon?: GameObjects.Image
  hit?: GameObjects.Zone
}

const GOLD = "#ffd54a"
const DIM = "#8b90a6"
const HOVER = "#c9cee0"
const WHITE = "#e8eaf2"

const PANEL_FILL = 0x0b0e1a
const PANEL_BORDER = 0x2a3350
const PANEL_ALPHA = 0.78

const ICON_SIZE = 26
const ICON_GAP = 14

const HISTORY_ROWS = 15
const GAME_TITLE = "The Last Eichhof"
const CONTACT_URL = "https://entorb.net/contact.php?origin=last-eichhof"
const SHARE_LABEL = "SHARE"
const SHARE_COPIED = "LINK COPIED"
const SHARE_REVERT_MS = 1500

function fmtDate(at: number): string {
  const d = new Date(at)
  const p = (n: number) => String(n).padStart(2, "0")
  return `${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function fmtScore(score: number): string {
  return String(score).padStart(7, " ")
}

function sortLabel(sort: ResultSort): string {
  return sort === "points" ? "BY POINTS" : "BY DATE"
}

export class Menu extends Scene {
  private starsFar!: GameObjects.TileSprite
  private starsNear!: GameObjects.TileSprite

  private cursors!: Types.Input.Keyboard.CursorKeys
  private keyW!: Input.Keyboard.Key
  private keyS!: Input.Keyboard.Key
  private keyA!: Input.Keyboard.Key
  private keyD!: Input.Keyboard.Key
  private keyEnter!: Input.Keyboard.Key
  private keySpace!: Input.Keyboard.Key
  private keyEsc!: Input.Keyboard.Key

  private mode: Mode = "menu"
  private pauseMode = false
  private startScores = false
  // Selectable entries grouped into visual rows. Up/down move between rows,
  // left/right between entries of one row (or cycle a value item).
  private rows: Entry[][] = []
  private row = 0
  private col = 0
  private dynamic: GameObjects.GameObject[] = []
  private panel!: GameObjects.Graphics
  private highlight!: GameObjects.Graphics
  private title: GameObjects.Text | null = null
  private hover: Entry | null = null
  private scoresSort: ResultSort = "points"
  private historyScroll = 0
  private scoreTabs: { text: GameObjects.Text; sort: ResultSort }[] = []
  private scoreList: GameObjects.Text | null = null
  private scoreFoot: GameObjects.Text | null = null
  private globalGames: number | null = null
  private statsText: GameObjects.Text | null = null
  private shareText: GameObjects.Text | null = null
  private statsRequest = 0
  private touch = false
  private pad: TouchPad | null = null

  constructor() {
    super("Menu")
  }

  init(data?: { pause?: boolean; scores?: boolean }) {
    this.pauseMode = data?.pause === true
    this.startScores = data?.scores === true
  }

  create() {
    const overlayAlpha = this.pauseMode ? 0.72 : 1
    this.add.rectangle(0, 0, PLAY.w, PLAY.h, 0x05060d, overlayAlpha).setOrigin(0).setDepth(-20)
    this.starsFar = this.add
      .tileSprite(PLAY.cx, PLAY.cy, PLAY.w, PLAY.h, "stars-far")
      .setDepth(-10)
      .setVisible(!this.pauseMode)
    this.starsNear = this.add
      .tileSprite(PLAY.cx, PLAY.cy, PLAY.w, PLAY.h, "stars-near")
      .setDepth(-9)
      .setAlpha(0.7)
      .setVisible(!this.pauseMode)

    const kb = this.input.keyboard
    if (!kb) throw new Error("Keyboard input unavailable")
    this.cursors = kb.createCursorKeys()
    this.keyW = kb.addKey(Input.Keyboard.KeyCodes.W)
    this.keyS = kb.addKey(Input.Keyboard.KeyCodes.S)
    this.keyA = kb.addKey(Input.Keyboard.KeyCodes.A)
    this.keyD = kb.addKey(Input.Keyboard.KeyCodes.D)
    this.keyEnter = kb.addKey(Input.Keyboard.KeyCodes.ENTER)
    this.keySpace = kb.addKey(Input.Keyboard.KeyCodes.SPACE)
    this.keyEsc = kb.addKey(Input.Keyboard.KeyCodes.ESC)
    this.touch = resolveTouchControls(loadSettings().controls, this.sys.game.device.input.touch)
    if (this.touch) this.pad = new TouchPad(this)

    const syncFs = () => this.refresh()
    this.scale.on(Scale.Events.ENTER_FULLSCREEN, syncFs)
    this.scale.on(Scale.Events.LEAVE_FULLSCREEN, syncFs)
    this.events.once("shutdown", () => {
      this.scale.off(Scale.Events.ENTER_FULLSCREEN, syncFs)
      this.scale.off(Scale.Events.LEAVE_FULLSCREEN, syncFs)
    })

    if (this.startScores) this.mode = "scores"
    else this.mode = this.pauseMode ? "pause" : "menu"
    this.row = 0
    this.col = 0
    this.rebuild()
    if (this.startScores) {
      getMusic().setScene("scores")
    } else if (!this.pauseMode) {
      getMusic().setScene("menu")
      getSamples().play("menu")
    }
  }

  update(time: number, delta: number) {
    const dt = Math.min(delta / 1000, 0.05)
    this.starsFar.tilePositionY -= 40 * dt
    this.starsNear.tilePositionY -= 110 * dt
    this.animateTitle(time / 1000)

    const input = this.readInput()
    if (this.mode === "scores") {
      this.updateScores(input.down, input.up, input.left, input.right, input.confirm, input.back)
      return
    }

    if (input.down) this.moveRow(1)
    if (input.up) this.moveRow(-1)
    const current = this.rows[this.row]?.[this.col]?.def
    if (!current) return
    this.handleCycleOrMove(current, input)
    this.handleBack(input)
    if (input.confirm) {
      getSfx().uiConfirm()
      current.activate()
    }
  }

  private readInput() {
    const pad = this.pad?.poll()
    const confirm =
      Input.Keyboard.JustDown(this.keyEnter) ||
      Input.Keyboard.JustDown(this.keySpace) ||
      pad?.confirm === true
    const back = Input.Keyboard.JustDown(this.keyEsc) || pad?.back === true
    const down =
      Input.Keyboard.JustDown(this.cursors.down) ||
      Input.Keyboard.JustDown(this.keyS) ||
      pad?.down === true
    const up =
      Input.Keyboard.JustDown(this.cursors.up) ||
      Input.Keyboard.JustDown(this.keyW) ||
      pad?.up === true
    const left =
      Input.Keyboard.JustDown(this.cursors.left) ||
      Input.Keyboard.JustDown(this.keyA) ||
      pad?.left === true
    const right =
      Input.Keyboard.JustDown(this.cursors.right) ||
      Input.Keyboard.JustDown(this.keyD) ||
      pad?.right === true
    return { confirm, back, down, up, left, right }
  }

  private handleCycleOrMove(current: Item, input: { left: boolean; right: boolean }) {
    if (current.cycle) {
      if (input.left) current.cycle(-1)
      if (input.right) current.cycle(1)
      if (input.left || input.right) getSfx().uiMove()
    } else {
      if (input.left) this.moveCol(-1)
      if (input.right) this.moveCol(1)
    }
  }

  private handleBack(input: { back: boolean }) {
    if (!input.back) return
    if (this.mode === "options" || this.mode === "install") {
      getSfx().uiConfirm()
      this.goto("menu")
      return
    }
    if (this.mode === "pause") {
      getSfx().uiConfirm()
      this.resumeGame()
    }
  }

  private animateTitle(t: number) {
    const title = this.title
    if (!title?.active) return
    title.setScale(1 + 0.015 * Math.sin(t * 1.8))
    title.setShadow(0, 0, "#ff9d2e", 10 + 6 * Math.sin(t * 2.2))
  }

  private moveRow(dir: number) {
    const next = Math.max(0, Math.min(this.rows.length - 1, this.row + dir))
    if (next === this.row) return
    this.row = next
    this.col = Math.min(this.col, at(this.rows, this.row).length - 1)
    getSfx().uiMove()
    this.refresh()
  }

  private moveCol(dir: number) {
    const next = Math.max(0, Math.min(at(this.rows, this.row).length - 1, this.col + dir))
    if (next === this.col) return
    this.col = next
    getSfx().uiMove()
    this.refresh()
  }

  private rebuild() {
    for (const o of this.dynamic) o.destroy()
    this.dynamic = []
    this.rows = []
    this.row = 0
    this.col = 0
    this.hover = null
    this.title = null
    this.scoreTabs = []
    this.scoreList = null
    this.scoreFoot = null
    this.statsText = null
    this.shareText = null

    this.panel = this.add.graphics().setDepth(-5)
    this.dynamic.push(this.panel)
    this.highlight = this.add.graphics().setDepth(9)
    this.dynamic.push(this.highlight)

    this.title = this.addStatic(PLAY.cx, 110, "THE LAST EICHHOF", 58, GOLD)
      .setOrigin(0.5)
      .setShadow(0, 0, "#ff9d2e", 12)

    const fullscreenEntry: Item | null = this.scale.fullscreen.available
      ? {
          label: () => (this.scale.isFullscreen ? "EXIT FULLSCREEN" : "FULLSCREEN"),
          activate: () => toggleFullscreen(this),
          pointerUp: true,
          icon: UI_ICONS.fullscreen,
        }
      : null

    if (this.mode === "menu") {
      this.addStatic(PLAY.cx, 162, "Remake by Torben", 22, DIM).setOrigin(0.5)
      this.addDivider(PLAY.cx, 196, 460)
      const defs: Item[] = [
        {
          label: () => "START GAME",
          activate: () => {
            reportGameStart()
            Flow.startNewGame(this.scene)
          },
          icon: UI_ICONS.play,
        },
        {
          label: () => `DIFFICULTY: ${DIFFICULTY[loadSettings().difficulty].label}`,
          activate: () => this.cycleDifficulty(1),
          cycle: (dir) => this.cycleDifficulty(dir),
          icon: UI_ICONS.difficulty,
        },
        {
          label: () => "SCORES",
          activate: () => this.goto("scores"),
          icon: UI_ICONS.scores,
        },
        {
          label: () => "OPTIONS",
          activate: () => this.goto("options"),
          icon: UI_ICONS.options,
        },
      ]
      if (fullscreenEntry) defs.splice(2, 0, fullscreenEntry)
      this.addItems(defs, 246, 58)
      this.addDivider(PLAY.cx, 528, 460)
      this.addActionRow(PLAY.cx, 562)
      this.statsText = this.addStatic(PLAY.cx, 606, this.globalGamesLabel(), 20, DIM).setOrigin(0.5)
      this.addLinkRow(PLAY.cx, 644)
      this.loadGlobalGames()
    } else if (this.mode === "options") {
      this.addStatic(PLAY.cx, 205, "OPTIONS", 34, WHITE).setOrigin(0.5)
      this.addDivider(PLAY.cx, 240, 360)
      const defs: Item[] = [
        {
          label: () => `AUTO-FIRE: ${loadSettings().autoFire ? "ON" : "OFF"}`,
          activate: () => this.toggleAutoFire(),
          cycle: () => this.toggleAutoFire(),
          icon: UI_ICONS.autofire,
        },
        {
          label: () => `MUSIC: ${loadSettings().music ? "ON" : "OFF"}`,
          activate: () => this.toggleMusic(),
          cycle: () => this.toggleMusic(),
          icon: UI_ICONS.music,
        },
        {
          label: () => "BACK",
          activate: () => this.goto("menu"),
          icon: UI_ICONS.back,
        },
      ]
      this.addItems(defs, 300)
    } else if (this.mode === "install") {
      this.addStatic(PLAY.cx, 205, "INSTALL AS APP", 34, WHITE).setOrigin(0.5)
      this.addDivider(PLAY.cx, 240, 360)
      this.addStatic(PLAY.cx, 300, "Install this game on your device:", 22, DIM).setOrigin(0.5)
      this.addStatic(PLAY.cx, 366, "Android:", 22, GOLD).setOrigin(0.5)
      this.addStatic(PLAY.cx, 402, 'Menu (3 dots) → "Add to Home screen"', 22, WHITE).setOrigin(0.5)
      this.addStatic(PLAY.cx, 466, "iPhone:", 22, GOLD).setOrigin(0.5)
      this.addStatic(PLAY.cx, 502, 'Share icon → "Add to Home Screen"', 22, WHITE).setOrigin(0.5)
      this.addItems(
        [
          {
            label: () => "BACK",
            activate: () => this.goto("menu"),
            icon: UI_ICONS.back,
          },
        ],
        580,
      )
    } else if (this.mode === "pause") {
      this.addStatic(PLAY.cx, 205, "PAUSED", 34, WHITE).setOrigin(0.5)
      this.addDivider(PLAY.cx, 240, 360)
      const defs: Item[] = [
        {
          label: () => "RESUME",
          activate: () => this.resumeGame(),
          icon: UI_ICONS.play,
        },
        {
          label: () => `AUTO-FIRE: ${loadSettings().autoFire ? "ON" : "OFF"}`,
          activate: () => this.toggleAutoFire(),
          cycle: () => this.toggleAutoFire(),
          icon: UI_ICONS.autofire,
        },
        {
          label: () => `MUSIC: ${loadSettings().music ? "ON" : "OFF"}`,
          activate: () => this.toggleMusic(),
          cycle: () => this.toggleMusic(),
          icon: UI_ICONS.music,
        },
        {
          label: () => "END GAME",
          activate: () => this.endGame(),
          icon: UI_ICONS.exit,
        },
      ]
      if (fullscreenEntry) defs.splice(defs.length - 1, 0, fullscreenEntry)
      this.addItems(defs, 300)
    } else {
      this.buildScores()
    }

    this.drawPanel()
    this.refresh()
  }

  // Vertical list: one selectable entry per row, icon + left-aligned label,
  // auto-centred as a block.
  private addItems(defs: Item[], startY: number, step = 54) {
    const placed = defs.map((def, i) => ({
      y: startY + i * step,
      entry: this.addEntry(0, startY + i * step, def, 30, 0),
    }))
    const iconW = defs.some((d) => d.icon) ? ICON_SIZE + ICON_GAP : 0
    const maxText = Math.max(...placed.map((p) => p.entry.text.width))
    const block = iconW + maxText
    const left = PLAY.cx - block / 2
    for (const { y, entry } of placed) {
      entry.text.setOrigin(0, 0.5)
      entry.icon?.setPosition(left + ICON_SIZE / 2, y)
      entry.text.setPosition(left + iconW, y)
      entry.hit?.setPosition(PLAY.cx, y).setSize(block + 90, 46)
      this.rows.push([entry])
    }
  }

  private addDivider(x: number, y: number, w: number) {
    const line = this.add.rectangle(x, y, w, 2, 0x3a4059).setDepth(8)
    this.dynamic.push(line)
  }

  private addEntry(x: number, y: number, def: Item, size: number, origin = 0.5): Entry {
    const text = this.addStatic(x, y, def.label(), size, DIM).setOrigin(origin)
    let icon: GameObjects.Image | undefined
    if (def.icon) {
      icon = this.add.image(x, y, def.icon).setDepth(10)
      icon.setScale(ICON_SIZE / icon.height)
      this.dynamic.push(icon)
    }
    const hit = this.add.zone(x, y, 10, 10).setDepth(12).setInteractive({ useHandCursor: true })
    this.dynamic.push(hit)
    const entry: Entry = { text, def, icon, hit }
    hit.on(def.pointerUp ? "pointerup" : "pointerdown", () => this.activateEntry(entry))
    hit.on("pointerover", () => {
      this.hover = entry
      this.refresh()
    })
    hit.on("pointerout", () => {
      if (this.hover === entry) {
        this.hover = null
        this.refresh()
      }
    })
    return entry
  }

  private activateEntry(entry: Entry) {
    const r = this.rows.findIndex((row) => row.includes(entry))
    if (r < 0) return
    this.row = r
    this.col = at(this.rows, r).indexOf(entry)
    getSfx().uiConfirm()
    this.refresh()
    entry.def.activate()
  }

  // Centres a horizontal row of icon+label items around x, sizing each item's
  // pointer target to its own content.
  private layoutEntries(x: number, y: number, items: Layoutable[], gap: number, zoneH: number) {
    const widths = items.map((it) => (it.icon ? it.icon.displayWidth + 8 : 0) + it.text.width)
    const total = widths.reduce((a, b) => a + b, 0) + gap * (items.length - 1)
    let cx = x - total / 2
    for (const it of items) {
      const start = cx
      if (it.icon) {
        it.icon.setPosition(cx + it.icon.displayWidth / 2, y)
        cx += it.icon.displayWidth + 8
      }
      it.text.setOrigin(0, 0.5).setPosition(cx, y)
      cx += it.text.width
      if (it.hit) {
        it.hit.setPosition((start + cx) / 2, y).setSize(cx - start + 24, zoneH)
      }
      cx += gap
    }
  }

  private buildScores() {
    const sorts: ResultSort[] = ["points", "date"]
    for (const sort of sorts) {
      const text = this.addStatic(0, 200, sortLabel(sort), 30, DIM).setOrigin(0.5)
      text.setInteractive({ useHandCursor: true })
      text.on("pointerdown", () => this.selectSort(sort))
      this.scoreTabs.push({ text, sort })
    }
    this.scoreList = this.addStatic(PLAY.cx, 250, "", 22, WHITE).setOrigin(0.5, 0)
    this.scoreFoot = this.addStatic(PLAY.cx, 660, "", 20, DIM).setOrigin(0.5)
    this.scoreFoot.setInteractive({ useHandCursor: true })
    this.scoreFoot.on("pointerdown", () => {
      getSfx().uiConfirm()
      this.goto("menu")
    })
    this.renderScores()
  }

  // Centres the sort tabs as a group; the active label is wider, so fixed
  // positions would overlap.
  private layoutScoreTabs() {
    const gap = 40
    const widths = this.scoreTabs.map((t) => t.text.width)
    const total = widths.reduce((a, b) => a + b, 0) + gap * (widths.length - 1)
    let cx = PLAY.cx - total / 2
    for (const tab of this.scoreTabs) {
      const w = tab.text.width
      tab.text.setPosition(cx + w / 2, 200)
      cx += w + gap
    }
  }

  private selectSort(sort: ResultSort) {
    if (this.scoresSort === sort) return
    this.scoresSort = sort
    this.historyScroll = 0
    getSfx().uiMove()
    this.renderScores()
  }

  private renderScores() {
    for (const { text, sort } of this.scoreTabs) {
      const active = sort === this.scoresSort
      const label = sortLabel(sort)
      text.setText(active ? `[ ${label} ]` : label)
      text.setColor(active ? GOLD : DIM)
    }
    this.layoutScoreTabs()

    const results = sortResults(loadResults(), this.scoresSort)
    const empty = "NO GAMES YET — PLAY ONE!"
    this.historyScroll = clampScroll(this.historyScroll, results.length, HISTORY_ROWS)
    const header = " #   LITERS  LV  RESULT  DATE"
    const body = results
      .slice(this.historyScroll, this.historyScroll + HISTORY_ROWS)
      .map((r, i) => {
        const rank = String(this.historyScroll + i + 1).padStart(2, " ")
        return (
          `${rank}  ${fmtScore(r.score)}  ` +
          `${String(r.level).padStart(2, " ")}  ${r.won ? "WON " : "LOST"}  ${fmtDate(r.at)}`
        )
      })
      .join("\n")
    this.scoreList?.setText(`${header}\n${body || empty}`)
    if (results.length > HISTORY_ROWS) {
      const from = this.historyScroll + 1
      const to = Math.min(results.length, this.historyScroll + HISTORY_ROWS)
      this.scoreFoot?.setText(`${from}-${to} / ${results.length}   ▲▼ SCROLL    ESC / ENTER — BACK`)
    } else {
      this.scoreFoot?.setText("ESC / ENTER — BACK")
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
      this.selectSort(this.scoresSort === "points" ? "date" : "points")
      return
    }
    if (down || up) {
      const next = clampScroll(
        this.historyScroll + (down ? 1 : -1),
        loadResults().length,
        HISTORY_ROWS,
      )
      if (next !== this.historyScroll) {
        this.historyScroll = next
        getSfx().uiMove()
        this.renderScores()
      }
      return
    }
    if (confirm || back) {
      getSfx().uiConfirm()
      this.goto("menu")
    }
  }

  private cycleDifficulty(dir: number) {
    const settings = loadSettings()
    const idx = DIFFICULTY_ORDER.indexOf(settings.difficulty)
    const next = at(
      DIFFICULTY_ORDER,
      (idx + dir + DIFFICULTY_ORDER.length) % DIFFICULTY_ORDER.length,
    )
    saveSettings({ ...settings, difficulty: next })
    this.refresh()
  }

  private toggleAutoFire() {
    const settings = loadSettings()
    saveSettings({ ...settings, autoFire: !settings.autoFire })
    this.refresh()
  }

  private toggleMusic() {
    const settings = loadSettings()
    const music = !settings.music
    saveSettings({ ...settings, music })
    getMusic().setEnabled(music)
    this.refresh()
  }

  private goto(mode: Mode) {
    this.mode = mode
    this.row = 0
    this.col = 0
    if (mode === "scores") {
      this.scoresSort = "points"
      this.historyScroll = 0
    }
    this.rebuild()
    if (mode === "scores") getMusic().setScene("scores")
    else if (mode === "menu") getMusic().setScene("menu")
  }

  private resumeGame() {
    getSamples().play("close")
    getMusic().setScene("game")
    Flow.resumeGame(this.scene)
  }

  private endGame() {
    getSamples().play("close")
    const game = this.scene.get("Game") as Game
    Flow.endGameAndShowScores(this.scene, game)
  }

  private refresh() {
    const selected = this.rows[this.row]?.[this.col]
    for (const row of this.rows) {
      for (const entry of row) {
        let color = DIM
        let alpha = 0.55
        if (entry === selected) {
          color = GOLD
          alpha = 1
        } else if (entry === this.hover) {
          color = HOVER
          alpha = 0.9
        }
        entry.text.setText(entry.def.label()).setColor(color)
        entry.icon?.setAlpha(alpha)
      }
    }
    this.drawHighlight(selected)
  }

  private drawHighlight(entry: Entry | undefined) {
    this.highlight.clear()
    if (!entry?.hit) return
    const b = entry.hit.getBounds()
    const selected = entry === this.rows[this.row]?.[this.col]
    this.highlight.fillStyle(0xffd54a, selected ? 0.14 : 0.06)
    this.highlight.fillRoundedRect(b.x, b.y, b.width, b.height, 10)
    this.highlight.lineStyle(2, 0xffd54a, selected ? 0.75 : 0.3)
    this.highlight.strokeRoundedRect(b.x, b.y, b.width, b.height, 10)
  }

  // Translucent card behind the content, auto-fitted to the text/icon bounds.
  private drawPanel() {
    this.panel.clear()
    let bounds: Geom.Rectangle | null = null
    for (const o of this.dynamic) {
      if (!(o instanceof GameObjects.Text) && !(o instanceof GameObjects.Image)) continue
      const r = o.getBounds()
      if (bounds) bounds = Geom.Rectangle.Union(bounds, r, new Geom.Rectangle())
      else bounds = new Geom.Rectangle(r.x, r.y, r.width, r.height)
    }
    if (!bounds) return
    const x = Math.max(10, bounds.x - 34)
    const y = Math.max(10, bounds.y - 26)
    const w = Math.min(PLAY.w - 10 - x, bounds.width + 68)
    const h = Math.min(PLAY.h - 10 - y, bounds.height + 52)
    this.panel.fillStyle(PANEL_FILL, PANEL_ALPHA)
    this.panel.fillRoundedRect(x, y, w, h, 18)
    this.panel.lineStyle(2, PANEL_BORDER, 0.9)
    this.panel.strokeRoundedRect(x, y, w, h, 18)
    this.panel.fillStyle(0xffd54a, 0.5)
    this.panel.fillRoundedRect(x + 24, y + 4, w - 48, 3, 1.5)
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
      .setDepth(10)
    this.dynamic.push(text)
    return text
  }

  private globalGamesLabel(): string {
    return `Global Games Played: ${this.globalGames ?? "—"}`
  }

  private loadGlobalGames() {
    const request = ++this.statsRequest
    void readGlobalGames().then((count) => {
      if (count === null || request !== this.statsRequest) return
      this.globalGames = count
      if (this.statsText?.active) this.statsText.setText(this.globalGamesLabel())
    })
  }

  private isInstalled(): boolean {
    const standalone =
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true
    return window.matchMedia("(display-mode: standalone)").matches || standalone
  }

  private activateInstall() {
    if (hasInstallPrompt()) {
      void promptInstall()
      return
    }
    this.goto("install")
  }

  private shareGame() {
    const url = window.location.href
    if (typeof navigator.share === "function") {
      void navigator.share({ title: GAME_TITLE, url }).catch(() => {})
      return
    }
    void navigator.clipboard
      ?.writeText(url)
      .then(() => this.flashShare())
      .catch(() => {})
  }

  private flashShare() {
    const text = this.shareText
    if (!text) return
    text.setText(SHARE_COPIED)
    this.time.delayedCall(SHARE_REVERT_MS, () => {
      if (text.active) text.setText(SHARE_LABEL)
    })
  }

  private openContact() {
    window.open(CONTACT_URL, "_blank", "noopener")
  }

  // Horizontal row below the menu: reachable with up/down and left/right.
  private addActionRow(x: number, y: number) {
    const size = 22
    const installed = this.isInstalled()
    const defs: Item[] = [
      ...(installed
        ? []
        : [
            {
              label: () => "INSTALL APP",
              activate: () => this.activateInstall(),
              icon: UI_ICONS.install,
            },
          ]),
      {
        label: () => SHARE_LABEL,
        activate: () => this.shareGame(),
        icon: UI_ICONS.share,
      },
      {
        label: () => "CONTACT",
        activate: () => this.openContact(),
        icon: UI_ICONS.contact,
      },
    ]
    const shareIndex = installed ? 1 : 0
    const entries = defs.map((def) => this.addEntry(0, y, def, size, 0))
    this.shareText = at(entries, shareIndex).text
    this.layoutEntries(x, y, entries, 28, 34)
    this.rows.push(entries)
  }

  private addLinkRow(x: number, y: number) {
    this.addLinkGroup(x, y, "Original DOS game:", [
      ["Wikipedia", "https://en.wikipedia.org/wiki/The_Last_Eichhof"],
      ["Download", "https://archive.org/download/TheLastEichhof/beer11.zip"],
      ["SourceCode", "http://ftp.lanet.lv/ftp/mirror/x2ftp/msdos/programming/gamesrc/beersrc.zip"],
    ])
    this.addLinkGroup(x, y + 28, "This game's", [
      ["SourceCode", "https://github.com/entorb/last-eichhof"],
    ])
  }

  // One "label: a b c" line where each link is its own selectable item, so
  // only the highlighted link changes color, not the whole line.
  private addLinkGroup(
    x: number,
    y: number,
    prefix: string,
    links: readonly (readonly [string, string])[],
  ) {
    const size = 18
    const gap = 16
    const prefixText = this.addStatic(0, y, prefix, size, DIM).setOrigin(0, 0.5)
    const entries = links.map(([name, url]) =>
      this.addEntry(
        0,
        y,
        {
          label: () => name,
          activate: () => window.open(url, "_blank", "noopener"),
        },
        size,
        0,
      ),
    )
    this.layoutEntries(x, y, [{ text: prefixText }, ...entries], gap, size + 8)
    this.rows.push(entries)
  }
}
