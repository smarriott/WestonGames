// End-to-end smoke test: serves the production build and has simple bots play
// every level to the end in headless Chromium, checking for errors and for the
// level -> level -> win transitions. Also checks the phone touch layout.
//
//   npm run smoke          (builds first)
//   npx playwright install chromium   (one-time, if Chromium is missing)

import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
import * as bots from './bots.mjs';

const PORT = 4179;
const BASE = `http://localhost:${PORT}/`;

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'pipe' });
const stop = () => server.kill();
process.on('exit', stop);

async function waitForServer() {
    for (let i = 0; i < 50; i++) {
        try {
            if ((await fetch(BASE)).ok) return;
        } catch { /* not up yet */ }
        await new Promise((r) => setTimeout(r, 200));
    }
    throw new Error('preview server did not start');
}

const results = [];
function report(name, ok, detail = '') {
    results.push({ name, ok });
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
}

async function openLevel(browser, level, ctxOpts = { viewport: { width: 960, height: 544 } }) {
    const ctx = await browser.newContext(ctxOpts);
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(`${BASE}?level=${level}`);
    await page.waitForFunction(() => window.__game?.scene?.getScenes(true)?.length > 0);
    await page.waitForTimeout(400);
    return { ctx, page, errors };
}

/** Wait until `pred` (run in the page) is true, or fail after `ms`. */
async function waitFor(page, pred, ms, arg) {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
        const v = await page.evaluate(pred, arg);
        if (v) return v;
        await page.waitForTimeout(100);
    }
    return null;
}

const isActive = (name) => window.__game.scene.getScene(name)?.sys.isActive();

/** Dismiss the level's intro card and wait until play has started. */
async function startPlay(page) {
    await page.waitForTimeout(700); // the card ignores input for its first 0.5s
    await page.keyboard.press('Space');
    const ok = await waitFor(page, () => window.__game.scene.getScenes(true).some((s) => s.waiting === false), 3000);
    if (!ok) throw new Error('intro card did not close');
}

// ───────────────────────────────────────────── in-page bots
// Each bot drives the game's own Key objects from a 'preupdate' hook so its
// timing is frame-accurate. It returns a status object on window.__bot.

function botLevel1() {
    const s = window.__game.scene.getScene('Level1Scene');
    const keys = s.controls.keys;
    const set = (k, v) => keys[k].forEach((key) => { key.isDown = v; });
    // a scripted route: [action, param, until]
    const steps = [
        ['jump', 140, (p) => p.ground && p.x > 200],
        ['run', 296],
        ['climb', 240],
        ['jump', 376, (p) => p.climbing],
        ['climb', 144],
        ['jump', 500, (p) => p.ground && p.bottom === 160],
        ['jump', 615, (p) => p.ground && p.bottom === 128],
        ['jump', 728, (p) => p.climbing],
        ['climb', 48],
        ['jump', 900, () => false],
    ];
    let i = 0, jumpUntil = 0, jumped = false;
    window.__bot = { step: 0 };
    s.events.on('preupdate', () => {
        for (const k of ['left', 'right', 'up', 'jump']) set(k, false);
        if (s.waiting || s.dead || s.finished || i >= steps.length) return;
        const pl = s.player;
        const p = { x: pl.x, bottom: Math.round(pl.body.bottom), ground: pl.body.blocked.down, climbing: pl.climbing };
        const [act, param, until] = steps[i];
        const now = performance.now();
        if (act === 'run') {
            set('right', true);
            if (p.x >= param) i++;
        } else if (act === 'climb') {
            set('up', true);
            if (!p.climbing && p.ground && p.bottom === param) i++;
        } else {
            set('right', true);
            if (!jumped && p.x >= param && p.ground) { jumped = true; jumpUntil = now + 260; }
            set('jump', now < jumpUntil);
            if (jumped && now > jumpUntil && until(p)) { i++; jumped = false; }
        }
        window.__bot.step = i;
    });
}

function botLevel2() {
    const s = window.__game.scene.getScene('Level2Scene');
    const keys = s.controls.keys;
    const set = (k, v) => keys[k].forEach((key) => { key.isDown = v; });
    const jumps = [228, 350, 482, 638, 692, 715, 962, 1150, 1325, 1440, 1630, 1684, 1707, 2000, 2190, 2318, 2562];
    const drips = [369.5, 1105.5, 1265.5, 2161.5, 2289.5, 2417.5];
    let jumpUntil = 0;
    s.events.on('preupdate', () => {
        if (s.waiting || s.dead || s.finished) { set('right', false); set('jump', false); return; }
        const pl = s.player, x = pl.x, ground = pl.body.blocked.down;
        let right = true;
        for (const dx of drips) {
            if (x > dx - 34 && x < dx - 16 && ground && s.drips.some((d) => Math.abs(d.x - dx) < 1)) right = false;
        }
        const now = performance.now();
        if (now > jumpUntil && ground && right && jumps.some((j) => x >= j && x < j + 10)) jumpUntil = now + 260;
        set('right', right);
        set('jump', now < jumpUntil);
    });
}

function botLevel3() {
    const s = window.__game.scene.getScene('Level3Scene');
    const keys = s.controls.keys;
    const set = (k, v) => keys[k].forEach((key) => { key.isDown = v; });
    const LADDER = 360, SHELF = 128, FLOOR = 240, DROP = 505;
    let state = 'toLadder', tap = false, hp = 3;
    window.__bot = { state };
    s.events.on('preupdate', () => {
        for (const k of ['left', 'right', 'up', 'down', 'jump', 'action']) set(k, false);
        if (s.waiting || s.dead || s.finished) return;
        const pl = s.player, x = pl.x, b = Math.round(pl.body.bottom), ground = pl.body.blocked.down;
        const goTo = (tx) => { if (x < tx - 2) set('right', true); else if (x > tx + 2) set('left', true); return Math.abs(x - tx) <= 2; };
        const onShelf = () => !pl.climbing && ground && b === SHELF;
        if (tap) { set('action', true); tap = false; return; }
        switch (state) {
            case 'toLadder': if (goTo(LADDER)) state = 'climb'; break;
            case 'climb': set('up', true); if (onShelf()) state = 'toBox'; break;
            case 'toBox': set('right', true); if (s.carrying) state = 'waitSafe'; break;
            case 'waitSafe': if (Math.abs(s.gx - DROP) > 260 && s.gstate === 'patrol') state = 'drop'; break;
            case 'drop':
                if (b !== FLOOR || !ground) set('right', true);
                else if (goTo(DROP)) { tap = true; state = 'back'; }
                break;
            case 'back': if (goTo(LADDER)) state = 'climbBack'; break;
            case 'climbBack': set('up', true); if (onShelf()) { state = 'waitSnap'; hp = s.ghp; } break;
            case 'waitSnap': if (s.ghp < hp) state = s.ghp > 0 ? 'toBox' : 'waitKey'; break;
            case 'waitKey': if (s.keyReady) state = 'getKey'; break;
            case 'getKey': if (b < FLOOR - 2) set('left', true); else goTo(s.key.x); break;
        }
        window.__bot.state = state;
    });
}

// ───────────────────────────────────────────── tests

async function testTitle(browser) {
    const { ctx, page, errors } = await openLevel(browser, '');
    const ok = await waitFor(page, isActive, 3000, 'TitleScene');
    report('title screen loads', !!ok && errors.length === 0, errors.join('; '));
    await ctx.close();
}

async function testLevel(browser, n, bot, next, timeoutMs) {
    const { ctx, page, errors } = await openLevel(browser, n);
    await startPlay(page);
    await page.addScriptTag({ content: bots.RUNNER });
    await page.evaluate(bot);
    const t0 = Date.now();
    const done = await waitFor(page, isActive, timeoutMs, next);
    const deaths = await page.evaluate(() => window.__deaths ?? 0);
    report(`level ${n} is beaten by the bot and leads to ${next}`, !!done && errors.length === 0,
        done ? `${((Date.now() - t0) / 1000).toFixed(1)}s, ${deaths} restarts` : `timed out; bot=${JSON.stringify(await page.evaluate(() => window.__bot))} ${errors.join('; ')}`);
    await ctx.close();
}

async function testCatScare(browser) {
    const { ctx, page, errors } = await openLevel(browser, 1);
    await startPlay(page);
    await page.evaluate(() => window.__game.scene.getScene('Level1Scene').player.setPosition(170, 330));
    const died = await waitFor(page, () => window.__game.scene.getScene('Level1Scene').dead, 2000);
    const restarted = await waitFor(page, () => {
        const s = window.__game.scene.getScene('Level1Scene');
        return s.retry && !s.dead && s.player.x < 60;
    }, 3000);
    report('falling in the pit triggers the cat and restarts the level', !!died && !!restarted && errors.length === 0, errors.join('; '));
    await ctx.close();
}

async function testPhone(browser) {
    const { ctx, page, errors } = await openLevel(browser, 3, {
        viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true,
    });
    const info = await page.evaluate(() => {
        const s = window.__game.scene.getScene('Level3Scene');
        const view = s.cameras.main;
        return { padVisible: s.controls.pad.isVisible, viewX: view.x, w: window.__game.scale.width, zoom: view.zoom };
    });
    // the 480-wide game view must leave room for the controls on both sides
    const ok = info.padVisible && info.viewX >= 100 && info.w - 480 - info.viewX >= 100;
    report('phone layout puts touch controls beside the game view', ok && errors.length === 0, JSON.stringify(info));
    report('phones zoom in so the mouse is not tiny', info.zoom > 1.2, `zoom ${info.zoom}`);

    // start upright (game paused, "turn sideways"), then rotate: the canvas must refit
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(800);
    await page.setViewportSize({ width: 844, height: 390 });
    await page.waitForTimeout(1500);
    const fit = await page.evaluate(() => {
        const c = document.querySelector('canvas').getBoundingClientRect();
        return { canvas: [Math.round(c.width), Math.round(c.height)], win: [innerWidth, innerHeight] };
    });
    const fills = fit.canvas[0] >= fit.win[0] - 2 || fit.canvas[1] >= fit.win[1] - 2;
    report('after rotating a phone the game refits the screen', fills, JSON.stringify(fit));
    await ctx.close();
}

try {
    await waitForServer();
    const browser = await chromium.launch();
    await testTitle(browser);
    await testCatScare(browser);
    await testPhone(browser);
    await testLevel(browser, 1, botLevel1, 'Level2Scene', 60000);
    await testLevel(browser, 2, botLevel2, 'Level3Scene', 90000);
    await testLevel(browser, 3, botLevel3, 'Level4Scene', 240000);
    await testLevel(browser, 4, bots.botLevel4, 'Level5Scene', 120000);
    await testLevel(browser, 5, bots.botLevel5, 'Level6Scene', 180000);
    await testLevel(browser, 6, bots.botLevel6, 'Level7Scene', 150000);
    await testLevel(browser, 7, bots.botLevel7, 'Level8Scene', 120000);
    await testLevel(browser, 8, bots.botLevel8, 'Level9Scene', 120000);
    await testLevel(browser, 9, bots.botLevel9, 'Level10Scene', 180000);
    await testLevel(browser, 10, bots.botLevel10, 'WinScene', 180000);
    await browser.close();
} catch (e) {
    report('smoke test crashed', false, e.message);
}
stop();
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
