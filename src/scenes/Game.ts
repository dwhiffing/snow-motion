import { Scene } from 'phaser'
import { Body, Circle, Edge, Shape, World } from 'planck'
import simplify from 'simplify-js'

const worldScale = 10
const gravity = 15

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
  ballRolling: boolean
  i: number
  i2: number

  constructor() {
    super('Game')
    this.i = 0
    this.i2 = 0
    this.ballRolling = false
  }

  create() {
    this.world = new World({ x: 0, y: gravity })

    this.ground = this.world.createBody()
    this.hillCoords = { x: 0, y: 0 } as Vector
    this.graphics = this.add.graphics()

    this.ball = this.world.createBody({
      angularDamping: 0.18,
      linearDamping: 0.1,
      position: { x: 150 / worldScale, y: 350 / worldScale },
    })
    this.ball.setDynamic()

    this.world.on('begin-contact', () => {
      this.ballRolling = true
    })

    this.world.on('end-contact', () => {
      this.ballRolling = false
    })

    this.input.keyboard!.on('keydown', () => {
      if (this.i2 > 10) {
        console.log('hmm')
        this.world.setGravity({ x: 0, y: gravity * 3 })
        this.i2 -= 8
      }
    })

    this.input.keyboard!.on('keyup', () => {
      this.world.setGravity({ x: 0, y: gravity })
    })

    this.generateTerrain()
  }

  update(_t: number, dt: number) {
    this.world.step((dt / 1000) * 2)
    this.world.clearForces()

    let pos = this.ball.getPosition()
    this.cameras.main.setScroll(
      pos.x * worldScale - 150,
      pos.y * worldScale - 150,
    )

    if (this.ballRolling && this.i2 < 2000) {
      const inc = this.ball.getLinearVelocity().x / 20
      this.i2 += inc
    }

    const fixture = this.ball.getFixtureList()
    if (fixture) this.ball.destroyFixture(fixture)

    this.ball.createFixture(new Circle(1 + this.i2 / 220), { density: 100 })
    this.ball.setMassData({ mass: 2, center: { x: 0, y: 0 }, I: 1 })

    this.debugDraw()
    this.generateTerrain()
  }

  generateTerrain() {
    const { width } = this.cameras.main
    while (this.hillCoords.x < this.cameras.main.scrollX + width) {
      this.generateSlope()
    }
  }

  generateSlope(amp = 200) {
    const { height } = this.cameras.main
    let slopePoints = []

    let m = Phaser.Math.RND.between(0, 9) === 0 ? -1 : 1
    let m2 = Phaser.Math.RND.realInRange(0.1, 0.9)
    let length = Phaser.Math.Between(350, 600)
    if (this.hillCoords.x < 1100) {
      m = 1
      m2 = Phaser.Math.RND.realInRange(0.5, 2)
      length = Phaser.Math.Between(600, 900)
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
      const get = (v: { x: number; y: number }) => ({
        x: (v.x + this.hillCoords.x) / worldScale,
        y: v.y / worldScale,
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

            if (v2.x * worldScale < this.cameras.main.scrollX - 500) {
              body.destroyFixture(fixture)
            } else {
              this.graphics.beginPath()
              this.graphics.lineStyle(1, 0xffffff)
              this.graphics.moveTo(v1.x * worldScale, v1.y * worldScale)
              this.graphics.lineTo(v2.x * worldScale, v2.y * worldScale)
              this.graphics.lineTo(v2.x * worldScale, (v2.y + 90) * worldScale)
              this.graphics.lineTo(v1.x * worldScale, (v1.y + 90) * worldScale)

              this.graphics.stroke()
            }
            break
          }
          case 'circle': {
            let position = body.getPosition()
            let angle = body.getAngle()
            this.graphics.fillStyle(0xffffff)
            const px = position.x * worldScale
            const py = position.y * worldScale
            const r = shape.m_radius * worldScale
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
