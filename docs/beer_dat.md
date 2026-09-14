# Reading graphics from `BEER.DAT`

Game downloaded from <https://archive.org/download/TheLastEichhof/beer11.zip> into `original_game/beer_exe/`.

Reference for decoding the original DOS assets bundled in `original_game/beer_exe/BEER.DAT`
(`ALPHA-HELIX COMBINER VER 3.3` archive). Source of truth: `original_game/beer_src/COMBINER.C`,
`original_game/beer_src/FILEMAN.C`, `original_game/beer_src/SLIB.C`, `original_game/beer_src/XMODEC.C`, `original_game/beer_src/XMODE.H`.

The extraction lives in [`scripts/extract-sprites.mjs`](../scripts/extract-sprites.mjs)
and is driven by [`scripts/enemy-map.json`](../scripts/enemy-map.json). Run it with:

```sh
node scripts/extract-sprites.mjs            # write PNGs + contact sheet
node scripts/extract-sprites.mjs --catalog  # also print an ASCII/colour catalog
```

## 1. Archive layout

All integers are little-endian.

```plain
offset 0   30 bytes   header text "ALPHA-HELIX COMBINER VER 3.3\x1a"
offset 30  u16        mode
offset 32  u16        nfiles
offset 34  nfiles × 24 bytes   directory entries
then                 concatenated file data blocks
```

Each directory entry (`struct filestrc`, 24 bytes with Turbo C default alignment):

| field   | type     | size | notes                        |
|---------|----------|------|------------------------------|
| `name`  | char[14] | 14   | NUL-padded 8.3 uppercase name |
| `size`  | u32      | 4    | byte length of the data block |
| `flags` | u16      | 2    | cache flags (irrelevant here) |
| `fptr`  | u32      | 4    | absolute file offset of data  |

Names are looked up case-insensitively; data for entry `i` is
`buf[fptr : fptr + size]`.

## 2. Sprite libraries (`.SLI`)

Enemy/ship/explosion art lives in the per-level sprite libraries:

| file         | contents                                                    |
|--------------|-------------------------------------------------------------|
| `WEAPONS.SLI`| ship (`index 0`) + shop weapons and their shots             |
| `LEVEL0.SLI` | level 1 ("EASY START")                                      |
| `LEVEL1.SLI` | level 2 ("FELDSCHLOESSCHEN")                                |
| `LEVEL2.SLI` | level 3 ("OH WEISSBIER")                                    |
| `LEVEL3.SLI` | level 4 ("NO MORE COCKTAILS")                               |
| `LEVEL4.SLI` | level 5 ("THE DAY AFTER")                                   |

Note the off-by-one: DOS `LEVEL0` is the game's level 1.

Layout (`original_game/beer_src/SLIB.C` `readslib`/`saveslib`):

```plain
offset 0   u16   nsprs
offset 2   nsprs × 6 bytes   directory: { packedPtr u32, flags u16 }
then        sprite data blocks
```

### 2.1 Packed far pointers

The 32-bit `packedPtr` is a *normalised far pointer* produced by
`saveslib`:

```plain
packed = (ptr & 0x000f) | ((ptr & 0xffff0) << 12)
```

To recover the byte offset **relative to the start of the directory block**
(i.e. relative to file offset 2), decode the linear address:

```plain
off = (packed >>> 16) * 16 + (packed & 0xffff)
```

`sTableEntry.sprite = dirBase + off`, where `dirBase` is the far pointer to
the directory (file offset 2). All `off` values are within the block.

### 2.2 Sprite structure

At `2 + off` sits `struct sprstrc` (`original_game/beer_src/XMODE.H`):

```plain
u16 xs     width in pixels
u16 ys     height in pixels
u16 maxn   number of animation frames
u8  data[xs * ys * maxn]
```

`data` is **one byte per pixel** (a palette index), stored row-major,
frame after frame:

```plain
data[ (frame * ys + y) * xs + x ] = colour index
```

`sprstrc`-relative size = `6 + xs*ys*maxn`.

### 2.3 Flags

`flags` is copied from the directory entry:

| bit           | value | meaning                                        |
|---------------|-------|------------------------------------------------|
| `SPR_ALIGN`   | 0x07  | x-alignment mask (`defsprite`: `align = 4-(f&7)`) |
| `SPR_DOUBLE`  | 0x08  | each animation frame is shown twice (10 fps)   |

Alignment only affects the offscreen blit, not the pixel data. `SPR_DOUBLE`
matters for animation speed, see §4.

## 3. Palette

Gameplay uses the standard VGA palette. It is the 768-byte `standardpal`
array in `original_game/beer_src/XMODEC.C` (`setstandardpalette()` copies it into `palette`
and loads DAC registers). Each component is **6-bit (0–63)**. Convert to 8-bit
with the standard expansion `(v << 2) | (v >> 4)` (equivalently `round(v*255/63)`).

`standardpal` is parsed straight from `XMODEC.C` by the extraction script, so
there is a single source of truth. Index `0` is transparent (skip when blitting).

## 4. Animation timing

`XMODEASM.ASM updatescreen` advances every object with:

```plain
n += nadd;              // nadd = 2 normally, 1 when SPR_DOUBLE
draw frame n >> 1;      // so SPR_DOUBLE shows each frame twice
```

The game ticks at ~20 Hz, therefore:

- normal sprite → **20 fps** (50 ms/frame)
- `SPR_DOUBLE` → **10 fps** (100 ms/frame)

The ship (`WEAPONS.SLI[0]`, 10 frames, flags `0x2`) and one-shot explosion
objects animate the same way. Explosions are spawned with `OBJ_ONECYCLE`
(`GAMEASM.ASM a_expl`/`defobject`), so they play through `maxn` frames once and
self-destroy. `EXPLWAIT` commands in the `.EXP` scripts simply consume one tick.

## 5. Enemy metadata (`.FOE`, `.TBL`, `.EXP`, `.DSC`)

Which sprite a foe uses is in the level's `.FOE` library (`struct foestrc`,
`original_game/beer_src/BALLER.H`): `{ flags u16, shield u16, score u16, expl u16,
sprite u16, speed u16, path[] }`. `sprite` indexes the level `.SLI`.
Paths end with `0x8000`; commands `0x8001 SPRITE(+1 word)`, `0x8002
RELEASE(+3 words)`, `0x8004 CYCLE`, `0x8005 MARK`, `0x8006 SOUND(+1 word)`, else
a `(dx,dy)` pair.

Useful flags: `0x01 ENDLEVEL` (big boss), `0x02 INVINCIBLE`, `0x04 TRANSPARENT`,
`0x10 PATH`, `0x20 LINE` (the sprite is a projectile, not an enemy). Not every
end-of-level monster sets `ENDLEVEL`; the level-5 boss instead carries a
**negative score**, so treat `ENDLEVEL || score < 0` as a boss.

`.TBL` (`struct attackstrc { count u16, x i16, y i16, foe u16 }`) is the timed
spawn table. `count` is the frame number at ~20 Hz; `foe < 0x8000` is a `.FOE`
index, otherwise `foe` is a command: `0x8000 GOFIELD`, `0x8001 STOPFIELD`,
`0x8002 SOUND` (arg in `x`), `0x8003 MARK` (restart checkpoint). `.DSC`
(`descrstrc { level i16, text[40], nbigboss i16, score u16, money u16, flags u16 }`)
holds the level name and bonus.

Explosion sprites (from `.EXP` `EXPLNEW`): `LEVEL0#3`, `LEVEL1#10` (48×44, 5
frames), `LEVEL2#0`, `LEVEL3#0`, `LEVEL4#0` (54×36, 6 frames). Exclude these and
the `LINE` shot sprites when picking enemy art.

## 6. Web game rosters and schedules

The remake now mirrors the DOS rosters 1:1 (web level *n* = DOS `LEVEL{n-1}`).
`scripts/extract-sprites.mjs` walks `.TBL` + `.FOE` (including minions released
from foe paths) and emits one `FoeKind` per referenced, non-projectile foe:

- `src/game/data/foeRosters.ts` — `FoeKind` union, `FOES` (`texture`, `shield`,
  `score`, `role`, `invincible`, `transparent`, `path`) and `ROSTERS`
  (per-level `name`, `bonusScore`, `bonusMoney`, `spawns`, `checkpoints`,
  `bosses`).
  - kind id = `l{level}-f{foeIndex}`, texture = `l{level}-s{spriteIndex}` (shared
    when several foes reuse a sprite).
  - role: `boss` if `ENDLEVEL || score < 0`, else `miniboss` if `shield >= 15`,
    else `chaff`. Shields and scores are the raw signed `.FOE` values (no clamp).
  - `path` is the foe's `.FOE` path replayed into web steps (`FoePathStep`): runs
    of identical `(dx,dy)` frames merge into one `go` (`dx`/`dy` ×3,
    `speed = hypot(dx,dy)*60` web px/s, i.e. one 20 Hz frame preserved), plus
    `mark`/`loop` (from `CYCLE`), `sprite` (from `CHANGESPRITE`) and
    `release`/`shot` (from `RELEASEFOE`, offsets ×3). Decoding stops at
    `END`/`CYCLE`; `CYCLE` loops back to the last `MARK` and resets the position.
  - a `RELEASEFOE` whose target is a `FOE_LINE` (`0x20`) foe becomes a `shot`
    (`speed` = that entry's `speed`); one whose target is a fightable
    chaff/miniboss becomes a `release` minion. Self-splits, invalid targets and
    boss releases are skipped. `CHANGESPRITE` targets are emitted as sprites too.
  - spawn schedule: `at = count / 20`, `x = x*3`, `y = y*3`; `.TBL` commands map
    to `fieldOn`/`fieldOff`/`mark`; checkpoints are the `MARK` times before the
    first boss.
- `public/assets/enemies/<key>.png` — horizontal animation strip
  (`xs*maxn` × `ys`) scaled 3× nearest-neighbour (original 320×240 → web 960×720).
  Loaded at runtime as `assets/enemies/<key>.png` (relative, matching `base: "./"`).
- `public/assets/enemies/contact.html` — labelled contact sheet.
- `src/game/data/enemySprites.ts` — generated `SPRITE_SHEETS` metadata consumed by
  `Boot.ts` (`frameWidth`/`frameHeight`/`frames`/`frameRate`).

`scripts/enemy-map.json` holds `scale`, the fixed `extras` (`ship`,
`explosion`), the `weaponSprites` map (shop bottles → `wpn-<id>`) and the
`shotSprites` list (`WEAPONS.SLI` indices 9–21 → `shot-<n>` projectile art).
Re-run `node scripts/extract-sprites.mjs` after changing it or the DOS data.

The shot sprite index is `shotstrc.sprite` in `WPNPATH.C` (`shothdr[s].sprite`),
and `shotstrc.shotx`/`shoty` is the release offset added to the mount position
(`defshot` in `GAMEASM.ASM`); `weapons.ts` stores both (`sprite`, `ox`/`oy`).
Sprites `shot-9`, `shot-16` and `shot-17` are animated (8 and 6 frames).

## 7. Sound (`.SND`)

Digitised sound effects and music live in `.SND` files. There are two layouts.

### 7.1 Single sample

Used by the standalone files (`GO`, `CLOSE`, `MENU`, `SELL`, `BUY`, `TOD`,
`BLICK`, `LONGTIME`, `TITLE`, `HS`). The whole file is one `sndstrc`
(`original_game/beer_src/SOUND.H`):

```plain
offset 0   i16   priority      playback priority (higher wins)
offset 2   i16   samplerate    sample rate in kHz
offset 4   u16   flags         SND_PACKED4 (0x0001) => 4-bit ADPCM
offset 6   u32   len           number of sample bytes that follow
offset 10  u8    data[len]     sample data
```

### 7.2 Sample library

Used by the level sound banks (`LEVEL0..4.SND`). Layout mirrors the sprite
library: a count, then self-relative far pointers to `sndstrc` blocks.

```plain
offset 0   u16   count
offset 2   count × { u16 off, u16 seg }   far pointers
then       sndstrc blocks
```

Each pointer is a linear far pointer (`seg*16 + off`) relative to the pointer
array at file offset 2:

```plain
at = 2 + seg*16 + off
```

`GAMEPLAY.C initlevel` loads the bank as `level.sound = (sndstrc**) (ptr+1)`
(`ptr` is `int*`, so `+1` skips the 2-byte count) and adds the array address to
every entry.

### 7.3 Sample rate

`SOUND.ASM setsamplerate` programs the Sound Blaster time constant as
`TC = 256 - (1000 / samplerate)`, i.e. the stored value is the rate in **kHz**;
the real playback rate is `samplerate * 1000` Hz.

### 7.4 Sample data

`flags` is `0` for raw 8-bit PCM or `SND_PACKED4` (`0x0001`) for 4-bit Creative
ADPCM. All data is **mono, unsigned 8-bit** at the decoded rate.

- **Raw** (`flags = 0`): `len` unsigned 8-bit samples, straight from `data`.
- **Packed** (`flags = 1`): Sound Blaster command `0x75` (4-bit ADPCM *with*
  reference). `data[0]` is the initial 8-bit reference; each following byte
  holds two 4-bit deltas (high nibble first). `len` counts packed bytes, so the
  decoded length is `1 + (len-1)*2` samples. `playsample` sends `0x75` for the
  first DMA block and switches to `0x74` for later blocks, so the reference and
  step state persist across the whole sample.

  Decoding follows the DOSBox-X `decode_ADPCM_4_sample` reference:

  ```plain
  reference = data[0]; scale = 0
  for each byte b in data[1..]:
      for nibble in [b>>4, b&0xf]:
          samp = clamp(nibble + scale, 0, 63)
          reference = clamp(reference + SCALE_4[samp], 0, 255)
          scale = (scale + ADJUST_4[samp]) & 0xff
          emit reference
  ```

  `SCALE_4`/`ADJUST_4` are the standard Sound Blaster ADPCM-4 tables (see
  `scripts/extract-sounds.mjs`).

### 7.5 Where sounds are triggered

Level sound indices are referenced from three places:

- `A_SOUND` (`0x8002`) in the `.TBL` attack table — `attackstrc.x` is the sound
  index; used for level intro/boss cues.
- `FOESOUND` (`0x8006`) in a `.FOE` path — the next word is the sound index;
  played when an enemy releases a shot/minion.
- `EXPLSOUND` (`0x8003`) in an `.EXP` script — the next word is the sound index;
  played as an explosion starts.

Standalone files are played directly (`GAMEPLAY.C`, `MENU.C`, `SHOP.C`,
`INTRO.C`, `HISCORE.C`): `go` on level start, `menu`/`close` for menu
enter/exit, `buy`/`sell` in the shop, `tod` on the end logo, `blick` during the
intro, `longtime` on the credits screen, `title` and `hs` as the title/highscore
music (streamed with `playfile`).

### 7.6 Extraction

[`scripts/extract-sounds.mjs`](../scripts/extract-sounds.mjs) decodes every
`.SND` into `public/assets/sounds/<key>.ogg` (OGG Vorbis via `ffmpeg-static`),
writes `src/game/data/sounds.ts` (manifest + per-level cue keys) and an
`audition.html` page. Run it with:

```sh
node scripts/extract-sounds.mjs            # write OGGs + manifest
node scripts/extract-sounds.mjs --catalog  # also print metadata + usage
```
