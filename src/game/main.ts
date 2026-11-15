import { AUTO, Game, Scale, type Types } from "phaser"
import { PLAY } from "./data/playfield.ts"
import { Boot } from "./scenes/Boot.ts"
import { Game as MainGame } from "./scenes/Game.ts"
import { Menu } from "./scenes/Menu.ts"
import { Shop } from "./scenes/Shop.ts"

// Find out more information about the Game Config at:
// https://docs.phaser.io/api-documentation/typedef/types-core#gameconfig
const config: Types.Core.GameConfig = {
  type: AUTO,
  width: PLAY.w,
  height: PLAY.h,
  parent: "game-container",
  backgroundColor: "#05060d",
  fullscreenTarget: "app",
  scale: {
    mode: Scale.FIT,
    autoCenter: Scale.CENTER_BOTH,
  },
  input: {
    activePointers: 3,
  },
  scene: [Boot, Menu, Shop, MainGame],
}

const StartGame = (parent: string) => new Game({ ...config, parent })

export default StartGame
