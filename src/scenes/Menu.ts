import { Scene } from 'phaser'

export class Menu extends Scene {
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
              if (
                !this.sys.game.device.os.desktop &&
                !this.scale.isFullscreen
              ) {
                this.scale.startFullscreen()
              }
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
        this.add
          .text(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2,
            this.score > 0 ? `${this.score}` : 'Snow Motion',
            { color: '#028af8', fontSize: 140, fontFamily: 'rolling-beat' },
          )
          .setOrigin(0.5, 0.5)
          .setAlign('center')
          .setPadding(30)

        this.add
          .text(
            this.cameras.main.width / 2,
            this.cameras.main.height / 2 + 120,
            this.score > 0 ? 'Click to try again' : 'Click to start',
            { color: '#028af8', fontSize: 64, fontFamily: 'rolling-beat' },
          )
          .setOrigin(0.5, 0.5)
          .setAlign('center')
          .setPadding(30)
      },
    })
  }
}
