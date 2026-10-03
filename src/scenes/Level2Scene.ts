import Phaser from 'phaser';
import { COLORS, GAME_W, TILE } from '../config';
import { BaseLevelScene } from './BaseLevelScene';
import { LEVEL2_MAP } from '../levels/level2';
import { markerOf, markersOf } from '../levels/LevelMap';
import { WorldMap } from '../game/WorldMap';
import { Sound } from '../audio/Sound';
import { popWord, text } from '../ui/ui';

const SCROLL_SPEED = 72;          // px/s — slower than the mouse (130) so it is always escapable
const FAN = { on: 2400, off: 1700, wind: 80, reach: 100 };
const DRIP = { every: 2100, warn: 650, gravity: 700 };

interface Fan {
    x: number;
    floorY: number;
    on: boolean;
    blades: Phaser.GameObjects.Sprite;
}

interface Drip {
    x: number;
    startY: number;
    sprite: Phaser.GameObjects.Sprite;
    vy: number;
    falling: boolean;
}

/**
 * Level 2 — The Escape.
 * The screen scrolls forward while a fast cat chases from the left edge.
 * Hop over giant fans (their wind pushes you back) and dodge dripping goo.
 */
export default class Level2Scene extends BaseLevelScene {
    private cat!: Phaser.GameObjects.Sprite;
    private catOffset = -80;
    private scrolling = false;
    /** Our own scroll position: the camera rounds its scroll every frame, which
     *  would swallow sub-pixel steps on 120Hz screens. */
    private scrollPos = 0;
    private fans: Fan[] = [];
    private drips: Drip[] = [];
    private puddles: Phaser.Geom.Rectangle[] = [];
    private floorY = 0;

    constructor() {
        super('Level2Scene');
    }

    create() {
        this.fans = [];
        this.drips = [];
        this.puddles = [];
        this.scrolling = false;
        this.scrollPos = 0;
        this.catOffset = -80;

        this.setupLevel(LEVEL2_MAP, 'hall');
        const data = this.world.data;
        this.floorY = WorldMap.feet(markerOf(data, 'P')).y;
        this.cameras.main.scrollX = 0;

        this.addDecor();

        // exit
        const ex = WorldMap.feet(markerOf(data, 'X'));
        const exit = this.physics.add.staticSprite(ex.x, ex.y - 13, 'exit').play('exit_glow').setDepth(20);
        exit.body.setSize(12, 18);
        this.physics.add.overlap(this.player, exit, () => this.complete());
        text(this, ex.x, ex.y - 36, 'SAFE!', 8, COLORS.good).setDepth(21);

        for (const m of markersOf(data, 'F')) this.addFan(WorldMap.feet(m).x, WorldMap.feet(m).y);
        markersOf(data, 'W').forEach((m, i) => this.addGooWindow(m.col * TILE, m.row * TILE, i));
        for (const m of markersOf(data, 'g')) {
            const p = WorldMap.feet(m);
            const s = this.add.sprite(p.x, p.y + 1, 'goo_puddle', 0).setOrigin(0.5, 1).setDepth(25);
            this.time.addEvent({ delay: 1500 + Math.random() * 1000, loop: true, callback: () => {
                s.setFrame(1);
                this.time.delayedCall(150, () => s.setFrame(0));
            } });
            this.puddles.push(new Phaser.Geom.Rectangle(p.x - 7, p.y - 5, 14, 5));
        }

        // the chasing cat lives on the left edge of the screen
        this.cat = this.add.sprite(-100, this.floorY - 20, 'cat_run').play('cat_run').setScale(1.5).setDepth(45);
        this.addHint(140, this.floorY - 40, 'RUN! -->', 'RUN! -->');

        Sound.setMood('chase');
        this.begin();
    }

    protected onStart() {
        popWord(this, 'RUN!', COLORS.danger, 24, 700);
        Sound.alert();
        this.time.delayedCall(500, () => { this.scrolling = true; });
    }

    protected tick(time: number, delta: number) {
        const dt = delta / 1000;
        const cam = this.cameras.main;
        const maxScroll = this.world.widthPx - GAME_W;
        if (this.scrolling) {
            // creep forward, and let a speedy mouse push the screen along so
            // it is never pinned against the right edge
            const push = this.player.x - GAME_W * 0.6;
            this.scrollPos = Math.min(maxScroll, Math.max(this.scrollPos + SCROLL_SPEED * dt, push));
        }
        cam.scrollX = this.scrollPos;

        // cat: slides in from the left, then keeps pace with the screen.
        // When the screen stops at the end, it keeps creeping forward.
        if (this.scrolling) {
            const target = this.scrollPos >= maxScroll ? this.catOffset + 40 * dt : Math.min(this.catOffset + 120 * dt, 14);
            this.catOffset = target;
        }
        this.cat.x = this.scrollPos + this.catOffset;
        this.cat.y = this.floorY - 20 + Math.abs(Math.sin(time / 90)) * -3;

        const body = this.player.body;
        // the cat catches anything at the left edge
        if (body.left < this.cat.x + 24) {
            this.die('caught');
            return;
        }

        if (this.player.y > this.world.heightPx + 8) {
            this.die('fall');
            return;
        }

        this.updateFans(body);
        this.updateDrips(dt, body);

        for (const r of this.puddles) {
            if (Phaser.Geom.Intersects.RectangleToRectangle(r, this.bodyRect(body, 2))) {
                this.die('goo');
                return;
            }
        }
    }

    private bodyRect(b: Phaser.Physics.Arcade.Body, shrink = 0) {
        return new Phaser.Geom.Rectangle(b.left + shrink, b.top + shrink, b.width - shrink * 2, b.height - shrink * 2);
    }

    // ───────────────────────────────────────────── fans

    private addFan(x: number, floorY: number) {
        const stand = this.add.image(x, floorY, 'fan_stand').setOrigin(0.5, 1).setDepth(22);
        const cy = stand.y - 72 + 24;
        const blades = this.add.sprite(x, cy, 'fan_blades').play('fan_slow').setDepth(23);
        this.add.image(x, cy, 'fan_cage').setDepth(24);
        const fan: Fan = { x, floorY, on: false, blades };
        this.fans.push(fan);

        const switchOn = () => {
            fan.on = true;
            blades.play('fan_spin');
            const cam = this.cameras.main;
            if (x > cam.scrollX && x < cam.scrollX + GAME_W + 40) Sound.whoosh();
            this.time.delayedCall(FAN.on, () => {
                fan.on = false;
                blades.play('fan_slow');
                this.time.delayedCall(FAN.off, switchOn);
            });
        };
        this.time.delayedCall(this.fans.length * 700, switchOn);

        // wind streaks
        this.time.addEvent({ delay: 70, loop: true, callback: () => {
            if (!fan.on) return;
            const w = this.add.image(x - 26, floorY - 10 - Math.random() * 120, 'wind').setDepth(30).setAlpha(0.95).setScale(1.5);
            this.tweens.add({ targets: w, x: x - 26 - FAN.reach - 30, alpha: 0.1, duration: 420, onComplete: () => w.destroy() });
        } });
    }

    private updateFans(body: Phaser.Physics.Arcade.Body) {
        this.player.pushX = 0;
        for (const f of this.fans) {
            // touching the fan itself blows you away
            const hit = new Phaser.Geom.Rectangle(f.x - 20, f.floorY - 68, 40, 68);
            if (Phaser.Geom.Intersects.RectangleToRectangle(hit, this.bodyRect(body, 1))) {
                this.die('blown');
                return;
            }
            // wind pushes you back toward the cat
            if (f.on && body.right > f.x - 24 - FAN.reach && body.left < f.x - 20 && body.bottom > f.floorY - 135) {
                this.player.pushX = -FAN.wind;
            }
        }
    }

    // ───────────────────────────────────────────── goo

    private addGooWindow(x: number, y: number, index: number) {
        this.add.image(x, y, 'goo_window').setOrigin(0).setDepth(-20);
        const dripX = x + 17.5;
        const startY = y + 44;
        const spawn = () => {
            const s = this.add.sprite(dripX, startY, 'goo_drop', 0).setOrigin(0.5, 0).setScale(0.3).setDepth(26);
            const drip: Drip = { x: dripX, startY, sprite: s, vy: 0, falling: false };
            this.drips.push(drip);
            // the drop swells (a warning) before it falls
            this.tweens.add({ targets: s, scale: 1.4, duration: DRIP.warn, onComplete: () => { drip.falling = true; s.play('goo_drip'); } });
        };
        this.time.delayedCall(300 + (index % 3) * 700, () => {
            spawn();
            this.time.addEvent({ delay: DRIP.every, loop: true, callback: spawn });
        });
    }

    private updateDrips(dt: number, body: Phaser.Physics.Arcade.Body) {
        const pr = this.bodyRect(body, 1);
        for (const d of this.drips) {
            if (!d.falling) continue;
            d.vy += DRIP.gravity * dt;
            d.sprite.y += d.vy * dt;
            const r = new Phaser.Geom.Rectangle(d.x - 4, d.sprite.y + 6, 8, 9);
            if (Phaser.Geom.Intersects.RectangleToRectangle(r, pr)) {
                this.die('goo');
                return;
            }
            if (d.sprite.y + 14 >= this.floorY) {
                d.falling = false;
                this.splat(d.x, this.floorY);
                d.sprite.destroy();
            }
        }
        this.drips = this.drips.filter((d) => d.sprite.active);
    }

    private splat(x: number, y: number) {
        const cam = this.cameras.main;
        if (x > cam.scrollX && x < cam.scrollX + GAME_W) Sound.bloop();
        for (const dir of [-1, 1]) {
            const b = this.add.circle(x, y - 2, 2, 0x120f1c).setDepth(26);
            this.tweens.add({ targets: b, x: x + dir * 8, y: y - 6, alpha: 0, duration: 300, onComplete: () => b.destroy() });
        }
    }

    // ───────────────────────────────────────────── decor

    private addDecor() {
        const w = this.world.widthPx;
        for (const x of [184, 648, 1416, 1896, 2616]) this.addPortrait(x, 72);
        this.addBats(6, { x: 400, y: 10, w: w - 800, h: 50 });
        this.add.image(w - 64, 0, 'cobweb').setOrigin(1, 0).setFlipX(true).setDepth(-45);
    }
}
