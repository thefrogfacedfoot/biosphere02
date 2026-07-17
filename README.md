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

### four new shore & sky pieces (devlog #40)
Four small pieces that each latch onto a different system already running. Same shared lazy AudioContext pool as devlog #39; same per-feature v1 counter keys with no cross-references.

- **petrified acorn** 🪨 — left-shore gravel at left:168. click cracks the husk open via a 700ms pa-shell-shake + pa-cap-lift + pa-appear keyframe chain, revealing a polished red agate within. state persists via `biosphere02.petrifiedacorn.open.v1`. **second click** re-triggers the keyframes via remove + rAF add so a bead that's already cracked still gets the wobble, instead of no-op. body.aurora-peak sets a faint red drop-shadow filter on the revealed agate. counter: cracks.
- **dusk gnat swarm** 🦟 — seven small dots hovering over the right cattails at top:32vh left:32vw. each gnat has its own `@keyframes dgs-drift-N` lazy 6-7s figure-eight micro-loop. click removes .drifting, adds .dispersing; per-gnat CSS custom props `--dgs-dx/--dgs-dy` (set by app.js at init AND re-assigned every click for a unique pattern) fly each gnat to its own angle. after 1500ms .drifting re-applies. counter: dispersions.
- **glass dewdrop** 💧 — a tiny glass bead at top:240 right:92. click pops it: `.popped` class fades opacity 220ms, a `.gdd-halo` div is spawned at the bead's center coordinate and removed after 800ms, and a 60-second regen timer gates re-appearance via the timestamp `biosphere02.glassdewdrop.last.v1`. clicks during the 60-second window are ignored. counter: beads popped.
- **haiku slip** 📝 — pinned cream paper above the dock zone at top:168 left:30vw. foreignObject hosts `<div id="haiku-text">` containing three italic serif lines. click cycles through 6 haikus via a 220ms `.fading` opacity transition + innerHTML swap. persisted idx so reload mid-cycle reads the same poem the user was reading. counter: slips read.

### five new shore & shelf pieces (devlog #41)
Five small pieces, none of them creatures (sixteen plus the luna moth is plenty), none of them opening new windows, none adding fresh dependency trees. Each one latches onto a body-class system already running rather than spawning fresh pollers:

- **tin whistle** 🎵 — a 6-hole tin whistle on a leather lanyard at top:96 right:300, opposite the glass dewdrop's right:92. click fires `tw2-bounce` 380ms keyframe on the tube + a 4-note ascending sine cascade (200/280/380/480hz, 70ms staggered) via the shared `playFeatureSine` helper. holes briefly brighten via the `.played` class for a visible "you blew a note" feedback. counter persists to `biosphere02.tinwhistle.v1`. counter: tin whistles played.
- **iron keys** 🗝 — a ring of three antique skeleton keys on a brass hook at top:240 right:300, opposite the glass dewdrop but inland of the aurora-needle's right:64. cluster idles via `ik-idle` 5.4s keyframe (rotate ±2deg); `body.aurora-peak` accelerates it to 2.4s — the iron "knows" the storm is up regardless of whether you've looked at the magnetometer's Kp readout. click fires `ik-shake` 320ms (rotate ±4deg four times) + one 760hz sine clink. counter persists to `biosphere02.ironkeys.v1`. counter: keyrings jingled.
- **lichen mandala** 🟢 — concentric-ring lichen colony on a flat stone at left:96 bottom:240, well below the echo-drum and 40px above the lower edge. each click grows one new outermost ring (cap 8) via an innerHTML rebuild; the new ring carries the `.lm-ring-enter` class for one frame so the `lm-ring-grow` CSS keyframe (scale 0→1 over 280ms ease-out) interpolates a visible expansion. only the newest ring animates — older rings re-render at their target size without re-animation. `body.dusk` and `body.night` filter-rule the lichen via hue-rotate; `body.season-winter` saturates contrast — no js poll, just css rules waiting on the body class. counter persists to `biosphere02.lichenmandala.v1` + `biosphere02.lichenmandala.rings.v1` so a returning user sees their last growth state. counter: lichen steps.
- **tally stick** 🪵 — a short driftwood plank at the upper-left edge (top:128 left:8). each click adds one tick via createElementNS (cap 20 clicks per bundle; at 20 the bundle resets for visual variety, but the count keeps incrementing so progress is never lost). tick fill shifts via CSS: `body.season-winter` = frost-bright #d9e8ee, `body.season-summer` = warm-amber #8c4a26. `body.aurora-peak` adds a red drop-shadow filter so the wood "glows on aurora nights" without any js arm/disarm logic. counter persists to `biosphere02.tallystick.v1` + `biosphere02.tallystick.ticks.v1`. counter: ticks carved.
- **paper boat** ⛵ — a folded paper boat at left:152 bottom:170, 6px horizontally clear of the echo-drum's worst-case x:146 footprint and 70px above the lichen-mandala. click plays the 720ms `pb-launch` keyframe (translate +34px, scale 0.92, rotate 8°, opacity →0) with animation-fill-mode forwards; the 750ms JS setTimeout that clears `.launched` is essential, otherwise fill-mode forwards would leave the boat at the 100% (opacity:0) state forever — do not delete it. `body.wind-gust`'s `pb-sail-flutter` skews the sail (-6deg, 1.4s ease-in-out infinite). `body.rain-day` darkens the hull (brightness 0.86 saturate 0.7) so the paper visibly "gets wet" — a quiet visual joke. counter persists to `biosphere02.paperboat.v1`. counter: boats launched.

All five share the devlog #39 + #40 lazy `_featureCtxRef` AudioContext pool — adding five more oscillators doesn't require a sixth pool. Each counter follows the established `biosphere02.<name>.v1` convention with no cross-references — a future feature named "tin-whistle", "iron-keys", "lichen", "tally", or "paper" tomorrow cannot collide with these counters. the lichen-mandala additionally has a `biosphere02.lichenmandala.rings.v1` subkey (current ring count, cap 8) and tally-stick has a `biosphere02.tallystick.ticks.v1` subkey (current tick count, cap 20) so a returning user resumes on their last growth state rather than starting from 4 rings / 0 ticks. total added DOM cost ~3.4kb against a baseline scene that already has ~85 svg nodes.

### five more shore pieces (devlog #39)
Five more self-contained elements that each latch onto a system already running:

- **echo drum** 🥁 — a small frame drum on the left shore. click fires a skin-squash keyframe + low 140hz sine + a `.ed-ring` water pulse that expands 1.6s toward scale 1.1. if a second click lands inside a 4-second "tide reflection window" the drum returns three staggered echoes at scales 0.72 / 0.50 / 0.34. window state persists via `biosphere02.echodrum.window.v1` so a reload mid-streak doesn't reset the chance. counter: strikes.
- **ice bubbles** 🧊 — a frost-grey wand on the right shore opposite the summer bubble-wand. only functions on cold days (`body.season-winter` or `body.motion-cold` via a one-line `ibIsColdDay()` helper, no js poll). click spawns 2-4 perfectly spherical ice bubbles that drift up for ~30s; clicking any bubble pops it via a 420ms shrink + four frost flecks. counter increments **on pop**, not on spawn — passive drift doesn't inflate the tab. counter: ice bubbles broken.
- **smoke rune writer** 🪶 — a brass pipe with beeswax tip on the upper-left shelf. click picks one of 8 curated rune path strings (`triangle / wave / eye / feather / branch / crossed-arrows / coil / dot-cluster`) and emits an 8-second curling smoke svg. the entire `#srw-runes-host` skews ~14° on `body.wind-gust` via a single css rule — no js poll, the class change ripples into a transform in the same frame. counter: runes inscribed.
- **aurora needle** 🧭 — a brass sextant-like instrument on the upper-right back shore. distinct from the existing `#magnetometer` (the brass cylinder at left:418 with a NOAA-fetched Kp needle): this one is a much simpler quietly-tilting brass compass whose `.an-needle` tilt paces the 7s `an-tilt` keyframe, accelerates on `body.aurora-peak`, shakes on `body.aurora-storm`. click locks a bearing (writes `biosphere02.auroraneedle.angle.v1`) and emits an expanding 1.2s arc + faint 880hz sine chime. counter: bearings locked. (the math mirrors the keyframe phase so a locked bearing reads true to what the eye was tracking.)
- **shadow cloth theater** 🎭 — a cream cloth pinned between the third cattail bunch (`left:62vw`, just below the waterline). click cycles through 6 silhouettes (bird / fish / fox / moth / leaf / wave) via a `st-flip` scaleX keyframe that scales to 0.05 at 50% and back, swapping the puppet path at 230ms so the second half of the flip shows the new shape. cloth is pinned with two visible twine lines and two ground stakes. counter: silhouettes cast.

All five share a single lazy `AudioContext` pool (`_featureCtxRef` — separate from the existing instrument pools so a stuck context keeps only the new features silent). Each counter persists to `biosphere02.<name>.v1` with no cross-references — a future feature named "drum" tomorrow cannot collide with raindrum; one named "rune" cannot collide with ours.

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

### six new shore & sky pieces (devlog #42)
Six small additions latching onto systems already running. Each independent — tapping into body.dawn, body.aurora-peak, body.rain-day, body.season-autumn, --pond-h, and body.stargazer rather than spawning fresh pollers. Counters all use the established `biosphere02.<name>.v1` convention with no cross-references; audio routes through the devlog #39 `_featureCtxRef` pool that already serves the previous click-driven features — adding six oscillators doesn't spawn a seventh pool.

- **dew-catcher** 🌿 — two crossed twigs lashed near the moss-runestone & moonflower row, at left:88, with delicate web threads cradling a single bead. body.dawn swells the droplet via a `transform: scale(1.45)` + soft cyan glow on `.dc-drop-body`; the bead sits compact for the rest of the day. click shakes the bead loose via the 460ms `dc-shake` keyframe + a 1320Hz crystalline sine ping through the shared audio pool. counter persists to `biosphere02.dewcatcher.v1`. counter: dews shaken.
- **prism-stone** ✨ — a small faceted hexagonal glass crystal resting on the gravel at left:200, just below the paper-boat row. body.aurora-peak kicks in the 8s linear `ps-rotate` keyframe on `.ps-prism` + hue-rotate(60deg) saturate(2.0) brightness(1.25) so the prism "refracts" a slow rotating gradient of green and violet. click adds a 480ms one-shot `ps-glint` brightness pulse and a 580Hz triangle-wave glass hum. counter persists to `biosphere02.prismstone.v1`. counter: prisms struck.
- **copper-rain-gauge** 🌧️ — a slender oxidized copper cylinder at left:340 with a clear-glass insert and a tiny brass cap. js polls the body `rain-day` / `forecast-rain` class every 60s and writes y/height to the `.crg-water` rect (fill: y=12 height=38, drain: y=50 height=0); the 1100ms cubic-bezier transition on the rect's y/height keeps the fill reading as weather, not a snap. click adds a 400ms one-shot `crg-tip` rotate(9deg) keyframe and a hollow 220Hz sine plink. counter persists to `biosphere02.copperraingauge.v1`. counter: gauge tips.
- **acorn-top** 🍂 — a small carved acorn-cap spinning top on a flat stone at right:140, between the dock-bell and the bench. body.season-autumn fades the `.ac-autumn-leaves` group from opacity 0 to 1 over 600ms; other seasons the reads as a bare stone with a top sitting in blank gravel (no animation cost off-season). click adds a 1.6s one-shot `ac-spin` rotation on the `.ac-top` group + a low 180Hz sawtooth whir; the sawtooth wave isn't band-passed because the wood resonance reads correctly low without further shaping. counter persists to `biosphere02.acorntop.v1`. counter: tops spun.
- **driftwood-rider** 🛶 — a small two-plank driftwood raft with a leaf-mast sail riding the pond surface just right of the dock. bottom tracks --pond-h via the same `transition: bottom 1100ms ease` every other shore element uses; the wind-gust class rotates the `.dr-sail` -10deg with skewX(-4deg) over 700ms so the sail flutters convincingly in gusts without a per-frame loop. click nudges the rider via a 480ms one-shot `dr-nudge` translate(8px)+rotate(2deg) keyframe + a layered click sound (120Hz triangle creak, then 2200Hz sine splash tick at +220ms staggered). counter persists to `biosphere02.driftwoodrider.v1`. counter: nudges.
- **brass-astrolabe** 🧭 — a small flat brass navigational instrument at top:148 left:32vw, fitting in the gap between the devlog #36 top-shelf row at top:64 and the devlog #37 row at top:184. body.stargazer triggers a one-shot 2200ms cubic-bezier alignment transition on `.ba-inner-ring`, ending at rotate(0deg) so the inner ring coincides with the outer compass rose; an additional ambient drop-shadow applies when the gaze is on the rings. click adds a 380ms one-shot `ba-ratchet` (12deg → 6deg → 3deg → 0deg) keyframe + an 880Hz square-wave tick. the square wave at 880Hz is short enough (160ms) that the sound reads "metallic click" rather than "buzzy". counter persists to `biosphere02.brassastrolabe.v1`. counter: alignments.

Six pure additions; total DOM cost ~2.6kb against a baseline scene that already has ~85 svg nodes. No new windows, no new dependency trees.

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
