import Phaser from 'phaser';
import { buildAnimations, buildTextures } from '../assets/textures';
import { LEVELS } from '../config';

/** Turns the generated pixel art into textures + animations, then shows the title. */
export default class BootScene extends Phaser.Scene {
    constructor() {
        super('BootScene');
    }

    create() {
        buildTextures(this);
        buildAnimations(this);
        // Handy for testing: ?level=7 jumps straight to a level
        const level = new URLSearchParams(window.location.search).get('level');
        const n = Number(level);
        if (Number.isInteger(n) && n >= 1 && n <= LEVELS.length) this.scene.start(LEVELS[n - 1].key);
        else this.scene.start('TitleScene');
    }
}
