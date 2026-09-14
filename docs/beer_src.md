# beersrc/ — "The Last Eichhof" DOS Source Reference

Source code from <http://ftp.lanet.lv/ftp/mirror/x2ftp/msdos/programming/gamesrc/beersrc.zip> downloaded to `original_game/beer_src/`

Reference document for rewriting The Last Eichhof as a modern web game (Phaser V4 / TypeScript).
Source: `beersrc/`, original by Dany Schoch (Alpha-Helix, 1993), Turbo C 3.1 + TASM, compact memory model.

## 1. File Inventory

### Game executable (BALLER.PRJ, 13 units)

| File | Role |
|---|---|
| `BALLER.C` | `main()`: cmdline/cheats (`007.N` = cheat, `/VGA`, `/NS`), powerup (VGA check, XMS filemanager, SB init, hooks int 08/09, 20 Hz timer), `error()` handler |
| `GAMEPLAY.C` | Level flow: `newgame()` → `initlevel(stage)` → `play()` loop → `weaponmanager()` (shop) between levels → `highscore()`. Loads all per-level data. |
| `GAMEASM.ASM` | Core gameplay: `play()` master loop, keyboard handling, attack-table scheduler, command interpreters for shots/foes/explosions, collisions (`foehit`, `armhit`), HUD (`dispscore`, `displifes`). Graphics-mode independent. |
| `XMODEC.C` | Sprite-library management (`defsprite`/`killsprite`, VRAM sprite store), palette fades (glow in/out, cyclepalette), PCX RLE display, starfield pre-transform. |
| `XMODEASM.ASM` | Hardware engine: MODE-X 320×240 CRT setup, page flipping, sprite blitters (per-4px plane mask), object system (`defobject`, `moveobject`, `crashtest`, `outofwindow`, `updatescreen`), starfield, plot/pixel. |
| `SOUND.ASM` | Sound Blaster 8-bit PCM via DMA (DSP cmd 0x14, ~9–11 kHz, mono). Double-buffered file streaming, memory samples, priority arbitration, IRQ hook. |
| `FILEMAN.C` | `beer.dat` database: all assets in one file, name-based lookup, XMS extended-memory cache with pseudo-LRU eviction. |
| `XMS.ASM` | int 2Fh XMS 3.0 driver interface (alloc, move, lock). |
| `MENU.C` | Title, credits, 6-point main menu, story, options, remappable keys, `CONFIG.HIG` persistence. |
| `SHOP.C` | Inter-level weapon shop: money, buy/sell (75% refund), 2 max speed-ups, extra lives, weapon placement grid. |
| `HISCORE.C` | Top-8 highscore table + winner text, stored obfuscated (XOR) in `CONFIG.HIG`. |
| `INTRO.C` | EGA 640×350 Alpha-Helix card + scrolling `paper.fnt` ticker, `blick.pak` RLE picture. |
| `SUPPORT.C` | 8253 timer reprogramming (`setspeed`), text/number rendering, `killallbuddies()`. |

### Tools (separate builds, not in the game)

| File | Purpose | Produces |
|---|---|---|
| `EDIT.C` | Level editor: enemy paths + attack table (mouse-driven, X-mode) | `.FOE`, `.FSP`, `.TBL` |
| `EXPL.C` | Explosion + foe path designer | `.EXP`, `.FOE` |
| `SLIB.C` | Sprite library manager | `.SLI` |
| `CONVERT.C` | PCX → raw sprite converter | `.SPR` |
| `WPNPATH.C` | Scripted weapon/shot-path builder (hardcoded `build0..15`) | `.SHT` |
| `EWD.C` | Extra Weapon Designer (shop weapon defs) | `.WPN` |
| `DESCRIPT.C` | Level description | `.DSC` |
| `STARS.C` | PCX star map → starfield | `.STA` (color index = parallax depth) |
| `VOCSTRIP.C` | Creative `.VOC`/`.RAW` → sample | `.SND` |
| `BIT0.C` | 4-bit packing hack (clears sample bit 0) | `.SND` |
| `COMPRESS.C` | Full-screen RLE packer | `.PAK` |
| `COMBINER.C` | Interactive archive builder | `beer.dat` |
| `ST.C` | Standalone sprite animation viewer | — |
| `LOAD256.C` | 256-color PCX display demo | — |
| `LOADIFF.C` | DeluxePaint `.LBM` reader probe | — |
| `KEY.BAS` | 8042 scancode probe (QuickBasic) | — |

### Build config / shared headers

`BALLER.ASH` + `BALLER.H` (game struct contract, C↔asm), `XMODE.H/.ASH/.DEF` (graphics contract), `SOUND.H/.ASH`, `FILEMAN.H`, `XMS.H/.ASH`, `MOUSE.H`, `LOWMOUSE.H`, `GLOBDEFS.H`, `TURBOC.CFG` (`-mc` compact model, `-K` unsigned char), `TASM.CFG`.

## 2. Architecture

```plain
BALLER.C  boot → FILEMAN opens beer.dat → INTRO → MENU → playthegame()
                                                             │
                        ┌────────────────────────────────────┤
                   per level:  .dsc .sli .snd .foe .exp .tbl .sta
                        │
                GAMEASM play() loop @ ~20 Hz:
                   attack-table scheduler → deffoe
                   keyboard (port 60h) → movement
                   updatescreen (flip pages, animate/draw objects)
                   foehit / armhit (box collisions)
                   shots/foes/explosions = command-stream interpreters
                   HUD redraw (score + lives) on current (hidden) page
```

- **Two VRAM pages** (320×240 MODE-X): render off-screen, flip CRT start address during display-disable + retrace wait.
- **Object pools** (fixed arrays, `object == -1` = free): `MAXARMS 7`, `MAXFOES 26`, `MAXSHOTS 30`, `MAXEXPLS 8`.
- **Priority rendering**: object table split — LOW = slots 0–29 drawn first, HIGH = 30–59 on top; overflow spills to other half.
- **Tearing-free animation**: 3-frame position history (`x,y → xa,ya → xb,yb`); each frame erase at oldest recorded pos, draw at newest.
- **Sprites**: 1 byte/pixel planar data behind `{xs, ys, maxn}` header; `defsprite` pre-copies into offscreen VRAM store with an align-2 shifted copy + 1 mask byte per 4 pixels (plane-skip blit). Flags `SPR_ALIGN 0x07`, `SPR_DOUBLE 0x08` (each picture painted twice = slow anim).
- **Starfield**: pre-transformed `x = y*80 + x/4`, speed ×80; single-byte writes on hidden page; wraps at window bottom. Colors = depth/speed authored in STARS.C.
- **Sound**: samples only, no music. `sndstrc { priority, samplerate(kHz int), flags(SND_PACKED4=0x01), len(long), data[] }`. Playback modes: memory (`playsample`, priority-gated), file streaming (`playfile`, double-buffered, SND_LOOP).

## 3. Gameplay Reference

### Movement / ship ("Eichli", the bottle)

- Start at (150, 190), speed `shipspeed` px/frame (start 4, max 8), `STARLIFES 4`, cheat-less lifes counted down per failed stage.
- Movement reads remappable scan-code array `key[]`; fire key = space.
- 20 Hz game clock (`GAMESPEED 0xe8f6` timer reload), input polled in `play()`.

### Fixed timers (frames)

```plain
WIN_CTIME    100   frames play continues after big boss dies
LOSE_CTIME    60   frames after Eichli dies (death animation)
SHIELD_CTIME  70   invincibility at stage start
```

### Weapons & money (SHOP.C / weaponmanager)

- Money bonus per stage: `((score_delta + 1500) / 2500) * 5`; `score_delta = score - scoreold` plus level bonus.
- Cap `MAXARMS 7` equipped; sell refunds `cost * 3/4`.
- `W_SPEEDUP` → shipspeed +2 (max 2), `W_EXTRALIFE` → lifes+1.
- Positioning: ghost weapon placed with arrows, `crashtest` against placed weapons → "OVERLAP", 16-px snapped grid.

### Weapon arm definition (`armstrc`)

`{ armname[20], sprite, shot, cost, period (shots/frame), flags }`; flags `W_ISWEAPON 0x8000`, `W_SPEEDUP 1`, `W_EXTRALIFE 2`.

### Shot path command set (`shotstrc { shotx, shoty, power, speed, sprite, data[] }`)

Words consumed one pair/frame as `(dx, dy)` deltas; high (`0x8000`) = command:

```plain
SHOTEND        0x8000   end path -> abandon object (shot dies)
SHOTRELEASE    0x8001   + next word: shot # -> spawn sub-shot at current pos
SHOTHOMING     0x8002   steer toward foe (Bresenham slew, speed from header)
SHOTREFLECT    0x8003   bounce off playfield borders
```

### Foe command set (`foestrc { flags, shield, score, expl, sprite, speed, path[] }`)

Flags: `FOE_ENDLEVEL 0x01` (big boss), `FOE_INVINCIBLE 0x02`, `FOE_TRANSPARENT 0x04`, `FOE_STOPCOUNT 0x08` (frame counter stalls), `FOE_PATH 0x10`, `FOE_LINE 0x20` (Bresenham line toward target).

```plain
FOEENDPATH       0x8000   destroy foe
FOECHANGESPRITE  0x8001
FOERELEASEFOE    0x8002   spawn another foe with offset
FOECYCLEPATH     0x8004   loop back to saved FOEMARK
FOEMARK          0x8005   save path position + coords
FOESOUND         0x8006
```

### Explosion command set (`explstrc { dummy, data[] }`)

```plain
EXPLEND       0x8000
EXPLNEW       0x8001   spawn sprite (OBJ_HIGH | OBJ_ONECYCLE, one-shot)
EXPLWAIT      0x8002
EXPLSOUND     0x8003
EXPLREMOVEOBJ 0x8004
EXPLRELEASEFOE 0x8005
EXPLNEWPATH    0x8006
```

### Attack table (`.tbl`) — timed spawn scheduler

`attackstrc { count(frame), x, y, foe }` sorted by count; commands interleaved: `A_GOFIELD 0x8000` (start starfield), `A_STOPFIELD 0x8001`, `A_SOUND 0x8002`, `A_MARK 0x8003`. The `play()` loop spawns foes when frame counter reaches `count`.

### Scores & game end

- Destroying foes: `foe.score`; shield/power combat both ways (`foehit` subtracts shot power from foe shield, foe hits player).
- Win when all big bosses (`nbigboss`) gone → `WIN_CTIME` tail. Lose → `LOSE_CTIME` death anim (or mountain landscape + "tod.snd" = end logo). Winner still gets highscore ("SORRY. NO HERO TUNE THIS TIME." on `sky.pcx`).
- `LEVELS = 5`.

## 4. Data Formats Summary

| Ext | Layout | Notes |
|---|---|---|
| `.DAT` | 30-byte `"ALPHA-HELIX COMBINER VER 3.3\x1A"` + mode(2) + nfiles(2) + dir `[name[14], size(4), flags(2), fptr(4)] × nfiles` + data blocks | single archive, FILEMAN reads by 8.3 name, optional XMS cache per-file |
| `.SPR` | `xs(2) ys(2) maxn(2)` + `xs*ys*maxn` raw bytes | planar, 1 B/px |
| `.SLI` | `count(2)` + `[ptr(4 packed), flags(2)] × count` + sprite blobs | pointers relocated at load: `p += base` |
| `.DSC` | `descrstrc { level, text[40], nbigboss, score, money, flags }` | |
| `.WPN` | `n(2)` + `armstrc[]` | weapon shop defs |
| `.SHT` | `n(2)` + packed ptrs + `shotstrc` + path words | shot path lib |
| `.FOE` | `n(2)` + packed ptrs + `foestrc` + path words | foe lib |
| `.EXP` | `n(2)` + packed ptrs + `explstrc` | explosion scripts |
| `.TBL` | `n(2)` + `attackstrc[]` | |
| `.STA` | `n(2)` + `starstrc { x, y, color, speed }[]` | |
| `.SND` | `sndstrc { priority, samplerate, flags, len } + raw PCM` | |
| `.PCX` | standard 256-color | backgrounds, RLE count byte `&0xC0 == 0xC0` |
| `.PAK` | COMPRESS RLE (`<128` = run, `≥128` = literal len−127) | intro EGA pic |
| `CONFIG.HIG` | 6 key ints + sound int + highscore block (obfuscated) | |

Packed pointer = `(ptr & 0xf) | ((ptr & 0xffff0) << 12)` — 16:16 seg:off swizzle, no longer needed on modern targets.

## 5. Hardcoded Weapon Scripts (WPNPATH.C build0..15)

| Builder | Weapon / behavior |
|---|---|
| build0 | Eichhof Lager — straight rapid-fire bolts (14 px/frame) |
| build12345 | Pokal — climb + release 4 diagonal sub-shots |
| build67 | Side shots — release sub-shot then horizontal ±10 |
| build8 | Cannon — fast straight up |
| build9 | Humpe — downward back-shot |
| build1011 | V-shot — diverging pair |
| build12 | Stange — pole shot |
| build13 | Homing missile (speed 12) |
| build1415 | Pony Reflector — reflecting bullets |

## 6. Key Engine Details for Remake

- **Game loop**: fixed 20 Hz tick (`waitfortick` + `updatescreen`). Objects stepped by command data each frame → maps to a fixed-update/physics step in Phaser.
- **Entity model**: plain object pools with active flag; animation frame counter `n`, `nadd` (1 = half-speed, 2 = normal — since drawing uses `n>>1`), `OBJ_ONECYCLE` = play once then self-destroy. Translate to lightweight ECS/arrays.
- **Collision**: plain AABB (`crashtest`) on live objects; `outofwindow` bounds check vs `windowx0..y1` (0,0,319,219).
- **HUD**: score bar drawn at bottom (`BARY 211`), digits sprites, drawn on **both** pages to stay in sync. Lives displayed as digit set.
- **File manager**: one archive, load-by-name, LRU eviction → equivalent today: manifest + lazy texture/audio loading (or atlas).
- **Cheats**: `007.N1` no-lifes-lost (`CHEATLIFES`), `007.N2` max money (`CHEATMONEY`), `007.N4` instant kill (`CHEATCRASH`), bitmask OR'd.
- **Fonts**: sprites indexed by `char - ' '` (`writetext`), digits built 1-at-a-time; unicode-ready now.
- **Audio**: every sound is a short 8-bit PCM clip (voice-over is a "music/theme stand-in"). No track music in original → clone can add freely.

## 7. Porting Notes (Phaser V4 / TS)

- `sprstrc`/`objstrc`/command streams → prefab/script data (JSON), state machines, or tween timelines; no need for packed ptrs.
- Level = 7 small data files → single `level{N}.json` (foes, shots refs, explosions, attacks, starfield, sprites, sounds, description).
- Weapons = `.wpn` + `.sht` + `.sli` → one `weapons.json` (arm defs + shot path scripts).
- 20 Hz hardcoded clock → use `time`/fps-independent update with delta scaling.
- MODE-X double-buffering & tearing tricks → Phaser cameras/renderer handle it.
- Object priority (HIGH/LOW) → Phaser `depth`.
- `beer.dat` → asset pack/manifest; DB headers can be regenerated by a build script from `public/assets`.
- Reference gameplay numbers: ship (150,190), start speed 4 → 8, lives 4, levels 5, timer consts (WIN/LOSE/SHIELD), pool caps, economy formula.
