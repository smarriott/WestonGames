import Phaser from 'phaser';
import { COLORS, FONT } from '../config';
import { getLayout } from '../layout';

/** Put the scene's main camera in the game-view rectangle, now and after the screen layout changes. */
export function useView(scene: Phaser.Scene, onChange?: () => void) {
    const apply = () => {
        const v = getLayout().view;
        scene.cameras.main.setViewport(v.x, v.y, v.w, v.h);
        onChange?.();
    };
    apply();
    scene.game.events.on('layout', apply);
    scene.events.once('shutdown', () => scene.game.events.off('layout', apply));
}

export function text(
    scene: Phaser.Scene, x: number, y: number, str: string,
    size = 8, color = COLORS.text, align: 'left' | 'center' | 'right' = 'center',
): Phaser.GameObjects.Text {
    const t = scene.add.text(x, y, str, {
        fontFamily: FONT,
        fontSize: `${size}px`,
        color,
        align,
        stroke: '#1a1423',
        strokeThickness: Math.max(2, Math.round(size / 3)),
        lineSpacing: Math.round(size / 2),
    });
    t.setOrigin(align === 'left' ? 0 : align === 'right' ? 1 : 0.5, 0.5);
    return t;
}

/** A big cartoon word that pops in at the centre of the screen. */
export function popWord(scene: Phaser.Scene, str: string, color: string, size = 24, duration = 900) {
    const cam = scene.cameras.main;
    const t = text(scene, cam.width / 2, cam.height / 2 - 30, str, size, color)
        .setScrollFactor(0)
        .setDepth(1050)
        .setScale(0.2);
    scene.tweens.add({ targets: t, scale: 1, duration: 260, ease: 'Back.Out' });
    scene.tweens.add({ targets: t, alpha: 0, delay: duration, duration: 200, onComplete: () => t.destroy() });
    return t;
}

/** A rounded clickable button that works with mouse and touch. */
export function button(
    scene: Phaser.Scene, x: number, y: number, label: string, onClick: () => void,
    opts: { w?: number; h?: number; color?: number; size?: number } = {},
) {
    const w = opts.w ?? 140, h = opts.h ?? 28;
    const c = scene.add.container(x, y);
    const g = scene.add.graphics();
    const draw = (hover: boolean) => {
        g.clear();
        g.fillStyle(0x1a1423, 1).fillRoundedRect(-w / 2, -h / 2 + 3, w, h, 6);
        g.fillStyle(opts.color ?? 0x4b3478, 1).fillRoundedRect(-w / 2, -h / 2, w, h, 6);
        g.lineStyle(2, hover ? 0xffd34d : 0xb49be0, 1).strokeRoundedRect(-w / 2, -h / 2, w, h, 6);
    };
    draw(false);
    const t = text(scene, 0, 0, label, opts.size ?? 8);
    c.add([g, t]);
    c.setSize(w, h);
    c.setInteractive({ useHandCursor: true });
    c.on('pointerover', () => draw(true));
    c.on('pointerout', () => draw(false));
    c.on('pointerup', () => onClick());
    return c;
}

/** Small round icon button for the HUD (mute, fullscreen, pause). */
export function iconButton(scene: Phaser.Scene, x: number, y: number, frame: number, onClick: (img: Phaser.GameObjects.Image) => void) {
    const bg = scene.add.circle(x, y, 11, 0x000000, 0.35).setScrollFactor(0).setDepth(950);
    const img = scene.add.image(x, y, 'icons', frame).setScrollFactor(0).setDepth(951);
    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerup', () => onClick(img));
    return { bg, img };
}
