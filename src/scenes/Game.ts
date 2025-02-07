import { Scene } from 'phaser'
import { Body, Circle, Edge, Shape, World } from 'planck'
import simplify from 'simplify-js'

const scale = 10
const gravity = 20
const initialX = 200 / scale
const initialY = 350 / scale
const gameSpeed = 1
const angularDamping = 0.215
const linearDamping = 0.108
const maxBallSize = 2000
const minBallSize = 50
const sizeFactor = 220
const slopeDistribution = [1, 1, 1, 1, -1, -1]
const slopeSize = [800, 1200]
const slopeStrength = [0.7, 1.5]
const initialSlopeStrength = 10
const initialSlopeLength = 3000
const baseGravity = 5
const ballGrowRate = 0.015
const ballShrinkRate = 2
const scoreFactor = 0.1

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
  hasLost: boolean
  graphics: Phaser.GameObjects.Graphics
  circle: Phaser.GameObjects.Arc
  gravityFactor: number
  contactPoint: Vector | undefined
  slopeBag: number[]
  score: number
  scoreText: Phaser.GameObjects.Text
  slopeY: number
  ballSize: number
  snowParticles: Phaser.GameObjects.Particles.ParticleEmitter
  rollParticles: Phaser.GameObjects.Particles.ParticleEmitter
  deathParticles: Phaser.GameObjects.Particles.ParticleEmitter

  constructor() {
    super('Game')
  }

  create() {
    this.circle = this.add
      .circle(
        this.cameras.main.width / 2,
        this.cameras.main.height / 2,
        this.cameras.main.width,
        0x028af8,
      )
      .setScrollFactor(0)
      .setDepth(10)
    this.tweens.add({
      targets: this.circle,
      scale: 0,
      duration: 1000,
      ease: 'Quad.easeInOut',
    })

    this.world = new World({ x: 0, y: gravity })

    this.slopeY = 0
    this.ballSize = 400
    this.ground = this.world.createBody()
    this.hillCoords = { x: 0, y: 0 } as Vector
    this.graphics = this.add.graphics()
    this.slopeBag = []
    this.gravityFactor = 1
    this.hasLost = false

    this.ball = this.world.createBody({
      angularDamping,
      linearDamping,
      position: { x: initialX, y: initialY },
    })
    this.ball.setDynamic()

    this.world.on('begin-contact', (contact) => {
      this.contactPoint = contact.getWorldManifold(null)!.points[0]
    })

    this.world.on('end-contact', () => {
      this.contactPoint = undefined
    })

    this.generateTerrain()

    this.scoreText = this.add
      .text(10, this.cameras.main.height + 5, '0', {
        color: '#028af8',
        fontSize: 42,
        fontFamily: 'rolling-beat',
      })
      .setPadding(10)
      .setOrigin(0, 1)
      .setDepth(9)
      .setScrollFactor(0)
    this.score = 0

    this.make
      .graphics({ x: 0, y: 0 })
      .fillStyle(0xffffff, 1)
      .fillCircle(10, 10, 5)
      .generateTexture('snow', 20, 20)
      .destroy()

    this.snowParticles = this.add.particles(0, 0, 'snow').start()
    this.rollParticles = this.add.particles(0, 0, 'snow')
    this.deathParticles = this.add.particles(0, 0, 'snow', {
      lifespan: 8000,
      speed: { min: 150, max: 650 },
      scale: { min: 0.5, max: 2 },
      gravityY: 350,
      emitting: false,
    })
  }

  update(_t: number, dt: number) {
    this.world.step((dt / 1000) * gameSpeed)
    this.world.clearForces()
    const baseSpeed = this.ball.getLinearVelocity().x

    let pos = this.ball.getPosition()
    if (!this.hasLost) {
      this.cameras.main.setScroll(
        pos.x * scale - 200,
        pos.y * scale - this.cameras.main.height / 2,
      )
    }

    if (this.input.activePointer.isDown) {
      this.gravityFactor = 3
      this.ballSize -= ballShrinkRate

      if (this.ballSize <= minBallSize && !this.hasLost) {
        this.ballSize = minBallSize
        const pos = this.ball.getPosition()
        this.deathParticles.explode(200, pos.x * scale, pos.y * scale)
        this.onLose()
      }
    } else {
      this.gravityFactor = 1
    }

    if (!this.hasLost)
      this.snowParticles.setConfig({
        x: {
          min: this.ball.getPosition().x * scale,
          max: (this.ball.getPosition().x + 880) * scale,
        },
        y: {
          min: (this.ball.getPosition().y - 30) * scale,
          max: (this.ball.getPosition().y - 90) * scale,
        },
        lifespan: 6000,
        speedY: { min: 100, max: 200 },
        speedX: { min: -100, max: 100 },
        scale: { min: 0.2, max: 0.8 },
        quantity: 5,
        gravityY: 150,
      })

    if (this.contactPoint && !this.hasLost) {
      const { x, y } = this.contactPoint
      const s = Phaser.Math.Clamp(baseSpeed / 40, 0, 10)
      const s2 = Phaser.Math.Clamp(baseSpeed / 60, 0, 1)
      this.rollParticles.setConfig({
        speedX: { onEmit: () => Phaser.Math.RND.between(100, 250) * s },
        speedY: { onEmit: () => Phaser.Math.RND.between(-130, -10) * s },
        lifespan: 500,
        gravityY: 100,
        scale: { max: s2, min: 0 },
      })

      this.rollParticles.emitParticle(
        this.gravityFactor === 1 ? 1 : 3,
        x * scale,
        y * scale,
      )
      if (this.ballSize < maxBallSize && this.gravityFactor === 1)
        this.ballSize += Math.abs(baseSpeed * ballGrowRate)
    }

    let fixture = this.ball.getFixtureList()
    if (fixture) this.ball.destroyFixture(fixture)

    fixture = this.ball.createFixture(new Circle(this.ballSize / sizeFactor), {
      density: 1,
      friction: 1,
    })
    const shape = fixture.getShape() as IShape
    this.ball.setGravityScale(
      (baseGravity + shape.m_radius / 2) * this.gravityFactor,
    )

    this.draw()
    this.generateTerrain()

    const scoreX = (this.ball.getPosition().x - initialX) * scoreFactor
    if (scoreX > this.score && !this.hasLost) {
      this.score = Math.round(scoreX)
      this.scoreText.setText(`${this.score}`)
    }

    if (baseSpeed < -1) {
      this.onLose()
    }
  }

  onLose = () => {
    if (this.hasLost) return

    this.hasLost = true
    this.time.delayedCall(2000, () => {
      this.tweens.add({
        targets: this.circle,
        scale: 1,
        duration: 1000,
        ease: 'Sine.easeInOut',
        onComplete: () => {
          this.scene.start('Menu', { score: this.score })
        },
      })
    })
  }

  generateTerrain() {
    const { width } = this.cameras.main
    if (this.slopeBag.length < slopeDistribution.length * 2) {
      this.slopeBag = this.slopeBag.concat(
        Phaser.Math.RND.shuffle(slopeDistribution),
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
    let m2 = 1
    let length = 1
    if (this.hillCoords.x < 100) {
      m2 = initialSlopeStrength
      length = initialSlopeLength
    } else {
      m = this.slopeBag.shift()!

      m2 = Phaser.Math.RND.realInRange(slopeStrength[0], slopeStrength[1])
      length = Phaser.Math.Between(slopeSize[0], slopeSize[1])
      if (m < 0) {
        m2 *= 0.95
        length *= 0.95
      }
    }
    this.slopeY += m2 * m

    for (let x = 0; x <= length; x++) {
      const delta = x / length
      const val = interpolate(this.hillCoords.y, this.slopeY, delta)
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
    this.hillCoords.y = this.slopeY
  }

  draw() {
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

            if (v2.x * scale < this.cameras.main.scrollX - 2400) {
              body.destroyFixture(fixture)
            } else {
              this.graphics.beginPath()
              this.graphics.moveTo(v1.x * scale, v1.y * scale)
              this.graphics.lineTo(v2.x * scale, v2.y * scale)
              this.graphics.lineTo(v2.x * scale, (v2.y + 120) * scale)
              this.graphics.lineTo(v1.x * scale, (v1.y + 120) * scale)

              this.graphics.fill()
            }
            break
          }
          case 'circle': {
            if (this.ballSize <= minBallSize) continue
            let position = body.getPosition()
            // let angle = body.getAngle()
            this.graphics.fillStyle(0xffffff)
            const px = position.x * scale
            const py = position.y * scale
            const r = (shape.m_radius + 0.5) * scale

            // this.graphics.lineStyle(2, 0xffffff)
            // this.graphics.strokeCircle(px, py, r)
            this.graphics.lineStyle(2, 0x028af8)
            this.graphics.fillCircle(px, py, r)

            // this.graphics.beginPath()
            // this.graphics.moveTo(px, py)
            // this.graphics.lineTo(
            //   px + r * Math.cos(angle),
            //   py + r * Math.sin(angle),
            // )
            // this.graphics.strokePath()
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
