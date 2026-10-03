import Phaser from 'phaser';
import { COLORS, GAME_H, GAME_W, TILE } from '../config';
import { BaseLevelScene } from './BaseLevelScene';
import { LEVEL7_MAP } from '../levels/level7';
import { markerOf, markersOf } from '../levels/LevelMap';
import { WorldMap } from '../game/WorldMap';
import { Sound } from '../audio/Sound';
import { popWord } from '../ui/ui';

const LIGHT = { base: 44, perFirefly: 14, mushroom: 36 };
const DARK_PAD = 48;
const PAW = { idle: 1700, warn: 750, swipe: 500, reach: 40 };

interface Paw {
    faceX: number;
    y: number;
    dir: number;
    hole: Phaser.GameObjects.Sprite;
    paw: Phaser.GameObjects.Image;
    phase: number;
    out: number; // 0..1 how far the paw is extended
}

/**
 * Level 7 — Lights Out.
 * The basement is pitch black: the mouse only sees a small circle of light.
 * Fireflies join you and make the circle bigger; glowing mushrooms light up
 * patches of the room. Find the fuse box to switch the lights back on and
 * unlock the exit. Cat paws swipe out of holes in the walls!
 */
export default class Level7Scene extends BaseLevelScene {
    private dark!: Phaser.GameObjects.RenderTexture;
    private stamp!: Phaser.GameObjects.Image;
    private glows: { x: number; y: number; r: number }[] = [];
    private fireflies: Phaser.GameObjects.Sprite[] = [];
    private paws: Paw[] = [];
    private lightsOn = false;
    private t = 0;

    constructor() {
        super('Level7Scene');
    }

    create() {
        this.glows = [];
        this.fireflies = [];
        this.paws = [];
        this.lightsOn = false;
        this.t = 0;
        this.setupLevel(LEVEL7_MAP, 'cellar');
        const data = this.world.data;
        this.cameras.main.startFollow(this.player, true, 0.12, 0.12, 0, 20);

        this.makeLightStamp();
        // the darkness lives in the world (so it zooms with it) and follows the camera;
        // it is a little bigger than the screen so edges never peek through
        this.dark = this.add.renderTexture(0, 0, GAME_W + 2 * DARK_PAD, GAME_H + 2 * DARK_PAD).setOrigin(0).setDepth(900);
        this.stamp = this.make.image({ key: 'light', add: false });

        this.addPit();
        this.addExit(() => this.lightsOn, 'TOO DARK! FIND THE FUSE BOX');

        // fireflies: glow in the dark, follow you once collected
        const setCount = this.addCounter('firefly', 1, markersOf(data, 'f').length);
        for (const m of markersOf(data, 'f')) {
            const p = WorldMap.feet(m);
            const f = this.add.sprite(p.x, p.y - 10, 'firefly').play('firefly').setDepth(901);
            this.tweens.add({ targets: f, y: f.y - 5, x: f.x + 3, yoyo: true, repeat: -1, duration: 700, ease: 'Sine.InOut' });
            const zone = this.add.zone(p.x, p.y - 10, 14, 14);
            this.physics.add.existing(zone, true);
            this.physics.add.overlap(this.player, zone, () => {
                zone.destroy();
                this.tweens.killTweensOf(f);
                this.fireflies.push(f);
                setCount(this.fireflies.length);
                Sound.cheese();
                popWord(this, 'MORE LIGHT!', COLORS.accent, 8, 500);
            });
        }

        for (const m of markersOf(data, 'm')) {
            const p = WorldMap.feet(m);
            this.add.image(p.x, p.y - 6, 'mushroom').setDepth(901).setAlpha(0.9);
            this.glows.push({ x: p.x, y: p.y - 8, r: LIGHT.mushroom });
        }

        markersOf(data, 'w').forEach((m, i) => this.addPaw(m.col, m.row, i));
        this.addFuseBox();

        const s = WorldMap.feet(markerOf(data, 'P'));
        this.addHint(s.x + 70, s.y - 40, 'FIND THE\nFUSE BOX -->', 'FIND THE\nFUSE BOX -->').setDepth(902);

        Sound.setMood('cellar');
        this.begin();
    }

    protected tick(_time: number, delta: number) {
        this.t += delta;
        if (this.fellOut()) {
            this.die('cat');
            return;
        }
        this.updateFireflies();
        this.updatePaws();
        if (this.dead) return;
        this.drawDarkness();
    }

    // ───────────────────────────────────────── darkness

    /** A soft round light: white in the middle fading to nothing. */
    private makeLightStamp() {
        if (this.textures.exists('light')) return;
        const size = 128;
        const c = document.createElement('canvas');
        c.width = c.height = size;
        const ctx = c.getContext('2d')!;
        const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
        g.addColorStop(0, 'rgba(255,255,255,1)');
        g.addColorStop(0.55, 'rgba(255,255,255,0.9)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, size, size);
        this.textures.addCanvas('light', c);
    }

    private drawDarkness() {
        if (this.lightsOn) return;
        const cam = this.cameras.main;
        const ox = Math.floor(cam.worldView.x) - DARK_PAD, oy = Math.floor(cam.worldView.y) - DARK_PAD;
        this.dark.setPosition(ox, oy);
        const flicker = 1 + Math.sin(this.t / 120) * 0.03;
        const glow = (x: number, y: number, r: number) => {
            this.stamp.setPosition(x - ox, y - oy).setScale(((r * 2) / 128) * flicker);
            this.dark.erase(this.stamp);
        };
        this.dark.clear();
        this.dark.fill(0x05020a, 0.96);
        glow(this.player.x, this.player.y - 2, LIGHT.base + this.fireflies.length * LIGHT.perFirefly);
        for (const l of this.glows) glow(l.x, l.y, l.r);
    }

    private updateFireflies() {
        // collected fireflies circle around the mouse
        this.fireflies.forEach((f, i) => {
            const a = this.t / 600 + (i / this.fireflies.length) * Math.PI * 2;
            f.setPosition(this.player.x + Math.cos(a) * 14, this.player.y - 6 + Math.sin(a) * 8);
        });
    }

    // ───────────────────────────────────────── cat paws in the walls

    private addPaw(col: number, row: number, i: number) {
        const solidRight = this.world.data.cells[row][col + 1] === 'solid';
        const dir = solidRight ? -1 : 1;
        const faceX = (solidRight ? col + 1 : col) * TILE;
        const y = row * TILE + 8;
        const hole = this.add.sprite(faceX - dir * 2, y + 1, 'wall_hole', 0).setDepth(901).setFlipX(dir < 0);
        const paw = this.add.image(faceX, y, 'paw').setOrigin(0, 0.5).setDepth(31).setScale(0, 1);
        if (dir < 0) paw.setFlipX(true).setOrigin(1, 0.5);
        // the first paw starts resting so it doesn't ambush you right after the first jump
        this.paws.push({ faceX, y, dir, hole, paw, phase: 1000 + i * 1100, out: 0 });
    }

    private updatePaws() {
        const period = PAW.idle + PAW.warn + PAW.swipe;
        const pb = this.player.body;
        for (const p of this.paws) {
            const t = (this.t + p.phase) % period;
            const warn = t >= PAW.idle && t < PAW.idle + PAW.warn;
            const swipeT = t - PAW.idle - PAW.warn;
            p.out = swipeT >= 0 ? Math.sin((swipeT / PAW.swipe) * Math.PI) : 0;
            p.hole.setFrame(warn || p.out > 0 ? 1 : (Math.floor(this.t / 1800 + p.phase) % 3 === 0 ? 1 : 0));
            p.hole.x = p.faceX - p.dir * 2 + (warn ? Math.sin(this.t / 30) : 0);
            p.paw.setScale(p.out, 1);
            if (swipeT >= 0 && swipeT < 40) {
                const cam = this.cameras.main;
                if (Math.abs(p.faceX - (cam.scrollX + cam.width / 2)) < cam.width) Sound.whoosh();
            }
            if (p.out > 0.2) {
                const reach = PAW.reach * p.out;
                const x0 = p.dir > 0 ? p.faceX : p.faceX - reach;
                const hit = new Phaser.Geom.Rectangle(x0, p.y - 5, reach, 10);
                const me = new Phaser.Geom.Rectangle(pb.left, pb.top, pb.width, pb.height);
                if (Phaser.Geom.Intersects.RectangleToRectangle(hit, me)) {
                    this.die('swipe');
                    return;
                }
            }
        }
    }

    // ───────────────────────────────────────── fuse box

    private addFuseBox() {
        const p = WorldMap.feet(markerOf(this.world.data, 'Z'));
        const fuse = this.physics.add.staticSprite(p.x, p.y - 15, 'fuse', 0).setDepth(30);
        this.glows.push({ x: p.x, y: p.y - 15, r: 24 });
        const led = this.add.rectangle(p.x - 5, p.y - 23, 4, 4, 0xff3030).setDepth(901);
        this.tweens.add({ targets: led, alpha: 0.2, yoyo: true, repeat: -1, duration: 400 });
        this.physics.add.overlap(this.player, fuse, () => {
            if (this.lightsOn) return;
            this.lightsOn = true;
            fuse.setFrame(1);
            led.destroy();
            Sound.fuse();
            popWord(this, 'LIGHTS ON!', COLORS.good, 16, 1200);
            this.cameras.main.flash(300, 255, 246, 216);
            this.tweens.add({ targets: this.dark, alpha: 0, duration: 900, onComplete: () => this.dark.setVisible(false) });
            this.time.delayedCall(1300, () => popWord(this, 'NOW FIND THE EXIT!', COLORS.accent, 8, 1200));
        });
    }

    private addPit() {
        const w = this.world.widthPx, h = this.world.heightPx;
        const g = this.add.graphics().setDepth(40);
        const top = h - 5 * TILE;
        for (let i = 0; i < 12; i++) {
            g.fillStyle(0x000000, (i + 1) / 12);
            g.fillRect(0, top + i * 4, w, 4);
        }
        g.fillStyle(0x000000, 1).fillRect(0, top + 48, w, 64);
    }
}
