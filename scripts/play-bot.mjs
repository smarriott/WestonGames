// Dev helper: watch one bot play one level against a running dev server.
//   node scripts/play-bot.mjs 7 [http://localhost:5173/] [timeoutSeconds]
import { chromium } from 'playwright';
import * as bots from './bots.mjs';
import { RUNNER } from './bots.mjs';

const n = Number(process.argv[2]);
const base = process.argv[3] || 'http://localhost:5173/';
const timeout = Number(process.argv[4] || 180) * 1000;
const next = n >= 10 ? 'WinScene' : `Level${n + 1}Scene`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 960, height: 544 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`${base}?level=${n}`);
await page.waitForFunction(() => window.__game?.scene?.getScenes(true)?.length > 0);
await page.waitForTimeout(700);
await page.keyboard.press('Space');
await page.waitForTimeout(400);
await page.addScriptTag({ content: RUNNER });
await page.evaluate(bots[`botLevel${n}`]);
const t0 = Date.now();
let done = false, last = '';
while (Date.now() - t0 < timeout) {
    done = await page.evaluate((k) => window.__game.scene.getScene(k)?.sys.isActive(), next);
    if (done) break;
    const st = await page.evaluate((k) => {
        const s = window.__game.scene.getScene(k);
        return JSON.stringify({ got: s.got, step: window.__bot?.step, restarts: window.__bot?.restarts, x: Math.round(s.player?.x), b: Math.round(s.player?.body?.bottom), dead: s.dead });
    }, `Level${n}Scene`);
    if (st !== last && process.env.VERBOSE) console.log(((Date.now() - t0) / 1000).toFixed(1), st);
    last = st;
    if (process.env.SHOT_ON_DEATH && JSON.parse(st).dead) await page.screenshot({ path: process.env.SHOT_ON_DEATH });
    if (process.env.SHOT_EVERY) {
        const k = Math.floor((Date.now() - t0) / (Number(process.env.SHOT_EVERY) * 1000));
        if (k !== globalThis.__lastShot) { globalThis.__lastShot = k; await page.screenshot({ path: `${process.env.SHOT_DIR}/bot${n}_${k}.png` }); }
    }
    await page.waitForTimeout(100);
}
console.log(done ? `PASS level ${n} in ${((Date.now() - t0) / 1000).toFixed(1)}s` : `FAIL level ${n}: ${last}`, errors.join('; '));
await browser.close();
process.exit(done ? 0 : 1);
