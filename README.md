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
- 8 draggable windows: `~/about.md`, `~/devlog/`, `~/projects/`, `~/greenhouse 🌿`, `~/status`, `~/contact`, `~/constellation-studio ✦`
- titlebar drag (pointer events — works on trackpads + touch)
- minimize → taskbar, close → taskbar, maximize, resize-from-corner
- soft snap to screen edges
- click-to-focus z-ordering
- positions and open/closed state persist across refreshes via `localStorage`

### the background
- 200+ procedural twinkling stars on a `<canvas>`
- 14 drifting fireflies with perlin-ish wandering motion
- slow aurora wash and ground fog for depth
- live moon-phase calculator in the `~/status` window

### the greenhouse 🌱
Plant a seed and water it. The plant grows through 6 SVG stages (seed → sprout → sapling → young tree → thriving tree → ancient grove) based on two signals:
- **water** (short-term — every click counts)
- **days seen** (long-term loyalty — distinct calendar days you've visited)

Glowing fruit appears at the final stage. Your plant's state survives refreshes.

### the constellation studio ✦
This is the part that isn't in any guide. The night sky behind the windows is interactive:

- **click empty sky** → drop a star
- **click one star, then another** → draw a glowing line between them
- **double-click a star** → name it
- **hover a line** → it glows brighter

Stars and lines persist. Your own sky waits for you next time you visit.

## Devlogs

The `~/devlog/` window inside the site is the live changelog. Three entries so far covering background polish, window-manager work, and the constellation studio.

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
