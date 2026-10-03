import { describe, expect, it } from 'vitest';
import { allSheets } from '../src/assets/sprites';

describe('pixel art', () => {
    const sheets = allSheets();

    it('builds every sheet without errors and with unique keys', () => {
        const keys = sheets.map((s) => s.key);
        expect(new Set(keys).size).toBe(keys.length);
    });

    it('every frame has real transparency or is a full tile', () => {
        const fullTiles = new Set(['tiles', 'wallpaper', 'leg', 'hide_locker', 'portrait', 'fuse']);
        for (const s of sheets) {
            if (fullTiles.has(s.key)) continue;
            for (const f of s.frames) {
                let transparent = 0;
                for (let i = 3; i < f.data.length; i += 4) if (f.data[i] === 0) transparent++;
                expect(transparent, `${s.key} should have transparent pixels`).toBeGreaterThan(0);
            }
        }
    });

    it('no frame is empty', () => {
        for (const s of sheets) {
            for (const [i, f] of s.frames.entries()) {
                const opaque = f.data.some((v, j) => j % 4 === 3 && v > 0);
                expect(opaque, `${s.key}[${i}]`).toBe(true);
            }
        }
    });
});
