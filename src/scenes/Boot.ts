import { Scene } from 'phaser'

export class Boot extends Scene {
  constructor() {
    super('Preloader')
  }

  init() {
    this.cameras.main.setBackgroundColor(0xffffff)
    this.add.rectangle(512, 384, 468, 32).setStrokeStyle(1, 0x028af8)
    const bar = this.add.rectangle(0, 64, 10, 128, 0x028af8).setOrigin(0, 0)

    this.load.on('progress', (progress: number) => {
      bar.width = this.cameras.main.width * progress
    })
  }

  preload() {
    this.load.script(
      'webfont',
      'https://ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js',
    )
  }

  create() {
    this.scene.start('Menu')
  }
}
