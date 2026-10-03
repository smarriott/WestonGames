import Phaser from 'phaser';
import { TouchPad } from './TouchPad';

type Btn = 'left' | 'right' | 'up' | 'down' | 'jump' | 'action';

/**
 * One place to ask "what is the player pressing?" — merges keyboard
 * (arrows / WASD / Space / E) with the on-screen touch pad.
 */
export class Controls {
    readonly pad: TouchPad;
    private keys: Record<Btn, Phaser.Input.Keyboard.Key[]>;
    private now: Record<Btn, boolean> = { left: false, right: false, up: false, down: false, jump: false, action: false };
    private prev: Record<Btn, boolean> = { ...this.now };
    /** Keyboard up (↑ / W) is held: lets ↑ double as jump when not on a ladder. */
    upKey = false;
    private prevUpKey = false;

    constructor(scene: Phaser.Scene, opts: { action?: boolean } = {}) {
        const kb = scene.input.keyboard!;
        const K = Phaser.Input.Keyboard.KeyCodes;
        const add = (...codes: number[]) => codes.map((c) => kb.addKey(c, true));
        this.keys = {
            left: add(K.LEFT, K.A),
            right: add(K.RIGHT, K.D),
            up: add(K.UP, K.W),
            down: add(K.DOWN, K.S),
            jump: add(K.SPACE),
            action: add(K.E, K.ENTER),
        };
        this.pad = new TouchPad(scene, { action: !!opts.action });
    }

    update() {
        this.pad.update();
        this.prev = { ...this.now };
        this.prevUpKey = this.upKey;
        const held = (b: Btn) => this.keys[b].some((k) => k.isDown);
        const p = this.pad.state;
        this.now = {
            left: held('left') || p.left,
            right: held('right') || p.right,
            up: held('up') || p.up,
            down: held('down') || p.down,
            jump: held('jump') || p.jump,
            action: held('action') || p.action,
        };
        this.upKey = held('up');
    }

    isDown(b: Btn) {
        return this.now[b];
    }

    justDown(b: Btn) {
        return this.now[b] && !this.prev[b];
    }

    get upKeyJustDown() {
        return this.upKey && !this.prevUpKey;
    }

    /** Horizontal intent: -1, 0 or 1. */
    get dirX() {
        return (this.now.right ? 1 : 0) - (this.now.left ? 1 : 0);
    }

    anyJustDown() {
        return (Object.keys(this.now) as Btn[]).some((b) => this.justDown(b));
    }
}
