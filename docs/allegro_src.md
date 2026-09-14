# allegro_src/lastbeer-2.0 — Allegro Port Source Reference

Modern C port of The Last Eichhof to the Allegro library, downloaded to `original_game/allegro_src/lastbeer-2.0/`.

Port: **Gavin Smith, 2014** (SourceForge project <https://sourceforge.net/projects/lasteichhof/>), GPL v3 (`LICENSE.GPL`). Original DOS source released "do whatever you want" by Dany Schoch (Alpha-Helix, 1993). The port ships the original data untouched (`BEER.DAT`, 6 746 929 bytes — byte-identical to `original_game/beer_exe/BEER.DAT`), plus `CONFIG.HIG`.

Use this as the readable, line-by-line translation that resolves the terse assembly in `beer_src/`. Everything below is verified against the C source; where the port and the web remake intentionally differ, that is spelled out in §6.

## 1. File Inventory

| File | Role |
|---|---|
| `gameasm.c` | Core gameplay: `play()` 20 Hz master loop, attack-table scheduler, `keyboard()`/`fire()`, command interpreters `a_shot`/`a_foe`/`a_foeline`/`a_expl`, collisions `foehit`/`armhit`, HUD score/lives, starfield flags, A_MARK checkpoint state (`lastposition`). |
| `gameplay.c` | Level flow: `newgame()` → `initlevel(stage)` → `play()` attempts → `weaponmanager()` (shop) between levels → winner/loser + `highscore(TRUE)`. Loads per-level `.dsc .sli .snd .foe .exp .tbl .sta`. |
| `baller.c` | `main()`: cmdline (`/VGA`? no — Allegro sets it; `--fullscreen`), `error()` handler, timer install, `begin`/`end` powerup, `menu()` entry. |
| `menu.c` | Title, credits, main menu, story, options, remappable keys (`CONFIG.HIG`), `CONFIG.HIG` read/write as shorts. |
| `shop.c` | Inter-level weapon shop: money, buy/sell (75% refund), at most 2 speed-ups, extra lives, 16-px snapped placement grid, 7 items max. |
| `hiscore.c` | Top-8 highscore table + winner text; names obfuscated (`name[i] += 3*i`), XOR-scrambled on disk. |
| `xmodec.c` | Sprite-library management (`defsprite`/`killsprite`), object system (`defobject`, `moveobjectdelta`, `crashtest`, `outofwindow`), palette fades, starfield. |
| `xmodeasm.c` | Video init (320×200×8, 60 Hz, `DISPLAY_SCALE*320 × DISPLAY_SCALE*240`), page flipping, `smooth_move` (RESOLUTION-split movement), `setxmode`. |
| `fileman.c/h` | `beer.dat` DB: name → data, in-memory copy with a 1-block cache (`M_NONE`/`M_XMS` is vestigial), directory parsing. |
| `soundc.c` + `sound.h` | Sound Blaster samples via Allegro `SAMPLE`: `create_SAMPLE(bits=8, stereo=0, freq=samplerate*1000, len, data)`, `playsample`/`playloop`/`haltsound`, ADPCM decode for `SND_PACKED4` (Creative 8-bit ADPCM). |
| `support.c` | `setspeed(speed)` = `install_int_ex(settick, BPS_TO_TIMER(speed*RESOLUTION))` (80 Hz), `writetext`/`writenumber`, keyboard waits. |
| `xmodedef.c` | Zero-initialized globals (sprite/object arrays, window bounds). |
| `xmode.h` | Constants: `XMIN 0, XMAX 319, YMIN 0, YMAX 219`, `MAXSPRITES 60`, `MAXOBJS 60`, sprite header `{xs, ys, maxn}` at `data+6`, `SPR_ALIGN 0x07`, `SPR_DOUBLE 0x08`, `STAR_*`/`STARSTRC_SIZE 8`. |
| `baller.h` | Game constants/structs: `GAMESPEED 20`, `RESOLUTION 4`, `LEVELS 5`, `BARY 211`, `INTINDEXSIZE 100`, `PTRINDEXSIZE 200`, `STARLIFES 4`, `STARTSHIPSPEED 4`, `MAXSHIPSPEED 8`, flags, `armstrc`/`shotstrc`/`foestrc`/`lastposstrc`. |

## 2. Architecture

```plain
baller.c → menu → playthegame()  (gameplay.c)
                                  │
           per level:  .dsc .sli .snd .foe .exp .tbl .sta  (initlevel)
                                  │
         per attempt: lifes--, defallarms(XSTART, YSTART), play()  @ 20 Hz
             attack table (count == attack->count) → deffoe | A_GOFIELD/A_STOPFIELD/A_SOUND/A_MARK
             4 subticks: waitforsubtick → updatescreen → keyboard() (unless terminate==2)
                         → foehit() → nbigboss==0? win → armhit()? lose
                         → dispscore() → a_shot() → a_foe()
             a_expl(); count += frameinc; invincible--
```

- **Clock**: 20 Hz game frames (`GAMESPEED`) × 4 subticks (`RESOLUTION`) = an 80 Hz timer. `smooth_move(diff, subtick)` = `diff/4` + one extra pixel on the first `diff%4` subticks, so movement is evenly split.
- **`play()` reset per attempt** (gameasm.c): `score/nbigboss/nattacks/count/attack` restored from `lastposition` (set by `setplayposition` and refreshed by every `A_MARK`), `invincible = SHIELD_CTIME`, `frameinc = 1`, `terminate = 0`.
- **State** (`terminate`): 0 = playing, 1 = win (all end-level monsters dead, `WIN_CTIME` tail, ship still controllable), 2 = lose (ship destroyed, `LOSE_CTIME`, `keyboard()` skipped so ship is inert). Loop runs while `invincible != 0 || terminate == 0`.
- **Objects**: fixed pools, `object == -1` = free. `MAXARMS 7`, `MAXFOES 26`, `MAXSHOTS 30`, `MAXEXPLS 8`.
- **Collision**: AABB `crashtest`; `outofwindow` = outside `windowx0..x1, windowy0..y1` = 0..319 × 0..211 (play area above the bottom bar `BARY 211`).
- **HUD**: bottom bar, `BARSCOREX 114`, `BARSCOREY 212`, digit sprites.

## 3. Gameplay Reference (authoritative)

### Ship / Eichli

- Spawn **XSTART 150, YSTART 190**; speed `STARTSHIPSPEED 4` → `MAXSHIPSPEED 8` (+2 per `W_SPEEDUP`, at most 2).
- `STARLIFES 4`, but `playthegame` does `lifes--` before each attempt → effectively 3 fresh attempts per level. The web's `lives: 3` matches this.
- Movement = `shipspeed` px/frame, split over the 4 subticks; fire key checked only on subtick 0.

### Level flow (`playthegame`)

`lifes--` → `showplayfield` → `defallarms` → `play()` → retry while `!feedback && lifes > 0` → on win `lifes++`, `shutlevel`, `stage++` → `weaponmanager()` (shop) between levels → winner/loser → `highscore(TRUE)`. The last level (`stage == LEVELS`) breaks out regardless.

`initlevel` loads the 7 `.dsc .sli .snd .foe .exp .tbl .sta` files, `defstarfield` + `gostarfield`, and `score += level.descript->score; money += level.descript->money`.

### Fixed timers (frames @ 20 Hz)

```plain
WIN_CTIME    100 frames = 5 s   win tail, gameplay continues, ship fires
LOSE_CTIME    60 frames = 3 s   death animation, world continues, ship frozen
SHIELD_CTIME  70 frames = 3.5 s invincibility at every attempt start
```

The web uses snappier `WIN_MS 2500 / LOSE_MS 1200 / SHIELD_MS 2500` — deliberate tuning, see §6.

### Fire cadence

`fire(what)`: arm fires when `!periodcnt--` then `periodcnt = period`, i.e. **every `period + 1` frames**. Web `period` (ms) = `(DOS period + 1) * 50` — verified for all 9 weapons: lager 200, pony/barbara 250, dunkel 300, stange 350, can33 350, chuebeli 300, pokal 1050, kanone 450.

### Weapons (`README`, price, period/power)

`WEAPONS.WPN/.SHT/.SLI` loaded once in `newgame`; `MAXARMS 7`. `W_ISWEAPON 0x8000`, `W_SPEEDUP 0x0001`, `W_EXTRALIFE 0x0002`.

| Weapon | Price | Period/Power |
|---|---|---|
| EICHHOF LAGER 58CL | — | 3 / 2 |
| STANGE | 3.00 | 6 / 3 |
| PONY | 3.35 | 4 / 2 |
| BARBARA BRAEU | 3.20 | 4 / 2 |
| DUNKEL | 3.00 | 5 / 2 |
| CAN 33CL | 2.40 | 6 / 2 |
| CHUEBELI | 2.60 | 5 / 3 |
| POKAL | 4.00 | 20 / 6 |
| XENON 2 CANNON | 5.40 | 8 / 6 |

### Money (shop.c / weaponmanager)

`deltamoney = ((score - scoreold + 1500) / 2500) * 5`, where `scoreold` is the score before the level's `.dsc` bonus was added. Sell refunds `cost * 3/4`. Web `moneyForLevel` matches.

### Attack table (`.tbl`)

`attackstrc { count(frame), x, y, foe }` sorted by `count`. `play()` spawns when `count == attack->count`. Command entries have `foe & 0xfff0 == A_COMMAND 0x8000`: `A_GOFIELD 0x8000`, `A_STOPFIELD 0x8001`, `A_SOUND 0x8002`, `A_MARK 0x8003`. `A_MARK` snapshots `lastposition { score, nattacks, attack, nbigboss, count }` — the death-revival checkpoint.

### Foe flags (`foestrc`)

```plain
FOE_ENDLEVEL   0x01  big boss; foehit: decrements nbigboss when it dies
FOE_INVINCIBLE 0x02  harm-free (shots die on contact, foe keeps shield)
FOE_TRANSPARENT 0x04 shots pass through (foehit skips it entirely)
FOE_STOPCOUNT  0x08  frameinc=0 while it lives → attack counter pauses
FOE_PATH       0x10  path follower
FOE_LINE       0x20  aimed projectile (Bresenham toward ship/release point)
```

### Foe command set (path words)

```plain
FOEENDPATH       0x8000   destroy foe
FOECHANGESPRITE  0x8001   +1 word sprite index
FOERELEASEFOE    0x8002   +3 words: foe #, dx, dy
FOECYCLEPATH     0x8004   jump to saved FOEMARK, reset position (infinite loop)
FOEMARK          0x8005   save path pointer + current coords
FOESOUND         0x8006   +1 word sample index
```

Movement words are `(dx, dy)` pairs, one per 20 Hz frame; `smooth_move` splits each across subticks.

### Shot command set (shot path, `WPNPATH.C` output)

```plain
SHOTEND        0x8000   destroy shot
SHOTRELEASE    0x8001   +1 shot # → spawn sub-shot at current position, continue
SHOTHOMING     0x8002   home: FIRST eligible foe (skips invincible/transparent),
                        slew dx/dy ±1 per frame toward it, keep velocity otherwise
SHOTREFLECT    0x8003   bounce within windowx0..x1 × windowy0..y1
```

A sub-shot released by another shot is flagged `go=0` and holds one frame before it starts moving (`defshot` with a parent pointer).

### Explosions

`explstrc` scripts: `EXPLEND 0x8000`, `EXPLNEW 0x8001`, `EXPLWAIT 0x8002`, `EXPLSOUND 0x8003`, `EXPLREMOVEOBJ 0x8004`, `EXPLRELEASEFOE 0x8005`, `EXPLNEWPATH 0x8006`. The web plays a single DOS explosion anim instead (see §6).

### Collisions / scoring

- `foehit`: transparent foes skipped; invincible foes zero the shot's power; otherwise **symmetric exchange** `tmp = shot.power; shot.power -= foe.shield; foe.shield -= tmp`. A shot with leftover power pierces on. On kill: `score += foe.score` (raw signed — a boss can subtract!), `defexpl`, `nbigboss--` if `FOE_ENDLEVEL`, `frameinc = 1` if `FOE_STOPCOUNT`.
- `armhit`: runs only when `!invincible`; checks **every** foe (including transparent) and every enemy shot (`FOE_LINE` foes) against the ship; on hit explodes the bottle, destroys every weapon object (`MAXARMS`), returns 1.
- Win: `nbigboss == 0` after `foehit` each subtick → `nbigboss = 1; invincible = WIN_CTIME; terminate = 1`.

### `nbigboss` and `.dsc` kings

`setplayposition(.., level.descript->nbigboss)` seeds `nbigboss` from the `.DSC`. The data's value equals the number of scheduled (attack-table) spawns of `FOE_ENDLEVEL`-flagged foes — verified per level (L0 `EASY START` = 13 bomber drops, L1–L3 = 1/1/3 boss spawns, L4 = 1). **Level 4 quirk**: no `FOE_ENDLEVEL`-flagged foe exists in `LEVEL4.FOE`, yet `.dsc` says `nbigboss = 1` — the final boss is a huge-shielded foe with a **negative score** (`score = -25536`). The web renders this with `roleFor`: `flag & 0x01 || score < 0 → "boss"`, so level 4 ends when the scheduled boss dies exactly like the stock game. Levels 0–3's boss counts are re-derived purely from the flag and match `.dsc`.

### Hiscore & config

`MAXENTRIES 8`, name length 20, display positions `NOCP 15` / `NOCW 33`; default table starts at 81000 `ATOM MUELL` down to 1 `TRITONE`; winner text "EIN PROSIT AUF ALPHA-HELIX". Names are encoded `name[i] += 3*i`; `CONFIG.HIG` holds 6 short keys (up/down/left/right/fire/pause), sound on/off, and the scram- bled score table in `LOCALSTATEDIR`.

## 4. Data Formats Confirmed

Matches `docs/beer_dat.md`. Highlighted findings:

- `beer.dat` directory entry = 24 bytes at offset `34 + i*24` (counting the 30-byte header + mode/count words): `name[14]`, `size u32 @+14`, `flags u16 @+18`, `fptr u32 @+20` — exactly what `scripts/extract-sprites.mjs` parses.
- `sndstrc { priority, samplerate (kHz), flags, len(long), data[] }`; `SND_PACKED4 = 0x0001` = Creative 8-bit ADPCM; Allegro sample created at `samplerate * 1000` Hz, 8-bit mono.
- `.dsc` = `{ level, text[40], nbigboss (short @42), score (short @44), money (short @46), flags }`.
- `.sli/.foe/.exp` use packed pointers (16:16 seg:off swizzle; `extract-sprites.mjs` `unpackPtr` + `*16`), resolved against the file base.
- EGA intro: 640×350 bitmap, 3-bit palette `set_color(8*br + 4*r + 2*g + b, rgb)`; RLE: count `< 128` = run of `count+1` identical bytes, `≥ 128` = `count - 127` literal bytes.

## 5. The Port Versus the ASM Original

The Allegro port is a faithful, readable translation of `GAMEASM.ASM` — identical command values, flags, timers and the `play()` structure, in C. It removes the memory-model indirection (packed pointers, XMS, VRAM page tricks) and the 3-frame position history in favor of smooth per-subtick deltas. Use `gameasm.c` whenever `GAMEASM.ASM` is cryptic.

## 6. Ported to the Web — Verified Matches and Fixes

Verified **equivalent** (no action needed):

| Web behavior | DOS reality |
|---|---|
| `run.ts` ship speed 240 px/s, speed-up step 120 px/s, cap 2 | `shipspeed 4→8` px/frame @ 20 Hz = 240→480 px/s |
| `lives: 3` | `STARLIFES 4` − 1 per attempt |
| `GRID 12` | 4 px placement grid × web scale 3 |
| weapon `period`/`velocity`/shot indices (`shot-<n>` from `WEAPONS.SLI`) | `(period + 1) * 50`, dos deltas ×3 scaled, `shotstrc.sprite` |
| `moneyForLevel`, `SELL_RATE 3/4` | `((delta + 1500)/2500)*5`, refund 3/4 |
| `collideShotVsEnemies` symmetric exchange, piercing | `foehit` `tmp` exchange |
| transparent foes skipped by shots; invincible foes kill the shot | `foehit` `FOE_TRANSPARENT` skip, `FOE_INVINCIBLE` power=0 |
| boss count = scheduled `role === "boss"` spawns | `nbigboss` seeded from `.dsc`, decremented per `FOE_ENDLEVEL` kill (levels 0–3) |
| `READ README`: nine DOS arms + `.SHT` indices | `shotstrc.sprite` → global `intindex` |
| enemy line shots (Bresenham, `speed*60` px/s on dominant axis) | `a_foeline` speed steps/tick |
| enemy shots destroyed by player shots (shot-vs-shots) | `foehit` symmetric exchange between shots and enemies (shots are foes too) |
| death cull margin (±120 / −400 / 2× play width) | `outofwindow` window 0..319 × 0..211 (+ sprite size) |

**Fixed to match the original** (this round):

1. **Fire during shield** — DOS keeps `keyboard()` (movement + `fire()`) and the attack table running for the whole `SHIELD_CTIME`; the web froze the world and forbade firing. `updateShield` now runs the full `updatePlay` step (world, fire, spawns; the ship remains unharmed — `collide()` skips ship checks outside `state === "play"`). This also makes the opening seconds and every death-retry play like the stock game.
2. **Homing target selection** — DOS `SHOTHOMING` picks the first foe that is *not* `FOE_INVINCIBLE | FOE_TRANSPARENT`. `nearestEnemy` now skips invincible and transparent foes, so DUNKEL stops burning its shots on an invincible miniboss (e.g. level 1's `l1-f34`) or chasing un-hittable ghosts. (Keeping "nearest" instead of DOS's "first" is the deliberate improvement.)
3. **`FOE_STOPCOUNT`** — the extractor now emits `stopcount: true` for `FOE_ENDLEVEL`-free foes carrying flag `0x08` (level 1 `f16`, level 2 `f2`/`f59`, level 3 `f5` — all minibosses). DOS sets `frameinc = 0` while such a foe lives, freezing the attack counter; `spawnWaves` now pauses entirely while a stopcount foe is alive, then resumes when it dies. Verified against `BEER.DAT` that each gates dozens of later spawns (e.g. level 2's first miniboss gates 83 foes + a checkpoint mark).

**Deliberate deviations (documented, left as-is):**

- Timers (`SHIELD/LOSE/WIN`) are snappier web values, and the win state freezes the level instead of DOS's 100-frame playable tail.
- Score is **not** rewound on death: DOS restores `score` to the last `A_MARK`; the web keeps kill score across checkpoints.
- Ship start (480, 650) instead of DOS `(150, 190)` — the HUD moved to the top, so DOS coordinates shift by the bar height (`*3` scale); the web re-centers for the modern playfield.
- Starfield is two tiled sprites at fixed speeds, not 80 individually-seeded stars; field-on/off per level still matches `A_GOFIELD`/`A_STOPFIELD`.
- Explosion scripts (`explstrc`) collapse to one DOS `explosion` animation.
- Shot `SHOTRELEASE` wait (`go` flag) and `SHOTREFLECT` exact window bounds are approximated (`release.after` timings; bounce between `TOP`..`BOTTOM` instead of 0..211).
- `FOEMARK` inside a foe path and `A_SOUND` attack entries are dropped (sound cues are level-level `LEVEL_CUES`); path `FOEMARK` is only meaningful for `FOECYCLEPATH`, which the extractor keeps as `{ t: "loop" }`.
