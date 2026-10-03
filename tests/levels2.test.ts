import { describe, expect, it } from 'vitest';
import { canReach, canStand, LevelMapData, markerOf, markersOf, parseLevel, reachable, ReachOptions } from '../src/levels/LevelMap';
import { LEVEL4_MAP } from '../src/levels/level4';
import { LEVEL5_MAP } from '../src/levels/level5';
import { LEVEL6_MAP } from '../src/levels/level6';
import { LEVEL7_MAP } from '../src/levels/level7';
import { LEVEL8_MAP } from '../src/levels/level8';
import { LEVEL9_MAP } from '../src/levels/level9';
import { LEVEL10_MAP } from '../src/levels/level10';

const at = (m: { col: number; row: number }): [number, number] => [m.col, m.row];

/** Replace cells in a map (used to model moving things like the train or duck). */
function patch(rows: string[], cells: [number, number, string][]) {
    const out = rows.map((r) => r.split(''));
    for (const [c, r, ch] of cells) out[r][c] = ch;
    return out.map((r) => r.join(''));
}

function expectAllReachable(map: LevelMapData, from: [number, number], chars: string[], opts: ReachOptions = {}) {
    const r = reachable(map, from, opts);
    for (const ch of chars) {
        const ms = markersOf(map, ch);
        expect(ms.length, `marker ${ch} exists`).toBeGreaterThan(0);
        for (const m of ms) expect(r.has(`${m.col},${m.row}`), `${ch} at ${m.col},${m.row} reachable`).toBe(true);
    }
}

const springsOf = (map: LevelMapData, ch: string) => markersOf(map, ch).map(at);

describe('Level 4 — Toy Box Trouble', () => {
    // the train's roof is level with the floor while it shuttles over the gap
    const t = parseLevel(LEVEL4_MAP);
    const train = markerOf(t, 'T');
    const cells: [number, number, string][] = [];
    for (let c = train.col; c < t.width && t.cells[train.row + 1][c] === 'empty'; c++) cells.push([c, train.row + 1, '=']);
    const map = parseLevel(patch(LEVEL4_MAP, cells));
    const opts = { springs: springsOf(map, 'J'), springUp: 9 };

    it('has 4 batteries, springs, robots and a train', () => {
        expect(markersOf(map, 'b').length).toBe(4);
        expect(markersOf(map, 'J').length).toBeGreaterThanOrEqual(2);
        expect(markersOf(map, 'r').length).toBeGreaterThanOrEqual(2);
        expect(cells.length).toBeGreaterThan(10);
    });
    it('every battery and the rocket can be reached', () => {
        expectAllReachable(map, at(markerOf(map, 'P')), ['b', 'X'], opts);
    });
    it('the high batteries need the springs', () => {
        const r = reachable(map, at(markerOf(map, 'P')));
        const high = markersOf(map, 'b').filter((b) => !r.has(`${b.col},${b.row}`));
        expect(high.length).toBeGreaterThanOrEqual(1);
    });
});

describe('Level 5 — Bath Time Flood', () => {
    const t = parseLevel(LEVEL5_MAP);
    const duck = markerOf(t, 'D');
    // the duck rises with the water: model its path as a ladder up to the next shelf
    const cells: [number, number, string][] = [];
    for (let r = duck.row; r >= 0 && t.cells[r][duck.col] === 'empty'; r--) cells.push([duck.col, r, 'H']);
    const map = parseLevel(patch(LEVEL5_MAP, cells));
    it('the window can be reached from the bottom of the tub', () => {
        expectAllReachable(map, at(markerOf(map, 'P')), ['X']);
    });
    it('the duck is required (it bridges a gap you cannot jump)', () => {
        expect(canReach(t, at(markerOf(t, 'P')), at(markerOf(t, 'X')))).toBe(false);
        expect(canStand(t, duck.col, duck.row)).toBe(true);
    });
});

describe('Level 6 — The Ghost Kitchen', () => {
    const map = parseLevel(LEVEL6_MAP);
    it('there and back again: start -> big cheese -> home', () => {
        expect(canReach(map, at(markerOf(map, 'P')), at(markerOf(map, 'C')))).toBe(true);
        expect(canReach(map, at(markerOf(map, 'C')), at(markerOf(map, 'X')))).toBe(true);
    });
    it('has ghosts and stove burners on counters', () => {
        expect(markersOf(map, 'G').length).toBeGreaterThanOrEqual(3);
        for (const b of markersOf(map, 'B')) expect(map.cells[b.row + 1][b.col]).toBe('solid');
    });
});

describe('Level 7 — Lights Out', () => {
    const map = parseLevel(LEVEL7_MAP);
    const start = at(markerOf(map, 'P'));
    it('fuse box, every firefly, and then the exit can be reached', () => {
        expectAllReachable(map, start, ['Z', 'f']);
        expect(canReach(map, at(markerOf(map, 'Z')), at(markerOf(map, 'X')))).toBe(true);
    });
    it('paw holes sit next to a wall', () => {
        for (const w of markersOf(map, 'w')) {
            expect(map.cells[w.row][w.col - 1] === 'solid' || map.cells[w.row][w.col + 1] === 'solid').toBe(true);
        }
    });
});

describe('Level 8 — Spider Attic', () => {
    const map = parseLevel(LEVEL8_MAP);
    const opts = { springs: springsOf(map, 'J'), springUp: 10 };
    it('all 3 baby mice and the exit can be reached', () => {
        expect(markersOf(map, 'm').length).toBe(3);
        expectAllReachable(map, at(markerOf(map, 'P')), ['m', 'X'], opts);
    });
});

describe('Level 9 — The Haunted Library', () => {
    const map = parseLevel(LEVEL9_MAP);
    it('all 3 pages and the exit can be reached', () => {
        expect(markersOf(map, 'p').length).toBe(3);
        expectAllReachable(map, at(markerOf(map, 'P')), ['p', 'X']);
    });
    it('has ghost librarians up high', () => {
        const g = markersOf(map, 'g');
        expect(g.length).toBeGreaterThanOrEqual(3);
        for (const m of g) expect(m.row).toBeLessThan(6);
    });
    it('book stacks to hide behind stand on the floor', () => {
        for (const c of markersOf(map, 'c')) expect(canStand(map, c.col, c.row)).toBe(true);
    });
});

describe('Level 10 — Bell the Cat', () => {
    const map = parseLevel(LEVEL10_MAP);
    it('yarn basket, hiding hole and door are reachable', () => {
        expectAllReachable(map, at(markerOf(map, 'P')), ['Y', 'h', 'X', 'K']);
    });
    it('there are safe shelves above the cat on both sides', () => {
        const shelves = map.cells[9].filter((c) => c === 'shelf').length;
        expect(shelves).toBeGreaterThan(10);
    });
});
