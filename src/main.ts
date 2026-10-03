import Phaser from 'phaser';
import { PHYSICS } from './config';
import { getLayout, refreshLayout } from './layout';
import { Sound } from './audio/Sound';
import BootScene from './scenes/BootScene';
import TitleScene from './scenes/TitleScene';
import Level1Scene from './scenes/Level1Scene';
import Level2Scene from './scenes/Level2Scene';
import Level3Scene from './scenes/Level3Scene';
import Level4Scene from './scenes/Level4Scene';
import Level5Scene from './scenes/Level5Scene';
import Level6Scene from './scenes/Level6Scene';
import Level7Scene from './scenes/Level7Scene';
import Level8Scene from './scenes/Level8Scene';
import Level9Scene from './scenes/Level9Scene';
import Level10Scene from './scenes/Level10Scene';
import WinScene from './scenes/WinScene';

refreshLayout();
const layout = getLayout();

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: 'app',
    width: layout.w,
    height: layout.h,
    backgroundColor: '#150d24',
    pixelArt: true,
    roundPixels: true,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
        default: 'arcade',
        arcade: { gravity: { x: 0, y: PHYSICS.GRAVITY }, debug: false },
    },
    input: { activePointers: 4 },
    // We synthesise our own sound with Web Audio (see audio/Sound.ts)
    audio: { noAudio: true },
    scene: [
        BootScene, TitleScene,
        Level1Scene, Level2Scene, Level3Scene, Level4Scene, Level5Scene,
        Level6Scene, Level7Scene, Level8Scene, Level9Scene, Level10Scene,
        WinScene,
    ],
};

async function start() {
    // Wait (briefly) for the pixel font so text doesn't flash in a fallback font
    try {
        await Promise.race([
            document.fonts.load('8px "Press Start 2P"'),
            new Promise((r) => setTimeout(r, 1500)),
        ]);
    } catch {
        /* font is optional */
    }

    const game = new Phaser.Game(config);
    (window as unknown as { __game: Phaser.Game }).__game = game;

    // Browsers only allow audio after the player touches/clicks/presses a key
    for (const ev of ['pointerdown', 'keydown', 'touchend']) {
        window.addEventListener(ev, () => Sound.unlock(), { passive: true });
    }

    // On phones held upright we show a "turn sideways" message and pause
    const portrait = window.matchMedia('(orientation: portrait) and (pointer: coarse) and (max-width: 600px)');
    const onOrientation = () => {
        if (portrait.matches) game.pause();
        else game.resume();
    };
    portrait.addEventListener('change', onOrientation);
    onOrientation();

    // Touch layouts depend on the screen's shape: re-fit after rotating
    window.addEventListener('resize', () => {
        if (!refreshLayout()) return;
        const l = getLayout();
        game.scale.setGameSize(l.w, l.h);
        game.events.emit('layout');
    });
}

void start();
