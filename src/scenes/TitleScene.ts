import Phaser from 'phaser';
import { COLORS, GAME_H, GAME_W, LEVELS } from '../config';
import { Sound } from '../audio/Sound';
import { unlockedLevels } from '../game/progress';
import { button, iconButton, text, useView } from '../ui/ui';
import { getLayout } from '../layout';

export default class TitleScene extends Phaser.Scene {
    constructor() {
        super('TitleScene');
    }

    create() {
        useView(this);
        this.cameras.main.setBackgroundColor(COLORS.night).fadeIn(300);

        // night sky
        for (let i = 0; i < 40; i++) {
            const s = this.add.rectangle(Math.random() * GAME_W, Math.random() * 150, 1, 1, 0xffffff, 0.3 + Math.random() * 0.6);
            this.tweens.add({ targets: s, alpha: 0.1, yoyo: true, repeat: -1, duration: 800 + Math.random() * 1500 });
        }
        this.add.image(400, 50, 'moon').setScale(2);
        this.add.image(375, GAME_H - 30, 'house').setOrigin(0.5, 1).setScale(1.4);
        this.add.rectangle(GAME_W / 2, GAME_H - 15, GAME_W, 30, 0x0b0614);
        for (let i = 0; i < 4; i++) {
            const bat = this.add.sprite(300 + i * 40, 40 + (i % 2) * 30, 'bat').play('bat_flap');
            this.tweens.add({ targets: bat, x: bat.x - 60, y: bat.y + 15, yoyo: true, repeat: -1, duration: 1800 + i * 300, ease: 'Sine.InOut' });
        }

        // title
        const t1 = text(this, 150, 50, 'MOUSE', 24, COLORS.accent);
        const t2 = text(this, 150, 80, 'ON THE RUN', 16, COLORS.text);
        this.tweens.add({ targets: t1, y: 46, yoyo: true, repeat: -1, duration: 700, ease: 'Sine.InOut' });
        this.tweens.add({ targets: t2, angle: { from: -2, to: 2 }, yoyo: true, repeat: -1, duration: 900, ease: 'Sine.InOut' });

        // the chase loop along the ground
        const mouse = this.add.sprite(-20, GAME_H - 32, 'mouse').play('mouse_run').setScale(2);
        const cat = this.add.sprite(-120, GAME_H - 44, 'cat_run').play('cat_run').setScale(2);
        this.tweens.add({ targets: mouse, x: GAME_W + 40, duration: 4200, repeat: -1, repeatDelay: 1500 });
        this.tweens.add({ targets: cat, x: GAME_W - 60, duration: 4200, repeat: -1, repeatDelay: 1500, delay: 250 });

        // play buttons
        const unlocked = unlockedLevels();
        const start = (i: number) => {
            Sound.unlock();
            this.cameras.main.fadeOut(250);
            this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(LEVELS[i].key));
        };
        const resume = unlocked - 1;
        button(this, 150, 120, unlocked > 1 ? `CONTINUE: ${unlocked}` : 'PLAY', () => start(resume),
            { w: unlocked > 1 ? 190 : 150, h: 30, size: 16, color: 0x2e8a3e });
        if (unlocked > 1) {
            text(this, 150, 148, 'OR PICK A LEVEL', 8, '#c9c7da');
            for (let i = 0; i < LEVELS.length; i++) {
                const open = i < unlocked;
                const b = button(this, 62 + (i % 5) * 44, 168 + Math.floor(i / 5) * 28, `${i + 1}`, () => open && start(i),
                    { w: 36, h: 22, size: 8, color: open ? 0x4b3478 : 0x2a2a35 });
                if (!open) b.setAlpha(0.35);
            }
        }

        const touch = getLayout().bands;
        const help = touch
            ? 'LEFT PAD: MOVE + CLIMB    RIGHT: JUMP'
            : 'ARROWS/WASD: MOVE   SPACE: JUMP   E: ACTION';
        text(this, GAME_W / 2, GAME_H - 10, help, 8, '#c9c7da');

        iconButton(this, GAME_W - 14, 14, Sound.isMuted ? 5 : 4, (img) => {
            Sound.unlock();
            img.setFrame(Sound.toggleMute() ? 5 : 4);
        });

        this.input.keyboard!.once('keydown-SPACE', () => start(resume));
        this.input.keyboard!.once('keydown-ENTER', () => start(resume));
        this.input.once('pointerdown', () => Sound.unlock());
        Sound.setMood('title');
    }
}
