# Last Eichhof Rewrite

Rewrite of the 1993 MS-DOS game **The Last Eichhof** in modern web tech stack

Hosted at [entorb.net/last-eichhof/](https://entorb.net/last-eichhof/)

## Resources of original MS-DOS Game

- Wikipedia [EN](https://en.wikipedia.org/wiki/The_Last_Eichhof) / [DE](https://de.wikipedia.org/wiki/The_Last_Eichhof)
- [Source code](http://ftp.lanet.lv/ftp/mirror/x2ftp/msdos/programming/gamesrc/beersrc.zip)
- [Full game](https://archive.org/download/TheLastEichhof/beer11.zip) (including graphics and audio)

## Tech Stack

- TypeScript
- Phaser V4

### Tech Stack preparation steps

- `pnpm create @phaserjs/game@latest`
- `pnpm self-update`
- `pnpm approve-builds`
- `pnpm run dev`
- `pnpm add -D @biomejs/biome`
- `pnpm exec biome init`
- `pnpm exec biome check --write`

### Code Checks

Biome, Knip, CSpell, see `scripts/chk_*.sh`

[SonarQube](https://sonarcloud.io/summary/overall?id=entorb_last-eichhof&branch=main)

## Debug keys

- `J` — jump to the next checkpoint of current level
- `G` — toggle god mode: invulnerability, high damage, $10000
