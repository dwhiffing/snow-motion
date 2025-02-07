import { Scene } from 'phaser'

export class Menu extends Scene {
  scoreText: Phaser.GameObjects.Text

  constructor() {
    super('Menu')
  }

  create() {
    this.scoreText = this.add
      .text(
        this.cameras.main.width / 2,
        this.cameras.main.height / 2,
        'Click to start',
        {
          color: '#fff',
          fontSize: 28,
        },
      )
      .setOrigin(0.5, 0.5)

    this.input.once('pointerdown', () => this.scene.start('Game'))
  }
}
