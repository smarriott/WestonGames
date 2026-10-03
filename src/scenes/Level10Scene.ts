import Phaser from 'phaser';
import { COLORS, GAME_W } from '../config';
import { BaseLevelScene } from './BaseLevelScene';
import { LEVEL10_MAP } from '../levels/level10';
import { markerOf, markersOf } from '../levels/LevelMap';
import { WorldMap } from '../game/WorldMap';
import { Sound } from '../audio/Sound';
import { popWord, text } from '../ui/ui';

const CAT = {
    prowl: 45,
    stalk: 78,
    run: 120,
    hear: 190,
    lose: 260,
    pounceRange: 105,
    crouchMs: 800,
    pounceMs: 560,
    playMs: 6500,
    bells: 3,
};

type CatState = 'prowl' | 'toYarn' | 'play' | 'stalk' | 'crouch' | 'pounce' | 'recover' | 'startled' | 'flee' | 'gone';

/**
 * Level 10 — Bell the Cat (the final boss).
 * Based on the old fable: the mice agree the cat needs a bell so they can hear
 * it coming. Take yarn from the basket and drop it on the floor: the cat
 * can't resist playing with it. While it plays, sneak up and clip a bell on
 * its collar. Three bells and the jingly cat runs away. Escape outside!
 */
export default class Level10Scene extends BaseLevelScene {
    private cat!: Phaser.GameObjects.Sprite;
    private cdir = -1;
    private cstate: CatState = 'prowl';
    private cAt = 0;
    private pounceFrom = 0;
    private pounceTo = 0;
    private bells = 0;
    private bellIcons: Phaser.GameObjects.Image[] = [];
    private collarBells: Phaser.GameObjects.Image[] = [];
    private bubble!: Phaser.GameObjects.Text;
    private floorY = 0;
    private t = 0;
    private nextTurnAt = 0;
    // yarn
    private carrying = false;
    private carried!: Phaser.GameObjects.Image;
    private yarn?: Phaser.GameObjects.Image;
    // hiding
    private hole = { x: 0, half: 10 };
    private peek!: Phaser.GameObjects.Sprite;
    private prompt!: Phaser.GameObjects.Text;

    constructor() {
        super('Level10Scene');
    }

    create() {
        this.cdir = -1;
        this.cstate = 'prowl';
        this.bells = 0;
        this.bellIcons = [];
        this.collarBells = [];
        this.carrying = false;
        this.yarn = undefined;
        this.t = 0;
        this.nextTurnAt = 0;
        this.setupLevel(LEVEL10_MAP, 'house', { action: true });
        const data = this.world.data;
        this.floorY = WorldMap.feet(markerOf(data, 'P')).y;
        this.cameras.main.startFollow(this.player, true, 0.12, 0.12);

        this.addExit(() => this.cstate === 'gone', 'BELL THE CAT FIRST!', 'OUTSIDE');

        // yarn basket on the shelf
        const y = WorldMap.feet(markerOf(data, 'Y'));
        const basket = this.physics.add.staticSprite(y.x, y.y - 9, 'trap_box').setDepth(20);
        for (const [dx, dy] of [[-5, -20], [5, -20], [0, -28]]) this.add.image(y.x + dx, y.y + dy, 'yarn').setDepth(21);
        text(this, y.x, y.y - 44, 'YARN', 8, COLORS.accent).setDepth(21);
        this.physics.add.overlap(this.player, basket, () => {
            if (this.carrying || this.yarn || this.cstate === 'gone' || this.cstate === 'flee') return;
            this.carrying = true;
            Sound.pop();
            popWord(this, 'GOT YARN!', COLORS.accent, 8, 500);
        });
        this.carried = this.add.image(0, 0, 'yarn').setScale(0.8).setDepth(55).setVisible(false);

        // a mouse hole to hide in
        const h = WorldMap.feet(markerOf(data, 'h'));
        this.add.image(h.x, this.floorY, 'hide_house').setOrigin(0.5, 1).setDepth(20);
        this.hole = { x: h.x, half: 9 };
        this.peek = this.add.sprite(h.x, this.floorY - 8, 'peek', 0).setDepth(30).setVisible(false);
        this.prompt = text(this, 0, 0, '', 8, COLORS.text).setDepth(60).setVisible(false);

        // the cat
        const k = WorldMap.feet(markerOf(data, 'K'));
        this.cat = this.add.sprite(k.x, this.floorY + 1, 'boss_cat', 0).setOrigin(0.5, 1).setDepth(45).play('boss_walk');
        for (let i = 0; i < CAT.bells; i++) this.collarBells.push(this.add.image(0, 0, 'bell').setDepth(46).setVisible(false));
        this.bubble = text(this, 0, 0, '', 16, COLORS.danger).setDepth(60).setVisible(false);

        // HUD: bells to place
        for (let i = 0; i < CAT.bells; i++) {
            this.bellIcons.push(this.add.image(GAME_W / 2 - 14 + i * 14, 14, 'bell').setScrollFactor(0).setDepth(950).setAlpha(0.3).setScale(1.3));
        }
        text(this, GAME_W / 2 - 30, 14, 'BELLS', 8, COLORS.accent, 'right').setScrollFactor(0).setDepth(950);

        this.addDecor();
        Sound.setMood('boss');
        this.begin();
    }

    protected onStart() {
        if (this.retry) return;
        const tip = text(this, GAME_W / 2, 52, 'GET YARN, DROP IT ON THE FLOOR...\nTHEN SNEAK UP AND BELL THE CAT!', 8, COLORS.accent)
            .setScrollFactor(0).setDepth(940);
        this.tweens.add({ targets: tip, alpha: 0, delay: 5000, duration: 600, onComplete: () => tip.destroy() });
    }

    protected tick(_time: number, delta: number) {
        const dt = Math.min(delta, 50) / 1000;
        this.t += delta;
        this.updateActions();
        this.updateCat(dt);
        this.layoutCat();
        if (this.carrying) this.carried.setVisible(!this.player.hidden).setPosition(this.player.x, this.player.y - 14);
        else this.carried.setVisible(false);
    }

    // ───────────────────────────────────────── the mouse: drop yarn, hide, bell

    private headX() {
        return this.cat.x + this.cdir * 20;
    }

    private updateActions() {
        const c = this.controls, p = this.player;
        const kb = !c.pad.isVisible;
        if (p.hidden) {
            this.prompt.setVisible(false);
            c.pad.setActionIcon('peek', 0, true);
            if (c.justDown('action') || c.justDown('jump') || c.justDown('left') || c.justDown('right') || c.justDown('up')) {
                p.hidden = false;
                p.setVisible(true);
                this.peek.setVisible(false);
                Sound.unpop();
            }
            return;
        }
        const onFloor = p.isOnFloorAt(this.floorY);
        const nearHead = this.cstate === 'play' && onFloor && Math.abs(p.x - this.headX()) < 22;
        const inHole = onFloor && Math.abs(p.x - this.hole.x) <= this.hole.half;
        const show = (label: string, tex: string, frame: number, x: number, y: number) => {
            this.prompt.setText(kb ? `E: ${label}` : label).setPosition(x, y).setVisible(true);
            c.pad.setActionIcon(tex, frame, true);
        };
        if (nearHead) {
            show('BELL!', 'bell', 0, p.x, p.y - 30);
            if (c.justDown('action')) this.ringBell();
        } else if (inHole) {
            show('HIDE', 'peek', 0, this.hole.x, this.floorY - 40);
            if (c.justDown('action')) {
                p.hidden = true;
                p.setVisible(false);
                p.body.setVelocity(0, 0);
                p.x = this.hole.x;
                this.peek.setVisible(true);
                Sound.pop();
            }
        } else if (this.carrying && onFloor) {
            show('DROP YARN', 'yarn', 0, p.x, p.y - 30);
            if (c.justDown('action')) this.dropYarn();
        } else {
            this.prompt.setVisible(false);
            c.pad.setActionIcon('icons', 7, false);
        }
    }

    private dropYarn() {
        this.carrying = false;
        const dir = this.player.flipX ? -1 : 1;
        const x = Phaser.Math.Clamp(this.player.x + dir * 40, 40, this.world.widthPx - 40);
        const y = this.add.image(this.player.x, this.floorY - 6, 'yarn').setDepth(44);
        this.tweens.add({ targets: y, x, angle: 360 * dir, duration: 500, ease: 'Quad.Out' });
        this.yarn = y;
        Sound.click();
    }

    private ringBell() {
        this.bells++;
        Sound.jingle();
        this.bellIcons[this.bells - 1].setAlpha(1);
        this.tweens.add({ targets: this.bellIcons[this.bells - 1], scale: { from: 3, to: 1.3 }, duration: 300 });
        this.collarBells[this.bells - 1].setVisible(true);
        this.yarn?.destroy();
        this.yarn = undefined;
        if (this.bells >= CAT.bells) {
            this.setState('flee');
            this.say('JINGLE JINGLE?!', COLORS.accent, 8);
            popWord(this, 'THE CAT IS SCARED OF ITS OWN BELLS!', COLORS.good, 8, 1600);
        } else {
            this.setState('startled');
            this.say('MRROW?!', COLORS.danger, 16);
            popWord(this, `BELL ${this.bells} OF ${CAT.bells}!`, COLORS.good, 16, 900);
        }
    }

    // ───────────────────────────────────────── the cat

    private setState(s: CatState) {
        this.cstate = s;
        this.cAt = this.t;
    }

    private say(str: string, color: string, size = 16) {
        this.bubble.setText(str).setColor(color).setFontSize(size).setVisible(true).setScale(0.3);
        this.tweens.add({ targets: this.bubble, scale: 1, duration: 200, ease: 'Back.Out' });
        this.time.delayedCall(1200, () => this.bubble.setVisible(false));
    }

    private hearsMouse(range: number) {
        const p = this.player;
        return !p.hidden && p.isOnFloorAt(this.floorY) && Math.abs(p.x - this.cat.x) < range;
    }

    private walk(dir: number, speed: number, dt: number) {
        this.cdir = dir === 0 ? this.cdir : dir;
        this.cat.x = Phaser.Math.Clamp(this.cat.x + dir * speed * dt, 50, this.world.widthPx - 50);
        if (this.cat.anims.currentAnim?.key !== 'boss_walk' || !this.cat.anims.isPlaying) this.cat.play('boss_walk');
        this.cat.anims.timeScale = speed / 50;
    }

    private pose(frame: number) {
        this.cat.anims.stop();
        this.cat.setFrame(frame);
    }

    private updateCat(dt: number) {
        const since = this.t - this.cAt;
        const p = this.player;
        const min = 50, max = this.world.widthPx - 50;
        switch (this.cstate) {
            case 'prowl':
                if (this.cat.x <= min + 1) this.cdir = 1;
                else if (this.cat.x >= max - 1) this.cdir = -1;
                else if (this.t > this.nextTurnAt) {
                    this.nextTurnAt = this.t + 3000 + Math.random() * 3000;
                    if (Math.random() < 0.35) this.cdir *= -1;
                }
                this.walk(this.cdir, CAT.prowl, dt);
                if (this.yarn) {
                    this.setState('toYarn');
                    this.say('!?', COLORS.accent);
                } else if (this.hearsMouse(CAT.hear)) {
                    this.setState('stalk');
                    this.say('!', COLORS.danger);
                    Sound.alert();
                }
                break;
            case 'toYarn': {
                if (!this.yarn) { this.setState('prowl'); break; }
                const dx = this.yarn.x - this.cat.x;
                if (Math.abs(dx) < 16) {
                    this.setState('play');
                    this.pose(4);
                    Sound.purr();
                } else {
                    this.walk(Math.sign(dx), CAT.run, dt);
                }
                break;
            }
            case 'play':
                // happy hearts while it bats the yarn about
                if (Math.floor(since / 700) !== Math.floor((since - dt * 1000) / 700)) {
                    const heart = this.add.image(this.cat.x + Phaser.Math.Between(-10, 10), this.cat.y - 40, 'heart', 0).setDepth(47);
                    this.tweens.add({ targets: heart, y: heart.y - 20, alpha: 0, duration: 700, onComplete: () => heart.destroy() });
                }
                if (this.yarn) this.yarn.setPosition(this.cat.x + this.cdir * 6, this.floorY - 30 + Math.abs(Math.sin(since / 150)) * -8);
                if (since > CAT.playMs) {
                    // bored: the yarn rolls away under the sofa
                    const y = this.yarn;
                    this.yarn = undefined;
                    if (y) this.tweens.add({ targets: y, x: y.x + 200 * this.cdir, alpha: 0, angle: 720, duration: 800, onComplete: () => y.destroy() });
                    this.setState('prowl');
                    popWord(this, 'TOO SLOW! GET MORE YARN', COLORS.accent, 8, 900);
                }
                break;
            case 'stalk': {
                if (this.yarn) { this.setState('toYarn'); break; }
                if (!this.hearsMouse(CAT.lose)) {
                    this.setState('prowl');
                    this.say(p.hidden ? '?' : 'MEOW?', COLORS.accent, p.hidden ? 16 : 8);
                    break;
                }
                const dx = p.x - this.cat.x;
                if (Math.abs(dx) < CAT.pounceRange) {
                    this.cdir = Math.sign(dx) || this.cdir;
                    this.setState('crouch');
                    this.pose(2);
                    this.say('!!', COLORS.danger);
                } else {
                    this.walk(Math.sign(dx), CAT.stalk, dt);
                }
                break;
            }
            case 'crouch':
                // butt wiggle = "get ready to run!"
                this.cat.x += Math.sin(since / 40) * 0.6;
                if (since > CAT.crouchMs) {
                    this.pounceFrom = this.cat.x;
                    this.pounceTo = Phaser.Math.Clamp(p.x, min, max);
                    this.cdir = Math.sign(this.pounceTo - this.pounceFrom) || this.cdir;
                    this.setState('pounce');
                    this.pose(3);
                    Sound.whoosh();
                }
                break;
            case 'pounce': {
                const k = Math.min(1, since / CAT.pounceMs);
                this.cat.x = Phaser.Math.Linear(this.pounceFrom, this.pounceTo, k);
                this.cat.y = this.floorY + 1 - Math.sin(k * Math.PI) * 46;
                if (k >= 1) {
                    this.cat.y = this.floorY + 1;
                    Sound.thud();
                    this.cameras.main.shake(150, 0.01);
                    if (!p.hidden && p.isOnFloorAt(this.floorY) && Math.abs(p.x - this.pounceTo) < 24) {
                        this.die('caught');
                        return;
                    }
                    this.setState('recover');
                    this.pose(5);
                }
                break;
            }
            case 'recover':
                if (since > 900) this.setState('prowl');
                break;
            case 'startled': {
                // jump with fright, then dash to the other side of the room
                if (since < 400) {
                    this.pose(3);
                    this.cat.y = this.floorY + 1 - Math.sin((since / 400) * Math.PI) * 30;
                } else {
                    this.cat.y = this.floorY + 1;
                    const away = this.cat.x < this.world.widthPx / 2 ? 1 : -1;
                    this.walk(away, CAT.run * 1.4, dt);
                    if (since > 1700) this.setState('prowl');
                }
                break;
            }
            case 'flee':
                this.cat.y = this.floorY + 1 - Math.abs(Math.sin(since / 120)) * 10;
                this.cdir = -1;
                this.cat.x -= CAT.run * 1.8 * dt;
                this.cat.play('boss_walk', true);
                if (Math.floor(since / 300) !== Math.floor((since - dt * 1000) / 300)) Sound.jingle();
                if (this.cat.x < -80) {
                    this.setState('gone');
                    this.cat.setVisible(false);
                    this.collarBells.forEach((b) => b.setVisible(false));
                    popWord(this, 'THE DOOR IS OPEN! ESCAPE!', COLORS.good, 8, 1500);
                }
                break;
            case 'gone':
                break;
        }

        // touching the cat (unless it's busy playing or running away) = caught
        if (['prowl', 'toYarn', 'stalk', 'crouch'].includes(this.cstate) && !p.hidden) {
            const cb = new Phaser.Geom.Rectangle(this.cat.x - 18, this.cat.y - 26, 36, 26);
            const pb = p.body;
            if (Phaser.Geom.Intersects.RectangleToRectangle(cb, new Phaser.Geom.Rectangle(pb.left, pb.top, pb.width, pb.height))) {
                this.die('caught');
            }
        }
    }

    private layoutCat() {
        this.cat.setFlipX(this.cdir < 0);
        // bells hang on the collar (which moves with the pose)
        const frame = Number(this.cat.frame.name);
        const collar: Record<number, [number, number]> = { 0: [15, 17], 1: [15, 17], 2: [17, 5], 3: [19, 20], 4: [17, 5], 5: [2, 20] };
        const [cx, cy] = collar[frame] ?? [15, 17];
        this.collarBells.forEach((b, i) => {
            b.setPosition(this.cat.x + this.cdir * (cx + (i - 1) * 4), this.cat.y - cy + 2);
        });
        this.bubble.setPosition(this.cat.x, this.cat.y - 64);
    }

    private addDecor() {
        // fireplace and a window showing the first light of morning
        const g = this.add.graphics().setDepth(-40);
        g.fillStyle(0x4e2f1a).fillRect(420, 150, 96, 90);
        g.fillStyle(0x1a1423).fillRect(436, 176, 64, 64);
        g.fillStyle(0x7a4b2a).fillRect(412, 144, 112, 10);
        const fire = this.add.sprite(468, 240, 'flame', 0).setOrigin(0.5, 1).setDepth(-39).play('flame');
        fire.setScale(1.2);
        this.add.image(620, 50, 'moon').setDepth(-60).setAlpha(0.8);
        this.addPortrait(200, 80);
        this.addPortrait(330, 80);
        for (const b of markersOf(this.world.data, 'X')) {
            const p = WorldMap.feet(b);
            this.add.rectangle(p.x, p.y - 20, 30, 40, 0x4e2f1a).setDepth(-10);
        }
    }
}
