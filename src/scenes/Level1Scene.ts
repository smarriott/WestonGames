import Phaser from 'phaser';
import { COLORS, TILE } from '../config';
import { BaseLevelScene } from './BaseLevelScene';
import { LEVEL1_MAP } from '../levels/level1';
import { markerOf, markersOf } from '../levels/LevelMap';
import { WorldMap } from '../game/WorldMap';
import { Sound } from '../audio/Sound';
import { text } from '../ui/ui';

/**
 * Level 1 — The Ladders.
 * Jump and climb up to the glowing mouse hole. Everything hangs over a dark
 * pit: miss a ladder and a giant cat pops up and catches you.
 */
export default class Level1Scene extends BaseLevelScene {
    private cheeseGot = 0;
    private cheeseTotal = 0;
    private cheeseText!: Phaser.GameObjects.Text;

    constructor() {
        super('Level1Scene');
    }

    create() {
        this.setupLevel(LEVEL1_MAP, 'cellar');
        const data = this.world.data;
        const cam = this.cameras.main;
        cam.startFollow(this.player, true, 0.12, 0.12, 0, 20);

        this.addDecor();
        this.addPit();

        // exit
        const ex = WorldMap.feet(markerOf(data, 'X'));
        const exit = this.physics.add.staticSprite(ex.x, ex.y - 13, 'exit').play('exit_glow').setDepth(20);
        exit.body.setSize(12, 18);
        this.physics.add.overlap(this.player, exit, () => this.complete());
        // label above the door, or beside it if that would hit the HUD
        if (ex.y - 36 > 40) text(this, ex.x, ex.y - 36, 'EXIT', 8, COLORS.good).setDepth(21);
        else text(this, ex.x - 18, ex.y - 14, 'EXIT', 8, COLORS.good, 'right').setDepth(21);

        // cheese (bonus)
        this.cheeseGot = 0;
        const cheeses = markersOf(data, 'c');
        this.cheeseTotal = cheeses.length;
        for (const m of cheeses) {
            const p = WorldMap.feet(m);
            const c = this.physics.add.staticSprite(p.x, p.y - 8, 'cheese').play('cheese_shine').setDepth(20);
            this.tweens.add({ targets: c, y: c.y - 3, yoyo: true, repeat: -1, duration: 500 + Math.random() * 200, ease: 'Sine.InOut' });
            this.physics.add.overlap(this.player, c, () => {
                c.destroy();
                this.cheeseGot++;
                this.cheeseText.setText(`${this.cheeseGot}/${this.cheeseTotal}`);
                Sound.cheese();
            });
        }
        this.add.image(this.hudRight - 30, 14, 'cheese').setScrollFactor(0).setDepth(950);
        this.cheeseText = text(this, this.hudRight - 22, 14, `0/${this.cheeseTotal}`, 8, COLORS.accent, 'left')
            .setScrollFactor(0).setDepth(950);

        // hint signs
        const hint = (ch: string, kb: string, touch: string) => {
            for (const m of markersOf(data, ch)) {
                const p = WorldMap.feet(m);
                this.addHint(p.x, p.y - 34, kb, touch);
            }
        };
        hint('?', 'SPACE\nTO JUMP', 'TAP JUMP');
        hint('!', 'UP TO\nCLIMB', 'PUSH UP\nTO CLIMB');
        hint('^', 'JUMP TO\nTHE LADDER!', 'JUMP TO\nTHE LADDER!');

        Sound.setMood('cellar');
        this.begin();
    }

    protected tick() {
        if (this.player.y > this.world.heightPx + 8) this.die('cat');
    }

    /** The dark pit along the bottom, with eyes blinking in it. */
    private addPit() {
        const w = this.world.widthPx, h = this.world.heightPx;
        const g = this.add.graphics().setDepth(40);
        const top = h - 3 * TILE;
        for (let i = 0; i < 12; i++) {
            g.fillStyle(0x000000, (i + 1) / 12);
            g.fillRect(0, top + i * 4, w, 4);
        }
        g.fillStyle(0x000000, 1).fillRect(0, top + 48, w, 64);

        // eyes that blink in the dark — the cat is down there!
        const spots = [26, 33, 44, 52, 60];
        spots.forEach((col, i) => {
            const eyes = this.add.sprite(col * TILE, h - 10, 'pit_eyes', 1).setDepth(41).setAlpha(0);
            this.time.addEvent({
                delay: 1800 + i * 700, loop: true,
                callback: () => {
                    eyes.setFrame(0);
                    this.tweens.add({
                        targets: eyes, alpha: 1, duration: 300, yoyo: true, hold: 900,
                        onYoyo: () => eyes.setFrame(1),
                    });
                },
            });
        });
    }

    private addDecor() {
        const w = this.world.widthPx;
        this.add.image(0, 0, 'cobweb').setOrigin(0).setDepth(-45);
        this.add.image(w, 0, 'cobweb').setOrigin(0).setFlipX(true).setOrigin(1, 0).setDepth(-45);
        this.addPortrait(120, 248);
        this.addPortrait(600, 72);
        for (const [x, y] of [[262, 240], [500, 144], [780, 48]]) {
            this.add.sprite(x, y - 8, 'candle').play('candle').setDepth(-30);
        }
        this.addBats(5, { x: 300, y: 20, w: 600, h: 120 });
    }
}
