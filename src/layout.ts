// Screen layout. The game world is always viewed through a 480x272 window.
// On touch devices the canvas is made larger to match the screen's shape, and
// the on-screen controls live in the extra space beside (phones) or below
// (tablets) the game window, so a thumb never covers the mouse.

import { GAME_H, GAME_W } from './config';

export interface Point { x: number; y: number }

export interface Layout {
    /** Canvas size in game pixels. */
    w: number;
    h: number;
    /** Where the 480x272 game view sits inside the canvas. */
    view: { x: number; y: number; w: number; h: number };
    /** Touch-control positions in canvas pixels. */
    pad: { dpad: Point; jump: Point; action: Point };
    /** Controls have their own space (true) or float over the game (false). */
    bands: boolean;
    /** How much levels zoom in. Phones zoom so the mouse isn't tiny. */
    zoom: number;
}

const PHONE_ZOOM = 1.3;

const SIDE_BAND = 104;   // room for the d-pad beside the view on phones
const BOTTOM_BAND = 112; // room for the controls under the view on tablets

export function isTouchFirst(): boolean {
    try {
        return window.matchMedia('(pointer: coarse)').matches;
    } catch {
        return false;
    }
}

export function computeLayout(touch = isTouchFirst(), aspect = window.innerWidth / Math.max(1, window.innerHeight)): Layout {
    if (!touch) {
        // keyboard play: just the game; any touch pad floats over the corners
        return {
            w: GAME_W, h: GAME_H, bands: false, zoom: 1,
            view: { x: 0, y: 0, w: GAME_W, h: GAME_H },
            pad: {
                dpad: { x: 66, y: GAME_H - 64 },
                jump: { x: GAME_W - 50, y: GAME_H - 56 },
                action: { x: GAME_W - 118, y: GAME_H - 40 },
            },
        };
    }
    // a phone has a short side under ~500 CSS pixels; tablets are big enough already
    const shortSide = Math.min(window.screen?.width || window.innerWidth, window.screen?.height || window.innerHeight);
    const zoom = shortSide < 500 ? PHONE_ZOOM : 1;
    if (aspect >= GAME_W / GAME_H) {
        // wide (phone in landscape): controls left and right of the view
        const w = Math.max(GAME_W + SIDE_BAND * 2, Math.round(GAME_H * aspect));
        const h = Math.max(GAME_H, Math.round(w / aspect));
        const band = (w - GAME_W) / 2;
        const view = { x: Math.round(band), y: Math.round((h - GAME_H) / 2), w: GAME_W, h: GAME_H };
        return {
            w, h, view, bands: true, zoom,
            pad: {
                dpad: { x: band / 2, y: h - 66 },
                jump: { x: w - band / 2, y: h - 58 },
                action: { x: w - band / 2, y: h - 138 },
            },
        };
    }
    // tall-ish (tablet, or phone that isn't sideways): controls under the view
    const h = Math.max(GAME_H + BOTTOM_BAND, Math.round(GAME_W / aspect));
    const w = Math.max(GAME_W, Math.round(h * aspect));
    const view = { x: Math.round((w - GAME_W) / 2), y: Math.max(0, Math.round((h - BOTTOM_BAND - GAME_H) / 2)), w: GAME_W, h: GAME_H };
    return {
        w, h, view, bands: true, zoom,
        pad: {
            dpad: { x: 70, y: h - 58 },
            jump: { x: w - 52, y: h - 56 },
            action: { x: w - 124, y: h - 48 },
        },
    };
}

let current: Layout = computeLayout(false, GAME_W / GAME_H);

export function getLayout(): Layout {
    return current;
}

/** Recompute for the current window. Returns true if the canvas size changed. */
export function refreshLayout(): boolean {
    const next = computeLayout();
    const changed = next.w !== current.w || next.h !== current.h || next.bands !== current.bands || next.zoom !== current.zoom;
    current = next;
    return changed;
}
