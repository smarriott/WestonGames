// Remembers which levels the player has unlocked. Browser storage can be
// unavailable (private mode), so every access is guarded.

import { LEVELS } from '../config';

const KEY = 'motr.unlocked';
const MAX = LEVELS.length;

export function unlockedLevels(): number {
    try {
        const n = parseInt(localStorage.getItem(KEY) ?? '1', 10);
        return Number.isFinite(n) ? Math.min(Math.max(n, 1), MAX) : 1;
    } catch {
        return 1;
    }
}

export function unlockLevel(n: number) {
    try {
        if (n > unlockedLevels()) localStorage.setItem(KEY, String(Math.min(n, MAX)));
    } catch {
        /* ignore */
    }
}
