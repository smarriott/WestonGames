// Bots that play levels 4-10 for the smoke test. Each bot is a plain function
// that runs inside the page (via page.evaluate), so it can only use globals.
// They all use window.__runSteps, a tiny step runner installed by RUNNER.
//
// A step is [kind, ...args]:
//   ['go', x]                      walk to x
//   ['jump', x, dir, until, ms?]   run in dir, jump once past x, keep running until until(p)
//   ['climb', bottom]              hold up until standing with feet at `bottom`
//   ['hold', keys, until]          hold keys until until(p)
//   ['wait', until]                do nothing until until(p)
//   ['tap', key]                   press a key for one frame
//   ['fn', f]                      custom per-frame logic: f(p, set, now) returns true when done
//   ['skipIf', cond, n]            skip the next n steps if cond(p)
//   ['hopOnto', x, until]          jump and steer onto whatever is at x (springs)
// p = { x, y, bottom, ground, climbing, vy, s } (s is the scene)
// If the mouse gets caught the level restarts and the steps start over.

export const RUNNER = `(() => {
  window.__runSteps = (sceneKey, makeSteps) => {
    const s = window.__game.scene.getScene(sceneKey);
    let steps = makeSteps(s), i = 0, jumpUntil = 0, jumped = false, lastPlayer = null;
    window.__bot = { step: 0, restarts: 0 };
    s.events.on('preupdate', () => {
      const keys = s.controls && s.controls.keys;
      if (!keys) return;
      const set = (k, v) => keys[k].forEach((key) => { key.isDown = v; });
      for (const k of ['left', 'right', 'up', 'down', 'jump', 'action']) set(k, false);
      if (s.player !== lastPlayer) {
        if (lastPlayer) { window.__bot.restarts++; steps = makeSteps(s); i = 0; jumped = false; }
        lastPlayer = s.player;
      }
      if (s.waiting || s.dead || s.finished || i >= steps.length) return;
      const pl = s.player, b = pl.body;
      const p = { x: pl.x, y: pl.y, bottom: Math.round(b.bottom), ground: b.blocked.down, climbing: pl.climbing, vy: b.velocity.y, s };
      const st = steps[i];
      const now = performance.now();
      const next = () => { i++; jumped = false; window.__bot.step = i; };
      switch (st[0]) {
        case 'go': {
          if (Math.abs(p.x - st[1]) <= 3) next();
          else set(p.x < st[1] ? 'right' : 'left', true);
          break;
        }
        case 'jump': {
          const [, jx, dir, until, ms] = st;
          set(dir > 0 ? 'right' : 'left', true);
          if (!jumped && (dir > 0 ? p.x >= jx : p.x <= jx) && p.ground) { jumped = true; jumpUntil = now + (ms || 260); }
          set('jump', now < jumpUntil);
          if (jumped && now > jumpUntil && until(p)) next();
          break;
        }
        case 'climb':
          set('up', true);
          if (!p.climbing && p.ground && p.bottom === st[1]) next();
          break;
        case 'hold':
          st[1].forEach((k) => set(k, true));
          if (st[2](p)) next();
          break;
        case 'wait':
          if (st[1](p)) next();
          break;
        case 'tap':
          set(st[1], true);
          next();
          break;
        case 'fn':
          if (st[1](p, set, now)) next();
          break;
        case 'hopOnto': {
          // jump, drift toward x, stop drifting once above it, finish when until(p)
          const [, tx, until] = st;
          if (!jumped && p.ground) { jumped = true; jumpUntil = now + 260; }
          set('jump', now < jumpUntil);
          if (Math.abs(p.x - tx) > 2) set(p.x < tx ? 'right' : 'left', true);
          if (jumped && now > jumpUntil && until(p)) next();
          break;
        }
        case 'skipIf':
          if (st[1](p)) { i += st[2] + 1; window.__bot.step = i; } else next();
          break;
      }
    });
  };
})();`;

const landed = (bottom) => (p) => p.ground && p.bottom === bottom;

// ───────────────────────────────────────────── Level 4: Toy Box Trouble
export function botLevel4() {
    const landedOn = (bottom) => (p) => p.ground && p.bottom === bottom;
    // walk toward x, hopping over any robot that gets close
    const goAvoid = (tx) => ['fn', (p, set, now) => {
        const dir = tx > p.x ? 1 : -1;
        if (Math.abs(p.x - tx) <= 3) return true;
        set(dir > 0 ? 'right' : 'left', true);
        const near = p.s.robots.some((r) => Math.abs(r.sprite.y - p.bottom) < 6 && (r.sprite.x - p.x) * dir > 0 && Math.abs(r.sprite.x - p.x) < 34);
        if (near && p.ground) window.__hopUntil = now + 260;
        set('jump', now < (window.__hopUntil || 0));
        return false;
    }];
    window.__runSteps('Level4Scene', (s) => [
        ['go', 102],
        ['hopOnto', 120, (p) => p.bottom < 205],                     // onto the jack-in-the-box
        ['wait', landedOn(144)],
        ['go', 56],                                                // battery 1
        ['hold', ['right'], landedOn(272)],
        ['go', 246],
        ['wait', () => s.train.x <= s.trainMin + 1 && s.time.now < s.trainWaitUntil - 300],
        ['hold', ['right'], (p) => p.x > 290 && p.ground],
        ['go', 300],
        ['wait', () => s.train.x >= s.trainMax - 1],
        goAvoid(600),
        ['fn', (p) => p.ground],
        goAvoid(735),
        ['jump', 740, 1, landedOn(240)],                           // step block
        ['jump', 830, 1, landedOn(192)],                           // tower: battery 2
        ['go', 872],
        ['go', 916],
        ['hopOnto', 936, (p) => p.bottom < 205],                     // second jack
        ['wait', landedOn(144)],
        ['go', 984],                                               // battery 3
        ['jump', 996, 1, landedOn(272)],
        goAvoid(1256),
        ['climb', 160],
        ['go', 1208],                                              // battery 4
        ['hold', ['right'], (p) => p.x > 1340 && p.ground],
        goAvoid(1480),                                             // the rocket
    ]);
}

// ───────────────────────────────────────────── Level 5: Bath Time Flood
export function botLevel5() {
    const L = (bottom) => (p) => p.ground && p.bottom === bottom;
    window.__runSteps('Level5Scene', (s) => [
        ['jump', 100, 1, L(928)],
        ['jump', 228, 1, L(896)],
        ['jump', 336, 1, L(864)],
        ['go', 380],
        ['jump', 372, -1, L(832)],
        ['jump', 236, -1, L(800)],
        ['jump', 108, -1, (p) => p.climbing || L(768)(p)],
        ['go', 56],
        ['climb', 672],
        ['jump', 150, 1, L(640)],
        ['jump', 262, 1, (p) => p.ground && p.bottom === 640 && p.x > 292],
        ['go', 366],
        ['hopOnto', 392, (p) => p.ground && Math.abs(p.x - 392) < 8 && p.bottom < 632],   // onto the duck
        ['wait', (p) => p.bottom <= 444],                                    // ride it up
        ['hold', ['left'], (p) => p.ground && p.bottom === 448 && p.x < 370],
        ['jump', 316, -1, L(416)],
        ['jump', 214, -1, L(384)],
        ['jump', 104, -1, (p) => p.climbing || L(352)(p)],
        ['go', 40],
        ['climb', 240],
        ['jump', 122, 1, L(208)],
        ['jump', 248, 1, L(176)],
        ['jump', 360, 1, (p) => p.climbing || L(144)(p)],
        ['go', 424],
        ['climb', 64],
        ['go', 328],
    ]);
}

// ───────────────────────────────────────────── Level 6: The Ghost Kitchen
export function botLevel6() {
    // run toward x hopping over frozen ghosts; at a counter's edge wait for the
    // flames to die down, then cross
    const run = (tx) => ['fn', (p, set, now) => {
        const dir = tx > p.x ? 1 : -1;
        if (Math.abs(p.x - tx) <= 3) return true;
        set(dir > 0 ? 'right' : 'left', true);
        const ghostAhead = p.s.ghosts.some((g) => (g.sprite.x - p.x) * dir > 0 && Math.abs(g.sprite.x - p.x) < 40 && Math.abs(g.sprite.y - p.y) < 24);
        if (ghostAhead && p.ground) window.__hopUntil = now + 300;
        set('jump', now < (window.__hopUntil || 0));
        return false;
    }];
    const burnersCool = (x0, x1) => (p) => p.s.burners
        .filter((b) => b.x > x0 && b.x < x1)
        .every((b) => { const t = (p.s.t + b.phase) % 3400; return t > 2000 && t < 2150; });
    // wait for a condition, turning to stare at any ghost creeping up behind
    const waitWatching = (cond) => ['fn', (p, set, now) => {
        if (cond(p)) return true;
        const facing = p.s.player.flipX ? -1 : 1;
        const creeper = p.s.ghosts.find((g) => g.awake && Math.sign(g.sprite.x - p.x) !== facing && Math.abs(g.sprite.x - p.x) < 200);
        if (creeper && Math.floor(now / 16) % 4 === 0) set(creeper.sprite.x < p.x ? 'left' : 'right', true);
        return false;
    }];
    const counter = (edge, x0, x1, top, dir) => [
        waitWatching(burnersCool(x0, x1)),
        ['jump', edge, dir, (p) => p.ground && p.bottom === top],
        ['hold', [dir > 0 ? 'right' : 'left'], (p) => (dir > 0 ? p.x > x1 + 14 : p.x < x0 - 14) && p.ground && p.bottom === 240],
    ];
    window.__runSteps('Level6Scene', () => [
        run(200),
        ...counter(204, 224, 320, 208, 1),
        run(560),
        ...counter(564, 576, 704, 208, 1),
        run(904),
        ['climb', 112],
        ['hold', ['right'], (p) => p.x >= 979],
        ['hold', ['down'], (p) => p.ground && p.bottom === 240 && !p.climbing],
        run(1260),
        ...counter(1264, 1280, 1440, 208, 1),
        run(1528),                                     // the big cheese
        ['wait', (p) => p.s.carrying],
        run(1460),
        ...counter(1456, 1280, 1440, 208, -1),
        run(992),
        ['go', 984],
        ['climb', 112],
        ['hold', ['left'], (p) => p.x <= 909],
        ['hold', ['down'], (p) => p.ground && p.bottom === 240 && !p.climbing],
        run(720),
        ...counter(716, 576, 704, 208, -1),
        run(336),
        ...counter(332, 224, 320, 208, -1),
        run(40),
    ]);
}

// ───────────────────────────────────────────── Level 7: Lights Out
export function botLevel7() {
    const L = (bottom) => (p) => p.ground && p.bottom === bottom;
    // wait until the paw in hole `i` has just pulled back in
    const pawSafe = (i) => (p) => { const w = p.s.paws[i]; const t = (p.s.t + w.phase) % 2950; return t > 100 && t < 700; };
    window.__runSteps('Level7Scene', () => [
        ['jump', 148, 1, (p) => p.ground && p.x > 200],
        ['go', 212],
        ['wait', pawSafe(0)],
        ['go', 248],
        ['climb', 176],
        ['jump', 268, 1, (p) => p.ground && p.x > 300],
        ['hold', ['right'], (p) => p.x > 320 && p.ground],
        ['jump', 404, 1, L(224)],
        ['jump', 562, 1, L(192)],
        ['jump', 712, 1, (p) => p.climbing || (p.ground && p.bottom === 240)],
        ['hold', ['down'], (p) => p.ground && !p.climbing && p.bottom === 240],
        ['jump', 790, 1, L(256)],
        ['go', 900],
        ['wait', pawSafe(1)],
        ['go', 936],
        ['climb', 160],
        ['go', 1060],
        ['hold', ['right'], (p) => p.ground && p.bottom === 224],
        ['go', 1288],                                   // fuse box
        ['wait', (p) => p.s.lightsOn],
        ['go', 1112],
        ['climb', 160],
        ['go', 900],
        ['hold', ['left'], (p) => p.ground && p.bottom === 256],
        ['go', 845],
        ['jump', 842, -1, (p) => p.climbing || (p.ground && p.bottom === 240)],
        ['go', 760],
        ['climb', 64],
        ['go', 808],                                    // exit
    ]);
}

// ───────────────────────────────────────────── Level 8: Spider Attic
export function botLevel8() {
    const spiderUp = (i) => (p) => p.s.spiders[i].sprite.y < 60;
    window.__runSteps('Level8Scene', () => [
        ['go', 276],
        ['hopOnto', 296, (p) => p.vy < -300],                     // spring
        ['wait', (p) => p.ground && p.bottom === 160],
        ['wait', spiderUp(0)],
        ['go', 340],                                                // baby 1
        ['go', 380],
        ['hold', ['right'], (p) => p.ground && p.bottom === 304],
        ['go', 395],
        ['wait', spiderUp(1)],
        ['go', 728],
        ['climb', 192],
        ['hold', ['right'], (p) => p.x > 800 && p.ground && p.bottom === 304],
        ['go', 790],
        ['wait', spiderUp(3)],
        ['go', 845],                                                // baby 2
        ['wait', spiderUp(4)],
        ['go', 1108],
        ['hopOnto', 1128, (p) => p.vy < -300],                    // spring 2
        ['wait', (p) => p.ground && p.bottom === 160],
        ['go', 1165],                                               // baby 3
        ['hold', ['right'], (p) => p.ground && p.bottom === 304],
        ['go', 1464],
    ]);
}

// ───────────────────────────────────────────── Level 9: The Haunted Library
export function botLevel9() {
    // Predict where each lantern beam will hit the floor over the next few
    // seconds (copying the librarians' simple movement) and only move when
    // the path ahead stays dark.
    // Will any lantern beam touch the mouse while it walks from x to tx and
    // then waits there for `linger` ms? Behind a book stack counts as safe.
    const beamHits = (s, x, y, tx, linger) => {
        const SPEED = 32, PAUSE = 1300, LEN = 200, ANG = 1.05, HALF = 0.33;
        const travel = Math.abs(tx - x) / 130 * 1000;
        const dir = Math.sign(tx - x);
        for (const l of s.librarians) {
            let lx = l.sprite.x, ldir = l.dir, pauseLeft = Math.max(0, l.pauseUntil - s.t);
            for (let t = 0; t <= travel + linger; t += 50) {
                const bx = t < travel ? x + dir * 130 * (t / 1000) : tx;
                const covered = s.covers.some((c) => Math.abs(bx - c) < 10);
                if (!covered) {
                    const ox = lx + 14 * ldir, oy = l.baseY + 8;
                    const dx = bx - ox, dy = y - oy;
                    let diff = Math.atan2(dy, dx) - (ldir > 0 ? ANG : Math.PI - ANG);
                    while (diff > Math.PI) diff -= 2 * Math.PI;
                    while (diff < -Math.PI) diff += 2 * Math.PI;
                    if (Math.hypot(dx, dy) < LEN + 12 && Math.abs(diff) < HALF + 0.15) return true;
                }
                if (pauseLeft > 0) pauseLeft -= 50;
                else {
                    lx += ldir * SPEED * 0.05;
                    if (lx >= l.maxX || lx <= l.minX) { lx = Math.max(l.minX, Math.min(l.maxX, lx)); ldir *= -1; pauseLeft = PAUSE; }
                }
            }
        }
        return false;
    };
    // sneak to tx (usually the next book stack). Once moving, keep going.
    const sneak = (tx, linger = 0, highY) => ['fn', (p, set) => {
        if (Math.abs(p.x - tx) <= 3) { window.__moving = false; return true; }
        const safe = !beamHits(p.s, p.x, p.y, tx, linger) && (highY === undefined || !beamHits(p.s, p.x, highY, tx + 100, linger));
        if (!window.__moving && p.ground && safe) window.__moving = true;
        if (window.__moving) set(tx > p.x ? 'right' : 'left', true);
        return false;
    }];
    const commitReset = ['fn', () => { window.__moving = false; return true; }];
    const covers = [232, 424, 680, 840, 1096, 1256, 1416, 1672];
    const steps = [];
    const hop = (x) => { steps.push(commitReset, sneak(x)); };
    hop(232); hop(424);
    steps.push(commitReset, sneak(440, 3500, 165), ['jump', 440, 1, (p) => p.ground && p.bottom === 192], ['go', 500], ['hopOnto', 536, (p) => p.ground && p.bottom === 176],
        ['go', 536], ['hold', ['right'], (p) => p.ground && p.bottom === 240]);
    hop(680); hop(840);
    steps.push(commitReset, sneak(936, 4500, 150), ['climb', 160], ['go', 984], ['hold', ['right'], (p) => p.ground && p.bottom === 240 && p.x > 1010]);
    hop(1096); hop(1256); hop(1416);
    steps.push(commitReset, sneak(1450, 3000, 180), ['go', 1462], ['hopOnto', 1488, (p) => p.ground && p.bottom === 192], ['hold', ['right'], (p) => p.ground && p.bottom === 240],
        ['go', 1560]);
    hop(1672); hop(1736);
    void covers;
    window.__runSteps('Level9Scene', () => steps);
}

// ───────────────────────────────────────────── Level 10: Bell the Cat
export function botLevel10() {
    const L = (bottom) => (p) => p.ground && p.bottom === bottom;
    const round = () => [
        ['go', 104],
        ['climb', 144],
        ['go', 56],                                                      // yarn basket
        ['wait', (p) => p.s.carrying],
        ['go', 104],
        ['wait', (p) => p.s.cat.x > 420 && p.s.cstate === 'prowl'],
        ['hold', ['down'], (p) => p.ground && !p.climbing && p.bottom === 240],
        ['go', 200],
        ['tap', 'action'],                                               // drop the yarn
        ['go', 104],
        ['climb', 144],
        ['wait', (p) => p.s.cstate === 'play'],
        ['hold', ['down'], (p) => p.ground && !p.climbing && p.bottom === 240],
        ['fn', (p, set) => {                                             // sneak up to its head
            const hx = p.s.headX();
            if (p.s.cstate !== 'play') return true;
            if (Math.abs(p.x - hx) < 14) { set('action', true); return true; }
            set(p.x < hx ? 'right' : 'left', true);
            return false;
        }],
        ['wait', (p) => p.s.cstate !== 'play'],
    ];
    window.__runSteps('Level10Scene', (s) => {
        const steps = [];
        // up to 6 tries at belling the cat (some rounds may be too slow)
        for (let i = 0; i < 6; i++) {
            const r = round();
            steps.push(['skipIf', (p) => p.s.bells >= 3, r.length], ...r);
        }
        void s;
        steps.push(['wait', (p) => p.s.cstate === 'gone'], ['go', 664]);
        void L;
        return steps;
    });
}
