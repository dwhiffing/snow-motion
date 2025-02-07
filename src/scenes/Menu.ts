import { Scene } from 'phaser'

export class Menu extends Scene {
  scoreText: Phaser.GameObjects.Text
  score: number
  constructor() {
    super('Menu')
  }

  init(ops: { score?: number }) {
    this.score = ops.score ?? 0
  }

  create() {
    this.cameras.main.setBackgroundColor(0xffffff)
    const circle = this.add
      .circle(
        this.cameras.main.width / 2,
        this.cameras.main.height / 2,
        this.cameras.main.width,
        0x028af8,
      )
      .setDepth(10)
    this.tweens.add({
      targets: circle,
      scale: 0,
      duration: 1000,
      ease: 'Quad.easeInOut',
      onComplete: () => {
        this.input.once('pointerdown', () => {
          this.tweens.add({
            targets: circle,
            scale: 1,
            duration: 1000,
            ease: 'Quad.easeInOut',
            onComplete: () => {
              this.scene.start('Game')
            },
          })
        })
      },
    })

    // @ts-ignore
    WebFont.load({
      custom: {
        families: ['rolling-beat'],
      },
      active: () => {
        this.scoreText = this.add
          .text(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2,
            'Click to start',
            { color: '#028af8', fontSize: 82, fontFamily: 'rolling-beat' },
          )
          .setOrigin(0.5, 0.5)
          .setAlign('center')
          .setPadding(30)
        if (this.score > 0) {
          this.scoreText.setText(`${this.score}\nClick to try again`)
        }
      },
    })
  }
}
