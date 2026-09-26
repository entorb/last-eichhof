import { FOE_ART } from "./game/art/foeArt"
import { drawModernSheet, type ModernSheet, modernSheets } from "./game/art/skin"
import { SPRITE_SHEETS } from "./game/data/enemySprites"

// Dev-only inspector: a side-by-side sheet of the DOS art and the modern skin.
// Not part of the production build (Vite only bundles `index.html`).

const BASE = import.meta.env.BASE_URL
const DOS_FILES = new Map(SPRITE_SHEETS.map((s) => [s.key, s.file]))
const MODERN = new Map(modernSheets().map((s) => [s.key, s]))
const MODERN_CACHE = new Map<string, HTMLCanvasElement>()

const el = <T extends HTMLElement>(id: string): T => {
  const found = document.getElementById(id)
  if (!found) throw new Error(`missing #${id}`)
  return found as T
}

// Longest edge each art cell may occupy at zoom 1. Wide strips shrink to fit so
// the DOS and modern columns stay side by side.
const CELL_W = 300
const CELL_H = 190

function fitScale(sheet: ModernSheet, zoom: number): number {
  const w = sheet.frameWidth * sheet.frames
  const h = sheet.frameHeight
  return Math.min(CELL_W / w, CELL_H / h) * zoom
}

function modernCanvas(sheet: ModernSheet): HTMLCanvasElement {
  const hit = MODERN_CACHE.get(sheet.key)
  if (hit) return hit
  const canvas = document.createElement("canvas")
  canvas.width = sheet.frameWidth * sheet.frames
  canvas.height = sheet.frameHeight
  drawModernSheet(canvas.getContext("2d") as CanvasRenderingContext2D, sheet)
  MODERN_CACHE.set(sheet.key, canvas)
  return canvas
}

function sheetNode(sheet: ModernSheet, kind: "dos" | "modern", zoom: number): HTMLElement {
  if (kind === "dos") {
    const file = DOS_FILES.get(sheet.key)
    const img = document.createElement("img")
    img.className = "shot"
    img.alt = sheet.key
    const s = fitScale(sheet, zoom)
    img.width = Math.max(1, Math.round(sheet.frameWidth * sheet.frames * s))
    img.height = Math.max(1, Math.round(sheet.frameHeight * s))
    if (file) {
      img.src = `${BASE}${file}`
    } else {
      img.alt = `${sheet.key} (procedural in Boot, no DOS file)`
      img.classList.add("missing")
    }
    return img
  }
  const out = document.createElement("canvas")
  out.className = "shot"
  out.title = sheet.key
  const s = fitScale(sheet, zoom)
  out.width = Math.max(1, Math.round(sheet.frameWidth * sheet.frames * s))
  out.height = Math.max(1, Math.round(sheet.frameHeight * s))
  const g = out.getContext("2d") as CanvasRenderingContext2D
  g.imageSmoothingEnabled = false
  g.drawImage(modernCanvas(sheet), 0, 0, out.width, out.height)
  return out
}

function describe(key: string): string {
  const def = FOE_ART[key]
  if (!def) return "rig"
  const bits: string[] = [def.art]
  if (def.motion && def.motion !== "spin") bits.push(def.motion)
  if (def.word) bits.push(`"${def.word}"`)
  return bits.join(" · ")
}

const state = { q: "", anim: false, big: false, zoom: 1 }

function area(sheet: ModernSheet): number {
  return sheet.frameWidth * sheet.frameHeight * sheet.frames
}

function visibleSheets(): ModernSheet[] {
  return [...MODERN.values()].filter((s) => {
    if (state.anim && s.frames < 2) return false
    if (state.big && area(s) <= 5000) return false
    if (!state.q) return true
    const hay = `${s.key} ${describe(s.key)} ${s.frameWidth}x${s.frameHeight}`.toLowerCase()
    return hay.includes(state.q)
  })
}

function render(): void {
  const rows = el<HTMLTableSectionElement>("rows")
  const list = visibleSheets()
  rows.replaceChildren()
  for (const sheet of list) {
    const tr = document.createElement("tr")
    const cells: [string, string][] = [
      ["key", sheet.key],
      ["meta", `${sheet.frameWidth}x${sheet.frameHeight}`],
      ["meta", String(sheet.frames)],
      ["art", describe(sheet.key)],
    ]
    for (const [cls, text] of cells) {
      const td = document.createElement("td")
      td.className = cls
      td.textContent = text
      tr.append(td)
    }
    for (const kind of ["dos", "modern"] as const) {
      const td = document.createElement("td")
      const node = sheetNode(sheet, kind, state.zoom)
      node.classList.add("zoom")
      node.addEventListener("click", () => openViewer(sheet, kind))
      td.append(node)
      tr.append(td)
    }
    rows.append(tr)
  }
  el("count").textContent = `${list.length} / ${MODERN.size} sheets`
}

const viewer = el<HTMLDialogElement>("viewer")
let current: { sheet: ModernSheet; kind: "dos" | "modern" } | null = null

function paintViewer(): void {
  if (!current) return
  const { sheet, kind } = current
  el("vkey").textContent = sheet.key
  el("vmeta").textContent =
    `${sheet.frameWidth}x${sheet.frameHeight} · ${sheet.frames} frame(s) · ${describe(sheet.key)}`
  const body = el("v-body")
  body.replaceChildren()
  if (kind === "dos") {
    const file = DOS_FILES.get(sheet.key)
    if (!file) {
      const p = document.createElement("p")
      p.className = "meta missing"
      p.textContent = "No DOS file: this texture is generated in Boot for both skins."
      p.style.padding = "18px"
      body.append(p)
      return
    }
    const img = document.createElement("img")
    img.src = `${BASE}${file}`
    img.style.imageRendering = "pixelated"
    body.append(img)
    return
  }
  const c = document.createElement("canvas")
  c.style.imageRendering = "pixelated"
  const w = sheet.frameWidth * sheet.frames
  const h = sheet.frameHeight
  const scale = Math.max(1, Math.min(8, Math.floor(900 / w) || 1))
  c.width = w * scale
  c.height = h * scale
  const g = c.getContext("2d") as CanvasRenderingContext2D
  g.imageSmoothingEnabled = false
  g.drawImage(modernCanvas(sheet), 0, 0, c.width, c.height)
  body.append(c)
}

function openViewer(sheet: ModernSheet, kind: "dos" | "modern") {
  current = { sheet, kind }
  paintViewer()
  if (!viewer.open) viewer.showModal()
}

function wire(): void {
  el<HTMLInputElement>("q").addEventListener("input", (e) => {
    state.q = (e.target as HTMLInputElement).value.trim().toLowerCase()
    render()
  })
  el<HTMLInputElement>("only-anim").addEventListener("change", (e) => {
    state.anim = (e.target as HTMLInputElement).checked
    render()
  })
  el<HTMLInputElement>("only-big").addEventListener("change", (e) => {
    state.big = (e.target as HTMLInputElement).checked
    render()
  })
  el<HTMLInputElement>("zoom").addEventListener("input", (e) => {
    state.zoom = Number((e.target as HTMLInputElement).value)
    render()
  })
  el("v-close").addEventListener("click", () => viewer.close())
  el("v-dos").addEventListener("click", () => {
    if (current) {
      current.kind = "dos"
      paintViewer()
    }
  })
  el("v-modern").addEventListener("click", () => {
    if (current) {
      current.kind = "modern"
      paintViewer()
    }
  })
  window.addEventListener("keydown", (e) => {
    if (!viewer.open || !current) return
    if (e.key === "1") {
      current.kind = "dos"
      paintViewer()
    }
    if (e.key === "2") {
      current.kind = "modern"
      paintViewer()
    }
    if (e.key === "Escape") viewer.close()
  })
}

wire()
render()
