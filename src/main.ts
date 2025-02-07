import { Game as MainGame } from './scenes/Game'
import { Menu } from './scenes/Menu'
import { Boot } from './scenes/Boot'
import { Game, Scale, Types } from 'phaser'

// const aspectRatio = window.innerHeight / window.innerWidth
const config: Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 1600,
  height: 720,
  // height: 1600 * aspectRatio,
  parent: 'game-container',
  backgroundColor: '#028af8',
  scale: {
    mode: Scale.FIT,
    autoCenter: Scale.CENTER_BOTH,
  },
  scene: [Boot, Menu, MainGame],
}

export default new Game(config)
