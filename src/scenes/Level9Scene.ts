import Phaser from 'phaser';
import { COLORS } from '../config';
import { BaseLevelScene } from './BaseLevelScene';
import { LEVEL9_MAP } from '../levels/level9';
import { markerOf, markersOf } from '../levels/LevelMap';
import { WorldMap } from '../game/WorldMap';
import { Sound } from '../audio/Sound';
import { popWord, text } from '../ui/ui';

const LIBRARIAN = { speed: 32, range: 120, pause: 1300 };
const BEAM = { length: 200, halfAngle: 0.33, angle: 1.05, grace: 180 };

interface Librarian {
    sprite: Phaser.GameObjects.Sprite;
    minX: number;
    maxX: number;
    dir: number;
    pauseUntil: number;
    baseY: number;
}

/**
 * Level 9 — The Haunted Library.
 * Find the 3 lost pages. Ghost librarians float overhead sweeping lantern
 * beams across the floor. Get caught in the light and it's "SHHH!" — duck
 * behind a stack of books to stay hidden while the beam passes.
 */
export default class Level9Scene extends BaseLevelScene {
    private pages = 0;
    private librarians: Librarian[] = [];
    private covers: number[] = [];
    private beams!: Phaser.GameObjects.Graphics;
    private litFor = 0;
    private t = 0;
    private floorY = 0;
    private hiddenText!: Phaser.GameObjects.Text;

    constructor() {
        super('Level9Scene');
    }

    create() {
        this.pages = 0;
        this.librarians = [];
        this.covers = [];
        this.litFor = 0;
        this.t = 0;
        this.setupLevel(LEVEL9_MAP, 'library');
        const data = this.world.data;
        this.floorY = WorldMap.feet(markerOf(data, 'P')).y;
        this.cameras.main.startFollow(this.player, true, 0.12, 0.12);

        this.addExit(() => this.pages >= 3, 'FIND ALL 3 PAGES!');
        const setCount = this.addCounter('page', 0, 3);
        for (const m of markersOf(data, 'p')) {
            const p = WorldMap.feet(m);
            const pg = this.physics.add.staticSprite(p.x, p.y - 10, 'page').play('page_glow').setDepth(20);
            this.tweens.add({ targets: pg, angle: { from: -8, to: 8 }, y: pg.y - 3, yoyo: true, repeat: -1, duration: 700 });
            this.physics.add.overlap(this.player, pg, () => {
                pg.destroy();
                this.pages++;
                setCount(this.pages);
                Sound.keyGet();
                popWord(this, this.pages < 3 ? `PAGE ${this.pages}/3` : 'ALL PAGES! TO THE EXIT!', COLORS.good, 8, 800);
            });
        }

        // book stacks: stand behind one to hide from the light
        for (const m of markersOf(data, 'c')) {
            const p = WorldMap.feet(m);
            this.add.image(p.x, p.y, 'book_stack').setOrigin(0.5, 1).setDepth(60);
            this.covers.push(p.x);
        }

        this.beams = this.add.graphics().setDepth(58);
        for (const m of markersOf(data, 'g')) {
            const p = WorldMap.feet(m);
            const sprite = this.add.sprite(p.x, p.y, 'librarian').play('librarian').setDepth(59).setAlpha(0.9);
            this.librarians.push({
                sprite, dir: 1, pauseUntil: 0, baseY: p.y,
                minX: Math.max(40, p.x - LIBRARIAN.range), maxX: Math.min(this.world.widthPx - 40, p.x + LIBRARIAN.range),
            });
        }

        this.hiddenText = text(this, 0, 0, 'HIDDEN', 8, COLORS.good).setDepth(61).setVisible(false);
        const c = WorldMap.feet(markersOf(data, 'c')[0]);
        this.addHint(c.x, c.y - 62, 'HIDE BEHIND\nTHE BOOKS!', 'HIDE BEHIND\nTHE BOOKS!');
        for (const x of [160, 700, 1300]) this.add.sprite(x, 140, 'candle').play('candle').setDepth(-30);
        this.addPortrait(400, 70);
        this.addPortrait(1100, 70);

        Sound.setMood('house');
        this.begin();
    }

    private covered() {
        const pb = this.player.body;
        return pb.bottom > this.floorY - 40 && this.covers.some((x) => Math.abs(this.player.x - x) < 11);
    }

    protected tick(_time: number, delta: number) {
        const dt = Math.min(delta, 50) / 1000;
        this.t += delta;
        const hidden = this.covered();
        this.hiddenText.setVisible(hidden).setPosition(this.player.x, this.player.y - 22);

        const g = this.beams;
        g.clear();
        let lit = false;
        for (const l of this.librarians) {
            const s = l.sprite;
            // float back and forth, pausing at each end (the beam sweeps round)
            if (this.t >= l.pauseUntil) {
                s.x += l.dir * LIBRARIAN.speed * dt;
                if (s.x >= l.maxX || s.x <= l.minX) {
                    s.x = Phaser.Math.Clamp(s.x, l.minX, l.maxX);
                    l.dir *= -1;
                    l.pauseUntil = this.t + LIBRARIAN.pause;
                }
            }
            s.setFlipX(l.dir < 0);
            s.y = l.baseY + Math.sin(this.t / 500 + l.minX) * 3;

            const lx = s.x + 14 * l.dir, ly = s.y + 8;
            const ang = l.dir > 0 ? BEAM.angle : Math.PI - BEAM.angle;
            const a0 = ang - BEAM.halfAngle, a1 = ang + BEAM.halfAngle;
            const hit = !hidden && this.inBeam(lx, ly, ang);
            if (hit) lit = true;
            g.fillStyle(hit ? 0xff6060 : 0xfff2a0, hit ? 0.3 : 0.16);
            g.beginPath();
            g.moveTo(lx, ly);
            g.lineTo(lx + Math.cos(a0) * BEAM.length, ly + Math.sin(a0) * BEAM.length);
            g.lineTo(lx + Math.cos(a1) * BEAM.length, ly + Math.sin(a1) * BEAM.length);
            g.closePath();
            g.fillPath();
        }
        // a short grace period so a beam just brushing past is fair
        this.litFor = lit ? this.litFor + delta : 0;
        if (this.litFor > BEAM.grace) this.die('shh');
    }

    private inBeam(lx: number, ly: number, ang: number) {
        const px = this.player.x, py = this.player.y;
        const dx = px - lx, dy = py - ly;
        const d = Math.hypot(dx, dy);
        if (d > BEAM.length || d < 4) return false;
        let diff = Math.atan2(dy, dx) - ang;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        return Math.abs(diff) < BEAM.halfAngle;
    }
}
