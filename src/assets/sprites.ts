// All pixel art for "Mouse on the Run", authored in code.
// Each export builds a Sheet (a strip of frames). Nothing here touches the DOM,
// so the exporter script can turn every sheet into a PNG.

import { Pixels, Sheet, sheet } from './pixels';
import { C } from './palette';
import { newSheets } from './sprites2';

const rows = Pixels.fromRows;

// ─────────────────────────────────────────────────────────────── Mouse (hero)

const MOUSE_BODY = [
    '................',
    '................',
    '................',
    '................',
    '.........kk.....',
    '........kppk....',
    '........kpPk....',
    '.....kkkkkpkk...',
    '....kGGGGGkggk..',
    '...kGgggggggwKk.',
    '..kggggggggggggp',
    '..kgggggggggggk.',
    'pkdggggggggggk..',
    'p.kdddddddddk...',
];

const MOUSE_LEGS = {
    idle: '.pp..kk...kk....',
    runA: '.pp.kk.....kk...',
    runB: '.pp...kk.kk.....',
    jump: '..p..kk..kk.....',
};

function mouseFrame(legs: string, bob = 0): Pixels {
    const body = MOUSE_BODY.slice();
    const out: string[] = [];
    // bob shifts the whole mouse up a pixel for a bouncy run
    for (let i = 0; i < bob; i++) body.shift();
    out.push(...body, legs);
    while (out.length < 16) out.push('................');
    return rows(out.slice(0, 16));
}

function mouseClimb(leftUp: boolean): Pixels {
    const px = rows([
        '................',
        '................',
        '..kk........kk..',
        '.kppk......kppk.',
        '.kpPkkkkkkkkPpk.',
        '..kkggggggggkk..',
        '...kggggggggk...',
        '..kggggggggggk..',
        '..kggggggggggk..',
        '..kggggggggggk..',
        '..kggggggggggk..',
        '...kggggggggk...',
        '....kkkppkkk....',
        '.......pp.......',
        '........p.......',
        '.......p........',
    ]);
    // little hands reaching for the rungs
    const hy = leftUp ? 5 : 9;
    const ry = leftUp ? 9 : 5;
    px.rect(0, hy, 2, 2, C.ink);
    px.rect(1, hy, 1, 1, C.greyLight);
    px.rect(14, ry, 2, 2, C.ink);
    px.rect(14, ry, 1, 1, C.greyLight);
    // feet
    px.rect(4, leftUp ? 13 : 12, 2, 1, C.ink);
    px.rect(10, leftUp ? 12 : 13, 2, 1, C.ink);
    return px;
}

function mouseSquish(): Pixels {
    return rows([
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '................',
        '...kkkkkkkkkk...',
        'pkGgggggwggwgk..',
        'pkddddddddddddk.',
        '..kkkkkkkkkkkk..',
    ]);
}

/** Frames: 0 idle, 1 runA, 2 runB(bob), 3 jump, 4 climbA, 5 climbB, 6 squish */
export function mouseSheet(): Sheet {
    return sheet('mouse', [
        mouseFrame(MOUSE_LEGS.idle),
        mouseFrame(MOUSE_LEGS.runA),
        mouseFrame(MOUSE_LEGS.runB, 1),
        mouseFrame(MOUSE_LEGS.jump),
        mouseClimb(true),
        mouseClimb(false),
        mouseSquish(),
    ]);
}

// ─────────────────────────────────────────────────────────────── Tiles

function brick(top: boolean): Pixels {
    const px = new Pixels(16, 16);
    px.rect(0, 0, 16, 16, C.purpleDark);
    const brickRow = (y: number, offset: number) => {
        for (let x = -8 + offset; x < 16; x += 8) {
            px.rect(x + 1, y + 1, 7, 6, C.purple);
            px.rect(x + 1, y + 1, 7, 1, C.purpleLight);
        }
    };
    brickRow(0, 0);
    brickRow(8, 4);
    px.set(4, 4, C.purpleDark);
    px.set(11, 12, C.purpleDark);
    if (top) {
        px.rect(0, 0, 16, 2, C.lavender);
        px.rect(0, 2, 16, 1, C.purpleLight);
        px.set(3, 2, C.lavender);
        px.set(12, 2, C.lavender);
        px.set(12, 3, C.lavender);
    }
    return px;
}

function shelf(): Pixels {
    const px = new Pixels(16, 16);
    px.rect(0, 0, 16, 5, C.brownLight);
    px.rect(0, 0, 16, 1, C.tan);
    px.rect(0, 4, 16, 1, C.brownDark);
    px.set(5, 2, C.brown);
    px.set(6, 2, C.brown);
    px.set(11, 3, C.brown);
    // brackets
    for (const bx of [2, 12]) {
        px.rect(bx, 5, 2, 1, C.steel);
        px.rect(bx, 6, 1, 2, C.steel);
    }
    return px;
}

function ladder(): Pixels {
    const px = new Pixels(16, 16);
    for (const x of [2, 12]) {
        px.rect(x, 0, 2, 16, C.brown);
        px.rect(x, 0, 1, 16, C.brownLight);
    }
    for (const y of [2, 7, 12]) {
        px.rect(4, y, 8, 2, C.brownLight);
        px.rect(4, y + 1, 8, 1, C.brown);
    }
    return px;
}

function board(top: boolean): Pixels {
    const px = new Pixels(16, 16);
    px.rect(0, 0, 16, 16, C.brown);
    for (const y of [0, 5, 10, 15]) px.rect(0, y, 16, 1, C.brownDark);
    px.rect(7, 1, 1, 4, C.brownDark);
    px.rect(2, 6, 1, 4, C.brownDark);
    px.rect(12, 11, 1, 4, C.brownDark);
    if (top) {
        px.rect(0, 0, 16, 2, C.tan);
        px.rect(0, 2, 16, 1, C.brownLight);
    }
    return px;
}

function toyBlock(base: string, light: string, dark: string): Pixels {
    const px = new Pixels(16, 16);
    px.rect(0, 0, 16, 16, base);
    px.rect(0, 0, 16, 2, light);
    px.rect(0, 0, 2, 16, light);
    px.rect(0, 14, 16, 2, dark);
    px.rect(14, 0, 2, 16, dark);
    // a chunky letter on each block
    px.rect(5, 4, 6, 1, C.white);
    px.rect(5, 4, 1, 8, C.white);
    px.rect(10, 4, 1, 8, C.white);
    px.rect(5, 8, 6, 1, C.white);
    return px;
}

function bathTile(top: boolean): Pixels {
    const px = new Pixels(16, 16);
    px.rect(0, 0, 16, 16, '#d9ecf2');
    px.rect(0, 0, 16, 1, '#9fb8c4');
    px.rect(0, 8, 16, 1, '#9fb8c4');
    px.rect(0, 0, 1, 16, '#9fb8c4');
    px.rect(8, 0, 1, 8, '#9fb8c4');
    px.rect(4, 8, 1, 8, '#9fb8c4');
    px.set(3, 3, C.white); px.set(11, 11, C.white);
    if (top) {
        px.rect(0, 0, 16, 3, C.white);
        px.rect(0, 3, 16, 1, '#9fb8c4');
    }
    return px;
}

function checker(top: boolean): Pixels {
    const px = new Pixels(16, 16);
    for (let y = 0; y < 16; y += 8) for (let x = 0; x < 16; x += 8) {
        px.rect(x, y, 8, 8, ((x + y) / 8) % 2 ? '#2a2440' : '#d8d2c0');
    }
    if (top) {
        px.rect(0, 0, 16, 4, '#8a8aa0');
        px.rect(0, 0, 16, 1, C.silver);
        px.rect(0, 4, 16, 1, C.ink);
    }
    return px;
}

function atticBoard(top: boolean): Pixels {
    const px = board(top);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
        const i = (y * 16 + x) * 4;
        px.data[i] = Math.round(px.data[i] * 0.72);
        px.data[i + 1] = Math.round(px.data[i + 1] * 0.66);
        px.data[i + 2] = Math.round(px.data[i + 2] * 0.7);
    }
    px.set(3, 7, C.steel);
    px.set(12, 2, C.steel);
    return px;
}

function bookshelf(top: boolean): Pixels {
    const px = new Pixels(16, 16);
    px.rect(0, 0, 16, 16, C.brownDark);
    const spines = [C.red, C.blue, C.greenDark, C.yellowDark, C.purple, C.redDark, C.blueLight];
    let x = 1, k = 0;
    while (x < 15) {
        const w = 1 + (k % 3 === 0 ? 2 : 1);
        const h = 5 + (k * 3) % 3;
        px.rect(x, 7 - h + 1, w, h, spines[k % spines.length]);
        px.rect(x, 15 - h, w, h, spines[(k + 3) % spines.length]);
        x += w;
        k++;
    }
    px.rect(0, 7, 16, 1, C.brown);
    px.rect(0, 15, 16, 1, C.brown);
    if (top) {
        px.rect(0, 0, 16, 3, C.brownLight);
        px.rect(0, 0, 16, 1, C.tan);
    }
    return px;
}

/**
 * Tileset frames: 0 brick, 1 brick top, 2 shelf, 3 ladder, 4 board, 5 board top,
 * 6-8 toy blocks, 9-10 bath tiles, 11-12 kitchen, 13-14 attic, 15-16 library
 */
export function tilesSheet(): Sheet {
    return sheet('tiles', [
        brick(false), brick(true), shelf(), ladder(), board(false), board(true),
        toyBlock(C.red, '#ff7a7a', C.redDark), toyBlock(C.blue, C.blueLight, C.blueDark), toyBlock(C.yellowDark, C.yellow, C.brown),
        bathTile(false), bathTile(true), checker(false), checker(true), atticBoard(false), atticBoard(true),
        bookshelf(false), bookshelf(true),
    ]);
}

export function wallpaperSheet(): Sheet {
    // 0: stone cellar wall, 1: bedroom wallpaper
    const stone = new Pixels(32, 32);
    stone.rect(0, 0, 32, 32, '#1d1430');
    for (let y = 0; y < 32; y += 8) {
        const off = (y / 8) % 2 ? 8 : 0;
        for (let x = -16 + off; x < 32; x += 16) {
            stone.rect(x + 1, y + 1, 14, 6, '#241a3b');
        }
    }
    const paper = new Pixels(32, 32);
    paper.rect(0, 0, 32, 32, '#22264a');
    paper.rect(0, 0, 4, 32, '#2a2f5a');
    paper.rect(16, 0, 4, 32, '#2a2f5a');
    for (const [x, y] of [[9, 6], [25, 22], [9, 22], [25, 6]]) {
        paper.set(x, y, '#3d4478');
        paper.set(x - 1, y + 1, '#3d4478');
        paper.set(x + 1, y + 1, '#3d4478');
        paper.set(x, y + 2, '#3d4478');
    }

    const toys = new Pixels(32, 32);
    toys.rect(0, 0, 32, 32, '#2b2350');
    for (const [x, y] of [[5, 5], [22, 9], [12, 21], [27, 26]]) {
        toys.set(x, y, C.yellow); toys.set(x - 1, y, '#8a7a30'); toys.set(x + 1, y, '#8a7a30');
        toys.set(x, y - 1, '#8a7a30'); toys.set(x, y + 1, '#8a7a30');
    }
    toys.disc(16, 13, 2, '#3d3370');

    const tiles = new Pixels(32, 32);
    tiles.rect(0, 0, 32, 32, '#2c4a5c');
    for (let i = 0; i < 32; i += 8) {
        tiles.rect(i, 0, 1, 32, '#24404f');
        tiles.rect(0, i, 32, 1, '#24404f');
    }
    tiles.set(3, 3, '#3a5c70'); tiles.set(19, 11, '#3a5c70');

    const kitchen = new Pixels(32, 32);
    kitchen.rect(0, 0, 32, 32, '#3a3424');
    for (let x = 0; x < 32; x += 8) kitchen.rect(x, 0, 3, 32, '#433c2a');
    kitchen.disc(20, 16, 2, '#5a3a2a');
    kitchen.set(19, 13, '#3e6a2e');

    const attic = new Pixels(32, 32);
    attic.rect(0, 0, 32, 32, '#24180f');
    for (let x = 0; x < 32; x += 8) attic.rect(x, 0, 1, 32, '#1a1009');
    attic.set(3, 6, '#4a3a2a'); attic.set(11, 22, '#4a3a2a'); attic.set(27, 14, '#4a3a2a');

    const library = new Pixels(32, 32);
    library.rect(0, 0, 32, 32, '#16261c');
    for (const [x, y] of [[8, 8], [24, 24]]) {
        library.set(x, y - 2, '#3a4a20'); library.set(x - 2, y, '#3a4a20');
        library.set(x + 2, y, '#3a4a20'); library.set(x, y + 2, '#3a4a20'); library.set(x, y, '#6a5a20');
    }
    return sheet('wallpaper', [stone, paper, toys, tiles, kitchen, attic, library]);
}

// ─────────────────────────────────────────────────────────────── Pickups & goal

export function cheeseSheet(): Sheet {
    const a = rows([
        '......kk..',
        '....kkhyk.',
        '..kkhyyyk.',
        'kkhyyYyyyk',
        'kyyyyyyYyk',
        'kyYyyyyyyk',
        'kyyyyYyyyk',
        'kkkkkkkkkk',
    ]);
    const b = a.clone();
    b.set(3, 4, C.white);
    b.set(4, 3, C.white);
    return sheet('cheese', [a, b]);
}

/** A glowing mouse-hole doorway: the level exit. */
export function exitSheet(): Sheet {
    const make = (glow: string) => {
        const px = new Pixels(24, 26);
        const inside = (x: number, y: number, r: number) =>
            (y >= 11 && Math.abs(x - 11.5) <= r) || ((x - 11.5) ** 2 + (y - 11) ** 2 <= r * r);
        for (let y = 0; y < 26; y++) {
            for (let x = 0; x < 24; x++) {
                if (inside(x, y, 11)) px.set(x, y, C.brownDark);
                if (inside(x, y, 9)) px.set(x, y, C.brownLight);
                if (inside(x, y, 7)) px.set(x, y, C.orange);
                if (inside(x, y, 5)) px.set(x, y, glow);
            }
        }
        px.rect(0, 24, 24, 2, C.brownDark);
        return px;
    };
    return sheet('exit', [make(C.yellow), make(C.yellowLight)]);
}

export function keySheet(): Sheet {
    const px = new Pixels(16, 9);
    px.disc(4, 4, 3.6, C.yellow);
    px.disc(4, 4, 1.4, C.ink);
    px.clear(4, 4);
    px.rect(7, 3, 8, 2, C.yellow);
    px.rect(11, 5, 1, 2, C.yellow);
    px.rect(14, 5, 1, 3, C.yellow);
    px.outline(C.ink);
    px.set(2, 2, C.yellowLight);
    px.rect(8, 3, 5, 1, C.yellowLight);
    return sheet('key', [px]);
}

// ─────────────────────────────────────────────────────────────── Cats

/** Level 2 chaser, running right. 4 frame gallop. */
export function catRunSheet(): Sheet {
    const frames: Pixels[] = [];
    const legSets = [
        { front: [24, 28], back: [6, 10], lift: [0, 2, 0, 2] },
        { front: [22, 25], back: [9, 12], lift: [2, 0, 2, 0] },
        { front: [20, 23], back: [11, 14], lift: [1, 1, 1, 1] },
        { front: [22, 25], back: [9, 12], lift: [0, 2, 0, 2] },
    ];
    legSets.forEach((legs, f) => {
        const px = new Pixels(40, 28);
        const bob = f === 2 ? 1 : 0;
        // body + head + ears
        px.ellipse(17, 15 - bob, 11, 6, C.purple);
        px.disc(30, 11 - bob, 7, C.purple);
        for (let i = 0; i < 5; i++) {
            px.rect(25 + Math.floor(i / 2), 2 + i - bob, 5 - i, 1, C.purple);
            px.rect(31 + Math.ceil(i / 2), 2 + i - bob, 5 - i, 1, C.purple);
        }
        // tail swishing up
        const tailTip = f % 2 === 0 ? -1 : 1;
        for (let i = 0; i < 8; i++) {
            px.rect(6 - Math.floor(i * 0.6), 12 - i - bob, 2, 2, C.purple);
        }
        px.rect(2 + tailTip, 3 - bob, 2, 2, C.purple);
        // legs
        const all = [...legs.front, ...legs.back];
        all.forEach((lx, i) => px.rect(lx, 19 - bob, 3, 6 - legs.lift[i], C.purple));
        px.outline(C.ink);
        // face details
        px.rect(27, 8 - bob, 3, 3, C.yellow);
        px.rect(32, 8 - bob, 3, 3, C.yellow);
        px.rect(28, 8 - bob, 1, 3, C.black);
        px.rect(33, 8 - bob, 1, 3, C.black);
        px.rect(26, 7 - bob, 4, 1, C.ink);
        px.rect(32, 7 - bob, 4, 1, C.ink);
        px.set(36, 11 - bob, C.pink);
        // big toothy grin
        px.rect(27, 13 - bob, 10, 1, C.black);
        for (let x = 28; x < 37; x += 2) px.set(x, 14 - bob, C.white);
        px.set(26, 4 - bob, C.pink);
        px.set(32, 4 - bob, C.pink);
        // belly stripe
        px.rect(10, 12 - bob, 1, 3, C.purpleDark);
        px.rect(14, 11 - bob, 1, 3, C.purpleDark);
        px.rect(18, 11 - bob, 1, 3, C.purpleDark);
        frames.push(px);
    });
    return sheet('cat_run', frames);
}

/** The giant jump-scare cat face. Frame 0 grin, frame 1 mouth wide open. */
export function catScareSheet(): Sheet {
    const make = (open: boolean) => {
        const W = 72, H = 60;
        const px = new Pixels(W, H);
        px.disc(36, 34, 24, C.purple);
        px.ellipse(36, 42, 32, 15, C.purple);
        // ears
        for (let i = 0; i < 18; i++) {
            px.rect(13 + Math.floor(i * 0.25), 2 + i, Math.max(1, Math.floor(i * 0.8)), 1, C.purple);
            px.rect(59 - Math.floor(i * 0.25) - Math.max(1, Math.floor(i * 0.8)), 2 + i, Math.max(1, Math.floor(i * 0.8)), 1, C.purple);
        }
        px.outline(C.ink);
        for (let i = 6; i < 16; i++) {
            px.rect(16 + Math.floor(i * 0.25), 2 + i, Math.max(1, Math.floor(i * 0.4)), 1, C.pinkDark);
            px.rect(56 - Math.floor(i * 0.25) - Math.max(1, Math.floor(i * 0.4)), 2 + i, Math.max(1, Math.floor(i * 0.4)), 1, C.pinkDark);
        }
        // forehead stripes
        px.rect(31, 12, 2, 6, C.purpleDark);
        px.rect(36, 11, 2, 7, C.purpleDark);
        px.rect(41, 12, 2, 6, C.purpleDark);
        // eyes
        for (const ex of [24, 48]) {
            px.ellipse(ex, 28, 7, 5, C.yellow);
            px.ellipse(ex, 29, 6, 3, C.yellowDark);
            px.ellipse(ex, 28, 6, 3.5, C.yellow);
            px.rect(ex - 1, 23, 2, 10, C.black);
            px.rect(ex + 2, 25, 2, 2, C.white);
        }
        // angry brows
        px.line(16, 20, 29, 23, C.ink);
        px.line(16, 21, 29, 24, C.ink);
        px.line(56, 20, 43, 23, C.ink);
        px.line(56, 21, 43, 24, C.ink);
        // nose
        px.rect(33, 36, 6, 2, C.pink);
        px.rect(34, 38, 4, 1, C.pink);
        px.rect(35, 39, 2, 1, C.pinkDark);
        // whiskers
        for (const [y, d] of [[40, -2], [43, 0], [46, 2]]) {
            px.line(4, y + d, 18, y, C.greyLight);
            px.line(54, y, 68, y + d, C.greyLight);
        }
        // mouth
        if (open) {
            px.ellipse(36, 48, 14, 8, C.black);
            px.ellipse(36, 51, 9, 4, C.redDark);
            for (let x = 24; x <= 46; x += 4) {
                px.rect(x, 41, 3, 2, C.white);
                px.set(x + 1, 43, C.white);
                px.rect(x + 1, 54, 2, 2, C.white);
            }
        } else {
            for (let x = 18; x <= 54; x++) {
                const y = Math.round(44 + 4 * Math.sin(((x - 18) / 36) * Math.PI));
                px.set(x, y, C.black);
                px.set(x, y + 1, C.black);
                if (x % 4 === 0 && x > 20 && x < 52) {
                    px.set(x, y + 2, C.white);
                    px.set(x + 1, y + 2, C.white);
                    px.set(x, y + 3, C.white);
                }
            }
        }
        return px;
    };
    return sheet('cat_scare', [make(false), make(true)]);
}

/** Little glowing eyes that blink in the dark pit. */
export function pitEyesSheet(): Sheet {
    const open = new Pixels(14, 5);
    for (const x of [0, 9]) {
        open.ellipse(x + 2, 2, 2.4, 2, C.yellow);
        open.rect(x + 2, 0, 1, 5, C.black);
    }
    const shut = new Pixels(14, 5);
    shut.rect(0, 2, 5, 1, C.yellowDark);
    shut.rect(9, 2, 5, 1, C.yellowDark);
    return sheet('pit_eyes', [open, shut]);
}

// ─────────────────────────────────────────────────────────────── Level 2 hazards

/** Fan stand + motor; blades and cage are separate so blades can spin. */
export function fanStandSheet(): Sheet {
    const px = new Pixels(48, 72);
    px.rect(20, 44, 8, 22, C.steel);
    px.rect(21, 44, 2, 22, C.silver);
    px.ellipse(24, 68, 18, 4, C.steel);
    px.ellipse(24, 67, 16, 2, C.silver);
    px.disc(24, 24, 21, C.purpleDark);
    px.outline(C.ink);
    // power light
    px.rect(22, 62, 4, 2, C.red);
    return sheet('fan_stand', [px]);
}

export function fanBladesSheet(): Sheet {
    const frames: Pixels[] = [];
    for (let f = 0; f < 4; f++) {
        const px = new Pixels(40, 40);
        const base = (f / 4) * ((Math.PI * 2) / 3);
        for (let k = 0; k < 3; k++) {
            const a = base + (k * Math.PI * 2) / 3;
            const ca = Math.cos(a), sa = Math.sin(a);
            for (let y = 0; y < 40; y++) {
                for (let x = 0; x < 40; x++) {
                    const dx = x - 19.5, dy = y - 19.5;
                    const u = dx * ca + dy * sa;
                    const v = -dx * sa + dy * ca;
                    if (((u - 10) / 9.5) ** 2 + (v / 4.5) ** 2 <= 1) {
                        px.set(x, y, v > 1.5 ? C.blue : C.blueLight);
                    }
                }
            }
        }
        px.outline(C.blueDark);
        px.disc(19.5, 19.5, 3.5, C.steel);
        px.disc(19.5, 19.5, 1.5, C.silver);
        frames.push(px);
    }
    return sheet('fan_blades', frames);
}

export function fanCageSheet(): Sheet {
    const px = new Pixels(48, 48);
    px.ring(23.5, 23.5, 23, 2, C.silver);
    px.ring(23.5, 23.5, 14, 1, C.steel);
    for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        px.line(23.5 + Math.cos(a) * 5, 23.5 + Math.sin(a) * 5, 23.5 + Math.cos(a) * 22, 23.5 + Math.sin(a) * 22, C.steel);
    }
    // angry face on the fan's badge so kids know it's bad news
    px.disc(23.5, 23.5, 4.5, C.red);
    px.set(22, 22, C.black);
    px.set(25, 22, C.black);
    px.rect(22, 25, 4, 1, C.black);
    return sheet('fan_cage', [px]);
}

export function windSheet(): Sheet {
    const px = new Pixels(14, 3);
    px.rect(0, 1, 10, 1, C.white);
    px.rect(6, 0, 6, 1, C.white);
    px.rect(10, 2, 4, 1, C.white);
    return sheet('wind', [px]);
}

/** Spooky window with black goo oozing from the sill. */
export function gooWindowSheet(): Sheet {
    const px = new Pixels(36, 46);
    px.rect(0, 0, 36, 34, C.brownDark);
    px.rect(3, 3, 30, 28, '#0d1b3a');
    // moon + glints
    px.disc(11, 11, 4, C.moon);
    px.disc(12, 10, 3, '#0d1b3a');
    px.set(25, 7, C.white);
    px.set(28, 20, C.white);
    // frame bars
    px.rect(17, 3, 2, 28, C.brownDark);
    px.rect(3, 16, 30, 2, C.brownDark);
    px.rect(0, 32, 36, 3, C.brownLight);
    // goo on the sill and oozing down the wall
    px.rect(4, 31, 28, 3, C.goo);
    px.ellipse(10, 34, 6, 3, C.goo);
    px.ellipse(24, 35, 7, 3, C.goo);
    px.rect(7, 34, 3, 7, C.goo);
    px.disc(8.5, 41, 2, C.goo);
    px.rect(27, 35, 2, 5, C.goo);
    px.disc(27.5, 40, 1.6, C.goo);
    px.rect(17, 35, 2, 9, C.goo);
    px.disc(17.5, 44, 1.5, C.goo);
    // shine + googly eyes in the goo
    px.set(5, 32, C.gooShine);
    px.set(22, 34, C.gooShine);
    px.set(8, 38, C.gooShine);
    px.rect(11, 33, 2, 2, C.white);
    px.rect(14, 33, 2, 2, C.white);
    px.set(12, 34, C.black);
    px.set(15, 34, C.black);
    return sheet('goo_window', [px]);
}

export function gooDropSheet(): Sheet {
    const make = (stretch: number) => {
        const px = new Pixels(8, 12);
        px.disc(3.5, 8 - stretch * 0.5, 3.2, C.goo);
        for (let i = 0; i < 4 + stretch; i++) px.rect(3, 8 - stretch - i, 2, 1, C.goo);
        px.set(2, 7, C.gooShine);
        px.set(2, 8, C.gooShine);
        return px;
    };
    return sheet('goo_drop', [make(0), make(2)]);
}

export function gooPuddleSheet(): Sheet {
    const make = (eyesOpen: boolean) => {
        const px = new Pixels(20, 8);
        px.ellipse(9.5, 5.5, 9.5, 3, C.goo);
        px.ellipse(9.5, 3.5, 5, 3, C.goo);
        px.set(5, 3, C.gooShine);
        px.set(6, 3, C.gooShine);
        if (eyesOpen) {
            px.rect(8, 2, 2, 2, C.white);
            px.rect(11, 2, 2, 2, C.white);
            px.set(9, 3, C.black);
            px.set(12, 3, C.black);
        } else {
            px.rect(8, 3, 2, 1, C.gooShine);
            px.rect(11, 3, 2, 1, C.gooShine);
        }
        return px;
    };
    return sheet('goo_puddle', [make(true), make(false)]);
}

// ─────────────────────────────────────────────────────────────── Level 3: the giant

/** Fuzzy slipper, toe pointing right. Frame 1 is the "ouch" toes-curled pose. */
export function slipperSheet(): Sheet {
    const make = (hurt: boolean) => {
        const px = new Pixels(44, 18);
        px.rect(4, 0, 22, 12, C.red);
        px.ellipse(26, 11, 17, 6, C.red);
        px.rect(2, 14, 40, 3, C.redDark);
        px.outline(C.ink);
        // fuzzy cuff + pom
        px.rect(3, 0, 24, 3, C.white);
        for (let x = 3; x < 27; x += 3) px.set(x, 3, C.white);
        px.disc(36, 7, 3, C.white);
        // plaid stripes
        for (let x = 8; x < 40; x += 6) px.rect(x, 5, 1, 9, C.redDark);
        px.rect(5, 9, 34, 1, C.redDark);
        if (hurt) {
            px.disc(36, 7, 3, C.yellow);
            px.rect(34, 6, 1, 1, C.black);
            px.rect(37, 6, 1, 1, C.black);
        }
        return px;
    };
    return sheet('slipper', [make(false), make(true)]);
}

export function legSheet(): Sheet {
    const px = new Pixels(22, 16);
    px.rect(0, 0, 22, 16, C.blue);
    px.rect(0, 0, 2, 16, C.blueDark);
    px.rect(20, 0, 2, 16, C.blueDark);
    px.rect(15, 0, 1, 16, C.blueDark);
    px.rect(4, 0, 1, 16, C.blueLight);
    px.set(8, 5, C.blueDark);
    px.set(11, 12, C.blueDark);
    return sheet('leg', [px]);
}

export function trapSheet(): Sheet {
    const make = (snapped: boolean) => {
        const px = new Pixels(18, 11);
        px.rect(1, 6, 16, 3, C.brownLight);
        px.rect(1, 9, 16, 1, C.brown);
        if (snapped) {
            px.rect(2, 4, 13, 2, C.silver);
            px.rect(14, 3, 2, 3, C.silver);
        } else {
            px.rect(3, 0, 1, 6, C.silver);
            px.rect(8, 0, 1, 6, C.silver);
            px.rect(3, 0, 6, 1, C.silver);
            px.rect(12, 3, 4, 3, C.yellow);
        }
        px.outline(C.ink);
        px.rect(4, 6, 4, 1, C.steel);
        if (!snapped) px.set(13, 4, C.yellowDark);
        return px;
    };
    return sheet('trap', [make(false), make(true)]);
}

export function trapBoxSheet(): Sheet {
    const px = new Pixels(24, 18);
    px.rect(0, 2, 24, 16, C.brownLight);
    px.rect(0, 2, 24, 2, C.tan);
    for (const y of [8, 13]) px.rect(0, y, 24, 1, C.brown);
    px.rect(1, 2, 2, 16, C.brown);
    px.rect(21, 2, 2, 16, C.brown);
    px.outline(C.ink);
    // painted trap label
    px.rect(6, 9, 12, 3, C.white);
    px.rect(7, 6, 1, 3, C.white);
    px.rect(11, 6, 1, 3, C.white);
    px.rect(7, 6, 5, 1, C.white);
    px.rect(14, 7, 3, 2, C.yellow);
    return sheet('trap_box', [px]);
}

// Hiding spots ──────────────────────────────────────────────

export function mouseHouseSheet(): Sheet {
    const px = new Pixels(34, 32);
    // roof
    for (let i = 0; i < 12; i++) px.rect(16 - i - 1, i + 1, 2 * i + 4, 1, C.red);
    px.rect(25, 2, 4, 8, C.brownLight); // chimney
    px.rect(3, 13, 28, 19, C.tan);
    px.outline(C.ink);
    for (let i = 2; i < 12; i += 3) px.rect(16 - i, i + 1, 2 * i + 2, 1, C.redDark);
    // round door
    for (let y = 18; y < 32; y++) {
        for (let x = 10; x < 24; x++) {
            if (y >= 24 || (x - 16.5) ** 2 + (y - 24) ** 2 <= 36) px.set(x, y, C.black);
        }
    }
    // window + heart
    px.rect(25, 17, 4, 4, C.yellow);
    px.rect(26, 18, 2, 2, C.yellowLight);
    px.set(5, 18, C.pink); px.set(7, 18, C.pink);
    px.rect(5, 19, 3, 1, C.pink); px.set(6, 20, C.pink);
    return sheet('hide_house', [px]);
}

export function bedSheet(): Sheet {
    const px = new Pixels(80, 44);
    // headboard
    px.rect(0, 0, 8, 44, C.brown);
    px.rect(72, 14, 8, 30, C.brown);
    px.rect(8, 16, 64, 8, C.white);       // mattress
    px.ellipse(18, 14, 8, 4, C.white);    // pillow
    px.rect(26, 12, 46, 6, C.blue);       // blanket
    px.rect(24, 16, 49, 16, C.blue);      // drooping blanket
    px.outline(C.ink);
    // dark gap under the bed (the hiding spot)
    px.rect(8, 32, 64, 12, C.black);
    px.rect(8, 41, 64, 3, C.purpleDark);
    // quilt pattern
    for (let x = 30; x < 72; x += 8) {
        px.rect(x, 18, 1, 13, C.blueDark);
    }
    px.rect(24, 24, 49, 1, C.blueDark);
    px.rect(0, 0, 8, 2, C.brownLight);
    px.disc(4, 6, 2, C.brownLight);
    // sleeping teddy peeking from the blanket
    px.disc(18, 10, 3, C.tan);
    px.set(16, 7, C.tan); px.set(20, 7, C.tan);
    px.set(17, 10, C.black); px.set(19, 10, C.black);
    return sheet('hide_bed', [px]);
}

export function dresserSheet(): Sheet {
    const px = new Pixels(44, 56);
    px.rect(0, 0, 44, 52, C.brownLight);
    px.rect(2, 52, 4, 4, C.brown);
    px.rect(38, 52, 4, 4, C.brown);
    px.outline(C.ink);
    px.rect(0, 0, 44, 3, C.tan);
    for (const y of [6, 20]) {
        px.rect(3, y, 38, 12, C.brown);
        px.rect(4, y + 1, 36, 10, C.brownLight);
        px.rect(20, y + 5, 4, 2, C.yellow);
    }
    // bottom drawer pulled open — dark inside
    px.rect(1, 34, 42, 16, C.brownDark);
    px.rect(3, 36, 38, 9, C.black);
    px.rect(1, 45, 42, 5, C.brown);
    px.rect(20, 46, 4, 2, C.yellow);
    // a sock poking out
    px.rect(32, 34, 4, 5, C.white);
    px.rect(32, 36, 4, 1, C.red);
    return sheet('hide_dresser', [px]);
}

export function lockerSheet(): Sheet {
    const px = new Pixels(28, 58);
    px.rect(0, 0, 28, 58, C.steel);
    px.outline(C.ink);
    px.rect(1, 1, 26, 2, C.silver);
    px.rect(2, 4, 24, 52, '#6a6a80');
    px.rect(2, 4, 1, 52, C.silver);
    for (let y = 9; y < 21; y += 3) px.rect(6, y, 16, 1, C.ink);
    px.rect(20, 28, 2, 7, C.yellow);
    // door left ajar at the bottom: a dark gap
    px.rect(3, 40, 22, 16, C.black);
    px.rect(3, 40, 22, 1, C.ink);
    // number 13 for spookiness
    px.rect(8, 24, 1, 5, C.white);
    px.rect(10, 24, 3, 1, C.white);
    px.rect(12, 24, 1, 5, C.white);
    px.rect(10, 26, 3, 1, C.white);
    px.rect(10, 28, 3, 1, C.white);
    return sheet('hide_locker', [px]);
}

export function peekSheet(): Sheet {
    const open = new Pixels(10, 4);
    open.rect(0, 0, 4, 4, C.white);
    open.rect(6, 0, 4, 4, C.white);
    open.rect(2, 1, 2, 2, C.black);
    open.rect(8, 1, 2, 2, C.black);
    const blink = new Pixels(10, 4);
    blink.rect(0, 2, 4, 1, C.white);
    blink.rect(6, 2, 4, 1, C.white);
    return sheet('peek', [open, blink]);
}

// ─────────────────────────────────────────────────────────────── Decorations

export function batSheet(): Sheet {
    const up = rows([
        'k......kk......k',
        'kU....kUUk....Uk',
        '.kUU.kUUUUk.UUk.',
        '..kUUUrUUrUUUk..',
        '...kUUUUUUUUk...',
        '......kwwk......',
        '................',
        '................',
    ]);
    const down = rows([
        '................',
        '.......kk.......',
        '......kUUk......',
        '...kkkrUUrkkk...',
        '..kUUUUUUUUUUk..',
        '.kUU..kwwk..UUk.',
        'kU............Uk',
        'k..............k',
    ]);
    return sheet('bat', [up, down]);
}

export function cobwebSheet(): Sheet {
    const px = new Pixels(24, 24);
    for (let i = 0; i < 4; i++) {
        const a = (i / 3) * (Math.PI / 2);
        px.line(0, 0, Math.cos(a) * 23, Math.sin(a) * 23, C.greyDark);
    }
    for (const r of [7, 13, 19]) {
        for (let s = 0; s <= 20; s++) {
            const a = (s / 20) * (Math.PI / 2);
            px.set(Math.cos(a) * r, Math.sin(a) * r, C.greyDark);
        }
    }
    px.rect(14, 15, 3, 3, C.ink);
    px.set(13, 14, C.ink); px.set(17, 14, C.ink); px.set(13, 18, C.ink); px.set(17, 18, C.ink);
    px.set(15, 16, C.red);
    return sheet('cobweb', [px]);
}

export function portraitSheet(): Sheet {
    const px = new Pixels(26, 32);
    px.rect(0, 0, 26, 32, C.yellowDark);
    px.rect(2, 2, 22, 28, '#2b1b2e');
    px.rect(1, 1, 24, 1, C.yellow);
    // a spooky grandma silhouette with blank eye holes (pupils added in-game)
    px.disc(13, 12, 6, '#4a3350');
    px.disc(13, 7, 4, '#4a3350');
    px.ellipse(13, 27, 9, 6, '#4a3350');
    px.rect(9, 11, 3, 2, C.white);
    px.rect(14, 11, 3, 2, C.white);
    return sheet('portrait', [px]);
}

export function candleSheet(): Sheet {
    const make = (lean: number) => {
        const px = new Pixels(8, 16);
        px.rect(2, 7, 4, 8, C.moon);
        px.rect(1, 15, 6, 1, C.steel);
        px.rect(2, 7, 1, 8, C.white);
        px.ellipse(3.5 + lean, 3.5, 1.8, 3, C.orange);
        px.ellipse(3.5 + lean, 4.5, 1, 1.6, C.yellowLight);
        px.set(3, 6, C.ink);
        return px;
    };
    return sheet('candle', [make(0), make(1)]);
}

export function moonSheet(): Sheet {
    const px = new Pixels(28, 28);
    px.disc(13.5, 13.5, 12, C.moon);
    px.disc(9, 10, 2.5, '#e8dcbc');
    px.disc(17, 17, 3, '#e8dcbc');
    px.disc(17, 8, 1.5, '#e8dcbc');
    return sheet('moon', [px]);
}

export function houseSheet(): Sheet {
    const px = new Pixels(120, 96);
    const sil = C.purpleDark;
    px.rect(18, 40, 84, 56, sil);
    for (let i = 0; i < 28; i++) px.rect(14 + i, 40 - i, 92 - 2 * i, 1, sil);
    px.rect(80, 6, 14, 40, sil);                 // tower
    for (let i = 0; i < 10; i++) px.rect(79 + i, 6 - Math.floor(i / 1.4), 16 - 2 * i, 1, sil);
    px.rect(30, 4, 6, 20, sil);                   // chimney
    // lit windows
    for (const [x, y] of [[30, 52], [52, 52], [74, 52], [84, 18], [52, 28]]) {
        px.rect(x, y, 10, 12, C.yellow);
        px.rect(x + 4, y, 2, 12, sil);
        px.rect(x, y + 5, 10, 2, sil);
    }
    px.rect(56, 76, 10, 20, C.black);             // door
    px.disc(61, 76, 5, C.black);
    return sheet('house', [px]);
}

export function starSheet(): Sheet {
    const a = rows([
        '...y...',
        '...y...',
        '.yyhyy.',
        'yyhhhyy',
        '.yyhyy.',
        '..y.y..',
        '.y...y.',
    ]);
    const b = rows([
        '.......',
        '...y...',
        '..yhy..',
        '.yhhhy.',
        '..yhy..',
        '...y...',
        '.......',
    ]);
    return sheet('star', [a, b]);
}

export function heartSheet(): Sheet {
    const full = rows([
        '.kk.kk.',
        'krrkrrk',
        'krwrrrk',
        'krrrrrk',
        '.krrrk.',
        '..krk..',
        '...k...',
    ]);
    const empty = rows([
        '.kk.kk.',
        'kuukuuk',
        'kuuuuuk',
        'kuuuuuk',
        '.kuuuk.',
        '..kuk..',
        '...k...',
    ]);
    return sheet('heart', [full, empty]);
}

// ─────────────────────────────────────────────────────────────── UI icons

function arrowRight(): Pixels {
    const px = new Pixels(14, 14);
    px.rect(1, 5, 6, 4, C.white);
    for (let i = 0; i < 6; i++) px.rect(7 + i, 1 + i, 1, 12 - 2 * i, C.white);
    px.outline(C.ink);
    return px;
}

function rotate90(src: Pixels): Pixels {
    const out = new Pixels(src.h, src.w);
    for (let y = 0; y < src.h; y++) {
        for (let x = 0; x < src.w; x++) {
            const i = (y * src.w + x) * 4;
            const nx = src.h - 1 - y, ny = x;
            const j = (ny * out.w + nx) * 4;
            out.data.set(src.data.subarray(i, i + 4), j);
        }
    }
    return out;
}

/** Frames: 0 right, 1 down, 2 left, 3 up, 4 sound on, 5 sound off, 6 fullscreen, 7 hand */
export function iconSheet(): Sheet {
    const right = arrowRight();
    const down = rotate90(right);
    const left = rotate90(down);
    const up = rotate90(left);

    const speaker = (on: boolean) => {
        const px = new Pixels(14, 14);
        px.rect(1, 5, 3, 4, C.white);
        for (let i = 0; i < 4; i++) px.rect(4 + i, 4 - i, 1, 6 + 2 * i, C.white);
        if (on) {
            px.rect(10, 5, 1, 4, C.white);
            px.rect(12, 3, 1, 8, C.white);
        } else {
            px.line(9, 4, 13, 9, C.red);
            px.line(9, 9, 13, 4, C.red);
        }
        px.outline(C.ink);
        return px;
    };

    const full = new Pixels(14, 14);
    for (const [x, y, dx, dy] of [[1, 1, 1, 1], [12, 1, -1, 1], [1, 12, 1, -1], [12, 12, -1, -1]]) {
        full.rect(Math.min(x, x + dx * 3), y, 4, 1, C.white);
        full.rect(x, Math.min(y, y + dy * 3), 1, 4, C.white);
    }
    full.outline(C.ink);

    const hand = rows([
        '..............',
        '.....kk.......',
        '....kwwk......',
        '....kwwkkk....',
        '....kwwkwwkk..',
        '.kk.kwwkwwkwk.',
        'kwwkkwwwwwwwwk',
        'kwwwkwwwwwwwwk',
        '.kwwwwwwwwwwwk',
        '..kwwwwwwwwwk.',
        '...kwwwwwwwk..',
        '....kwwwwwk...',
        '....kkkkkkk...',
        '..............',
    ]);

    return sheet('icons', [right, down, left, up, speaker(true), speaker(false), full, hand]);
}

/** Every sheet in the game, in one list for the texture builder and exporter. */
export function allSheets(): Sheet[] {
    return [
        mouseSheet(), tilesSheet(), wallpaperSheet(), cheeseSheet(), exitSheet(), keySheet(),
        catRunSheet(), catScareSheet(), pitEyesSheet(),
        fanStandSheet(), fanBladesSheet(), fanCageSheet(), windSheet(),
        gooWindowSheet(), gooDropSheet(), gooPuddleSheet(),
        slipperSheet(), legSheet(), trapSheet(), trapBoxSheet(),
        mouseHouseSheet(), bedSheet(), dresserSheet(), lockerSheet(), peekSheet(),
        batSheet(), cobwebSheet(), portraitSheet(), candleSheet(), moonSheet(), houseSheet(),
        starSheet(), heartSheet(), iconSheet(),
        ...newSheets(),
    ];
}
