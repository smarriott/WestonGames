# Mouse on the Run 🐭

A spooky-but-silly pixel-art platformer for kids. You're a little mouse escaping a
haunted house over one long night: ten levels, from a ladder climb over the cat's
pit to a final showdown where you have to put a bell on the cat itself.

Plays in any modern browser on a **laptop, phone or tablet**.

## Run it locally

You need [Node.js](https://nodejs.org) 18 or newer.

```bash
npm install
npm run dev
```

Then open the URL it prints (usually <http://localhost:5173>). To play on a
phone or tablet on the same Wi-Fi, run `npm run dev -- --host` and open the
"Network" URL on the device.

### Build a static copy (for hosting or offline play)

```bash
npm run build      # outputs to dist/
npm run preview    # serves dist/ locally to check it
```

`dist/` is a plain static site: upload it anywhere (Netlify settings are already
in `netlify.toml`). The only thing loaded from the internet is the pixel font
(Google Fonts); without it the game falls back to a monospace font.

## How to play

| | Keyboard | Touch screen |
|---|---|---|
| Run | ← → or A D | Left pad |
| Climb ladders | ↑ ↓ or W S | Left pad up / down |
| Jump | Space (↑ / W also jumps when not on a ladder) | **JUMP** button |
| Hide / set a trap / drop yarn / ring the bell | E (or Enter) | Action button (its icon shows what it will do) |
| Pause | P or Esc, or the ⏸ button | ⏸ button |
| Restart level | R | Pause → Restart |

On phones, hold the device sideways (the game asks you to if you don't). Levels
zoom in a little on phones so everything is easier to see.

**Tip for the biggest screen on iPhone/iPad:** open the game in Safari, tap the
Share button, then **Add to Home Screen**. Launched from the home screen icon it
runs full screen without Safari's address bar. (On Android, the ⛶ button in the
game goes full screen.)

If you get caught, the level restarts right away. Finished levels unlock in the
title screen's level picker.

### The levels

1. **The Ladders**: jump and climb to the glowing mouse hole. Miss a ladder and
   you fall into the dark pit, where a giant cat pops out. Collect cheese for fun.
2. **The Escape**: the screen keeps moving and a fast cat chases you. Hop over
   the giant fans (their wind blows you back), dodge goo dripping from the windows,
   and jump the goo puddles.
3. **Hide and Outsmart**: a giant patrols the bedroom. It can't see you, but it
   *hears* you running on the floor. Get traps from the trap box on the shelf, set
   them where the giant walks, and hide (mouse house, under the bed, the open
   drawer, the locker) when it comes stomping. A blinking red shadow means a foot
   is about to come down. Three snapped traps knock the giant out. Grab its key!
4. **Toy Box Trouble**: collect 4 batteries to power the toy rocket. Bounce on
   jack-in-the-boxes to reach high shelves, ride the toy train across the big gap,
   and hop over the wind-up robot mice. Then blast off!
5. **Bath Time Flood**: the tub is filling up and mice can't swim! Climb to the
   window before the water catches you. A rubber duck floats you up the tall gap
   and bubbles bounce you higher.
6. **The Ghost Kitchen**: fetch the BIG cheese from the far end of the kitchen and
   carry it home. The ghosts are shy: they freeze while you look at them and creep
   closer when you turn away. Wait for the stove flames to die down before crossing.
7. **Lights Out**: a pitch-black basement where you only see a small circle around
   you. Fireflies join you and make it bigger. Find the fuse box to turn the lights
   on and unlock the exit. Watch the glowing eyes in the wall holes: a cat paw
   swipes out after them!
8. **Spider Attic**: free 3 baby mice stuck in spider webs. Webs are sticky,
   spiders dangle up and down, and old mattress springs bounce you up high.
9. **The Haunted Library**: find 3 lost pages while ghost librarians sweep their
   lantern beams. Get caught in the light and it's "SHHH!" Hide behind book stacks.
10. **Bell the Cat**: the final boss. Take yarn from the basket and drop it on the
    floor: the cat can't resist playing with it. While it plays, sneak up and clip a
    bell to its collar. Watch out when it crouches and wiggles: it's about to
    pounce! Three bells and the jingly cat runs away. Escape into the sunrise!

## Project layout

```
src/
  main.ts              Phaser setup (pixel-perfect scaling, physics, scenes)
  config.ts            screen size, physics tuning, level list
  assets/              ALL art, generated in code (no image files needed)
    palette.ts           colour palette
    pixels.ts            tiny pixel-drawing toolkit
    sprites.ts           sprites and tiles for levels 1-3, drawn as pixel maps
    sprites2.ts          sprites for levels 4-10
    textures.ts          turns them into Phaser textures + animations
  audio/Sound.ts       all sound effects and music, synthesised with Web Audio
  input/               keyboard + on-screen touch controls, merged
  game/                player controller, tilemap builder, saved progress
  levels/              level maps as plain text (+ the parser/reachability check)
  scenes/              Boot, Title, Level 1-10 (shared BaseLevelScene), Win
  ui/                  text and button helpers
tests/                 level-beatability and sprite tests (Vitest)
scripts/
  export-sprites.ts    writes every sprite to assets/sprites/*.png
  smoke-test.mjs       plays every level in a headless browser
  bots.mjs             the bots for levels 4-10 used by the smoke test
  play-bot.mjs         watch one bot play one level: node scripts/play-bot.mjs 7
assets/sprites/        exported PNGs of all the pixel art (_all.png = overview)
legacy/                the previous prototype code, kept for reference only
```

### Editing levels

Levels are text maps in `src/levels/level*.ts`. `#` is a solid block, `=` a
shelf you can jump up through, `H` a ladder, `L` a ladder with a shelf on top,
and other letters place things (see the comment at the top of each file; `#`,
`=`, `H`, `L` and `.` are reserved). Run `npm test` afterwards: it checks that
every level can still be finished, and `npm run smoke` plays them for real.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Type-check + production build into `dist/` |
| `npm test` | Unit tests: maps parse, every level is finishable, sprites are valid |
| `npm run smoke` | Builds, then bots play all ten levels in headless Chromium, about 6 minutes (needs `npx playwright install chromium` once) |
| `npm run export-sprites` | Re-export the pixel art PNGs into `assets/sprites/` |

Handy for testing: add `?level=7` (any of 1-10) to the URL to jump straight to a level.
