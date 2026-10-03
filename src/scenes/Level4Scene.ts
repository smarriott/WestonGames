import Phaser from 'phaser';
import { COLORS, TILE } from '../config';
import { BaseLevelScene } from './BaseLevelScene';
import { LEVEL4_MAP } from '../levels/level4';
import { markerOf, markersOf } from '../levels/LevelMap';
import { WorldMap } from '../game/WorldMap';
import { Sound } from '../audio/Sound';
import { popWord, text } from '../ui/ui';

const TRAIN = { speed: 75, wait: 1100 };
const ROBOT = { speed: 42, range: 6 * TILE };
const BATTERIES = 4;

interface Robot {
    sprite: Phaser.GameObjects.Sprite;
    dir: number;
    minX: number;
    maxX: number;
}

/**
 * Level 4 — Toy Box Trouble.
 * Collect 4 batteries to power the toy rocket. Jack-in-the-boxes launch you
 * up to the high shelves, the toy train ferries you across the big gap, and
 * wind-up robot mice patrol the floor (don't bump into them!).
 */
export default class Level4Scene extends BaseLevelScene {
    private got = 0;
    private robots: Robot[] = [];
    private train!: Phaser.Physics.Arcade.Image;
    private trainMin = 0;
    private trainMax = 0;
    private trainWaitUntil = 0;
    private trainDir = 1;
    private launched = false;

    constructor() {
        super('Level4Scene');
    }

    create() {
        this.got = 0;
        this.robots = [];
        this.launched = false;
        this.setupLevel(LEVEL4_MAP, 'toys');
        const data = this.world.data;
        this.cameras.main.startFollow(this.player, true, 0.12, 0.12, 0, 20);

        // batteries
        const setCount = this.addCounter('battery', 1, BATTERIES);
        for (const m of markersOf(data, 'b')) {
            const p = WorldMap.feet(m);
            const b = this.physics.add.staticSprite(p.x, p.y - 10, 'battery').play('battery_glow').setDepth(20);
            this.tweens.add({ targets: b, y: b.y - 3, yoyo: true, repeat: -1, duration: 600, ease: 'Sine.InOut' });
            this.physics.add.overlap(this.player, b, () => {
                b.destroy();
                this.got++;
                setCount(this.got);
                Sound.keyGet();
                popWord(this, this.got < BATTERIES ? `BATTERY ${this.got}/${BATTERIES}` : 'ROCKET READY!', COLORS.good, 8, 700);
            });
        }

        this.addSprings('J', 'jack', 560);
        this.addTrain();
        for (const m of markersOf(data, 'r')) this.addRobot(m.col, m.row);
        this.addRocket();

        const j = WorldMap.feet(markersOf(data, 'J')[0]);
        this.addHint(j.x, j.y - 50, 'BOUNCE!', 'BOUNCE!');
        const t = WorldMap.feet(markerOf(data, 'T'));
        this.addHint(t.x + 60, t.y - 56, 'RIDE THE\nTRAIN!', 'RIDE THE\nTRAIN!');
        this.addDecor();

        Sound.setMood('toys');
        this.begin();
    }

    protected tick(time: number) {
        if (this.fellOut()) {
            this.die('fall');
            return;
        }
        this.updateTrain(time);
        this.updateRobots();
    }

    // ───────────────────────────────────────── toy train (moving platform)

    private addTrain() {
        const m = markerOf(this.world.data, 'T');
        // the train shuttles across the gap that starts at its marker
        let end = m.col;
        while (end < this.world.data.width && this.world.data.cells[m.row + 1][end] === 'empty') end++;
        const floorTop = (m.row + 1) * TILE;
        this.trainMin = m.col * TILE;
        this.trainMax = end * TILE - 72;
        // roof (sprite rows 6-9) is level with the floor
        this.train = this.physics.add.image(this.trainMin, floorTop - 6, 'train', 0).setOrigin(0, 0).setDepth(30);
        const body = this.train.body as Phaser.Physics.Arcade.Body;
        body.setAllowGravity(false).setImmovable(true);
        body.setSize(68, 5).setOffset(2, 6);
        body.checkCollision.down = false;
        body.checkCollision.left = false;
        body.checkCollision.right = false;
        this.physics.add.collider(this.player, this.train);
        // decorative track and wheels animation
        const g = this.add.graphics().setDepth(5);
        g.fillStyle(0x7a4b2a).fillRect(this.trainMin, floorTop + 18, end * TILE - this.trainMin, 3);
        for (let x = this.trainMin; x < end * TILE; x += 10) g.fillStyle(0x4e2f1a).fillRect(x, floorTop + 21, 4, 3);
        this.time.addEvent({ delay: 90, loop: true, callback: () => {
            if (Math.abs(body.velocity.x) > 1) this.train.setFrame((Number(this.train.frame.name) + 1) % 4);
        } });
        this.trainWaitUntil = 0;
        this.trainDir = 1;
    }

    private updateTrain(time: number) {
        const body = this.train.body as Phaser.Physics.Arcade.Body;
        if (time < this.trainWaitUntil) {
            body.setVelocityX(0);
            return;
        }
        if (this.train.x >= this.trainMax && this.trainDir > 0) {
            this.trainDir = -1;
            this.trainWaitUntil = time + TRAIN.wait;
            this.train.x = this.trainMax;
            body.setVelocityX(0);
            return;
        }
        if (this.train.x <= this.trainMin && this.trainDir < 0) {
            this.trainDir = 1;
            this.trainWaitUntil = time + TRAIN.wait;
            this.train.x = this.trainMin;
            body.setVelocityX(0);
            return;
        }
        body.setVelocityX(TRAIN.speed * this.trainDir);
        this.train.setFlipX(this.trainDir < 0);
    }

    // ───────────────────────────────────────── wind-up robot mice

    private addRobot(col: number, row: number) {
        const p = WorldMap.feet({ ch: 'r', col, row });
        // patrol until a wall, a ledge, or the edge of its range
        const floorY = p.y;
        const walkable = (x: number) => this.world.groundAt(x, floorY + 2) && !this.world.groundAt(x, floorY - 4);
        let minX = p.x, maxX = p.x;
        while (minX > p.x - ROBOT.range && walkable(minX - 8)) minX -= 2;
        while (maxX < p.x + ROBOT.range && walkable(maxX + 8)) maxX += 2;
        const sprite = this.add.sprite(p.x, floorY, 'robot').setOrigin(0.5, 1).play('robot_walk').setDepth(40);
        this.robots.push({ sprite, dir: 1, minX, maxX });
    }

    private updateRobots() {
        const dt = this.game.loop.delta / 1000;
        const pb = this.player.body;
        for (const r of this.robots) {
            r.sprite.x += r.dir * ROBOT.speed * dt;
            if (r.sprite.x >= r.maxX) { r.sprite.x = r.maxX; r.dir = -1; }
            if (r.sprite.x <= r.minX) { r.sprite.x = r.minX; r.dir = 1; }
            r.sprite.setFlipX(r.dir < 0);
            const hit = new Phaser.Geom.Rectangle(r.sprite.x - 7, r.sprite.y - 12, 14, 12);
            const me = new Phaser.Geom.Rectangle(pb.left + 1, pb.top + 1, pb.width - 2, pb.height - 2);
            if (Phaser.Geom.Intersects.RectangleToRectangle(hit, me)) {
                this.die('bonk');
                return;
            }
        }
    }

    // ───────────────────────────────────────── the rocket (exit)

    private addRocket() {
        const p = WorldMap.feet(markerOf(this.world.data, 'X'));
        const rocket = this.physics.add.staticSprite(p.x, p.y - 32, 'rocket', 0).setDepth(45);
        rocket.body.setSize(26, 62);
        text(this, p.x, p.y - 76, 'ROCKET', 8, COLORS.good).setDepth(46);
        let nagAt = 0;
        this.physics.add.overlap(this.player, rocket, () => {
            if (this.launched) return;
            if (this.got < BATTERIES) {
                if (this.time.now > nagAt) {
                    nagAt = this.time.now + 1600;
                    popWord(this, `FIND ${BATTERIES - this.got} MORE BATTER${BATTERIES - this.got === 1 ? 'Y' : 'IES'}!`, COLORS.accent, 8, 900);
                }
                return;
            }
            // blast off with the mouse inside!
            this.launched = true;
            this.player.setVisible(false);
            this.player.frozen = true;
            this.player.body.setAllowGravity(false).setVelocity(0, 0);
            rocket.play('rocket_fire');
            Sound.rocket();
            this.cameras.main.stopFollow();
            this.cameras.main.shake(400, 0.01);
            this.tweens.add({ targets: rocket, y: rocket.y - 420, duration: 1600, ease: 'Quad.In', delay: 300, onComplete: () => this.complete() });
        });
    }

    private addDecor() {
        this.addBats(3, { x: 300, y: 20, w: 900, h: 60 });
        this.add.image(this.world.widthPx - 40, 40, 'moon').setDepth(-60);
    }
}
