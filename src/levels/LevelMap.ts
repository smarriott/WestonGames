// Text-based level maps. Pure data + parsing, no Phaser, so tests can use it.
//
//   #  solid block              =  shelf (jump up through it, stand on top)
//   H  ladder                   L  ladder with a shelf on top (climb onto it)
//   .  empty                    any other char = an entity marker (cell is empty)

export type Cell = 'empty' | 'solid' | 'shelf';

export interface Marker {
    ch: string;
    col: number;
    row: number;
}

export interface LevelMapData {
    width: number;
    height: number;
    cells: Cell[][];
    ladders: boolean[][];
    markers: Marker[];
}

export function parseLevel(rows: string[]): LevelMapData {
    const height = rows.length;
    const width = rows[0].length;
    const cells: Cell[][] = [];
    const ladders: boolean[][] = [];
    const markers: Marker[] = [];
    rows.forEach((line, row) => {
        if (line.length !== width) {
            throw new Error(`Level row ${row} has width ${line.length}, expected ${width}`);
        }
        cells.push([]);
        ladders.push([]);
        for (let col = 0; col < width; col++) {
            const ch = line[col];
            let cell: Cell = 'empty';
            let ladder = false;
            switch (ch) {
                case '#': cell = 'solid'; break;
                case '=': cell = 'shelf'; break;
                case 'H': ladder = true; break;
                case 'L': cell = 'shelf'; ladder = true; break;
                case '.': case ' ': break;
                default: markers.push({ ch, col, row });
            }
            cells[row].push(cell);
            ladders[row].push(ladder);
        }
    });
    return { width, height, cells, ladders, markers };
}

export function markersOf(map: LevelMapData, ch: string): Marker[] {
    return map.markers.filter((m) => m.ch === ch);
}

export function markerOf(map: LevelMapData, ch: string): Marker {
    const m = markersOf(map, ch)[0];
    if (!m) throw new Error(`Level is missing marker "${ch}"`);
    return m;
}

// ─────────────────────────────────────────────────────────────── reachability
//
// A conservative tile-level model of what the mouse can do, used by the tests
// to prove every level is finishable. The real jump (see config.ts PHYSICS)
// reaches ~3.6 tiles up and ~5 tiles across; the model uses smaller limits so
// that "reachable" here means "comfortably reachable for a kid".

export const REACH = { up: 3, across: 4, acrossHigh: 3, acrossDown: 5 };

const key = (c: number, r: number) => `${c},${r}`;

export function isSolid(m: LevelMapData, c: number, r: number) {
    if (c < 0 || c >= m.width) return true;
    if (r < 0 || r >= m.height) return false;
    return m.cells[r][c] === 'solid';
}

function isLadder(m: LevelMapData, c: number, r: number) {
    return r >= 0 && r < m.height && c >= 0 && c < m.width && m.ladders[r][c];
}

function supports(m: LevelMapData, c: number, r: number) {
    if (r < 0 || r >= m.height || c < 0 || c >= m.width) return false;
    return m.cells[r][c] !== 'empty';
}

/** Can the mouse stand in cell (c, r)? */
export function canStand(m: LevelMapData, c: number, r: number) {
    return r >= 0 && r < m.height && c >= 0 && c < m.width && m.cells[r][c] === 'empty' && supports(m, c, r + 1);
}

/** Where does something dropped into (c, r) come to rest? null = fell out of the level. */
function fallFrom(m: LevelMapData, c: number, r: number): [number, number] | null {
    for (let y = r; y < m.height; y++) {
        if (isSolid(m, c, y)) return null;
        if (isLadder(m, c, y)) return [c, y];
        if (canStand(m, c, y)) return [c, y];
    }
    return null;
}

/** Clear vertical column from (c, r) up to (c, r - h)? */
function headroom(m: LevelMapData, c: number, r: number, h: number) {
    for (let y = r - 1; y >= r - h; y--) if (isSolid(m, c, y)) return false;
    return true;
}

export interface ReachOptions {
    /** Cells holding a spring: standing there launches the mouse `springUp` tiles high. */
    springs?: [number, number][];
    springUp?: number;
}

/** All cells reachable from `start` (a standing or ladder cell). */
export function reachable(m: LevelMapData, start: [number, number], opts: ReachOptions = {}): Set<string> {
    const springs = new Set((opts.springs ?? []).map(([c, r]) => key(c, r)));
    const springUp = opts.springUp ?? 8;
    const seen = new Set<string>();
    const queue: [number, number][] = [];
    const push = (p: [number, number] | null) => {
        if (!p) return;
        const k = key(p[0], p[1]);
        if (seen.has(k)) return;
        seen.add(k);
        queue.push(p);
    };
    const s = fallFrom(m, start[0], start[1]);
    push(s);

    while (queue.length) {
        const [c, r] = queue.shift()!;
        const standing = canStand(m, c, r);
        const onLadder = isLadder(m, c, r);

        // walk / step off a ledge
        for (const d of [-1, 1]) {
            if (!isSolid(m, c + d, r)) push(fallFrom(m, c + d, r));
        }

        // ladders: climb up/down, step off the top onto a shelf
        if (onLadder) {
            if (isLadder(m, c, r - 1)) push([c, r - 1]);
            else if (!isSolid(m, c, r - 1) && canStand(m, c, r - 1)) push([c, r - 1]);
            if (isLadder(m, c, r + 1)) push([c, r + 1]);
            push(fallFrom(m, c, r + 1 < m.height ? r + 1 : r));
        }
        if (standing && isLadder(m, c, r + 1)) push([c, r + 1]);

        // springs launch straight up (through shelves, not through blocks)
        if (standing && springs.has(key(c, r))) {
            for (let dy = 1; dy <= springUp && !isSolid(m, c, r - dy); dy++) {
                for (let dx = -3; dx <= 3; dx++) {
                    const tc = c + dx, tr = r - dy;
                    if (canStand(m, tc, tr) || isLadder(m, tc, tr)) push([tc, tr]);
                }
            }
        }

        // jumps (also allowed off ladders)
        if (standing || onLadder) {
            for (let dy = -REACH.up; dy <= 6; dy++) {
                const maxDx = dy < -2 ? REACH.acrossHigh : dy <= 0 ? REACH.across : REACH.acrossDown;
                if (dy < 0 && !headroom(m, c, r, -dy)) continue;
                for (let dx = -maxDx; dx <= maxDx; dx++) {
                    const tc = c + dx, tr = r + dy;
                    if (tc < 0 || tc >= m.width || tr < 0 || tr >= m.height) continue;
                    if (isSolid(m, tc, tr)) continue;
                    // the path must not pass through a solid wall at the jump's height
                    const top = Math.min(r, tr) - 1;
                    let blocked = false;
                    const step = dx > 0 ? 1 : -1;
                    for (let x = c + step; dx !== 0 && x !== tc + step; x += step) {
                        if (isSolid(m, x, top) && isSolid(m, x, Math.min(r, tr))) { blocked = true; break; }
                    }
                    if (blocked) continue;
                    if (canStand(m, tc, tr) || isLadder(m, tc, tr)) push([tc, tr]);
                }
            }
        }
    }
    return seen;
}

export function canReach(m: LevelMapData, from: [number, number], to: [number, number], opts: ReachOptions = {}): boolean {
    return reachable(m, from, opts).has(key(to[0], to[1]));
}
