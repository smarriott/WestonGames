import Phaser from 'phaser';
import { PHYSICS } from '../config';
import { Controls } from '../input/Controls';
import { Sound } from '../audio/Sound';
import type { WorldMap } from './WorldMap';

/**
 * The mouse. Kid-friendly platformer feel: coyote time, jump buffering,
 * variable jump height, and ladders you can grab in mid-air.
 */
export class Player extends Phaser.Physics.Arcade.Sprite {
    declare body: Phaser.Physics.Arcade.Body;

    climbing = false;
    hidden = false;
    frozen = false;
    /** Extra horizontal push from the level (e.g. fan wind), in px/s. */
    pushX = 0;
    /** Multipliers the level can set (sticky webs, carrying something heavy). */
    speedScale = 1;
    jumpScale = 1;

    /** True after a spring launch, until the mouse starts falling (no jump-cut). */
    private launched = false;

    private lastGroundAt = -1000;
    private jumpBufferedAt = -1000;
    private jumping = false;
    private noGrabUntil = 0;
    private climbSoundAt = 0;

    constructor(scene: Phaser.Scene, x: number, y: number, private world: WorldMap) {
        super(scene, x, y, 'mouse', 0);
        scene.add.existing(this);
        scene.physics.add.existing(this);
        this.setDepth(50);
        this.body.setSize(10, 9).setOffset(3, 6);
        this.body.setMaxVelocityY(PHYSICS.MAX_FALL);
        this.setCollideWorldBounds(true);
    }

    get onGround() {
        return this.body.blocked.down;
    }

    /** Standing on the floor of a level (not on a shelf or ladder). */
    isOnFloorAt(floorY: number) {
        return this.onGround && !this.climbing && Math.abs(this.body.bottom - floorY) < 3;
    }

    update(c: Controls, time: number) {
        if (this.frozen || this.hidden) return;
        const body = this.body;
        if (this.onGround) {
            this.lastGroundAt = time;
            this.jumping = false;
        }

        const ladderHere = this.world.ladderAt(this.x, body.center.y) || this.world.ladderAt(this.x, body.bottom - 1);
        const ladderBelow = this.world.ladderAt(this.x, body.bottom + 2);

        // ↑ / W jumps unless there is a ladder to climb
        const jumpPressed = c.justDown('jump') || (c.upKeyJustDown && !ladderHere);
        if (jumpPressed) this.jumpBufferedAt = time;

        if (this.climbing) {
            this.updateClimb(c, time, ladderHere);
            return;
        }

        // start climbing
        const airborne = !this.onGround;
        const wantsUp = c.isDown('up');
        if (
            (wantsUp && ladderHere && !jumpPressed) ||
            (c.isDown('down') && this.onGround && ladderBelow) ||
            (airborne && ladderHere && time > this.noGrabUntil && (body.velocity.y > -40 || wantsUp))
        ) {
            this.startClimb();
            return;
        }

        // run
        const dir = c.dirX;
        body.setVelocityX(dir * PHYSICS.RUN_SPEED * this.speedScale + this.pushX);
        if (dir !== 0) this.setFlipX(dir < 0);

        // jump (with coyote time + buffer)
        const canJump = time - this.lastGroundAt < PHYSICS.COYOTE_MS && !this.jumping;
        if (time - this.jumpBufferedAt < PHYSICS.JUMP_BUFFER_MS && canJump) {
            body.setVelocityY(-PHYSICS.JUMP_VELOCITY * this.jumpScale);
            this.jumping = true;
            this.jumpBufferedAt = -1000;
            this.lastGroundAt = -1000;
            Sound.jump();
        }
        // let go early = small hop
        const holdingJump = c.isDown('jump') || c.upKey;
        if (body.velocity.y >= 0) this.launched = false;
        if (!holdingJump && !this.launched && body.velocity.y < -PHYSICS.JUMP_CUT_VELOCITY) {
            body.setVelocityY(-PHYSICS.JUMP_CUT_VELOCITY);
        }

        // animation
        if (!this.onGround) this.anims.play('mouse_jump', true);
        else if (dir !== 0) this.anims.play('mouse_run', true);
        else this.anims.play('mouse_idle', true);
    }

    /** Spring the mouse into the air (jack-in-the-box, bubbles, mattress springs). */
    launch(vy: number) {
        if (this.climbing) this.stopClimb();
        this.body.setVelocityY(-vy);
        this.launched = true;
        this.jumping = true;
        this.lastGroundAt = -1000;
        this.noGrabUntil = this.scene.time.now + 300;
    }

    private startClimb() {
        this.climbing = true;
        this.jumping = false;
        this.body.setAllowGravity(false);
        this.body.setVelocity(0, 0);
        this.anims.play('mouse_climb', true);
    }

    stopClimb() {
        this.climbing = false;
        this.body.setAllowGravity(true);
    }

    private updateClimb(c: Controls, time: number, ladderHere: boolean) {
        const body = this.body;
        const vy = c.isDown('up') ? -PHYSICS.CLIMB_SPEED : c.isDown('down') ? PHYSICS.CLIMB_SPEED : 0;
        const dir = c.dirX;
        body.setVelocityY(vy);
        // Ladders are sticky: holding left/right never slides you off a
        // ladder in mid-air (you jump off instead). At the bottom, walking
        // left/right steps off onto the floor.
        const feetOnGround = this.world.groundAt(this.x, body.bottom + 1);
        if (dir !== 0 && feetOnGround) {
            this.stopClimb();
            return;
        }
        const cx = this.world.ladderCenterX(this.x);
        body.setVelocityX((cx - this.x) * 10);

        if (vy !== 0) {
            if (this.anims.isPaused) this.anims.resume();
            else this.anims.play('mouse_climb', true);
            if (time > this.climbSoundAt) {
                Sound.climb();
                this.climbSoundAt = time + 220;
            }
        } else {
            this.anims.pause();
        }

        // leap off the ladder
        if (c.justDown('jump')) {
            this.stopClimb();
            body.setVelocityY(-PHYSICS.JUMP_VELOCITY * 0.85);
            body.setVelocityX(dir * PHYSICS.RUN_SPEED);
            if (dir !== 0) this.setFlipX(dir < 0);
            this.noGrabUntil = time + 350;
            this.jumping = true;
            Sound.jump();
            return;
        }

        // reached the top, or stepped off the side (climbing down from the
        // shelf at the top of a ladder only has ladder below the feet at first)
        const ladderBelowFeet = vy > 0 && this.world.ladderAt(this.x, body.bottom + 2);
        if (!ladderHere && !ladderBelowFeet) {
            this.stopClimb();
            if (vy < 0) body.setVelocityY(-120); // little hop onto the shelf
            this.noGrabUntil = time + 250;
            return;
        }

        // reached the ground at the bottom
        if (vy > 0 && feetOnGround && !this.world.ladderAt(this.x, body.bottom + 2)) {
            this.stopClimb();
        }
    }
}
