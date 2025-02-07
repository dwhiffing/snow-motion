import { Scene } from 'phaser'
import { Body, Circle, Edge, Shape, World } from 'planck'
import simplify from 'simplify-js'

const scale = 10
const gravity = 20
const initialX = 150 / scale
const initialY = 350 / scale

type Vector = { x: number; y: number }
interface IShape extends Shape {
  m_vertex1: Vector
  m_vertex2: Vector
}

export class Game extends Scene {
  world: World
  ground: Body
  ball: Body
  hillCoords: Vector
  graphics: Phaser.GameObjects.Graphics
  slopeBag: number[]
  ballRolling: boolean
  score: number
  scoreText: Phaser.GameObjects.Text
  i: number
  i2: number

  constructor() {
    super('Game')
  }

  create() {
    this.world = new World({ x: 0, y: gravity })

    this.i = 0
    this.i2 = 0
    this.ballRolling = false
    this.ground = this.world.createBody()
    this.hillCoords = { x: 0, y: 0 } as Vector
    this.graphics = this.add.graphics()
    this.slopeBag = []

    this.ball = this.world.createBody({
      angularDamping: 0.18,
      linearDamping: 0.1,
      position: { x: initialX, y: initialY },
    })
    this.ball.setDynamic()

    this.world.on('begin-contact', () => {
      this.ballRolling = true
    })

    this.world.on('end-contact', () => {
      this.ballRolling = false
    })

    this.input.keyboard!.on('keydown', (a: any) => {
      if (a.which === 32) {
        if (this.i2 > 10) {
          this.world.setGravity({ x: 0, y: gravity * 3 })
          this.i2 -= 8
        }
      } else if (a.which === 82) {
        this.scene.start('Game')
      }
    })

    this.input.keyboard!.on('keyup', () => {
      this.world.setGravity({ x: 0, y: gravity })
    })

    this.generateTerrain()

    this.scoreText = this.add
      .text(10, this.cameras.main.height - 10, '0', {
        color: '#028af8',
        fontSize: 28,
      })
      .setOrigin(0, 1)
      .setScrollFactor(0)
    this.score = 0
  }

  update(_t: number, dt: number) {
    this.world.step((dt / 1000) * 1.5)
    this.world.clearForces()

    let pos = this.ball.getPosition()
    this.cameras.main.setScroll(pos.x * scale - 150, pos.y * scale - 300)

    if (this.ballRolling && this.i2 < 2000) {
      this.i2 += this.ball.getLinearVelocity().x / 20
    }

    const fixture = this.ball.getFixtureList()
    if (fixture) this.ball.destroyFixture(fixture)

    this.ball.createFixture(new Circle(1 + this.i2 / 220), { density: 100 })
    this.ball.setMassData({ mass: 2, center: { x: 0, y: 0 }, I: 1 })

    this.debugDraw()
    this.generateTerrain()

    const scoreX = this.ball.getPosition().x - initialX
    if (scoreX > this.score) {
      this.score = Math.round(scoreX)
      this.scoreText.setText(`${this.score}`)
    }
  }

  generateTerrain() {
    const { width } = this.cameras.main
    if (this.slopeBag.length < 10) {
      this.slopeBag = this.slopeBag.concat(
        Phaser.Math.RND.shuffle([
          1, 1, 1, 1, 1, 1, 1, 0.5, 0.5, -0.5, -0.75, -1,
        ]),
      )
    }
    while (this.hillCoords.x < this.cameras.main.scrollX + width) {
      this.generateSlope()
    }
  }

  generateSlope(amp = 200) {
    const { height } = this.cameras.main
    let slopePoints = []

    let m = 1
    let m2 = Phaser.Math.RND.realInRange(0.5, 0.7)
    let length = Phaser.Math.Between(400, 700)
    if (this.hillCoords.x < 1100) {
      m = 1
      m2 = Phaser.Math.RND.realInRange(0.8, 1.5)
    } else {
      m = this.slopeBag.shift()!
    }
    this.i += m2 * m

    for (let x = 0; x <= length; x++) {
      const delta = x / length
      const val = interpolate(this.hillCoords.y, this.i, delta)
      const y = height * 0.5 + val * amp
      slopePoints.push({ x, y })
    }

    const _slope = simplify(slopePoints, 1, true)

    for (let i = 1; i < _slope.length; i++) {
      const get = (v: Vector) => ({
        x: (v.x + this.hillCoords.x) / scale,
        y: v.y / scale,
      })
      const c1 = get(_slope[i - 1])
      const c2 = get(_slope[i])
      this.ground.createFixture(new Edge(c1, c2), { density: 0, friction: 1 })
    }

    this.hillCoords.x += length - 1
    this.hillCoords.y = this.i
  }

  debugDraw() {
    this.graphics.clear()
    let edges = 0
    for (let body = this.world.getBodyList(); body; body = body.getNext()) {
      for (
        let fixture = body.getFixtureList();
        fixture;
        fixture = fixture.getNext()
      ) {
        let shape = fixture.getShape() as IShape
        switch (fixture.getType()) {
          case 'edge': {
            edges++
            this.graphics.fillStyle(0xffffff)
            let v1 = shape.m_vertex1
            let v2 = shape.m_vertex2

            if (v2.x * scale < this.cameras.main.scrollX - 1200) {
              body.destroyFixture(fixture)
            } else {
              this.graphics.beginPath()
              this.graphics.moveTo(v1.x * scale, v1.y * scale)
              this.graphics.lineTo(v2.x * scale, v2.y * scale)
              this.graphics.lineTo(v2.x * scale, (v2.y + 80) * scale)
              this.graphics.lineTo(v1.x * scale, (v1.y + 80) * scale)

              this.graphics.fill()
            }
            break
          }
          case 'circle': {
            let position = body.getPosition()
            let angle = body.getAngle()
            this.graphics.fillStyle(0xffffff)
            const px = position.x * scale
            const py = position.y * scale
            const r = (shape.m_radius + 0.1) * scale
            this.graphics.lineStyle(2, 0x028af8)
            this.graphics.fillCircle(px, py, r)
            this.graphics.beginPath()
            this.graphics.moveTo(px, py)
            this.graphics.lineTo(
              px + r * Math.cos(angle),
              py + r * Math.sin(angle),
            )
            this.graphics.strokePath()
            break
          }
        }
      }
    }
  }
}

const interpolate = (vFrom: number, vTo: number, delta: number) => {
  let interpolation = (1 - Math.cos(delta * Math.PI)) * 0.5
  return vFrom * (1 - interpolation) + vTo * interpolation
}
