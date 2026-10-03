import Phaser from 'phaser';
import { allSheets } from './sprites';
import { packSheet } from './pixels';

/** Turns every generated pixel sheet into a Phaser texture with numbered frames. */
export function buildTextures(scene: Phaser.Scene) {
    for (const s of allSheets()) {
        if (scene.textures.exists(s.key)) continue;
        const px = packSheet(s);
        const canvas = document.createElement('canvas');
        canvas.width = px.w;
        canvas.height = px.h;
        const ctx = canvas.getContext('2d')!;
        ctx.putImageData(new ImageData(px.data, px.w, px.h), 0, 0);
        const tex = scene.textures.addCanvas(s.key, canvas)!;
        s.frames.forEach((_, i) => tex.add(i, 0, i * s.frameW, 0, s.frameW, s.frameH));
    }
}

/** Shared animations, created once. */
export function buildAnimations(scene: Phaser.Scene) {
    const a = scene.anims;
    const make = (key: string, tex: string, frames: number[], frameRate: number, repeat = -1) => {
        if (a.exists(key)) return;
        a.create({ key, frames: frames.map((f) => ({ key: tex, frame: f })), frameRate, repeat });
    };
    make('mouse_idle', 'mouse', [0], 1);
    make('mouse_run', 'mouse', [1, 0, 2, 0], 14);
    make('mouse_jump', 'mouse', [3], 1);
    make('mouse_climb', 'mouse', [4, 5], 8);
    make('cat_run', 'cat_run', [0, 1, 2, 3], 14);
    make('fan_spin', 'fan_blades', [0, 1, 2, 3], 24);
    make('fan_slow', 'fan_blades', [0, 1, 2, 3], 6);
    make('bat_flap', 'bat', [0, 1], 6);
    make('candle', 'candle', [0, 1], 4);
    make('exit_glow', 'exit', [0, 1], 3);
    make('cheese_shine', 'cheese', [0, 0, 0, 1], 4);
    make('goo_drip', 'goo_drop', [0, 1], 4);
    make('star_spin', 'star', [0, 1], 6);
    make('battery_glow', 'battery', [0, 1], 4);
    make('rocket_fire', 'rocket', [1, 2], 12);
    make('robot_walk', 'robot', [0, 1], 6);
    make('train_wheels', 'train', [0, 1, 2, 3], 10);
    make('duck_blink', 'duck', [0, 0, 0, 0, 0, 1], 3);
    make('flame', 'flame', [0, 1], 10);
    make('firefly', 'firefly', [0, 1], 5);
    make('baby_wave', 'baby', [0, 1], 4);
    make('spider_wiggle', 'spider', [0, 1], 5);
    make('librarian', 'librarian', [0, 1], 3);
    make('page_glow', 'page', [0, 1], 3);
    make('boss_walk', 'boss_cat', [0, 1], 6);
}
