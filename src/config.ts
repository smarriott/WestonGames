// Global tuning knobs. Everything is in "game pixels": the canvas is a small
// pixel-art resolution that Phaser scales up to fit any screen.

export const GAME_W = 480;
export const GAME_H = 272;
export const TILE = 16;

export const FONT = '"Press Start 2P", monospace';

export const PHYSICS = {
    GRAVITY: 1000,
    MAX_FALL: 520,
    RUN_SPEED: 130,
    JUMP_VELOCITY: 345,
    /** Releasing jump early cuts upward speed to this, for short hops. */
    JUMP_CUT_VELOCITY: 140,
    CLIMB_SPEED: 90,
    /** Grace period after leaving a ledge where a jump still works (ms). */
    COYOTE_MS: 110,
    /** A jump pressed slightly before landing still fires (ms). */
    JUMP_BUFFER_MS: 130,
};

export const COLORS = {
    night: 0x150d24,
    text: '#fff6d8',
    textDark: '#1a1423',
    accent: '#ffd34d',
    danger: '#ff5a5a',
    good: '#7dff8a',
};

export type LevelKey = `Level${number}Scene`;

export interface LevelInfo {
    key: LevelKey;
    title: string;
    goal: string;
}

export const LEVELS: LevelInfo[] = [
    { key: 'Level1Scene', title: 'The Ladders', goal: 'Climb to the mouse hole!\nDon\'t fall... the cat is waiting.' },
    { key: 'Level2Scene', title: 'The Escape', goal: 'RUN! The cat is coming!\nDodge the fans and the goo.' },
    { key: 'Level3Scene', title: 'Hide and Outsmart', goal: 'Set 3 traps for the giant.\nHide when it comes close!' },
    { key: 'Level4Scene', title: 'Toy Box Trouble', goal: 'Find 4 batteries for the toy rocket.\nBounce on the jack-in-the-boxes!' },
    { key: 'Level5Scene', title: 'Bath Time Flood', goal: 'The bath is filling up!\nClimb to the window. Ride the ducks!' },
    { key: 'Level6Scene', title: 'The Ghost Kitchen', goal: 'Bring the BIG cheese home.\nGhosts are shy: look at them!' },
    { key: 'Level7Scene', title: 'Lights Out', goal: 'Find the fuse box in the dark.\nFireflies help you see.' },
    { key: 'Level8Scene', title: 'Spider Attic', goal: 'Free 3 baby mice from the webs.\nWebs are sticky!' },
    { key: 'Level9Scene', title: 'The Haunted Library', goal: 'Find 3 lost pages.\nHide from the lantern light. SHHH!' },
    { key: 'Level10Scene', title: 'Bell the Cat', goal: 'Distract the cat with yarn,\nthen sneak up and ring it with 3 bells!' },
];
