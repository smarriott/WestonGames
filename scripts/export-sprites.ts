// Exports every generated sprite sheet as a PNG into assets/sprites/,
// plus a 4x-scaled contact sheet (assets/sprites/_all.png) for quick review.
//   npm run export-sprites

import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { allSheets } from '../src/assets/sprites';
import { Pixels, packSheet } from '../src/assets/pixels';

const OUT_DIR = 'assets/sprites';

function crc32(buf: Uint8Array): number {
    let c = ~0;
    for (const b of buf) {
        c ^= b;
        for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
    }
    return ~c >>> 0;
}

function chunk(type: string, data: Uint8Array): Buffer {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type, 'ascii'), Buffer.from(data)]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(td));
    return Buffer.concat([len, td, crc]);
}

function encodePng(px: Pixels): Buffer {
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(px.w, 0);
    ihdr.writeUInt32BE(px.h, 4);
    ihdr[8] = 8;  // bit depth
    ihdr[9] = 6;  // RGBA
    const raw = Buffer.alloc((px.w * 4 + 1) * px.h);
    for (let y = 0; y < px.h; y++) {
        raw[y * (px.w * 4 + 1)] = 0;
        Buffer.from(px.data.buffer, y * px.w * 4, px.w * 4).copy(raw, y * (px.w * 4 + 1) + 1);
    }
    return Buffer.concat([
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        chunk('IHDR', ihdr),
        chunk('IDAT', deflateSync(raw)),
        chunk('IEND', new Uint8Array()),
    ]);
}

function scale(px: Pixels, s: number): Pixels {
    const out = new Pixels(px.w * s, px.h * s);
    for (let y = 0; y < out.h; y++) {
        for (let x = 0; x < out.w; x++) {
            const i = (Math.floor(y / s) * px.w + Math.floor(x / s)) * 4;
            out.data.set(px.data.subarray(i, i + 4), (y * out.w + x) * 4);
        }
    }
    return out;
}

mkdirSync(OUT_DIR, { recursive: true });
const packed = allSheets().map((s) => ({ key: s.key, px: packSheet(s) }));
for (const { key, px } of packed) {
    writeFileSync(`${OUT_DIR}/${key}.png`, encodePng(px));
}

// Contact sheet on a dark background so outlines are visible
const S = 3, PAD = 6, MAX_W = 1400;
let x = PAD, y = PAD, rowH = 0;
const placed: { px: Pixels; x: number; y: number }[] = [];
for (const { px } of packed) {
    const big = scale(px, S);
    if (x + big.w + PAD > MAX_W) { x = PAD; y += rowH + PAD; rowH = 0; }
    placed.push({ px: big, x, y });
    x += big.w + PAD;
    rowH = Math.max(rowH, big.h);
}
const sheetPx = new Pixels(MAX_W, y + rowH + PAD);
sheetPx.rect(0, 0, sheetPx.w, sheetPx.h, '#3a3550');
for (const p of placed) sheetPx.blit(p.px, p.x, p.y);
writeFileSync(`${OUT_DIR}/_all.png`, encodePng(sheetPx));

console.log(`Exported ${packed.length} sprite sheets to ${OUT_DIR}/`);
