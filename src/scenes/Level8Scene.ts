import Phaser from 'phaser';
import { COLORS, TILE } from '../config';
import { BaseLevelScene } from './BaseLevelScene';
import { LEVEL8_MAP } from '../levels/level8';
import { markerOf, markersOf } from '../levels/LevelMap';
import { WorldMap } from '../game/WorldMap';
import { Sound } from '../audio/Sound';
import { popWord, text } from '../ui/ui';

const WEB = { speed: 0.35, jump: 0.62 };
const SPIDER = { minPeriod: 2600, maxPeriod: 3800, hitRadius: 10 };

interface Spider {
    sprite: Phaser.GameObjects.Sprite;
    x: number;
    top: number;
    bottom: number;
    period: number;
    phase: number;
}

/**
 * Level 8 — Spider Attic.
 * Three baby mice are stuck in spider webs. Touch each one to free it, then
 * head for the exit. Webs are sticky (slow running, small jumps), spiders
 * dangle up and down on their threads, and old mattress springs bounce you up.
 */
export default class Level8Scene extends BaseLevelScene {
    private freed = 0;
    private webs: Phaser.Geom.Rectangle[] = [];
    private spiders: Spider[] = [];
    private threads!: Phaser.GameObjects.Graphics;
    private inWeb = false;
    private t = 0;

    constructor() {
        super('Level8Scene');
    }

    create() {
        this.freed = 0;
        this.webs = [];
        this.spiders = [];
        this.inWeb = false;
        this.t = 0;
        this.setupLevel(LEVEL8_MAP, 'attic');
        const data = this.world.data;
        this.cameras.main.startFollow(this.player, true, 0.12, 0.12, 0, 20);

        const exit = WorldMap.feet(markerOf(data, 'X'));
        this.addExit(() => this.freed >= 3, 'FREE ALL 3 BABY MICE!');
        const setCount = this.addCounter('baby', 0, 3);

        for (const m of markersOf(data, 'w')) {
            const p = WorldMap.feet(m);
            this.add.image(p.x, p.y - 14, 'web').setDepth(44).setAlpha(0.85);
            this.webs.push(new Phaser.Geom.Rectangle(p.x - 13, p.y - 28, 26, 28));
        }

        // baby mice stuck in webs
        for (const m of markersOf(data, 'm')) {
            const p = WorldMap.feet(m);
            const baby = this.add.sprite(p.x, p.y - 6, 'baby').play('baby_wave').setDepth(42);
            const web = this.add.image(p.x, p.y - 10, 'web').setDepth(43).setScale(0.75);
            const help = text(this, p.x, p.y - 32, 'HELP!', 8, '#ffffff').setDepth(43);
            this.tweens.add({ targets: help, y: help.y - 3, yoyo: true, repeat: -1, duration: 300 });
            const zone = this.add.zone(p.x, p.y - 8, 18, 18);
            this.physics.add.existing(zone, true);
            this.physics.add.overlap(this.player, zone, () => {
                zone.destroy();
                help.destroy();
                this.freed++;
                setCount(this.freed);
                Sound.squeak();
                popWord(this, this.freed < 3 ? 'THANK YOU!' : 'ALL FREE! TO THE EXIT!', COLORS.good, 8, 900);
                this.tweens.add({ targets: web, scale: 1.4, alpha: 0, duration: 300, onComplete: () => web.destroy() });
                // the baby scampers off home to the exit
                baby.setFlipX(exit.x < p.x);
                this.tweens.add({
                    targets: baby, x: exit.x, y: exit.y - 6, duration: Math.abs(exit.x - p.x) * 6 + 400,
                    onComplete: () => baby.destroy(),
                });
            });
        }

        this.addSprings('J', 'spring', 600);
        this.threads = this.add.graphics().setDepth(45);
        markersOf(data, 's').forEach((m, i) => this.addSpider(m.col, i));

        const w = WorldMap.feet(markersOf(data, 'w')[0]);
        this.addHint(w.x, w.y - 44, 'STICKY!', 'STICKY!');
        const j = WorldMap.feet(markersOf(data, 'J')[0]);
        this.addHint(j.x, j.y - 40, 'BOING!', 'BOING!');
        this.add.image(18, 0, 'cobweb').setOrigin(0).setDepth(-45);
        this.add.image(this.world.widthPx - 18, 0, 'cobweb').setOrigin(1, 0).setFlipX(true).setDepth(-45);
        this.addBats(4, { x: 200, y: 30, w: 1100, h: 80 });

        Sound.setMood('cellar');
        this.begin();
    }

    protected tick(_time: number, delta: number) {
        this.t += delta;
        this.updateWebs();
        this.updateSpiders();
    }

    private updateWebs() {
        const pb = this.player.body;
        const me = new Phaser.Geom.Rectangle(pb.left, pb.top, pb.width, pb.height);
        const inWeb = this.webs.some((w) => Phaser.Geom.Intersects.RectangleToRectangle(w, me));
        if (inWeb && !this.inWeb) Sound.bloop();
        this.inWeb = inWeb;
        this.player.speedScale = inWeb ? WEB.speed : 1;
        this.player.jumpScale = inWeb ? WEB.jump : 1;
    }

    // ───────────────────────────────────────── dangling spiders

    private addSpider(col: number, i: number) {
        const x = col * TILE + 8;
        // dangle down until just above the first thing below
        let row = 1;
        while (row < this.world.data.height && this.world.data.cells[row][col] === 'empty') row++;
        const bottom = row * TILE - 10;
        const sprite = this.add.sprite(x, 8, 'spider').play('spider_wiggle').setDepth(46);
        const period = SPIDER.minPeriod + ((i * 700) % (SPIDER.maxPeriod - SPIDER.minPeriod));
        this.spiders.push({ sprite, x, top: 8, bottom, period, phase: i * 900 });
    }

    private updateSpiders() {
        const g = this.threads;
        g.clear();
        g.lineStyle(1, 0xc9c7da, 0.6);
        for (const s of this.spiders) {
            // smooth drop, linger at the bottom, climb back up
            const u = ((this.t + s.phase) % s.period) / s.period;
            const k = u < 0.4 ? Phaser.Math.Easing.Quadratic.InOut(u / 0.4) : u < 0.6 ? 1 : 1 - Phaser.Math.Easing.Quadratic.InOut((u - 0.6) / 0.4);
            s.sprite.y = s.top + (s.bottom - s.top) * k;
            g.lineBetween(s.x, 0, s.x, s.sprite.y - 4);
            if (Phaser.Math.Distance.Between(s.x, s.sprite.y, this.player.x, this.player.y) < SPIDER.hitRadius) {
                this.die('eek');
                return;
            }
        }
    }
}
