import Phaser from 'phaser';
import { COLORS, GAME_H, GAME_W, LEVELS, LevelKey } from '../config';
import { Controls } from '../input/Controls';
import { Player } from '../game/Player';
import { Theme, WorldMap } from '../game/WorldMap';
import { markerOf, markersOf, parseLevel } from '../levels/LevelMap';
import { Sound } from '../audio/Sound';
import { unlockLevel } from '../game/progress';
import { button, iconButton, popWord, text, useView } from '../ui/ui';

export type DeathKind = 'cat' | 'caught' | 'goo' | 'blown' | 'squish' | 'fall' | 'bonk' | 'splash' | 'boo' | 'hot' | 'swipe' | 'eek' | 'shh';

const DEATH_LINES: Record<DeathKind, { word: string; color: string }> = {
    cat: { word: 'MEOW!', color: COLORS.danger },
    caught: { word: 'GOTCHA!', color: COLORS.danger },
    goo: { word: 'EWW, GOO!', color: '#b49be0' },
    blown: { word: 'WHOOSH!', color: '#8fe3ff' },
    squish: { word: 'SQUISH!', color: COLORS.danger },
    fall: { word: 'OOPS!', color: COLORS.accent },
    bonk: { word: 'BONK!', color: COLORS.accent },
    splash: { word: 'SPLASH!', color: '#8fe3ff' },
    boo: { word: 'BOO!', color: '#ffffff' },
    hot: { word: 'HOT HOT HOT!', color: '#ff8a1f' },
    swipe: { word: 'SWIPE!', color: COLORS.danger },
    eek: { word: 'EEK! A SPIDER!', color: '#b49be0' },
    shh: { word: 'SHHH! FOUND YOU!', color: '#cfe8e0' },
};

/**
 * Everything the three levels share: map + player setup, camera, HUD,
 * intro card, pause menu, cartoon death reactions and instant restarts.
 */
export abstract class BaseLevelScene extends Phaser.Scene {
    protected controls!: Controls;
    protected player!: Player;
    protected world!: WorldMap;
    protected levelIndex: number;
    /** True until the intro card is dismissed; the level holds still. */
    protected waiting = true;
    protected dead = false;
    protected finished = false;
    protected paused = false;
    protected retry = false;
    protected hudRight = GAME_W - 14;
    private pauseLayer?: Phaser.GameObjects.Container;

    constructor(key: LevelKey) {
        super(key);
        this.levelIndex = LEVELS.findIndex((l) => l.key === key);
    }

    init(data: { retry?: boolean }) {
        this.retry = !!data?.retry;
        this.waiting = true;
        this.dead = false;
        this.finished = false;
        this.paused = false;
    }

    /** Subclasses call this first in create(). */
    protected setupLevel(rows: string[], theme: Theme, opts: { action?: boolean } = {}) {
        const data = parseLevel(rows);
        this.world = new WorldMap(this, data, theme);
        useView(this);
        this.physics.world.setBounds(0, 0, this.world.widthPx, this.world.heightPx + 64);
        this.physics.world.setBoundsCollision(true, true, true, false);
        this.cameras.main.setBounds(0, 0, this.world.widthPx, this.world.heightPx);
        this.cameras.main.setBackgroundColor(COLORS.night);

        const start = WorldMap.feet(markerOf(data, 'P'));
        this.player = new Player(this, start.x, start.y - 8, this.world);
        this.world.addCollider(this.player, () => this.player.climbing);
        this.controls = new Controls(this, opts);
        this.buildHud();

        this.input.keyboard!.on('keydown-R', () => !this.finished && this.restartLevel());
        this.input.keyboard!.on('keydown-ESC', () => this.togglePause());
        this.input.keyboard!.on('keydown-P', () => this.togglePause());
        this.events.once('shutdown', () => this.tweens.killAll());
        this.cameras.main.fadeIn(250, 0, 0, 0);
    }

    /** Subclasses call this at the end of create(). */
    protected begin() {
        if (this.retry) {
            popWord(this, 'TRY AGAIN!', COLORS.accent, 16, 500);
            this.startPlay();
            return;
        }
        this.showIntro();
    }

    /** Called when play actually starts (after the intro card). */
    protected onStart() { /* optional */ }

    /** Per-frame level logic, only while playing. */
    protected abstract tick(time: number, delta: number): void;

    private startPlay() {
        this.waiting = false;
        this.onStart();
    }

    update(time: number, delta: number) {
        this.controls.update();
        if (this.paused) return;
        if (this.waiting || this.dead || this.finished) {
            this.player.body.setVelocityX(0);
            return;
        }
        this.player.update(this.controls, time);
        this.tick(time, delta);
    }

    // ─────────────────────────────────────── HUD

    private buildHud() {
        const info = LEVELS[this.levelIndex];
        text(this, 8, 12, `${this.levelIndex + 1}. ${info.title}`, 8, COLORS.text, 'left')
            .setScrollFactor(0).setDepth(950);

        let x = GAME_W - 14;
        iconButton(this, x, 14, Sound.isMuted ? 5 : 4, (img) => img.setFrame(Sound.toggleMute() ? 5 : 4));
        x -= 26;
        const pause = iconButton(this, x, 14, 0, () => this.togglePause());
        // draw a pause symbol over the button
        pause.img.setVisible(false);
        this.add.rectangle(x - 3, 14, 3, 10, 0xffffff).setScrollFactor(0).setDepth(952);
        this.add.rectangle(x + 3, 14, 3, 10, 0xffffff).setScrollFactor(0).setDepth(952);
        if (this.sys.game.device.fullscreen.available) {
            x -= 26;
            iconButton(this, x, 14, 6, () => {
                if (this.scale.isFullscreen) this.scale.stopFullscreen();
                else this.scale.startFullscreen();
            });
        }
        this.hudRight = x - 18;
    }

    private showIntro() {
        const info = LEVELS[this.levelIndex];
        const layer = this.add.container(0, 0).setScrollFactor(0).setDepth(1100);
        const bg = this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x0b0614, 0.82);
        const lvl = text(this, GAME_W / 2, 70, `LEVEL ${this.levelIndex + 1}`, 16, COLORS.accent);
        const title = text(this, GAME_W / 2, 100, info.title.toUpperCase(), 16, COLORS.text);
        const goal = text(this, GAME_W / 2, 148, info.goal, 8, '#c9c7da');
        const go = text(this, GAME_W / 2, 210, this.controls.pad.isVisible ? 'TAP TO START' : 'PRESS SPACE', 8, COLORS.good).setAlpha(0);
        layer.add([bg, lvl, title, goal, go]);
        this.tweens.add({ targets: go, alpha: 1, delay: 600, duration: 200 });
        this.tweens.add({ targets: go, scale: 1.1, yoyo: true, repeat: -1, duration: 400, delay: 800 });

        let closed = false;
        const close = () => {
            if (closed) return;
            closed = true;
            Sound.unlock();
            this.tweens.add({
                targets: layer, alpha: 0, duration: 200,
                onComplete: () => { layer.destroy(); this.startPlay(); },
            });
        };
        this.time.delayedCall(500, () => {
            this.input.once('pointerup', close);
            this.input.keyboard!.once('keydown', close);
        });
        this.time.delayedCall(6000, close);
    }

    // ─────────────────────────────────────── pause

    protected togglePause() {
        if (this.dead || this.finished) return;
        this.paused = !this.paused;
        if (this.paused) {
            this.physics.pause();
            this.tweens.pauseAll();
            this.time.paused = true;
            this.anims.pauseAll();
            const c = this.add.container(0, 0).setScrollFactor(0).setDepth(1200);
            c.add(this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x0b0614, 0.92).setInteractive());
            c.add(text(this, GAME_W / 2, 60, 'PAUSED', 16, COLORS.accent));
            c.add(button(this, GAME_W / 2, 110, 'KEEP PLAYING', () => this.togglePause()));
            c.add(button(this, GAME_W / 2, 150, 'RESTART LEVEL', () => this.restartLevel()));
            c.add(button(this, GAME_W / 2, 190, 'TITLE SCREEN', () => { this.resumeGlobals(); this.scene.start('TitleScene'); }));
            this.pauseLayer = c;
        } else {
            this.physics.resume();
            this.tweens.resumeAll();
            this.time.paused = false;
            this.anims.resumeAll();
            this.pauseLayer?.destroy();
        }
    }

    protected restartLevel() {
        this.resumeGlobals();
        this.scene.restart({ retry: true });
    }

    /** Animations are paused game-wide while paused; undo that before leaving. */
    private resumeGlobals() {
        if (!this.paused) return;
        this.anims.resumeAll();
        this.time.paused = false;
        this.paused = false;
    }

    // ─────────────────────────────────────── losing & winning

    die(kind: DeathKind) {
        if (this.dead || this.finished) return;
        this.dead = true;
        this.player.frozen = true;
        // counted for the automated smoke test
        const w = window as unknown as { __deaths?: number };
        w.__deaths = (w.__deaths ?? 0) + 1;
        this.physics.pause();
        const line = DEATH_LINES[kind];
        let delay = 850;

        switch (kind) {
            case 'cat':
                delay = this.catScare();
                break;
            case 'caught':
                Sound.oops();
                this.cameras.main.shake(200, 0.01);
                break;
            case 'goo':
                Sound.bloop();
                this.player.setTint(0x2a2440);
                break;
            case 'blown':
                Sound.whoosh();
                this.tweens.add({ targets: this.player, angle: -720, x: this.player.x - 120, y: this.player.y - 80, scale: 0.4, duration: 700 });
                break;
            case 'squish':
                Sound.oops();
                this.player.anims.stop();
                this.player.setFrame(6);
                this.cameras.main.shake(150, 0.012);
                this.dizzyStars(this.player.x, this.player.y);
                delay = 1000;
                break;
            case 'fall':
                Sound.oops();
                delay = 650;
                break;
            case 'bonk':
            case 'swipe':
            case 'eek':
                Sound.oops();
                this.player.setFrame(6);
                this.player.anims.stop();
                this.dizzyStars(this.player.x, this.player.y);
                break;
            case 'splash':
                Sound.splash();
                this.tweens.add({ targets: this.player, y: this.player.y + 30, alpha: 0, duration: 600 });
                break;
            case 'boo':
                Sound.boo();
                this.tweens.add({ targets: this.player, scaleX: 1.3, scaleY: 0.7, yoyo: true, repeat: 2, duration: 90 });
                break;
            case 'hot':
                Sound.sizzle();
                this.player.setTint(0x3a2a2a);
                this.tweens.add({ targets: this.player, y: this.player.y - 40, duration: 300, yoyo: true, ease: 'Quad.Out' });
                break;
            case 'shh':
                Sound.shh();
                this.cameras.main.flash(250, 255, 246, 168);
                delay = 1000;
                break;
        }
        if (kind !== 'cat') popWord(this, line.word, line.color, 16, delay - 150);
        this.time.delayedCall(delay, () => this.scene.restart({ retry: true }));
    }

    /** Giant cat face jumps up from the bottom of the screen. Returns its duration. */
    private catScare(): number {
        Sound.scare();
        const dark = this.add.rectangle(GAME_W / 2, GAME_H / 2, GAME_W, GAME_H, 0x000000, 0)
            .setScrollFactor(0).setDepth(1040);
        this.tweens.add({ targets: dark, fillAlpha: 0.6, duration: 120 });
        const cat = this.add.image(GAME_W / 2, GAME_H + 140, 'cat_scare', 0)
            .setScrollFactor(0).setDepth(1045).setScale(3.6);
        this.tweens.add({ targets: cat, y: GAME_H / 2 + 20, duration: 220, ease: 'Back.Out' });
        this.time.delayedCall(240, () => {
            cat.setFrame(1);
            this.cameras.main.shake(250, 0.015);
            popWord(this, 'MEOW!', COLORS.danger, 24, 500);
        });
        return 1150;
    }

    protected dizzyStars(x: number, y: number) {
        for (let i = 0; i < 3; i++) {
            const s = this.add.sprite(x, y - 10, 'star').play('star_spin').setDepth(60);
            const phase = (i / 3) * Math.PI * 2;
            this.tweens.addCounter({
                from: 0, to: Math.PI * 4, duration: 1200,
                onUpdate: (tw) => {
                    const a = (tw.getValue() ?? 0) + phase;
                    s.setPosition(x + Math.cos(a) * 10, y - 12 + Math.sin(a) * 3);
                },
            });
        }
    }

    /** Level complete: celebrate, save progress, go to the next level. */
    protected complete() {
        if (this.finished || this.dead) return;
        this.finished = true;
        this.player.frozen = true;
        this.player.body.setVelocity(0, 0);
        this.player.body.setAllowGravity(false);
        Sound.win();
        const next = this.levelIndex + 1;
        unlockLevel(next + 1);
        if (next >= LEVELS.length) {
            this.time.delayedCall(400, () => this.scene.start('WinScene'));
            return;
        }
        popWord(this, 'GREAT JOB!', COLORS.good, 16, 1100);
        this.time.delayedCall(1300, () => {
            this.cameras.main.fadeOut(300, 0, 0, 0);
            this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(LEVELS[next].key));
        });
    }

    // ─────────────────────────────────────── shared level pieces

    /**
     * The level exit (glowing mouse hole at marker X). While `isOpen()` is
     * false it is dark and touching it shows `lockedMsg`.
     */
    protected addExit(isOpen: () => boolean = () => true, lockedMsg = '', label = 'EXIT') {
        const ex = WorldMap.feet(markerOf(this.world.data, 'X'));
        const exit = this.physics.add.staticSprite(ex.x, ex.y - 13, 'exit').play('exit_glow').setDepth(20);
        exit.body.setSize(12, 18);
        const tag = text(this, ex.x, ex.y - 36, label, 8, COLORS.good).setDepth(21);
        let wasOpen = isOpen();
        const show = (open: boolean) => {
            exit.setTint(open ? 0xffffff : 0x3a3550);
            tag.setText(open ? label : 'LOCKED').setColor(open ? COLORS.good : '#9a98ad');
        };
        show(wasOpen);
        let nagAt = 0;
        this.physics.add.overlap(this.player, exit, () => {
            if (isOpen()) this.complete();
            else if (this.time.now > nagAt) {
                nagAt = this.time.now + 1600;
                popWord(this, lockedMsg, COLORS.accent, 8, 900);
            }
        });
        this.onUpdate(() => {
            const open = isOpen();
            if (open !== wasOpen) {
                wasOpen = open;
                show(open);
                if (open) {
                    Sound.keyGet();
                    this.tweens.add({ targets: exit, scale: { from: 1.6, to: 1 }, duration: 400, ease: 'Back.Out' });
                }
            }
        });
        return exit;
    }

    /** A HUD counter like "🔋 2/4". Returns a function to update it. */
    protected addCounter(texture: string, frame: number, total: number) {
        const x = this.hudRight;
        this.add.image(x - 30, 14, texture, frame).setScrollFactor(0).setDepth(950).setScale(0.8);
        const t = text(this, x - 20, 14, `0/${total}`, 8, COLORS.accent, 'left').setScrollFactor(0).setDepth(950);
        this.hudRight -= 60;
        return (n: number) => {
            t.setText(`${n}/${total}`);
            this.tweens.add({ targets: t, scale: { from: 1.6, to: 1 }, duration: 250 });
        };
    }

    /**
     * Springs (jack-in-the-boxes, mattress springs) at every `ch` marker.
     * Landing on one launches the mouse high into the air.
     */
    protected addSprings(ch: string, kind: 'jack' | 'spring', power = 560) {
        for (const m of markersOf(this.world.data, ch)) {
            const p = WorldMap.feet(m);
            const spr = this.physics.add.staticSprite(p.x, p.y, kind, 0).setOrigin(0.5, 1).setDepth(25);
            spr.refreshBody();
            const top = kind === 'jack' ? 16 : 10;
            spr.body.setSize(18, top).setOffset((spr.width - 18) / 2, spr.height - top);
            this.physics.add.overlap(this.player, spr, () => {
                const b = this.player.body;
                if (b.velocity.y < 0 || b.bottom > spr.body.top + 8) return;
                this.player.launch(power);
                if (kind === 'jack') Sound.surprise();
                else Sound.boing();
                spr.setFrame(1);
                this.tweens.add({ targets: spr, scaleY: { from: 0.7, to: 1 }, duration: 250, ease: 'Back.Out' });
                this.time.delayedCall(kind === 'jack' ? 900 : 200, () => spr.setFrame(0));
            });
        }
    }

    /** Run `fn` every frame until the scene shuts down (scene events outlive restarts). */
    protected onUpdate(fn: () => void) {
        this.events.on('update', fn);
        this.events.once('shutdown', () => this.events.off('update', fn));
    }

    /** Fell off the bottom of the level? */
    protected fellOut() {
        return this.player.y > this.world.heightPx + 8;
    }

    // ─────────────────────────────────────── decoration helpers

    protected addHint(x: number, y: number, keyboard: string, touch: string) {
        const str = this.controls.pad.isVisible ? touch : keyboard;
        const t = text(this, x, y, str, 8, COLORS.accent).setDepth(30);
        this.tweens.add({ targets: t, y: y - 3, yoyo: true, repeat: -1, duration: 600, ease: 'Sine.InOut' });
        return t;
    }

    protected addBats(count: number, area: { x: number; y: number; w: number; h: number }) {
        for (let i = 0; i < count; i++) {
            const bx = area.x + Math.random() * area.w;
            const by = area.y + Math.random() * area.h;
            const bat = this.add.sprite(bx, by, 'bat').play({ key: 'bat_flap', startFrame: i % 2 }).setDepth(-40).setAlpha(0.85);
            this.tweens.add({
                targets: bat, x: bx + 40 + Math.random() * 60, y: by + (Math.random() * 30 - 15),
                yoyo: true, repeat: -1, duration: 2500 + Math.random() * 2000, ease: 'Sine.InOut',
                onYoyo: () => bat.toggleFlipX(), onRepeat: () => bat.toggleFlipX(),
            });
        }
    }

    /** Portrait whose eyes follow the mouse around. */
    protected addPortrait(x: number, y: number) {
        const img = this.add.image(x, y, 'portrait').setDepth(-50);
        const left = img.x - img.width / 2, top = img.y - img.height / 2;
        // eye whites are at sprite columns 9-11 and 14-16, rows 11-12
        const pupils = [9, 14].map((col) => this.add.rectangle(left + col, top + 11, 1, 1, 0x000000).setOrigin(0).setDepth(-49));
        const follow = () => {
            if (!this.player?.active) return;
            const look = this.player.x < x - 12 ? 0 : this.player.x > x + 12 ? 2 : 1;
            const down = this.player.y > y + 12 ? 1 : 0;
            pupils[0].setPosition(left + 9 + look, top + 11 + down);
            pupils[1].setPosition(left + 14 + look, top + 11 + down);
        };
        this.onUpdate(follow);
    }
}
