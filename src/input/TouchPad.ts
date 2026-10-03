import Phaser from 'phaser';
import { getLayout } from '../layout';

export interface PadState {
    left: boolean;
    right: boolean;
    up: boolean;
    down: boolean;
    jump: boolean;
    action: boolean;
}

const DPAD = { x: 0, y: 0, r: 50, hitR: 74 };
const JUMP = { x: 0, y: 0, r: 30, hitR: 46 };
const ACTION = { x: 0, y: 0, r: 22, hitR: 34 };

function placeButtons() {
    const { pad } = getLayout();
    Object.assign(DPAD, pad.dpad);
    Object.assign(JUMP, pad.jump);
    Object.assign(ACTION, pad.action);
}

/**
 * On-screen controls for phones and tablets. A d-pad on the left (slide your
 * thumb around it), a big JUMP button on the right and an ACTION button that
 * only appears when the level needs it. Multi-touch friendly.
 * Drawn by its own camera so it can sit outside the game view (see layout.ts).
 */
export class TouchPad {
    state: PadState = { left: false, right: false, up: false, down: false, jump: false, action: false };
    /** Holds every pad graphic; drawn only by `cam`. */
    readonly container: Phaser.GameObjects.Container;
    private dpadKnob: Phaser.GameObjects.Arc;
    private arrows: Phaser.GameObjects.Image[] = [];
    private jumpBtn: Phaser.GameObjects.Arc;
    private actionBtn: Phaser.GameObjects.Arc;
    private actionIcon: Phaser.GameObjects.Image;
    private actionEnabled = false;
    private visible = false;
    private uiCam: Phaser.Cameras.Scene2D.Camera;

    /** The full-canvas camera that draws the pad. */
    get cam() {
        return this.uiCam;
    }
    private parts: { obj: Phaser.GameObjects.Components.Transform; at: () => { x: number; y: number }; dx: number; dy: number }[] = [];

    constructor(private scene: Phaser.Scene, opts: { action: boolean }) {
        this.actionEnabled = opts.action;
        scene.input.addPointer(3);

        placeButtons();
        const c = (this.container = scene.add.container(0, 0).setDepth(1000));
        const add = <T extends Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Transform>(
            obj: T, at: () => { x: number; y: number }, dx = 0, dy = 0,
        ): T => {
            this.parts.push({ obj, at, dx, dy });
            c.add(obj);
            return obj;
        };
        const dp = () => DPAD, jp = () => JUMP, ap = () => ACTION;

        add(scene.add.circle(0, 0, DPAD.r, 0x000000, 0.3).setStrokeStyle(2, 0xffffff, 0.35), dp);
        this.dpadKnob = add(scene.add.circle(0, 0, 15, 0xffffff, 0.25), dp);
        const off = 32;
        [[off, 0, 0], [0, off, 1], [-off, 0, 2], [0, -off, 3]].forEach(([dx, dy, f]) => {
            this.arrows.push(add(scene.add.image(0, 0, 'icons', f).setAlpha(0.75), dp, dx, dy));
        });

        this.jumpBtn = add(scene.add.circle(0, 0, JUMP.r, 0x4b3478, 0.55).setStrokeStyle(2, 0xffffff, 0.5), jp);
        add(scene.add.image(0, 0, 'icons', 3).setScale(1.3), jp, 0, -5);
        add(scene.add.text(0, 0, 'JUMP', { fontFamily: '"Press Start 2P", monospace', fontSize: '8px', color: '#ffffff' }).setOrigin(0.5), jp, 0, 13);

        this.actionBtn = add(scene.add.circle(0, 0, ACTION.r, 0xe0a020, 0.55).setStrokeStyle(2, 0xffffff, 0.5), ap);
        this.actionIcon = add(scene.add.image(0, 0, 'icons', 7), ap);
        this.relayout();

        // A dedicated full-canvas camera draws only the pad; the main camera
        // (the game view) never draws it.
        const { w, h } = getLayout();
        this.uiCam = scene.cameras.add(0, 0, w, h);
        scene.cameras.main.ignore(c);
        this.uiCam.ignore(scene.children.list.filter((o) => o !== c));
        const hideFromUi = (o: Phaser.GameObjects.GameObject) => {
            if (o !== c && !c.exists(o)) this.uiCam.ignore(o);
        };
        scene.events.on(Phaser.Scenes.Events.ADDED_TO_SCENE, hideFromUi);
        scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.events.off(Phaser.Scenes.Events.ADDED_TO_SCENE, hideFromUi));
        this.actionBtn.setVisible(this.actionEnabled);
        this.actionIcon.setVisible(this.actionEnabled);

        this.setVisible(getLayout().bands || TouchPad.touchSeen);
        const onLayout = () => this.relayout();
        scene.game.events.on('layout', onLayout);
        scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.game.events.off('layout', onLayout));
        scene.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
            if (p.wasTouch && !this.visible) {
                TouchPad.touchSeen = true;
                this.setVisible(true);
            }
        });
    }

    /** Remembered across scenes: once a finger touches the game, keep the pad. */
    static touchSeen = false;

    /** Re-place everything after the screen layout changes (e.g. rotation). */
    relayout() {
        placeButtons();
        for (const p of this.parts) {
            const a = p.at();
            p.obj.setPosition(a.x + p.dx, a.y + p.dy);
        }
        const { w, h } = getLayout();
        this.uiCam?.setSize(w, h);
    }

    get isVisible() {
        return this.visible;
    }

    setVisible(v: boolean) {
        this.visible = v;
        this.container.setVisible(v);
    }

    /** Change the action button's icon to show what it will do right now. */
    setActionIcon(texture: string, frame: number, highlight: boolean) {
        if (!this.actionEnabled) return;
        this.actionIcon.setTexture(texture, frame);
        this.actionBtn.setFillStyle(highlight ? 0xffd34d : 0xe0a020, highlight ? 0.85 : 0.45);
    }

    update() {
        const s: PadState = { left: false, right: false, up: false, down: false, jump: false, action: false };
        if (this.visible) {
            let knobX = DPAD.x, knobY = DPAD.y;
            for (const p of this.scene.input.manager.pointers) {
                if (!p.isDown) continue;
                const dx = p.x - DPAD.x, dy = p.y - DPAD.y;
                const d = Math.hypot(dx, dy);
                if (d < DPAD.hitR) {
                    if (d > 10) {
                        // 8-way: wide horizontal slices so running is easy,
                        // up/down need a clear vertical push.
                        const ang = Math.atan2(dy, dx);
                        const deg = (ang * 180) / Math.PI;
                        if (deg > -60 && deg < 60) s.right = true;
                        if (deg > 120 || deg < -120) s.left = true;
                        if (deg < -35 && deg > -145) s.up = true;
                        if (deg > 35 && deg < 145) s.down = true;
                        const k = Math.min(d, 28) / d;
                        knobX = DPAD.x + dx * k;
                        knobY = DPAD.y + dy * k;
                    }
                    continue;
                }
                if (Math.hypot(p.x - JUMP.x, p.y - JUMP.y) < JUMP.hitR) s.jump = true;
                else if (this.actionEnabled && Math.hypot(p.x - ACTION.x, p.y - ACTION.y) < ACTION.hitR) s.action = true;
            }
            this.dpadKnob.setPosition(knobX, knobY);
            const lit = [s.right, s.down, s.left, s.up];
            this.arrows.forEach((a, i) => a.setAlpha(lit[i] ? 1 : 0.6));
            this.jumpBtn.setFillStyle(0x4b3478, s.jump ? 0.9 : 0.55);
        }
        this.state = s;
    }
}
