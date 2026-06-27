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

### the desktop
- 10 draggable windows: `~/about.md`, `~/devlog/`, `~/projects/`, `~/greenhouse 🌿`, `~/status`, `~/contact`, `~/constellation-studio ✦`, `~/ambient-orbit 🪐`, `~/mycelium 🍄`
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
