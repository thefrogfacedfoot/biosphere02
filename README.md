# biosphere/02

> a small forest under the stars

A single-page personal site styled like a desktop environment — but the desktop is the night sky over a glowing biosphere. Drag the windows around, plant a seed and watch it grow, draw your own constellations in the sky. Everything is built with vanilla HTML, CSS, and JavaScript. No frameworks. No build step. No password.

## Try it

Open `index.html` in any modern browser. That's it.

Or serve it locally if you want hot reload:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## What's in here

```
biosphere02/
├── index.html   # markup for the 8 windows + background canvases
├── styles.css   # space/nature theme — mossy greens against deep navy
└── app.js       # window manager, starfield, fireflies, custom features
```

## Features

### the welcome page
- on first visit a full-screen splash fades in: title, three tips, and a "step inside ✦" button
- dismissal persists; the splash never reappears (except via `~/settings`)
- skipped for visitors who arrive on a shared-sky link — they came for someone's constellation, not an intro

### the desktop
- 13 draggable windows: `~/about.md`, `~/devlog/`, `~/projects/`, `~/greenhouse 🌿`, `~/status`, `~/contact`, `~/constellation-studio ✦`, `~/ambient-orbit 🪐`, `~/mycelium 🍄`, `~/atlas 📜`, `~/cabin 🔥`, `~/forecast 🌤`, `~/settings ⚙`
- titlebar drag (pointer events — works on trackpads + touch)
- minimize → taskbar, close → taskbar, maximize, resize-from-corner
- soft snap to screen edges
- click-to-focus z-ordering
- positions and open/closed state persist across refreshes via `localStorage`
- **⌘K / `/`** → command palette to fuzzy-find any window and bring it forward (also un-minimizes / un-closes it)

### the background
- 200+ procedural twinkling stars on a `<canvas>`
- 14 drifting fireflies with perlin-ish wandering motion
- slow aurora wash and ground fog for depth
- live moon-phase calculator in the `~/status` window
- **shooting stars** streak across the sky every 15-30 seconds, with a faint curving arc and a trail
- **day/night cycle** based on your local clock — dawn gets a pink wash, day opens up the sky, dusk goes amber, night settles into deep navy. fireflies thin out in daylight.
- **seasons** by month — spring drops cherry petals, summer pulses extra fireflies, autumn drifts amber leaves, winter scatters slow snow. lockable in `~/settings`.
- **a reflection pond** along the bottom of the screen with shimmery reflected stars. click to ripple it.
- **lily pads** drift across the pond. click one and a small ✦ jumps from the pad like a frog blip.
- **a wandering fox** 🦊 trots along the pond's shoreline every minute or two. hover to pause, click to spot (counts in `~/status`).
- **a twilight owl** 🦉 occasionally glides across the upper sky at night. click to spot — same counter as the fox.
- **bottles** drift across the pond carrying small fragments — poems, koans, quiet thoughts. click one to read what's inside. count in `~/status`.

### the constellation atlas 📜
- six famous shapes (Orion, Cassiopeia, Big Dipper, Cygnus, Leo, Lyra) drawn from unit-space coords
- each entry has a tiny preview, a one-line myth, and a "stamp" button
- stamping drops the constellation onto your sky (the first star carries the name as its label) — the button flips to "stamped ✓" so you don't accidentally double-stamp the same shape

### the cabin 🔥
- a small SVG fire pit in `~/cabin`. feed it with the 🪵 add log button
- warmth decays in real time (30 points per hour) — leave for an evening and you'll come back to embers
- intensity drives the live flames (size, color), ember particles floating out of the window, and an amber glow on the bottom-left of the desktop. warmth shows up in `~/status` as "cold ash · smoldering · ember · warm · crackling · blazing 🔥"

### the forecast 🌤
- a 7-day biosphere forecast in `~/forecast` — meteor showers, aurora drifts, ground fog, thin moons, soft rain, season-tinted events (petal drift / firefly bloom / leaf wind / first snow)
- deterministic from each day's date so it doesn't shift under you on refresh
- if today's forecast is "meteor shower" the shooting-star rate is boosted (~5-11s instead of 15-30s); if it's "aurora drift" the aurora layer brightens

### the smaller shore & sky things
Nine small self-contained shoreline elements that each latch onto a different existing system rather than introducing new ones:

- **pinwheel** 🎡 — a wooden pinwheel on a stick in the upper shore. idles with a slow spin, accelerates on `body.wind-gust`. click cycles through four palette sets (ember / ocean / moss / mist).
- **fossil stone** 🍂 — a flat river rock on the lower shore with a pressed-fern frond imprint. click reads a one-line description (name · era · note) of the next specimen out of a curated six.
- **driftwood signpost** 🪧 — a wooden post with two carved arrow signs on the right shore. click cycles the two plates together through ten paired destinations (→ the moon, ↑ the past, ← the chapel, …).
- **singing bowl** 🔔 — a small brass bowl on the right shore. click strikes a soft sustained tone whose pitch is modulated by `--pond-h` so the bowl reads as "in tune with the pond water". lazy shared `AudioContext`, arms on first pointerdown, respects the mute/reduced-motion settings.
- **moon-journal** 🍂 — a small wood-bound ledger showing today's moon phase. click cycles through the full eight phases as SVG overlay paths. counter persists.
- **mushroom-log** 🍄ᵗ — four mushroom caps on a fallen log (chanterelle, turkey tail, oyster, amethyst deceiver). click reads the next specimen via toast. counter persists.
- **tide-whistle** 🎵 — a leaning hollow reed pitched to `--pond-h` (17vh→220hz, 19vh→280hz, same math as the singing bowl). its own lazy AudioContext, separate from the bowl pool. counter persists.
- **rain-spout** 💧 — a brass downspout that drops a single water bead on click; autodrips every 4-7s on rain-forecast days (`forecastFor(new Date()).kind === "rain"`) while the tab is visible. counter persists.
- **kelp** 🌿 — three pond-side stalks that sway on `body.wind-gust` (kp-idle / kp-sway keyframes) and prod on click (one-shot `kp-prod` keyframe). counter persists.

### the greenhouse 🌱
Plant a seed and water it. The plant grows through 6 SVG stages (seed → sprout → sapling → young tree → thriving tree → ancient grove) based on two signals:
- **water** (short-term — every click counts)
- **days seen** (long-term loyalty — distinct calendar days you've visited)

Glowing fruit appears at the final stage. Your plant's state survives refreshes.

### the constellation studio ✦
The night sky behind the windows is interactive:

- **click empty sky** → drop a star
- **click one star, then another** → draw a glowing line between them
- **double-click a star** → name it
- **hover a line** → it glows brighter

Stars and lines persist. Your own sky waits for you next time you visit.

### ambient orbit 🪐
Generative procedural ambient music. Nothing is pre-recorded — every note is synthesized live in your browser via Web Audio:

- two **detuned sawtooth oscillators** at 110 Hz form a slow drone
- a **breathing low-pass filter** (LFO at 0.06 Hz) opens and closes over ~16 seconds
- **occasional bells** ping on a random pentatonic note every 25-60 seconds
- volume slider styled like a dewdrop

### mycelium notes 🍄
A tiny linked-notes system in 80-ish lines of vanilla JS:

- write a note with a title and a body
- link other notes inline with `[[name]]`
- **hover any note** to see every other note that links to it (or that it links to) light up in warm orange
- click a `[[link]]` to jump to that note (or create it on the spot if it doesn't exist yet)
- everything persists in `localStorage`

## Devlogs

The `~/devlog/` window inside the site is the live changelog. Four entries so far covering background polish, window-manager work, the constellation studio, and the late-night session that brought ambient orbit, mycelium notes, shooting stars, the day/night cycle, and the command palette.

## Design notes

- **Theme**: bioluminescent forest under deep space. The two ideas (space and nature) blend through the green text glowing against dark blue panes — phosphorescence against night sky.
- **Color**: moss `#8fd49a` against navy `#060914`. Warm `#ffd9a0` for stars and accents.
- **Typography**: system sans for prose, monospace for filenames and metrics.
- **Motion**: nothing is sharp. Stars twinkle slowly, fireflies wander rather than bounce, the aurora drifts on a 28-second loop.

## Stack

- HTML + CSS + JavaScript
- Zero dependencies. Zero build step.
- Works offline once loaded.

## License

MIT. Take ideas. Plant your own forest.
