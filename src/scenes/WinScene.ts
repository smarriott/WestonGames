import Phaser from 'phaser';
import { COLORS, GAME_H, GAME_W } from '../config';
import { Sound } from '../audio/Sound';
import { button, text, useView } from '../ui/ui';

/** The happy ending: the mouse got the key and escaped the spooky house! */
export default class WinScene extends Phaser.Scene {
    constructor() {
        super('WinScene');
    }

    create() {
        useView(this);
        this.cameras.main.setBackgroundColor('#1d1438').fadeIn(400);
        Sound.setMood('none');
        Sound.win();

        // sunrise: the long spooky night is over
        const sky = this.add.graphics();
        const bands = ['#1d1438', '#3a2350', '#6a2f5a', '#b04a5a', '#e07a4a', '#f2b04a'];
        bands.forEach((c, i) => sky.fillStyle(Phaser.Display.Color.HexStringToColor(c).color).fillRect(0, i * 34, GAME_W, 34));
        const sun = this.add.image(GAME_W - 80, 230, 'sun').setScale(1.4);
        this.tweens.add({ targets: sun, y: 120, duration: 3000, ease: 'Sine.Out' });
        this.tweens.add({ targets: sun, angle: 360, duration: 20000, repeat: -1 });
        this.add.image(70, GAME_H - 20, 'house').setOrigin(0.5, 1).setScale(0.8).setTint(0x2a1d45);
        const title = text(this, GAME_W / 2, 50, 'YOU WIN!', 24, COLORS.accent).setScale(0.2);
        this.tweens.add({ targets: title, scale: 1, duration: 500, ease: 'Back.Out' });
        text(this, GAME_W / 2, 88, 'You belled the cat and escaped\nthe spooky house. Good morning!', 8, COLORS.text);

        // hero with the key, bouncing for joy
        const mouse = this.add.sprite(GAME_W / 2 - 10, 160, 'mouse', 0).setScale(4);
        const key = this.add.image(GAME_W / 2 + 30, 138, 'bell').setScale(3).setAngle(-20);
        this.tweens.add({ targets: [mouse, key], y: '-=14', yoyo: true, repeat: -1, duration: 350, ease: 'Quad.Out' });
        this.add.rectangle(GAME_W / 2, 196, 200, 4, 0x4b3478);

        // cheese + star confetti
        this.time.addEvent({ delay: 120, loop: true, callback: () => {
            const isCheese = Math.random() < 0.4;
            const c = this.add.image(Math.random() * GAME_W, -10, isCheese ? 'cheese' : 'star', isCheese ? 0 : Phaser.Math.Between(0, 1));
            this.tweens.add({
                targets: c, y: GAME_H + 10, angle: Phaser.Math.Between(-360, 360),
                duration: 2200 + Math.random() * 1500, onComplete: () => c.destroy(),
            });
        } });

        button(this, GAME_W / 2 - 80, 234, 'PLAY AGAIN', () => this.scene.start('Level1Scene'), { w: 130 });
        button(this, GAME_W / 2 + 80, 234, 'TITLE', () => this.scene.start('TitleScene'), { w: 130 });
        this.time.delayedCall(800, () => {
            this.input.keyboard!.once('keydown-SPACE', () => this.scene.start('TitleScene'));
        });
    }
}
