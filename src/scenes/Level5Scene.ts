import Phaser from 'phaser';
import { COLORS, GAME_W, TILE } from '../config';
import { BaseLevelScene } from './BaseLevelScene';
import { LEVEL5_MAP } from '../levels/level5';
import { markerOf, markersOf } from '../levels/LevelMap';
import { WorldMap } from '../game/WorldMap';
import { Sound } from '../audio/Sound';
import { popWord } from '../ui/ui';

const WATER = {
    startDelay: 2500,
    speed: 11,          // px/s at the start...
    speedUp: 0.1,       // ...gaining this much per second...
    maxSpeed: 17,       // ...up to this
};
const BUBBLE = { every: 1300, rise: 42, power: 430 };

interface Duck {
    img: Phaser.Physics.Arcade.Image;
    restY: number;
    baseX: number;
}

/**
 * Level 5 — Bath Time Flood.
 * The bathtub is filling up and the mouse can't swim! Climb up to the window
 * before the water catches you. Rubber ducks float up with the water (ride
 * one up the tall gap) and bubbles bounce you higher.
 */
export default class Level5Scene extends BaseLevelScene {
    private waterY = 0;
    private rising = false;
    private riseTime = 0;
    private water!: Phaser.GameObjects.Rectangle;
    private wave!: Phaser.GameObjects.TileSprite;
    private ducks: Duck[] = [];
    private bubbles: Phaser.GameObjects.Sprite[] = [];
    private warned = false;

    constructor() {
        super('Level5Scene');
    }

    create() {
        this.ducks = [];
        this.bubbles = [];
        this.rising = false;
        this.riseTime = 0;
        this.warned = false;
        this.setupLevel(LEVEL5_MAP, 'bath');
        const data = this.world.data;
        this.cameras.main.startFollow(this.player, true, 0.15, 0.15, 0, 30);

        // the water starts at the floor of the tub
        this.waterY = WorldMap.feet(markerOf(data, 'P')).y + 6;
        this.water = this.add.rectangle(0, this.waterY, this.world.widthPx, 10, 0x3b9ae0, 0.62).setOrigin(0, 0).setDepth(55);
        this.wave = this.add.tileSprite(0, this.waterY - 5, this.world.widthPx, 6, 'wave').setOrigin(0, 0).setDepth(56);

        for (const m of markersOf(data, 'D')) this.addDuck(m.col, m.row);
        this.addExit(() => true, '', 'WINDOW');

        // decor: the big tap filling the tub
        const fx = this.world.widthPx - 3 * TILE;
        const fy = this.world.heightPx - 7 * TILE;
        this.add.image(fx, fy, 'faucet').setDepth(-20);
        const stream = this.add.rectangle(fx + 6, fy + 12, 6, 80, 0x6fc6ff, 0.7).setOrigin(0.5, 0).setDepth(-19);
        this.tweens.add({ targets: stream, alpha: 0.45, yoyo: true, repeat: -1, duration: 150 });
        this.add.image(GAME_W / 2, 60, 'moon').setDepth(-60);

        Sound.setMood('bath');
        this.begin();
    }

    protected onStart() {
        this.time.delayedCall(WATER.startDelay, () => {
            this.rising = true;
            popWord(this, 'THE WATER IS RISING!', '#8fe3ff', 8, 1200);
            Sound.splash();
        });
        this.time.addEvent({ delay: BUBBLE.every, loop: true, callback: () => this.spawnBubble() });
    }

    protected tick(_time: number, delta: number) {
        const dt = Math.min(delta, 50) / 1000;
        if (this.rising) {
            this.riseTime += dt;
            let speed = Math.min(WATER.maxSpeed, WATER.speed + this.riseTime * WATER.speedUp);
            // kid-friendly rubber band: slow down when right behind the mouse,
            // catch up when it is far below
            const gap = this.waterY - this.player.body.bottom;
            if (gap < 70) speed *= 0.55;
            else if (gap > 260) speed *= 1.6;
            this.waterY = Math.max(TILE * 5, this.waterY - speed * dt);
        }
        this.water.setPosition(0, this.waterY).setSize(this.world.widthPx, Math.max(0, this.world.heightPx + 40 - this.waterY));
        this.wave.setPosition(0, this.waterY - 5);
        this.wave.tilePositionX += 20 * dt;

        this.updateDucks(dt);
        this.updateBubbles(dt);

        const pb = this.player.body;
        // a little warning when the water gets close
        if (!this.warned && this.waterY - pb.bottom < 40) {
            this.warned = true;
            popWord(this, 'HURRY! CLIMB!', COLORS.danger, 8, 800);
        } else if (this.waterY - pb.bottom > 90) {
            this.warned = false;
        }
        if (pb.bottom > this.waterY + 4) this.die('splash');
    }

    // ───────────────────────────────────────── rubber ducks (floating elevators)

    private addDuck(col: number, row: number) {
        const p = WorldMap.feet({ ch: 'D', col, row });
        const restY = p.y - 12;
        const img = this.physics.add.image(p.x, restY, 'duck').setDepth(54);
        const body = img.body as Phaser.Physics.Arcade.Body;
        body.setAllowGravity(false).setImmovable(true);
        body.setSize(26, 6).setOffset(4, 8);
        body.checkCollision.down = false;
        body.checkCollision.left = false;
        body.checkCollision.right = false;
        this.physics.add.collider(this.player, img);
        this.time.addEvent({ delay: 2500, loop: true, callback: () => {
            img.setFrame(1);
            this.time.delayedCall(150, () => img.setFrame(0));
        } });
        this.ducks.push({ img, restY, baseX: p.x });
    }

    private updateDucks(dt: number) {
        for (const d of this.ducks) {
            // floats on the surface once the water reaches it
            const target = Math.min(d.restY, this.waterY - 14);
            const floating = target < d.restY;
            const body = d.img.body as Phaser.Physics.Arcade.Body;
            body.setVelocityY(Phaser.Math.Clamp((target - d.img.y) / Math.max(dt, 0.001), -200, 200));
            const bob = floating ? Math.sin(this.time.now / 400) * 6 : 0;
            body.setVelocityX((d.baseX + bob - d.img.x) * 4);
        }
    }

    // ───────────────────────────────────────── bubbles (bouncy)

    private spawnBubble() {
        if (!this.rising || this.waterY < TILE * 6) return;
        const x = Phaser.Math.Between(2 * TILE, this.world.widthPx - 2 * TILE);
        const b = this.add.sprite(x, this.waterY + 8, 'bubble', 0).setDepth(57);
        this.bubbles.push(b);
        this.time.delayedCall(6000, () => this.popBubble(b, false));
    }

    private popBubble(b: Phaser.GameObjects.Sprite, sound = true) {
        if (!b.active) return;
        if (sound) Sound.bubblePop();
        b.setFrame(1);
        this.tweens.add({ targets: b, scale: 1.5, alpha: 0, duration: 200, onComplete: () => b.destroy() });
        b.setActive(false);
    }

    private updateBubbles(dt: number) {
        const pb = this.player.body;
        for (const b of this.bubbles) {
            if (!b.active) continue;
            b.y -= BUBBLE.rise * dt;
            b.x += Math.sin(this.time.now / 300 + b.y / 40) * 0.3;
            // bounce when landing on top of a bubble
            if (pb.velocity.y > 0 && Math.abs(this.player.x - b.x) < 9 && pb.bottom > b.y - 9 && pb.bottom < b.y + 2) {
                this.player.launch(BUBBLE.power);
                Sound.boing();
                this.popBubble(b);
            }
        }
        this.bubbles = this.bubbles.filter((b) => b.active);
    }
}
