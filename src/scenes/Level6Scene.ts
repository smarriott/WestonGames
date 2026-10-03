import Phaser from 'phaser';
import { COLORS } from '../config';
import { BaseLevelScene } from './BaseLevelScene';
import { LEVEL6_MAP } from '../levels/level6';
import { markerOf, markersOf } from '../levels/LevelMap';
import { WorldMap } from '../game/WorldMap';
import { Sound } from '../audio/Sound';
import { popWord } from '../ui/ui';

const GHOST = { speed: 24, wakeRange: 300, seeRange: 300, hitRadius: 12 };
const BURNER = { period: 3400, on: 1500, warn: 500 };

interface Ghost {
    sprite: Phaser.GameObjects.Sprite;
    awake: boolean;
    moving: boolean;
}

interface Burner {
    x: number;
    top: number;
    flame: Phaser.GameObjects.Sprite;
    phase: number;
    on: boolean;
}

/**
 * Level 6 — The Ghost Kitchen.
 * Run to the far end of the kitchen, grab the BIG cheese and carry it home.
 * The ghosts are shy: they freeze (hiding their eyes) while the mouse faces
 * them, and creep closer whenever it looks away. Stove burners flare up.
 */
export default class Level6Scene extends BaseLevelScene {
    private ghosts: Ghost[] = [];
    private burners: Burner[] = [];
    private carrying = false;
    private carried!: Phaser.GameObjects.Image;
    private booAt = 0;
    private t = 0;

    constructor() {
        super('Level6Scene');
    }

    create() {
        this.ghosts = [];
        this.burners = [];
        this.carrying = false;
        this.t = 0;
        this.setupLevel(LEVEL6_MAP, 'kitchen');
        const data = this.world.data;
        this.cameras.main.startFollow(this.player, true, 0.12, 0.12);
        this.player.setFlipX(false);

        this.addExit(() => this.carrying, 'GET THE BIG CHEESE FIRST!', 'HOME');

        // the big cheese
        const c = WorldMap.feet(markerOf(data, 'C'));
        const cheese = this.physics.add.staticSprite(c.x, c.y - 11, 'big_cheese').setDepth(20);
        this.tweens.add({ targets: cheese, angle: { from: -4, to: 4 }, yoyo: true, repeat: -1, duration: 500 });
        this.carried = this.add.image(0, 0, 'big_cheese').setScale(0.6).setDepth(55).setVisible(false);
        this.physics.add.overlap(this.player, cheese, () => {
            cheese.destroy();
            this.carrying = true;
            this.player.speedScale = 0.88;
            this.player.jumpScale = 0.95;
            Sound.keyGet();
            popWord(this, 'NOW TAKE IT HOME!', COLORS.good, 16, 1100);
        });

        // burners on the same counter flare up together
        let group = 0, lastCol = -99;
        for (const m of markersOf(data, 'B')) {
            if (m.col - lastCol > 4) group++;
            lastCol = m.col;
            this.addBurner(m.col, m.row, group);
        }
        for (const m of markersOf(data, 'G')) {
            const p = WorldMap.feet(m);
            const sprite = this.add.sprite(p.x, p.y - 8, 'ghost', 1).setDepth(48).setAlpha(0.9);
            this.ghosts.push({ sprite, awake: false, moving: false });
        }
        this.add.image(590, 198, 'pot').setDepth(15);

        const g = WorldMap.feet(markersOf(data, 'G')[0]);
        this.addHint(g.x, g.y - 60, 'LOOK AT GHOSTS\nTO FREEZE THEM!', 'LOOK AT GHOSTS\nTO FREEZE THEM!');
        const s = WorldMap.feet(markerOf(data, 'P'));
        this.addHint(s.x + 60, s.y - 40, 'GET THE CHEESE -->', 'GET THE CHEESE -->');
        this.addPortrait(200, 80);
        this.addPortrait(900, 70);

        Sound.setMood('house');
        this.begin();
    }

    protected tick(_time: number, delta: number) {
        const dt = Math.min(delta, 50) / 1000;
        this.t += delta;
        if (this.carrying) this.carried.setVisible(true).setPosition(this.player.x, this.player.y - 14);
        this.updateBurners();
        if (this.dead) return;
        this.updateGhosts(dt);
    }

    // ───────────────────────────────────────── shy ghosts

    private updateGhosts(dt: number) {
        const p = this.player;
        const facing = p.flipX ? -1 : 1;
        for (const g of this.ghosts) {
            const s = g.sprite;
            const dx = p.x - s.x, dy = (p.y - 2) - s.y;
            const dist = Math.hypot(dx, dy);
            if (!g.awake && dist < GHOST.wakeRange) g.awake = true;
            if (!g.awake) continue;

            // the mouse is looking at this ghost: freeze, too shy to move
            const seen = Math.sign(s.x - p.x) === facing && Math.abs(dx) < GHOST.seeRange;
            if (seen) {
                s.setFrame(1);
                g.moving = false;
                s.y += Math.sin(this.t / 300) * 0.1;
            } else {
                if (!g.moving && dist < 220 && this.t > this.booAt) {
                    Sound.boo();
                    this.booAt = this.t + 2500;
                }
                g.moving = true;
                s.setFrame(0);
                s.setFlipX(dx < 0);
                const k = (GHOST.speed * dt) / Math.max(dist, 1);
                s.x += dx * k;
                s.y += dy * k + Math.sin(this.t / 250) * 0.3;
            }
            if (dist < GHOST.hitRadius) {
                this.die('boo');
                return;
            }
        }
    }

    // ───────────────────────────────────────── stove burners

    private addBurner(col: number, row: number, group: number) {
        const p = WorldMap.feet({ ch: 'B', col, row });
        const x = p.x + 8;
        this.add.image(x, p.y, 'burner').setOrigin(0.5, 1).setDepth(21);
        const flame = this.add.sprite(x, p.y - 4, 'flame', 0).setOrigin(0.5, 1).setDepth(22).setVisible(false);
        flame.play('flame');
        this.burners.push({ x, top: p.y, flame, phase: group * 1100, on: false });
    }

    private updateBurners() {
        const pb = this.player.body;
        for (const b of this.burners) {
            const t = (this.t + b.phase) % BURNER.period;
            const warn = t < BURNER.warn;
            const on = t >= BURNER.warn && t < BURNER.warn + BURNER.on;
            // a small blue flicker warns that the flame is about to flare up
            b.flame.setVisible(warn || on).setScale(warn ? 0.4 : 1).setAlpha(warn ? 0.6 : 1);
            if (on && !b.on) {
                const cam = this.cameras.main;
                if (b.x > cam.scrollX - 20 && b.x < cam.scrollX + cam.width + 20) Sound.sizzle();
            }
            b.on = on;
            if (on && pb.right > b.x - 12 && pb.left < b.x + 12 && pb.bottom > b.top - 20 && pb.top < b.top) {
                this.die('hot');
                return;
            }
        }
    }
}
