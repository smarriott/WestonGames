import Phaser from 'phaser';
import { COLORS, GAME_W } from '../config';
import { BaseLevelScene } from './BaseLevelScene';
import { LEVEL3_MAP } from '../levels/level3';
import { markerOf, markersOf } from '../levels/LevelMap';
import { WorldMap } from '../game/WorldMap';
import { Sound } from '../audio/Sound';
import { popWord, text } from '../ui/ui';

const GIANT = {
    hp: 3,
    patrolSpeed: 50,
    chaseSpeed: 80,
    hearRange: 130,     // hears a mouse on the floor this close
    loseRange: 210,
    footOffset: 26,     // feet are this far either side of the giant's centre
    footHalf: 17,
    raiseMs: 550,       // warning time before a stomp lands (shadow grows)
    raiseHeight: 52,
};

type GiantState = 'patrol' | 'alert' | 'chase' | 'raise' | 'recover' | 'confused' | 'hurt' | 'flee' | 'down';

interface HideSpot {
    name: string;
    x: number;
    half: number;
    peekY: number;
}

interface Trap {
    sprite: Phaser.GameObjects.Sprite;
    snapped: boolean;
    /** The giant has noticed this trap's cheese and is heading for it. */
    sniffed: boolean;
}

/**
 * Level 3 — Hide and Outsmart.
 * A giant patrols the floor; only its legs and slippers are visible. It can't
 * see the mouse, but it hears it running on the floor. Fetch traps from the
 * trap box, put them in the giant's path, and hide when it comes stomping.
 * Three snapped traps knock the giant out and it drops the key.
 */
export default class Level3Scene extends BaseLevelScene {
    private floorY = 0;
    // giant
    private gx = 0;
    private gdir = -1;
    private ghp = GIANT.hp;
    private gstate: GiantState = 'patrol';
    private gstateAt = 0;
    private gphase = 0;
    private stompFoot = 0;
    private stompX = 0;
    private nextTurnAt = 0;
    private lifts = [0, 0];
    private legs: Phaser.GameObjects.TileSprite[] = [];
    private feet: Phaser.GameObjects.Sprite[] = [];
    private shadows: Phaser.GameObjects.Ellipse[] = [];
    private bubble!: Phaser.GameObjects.Text;
    private hearts: Phaser.GameObjects.Image[] = [];
    // mouse
    private carrying = false;
    private carried!: Phaser.GameObjects.Image;
    private traps: Trap[] = [];
    private spots: HideSpot[] = [];
    private peek!: Phaser.GameObjects.Sprite;
    private prompt!: Phaser.GameObjects.Text;
    private trapIcon!: Phaser.GameObjects.Image;
    private key?: Phaser.GameObjects.Image;
    private keyReady = false;
    /** Level clock (ms) that only advances while actually playing. */
    private t = 0;

    constructor() {
        super('Level3Scene');
    }

    create() {
        this.traps = [];
        this.spots = [];
        this.legs = [];
        this.feet = [];
        this.shadows = [];
        this.hearts = [];
        this.carrying = false;
        this.key = undefined;
        this.keyReady = false;
        this.ghp = GIANT.hp;
        this.gstate = 'patrol';
        this.lifts = [0, 0];
        this.t = 0;
        this.nextTurnAt = 0;

        this.setupLevel(LEVEL3_MAP, 'house', { action: true });
        const data = this.world.data;
        this.floorY = WorldMap.feet(markerOf(data, 'P')).y;
        this.cameras.main.startFollow(this.player, true, 0.12, 0.12);

        this.addDecor();
        this.addHidingSpots();

        // trap box
        const tb = WorldMap.feet(markerOf(data, 'T'));
        const box = this.physics.add.staticSprite(tb.x, tb.y - 9, 'trap_box').setDepth(20);
        const boxTrap = this.add.image(tb.x, tb.y - 22, 'trap', 0).setDepth(21);
        this.tweens.add({ targets: boxTrap, y: boxTrap.y - 4, yoyo: true, repeat: -1, duration: 500, ease: 'Sine.InOut' });
        text(this, tb.x, tb.y - 40, 'TRAPS', 8, COLORS.accent).setDepth(21);
        this.physics.add.overlap(this.player, box, () => {
            if (this.carrying || this.keyReady) return;
            this.carrying = true;
            Sound.pop();
            popWord(this, 'GOT A TRAP!', COLORS.accent, 8, 500);
        });

        this.carried = this.add.image(0, 0, 'trap', 0).setScale(0.75).setDepth(55).setVisible(false);
        this.peek = this.add.sprite(0, 0, 'peek', 0).setDepth(30).setVisible(false);
        this.time.addEvent({ delay: 1600, loop: true, callback: () => {
            this.peek.setFrame(1);
            this.time.delayedCall(140, () => this.peek.setFrame(0));
        } });
        this.prompt = text(this, 0, 0, '', 8, COLORS.text).setDepth(60).setVisible(false);

        this.buildGiant();
        this.buildGiantHud();

        Sound.setMood('house');
        this.begin();
    }

    protected onStart() {
        if (this.retry) return;
        const tip = text(this, GAME_W / 2, 52, "THE GIANT CAN'T SEE YOU...\nBUT IT CAN HEAR YOU ON THE FLOOR!", 8, COLORS.accent)
            .setScrollFactor(0).setDepth(940);
        this.tweens.add({ targets: tip, alpha: 0, delay: 4500, duration: 600, onComplete: () => tip.destroy() });
    }

    // ───────────────────────────────────────────── setup

    private addDecor() {
        this.addPortrait(130, 90);
        this.addPortrait(610, 80);
        this.add.image(260, 40, 'moon').setDepth(-60);
        const win = this.add.graphics().setDepth(-55);
        win.lineStyle(4, 0x4e2f1a).strokeRect(236, 18, 48, 48);
        win.fillStyle(0x4e2f1a).fillRect(258, 18, 4, 48).fillRect(236, 40, 48, 4);
        this.add.image(18, 0, 'cobweb').setOrigin(0).setDepth(-45);
        this.add.image(this.world.widthPx - 18, 0, 'cobweb').setOrigin(1, 0).setFlipX(true).setDepth(-45);
        for (const x of [380, 470]) this.add.sprite(x, 120, 'candle').play('candle').setDepth(-30);
        this.add.sprite(700, 136, 'candle').play('candle').setDepth(-30);
    }

    private addHidingSpots() {
        const data = this.world.data;
        const fy = this.floorY;
        const spot = (ch: string, tex: string, name: string, dx: number, half: number, peekDy: number) => {
            for (const m of markersOf(data, ch)) {
                const p = WorldMap.feet(m);
                const img = this.add.image(p.x, fy, tex).setOrigin(0.5, 1).setDepth(20);
                this.spots.push({ name, x: img.x + dx, half, peekY: fy - peekDy });
            }
        };
        spot('h', 'hide_house', 'house', 0, 9, 8);
        spot('b', 'hide_bed', 'bed', 0, 28, 7);
        spot('d', 'hide_dresser', 'drawer', 0, 16, 15);
        spot('k', 'hide_locker', 'locker', 0, 10, 9);
    }

    private buildGiant() {
        this.gx = this.world.widthPx - 220;
        this.gdir = -1;
        for (let i = 0; i < 2; i++) {
            this.shadows.push(this.add.ellipse(0, this.floorY, 40, 6, 0x000000, 0.35).setDepth(34));
            this.legs.push(this.add.tileSprite(0, -8, 22, 10, 'leg').setOrigin(0.5, 0).setDepth(35));
            this.feet.push(this.add.sprite(0, 0, 'slipper', 0).setOrigin(0.5, 1).setDepth(36));
        }
        this.bubble = text(this, 0, 0, '', 16, COLORS.danger).setDepth(60).setVisible(false);
        this.layoutGiant();
    }

    private buildGiantHud() {
        const cx = GAME_W / 2;
        text(this, cx - 38, 14, 'GIANT', 8, COLORS.danger).setScrollFactor(0).setDepth(950);
        for (let i = 0; i < GIANT.hp; i++) {
            this.hearts.push(this.add.image(cx + 4 + i * 11, 14, 'heart', 0).setScrollFactor(0).setDepth(950).setScale(1.2));
        }
        this.trapIcon = this.add.image(this.hudRight - 6, 14, 'trap', 0).setScrollFactor(0).setDepth(950).setAlpha(0.25);
    }

    // ───────────────────────────────────────────── per frame

    protected tick(_time: number, delta: number) {
        const dt = Math.min(delta, 50) / 1000;
        this.t += delta;
        this.updateMouseActions();
        this.updateGiant(this.t, dt);
        this.layoutGiant();
        this.checkTraps();

        if (this.carrying) {
            this.carried.setVisible(!this.player.hidden).setPosition(this.player.x, this.player.y - 14);
        } else {
            this.carried.setVisible(false);
        }
        this.trapIcon.setAlpha(this.carrying ? 1 : 0.25);

        if (this.keyReady && this.key && !this.player.hidden) {
            if (Phaser.Math.Distance.Between(this.player.x, this.player.y, this.key.x, this.key.y) < 14) this.takeKey();
        }
    }

    private spotHere(): HideSpot | undefined {
        if (!this.player.isOnFloorAt(this.floorY)) return undefined;
        return this.spots.find((s) => Math.abs(this.player.x - s.x) <= s.half);
    }

    private updateMouseActions() {
        const c = this.controls;
        const p = this.player;

        if (p.hidden) {
            this.prompt.setVisible(false);
            this.controls.pad.setActionIcon('peek', 0, true);
            if (c.justDown('action') || c.justDown('jump') || c.justDown('left') || c.justDown('right') || c.justDown('up')) {
                this.unhide();
            }
            return;
        }

        const spot = this.spotHere();
        const onFloor = p.isOnFloorAt(this.floorY);
        const kb = !this.controls.pad.isVisible;
        if (spot) {
            this.prompt.setText(kb ? 'E: HIDE' : 'HIDE').setPosition(spot.x, spot.peekY - 26).setVisible(true);
            c.pad.setActionIcon('peek', 0, true);
            if (c.justDown('action')) this.hide(spot);
            return;
        }
        if (this.carrying && onFloor) {
            this.prompt.setText(kb ? 'E: SET TRAP' : 'SET TRAP').setPosition(p.x, p.y - 30).setVisible(true);
            c.pad.setActionIcon('trap', 0, true);
            if (c.justDown('action')) this.placeTrap();
            return;
        }
        this.prompt.setVisible(false);
        c.pad.setActionIcon('icons', 7, false);
        if (c.justDown('action') && this.carrying) popWord(this, 'TRAPS GO ON THE FLOOR', COLORS.accent, 8, 700);
    }

    private hide(spot: HideSpot) {
        const p = this.player;
        p.hidden = true;
        p.setVisible(false);
        p.body.setVelocity(0, 0);
        p.x = spot.x;
        this.peek.setPosition(spot.x, spot.peekY).setVisible(true);
        Sound.pop();
    }

    private unhide() {
        this.player.hidden = false;
        this.player.setVisible(true);
        this.peek.setVisible(false);
        Sound.unpop();
    }

    private placeTrap() {
        const x = Phaser.Math.Clamp(this.player.x, 40, this.world.widthPx - 40);
        if (this.traps.some((t) => !t.snapped && Math.abs(t.sprite.x - x) < 22)) {
            popWord(this, 'ALREADY A TRAP HERE', COLORS.accent, 8, 600);
            return;
        }
        const s = this.add.sprite(x, this.floorY, 'trap', 0).setOrigin(0.5, 1).setDepth(33);
        this.tweens.add({ targets: s, scaleY: { from: 0.4, to: 1 }, duration: 150, ease: 'Back.Out' });
        this.traps.push({ sprite: s, snapped: false, sniffed: false });
        this.carrying = false;
        Sound.click();
    }

    // ───────────────────────────────────────────── the giant

    private footX(i: number, gx = this.gx) {
        return gx + (i === 0 ? -GIANT.footOffset : GIANT.footOffset);
    }

    private setState(s: GiantState, time: number) {
        this.gstate = s;
        this.gstateAt = time;
    }

    private say(str: string, color: string, size = 16) {
        this.bubble.setText(str).setColor(color).setFontSize(size).setVisible(true).setScale(0.3);
        this.tweens.add({ targets: this.bubble, scale: 1, duration: 200, ease: 'Back.Out' });
    }

    /** Can the giant hear the mouse right now? */
    private hearsMouse(range: number) {
        const p = this.player;
        return !p.hidden && p.isOnFloorAt(this.floorY) && Math.abs(p.x - this.gx) < range;
    }

    private walk(dir: number, speed: number, dt: number) {
        const min = 60, max = this.world.widthPx - 60;
        this.gx = Phaser.Math.Clamp(this.gx + dir * speed * dt, min, max);
        if (dir !== 0) this.gdir = dir;
        // stepping animation: feet take turns lifting a little
        const before = Math.sin(this.gphase);
        this.gphase += dt * speed * 0.11;
        const after = Math.sin(this.gphase);
        this.lifts[0] = Math.max(0, after) * 0.22;
        this.lifts[1] = Math.max(0, -after) * 0.22;
        if (Math.sign(before) !== Math.sign(after)) this.footstep(0.5);
    }

    private footstep(vol: number) {
        const d = Math.abs(this.player.x - this.gx);
        const v = vol * Phaser.Math.Clamp(1 - d / 500, 0.15, 1);
        Sound.step(v);
    }

    private settleFeet(dt: number) {
        this.lifts = this.lifts.map((l) => Math.max(0, l - dt * 2));
    }

    private updateGiant(time: number, dt: number) {
        const since = time - this.gstateAt;
        const p = this.player;
        const min = 60, max = this.world.widthPx - 60;

        switch (this.gstate) {
            case 'patrol': {
                // the giant smells the cheese on a trap and goes for it
                const bait = this.traps
                    .filter((t) => !t.snapped)
                    .sort((a, b) => Math.abs(a.sprite.x - this.gx) - Math.abs(b.sprite.x - this.gx))[0];
                if (bait) {
                    this.gdir = bait.sprite.x < this.gx ? -1 : 1;
                    if (!bait.sniffed) {
                        bait.sniffed = true;
                        this.say('SNIFF?', COLORS.accent, 8);
                        this.time.delayedCall(1200, () => {
                            if (this.gstate === 'patrol') this.bubble.setVisible(false);
                        });
                    }
                } else if (this.gx <= min + 1) this.gdir = 1;
                else if (this.gx >= max - 1) this.gdir = -1;
                else if (time > this.nextTurnAt) {
                    this.nextTurnAt = time + 3500 + Math.random() * 3500;
                    if (Math.random() < 0.3) this.gdir *= -1;
                }
                this.walk(this.gdir, GIANT.patrolSpeed, dt);
                if (this.bubble.visible) this.bubble.setPosition(this.gx, this.floorY - 120);
                if (this.hearsMouse(GIANT.hearRange)) {
                    this.setState('alert', time);
                    this.say('!', COLORS.danger);
                    Sound.alert();
                }
                break;
            }
            case 'alert':
                this.settleFeet(dt);
                if (since > 450) this.setState('chase', time);
                break;
            case 'chase': {
                if (p.hidden || !this.hearsMouse(GIANT.loseRange)) {
                    this.setState('confused', time);
                    this.say('?', COLORS.accent);
                    break;
                }
                // line up whichever foot is closer
                const foot = Math.abs(this.footX(0) - p.x) < Math.abs(this.footX(1) - p.x) ? 0 : 1;
                const wantGx = Phaser.Math.Clamp(p.x - (this.footX(foot, 0)), min, max);
                const diff = wantGx - this.gx;
                if (Math.abs(diff) < 6 || (Math.abs(this.footX(foot) - p.x) < 8)) {
                    this.stompFoot = foot;
                    this.stompX = this.footX(foot);
                    this.setState('raise', time);
                } else {
                    this.walk(Math.sign(diff), GIANT.chaseSpeed, dt);
                }
                break;
            }
            case 'raise': {
                const k = Math.min(1, since / GIANT.raiseMs);
                this.lifts[this.stompFoot] = k;
                this.lifts[1 - this.stompFoot] = Math.max(0, this.lifts[1 - this.stompFoot] - dt * 2);
                if (k >= 1 && since > GIANT.raiseMs + 120) {
                    this.lifts[this.stompFoot] = 0;
                    this.stompLanded();
                    if (this.dead) return;
                    this.setState('recover', time);
                }
                break;
            }
            case 'recover':
                this.settleFeet(dt);
                if (since > 650) this.setState(this.hearsMouse(GIANT.loseRange) ? 'chase' : 'patrol', time);
                break;
            case 'confused':
                this.settleFeet(dt);
                if (since > 1300) {
                    this.bubble.setVisible(false);
                    this.setState('patrol', time);
                }
                break;
            case 'hurt': {
                // hop on one foot
                const hop = Math.abs(Math.sin(since / 110));
                this.lifts[this.stompFoot] = 0.5 + hop * 0.3;
                this.lifts[1 - this.stompFoot] = hop * 0.25;
                if (since > 1400) {
                    this.feet.forEach((f) => f.setFrame(0));
                    this.bubble.setVisible(false);
                    if (this.ghp <= 0) this.knockOut(time);
                    else this.setState('flee', time);
                }
                break;
            }
            case 'flee':
                this.walk(this.gdir, 70, dt);
                if (since > 1600 || this.gx <= min + 1 || this.gx >= max - 1) this.setState('patrol', time);
                break;
            case 'down':
                break;
        }
        if (this.gstate === 'alert' || this.gstate === 'chase' || this.gstate === 'raise') {
            if (this.gstate !== 'chase' || since < 600) this.bubble.setPosition(this.gx, this.floorY - 120);
        }
        if (this.gstate === 'chase' && since > 600) this.bubble.setVisible(false);
    }

    private stompLanded() {
        Sound.step(1);
        this.cameras.main.shake(120, 0.008);
        const x = this.stompX;
        const p = this.player;
        for (const dir of [-1, 1]) {
            const dust = this.add.circle(x + dir * 14, this.floorY - 3, 3, 0xc9c7da, 0.8).setDepth(37);
            this.tweens.add({ targets: dust, x: x + dir * 30, alpha: 0, scale: 2, duration: 350, onComplete: () => dust.destroy() });
        }
        if (!p.hidden && p.isOnFloorAt(this.floorY) && Math.abs(p.x - x) < GIANT.footHalf) {
            this.die('squish');
        }
    }

    private checkTraps() {
        if (this.gstate === 'down' || this.gstate === 'hurt') return;
        for (const t of this.traps) {
            if (t.snapped) continue;
            for (let i = 0; i < 2; i++) {
                if (this.lifts[i] < 0.3 && Math.abs(this.footX(i) - t.sprite.x) < GIANT.footHalf) {
                    this.snapTrap(t, i);
                    return;
                }
            }
        }
    }

    private snapTrap(t: Trap, foot: number) {
        t.snapped = true;
        t.sprite.setFrame(1);
        this.tweens.add({ targets: t.sprite, alpha: 0, delay: 900, duration: 300, onComplete: () => t.sprite.destroy() });
        Sound.snap();
        this.time.delayedCall(80, () => Sound.ouch());
        this.cameras.main.shake(180, 0.01);
        this.ghp--;
        this.hearts[this.ghp]?.setFrame(1);
        this.tweens.add({ targets: this.hearts[this.ghp], scale: 2, yoyo: true, duration: 150 });
        this.stompFoot = foot;
        this.feet[foot].setFrame(1);
        this.say(this.ghp > 0 ? 'OUCH!' : 'OWWW!!', COLORS.danger);
        this.bubble.setPosition(this.gx, this.floorY - 120);
        // run away from the trap afterwards
        this.gdir = t.sprite.x < this.gx ? 1 : -1;
        this.setState('hurt', this.t);
        const left = GIANT.hp - this.ghp;
        if (this.ghp > 0) popWord(this, `${left} OF ${GIANT.hp}!`, COLORS.good, 16, 700);
    }

    private knockOut(time: number) {
        this.setState('down', time);
        Sound.thud();
        this.cameras.main.shake(400, 0.02);
        popWord(this, 'KNOCKED OUT!', COLORS.good, 16, 1400);
        const dir = this.gx > this.world.widthPx / 2 ? 1 : -1;
        // the giant topples over sideways and vanishes in a puff
        const parts = [...this.legs, ...this.feet, ...this.shadows];
        // legs pivot at the ankles and fall over sideways
        const ankles = this.legs.map((l) => ({ x: l.x, y: l.y + l.height }));
        this.legs.forEach((l, i) => l.setOrigin(0.5, 1).setPosition(ankles[i].x, ankles[i].y));
        this.tweens.add({ targets: this.legs, rotation: (Math.PI / 2) * dir * 0.92, duration: 900, ease: 'Bounce.Out' });
        this.tweens.add({ targets: this.feet, rotation: 0.35 * dir, duration: 400 });
        this.time.delayedCall(700, () => {
            this.dizzyStars(this.gx, this.floorY - 26);
            this.tweens.add({ targets: parts, alpha: 0, delay: 900, duration: 500 });
            this.time.delayedCall(1000, () => this.dropKey());
        });
    }

    private layoutGiant() {
        if (this.gstate === 'down') return;
        for (let i = 0; i < 2; i++) {
            const fx = this.gstate === 'raise' && i === this.stompFoot ? this.stompX : this.footX(i);
            const lift = this.lifts[i];
            const h = this.gstate === 'raise' && i === this.stompFoot ? GIANT.raiseHeight : 40;
            const footBottom = this.floorY - lift * h;
            const foot = this.feet[i];
            foot.setFlipX(this.gdir < 0).setPosition(fx, footBottom);
            const legX = fx - 8 * this.gdir;
            const legBottom = footBottom - 14;
            this.legs[i].setPosition(legX, -8);
            this.legs[i].height = Math.max(4, legBottom + 8);
            // shadow grows as a foot rises: the stomp warning
            const sh = this.shadows[i];
            sh.setPosition(fx, this.floorY);
            const raising = this.gstate === 'raise' && i === this.stompFoot;
            if (raising) {
                // big blinking red shadow = "get out of the way!"
                const blink = Math.floor(this.t / 90) % 2 === 0;
                sh.setSize(30 + lift * 26, 6 + lift * 6);
                sh.setFillStyle(blink ? 0xff3030 : 0x9c1f2e, 0.45 + lift * 0.4);
            } else {
                sh.setSize(38, 5);
                sh.setFillStyle(0x000000, 0.3);
            }
        }
    }

    // ───────────────────────────────────────────── winning

    private dropKey() {
        const x = Phaser.Math.Clamp(this.player.x + (this.player.x > this.world.widthPx / 2 ? -90 : 90), 60, this.world.widthPx - 60);
        const key = this.add.image(x, -20, 'key').setDepth(40).setScale(1.5);
        this.key = key;
        Sound.keyGet();
        this.tweens.add({
            targets: key, y: this.floorY - 8, duration: 900, ease: 'Bounce.Out',
            onComplete: () => {
                this.keyReady = true;
                this.tweens.add({ targets: key, y: key.y - 6, yoyo: true, repeat: -1, duration: 500, ease: 'Sine.InOut' });
                text(this, x, this.floorY - 34, 'GET THE KEY!', 8, COLORS.accent).setDepth(41);
                this.time.addEvent({ delay: 250, loop: true, callback: () => {
                    const s = this.add.image(x + Phaser.Math.Between(-10, 10), key.y + Phaser.Math.Between(-8, 8), 'star', 1).setDepth(42).setScale(0.6);
                    this.tweens.add({ targets: s, alpha: 0, y: s.y - 10, duration: 500, onComplete: () => s.destroy() });
                } });
            },
        });
    }

    private takeKey() {
        if (!this.key) return;
        this.keyReady = false;
        Sound.keyGet();
        this.tweens.add({ targets: this.key, y: this.key.y - 30, scale: 3, alpha: 0, duration: 500 });
        this.complete();
    }
}
