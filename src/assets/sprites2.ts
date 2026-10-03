// Pixel art for levels 4-10. Same approach as sprites.ts: everything is drawn
// in code with the shared palette, so it can be exported to PNG.

import { Pixels, Sheet, sheet } from './pixels';
import { C } from './palette';

// ─────────────────────────────────────────────────────────────── 4: Toy room

/** Jack-in-the-box. Frame 0 closed, frame 1 popped open (a spring). */
export function jackSheet(): Sheet {
    const box = (px: Pixels) => {
        px.rect(2, 18, 20, 14, C.red);
        for (let x = 2; x < 22; x += 5) px.rect(x, 18, 2, 14, C.yellow);
        px.rect(22, 22, 2, 2, C.steel); // crank
        px.rect(23, 20, 1, 3, C.steel);
    };
    const closed = new Pixels(26, 40);
    box(closed);
    closed.rect(1, 15, 22, 3, C.blue);
    closed.outline(C.ink);

    const open = new Pixels(26, 40);
    box(open);
    // zig-zag spring
    for (let i = 0; i < 6; i++) open.rect(i % 2 ? 8 : 12, 12 + i * 1, 5, 1, C.silver);
    // clown head with a cheeky grin
    open.disc(12, 7, 6, C.white);
    open.rect(6, 0, 12, 3, C.purple);
    open.rect(10, 0, 4, 1, C.yellow);
    open.rect(1, 17, 3, 2, C.blue); // lid flipped back
    open.outline(C.ink);
    open.set(10, 6, C.black); open.set(14, 6, C.black);
    open.rect(11, 8, 2, 2, C.red);
    open.rect(9, 10, 7, 1, C.redDark);
    open.set(4, 7, C.pink); open.set(19, 7, C.pink);
    return sheet('jack', [closed, open]);
}

export function batterySheet(): Sheet {
    const make = (glow: boolean) => {
        const px = new Pixels(12, 18);
        px.rect(4, 0, 4, 2, C.silver);
        px.rect(1, 2, 10, 15, glow ? C.green : C.greenDark);
        px.rect(1, 2, 10, 4, C.ink);
        px.outline(C.ink);
        px.rect(5, 9, 2, 6, C.white);
        px.rect(3, 11, 6, 2, C.white);
        if (glow) px.rect(2, 7, 1, 9, '#b6ffb6');
        return px;
    };
    return sheet('battery', [make(false), make(true)]);
}

/** The toy rocket. Frame 0 idle, 1-2 blasting off. */
export function rocketSheet(): Sheet {
    const make = (flame: number) => {
        const px = new Pixels(36, 64);
        px.ellipse(18, 26, 9, 22, C.white);
        px.rect(9, 26, 18, 20, C.white);
        for (let i = 0; i < 10; i++) px.rect(18 - i, 4 + i, 2 * i + 1, 1, C.red); // nose cone
        px.rect(4, 36, 6, 12, C.red);  // fins
        px.rect(26, 36, 6, 12, C.red);
        px.rect(13, 44, 10, 4, C.steel);
        if (flame > 0) {
            px.ellipse(18, 53 + flame, 5, 6 + flame, C.orange);
            px.ellipse(18, 52 + flame, 3, 4, C.yellow);
        }
        px.outline(C.ink);
        px.disc(18, 22, 4, C.cyan);
        px.disc(17, 21, 1.5, C.white);
        px.rect(9, 32, 18, 2, C.red);
        return px;
    };
    return sheet('rocket', [make(0), make(1), make(3)]);
}

export function robotSheet(): Sheet {
    const make = (step: boolean) => {
        const px = new Pixels(20, 16);
        px.ellipse(9, 9, 8, 5, C.steel);
        px.disc(15, 7, 4, C.steel);
        px.rect(13, 1, 3, 3, C.steel);       // ear
        px.rect(3, 2, 2, 4, C.yellowDark);   // wind-up key
        px.rect(1, 1, 6, 2, C.yellowDark);
        px.rect(4 + (step ? 1 : 0), 13, 3, 3, C.greyDark);
        px.rect(12 - (step ? 1 : 0), 13, 3, 3, C.greyDark);
        px.outline(C.ink);
        px.rect(16, 6, 2, 2, C.red);
        px.set(19, 9, C.ink);
        px.rect(5, 8, 7, 1, C.silver);
        return px;
    };
    return sheet('robot', [make(false), make(true)]);
}

/** Toy train engine: a ride-on platform. */
export function trainSheet(): Sheet {
    const make = (f: number) => {
        const px = new Pixels(72, 28);
        px.rect(2, 6, 68, 4, C.red);        // flat roof (the platform)
        px.rect(2, 10, 30, 12, C.blue);     // cab
        px.rect(32, 12, 36, 10, C.green);   // boiler
        px.rect(60, 0, 6, 12, C.steel);     // chimney
        px.rect(66, 18, 5, 4, C.yellow);    // cow catcher
        for (const wx of [12, 30, 48, 62]) px.disc(wx, 23, 4, C.ink);
        px.outline(C.ink);
        px.rect(8, 12, 8, 6, C.cyan);       // window
        for (const wx of [12, 30, 48, 62]) {
            px.disc(wx, 23, 2.5, C.red);
            const a = (f * Math.PI) / 2;
            px.set(wx + Math.round(Math.cos(a) * 2), 23 + Math.round(Math.sin(a) * 2), C.white);
        }
        px.rect(2, 6, 68, 1, '#ff7a7a');
        return px;
    };
    return sheet('train', [make(0), make(1), make(2), make(3)]);
}

// ─────────────────────────────────────────────────────────────── 5: Bath

export function duckSheet(): Sheet {
    const make = (blink: boolean) => {
        const px = new Pixels(34, 24);
        px.ellipse(15, 16, 14, 7, C.yellow);   // body
        px.disc(25, 8, 6, C.yellow);           // head
        px.rect(1, 9, 6, 6, C.yellow);         // tail
        px.outline(C.ink);
        px.rect(30, 9, 4, 3, C.orange);        // beak
        px.rect(30, 12, 3, 1, C.yellowDark);
        if (blink) px.rect(25, 7, 3, 1, C.ink);
        else { px.rect(25, 6, 2, 2, C.ink); px.set(25, 6, C.white); }
        px.ellipse(14, 15, 6, 3, C.yellowDark); // wing
        px.ellipse(14, 14, 6, 2, C.yellow);
        px.rect(5, 12, 20, 1, C.yellowLight);
        return px;
    };
    return sheet('duck', [make(false), make(true)]);
}

export function bubbleSheet(): Sheet {
    const b = new Pixels(16, 16);
    b.ring(7.5, 7.5, 7, 1, C.cyan);
    b.rect(4, 4, 2, 2, C.white);
    b.set(10, 11, C.cyan);
    const pop = new Pixels(16, 16);
    for (const [x, y] of [[1, 7], [13, 7], [7, 1], [7, 13], [3, 3], [11, 11], [11, 3], [3, 11]]) pop.rect(x, y, 2, 2, C.cyan);
    return sheet('bubble', [b, pop]);
}

export function waveSheet(): Sheet {
    const px = new Pixels(32, 6);
    for (let x = 0; x < 32; x++) {
        const y = Math.round(2 + Math.sin((x / 32) * Math.PI * 2) * 1.5);
        px.rect(x, y, 1, 6 - y, '#6fc6ff');
        px.set(x, y, C.white);
    }
    return sheet('wave', [px]);
}

export function faucetSheet(): Sheet {
    const px = new Pixels(40, 26);
    px.rect(0, 4, 30, 8, C.silver);
    px.rect(22, 4, 8, 20, C.silver);
    px.rect(6, 0, 10, 4, C.steel);
    px.disc(11, 1, 3, C.red);
    px.outline(C.ink);
    px.rect(1, 5, 28, 2, C.white);
    return sheet('faucet', [px]);
}

// ─────────────────────────────────────────────────────────────── 6: Kitchen

/** Shy ghost. Frame 0 chasing (tongue out), frame 1 shy (hiding its eyes). */
export function ghostSheet(): Sheet {
    const body = () => {
        const px = new Pixels(28, 30);
        px.disc(14, 12, 11, C.white);
        px.rect(3, 12, 22, 12, C.white);
        for (let i = 0; i < 4; i++) px.disc(5.5 + i * 5.7, 24, 3, C.white); // wavy hem
        return px;
    };
    const chase = body();
    chase.rect(0, 14, 4, 4, C.white);   // arms out
    chase.rect(24, 14, 4, 4, C.white);
    chase.outline('#7a6aa8');
    chase.ellipse(9, 11, 2.5, 3.5, C.ink);
    chase.ellipse(19, 11, 2.5, 3.5, C.ink);
    chase.set(9, 10, C.white); chase.set(19, 10, C.white);
    chase.ellipse(14, 19, 4, 3, C.ink);
    chase.rect(13, 20, 4, 3, C.pink);
    chase.rect(3, 18, 22, 1, '#e2dcf2');

    const shy = body();
    shy.outline('#7a6aa8');
    shy.rect(5, 9, 7, 5, '#e2dcf2');    // hands over eyes
    shy.rect(16, 9, 7, 5, '#e2dcf2');
    shy.rect(5, 9, 7, 1, '#7a6aa8');
    shy.rect(16, 9, 7, 1, '#7a6aa8');
    shy.rect(4, 15, 3, 2, C.pink);      // blushing
    shy.rect(21, 15, 3, 2, C.pink);
    shy.rect(12, 18, 4, 1, C.ink);
    return sheet('ghost', [chase, shy]);
}

export function burnerSheet(): Sheet {
    const px = new Pixels(32, 6);
    px.rect(0, 2, 32, 4, C.ink);
    px.rect(2, 0, 28, 2, C.greyDark);
    for (let x = 4; x < 30; x += 4) px.rect(x, 0, 1, 2, C.ink);
    return sheet('burner', [px]);
}

export function flameSheet(): Sheet {
    const make = (lean: number) => {
        const px = new Pixels(28, 22);
        for (let i = 0; i < 4; i++) {
            const x = 4 + i * 6 + (i % 2 ? lean : -lean);
            px.ellipse(x, 14, 3.5, 8, C.orange);
            px.ellipse(x, 16, 2, 5, C.yellow);
        }
        px.rect(1, 20, 26, 2, C.blue);
        return px;
    };
    return sheet('flame', [make(0), make(1)]);
}

export function bigCheeseSheet(): Sheet {
    const px = new Pixels(30, 22);
    for (let y = 0; y < 22; y++) {
        const w = Math.min(30, 8 + y * 2);
        px.rect(30 - w, y, w, 1, C.yellow);
    }
    px.outline(C.ink);
    px.rect(1, 17, 28, 4, C.yellowDark);
    for (const [x, y, r] of [[18, 9, 2], [24, 13, 1.6], [12, 14, 2], [26, 5, 1.2]]) px.disc(x, y, r, C.yellowDark);
    px.rect(20, 2, 4, 1, C.yellowLight);
    return sheet('big_cheese', [px]);
}

export function potSheet(): Sheet {
    const px = new Pixels(28, 20);
    px.rect(3, 6, 22, 14, C.steel);
    px.rect(0, 8, 3, 2, C.steel);
    px.rect(25, 8, 3, 2, C.steel);
    px.rect(2, 4, 24, 3, C.greyDark);
    px.rect(12, 1, 4, 3, C.greyDark);
    px.outline(C.ink);
    px.rect(5, 8, 2, 10, C.silver);
    return sheet('pot', [px]);
}

// ─────────────────────────────────────────────────────────────── 7: Lights out

export function fireflySheet(): Sheet {
    const make = (bright: boolean) => {
        const px = new Pixels(8, 8);
        px.disc(3.5, 4, bright ? 3 : 2, bright ? C.yellowLight : C.yellow);
        px.set(3, 1, C.ink); px.set(4, 1, C.ink);
        px.set(1, 2, C.cyan); px.set(6, 2, C.cyan);
        return px;
    };
    return sheet('firefly', [make(false), make(true)]);
}

/** Fuse box. Frame 0 off (red light), frame 1 on (green light). */
export function fuseSheet(): Sheet {
    const make = (on: boolean) => {
        const px = new Pixels(22, 30);
        px.rect(0, 0, 22, 30, C.steel);
        px.outline(C.ink);
        px.rect(2, 2, 18, 26, C.greyDark);
        px.rect(4, 4, 4, 4, on ? C.green : C.red);
        // lightning bolt sign
        px.line(14, 3, 11, 8, C.yellow); px.line(11, 8, 15, 8, C.yellow); px.line(15, 8, 12, 13, C.yellow);
        // big lever
        px.rect(9, 15, 4, 12, C.ink);
        const ly = on ? 15 : 22;
        px.rect(5, ly, 12, 4, C.red);
        px.rect(6, ly, 10, 1, '#ff7a7a');
        return px;
    };
    return sheet('fuse', [make(false), make(true)]);
}

export function wallHoleSheet(): Sheet {
    const make = (eyes: boolean) => {
        const px = new Pixels(22, 18);
        px.ellipse(11, 12, 10, 9, C.black);
        px.rect(1, 12, 20, 6, C.black);
        if (eyes) {
            px.ellipse(7, 10, 2, 1.5, C.yellow);
            px.ellipse(15, 10, 2, 1.5, C.yellow);
            px.rect(7, 9, 1, 3, C.black);
            px.rect(15, 9, 1, 3, C.black);
        }
        return px;
    };
    return sheet('wall_hole', [make(false), make(true)]);
}

/** Cat paw that swipes out of a hole (points right; flip for left). */
export function pawSheet(): Sheet {
    const px = new Pixels(40, 14);
    px.rect(0, 3, 30, 8, C.purple);
    px.disc(31, 7, 6, C.purple);
    px.outline(C.ink);
    for (const y of [3, 6, 9]) px.rect(37, y, 3, 1, C.white); // claws
    px.ellipse(31, 8, 2.5, 2, C.pink);
    for (const y of [3, 11]) px.set(34, y, C.pink);
    return sheet('paw', [px]);
}

export function mushroomSheet(): Sheet {
    const px = new Pixels(12, 12);
    px.ellipse(6, 4, 6, 4, '#4fe0d0');
    px.rect(4, 6, 4, 6, '#d8fff8');
    px.set(4, 3, C.white); px.set(8, 2, C.white);
    return sheet('mushroom', [px]);
}

// ─────────────────────────────────────────────────────────────── 8: Attic

export function webSheet(): Sheet {
    const px = new Pixels(32, 32);
    for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        px.line(15.5, 15.5, 15.5 + Math.cos(a) * 16, 15.5 + Math.sin(a) * 16, C.greyLight);
    }
    for (const r of [5, 10, 15]) {
        for (let s = 0; s < 48; s++) {
            const a = (s / 48) * Math.PI * 2;
            px.set(15.5 + Math.cos(a) * r, 15.5 + Math.sin(a) * r, C.greyLight);
        }
    }
    return sheet('web', [px]);
}

export function babyMouseSheet(): Sheet {
    const make = (wave: boolean) => {
        const px = new Pixels(14, 12);
        px.ellipse(6, 7, 5, 3.5, C.greyLight);
        px.disc(10, 5, 3, C.greyLight);
        px.disc(9, 2, 1.5, C.pink);
        if (wave) px.rect(4, 1, 1, 3, C.greyLight);
        px.outline(C.ink);
        px.set(11, 4, C.black);
        px.set(13, 6, C.pink);
        px.set(0, 9, C.pink); px.set(1, 9, C.pink);
        return px;
    };
    return sheet('baby', [make(false), make(true)]);
}

export function spiderSheet(): Sheet {
    const make = (f: number) => {
        const px = new Pixels(20, 16);
        for (let i = 0; i < 4; i++) {
            const y = 5 + i * 2 + (f && i % 2 ? 1 : 0);
            px.line(9, 7, 1, y, C.ink);
            px.line(10, 7, 18, y, C.ink);
        }
        px.disc(9.5, 7, 5, C.purple);
        px.disc(9.5, 7, 3.5, C.purpleLight);
        px.rect(6, 5, 3, 3, C.white);
        px.rect(11, 5, 3, 3, C.white);
        px.set(7, 6, C.black); px.set(12, 6, C.black);
        px.rect(8, 10, 4, 1, C.ink);
        px.set(8, 11, C.white); px.set(11, 11, C.white);
        return px;
    };
    return sheet('spider', [make(0), make(1)]);
}

/** Old mattress spring: a bouncer. Frame 0 resting, 1 squished. */
export function springSheet(): Sheet {
    const make = (squish: boolean) => {
        const px = new Pixels(26, 18);
        const h = squish ? 6 : 12;
        const top = 18 - h - 3;
        px.rect(1, top, 24, 3, C.pink);
        px.rect(1, top, 24, 1, C.white);
        for (let i = 0; i < h; i += 2) px.rect(i % 4 ? 7 : 11, top + 3 + i, 9, 1, C.silver);
        px.rect(3, 16, 20, 2, C.steel);
        return px;
    };
    return sheet('spring', [make(false), make(true)]);
}

// ─────────────────────────────────────────────────────────────── 9: Library

/** Ghost librarian with a lantern (lantern on the right). */
export function librarianSheet(): Sheet {
    const make = (f: number) => {
        const px = new Pixels(40, 40);
        px.disc(16, 10, 8, '#cfe8e0');          // head
        px.disc(16, 3, 4, '#cfe8e0');           // hair bun
        px.ellipse(16, 24, 11, 12, '#cfe8e0');  // robe
        for (let i = 0; i < 4; i++) px.disc(7 + i * 6, 35 + (i + f) % 2, 3, '#cfe8e0');
        px.rect(26, 18, 8, 3, '#cfe8e0');       // arm
        px.outline('#4a7a6a');
        px.ring(13, 10, 3, 1, C.ink);           // glasses
        px.ring(20, 10, 3, 1, C.ink);
        px.rect(15, 10, 3, 1, C.ink);
        px.set(13, 10, C.ink); px.set(20, 10, C.ink);
        px.rect(13, 15, 6, 1, '#4a7a6a');
        // lantern
        px.rect(32, 21, 1, 3, C.ink);
        px.rect(30, 24, 6, 8, C.yellowDark);
        px.rect(31, 25, 4, 6, f ? C.yellowLight : C.yellow);
        return px;
    };
    return sheet('librarian', [make(0), make(1)]);
}

export function bookStackSheet(): Sheet {
    const px = new Pixels(30, 46);
    const colors = [C.red, C.blue, C.greenDark, C.purple, C.yellowDark, C.redDark, C.blueDark];
    let y = 46;
    let i = 0;
    while (y > 0) {
        const h = 5 + (i % 3);
        const w = 24 + ((i * 5) % 7) - 3;
        const x = 3 + ((i * 3) % 4);
        px.rect(x, y - h, w, h, colors[i % colors.length]);
        px.rect(x + w - 3, y - h, 2, h, C.moon); // pages
        y -= h;
        i++;
    }
    px.outline(C.ink);
    return sheet('book_stack', [px]);
}

export function pageSheet(): Sheet {
    const make = (glow: boolean) => {
        const px = new Pixels(14, 16);
        if (glow) px.rect(0, 0, 14, 16, '#5a5020');
        px.rect(2, 1, 10, 14, C.moon);
        px.outline(C.ink);
        for (const y of [4, 7, 10]) px.rect(4, y, 6, 1, C.greyDark);
        px.rect(4, 2, 3, 1, C.yellowDark);
        if (glow) px.clear(0, 0);
        return px;
    };
    return sheet('page', [make(false), make(true)]);
}

// ─────────────────────────────────────────────────────────────── 10: Bell the Cat

/**
 * The big boss cat (faces right). Frames: 0-1 walk, 2 crouch, 3 leap, 4 playing
 * on its back, 5 sitting. The collar is drawn so bells can be added in-game.
 */
export function bossCatSheet(): Sheet {
    const W = 64, H = 44;
    const head = (px: Pixels, hx: number, hy: number, face = true) => {
        px.disc(hx, hy, 9, C.purple);
        for (let i = 0; i < 6; i++) {
            px.rect(hx - 8 + Math.floor(i / 2), hy - 14 + i, 6 - i, 1, C.purple);
            px.rect(hx + 3 + Math.ceil(i / 2), hy - 14 + i, 6 - i, 1, C.purple);
        }
        return face;
    };
    const face = (px: Pixels, hx: number, hy: number, mood: 'mean' | 'happy') => {
        if (mood === 'mean') {
            px.rect(hx - 5, hy - 3, 3, 3, C.yellow); px.rect(hx + 2, hy - 3, 3, 3, C.yellow);
            px.rect(hx - 4, hy - 3, 1, 3, C.black); px.rect(hx + 3, hy - 3, 1, 3, C.black);
            px.rect(hx - 6, hy - 4, 4, 1, C.ink); px.rect(hx + 2, hy - 4, 4, 1, C.ink);
            px.rect(hx - 4, hy + 4, 9, 1, C.black);
            for (let x = hx - 3; x < hx + 5; x += 2) px.set(x, hy + 5, C.white);
        } else {
            px.rect(hx - 5, hy - 2, 3, 1, C.ink); px.rect(hx + 2, hy - 2, 3, 1, C.ink);
            px.set(hx - 5, hy - 3, C.ink); px.set(hx + 4, hy - 3, C.ink);
            px.rect(hx - 2, hy + 4, 5, 1, C.ink);
            px.set(hx - 6, hy + 1, C.pink); px.set(hx + 6, hy + 1, C.pink);
        }
        px.rect(hx, hy + 1, 2, 2, C.pink);
        px.set(hx - 6, hy - 11, C.pink); px.set(hx + 6, hy - 11, C.pink);
    };
    const collar = (px: Pixels, x: number, y: number, w: number) => px.rect(x, y, w, 2, C.red);

    const frames: Pixels[] = [];
    // walk 1 & 2
    for (let f = 0; f < 2; f++) {
        const px = new Pixels(W, H);
        px.ellipse(28, 26, 17, 9, C.purple);
        head(px, 48, 18);
        for (let i = 0; i < 10; i++) px.rect(10 - Math.floor(i * 0.7), 22 - i, 3, 2, C.purple);
        const legs = f ? [16, 22, 34, 40] : [14, 24, 32, 42];
        legs.forEach((lx, i) => px.rect(lx, 32, 4, 10 - ((i + f) % 2) * 2, C.purple));
        px.outline(C.ink);
        face(px, 48, 18, 'mean');
        collar(px, 41, 26, 12);
        frames.push(px);
    }
    // crouch: low and wiggly, ready to pounce
    {
        const px = new Pixels(W, H);
        px.ellipse(28, 33, 18, 7, C.purple);
        head(px, 50, 30);
        for (let i = 0; i < 12; i++) px.rect(8 - Math.floor(i * 0.3), 30 - i, 3, 2, C.purple);
        for (const lx of [16, 24, 36, 44]) px.rect(lx, 38, 5, 4, C.purple);
        px.outline(C.ink);
        face(px, 50, 30, 'mean');
        collar(px, 43, 38, 12);
        frames.push(px);
    }
    // leap: stretched out
    {
        const px = new Pixels(W, H);
        px.ellipse(30, 20, 22, 7, C.purple);
        head(px, 52, 15);
        for (let i = 0; i < 10; i++) px.rect(8 - i, 20 + Math.floor(i * 0.4), 3, 2, C.purple);
        px.rect(44, 24, 12, 4, C.purple);  // front legs reaching
        px.rect(6, 22, 12, 4, C.purple);   // back legs
        px.outline(C.ink);
        face(px, 52, 15, 'mean');
        collar(px, 45, 23, 12);
        frames.push(px);
    }
    // playing on its back with paws up
    {
        const px = new Pixels(W, H);
        px.ellipse(30, 34, 18, 8, C.purple);
        px.ellipse(30, 33, 12, 5, C.purpleLight);  // tummy
        head(px, 50, 30);
        for (const lx of [18, 24, 34, 40]) px.rect(lx, 18, 4, 12, C.purple);
        px.outline(C.ink);
        face(px, 50, 30, 'happy');
        collar(px, 43, 38, 12);
        frames.push(px);
    }
    // sitting
    {
        const px = new Pixels(W, H);
        px.ellipse(32, 30, 12, 12, C.purple);
        head(px, 34, 15);
        for (let i = 0; i < 12; i++) px.rect(18 + i, 40, 2, 3, C.purple);
        px.outline(C.ink);
        face(px, 34, 15, 'mean');
        collar(px, 27, 23, 14);
        frames.push(px);
    }
    return sheet('boss_cat', frames);
}

export function yarnSheet(): Sheet {
    const px = new Pixels(14, 14);
    px.disc(6.5, 6.5, 6, C.pink);
    px.outline(C.ink);
    px.line(3, 3, 10, 10, C.pinkDark);
    px.line(2, 7, 7, 12, C.pinkDark);
    px.line(6, 2, 11, 7, C.pinkDark);
    px.set(4, 3, C.white);
    return sheet('yarn', [px]);
}

export function bellSheet(): Sheet {
    const px = new Pixels(9, 9);
    px.ellipse(4, 4, 3.5, 3.5, C.yellow);
    px.rect(1, 5, 7, 2, C.yellow);
    px.outline(C.ink);
    px.set(4, 7, C.ink);
    px.set(3, 2, C.white);
    return sheet('bell', [px]);
}

export function sunSheet(): Sheet {
    const px = new Pixels(48, 48);
    for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        px.line(23.5 + Math.cos(a) * 15, 23.5 + Math.sin(a) * 15, 23.5 + Math.cos(a) * 23, 23.5 + Math.sin(a) * 23, C.yellow);
    }
    px.disc(23.5, 23.5, 13, C.yellow);
    px.disc(23.5, 23.5, 10, C.yellowLight);
    return sheet('sun', [px]);
}

export function newSheets(): Sheet[] {
    return [
        jackSheet(), batterySheet(), rocketSheet(), robotSheet(), trainSheet(),
        duckSheet(), bubbleSheet(), waveSheet(), faucetSheet(),
        ghostSheet(), burnerSheet(), flameSheet(), bigCheeseSheet(), potSheet(),
        fireflySheet(), fuseSheet(), wallHoleSheet(), pawSheet(), mushroomSheet(),
        webSheet(), babyMouseSheet(), spiderSheet(), springSheet(),
        librarianSheet(), bookStackSheet(), pageSheet(),
        bossCatSheet(), yarnSheet(), bellSheet(), sunSheet(),
    ];
}
