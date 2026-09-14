import type { Scene } from "phaser";
import { SPRITE_SHEETS, type SpriteSheetDef } from "../data/enemySprites";
import { PLAY } from "../data/level1";
import { LEVELS } from "../data/levels";
import { bgKey } from "../data/skins";
import { WEAPONS } from "../data/weapons";

// "Modern" art. Enemies, the ship and the explosion are rebuilt from the
// extracted DOS sprites: the pixel mask is down/up-scaled for smooth edges and
// then recoloured with a per-sprite duotone ramp, so every silhouette stays
// recognisable while reading as clean vector-style art. The remaining extras
// (cork, pellet, stars, weapon icons, backgrounds) are drawn procedurally.

type Ctx = CanvasRenderingContext2D;
type Draw = (ctx: Ctx, w: number, h: number, frame: number) => void;

// scripts/enemy-map.json extracts at 3x, so frame sizes are multiples of 3.
const SHEET_SCALE = 3;

function css(n: number, a = 1): string {
  const r = (n >> 16) & 0xff;
  const g = (n >> 8) & 0xff;
  const b = n & 0xff;
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function shade(color: number, factor: number): number {
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v * factor)));
  return (
    (c((color >> 16) & 0xff) << 16) |
    (c((color >> 8) & 0xff) << 8) |
    c(color & 0xff)
  );
}

function mix(a: number, b: number, t: number): number {
  const c = (v: number) => Math.round(v);
  const ar = (a >> 16) & 0xff;
  const ag = (a >> 8) & 0xff;
  const ab = a & 0xff;
  const br = (b >> 16) & 0xff;
  const bg = (b >> 8) & 0xff;
  const bb = b & 0xff;
  return (
    (c(ar + (br - ar) * t) << 16) |
    (c(ag + (bg - ag) * t) << 8) |
    c(ab + (bb - ab) * t)
  );
}

function roundRect(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function glow(
  ctx: Ctx,
  x: number,
  y: number,
  r: number,
  color: number,
  a: number,
) {
  ctx.save();
  ctx.globalAlpha = a;
  ctx.shadowColor = css(color);
  ctx.shadowBlur = r;
  ctx.fillStyle = css(color);
  ctx.beginPath();
  ctx.arc(x, y, Math.max(0.5, r * 0.4), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// --- sprite reconstruction --------------------------------------------------

function levelOf(key: string): number {
  const m = /^l(\d)-s\d+$/.exec(key);
  return m ? Number(m[1]) : -1;
}

function averageColor(data: Uint8ClampedArray): number {
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue;
    const lum =
      (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255;
    if (lum < 0.12) continue;
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
    n++;
  }
  if (n === 0) return 0x808080;
  return (
    (Math.round(r / n) << 16) | (Math.round(g / n) << 8) | Math.round(b / n)
  );
}

function hullFor(data: Uint8ClampedArray, key: string): number {
  const avg = averageColor(data);
  let r = (avg >> 16) & 0xff;
  let g = (avg >> 8) & 0xff;
  let b = avg & 0xff;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max - min < 24) {
    // Greyscale source: borrow the level accent so ships keep an identity.
    const level = levelOf(key);
    return level >= 0 ? (LEVELS[level]?.starTint ?? 0x6fa8ff) : 0x6fa8ff;
  }
  // Push away from grey for a cleaner, more saturated modern palette.
  const grey = (r + g + b) / 3;
  r = Math.max(0, Math.min(255, Math.round(grey + (r - grey) * 1.5)));
  g = Math.max(0, Math.min(255, Math.round(grey + (g - grey) * 1.5)));
  b = Math.max(0, Math.min(255, Math.round(grey + (b - grey) * 1.5)));
  return (r << 16) | (g << 8) | b;
}

function rampColor(
  t: number,
  dark: number,
  mid: number,
  light: number,
): number {
  return t < 0.5 ? mix(dark, mid, t * 2) : mix(mid, light, (t - 0.5) * 2);
}

function vectorizeSheet(scene: Scene, sheet: SpriteSheetDef) {
  const { key, frameWidth: fw, frameHeight: fh, frames } = sheet;
  const w = fw * frames;
  const h = fh;
  const src = scene.textures.get(key).getSourceImage() as CanvasImageSource;
  const tex = scene.textures.createCanvas(`v-${key}`, w, h);
  if (!tex) throw new Error(`selfcheck: could not create v-${key}`);
  const ctx = tex.context;

  // Down to the original pixel grid, then back up with smoothing: keeps the
  // exact silhouette but replaces the hard 3x block edges with soft ones.
  const lowW = Math.max(1, Math.round(w / SHEET_SCALE));
  const lowH = Math.max(1, Math.round(h / SHEET_SCALE));
  const low = document.createElement("canvas");
  low.width = lowW;
  low.height = lowH;
  const lowCtx = low.getContext("2d");
  if (!lowCtx) throw new Error("selfcheck: no 2d context");
  lowCtx.imageSmoothingEnabled = true;
  lowCtx.imageSmoothingQuality = "high";
  lowCtx.drawImage(src, 0, 0, w, h, 0, 0, lowW, lowH);

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(low, 0, 0, lowW, lowH, 0, 0, w, h);

  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const hull = hullFor(d, key);
  const dark = mix(shade(hull, 0.38), 0x080a14, 0.5);
  const light = mix(shade(hull, 1.7), 0xffffff, 0.4);

  for (let i = 0; i < d.length; i += 4) {
    const a = d[i + 3];
    if (a === 0) continue;
    const lum = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255;
    const c = rampColor(lum, dark, hull, light);
    d[i] = (c >> 16) & 0xff;
    d[i + 1] = (c >> 8) & 0xff;
    d[i + 2] = c & 0xff;
    d[i + 3] = Math.min(255, Math.round(a * 1.15));
  }

  // Bright rim where an opaque pixel meets transparency, per frame so frames
  // never bleed into each other.
  const at = (x: number, y: number) => d[(y * w + x) * 4 + 3];
  for (let f = 0; f < frames; f++) {
    const x0 = f * fw;
    for (let y = 0; y < h; y++) {
      for (let x = x0; x < x0 + fw; x++) {
        const i = (y * w + x) * 4;
        if (d[i + 3] < 40) continue;
        const edge =
          x === x0 ||
          at(x - 1, y) < 40 ||
          x === x0 + fw - 1 ||
          at(x + 1, y) < 40 ||
          y === 0 ||
          at(x, y - 1) < 40 ||
          y === h - 1 ||
          at(x, y + 1) < 40;
        if (!edge) continue;
        d[i] = (light >> 16) & 0xff;
        d[i + 1] = (light >> 8) & 0xff;
        d[i + 2] = light & 0xff;
        d[i + 3] = 255;
      }
    }
  }

  ctx.putImageData(img, 0, 0);
  for (let f = 0; f < frames; f++) {
    tex.add(f, 0, f * fw, 0, fw, fh);
  }
  tex.refresh();
}

// --- procedural extras ------------------------------------------------------

function makeSheet(
  scene: Scene,
  key: string,
  frameWidth: number,
  frameHeight: number,
  frames: number,
  draw: Draw,
) {
  const tex = scene.textures.createCanvas(
    key,
    frameWidth * frames,
    frameHeight,
  );
  if (!tex) throw new Error(`selfcheck: could not create ${key}`);
  const ctx = tex.context;
  for (let f = 0; f < frames; f++) {
    ctx.save();
    ctx.translate(f * frameWidth, 0);
    draw(ctx, frameWidth, frameHeight, f);
    ctx.restore();
  }
  for (let f = 0; f < frames; f++) {
    tex.add(f, 0, f * frameWidth, 0, frameWidth, frameHeight);
  }
  tex.refresh();
}

function makeCanvas(
  scene: Scene,
  key: string,
  w: number,
  h: number,
  draw: Draw,
) {
  makeSheet(scene, key, w, h, 1, draw);
}

function makeCork(scene: Scene) {
  makeCanvas(scene, "v-cork", 12, 26, (ctx, w, h) => {
    glow(ctx, w / 2, h / 2, w, 0xffffff, 0.7);
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, css(0xffffff, 0.95));
    g.addColorStop(0.5, css(0xffffff, 0.75));
    g.addColorStop(1, css(0xbfd4ff, 0.5));
    ctx.fillStyle = g;
    roundRect(ctx, w * 0.18, 0, w * 0.64, h, w * 0.32);
    ctx.fill();
    ctx.fillStyle = css(0xffffff, 0.9);
    ctx.beginPath();
    ctx.ellipse(w / 2, h * 0.32, w * 0.16, h * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
  });
}

function makePellet(scene: Scene) {
  makeCanvas(scene, "v-pellet", 10, 10, (ctx, w, h) => {
    glow(ctx, w / 2, h / 2, w, 0xff5c5c, 0.9);
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, css(0xffd0d0));
    g.addColorStop(0.5, css(0xff5c5c));
    g.addColorStop(1, css(0x8a1414, 0.9));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, w / 2 - 1, 0, Math.PI * 2);
    ctx.fill();
  });
}

function makeStars(
  scene: Scene,
  key: string,
  count: number,
  size: number,
  minA: number,
  maxA: number,
) {
  makeCanvas(scene, key, 256, 256, (ctx) => {
    for (let i = 0; i < count; i++) {
      const a = minA + Math.random() * (maxA - minA);
      ctx.fillStyle = css(0xffffff, a);
      const x = Math.floor(Math.random() * 256);
      const y = Math.floor(Math.random() * 256);
      ctx.fillRect(x, y, size, size);
      if (size >= 3 && Math.random() < 0.15) {
        ctx.fillRect(x - size, y, size * 3, size);
        ctx.fillRect(x, y - size, size, size * 3);
      }
    }
  });
}

function makeWeaponIcons(scene: Scene) {
  const generated = new Set(SPRITE_SHEETS.map((s) => s.key));
  WEAPONS.forEach((w, i) => {
    if (generated.has(`wpn-${w.id}`)) return;
    makeCanvas(scene, `v-wpn-${w.id}`, 24, 36, (ctx, cw, ch) => {
      const body = w.tint;
      const light = shade(body, 1.35);
      const dark = shade(body, 0.5);
      glow(ctx, cw / 2, ch * 0.85, 16, body, 0.5);
      const g = ctx.createLinearGradient(0, 0, cw, ch);
      g.addColorStop(0, css(light));
      g.addColorStop(0.5, css(body));
      g.addColorStop(1, css(dark));
      ctx.fillStyle = g;
      roundRect(ctx, 4, 6, 16, 30, 5);
      ctx.fill();
      ctx.strokeStyle = css(light, 0.9);
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = css(dark);
      ctx.fillRect(9, 0, 6, 8);
      ctx.fillStyle = css(0xffffff, 0.85);
      ctx.fillRect(6, 16, 12, 10);
      ctx.fillStyle = css(dark);
      const v = i % 4;
      if (v === 0) ctx.fillRect(6, 18, 12, 3);
      else if (v === 1) {
        ctx.fillRect(6, 18, 12, 2);
        ctx.fillRect(6, 22, 12, 2);
      } else if (v === 2) {
        ctx.beginPath();
        ctx.arc(12, 21, 3, 0, Math.PI * 2);
        ctx.fill();
      } else ctx.fillRect(10, 16, 4, 10);
    });
  });
}

function makeUiIcons(scene: Scene) {
  makeCanvas(scene, "v-ui-forward", 24, 24, (ctx, cw, ch) => {
    glow(ctx, cw / 2, ch / 2, 14, 0x59d16b, 0.7);
    const g = ctx.createLinearGradient(0, 0, cw, ch);
    g.addColorStop(0, css(0x7ee787));
    g.addColorStop(1, css(0x2ea043));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(cw * 0.22, ch * 0.14);
    ctx.lineTo(cw * 0.22, ch * 0.86);
    ctx.lineTo(cw * 0.88, ch * 0.5);
    ctx.closePath();
    ctx.fill();
  });
  makeCanvas(scene, "v-ui-buy", 24, 24, (ctx, cw, ch) => {
    glow(ctx, cw / 2, ch / 2, 14, 0xffb829, 0.7);
    const g = ctx.createLinearGradient(0, 0, 0, ch);
    g.addColorStop(0, css(0xffe08a));
    g.addColorStop(1, css(0xb8710f));
    ctx.fillStyle = g;
    roundRect(ctx, cw * 0.06, ch * 0.06, cw * 0.88, ch * 0.88, 5);
    ctx.fill();
    ctx.strokeStyle = css(0xffffff, 0.8);
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = css(0x5c2d00);
    ctx.fillRect(cw * 0.44, ch * 0.3, cw * 0.12, ch * 0.4);
    ctx.fillRect(cw * 0.3, ch * 0.44, cw * 0.4, ch * 0.12);
  });
  makeCanvas(scene, "v-ui-upgrade", 24, 24, (ctx, cw, ch) => {
    glow(ctx, cw / 2, ch / 2, 14, 0x4da3ff, 0.7);
    const g = ctx.createLinearGradient(0, 0, 0, ch);
    g.addColorStop(0, css(0x9bc8ff));
    g.addColorStop(1, css(0x1f6fcc));
    ctx.fillStyle = g;
    roundRect(ctx, cw * 0.06, ch * 0.06, cw * 0.88, ch * 0.88, 5);
    ctx.fill();
    ctx.strokeStyle = css(0xffffff, 0.8);
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = css(0x0b3a69);
    ctx.beginPath();
    ctx.moveTo(cw * 0.5, ch * 0.16);
    ctx.lineTo(cw * 0.88, ch * 0.52);
    ctx.lineTo(cw * 0.5, ch * 0.44);
    ctx.lineTo(cw * 0.12, ch * 0.52);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(cw * 0.44, ch * 0.5, cw * 0.12, ch * 0.32);
  });
  makeCanvas(scene, "v-ui-sell", 24, 24, (ctx, cw, ch) => {
    glow(ctx, cw / 2, ch / 2, 14, 0xff5f6e, 0.7);
    const g = ctx.createRadialGradient(
      cw * 0.35,
      ch * 0.35,
      1,
      cw / 2,
      ch / 2,
      cw / 2,
    );
    g.addColorStop(0, css(0xffb3ba));
    g.addColorStop(0.55, css(0xff5f6e));
    g.addColorStop(1, css(0x7a1420));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cw / 2, ch / 2, cw * 0.42, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = css(0xffe0e3, 0.9);
    ctx.lineWidth = 1.5;
    ctx.stroke();
  });
}

function makeBackgrounds(scene: Scene) {
  LEVELS.forEach((level, i) => {
    const accent = level.starTint;
    const base = level.bg;
    makeCanvas(scene, bgKey(i + 1), PLAY.w, PLAY.h, (ctx, w, h) => {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, css(shade(base, 0.6)));
      g.addColorStop(0.55, css(base));
      g.addColorStop(1, css(shade(base, 1.7)));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = css(accent, 0.06);
      ctx.lineWidth = 1;
      for (let x = 0; x <= w; x += 48) {
        ctx.beginPath();
        ctx.moveTo(x + 0.5, 0);
        ctx.lineTo(x + 0.5, h);
        ctx.stroke();
      }
      for (let y = 0; y <= h; y += 48) {
        ctx.beginPath();
        ctx.moveTo(0, y + 0.5);
        ctx.lineTo(w, y + 0.5);
        ctx.stroke();
      }
      const rg = ctx.createRadialGradient(
        w / 2,
        h * 0.4,
        0,
        w / 2,
        h * 0.4,
        w * 0.7,
      );
      rg.addColorStop(0, css(accent, 0.1));
      rg.addColorStop(1, "rgba(0,0,0,0.55)");
      ctx.fillStyle = rg;
      ctx.fillRect(0, 0, w, h);
    });
  });
}

// --- public API -------------------------------------------------------------

export function generateVectorSprites(scene: Scene): void {
  for (const sheet of SPRITE_SHEETS) {
    vectorizeSheet(scene, sheet);
  }
}

export function generateVectorExtras(scene: Scene): void {
  makeCork(scene);
  makePellet(scene);
  makeStars(scene, "v-stars-far", 140, 2, 0.2, 0.6);
  makeStars(scene, "v-stars-near", 50, 3, 0.65, 1);
  makeWeaponIcons(scene);
  makeUiIcons(scene);
  makeBackgrounds(scene);
}

export function generateVectorArt(scene: Scene): void {
  generateVectorSprites(scene);
  generateVectorExtras(scene);
}
