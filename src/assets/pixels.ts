// Tiny, DOM-free pixel buffer used to author all of the game's pixel art.
// Sprites are drawn either from character maps (one char = one pixel) or with
// simple pixel-level shape helpers. The same data feeds the game at runtime
// (see textures.ts) and the PNG exporter (scripts/export-sprites.ts).

import { PALETTE } from './palette';

export class Pixels {
    readonly data: Uint8ClampedArray<ArrayBuffer>;

    constructor(readonly w: number, readonly h: number) {
        this.data = new Uint8ClampedArray(w * h * 4);
    }

    static fromRows(rows: string[], palette: Record<string, string> = PALETTE): Pixels {
        const h = rows.length;
        const w = rows[0].length;
        const px = new Pixels(w, h);
        rows.forEach((row, y) => {
            if (row.length !== w) {
                throw new Error(`Pixel row ${y} is ${row.length} wide, expected ${w}: "${row}"`);
            }
            for (let x = 0; x < w; x++) {
                const ch = row[x];
                if (ch === '.' || ch === ' ') continue;
                const color = palette[ch];
                if (!color) throw new Error(`Unknown palette char "${ch}" in row ${y}`);
                px.set(x, y, color);
            }
        });
        return px;
    }

    set(x: number, y: number, color: string, alpha = 255) {
        x = Math.round(x);
        y = Math.round(y);
        if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
        const i = (y * this.w + x) * 4;
        const n = parseInt(color.slice(1), 16);
        this.data[i] = (n >> 16) & 255;
        this.data[i + 1] = (n >> 8) & 255;
        this.data[i + 2] = n & 255;
        this.data[i + 3] = alpha;
    }

    clear(x: number, y: number) {
        if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
        this.data[(y * this.w + x) * 4 + 3] = 0;
    }

    isSet(x: number, y: number): boolean {
        if (x < 0 || y < 0 || x >= this.w || y >= this.h) return false;
        return this.data[(y * this.w + x) * 4 + 3] > 0;
    }

    rect(x: number, y: number, w: number, h: number, color: string) {
        for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, color);
    }

    /** Filled circle (pixel-perfect, no anti-aliasing). */
    disc(cx: number, cy: number, r: number, color: string) {
        for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
            for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
                const dx = x - cx, dy = y - cy;
                if (dx * dx + dy * dy <= r * r) this.set(x, y, color);
            }
        }
    }

    ring(cx: number, cy: number, r: number, thickness: number, color: string) {
        for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
            for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
                const d = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
                if (d <= r && d > r - thickness) this.set(x, y, color);
            }
        }
    }

    ellipse(cx: number, cy: number, rx: number, ry: number, color: string) {
        for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
            for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
                const dx = (x - cx) / rx, dy = (y - cy) / ry;
                if (dx * dx + dy * dy <= 1) this.set(x, y, color);
            }
        }
    }

    line(x0: number, y0: number, x1: number, y1: number, color: string) {
        const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
        for (let s = 0; s <= steps; s++) {
            this.set(x0 + ((x1 - x0) * s) / steps, y0 + ((y1 - y0) * s) / steps, color);
        }
    }

    /** Stamp another buffer on top (transparent pixels are skipped). */
    blit(src: Pixels, ox: number, oy: number, flipX = false) {
        for (let y = 0; y < src.h; y++) {
            for (let x = 0; x < src.w; x++) {
                const i = (y * src.w + x) * 4;
                if (src.data[i + 3] === 0) continue;
                const tx = ox + (flipX ? src.w - 1 - x : x);
                const ty = oy + y;
                if (tx < 0 || ty < 0 || tx >= this.w || ty >= this.h) continue;
                const j = (ty * this.w + tx) * 4;
                this.data[j] = src.data[i];
                this.data[j + 1] = src.data[i + 1];
                this.data[j + 2] = src.data[i + 2];
                this.data[j + 3] = src.data[i + 3];
            }
        }
    }

    /** Draw a 1px dark outline around every opaque shape. */
    outline(color: string) {
        const copy = new Pixels(this.w, this.h);
        copy.data.set(this.data);
        for (let y = 0; y < this.h; y++) {
            for (let x = 0; x < this.w; x++) {
                if (copy.isSet(x, y)) continue;
                if (copy.isSet(x - 1, y) || copy.isSet(x + 1, y) || copy.isSet(x, y - 1) || copy.isSet(x, y + 1)) {
                    this.set(x, y, color);
                }
            }
        }
    }

    clone(): Pixels {
        const p = new Pixels(this.w, this.h);
        p.data.set(this.data);
        return p;
    }
}

/** A horizontal strip of equally sized frames. */
export interface Sheet {
    key: string;
    frameW: number;
    frameH: number;
    frames: Pixels[];
}

export function sheet(key: string, frames: Pixels[]): Sheet {
    const { w, h } = frames[0];
    frames.forEach((f, i) => {
        if (f.w !== w || f.h !== h) throw new Error(`${key}: frame ${i} is ${f.w}x${f.h}, expected ${w}x${h}`);
    });
    return { key, frameW: w, frameH: h, frames };
}

/** Lay out a sheet's frames into one buffer (used by the PNG exporter and runtime). */
export function packSheet(s: Sheet): Pixels {
    const out = new Pixels(s.frameW * s.frames.length, s.frameH);
    s.frames.forEach((f, i) => out.blit(f, i * s.frameW, 0));
    return out;
}
