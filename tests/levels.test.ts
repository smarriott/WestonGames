import { describe, expect, it } from 'vitest';
import { canReach, markerOf, markersOf, parseLevel, reachable, canStand, LevelMapData } from '../src/levels/LevelMap';
import { LEVEL1_MAP } from '../src/levels/level1';
import { LEVEL2_MAP } from '../src/levels/level2';
import { LEVEL3_MAP } from '../src/levels/level3';

const at = (m: { col: number; row: number }): [number, number] => [m.col, m.row];

function expectStandable(map: LevelMapData, ch: string) {
    for (const m of markersOf(map, ch)) {
        expect(canStand(map, m.col, m.row), `marker ${ch} at ${m.col},${m.row} should sit on ground`).toBe(true);
    }
}

describe('level maps', () => {
    it('parse with consistent widths', () => {
        for (const rows of [LEVEL1_MAP, LEVEL2_MAP, LEVEL3_MAP]) {
            expect(() => parseLevel(rows)).not.toThrow();
        }
    });

    it('rejects a ragged map', () => {
        expect(() => parseLevel(['###', '##'])).toThrow();
    });

    it('reachability model: a 6-tile gap cannot be jumped, a 3-tile gap can', () => {
        const wide = parseLevel(['P........X', '##......##']);
        expect(canReach(wide, [0, 0], [9, 0])).toBe(false);
        const narrow = parseLevel(['P....X', '##...#']);
        expect(canReach(narrow, [0, 0], [5, 0])).toBe(true);
    });

    describe('Level 1 — The Ladders', () => {
        const map = parseLevel(LEVEL1_MAP);
        const start = at(markerOf(map, 'P'));

        it('the exit can be reached from the start', () => {
            expectStandable(map, 'P');
            expectStandable(map, 'X');
            expect(canReach(map, start, at(markerOf(map, 'X')))).toBe(true);
        });

        it('every cheese can be collected', () => {
            const r = reachable(map, start);
            for (const c of markersOf(map, 'c')) expect(r.has(`${c.col},${c.row}`), `cheese ${c.col},${c.row}`).toBe(true);
        });

        it('has ladders that hang over the pit (the cat mechanic)', () => {
            const bottomRow = map.ladders.length - 1;
            const hanging = map.ladders.some((row, r) =>
                row.some((l, c) => l && r < bottomRow && !map.ladders[r + 1][c] && map.cells.slice(r + 1).every((rr) => rr[c] === 'empty')),
            );
            expect(hanging).toBe(true);
        });
    });

    describe('Level 2 — The Escape', () => {
        const map = parseLevel(LEVEL2_MAP);
        it('the exit can be reached from the start', () => {
            expectStandable(map, 'P');
            expectStandable(map, 'X');
            expect(canReach(map, at(markerOf(map, 'P')), at(markerOf(map, 'X')))).toBe(true);
        });
        it('has fans, goo windows and goo puddles', () => {
            expect(markersOf(map, 'F').length).toBeGreaterThanOrEqual(2);
            expect(markersOf(map, 'W').length).toBeGreaterThanOrEqual(3);
            expect(markersOf(map, 'g').length).toBeGreaterThanOrEqual(2);
            expectStandable(map, 'F');
            expectStandable(map, 'g');
        });
        it('every fan has a shelf route over it', () => {
            for (const f of markersOf(map, 'F')) {
                const over = [f.col - 1, f.col, f.col + 1].every((c) => map.cells.slice(0, f.row - 3).some((row) => row[c] === 'shelf'));
                expect(over, `fan at ${f.col}`).toBe(true);
            }
        });
    });

    describe('Level 3 — Hide and Outsmart', () => {
        const map = parseLevel(LEVEL3_MAP);
        const start = at(markerOf(map, 'P'));
        it('the trap box can be reached, and the floor reached again from it', () => {
            const box = at(markerOf(map, 'T'));
            expectStandable(map, 'T');
            expect(canReach(map, start, box)).toBe(true);
            expect(canReach(map, box, [30, 14])).toBe(true);
        });
        it('has all four kinds of hiding spot on the floor', () => {
            for (const ch of ['h', 'b', 'd', 'k']) {
                expectStandable(map, ch);
                expect(canReach(map, start, at(markerOf(map, ch)))).toBe(true);
            }
        });
        it('every floor cell is reachable (nowhere to get stuck)', () => {
            const r = reachable(map, start);
            for (let c = 1; c < map.width - 1; c++) expect(r.has(`${c},14`), `floor ${c}`).toBe(true);
        });
    });
});
