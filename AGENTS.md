# The Last Eichhof - Remake

Remake of the 1993 MS-DOS game **The Last Eichhof** in modern web tech stack

Tech stack: phaser V4, vite, typescript, pnpm

## Instructions

- New game shall be close to original, but not 100%. Improve what is odd
- Use context7 for latest phaser v4 features
- Use American English, not British
- Update AGENTS.md after a research, so future ai coding is more efficient
- Use `./tmp/` instead of `/tmp/` for debugging scripts

## References

- Wikipedia info about the original game is in [wiki.md](docs/wiki.md).
- Source code of original DOS game is at `original_game/beer_src/` (not committed). An overview of the files is in [original_game/beer_src](docs/beer_src.md).
- Compiled original DOS game, including the graphics and sound, is at (`original_game/beer_exe/`) (`BEER.DAT` = `ALPHA-HELIX COMBINER VER 3.3` archive; parse the directory at offset 34: `name[14] size(4) flags(2) fptr(4)`, data starts right after the directory)
- How to decode graphics and sound out of `BEER.DAT` (archive layout, `.SLI` sprites, palette, animation timing, enemy mapping, `.SND` samples): [docs/beer_dat.md](docs/beer_dat.md)

## Code Checks

- After each task run `scripts/chk_js_format.sh`
- After each feature also run `scripts/run_checks.sh` (runs every `scripts/chk_*.sh`: biome, tsc, knip, `pnpm audit`, pre-commit, vitest)
- Fix all findings and update [AGENTS.md](AGENTS.md) to prevent same issue in future
- `.github/workflows/check.yml` must run the same toolchain as `package.json`'s scripts (biome, `tsc --noEmit`, vitest, knip, `pnpm audit`) — a mismatch breaks CI
- `knip.json` `entry` must list `src/main.ts`, `src/skins.ts`, `vite/config.*.mjs` and `scripts/*.mjs` (vite's `root` is `src`, so the HTML entry alone isn't resolved); without it knip reports every file as unused

Unit tests use **vitest** (`pnpm test` = `vitest run`); test files live next to the code they cover (`src/game/**/*.test.ts`). Phaser scenes can't run in vitest, so scene transitions are tested through the pure `src/game/flow.ts` (fake `SceneSwitcher` recorder). Keep `run*SelfCheck()` passing for new pure logic **and** add a vitest case for any data/logic invariant a bug report exposed (e.g. `pathFor` must replay every foe's real `.FOE` path; no scheduled boss may be `invincible`/`transparent`; each flow action emits the expected scene calls).

## Browser Debugging

`playwright-core` is a dev dependency (no browser bundled). Install the matching Chromium once: `pnpm exec playwright-core install chromium` (add `webkit` if needed); browsers land in `~/Library/Caches/ms-playwright` and are versioned to the installed `playwright-core`.

For a manual end-to-end check, put a throwaway script in `./tmp/*.mjs` (gitignored; it resolves `playwright-core` from the root `node_modules`), start `pnpm dev` (URL is `http://localhost:5173/last-eichhof/` — port from `vite/config.dev.mjs`, path is the vite `base`), and drive the game:

```js
import { chromium } from "playwright-core";
const browser = await chromium.launch();
const page = await browser.newPage();
page.on("pageerror", (e) => console.error(e)); // Phaser errors surface here
await page.goto("http://localhost:5173/last-eichhof/", { waitUntil: "load" });
await page.waitForTimeout(2500);
// Reach into a scene: TS `private` is not runtime-private.
const state = await page.evaluate(() => {
  const s = window.__game.scene.getScene("Game"); // dev-only handle
  return { state: s.state, lives: s.lives };
});
await browser.close();
```

- `src/main.ts` exposes `window.__game` only when `import.meta.env.DEV` (stripped from `pnpm run build`). Use it to force states (`s.playerHit()`, `s.bossesLeft = 0`, `s.reward...`), read `s.state`/`s.lives`/`s.message.text`, and screenshot with `page.screenshot()`.
- Mobile: `browser.newContext({ viewport: { width: 800, height: 360 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })`; use `page.touchscreen.tap(x, y)` (logical→screen `x*0.5`, `y*0.5` for the 960×720 canvas) and CDP `Input.dispatchTouchEvent` for held drags. This is how the mobile death/black-screen bug was reproduced.
- Not wired into `pnpm test`; run it manually when a bug needs a real browser (touch input, scene transitions, rendering).
- Chromium may already be at a system path — `node node_modules/playwright-core/cli.js install chromium` works when the `pnpm exec` shim is not on `PATH` (`ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL`).
- `localStorage` is unreadable on `about:blank`: `page.goto(URL)` **first**, then set the settings blob, then `page.reload()`.
- Two `page.keyboard.press` calls in the same tick land in one game frame, so a `Menu` cursor moves once instead of twice. Put ~200-300 ms between presses when driving row-based menus.
- `page.screenshot` stalls the render loop, so a following `evaluate` sees the sim advance several capped `dt` steps (a 0.5 s one-shot animation is already over). Sample animation frames from the source canvas, not the live scene.
- Phaser 4's `scale.displayScale` is not the FIT ratio; map game px to page px with `canvas.getBoundingClientRect()` and `rect.width / 960` when screenshotting a specific game coordinate.
- Art review: `/last-eichhof/skins.html` lists every sheet's DOS PNG beside the modern art (see "Coding Notes"). `tmp/contact.mjs` renders the same thing to a PNG grid when a screenshot is easier to read than the page.

## Coding Notes

- Phaser `Input.Keyboard` key types are `Phaser.Types.Input.Keyboard.*` (e.g. `CursorKeys`), not `Phaser.Input.Keyboard.*`.
- `this.input.keyboard` is nullable; guard before use (`if (!kb) throw ...`).
- Mobile input lives in `src/game/input/` (`controls.ts`, `touchpad.ts`, `edgeStick.ts` — see [docs/architecture.md](docs/architecture.md) "Mobile input" for the file map and `Settings.controls`/`autoFire`). Two Phaser gotchas when wiring the touch joystick zone in `Game`: an `alpha: 0` sprite is skipped by input (`setAlpha(0)` clears the render flag), so the joystick base must be an invisible interactive `Zone`; and `InputPlugin.enable` early-returns when an object already has input, so widening a hit area needs `removeInteractive()` **then** `setInteractive(...)`.
- `edgeStick.ts` and the CSS in `public/style.css`/`main.ts` (off-canvas steering, `#rotate` landscape overlay, iOS `100svh` vs `100dvh`+flex) each carry their own header comment explaining the quirk they work around — read those before touching them rather than re-deriving it.
- Fullscreen (`src/game/input/fullscreen.ts`, `toggleFullscreen(scene)`) is a `Menu` entry, omitted when `scale.fullscreen.available` is false (iPhone Safari). Its `Item.pointerUp: true` binds `pointerup` instead of `pointerdown` — fullscreen must be requested from a user gesture and mobile browsers reject `pointerdown`.
- Do not disable pinch-zoom via the viewport meta (`user-scalable=no`/`maximum-scale`); `touch-action: none` on `#app`/canvas already blocks it (`public/style.css`).
- Audio: `Sound` is a namespace export — guard `manager instanceof Sound.WebAudioSoundManager` before using `.context`/`.destination`; `Samples`/`Synth`/`Music` no-op otherwise. Web Audio starts suspended: `Music.tick` must bail while `!synth.running` and resync `nextTime` to `ctx.currentTime` once a gesture unlocks it.
- Vite 8 / rolldown requires `build.rollupOptions.output.manualChunks` as a **function**, not an object map (both `vite/config.*.mjs`).
- `base` in `vite/config.*.mjs` must match the deploy directory (`scripts/deploy.sh` rsyncs to `html/last-eichhof/`, so base is `/last-eichhof/`); a mismatch 404s the built CSS/JS and leaves the raw `#rotate` overlay visible.
- `vite/config.prod.mjs` sets `build.outDir: "../dist"` — vite's `root` is `src`, so the default would land in `src/dist` (untracked, unlinted). Keep it pointed at the repo-root `dist`.
- New pure logic gets a `run*SelfCheck()` (assert-based), wired into `Boot.devSelfChecks()` behind `import.meta.env.DEV`, plus a vitest case calling it (vitest can't reach Phaser scenes).
- `biome check --write` reorders imports; run it before `tsc`/`build`.
- No `Math.random` (Sonar S2245): reproducible visuals (star fields) use a seeded `Phaser.Math.RandomDataGenerator`; audio noise uses `crypto.getRandomValues` in chunks (65536-byte max per call).
- Scenes render in config-list order (`[Boot, Menu, Shop, Game]`), so `Game` draws **over** an overlay launched with `scene.launch("Menu")`; call `scene.bringToTop("Menu")` when launching the pause overlay or it stays hidden behind the game.
- Phaser 4 removed the `setTintFill(color)` argument: use `setTint(color).setTintMode(TintModes.FILL)` (import `TintModes` from `phaser`).
- `Menu`/`Shop` treat Enter and Space as the same confirm key; keep both wired when adding menu items. Every start screen must keep exposing contact, source code, home, share and install (see `docs/architecture.md` Scenes row for the current entry list).
- Generated files — **never hand-edit**, re-run the generator instead: `src/game/data/enemySprites.ts`/`foeRosters.ts` (`node scripts/extract-sprites.mjs`, edit `scripts/enemy-map.json` or the DOS data), `src/game/data/sounds.ts` (`node scripts/extract-sounds.mjs`). Both are documented in [docs/beer_dat.md](docs/beer_dat.md).
- Phaser `GameObjects.Sprite` is not a subclass of `GameObjects.Image`; animated objects (ship, enemies, explosions, weapon mounts) must be typed/created as `Sprite` (`add.sprite`), and `overlap()` takes `Image | Sprite`.
- The readable C port at `original_game/allegro_src/lastbeer-2.0/` (Gavin Smith 2014, GPL) is the authoritative DOS reference; verified porting notes live in [docs/allegro_src.md](docs/allegro_src.md). Non-obvious verified semantics: `nbigboss` (boss count) is seeded from `.dsc`, but level 4's boss has no `FOE_ENDLEVEL` flag — it's detected by `score < 0` instead (`roleFor`), so don't switch boss detection to the flag alone; `FOES[].stopcount` foes (flag 0x08) must freeze `spawnWaves` while alive; the world (incl. firing) keeps running during the `shield` state (`updateShield` calls `updatePlay`).
- Graphics skins (`Settings.graphics`, `src/game/art/skin.ts` `texKey()`): **every** world texture must go through `texKey` (ship, foes, path `sprite` events, shots, mounts, `pellet`, `explosion`) or a mode switch leaves stale art on screen. **Never use `Graphics.generateTexture`** for modern art — Phaser 4 drops gradients from the baked texture — paint into a `CanvasTexture` instead (`phaser.d.ts`: "Graphics features, such as `fillGradientStyle`, will not appear on the resulting texture"). Never regenerate a texture a live sprite already references (`Game.reskin()` re-textures live objects instead). Frame geometry must match the DOS sheet exactly, or `displayWidth`-based collision and the shop footprints break.
  - Adding/editing foe art (`foeArt.ts`): each `FOE_ART` entry must depict the same subject as the DOS sprite — verify with `node tmp/dosonly.mjs --m <keys>` rather than guessing from the key. Every generator must animate off the frame index `i`/`n`; a lone `Math.sin(phase)` mirrors itself at `i == n/2 - i` and silently drops half the strip — add a cosine/second-harmonic term. `runModernSkinSelfCheck()` catches missing art, not a frozen/mirrored strip.
  - `src/skins.html`/`src/skins.ts` is a dev-only inspector (`/last-eichhof/skins.html` under `pnpm dev`) listing every sheet's DOS PNG next to the modern art; it calls the same `drawModernSheet()` the game uses.
- `CanvasTexture` frames: `createCanvas` gives only `__BASE`; call `tex.add(name, 0, x, y, w, h)` per frame and `tex.refresh()`. The first added frame becomes `firstFrame`, so a frame-less `add.image`/`add.sprite` shows frame 0.
- SonarCloud findings are pulled into `tmp/sonar.json`; fix every issue. Rules this repo has repeatedly hit:
  - `Number.parseInt`/`Number.parseFloat` over the globals (`S7773`); `String#codePointAt` over `charCodeAt` (`S7758`).
  - Mark constructor-only-assigned fields `readonly` (`S2933`), including constructor parameter properties.
  - No nested ternaries (`S3358`); clamps use `Math.min`/`Math.max` (`S7766`); membership tests use `Set#has` not `Array#includes` (`S7776`).
  - Don't call `Array#push()` multiple times in one function (`S7778`) — build one array literal (conditional spread for optional entries).
  - High cognitive complexity (`S3776`, threshold 15): split into small extracted private helpers, one loop/switch each, not `// biome-ignore` — see `src/game/data/path.ts` `PathRunner.step*` or `Game.collide*` for the pattern.
  - `.sonarcloud.properties` holds `sonar.exclusions` for generated files; add `sonar.issue.ignore.multicriteria` there (with a comment explaining why) for an intentional deviation — never inline `NOSONAR`.

## Architecture

The detailed architecture map (scenes, data, audio, PWA, input, DOS formats)
lives in [docs/architecture.md](docs/architecture.md).
