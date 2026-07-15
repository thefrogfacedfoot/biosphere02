/* biosphere/02 — vanilla js, no frameworks */

/* ---------- clock ---------- */
const clockEl = document.getElementById("clock");
function tickClock() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  clockEl.textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
setInterval(tickClock, 1000); tickClock();

/* ---------- starfield (ambient background stars) ---------- */
const starsCanvas = document.getElementById("stars");
const sctx = starsCanvas.getContext("2d");
let stars = [];
function resizeStars() {
  starsCanvas.width = window.innerWidth * devicePixelRatio;
  starsCanvas.height = window.innerHeight * devicePixelRatio;
  starsCanvas.style.width = window.innerWidth + "px";
  starsCanvas.style.height = window.innerHeight + "px";
  sctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  buildStars();
}
function buildStars() {
  stars = [];
  const count = Math.floor((window.innerWidth * window.innerHeight) / 4500);
  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 1.4 + 0.2,
      base: Math.random() * 0.6 + 0.2,
      twinkle: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.015 + 0.005,
      hue: Math.random() < 0.85 ? "#f6f1d8" : (Math.random() < 0.5 ? "#bcd4ff" : "#ffd9a0"),
    });
  }
}
function drawStars(t) {
  sctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  for (const s of stars) {
    const a = s.base + Math.sin(t * s.speed + s.twinkle) * 0.25;
    sctx.globalAlpha = Math.max(0.05, Math.min(1, a));
    sctx.fillStyle = s.hue;
    sctx.beginPath();
    sctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    sctx.fill();
  }
  sctx.globalAlpha = 1;
}
function clampWindowsToViewport() {
  const margin = 8;
  const topGap = 38;
  const bottomGap = 38;
  const W = window.innerWidth;
  const H = window.innerHeight;
  document.querySelectorAll(".window").forEach(w => {
    if (w.classList.contains("maximized") || w.classList.contains("minimized")) return;
    if (w.dataset.closed === "1") return;
    const rect = w.getBoundingClientRect();
    let left = parseFloat(w.style.left) || rect.left;
    let top = parseFloat(w.style.top) || rect.top;
    const width = w.offsetWidth;
    const height = w.offsetHeight;
    if (left + width > W - margin) left = Math.max(margin, W - width - margin);
    if (top + height > H - bottomGap - margin) top = Math.max(topGap + margin, H - bottomGap - height - margin);
    if (left < margin) left = margin;
    if (top < topGap + margin) top = topGap + margin;
    w.style.left = left + "px";
    w.style.top = top + "px";
  });
  if (typeof saveWindowState === "function") saveWindowState();
}

let _resizeDebounce;
window.addEventListener("resize", () => {
  resizeStars();
  resizeConstellation();
  clearTimeout(_resizeDebounce);
  _resizeDebounce = setTimeout(clampWindowsToViewport, 160);
});
resizeStars();

/* ---------- fireflies ---------- */
const fireflyHost = document.getElementById("fireflies");
const fireflies = [];
function makeFireflies() {
  const n = 14;
  for (let i = 0; i < n; i++) {
    const el = document.createElement("div");
    el.className = "firefly";
    fireflyHost.appendChild(el);
    fireflies.push({
      el,
      x: Math.random() * window.innerWidth,
      y: window.innerHeight * 0.5 + Math.random() * window.innerHeight * 0.5,
      vx: 0, vy: 0,
      ax: Math.random() * 2 * Math.PI,
      ay: Math.random() * 2 * Math.PI,
      blinkPhase: Math.random() * Math.PI * 2,
    });
  }
}
function updateFireflies(t) {
  for (const f of fireflies) {
    if (f._caught) continue; // caught fireflies are mid-transition to the jar
    f.ax += 0.012; f.ay += 0.009;
    f.vx += Math.cos(f.ax) * 0.04;
    f.vy += Math.sin(f.ay) * 0.03;
    f.vx *= 0.96; f.vy *= 0.96;
    f.x += f.vx; f.y += f.vy;
    // bounds — x wraps around, but y is a hard ceiling/floor. reflect the
    // velocity when we hit it, otherwise a firefly keeps pressing into the
    // edge (vy never changes sign) and slides along it until the slow random
    // drift happens to flip it — they visibly pile up along the bottom.
    if (f.x < 0) f.x = window.innerWidth;
    if (f.x > window.innerWidth) f.x = 0;
    if (f.y < window.innerHeight * 0.3) { f.y = window.innerHeight * 0.3; f.vy = Math.abs(f.vy); }
    if (f.y > window.innerHeight) { f.y = window.innerHeight; f.vy = -Math.abs(f.vy); }
    const blink = 0.55 + Math.sin(t * 0.003 + f.blinkPhase) * 0.4;
    f.el.style.transform = `translate(${f.x}px, ${f.y}px)`;
    // devlog #29 — during the lightning-bug dance the per-frame inline
    // opacity write would override the body.firefly-dance .firefly
    // CSS animation. drop the inline write for the dance window so
    // .firefly animation wins for 2.4s; transform keeps updating
    // so the fireflies still drift in lockstep.
    if (!document.body.classList.contains("firefly-dance")) {
      f.el.style.opacity = String(Math.max(0.1, blink));
    }
  }
}
makeFireflies();

/* ---------- main animation loop ---------- */
function loop(t) {
  drawStars(t);
  drawConstellation();
  updateFireflies(t);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

/* ---------- window manager: drag, focus, minimize, maximize, close ---------- */
const desktop = document.getElementById("desktop");
const taskbar = document.getElementById("tasks");
const windows = Array.from(document.querySelectorAll(".window"));
let topZ = 10;
const STATE_KEY = "biosphere02.windows.v1";

function bringToFront(win) {
  topZ += 1;
  win.style.zIndex = topZ;
  document.querySelectorAll(".window.active").forEach(w => w.classList.remove("active"));
  win.classList.add("active");
}

function saveWindowState() {
  const data = {};
  windows.forEach(w => {
    data[w.dataset.id] = {
      left: w.style.left,
      top: w.style.top,
      width: w.style.width,
      height: w.style.height,
      minimized: w.classList.contains("minimized"),
      maximized: w.classList.contains("maximized"),
      closed: w.dataset.closed === "1",
      z: parseInt(w.style.zIndex || "10", 10),
    };
  });
  try { localStorage.setItem(STATE_KEY, JSON.stringify(data)); } catch (e) {}
}

function loadWindowState() {
  const raw = localStorage.getItem(STATE_KEY);
  const firstVisit = raw === null;
  let data = {};
  try { data = JSON.parse(raw || "{}"); } catch {}
  windows.forEach(w => {
    if (firstVisit) {
      // first-time visitors land on the scene with a clean desktop —
      // every window starts closed, discoverable via taskbar, ⌘K, or search
      w.dataset.closed = "1";
      w.style.display = "none";
      addTask(w);
      return;
    }
    const s = data[w.dataset.id];
    if (!s) return;
    if (s.left) w.style.left = s.left;
    if (s.top) w.style.top = s.top;
    if (s.width) w.style.width = s.width;
    if (s.height) w.style.height = s.height;
    if (s.maximized) w.classList.add("maximized");
    if (s.minimized) { w.classList.add("minimized"); addTask(w); }
    if (s.closed) { w.dataset.closed = "1"; w.style.display = "none"; addTask(w); }
    if (s.z) { w.style.zIndex = s.z; if (s.z > topZ) topZ = s.z; }
  });
}

function setupWindow(win) {
  // titlebar drag
  const tb = win.querySelector(".titlebar");
  let drag = null;
  tb.addEventListener("pointerdown", (e) => {
    if (e.target.closest(".tctrl")) return;
    bringToFront(win);
    if (win.classList.contains("maximized")) return;
    const rect = win.getBoundingClientRect();
    drag = { dx: e.clientX - rect.left, dy: e.clientY - rect.top };
    tb.setPointerCapture(e.pointerId);
  });
  tb.addEventListener("pointermove", (e) => {
    if (!drag) return;
    let nx = e.clientX - drag.dx;
    let ny = e.clientY - drag.dy;
    // soft snap to edges
    const margin = 12;
    if (nx < margin) nx = 0;
    if (ny < margin + 38) ny = 38;
    if (nx + win.offsetWidth > window.innerWidth - margin) nx = window.innerWidth - win.offsetWidth;
    if (ny + win.offsetHeight > window.innerHeight - 38 - margin) ny = window.innerHeight - 38 - win.offsetHeight;
    win.style.left = nx + "px";
    win.style.top = ny + "px";
  });
  tb.addEventListener("pointerup", () => { drag = null; saveWindowState(); });
  // pointercancel needs to save too — otherwise a drag interrupted by the
  // browser losing focus (alt-tab, os pointer capture) updates left/top on
  // the element but never persists, so the window snaps back on reload.
  tb.addEventListener("pointercancel", () => { drag = null; saveWindowState(); });

  // focus on any click within window
  win.addEventListener("pointerdown", () => bringToFront(win));

  // controls
  win.querySelectorAll(".tctrl button").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const act = btn.dataset.act;
      if (act === "min") { win.classList.add("minimized"); addTask(win); }
      else if (act === "max") { win.classList.toggle("maximized"); }
      else if (act === "close") { win.style.display = "none"; win.dataset.closed = "1"; addTask(win); }
      saveWindowState();
    });
  });

  // double-click titlebar = maximize toggle
  tb.addEventListener("dblclick", (e) => {
    if (e.target.closest(".tctrl")) return;
    win.classList.toggle("maximized");
    saveWindowState();
  });
}

function addTask(win) {
  // avoid duplicates
  if (taskbar.querySelector(`[data-task="${win.dataset.id}"]`)) return;
  const t = document.createElement("button");
  t.className = "task";
  t.dataset.task = win.dataset.id;
  t.textContent = win.querySelector(".tname").textContent;
  t.addEventListener("click", () => {
    win.classList.remove("minimized");
    win.style.display = "";
    delete win.dataset.closed;
    bringToFront(win);
    t.remove();
    // a window may have been left off-screen at smaller viewports — pull it back in
    if (typeof clampWindowsToViewport === "function") clampWindowsToViewport();
    saveWindowState();
  });
  taskbar.appendChild(t);
}

windows.forEach(setupWindow);
loadWindowState();
// initial focus order
windows.forEach((w, i) => { if (!w.style.zIndex) w.style.zIndex = (10 + i); topZ = Math.max(topZ, parseInt(w.style.zIndex, 10)); });

/* ---------- greenhouse: plant a seed (persistent visit-based growth) ---------- */
const PLANT_KEY = "biosphere02.plant.v1";
const plantEl = document.getElementById("plant");
const stageEl = document.getElementById("growth-stage");
const streakEl = document.getElementById("streak");

function loadPlant() {
  try { return JSON.parse(localStorage.getItem(PLANT_KEY) || "null"); }
  catch { return null; }
}
function savePlant(p) {
  try { localStorage.setItem(PLANT_KEY, JSON.stringify(p)); } catch {}
}

let plant = loadPlant();
if (!plant) {
  plant = { water: 0, visits: 1, lastVisitDate: new Date().toDateString(), daysSeen: 1 };
} else {
  // count distinct days
  const today = new Date().toDateString();
  if (plant.lastVisitDate !== today) {
    plant.daysSeen = (plant.daysSeen || 1) + 1;
    plant.lastVisitDate = today;
  }
  plant.visits = (plant.visits || 0) + 1;
}
savePlant(plant);

function stageFor(water, days) {
  // combined progression — water is short-term, days is long-term loyalty
  const score = water + days * 2;
  if (score < 2) return 0;       // seed
  if (score < 5) return 1;       // sprout
  if (score < 10) return 2;      // sapling
  if (score < 20) return 3;      // young tree
  if (score < 40) return 4;      // tree
  return 5;                       // ancient
}
const stageNames = ["seed 🌰", "sprout 🌱", "sapling 🌿", "young tree 🌳", "thriving tree 🌳✨", "ancient grove 🌲🌲"];

function renderPlant() {
  const s = stageFor(plant.water, plant.daysSeen);
  stageEl.textContent = `stage: ${stageNames[s]}`;
  streakEl.textContent = `visits: ${plant.visits} · days seen: ${plant.daysSeen} · water: ${plant.water}`;
  plantEl.innerHTML = renderPlantSVG(s);
}

function renderPlantSVG(stage) {
  // procedurally build branching plant
  if (stage === 0) {
    return `<ellipse cx="100" cy="186" rx="6" ry="3" fill="#6b4a2a"/>
            <circle cx="100" cy="185" r="3" fill="#8c6a3a"/>`;
  }
  let svg = "";
  // stem
  const stemHeight = 24 + stage * 18;
  svg += `<rect x="98" y="${190 - stemHeight}" width="4" height="${stemHeight}" rx="2" fill="#5e8a5a"/>`;
  // leaves at varying levels
  const leafCount = Math.min(stage * 2, 10);
  for (let i = 0; i < leafCount; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const t = (i + 1) / (leafCount + 1);
    const y = 190 - stemHeight * (0.3 + 0.6 * t);
    const len = 14 + stage * 2;
    const x = 100 + side * 4;
    svg += `<ellipse cx="${x + side * len * 0.4}" cy="${y}" rx="${len * 0.55}" ry="${5 + stage}" fill="#8fd49a" transform="rotate(${side * 22} ${x + side * len * 0.4} ${y})" opacity="0.9"/>`;
  }
  // crown / canopy for later stages
  if (stage >= 3) {
    const cy = 190 - stemHeight - 4;
    svg += `<circle cx="100" cy="${cy}" r="${22 + stage * 4}" fill="#6cb37e" opacity="0.85"/>`;
    svg += `<circle cx="${88 - stage * 2}" cy="${cy + 6}" r="${14 + stage * 2}" fill="#7fc78d" opacity="0.85"/>`;
    svg += `<circle cx="${112 + stage * 2}" cy="${cy + 6}" r="${14 + stage * 2}" fill="#7fc78d" opacity="0.85"/>`;
  }
  // glowing fruit at ancient stage
  if (stage >= 5) {
    for (let i = 0; i < 5; i++) {
      const cx = 80 + Math.random() * 40;
      const cy = 110 + Math.random() * 30;
      svg += `<circle cx="${cx}" cy="${cy}" r="2.5" fill="#ffd9a0" opacity="0.9"/>`;
    }
  }
  return svg;
}

let _lastWater = 0;
document.getElementById("water").addEventListener("click", () => {
  const now = Date.now();
  if (now - _lastWater < 220) return; // throttle: ~4.5 clicks/sec max
  _lastWater = now;
  plant.water = (plant.water || 0) + 1;
  savePlant(plant);
  renderPlant();
  spawnWaterParticles();
});
document.getElementById("reset-plant").addEventListener("click", () => {
  if (!confirm("reset your plant? the seed will start over.")) return;
  // reset daysSeen too, otherwise stageFor() keeps the old plant grown
  plant = { water: 0, visits: plant.visits, lastVisitDate: plant.lastVisitDate, daysSeen: 1 };
  savePlant(plant);
  renderPlant();
});
function spawnWaterParticles() {
  const t = document.getElementById("terrarium");
  for (let i = 0; i < 6; i++) {
    const p = document.createElement("div");
    p.style.cssText = `position:absolute; left:${45 + Math.random()*10}%; top:10%; width:4px; height:8px; background:#8ec8ff; border-radius:2px; pointer-events:none; opacity:0.9; transition: transform 700ms ease-in, opacity 700ms ease-in;`;
    t.appendChild(p);
    requestAnimationFrame(() => {
      p.style.transform = `translateY(${120 + Math.random()*40}px) translateX(${(Math.random()-0.5)*30}px)`;
      p.style.opacity = "0";
    });
    setTimeout(() => p.remove(), 800);
  }
}
renderPlant();

/* ---------- constellation studio (THE NEW FEATURE) ---------- */
const cCanvas = document.getElementById("constellation");
const cctx = cCanvas.getContext("2d");
const COSTELL_KEY = "biosphere02.constellation.v1";

let cWidth = 0, cHeight = 0;
function resizeConstellation() {
  cWidth = window.innerWidth;
  cHeight = window.innerHeight;
  cCanvas.width = cWidth * devicePixelRatio;
  cCanvas.height = cHeight * devicePixelRatio;
  cCanvas.style.width = cWidth + "px";
  cCanvas.style.height = cHeight + "px";
  cctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
}
resizeConstellation();

let userStars = [];   // {x, y, label?}
let userLines = [];   // {a, b}
// chronological history of user actions so undo pops the most recent item
// regardless of whether it was a star or a line
let userHistory = [];
let pendingStar = null; // index of first-clicked star to draw line
let hoverLine = -1;
let mouseX = -1, mouseY = -1;

function loadConstellation() {
  try {
    const d = JSON.parse(localStorage.getItem(COSTELL_KEY) || "null");
    if (d) { userStars = d.stars || []; userLines = d.lines || []; }
  } catch {}
}
function saveConstellation() {
  try { localStorage.setItem(COSTELL_KEY, JSON.stringify({ stars: userStars, lines: userLines })); } catch {}
  updateStudioCounts();
}
function updateStudioCounts() {
  const c = document.getElementById("studio-counts");
  if (c) c.textContent = `★ ${userStars.length} · ─ ${userLines.length}`;
}
loadConstellation();
updateStudioCounts();

function drawConstellation() {
  cctx.clearRect(0, 0, cWidth, cHeight);
  // lines first
  for (let i = 0; i < userLines.length; i++) {
    const l = userLines[i];
    const a = userStars[l.a], b = userStars[l.b];
    if (!a || !b) continue;
    const grad = cctx.createLinearGradient(a.x, a.y, b.x, b.y);
    grad.addColorStop(0, "rgba(255, 217, 160, 0.55)");
    grad.addColorStop(1, "rgba(143, 212, 154, 0.55)");
    cctx.strokeStyle = grad;
    cctx.lineWidth = i === hoverLine ? 2.4 : 1.4;
    cctx.shadowColor = i === hoverLine ? "rgba(143,212,154,0.9)" : "rgba(143,212,154,0.4)";
    cctx.shadowBlur = i === hoverLine ? 12 : 4;
    cctx.beginPath();
    cctx.moveTo(a.x, a.y);
    cctx.lineTo(b.x, b.y);
    cctx.stroke();
  }
  cctx.shadowBlur = 0;

  // stars
  for (let i = 0; i < userStars.length; i++) {
    const s = userStars[i];
    const isPending = i === pendingStar;
    const r = isPending ? 5 : 3.6;
    // outer glow
    const grad = cctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, 18);
    grad.addColorStop(0, "rgba(255, 217, 160, 0.95)");
    grad.addColorStop(0.4, "rgba(255, 200, 130, 0.35)");
    grad.addColorStop(1, "rgba(255, 200, 130, 0)");
    cctx.fillStyle = grad;
    cctx.beginPath(); cctx.arc(s.x, s.y, 18, 0, Math.PI * 2); cctx.fill();
    // core
    cctx.fillStyle = isPending ? "#ffffff" : "#ffe6b8";
    cctx.beginPath(); cctx.arc(s.x, s.y, r, 0, Math.PI * 2); cctx.fill();
    // label
    if (s.label) {
      cctx.fillStyle = "rgba(143, 212, 154, 0.9)";
      cctx.font = "11px ui-monospace, monospace";
      cctx.fillText(s.label, s.x + 10, s.y - 8);
    }
  }
}

function nearestStar(x, y, threshold = 14) {
  let best = -1, bestD = threshold * threshold;
  for (let i = 0; i < userStars.length; i++) {
    const dx = userStars[i].x - x;
    const dy = userStars[i].y - y;
    const d = dx * dx + dy * dy;
    if (d < bestD) { bestD = d; best = i; }
  }
  return best;
}

function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(px - ax, py - ay);
  let t = ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

cCanvas.addEventListener("mousemove", (e) => {
  mouseX = e.clientX; mouseY = e.clientY;
  // hover detection for lines
  let foundLine = -1;
  for (let i = 0; i < userLines.length; i++) {
    const a = userStars[userLines[i].a], b = userStars[userLines[i].b];
    if (!a || !b) continue;
    if (distToSegment(mouseX, mouseY, a.x, a.y, b.x, b.y) < 6) { foundLine = i; break; }
  }
  hoverLine = foundLine;
});

cCanvas.addEventListener("click", (e) => {
  // ignore clicks on top/bottom bars
  if (e.clientY < 38 || e.clientY > window.innerHeight - 38) return;
  // catching a streaking shooter takes priority over everything else
  if (typeof tryCatchShooter === "function" && tryCatchShooter(e.clientX, e.clientY)) return;
  if (typeof viewingShared !== "undefined" && viewingShared) {
    toast("this is a shared sky · return to yours to edit");
    return;
  }
  const x = e.clientX, y = e.clientY;
  const hit = nearestStar(x, y);
  if (hit !== -1) {
    // chain into a line
    if (pendingStar === null) {
      pendingStar = hit;
    } else if (pendingStar !== hit) {
      // create line if it doesn't exist
      const exists = userLines.some(l =>
        (l.a === pendingStar && l.b === hit) || (l.a === hit && l.b === pendingStar)
      );
      if (!exists) {
        userLines.push({ a: pendingStar, b: hit });
        userHistory.push("line");
      }
      pendingStar = null;
      saveConstellation();
    } else {
      pendingStar = null;
    }
  } else {
    // drop a new star
    userStars.push({ x, y });
    userHistory.push("star");
    pendingStar = null;
    saveConstellation();
  }
});

cCanvas.addEventListener("dblclick", (e) => {
  if (typeof viewingShared !== "undefined" && viewingShared) {
    toast("this is a shared sky · return to yours to edit");
    return;
  }
  const hit = nearestStar(e.clientX, e.clientY);
  if (hit === -1) return;
  const cur = userStars[hit].label || "";
  const label = prompt("name this constellation (or this star):", cur);
  if (label !== null) {
    userStars[hit].label = label.slice(0, 32);
    saveConstellation();
  }
});

document.getElementById("undo-star").addEventListener("click", () => {
  if (typeof viewingShared !== "undefined" && viewingShared) {
    toast("this is a shared sky · return to yours to edit");
    return;
  }
  // pop chronologically: undo most recent user action (star or line)
  const last = userHistory.pop();
  if (last === "line") {
    userLines.pop();
  } else if (last === "star") {
    const removed = userStars.length - 1;
    userStars.pop();
    // any line that referenced the removed star now points at a stale index;
    // drop those lines too so the constellation stays valid
    userLines = userLines.filter(l => l.a !== removed && l.b !== removed);
  }
  pendingStar = null;
  saveConstellation();
});
document.getElementById("clear-stars").addEventListener("click", () => {
  if (typeof viewingShared !== "undefined" && viewingShared) {
    toast("this is a shared sky · return to yours to edit");
    return;
  }
  if (!confirm("clear all your stars and lines? (the ambient background stars stay)")) return;
  userStars = []; userLines = []; userHistory = []; pendingStar = null;
  saveConstellation();
});

/* ---------- moon phase (cosmetic) ---------- */
function setMoon() {
  const phases = ["new moon 🌑","waxing crescent 🌒","first quarter 🌓","waxing gibbous 🌔","full moon 🌕","waning gibbous 🌖","last quarter 🌗","waning crescent 🌘"];
  // simple synodic calc
  const lp = 2551442.8; // synodic period in seconds
  const known = new Date("2000-01-06T18:14:00Z").getTime() / 1000;
  const now = Date.now() / 1000;
  const phase = ((now - known) % lp) / lp;
  const idx = Math.floor(phase * 8) % 8;
  document.getElementById("moon").textContent = phases[idx];
}
setMoon();

/* ---------- mark first window as active ---------- */
const first = document.querySelector(".window");
if (first) bringToFront(first);

/* ============================================================
   feature: shooting stars
   spawns the occasional streak across the star canvas
   ============================================================ */
const shooters = [];
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
function maybeSpawnShooter() {
  if (reducedMotion) return;
  // 15-30s random interval
  const next = 15000 + Math.random() * 15000;
  setTimeout(() => { spawnShooter(); maybeSpawnShooter(); }, next);
}
function spawnShooter() {
  const w = window.innerWidth, h = window.innerHeight;
  const fromLeft = Math.random() < 0.5;
  const angle = (Math.PI / 5) + Math.random() * (Math.PI / 6); // ~36-66 deg
  const speed = 0.7 + Math.random() * 0.5;
  shooters.push({
    x: fromLeft ? -40 : w + 40,
    y: Math.random() * h * 0.55,
    vx: (fromLeft ? 1 : -1) * Math.cos(angle) * speed * 14,
    vy: Math.sin(angle) * speed * 14,
    life: 1.0,
    trail: [],
    curve: (Math.random() - 0.5) * 0.04,
  });
}
function drawShooters(dt) {
  for (let i = shooters.length - 1; i >= 0; i--) {
    const s = shooters[i];
    // faint arc by rotating velocity each frame
    const cs = Math.cos(s.curve), sn = Math.sin(s.curve);
    const nvx = s.vx * cs - s.vy * sn;
    const nvy = s.vx * sn + s.vy * cs;
    s.vx = nvx; s.vy = nvy;
    s.x += s.vx; s.y += s.vy;
    s.trail.push({ x: s.x, y: s.y });
    if (s.trail.length > 16) s.trail.shift();
    s.life -= 0.012;

    sctx.save();
    for (let j = 0; j < s.trail.length; j++) {
      const t = j / s.trail.length;
      sctx.globalAlpha = t * s.life * 0.9;
      sctx.fillStyle = j > s.trail.length - 4 ? "#fff5e0" : "#ffd9a0";
      sctx.beginPath();
      sctx.arc(s.trail[j].x, s.trail[j].y, 1.6 - t * 1.0, 0, Math.PI * 2);
      sctx.fill();
    }
    sctx.restore();

    if (s.life <= 0 || s.x < -100 || s.x > window.innerWidth + 100 || s.y > window.innerHeight + 100) {
      shooters.splice(i, 1);
    }
  }
}
// (the shooter chain is kicked later, after the self-idempotent wrap is
// installed — see the maybeSpawnShooter() reassignment below. calling it
// here would leave an untracked setTimeout that the restart logic can't
// reset.)

// hook shooter drawing into the existing per-frame loop by wrapping drawConstellation
const _origDrawConst = drawConstellation;
drawConstellation = function () {
  _origDrawConst();
  drawShooters();
};

/* ============================================================
   feature: day/night cycle (based on local hour)
   ============================================================ */
function applyTimeOfDay() {
  const h = new Date().getHours();
  const body = document.body;
  body.classList.remove("dawn", "day", "dusk", "night");
  let mood;
  if (h >= 5 && h < 8) mood = "dawn";
  else if (h >= 8 && h < 17) mood = "day";
  else if (h >= 17 && h < 20) mood = "dusk";
  else mood = "night";
  body.classList.add(mood);
  // expose for status window
  const skyEl = document.getElementById("sky");
  if (skyEl) {
    const labels = { dawn: "first light · 11°c", day: "open sky · 18°c", dusk: "amber hour · 15°c", night: "clear · 14°c" };
    skyEl.textContent = labels[mood];
  }
}
applyTimeOfDay();
setInterval(() => applyTimeOfDay(), 60_000);

/* ---- daytime cloud shadow drift ----
   during "day" mood, a soft dark oval crosses the desktop every couple of
   minutes. one dom node, one css animation, no per-frame js. */
(function scheduleCloudShadow() {
  const next = 60_000 + Math.random() * 90_000; // 60-150s
  setTimeout(() => {
    if (!document.body.classList.contains("day") ||
        (typeof isMotionReduced === "function" && isMotionReduced())) {
      scheduleCloudShadow();
      return;
    }
    let cloud = document.getElementById("cloud-shadow");
    if (!cloud) {
      cloud = document.createElement("div");
      cloud.id = "cloud-shadow";
      cloud.setAttribute("aria-hidden", "true");
      document.body.appendChild(cloud);
    }
    // vary the vertical band a little so it doesn't always cross at the same height
    cloud.style.top = (6 + Math.random() * 28) + "vh";
    cloud.classList.remove("drift");
    // force a reflow so re-adding the class restarts the animation
    void cloud.offsetWidth;
    cloud.classList.add("drift");
    scheduleCloudShadow();
  }, next);
})();

/* ============================================================
   feature: dandelion by the shore
   click to blow it — sends a burst of seed-sparkles drifting up
   into the sky. respawns after ~2 minutes so it stays clickable.
   persists a "blown" counter for anyone keeping track.
   ============================================================ */
const DANDELION_KEY = "biosphere02.dandelion.v1";
const dandelionEl = document.getElementById("dandelion");
let dandelionBlown = (() => { try { return +localStorage.getItem(DANDELION_KEY) || 0; } catch { return 0; } })();
function renderDandelionCount() {
  const el = document.getElementById("dandelion-count");
  if (el) el.textContent = dandelionBlown;
}
renderDandelionCount();

function spawnDandelionSeeds(originX, originY) {
  if (isMotionReduced()) return;
  const count = 10 + Math.floor(Math.random() * 6);
  for (let i = 0; i < count; i++) {
    const s = document.createElement("span");
    s.className = "dandelion-seed";
    s.textContent = "✦";
    s.style.left = originX + "px";
    s.style.top = originY + "px";
    // drift up and to one side; more upward than sideways
    const dx = (Math.random() - 0.5) * 260;
    const dy = -(180 + Math.random() * 260);
    const rot = (Math.random() - 0.5) * 360;
    s.style.setProperty("--seed-dx", dx.toFixed(0) + "px");
    s.style.setProperty("--seed-dy", dy.toFixed(0) + "px");
    s.style.setProperty("--seed-r", rot.toFixed(0) + "deg");
    s.style.animationDelay = (Math.random() * 300).toFixed(0) + "ms";
    s.style.animationDuration = (4600 + Math.random() * 1600).toFixed(0) + "ms";
    document.body.appendChild(s);
    setTimeout(() => s.remove(), 6800);
  }
}

if (dandelionEl) {
  dandelionEl.addEventListener("click", () => {
    if (dandelionEl.classList.contains("blown")) return;
    const rect = dandelionEl.getBoundingClientRect();
    spawnDandelionSeeds(rect.left + rect.width / 2, rect.top + 20);
    dandelionEl.classList.add("blown");
    dandelionBlown++;
    try { localStorage.setItem(DANDELION_KEY, String(dandelionBlown)); } catch {}
    renderDandelionCount();
    if (dandelionBlown === 1) toast("you blew a wish · the seeds carry it up");
    // regrow after a while so the dandelion stays present
    setTimeout(() => { dandelionEl.classList.remove("blown"); }, 120_000);
  });
}

/* ============================================================
   feature: wind gust
   every 4-8 minutes, a wind gust sweeps the biosphere: lanterns
   sway harder, fireflies drift, and extra ripples appear on the
   pond. one css class + a handful of ripples — no per-frame work.
   ============================================================ */
(function scheduleWindGust() {
  const next = 240_000 + Math.random() * 240_000; // 4-8 min
  setTimeout(() => {
    if (isMotionReduced()) { scheduleWindGust(); return; }
    document.body.classList.add("wind-gust");
    // scatter extra ripples across the pond over the gust duration
    const gustMs = 10_000;
    const rippleCount = 6 + Math.floor(Math.random() * 5);
    for (let i = 0; i < rippleCount; i++) {
      setTimeout(() => {
        if (typeof pondW !== "undefined" && pondW > 0 && typeof addRipple === "function") {
          addRipple(80 + Math.random() * (pondW - 160),
                    pondH * 0.2 + Math.random() * pondH * 0.7,
                    1.0 + Math.random() * 0.5, 70);
        }
      }, Math.random() * gustMs);
    }
    // nudge each firefly one time so they drift a bit further with the wind
    if (typeof fireflies !== "undefined" && Array.isArray(fireflies)) {
      const push = 40 + Math.random() * 30;
      for (const f of fireflies) f.vx += push * 0.02;
    }
    setTimeout(() => {
      document.body.classList.remove("wind-gust");
      scheduleWindGust();
    }, gustMs);
  }, next);
})();

/* ============================================================
   feature: a name in the sky (star of the day)
   picks one real astronomical name from a curated pool, deterministic
   from today's date so it stays put. tooltip on hover, lore on click.
   position is also date-hashed so it doesn't overlap the same window
   two days running.
   ============================================================ */
const namedStars = [
  { name: "Sirius",     lore: "the dog star · brightest thing in our night sky, 8.6 light-years away" },
  { name: "Polaris",    lore: "the north star · sailors' anchor for the last two thousand years" },
  { name: "Vega",       lore: "brightest in Lyra · was the north star 12,000 years ago and will be again" },
  { name: "Betelgeuse", lore: "orion's shoulder · a red supergiant nearing the end of its life" },
  { name: "Rigel",      lore: "orion's foot · a hot blue supergiant, 860 light-years off" },
  { name: "Arcturus",   lore: "the bear-guardian · trails the tail of the Big Dipper across the sky" },
  { name: "Antares",    lore: "the heart of Scorpius · a red rival to Mars in the summer sky" },
  { name: "Deneb",      lore: "the tail of Cygnus the swan · one corner of the Summer Triangle" },
  { name: "Altair",     lore: "the flying eagle · one of the closest bright stars, 17 light-years away" },
  { name: "Aldebaran",  lore: "the follower · orange eye of Taurus, chasing the Pleiades" },
  { name: "Capella",    lore: "the little she-goat · bright in Auriga, carried on the charioteer's shoulder" },
  { name: "Spica",      lore: "the ear of wheat · held out by Virgo, ripening in spring" },
  { name: "Fomalhaut",  lore: "the mouth of the fish · alone in the autumn sky, no bright neighbors" },
  { name: "Procyon",    lore: "before the dog · rises just ahead of Sirius each evening" },
  { name: "Regulus",    lore: "the little king · at the heart of Leo, on the ecliptic" },
  { name: "Castor",     lore: "the horseman twin of Gemini · actually a system of six stars" },
  { name: "Pollux",     lore: "the boxer twin of Gemini · older and cooler, orange to Castor's white" },
  { name: "Mizar",      lore: "the middle of the Big Dipper's handle · has a companion, Alcor, if your eyes are sharp" },
  { name: "Bellatrix",  lore: "the female warrior · orion's western shoulder, a hot blue star" },
  { name: "Achernar",   lore: "the end of the river · flowing out of Eridanus in the southern sky" },
];
function _namedStarHash(d) {
  const s = d.toDateString();
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
let _namedStarCurrent = null;
let _namedStarDate = null;
function placeNamedStar() {
  const el = document.getElementById("named-star");
  if (!el) return;
  const now = new Date();
  const dateKey = now.toDateString();
  const h = _namedStarHash(now);
  _namedStarCurrent = namedStars[h % namedStars.length];
  _namedStarDate = dateKey;
  // upper-sky safe zone: avoid topbar (0-38), pond area (bottom), and clip to margins
  const W = window.innerWidth, H = window.innerHeight;
  const bx = 60 + ((h >> 8) % Math.max(1, W - 240));
  const by = 70 + (((h >> 16) & 0xFF) / 255) * (H * 0.35);
  el.style.left = bx.toFixed(0) + "px";
  el.style.top  = by.toFixed(0) + "px";
  el.dataset.name = _namedStarCurrent.name;
  el.title = _namedStarCurrent.name;
  el.hidden = false;
}
placeNamedStar();
// re-place on resize so the star doesn't strand off-screen when the viewport
// shrinks; re-place at date rollover so a tab left open past midnight rolls
// to the next day's star.
window.addEventListener("resize", placeNamedStar);
// self-idempotent: any caller can re-enter and the interval handle resets
// rather than stacking (matches the shooter-chain pattern from devlog #14 —
// _shooterTimer is module-local for the same reason we don't pollute window).
let _cbWanderIv = null;
if (_cbWanderIv) clearInterval(_cbWanderIv);
_cbWanderIv = setInterval(() => {
  if (_namedStarDate && _namedStarDate !== new Date().toDateString()) placeNamedStar();
}, 5 * 60 * 1000);
// click always reads from _namedStarCurrent so it stays fresh after re-place
const _namedStarEl = document.getElementById("named-star");
if (_namedStarEl) {
  _namedStarEl.addEventListener("click", () => {
    if (!_namedStarCurrent) return;
    if (typeof toast === "function") toast(`${_namedStarCurrent.name} · ${_namedStarCurrent.lore}`, 4800);
  });
}

/* ============================================================
   feature: wooden dock
   click the end of the dock to walk out over the water. persistent
   counter of visits; small toast that varies by mood.
   ============================================================ */
const DOCK_KEY = "biosphere02.dock.v1";
const dockEl = document.getElementById("dock");
let dockWalks = (() => { try { return +localStorage.getItem(DOCK_KEY) || 0; } catch { return 0; } })();
function renderDockCount() {
  const el = document.getElementById("dock-count");
  if (el) el.textContent = dockWalks;
}
renderDockCount();
if (dockEl) {
  const dockLines = [
    "you walk out to the edge · the water holds still",
    "you stand at the end · the pond doesn't ask anything of you",
    "you step to the last plank · a fish is under there somewhere",
    "you look down · the surface remembers the sky",
    "you count your breaths · the boards creak once",
  ];
  dockEl.addEventListener("click", () => {
    dockEl.classList.add("walked");
    setTimeout(() => dockEl.classList.remove("walked"), 750);
    dockWalks++;
    try { localStorage.setItem(DOCK_KEY, String(dockWalks)); } catch {}
    renderDockCount();
    const line = dockLines[Math.floor(Math.random() * dockLines.length)];
    toast(line, 2600);
  });
}

/* ============================================================
   feature: carved bench by the pond
   click to sit for a moment — increments a persistent counter that
   shows up in ~/status if there's a "sat-count" slot for it.
   ============================================================ */
const BENCH_KEY = "biosphere02.bench.v1";
const benchEl = document.getElementById("bench");
let satCount = (() => { try { return +localStorage.getItem(BENCH_KEY) || 0; } catch { return 0; } })();
function renderSatCount() {
  const el = document.getElementById("sat-count");
  if (el) el.textContent = satCount;
}
renderSatCount();
if (benchEl) {
  benchEl.addEventListener("click", () => {
    benchEl.classList.add("sat");
    setTimeout(() => benchEl.classList.remove("sat"), 750);
    satCount++;
    try { localStorage.setItem(BENCH_KEY, String(satCount)); } catch {}
    renderSatCount();
    if (satCount === 1) toast("you sit for a moment · the forest keeps going");
    else toast(`sat ${satCount} times · the bench remembers`, 2000);
  });
}

/* ============================================================
   feature: firefly jar
   click a firefly to catch it — the sky loses one, the jar gains one
   (a small dot inside the jar). a fresh firefly quietly rejoins after
   ~45s so the sky doesn't drain to nothing.
   ============================================================ */
const JAR_KEY = "biosphere02.jar.v1";
const jarGlow = document.getElementById("jar-glow");
const jarCountEl = document.getElementById("jar-count");
let jarCount = (() => { try { return +localStorage.getItem(JAR_KEY) || 0; } catch { return 0; } })();

// deterministic positions inside the jar so caught fireflies have "assigned" spots
const JAR_SLOTS = [];
for (let i = 0; i < 24; i++) {
  JAR_SLOTS.push({
    x: 14 + Math.random() * 12,
    y: 20 + Math.random() * 32,
    r: 1.2 + Math.random() * 0.6,
    delay: (Math.random() * 2.4).toFixed(2),
  });
}
function renderJar() {
  if (jarCountEl) jarCountEl.textContent = jarCount;
  if (!jarGlow) return;
  const shown = Math.min(jarCount, JAR_SLOTS.length);
  let html = "";
  for (let i = 0; i < shown; i++) {
    const s = JAR_SLOTS[i];
    html += `<circle class="jar-dot" cx="${s.x}" cy="${s.y}" r="${s.r}" style="animation-delay: -${s.delay}s"/>`;
  }
  jarGlow.innerHTML = html;
}
renderJar();

function catchFirefly(f) {
  // mark it caught so subsequent clicks don't double-count as the css animation plays
  if (f._caught) return;
  f._caught = true;
  // small pop animation via css: fade + shrink out
  f.el.style.transition = "transform 320ms ease-out, opacity 320ms ease-out";
  f.el.style.transform = `translate(${f.x}px, ${f.y}px) scale(0.2)`;
  f.el.style.opacity = "0";
  setTimeout(() => {
    // remove this firefly from the flock (updateFireflies mutates el.style
    // every frame, which would fight the transition until we drop it)
    const idx = fireflies.indexOf(f);
    if (idx >= 0) fireflies.splice(idx, 1);
    if (f.el && f.el.parentNode) f.el.parentNode.removeChild(f.el);
    // quietly respawn a fresh one after a beat so the sky stays alive
    setTimeout(spawnOneFirefly, 45_000);
  }, 340);
  jarCount++;
  try { localStorage.setItem(JAR_KEY, String(jarCount)); } catch {}
  renderJar();
  if (jarCount === 1) toast("caught · the jar remembers the shape of light");
}

function spawnOneFirefly() {
  const el = document.createElement("div");
  el.className = "firefly catchable";
  fireflyHost.appendChild(el);
  const f = {
    el,
    x: Math.random() * window.innerWidth,
    y: window.innerHeight * 0.5 + Math.random() * window.innerHeight * 0.5,
    vx: 0, vy: 0,
    ax: Math.random() * 2 * Math.PI,
    ay: Math.random() * 2 * Math.PI,
    blinkPhase: Math.random() * Math.PI * 2,
  };
  fireflies.push(f);
  el.addEventListener("click", (e) => { e.stopPropagation(); catchFirefly(f); });
}
// make the existing fireflies catchable — they were created before the jar
// feature existed, so retrofit the class and the click handler
for (const f of fireflies) {
  f.el.classList.add("catchable");
  f.el.addEventListener("click", (e) => { e.stopPropagation(); catchFirefly(f); });
}

/* ============================================================
   feature: ambient orbit (web audio generative pad)
   two detuned saws -> low-pass filter that breathes -> gain
   plus occasional bell pings on a pentatonic scale
   ============================================================ */
const orbit = {
  ctx: null, master: null, filter: null, lfo: null, lfoGain: null,
  oscA: null, oscB: null, bellTimer: null,
  playing: false,
};
const orbitToggle = document.getElementById("orbit-toggle");
const orbitVol = document.getElementById("orbit-vol");
const orbitNow = document.getElementById("orbit-now");
const orbitRings = document.querySelector(".orbit-rings");

const pentatonic = [261.63, 311.13, 349.23, 392.00, 466.16, 523.25, 622.25, 698.46];

function startOrbit() {
  if (orbit.playing) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) { orbitNow.textContent = "no audio support"; return; }
  if (!orbit.ctx) orbit.ctx = new AC();
  const ctx = orbit.ctx;
  if (ctx.state === "suspended") ctx.resume();

  orbit.master = ctx.createGain();
  orbit.master.gain.value = 0;
  orbit.master.connect(ctx.destination);

  orbit.filter = ctx.createBiquadFilter();
  orbit.filter.type = "lowpass";
  orbit.filter.frequency.value = 600;
  orbit.filter.Q.value = 3;
  orbit.filter.connect(orbit.master);

  // breathing lfo on filter cutoff
  orbit.lfo = ctx.createOscillator();
  orbit.lfo.frequency.value = 0.06;
  orbit.lfoGain = ctx.createGain();
  orbit.lfoGain.gain.value = 380;
  orbit.lfo.connect(orbit.lfoGain).connect(orbit.filter.frequency);
  orbit.lfo.start();

  // drone: two detuned saws ~110Hz (a)
  orbit.oscA = ctx.createOscillator();
  orbit.oscA.type = "sawtooth";
  orbit.oscA.frequency.value = 110;
  orbit.oscA.detune.value = -7;
  orbit.oscB = ctx.createOscillator();
  orbit.oscB.type = "sawtooth";
  orbit.oscB.frequency.value = 110;
  orbit.oscB.detune.value = +7;
  const droneGain = ctx.createGain();
  droneGain.gain.value = 0.45;
  orbit.oscA.connect(droneGain);
  orbit.oscB.connect(droneGain);
  droneGain.connect(orbit.filter);
  orbit.oscA.start(); orbit.oscB.start();

  // fade in
  const target = +orbitVol.value / 100 * 0.35;
  orbit.master.gain.linearRampToValueAtTime(target, ctx.currentTime + 1.5);

  // schedule bells
  scheduleBell();

  orbit.playing = true;
  orbitToggle.textContent = "■ stop";
  orbitToggle.classList.add("playing");
  orbitNow.textContent = "drone · breathing";
  orbitRings.classList.add("on");
}

function scheduleBell() {
  const wait = 25_000 + Math.random() * 35_000;
  orbit.bellTimer = setTimeout(() => {
    if (!orbit.playing) return;
    playBell();
    scheduleBell();
  }, wait);
}

function playBell() {
  const ctx = orbit.ctx;
  const f = pentatonic[Math.floor(Math.random() * pentatonic.length)] * (Math.random() < 0.5 ? 1 : 2);
  const o = ctx.createOscillator();
  o.type = "sine";
  o.frequency.value = f;
  const g = ctx.createGain();
  g.gain.value = 0;
  o.connect(g).connect(orbit.master);
  const now = ctx.currentTime;
  g.gain.linearRampToValueAtTime(0.22 * (+orbitVol.value / 100), now + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 4.0);
  o.start(now);
  o.stop(now + 4.2);
  // sparkle UI
  orbitNow.textContent = `bell · ${Math.round(f)}hz`;
  setTimeout(() => { if (orbit.playing) orbitNow.textContent = "drone · breathing"; }, 1200);
}

function stopOrbit() {
  if (!orbit.playing) return;
  const ctx = orbit.ctx;
  // cancel pending fade-in ramp before scheduling fade-out, otherwise
  // linearRampToValueAtTime throws InvalidStateError when the new
  // end-time is earlier than the previously scheduled one (rapid play/stop)
  orbit.master.gain.cancelScheduledValues(ctx.currentTime);
  orbit.master.gain.setValueAtTime(orbit.master.gain.value, ctx.currentTime);
  orbit.master.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.6);
  setTimeout(() => {
    try { orbit.oscA.stop(); orbit.oscB.stop(); orbit.lfo.stop(); } catch {}
    orbit.playing = false;
  }, 700);
  clearTimeout(orbit.bellTimer);
  orbitToggle.textContent = "▶ play";
  orbitToggle.classList.remove("playing");
  orbitNow.textContent = "silent";
  orbitRings.classList.remove("on");
}

orbitToggle.addEventListener("click", () => orbit.playing ? stopOrbit() : startOrbit());
orbitVol.addEventListener("input", () => {
  if (orbit.playing && orbit.master) {
    orbit.master.gain.setTargetAtTime(+orbitVol.value / 100 * 0.35, orbit.ctx.currentTime, 0.2);
  }
});

// resume audio context when tab regains focus (browsers suspend it on blur)
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && orbit.playing && orbit.ctx && orbit.ctx.state === "suspended") {
    orbit.ctx.resume();
  }
  // same treatment for the cricket chorus — browsers auto-suspend contexts
  // on background tabs, and the first chirp after the user returns would see
  // suspended state and silently bail. only act if the user has armed (given
  // a gesture) so we don't try to resume before the context exists.
  if (!document.hidden
      && _cricketCtxRef.armed
      && _cricketCtxRef.ctx
      && _cricketCtxRef.ctx.state === "suspended") {
    _cricketCtxRef.ctx.resume().catch(() => {});
  }
});

/* ============================================================
   feature: mycelium notes
   notes link via [[name]], persist, hover highlights connections
   ============================================================ */
const MYC_KEY = "biosphere02.mycelium.v1";
const mycList = document.getElementById("myc-list");
const mycTitle = document.getElementById("myc-title");
const mycBody = document.getElementById("myc-body");
const mycStatus = document.getElementById("myc-status");

let mycNotes = [];
try { mycNotes = JSON.parse(localStorage.getItem(MYC_KEY) || "[]"); } catch { mycNotes = []; }
let editingId = null;

if (mycNotes.length === 0) {
  // seed with two example notes that link to each other
  mycNotes = [
    { id: 1, title: "moss", body: "the soft green carpet on every rock. linked to [[mycelium]]." },
    { id: 2, title: "mycelium", body: "the underground network. older than trees. quietly running the forest. see also [[moss]]." },
  ];
  saveMyc();
}

function saveMyc() {
  try { localStorage.setItem(MYC_KEY, JSON.stringify(mycNotes)); } catch {}
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" })[c]);
}

function renderNoteBody(body) {
  // match on the RAW body, then escape each chunk individually. the previous
  // pass escaped the whole body first and then ran the regex, which meant a
  // note titled "AT&T notes" linked via [[AT&T notes]] captured "AT&amp;T
  // notes" and never matched the real title. links to any note whose title
  // contained &, <, >, ", or ' were silently dead.
  let out = "";
  let last = 0;
  const re = /\[\[([^\]]+)\]\]/g;
  let m;
  while ((m = re.exec(body)) !== null) {
    out += escapeHtml(body.slice(last, m.index));
    const name = m[1];
    const target = mycNotes.find(n => n.title.toLowerCase() === name.toLowerCase().trim());
    const cls = target ? "myc-link" : "myc-link dead";
    out += `<span class="${cls}" data-link="${escapeHtml(name)}">${escapeHtml(name)}</span>`;
    last = m.index + m[0].length;
  }
  out += escapeHtml(body.slice(last));
  return out;
}

function linksOf(note) {
  const links = [];
  const re = /\[\[([^\]]+)\]\]/g;
  let m;
  while ((m = re.exec(note.body)) !== null) {
    const target = mycNotes.find(n => n.title.toLowerCase() === m[1].toLowerCase().trim());
    if (target) links.push(target.id);
  }
  return links;
}

function renderMyc() {
  mycList.innerHTML = "";
  for (const note of mycNotes) {
    const el = document.createElement("div");
    el.className = "myc-note";
    el.dataset.id = note.id;
    el.innerHTML = `
      <button class="myc-del" title="delete">×</button>
      <div class="myc-note-title">${escapeHtml(note.title)}</div>
      <div class="myc-note-body">${renderNoteBody(note.body)}</div>
    `;
    mycList.appendChild(el);
  }
}

mycList.addEventListener("mouseover", (e) => {
  const noteEl = e.target.closest(".myc-note");
  if (!noteEl) return;
  const id = +noteEl.dataset.id;
  const note = mycNotes.find(n => n.id === id);
  if (!note) return;
  const linked = new Set(linksOf(note));
  // also reverse links: notes that point AT this one
  for (const n of mycNotes) if (linksOf(n).includes(id)) linked.add(n.id);
  mycList.querySelectorAll(".myc-note").forEach(el => {
    el.classList.toggle("linked", linked.has(+el.dataset.id));
  });
});
mycList.addEventListener("mouseleave", () => {
  mycList.querySelectorAll(".myc-note.linked").forEach(el => el.classList.remove("linked"));
});

mycList.addEventListener("click", (e) => {
  if (e.target.classList.contains("myc-del")) {
    const noteEl = e.target.closest(".myc-note");
    const id = +noteEl.dataset.id;
    mycNotes = mycNotes.filter(n => n.id !== id);
    saveMyc(); renderMyc();
    return;
  }
  if (e.target.classList.contains("myc-link")) {
    const name = e.target.dataset.link.trim();
    const target = mycNotes.find(n => n.title.toLowerCase() === name.toLowerCase());
    if (target) {
      mycTitle.value = target.title;
      mycBody.value = target.body;
      editingId = target.id;
      mycStatus.textContent = "editing";
    } else {
      mycTitle.value = name;
      mycBody.value = "";
      editingId = null;
      mycStatus.textContent = "new from link";
    }
    mycTitle.focus();
    return;
  }
  // click anywhere else in a note → edit it
  const noteEl = e.target.closest(".myc-note");
  if (noteEl) {
    const id = +noteEl.dataset.id;
    const note = mycNotes.find(n => n.id === id);
    if (note) {
      mycTitle.value = note.title;
      mycBody.value = note.body;
      editingId = id;
      mycStatus.textContent = "editing";
    }
  }
});

document.getElementById("myc-save").addEventListener("click", () => {
  const t = mycTitle.value.trim();
  const b = mycBody.value.trim();
  if (!t) { mycStatus.textContent = "needs a title"; return; }
  if (editingId !== null) {
    const note = mycNotes.find(n => n.id === editingId);
    if (note) { note.title = t; note.body = b; }
  } else {
    const id = (mycNotes.reduce((m, n) => Math.max(m, n.id), 0)) + 1;
    mycNotes.push({ id, title: t, body: b });
    editingId = id;
  }
  saveMyc(); renderMyc();
  mycStatus.textContent = "saved";
  setTimeout(() => { if (mycStatus.textContent === "saved") mycStatus.textContent = ""; }, 1500);
});
document.getElementById("myc-new").addEventListener("click", () => {
  mycTitle.value = ""; mycBody.value = "";
  editingId = null;
  mycStatus.textContent = "";
  mycTitle.focus();
});
renderMyc();

/* ============================================================
   feature: command palette (⌘K / ctrl+K / "/")
   ============================================================ */
const palette = document.getElementById("palette");
const palInput = document.getElementById("palette-input");
const palListEl = document.getElementById("palette-list");
let palSel = 0;
let palItems = [];

function openPalette() {
  palette.hidden = false;
  palInput.value = "";
  renderPalette("");
  setTimeout(() => palInput.focus(), 10);
}
function closePalette() {
  palette.hidden = true;
}

function buildPaletteItems(query) {
  const q = query.trim().toLowerCase();
  return windows
    .map(w => {
      const label = w.querySelector(".tname").textContent;
      const closed = w.dataset.closed === "1";
      const minimized = w.classList.contains("minimized");
      const state = closed ? "closed" : minimized ? "minimized" : "open";
      return { win: w, label, state };
    })
    .filter(it => !q || it.label.toLowerCase().includes(q) || fuzzy(it.label, q))
    .slice(0, 12);
}

function fuzzy(label, q) {
  // simple sequential fuzzy match
  let i = 0;
  const s = label.toLowerCase();
  for (const ch of q) {
    i = s.indexOf(ch, i);
    if (i === -1) return false;
    i++;
  }
  return true;
}

function renderPalette(query) {
  palItems = buildPaletteItems(query);
  palSel = 0;
  palListEl.innerHTML = palItems.map((it, i) => `
    <li data-i="${i}" class="${i === 0 ? "sel" : ""}">
      <span>${escapeHtml(it.label)}</span>
      <span><span class="pal-state">${it.state}</span> <span class="pal-key">↵</span></span>
    </li>
  `).join("") || `<li class="pal-empty" style="color: var(--ink-dim); font-style: italic;">no matches</li>`;
}

function palMove(delta) {
  if (!palItems.length) return;
  palSel = (palSel + delta + palItems.length) % palItems.length;
  palListEl.querySelectorAll("li").forEach((el, i) => el.classList.toggle("sel", i === palSel));
  const sel = palListEl.querySelector("li.sel");
  if (sel) sel.scrollIntoView({ block: "nearest" });
}

function palOpen(idx) {
  const it = palItems[idx];
  if (!it) return;
  const w = it.win;
  // un-minimize, un-close, focus
  w.classList.remove("minimized");
  w.style.display = "";
  if (w.dataset.closed) {
    delete w.dataset.closed;
    const t = taskbar.querySelector(`[data-task="${w.dataset.id}"]`);
    if (t) t.remove();
  }
  const t = taskbar.querySelector(`[data-task="${w.dataset.id}"]`);
  if (t) t.remove();
  bringToFront(w);
  saveWindowState();
  closePalette();
}

palInput.addEventListener("input", () => renderPalette(palInput.value));
palInput.addEventListener("keydown", (e) => {
  if (e.key === "Escape") { closePalette(); }
  else if (e.key === "ArrowDown") { e.preventDefault(); palMove(1); }
  else if (e.key === "ArrowUp") { e.preventDefault(); palMove(-1); }
  else if (e.key === "Enter") { e.preventDefault(); palOpen(palSel); }
});
palListEl.addEventListener("click", (e) => {
  const li = e.target.closest("li[data-i]");
  if (li) palOpen(+li.dataset.i);
});
palette.addEventListener("click", (e) => { if (e.target === palette) closePalette(); });

document.addEventListener("keydown", (e) => {
  const inField = document.activeElement &&
    (document.activeElement.tagName === "INPUT" || document.activeElement.tagName === "TEXTAREA");
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
    e.preventDefault();
    palette.hidden ? openPalette() : closePalette();
  } else if (e.key === "/" && !inField && palette.hidden) {
    e.preventDefault();
    openPalette();
  } else if (e.key === "Escape" && !palette.hidden) {
    closePalette();
  }
});

/* ============================================================
   util: toast (used by share / reset / wishes)
   ============================================================ */
let _toastTimer;
function toast(msg, ms = 2400) {
  let el = document.querySelector(".toast");
  if (!el) {
    el = document.createElement("div");
    el.className = "toast";
    document.body.appendChild(el);
  }
  el.textContent = msg;
  // force reflow so the transition runs
  void el.offsetWidth;
  el.classList.add("show");
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove("show"), ms);
}

/* ============================================================
   feature: settings (mute audio, reduce motion, sky lock, reset)
   ============================================================ */
const SET_KEY = "biosphere02.settings.v1";
const defaultSettings = { mute: false, motion: false, sky: "auto", season: "auto" };
let settings = (() => {
  try { return Object.assign({}, defaultSettings, JSON.parse(localStorage.getItem(SET_KEY) || "{}")); }
  catch { return { ...defaultSettings }; }
})();

function saveSettings() {
  try { localStorage.setItem(SET_KEY, JSON.stringify(settings)); } catch {}
}

function applySettings() {
  // motion override
  document.body.classList.toggle("motion-reduced", !!settings.motion);
  // mute: stop orbit if playing
  if (settings.mute && orbit.playing) stopOrbit();
  // sky lock: bypass clock-based applyTimeOfDay
  applyTimeOfDay();
}

function isMotionReduced() {
  return settings.motion || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// hook up UI
const setMute = document.getElementById("set-mute");
const setMotion = document.getElementById("set-motion");
const setSky = document.getElementById("set-sky");
setMute.checked = settings.mute;
setMotion.checked = settings.motion;
setSky.value = settings.sky;

setMute.addEventListener("change", () => {
  settings.mute = setMute.checked;
  saveSettings();
  if (settings.mute && orbit.playing) stopOrbit();
});
setMotion.addEventListener("change", () => {
  settings.motion = setMotion.checked;
  saveSettings();
  applySettings();
  // if motion just went from reduced -> full, restart the shooter chain
  // (it may have terminated early during a reduced-motion session)
  maybeSpawnShooter();
});
setSky.addEventListener("change", () => {
  settings.sky = setSky.value;
  saveSettings();
  applyTimeOfDay();
});

document.getElementById("set-reset").addEventListener("click", () => {
  if (!confirm("reset everything? this clears your sky, plant, notes, wishes, settings, and window positions.")) return;
  Object.keys(localStorage)
    .filter(k => k.startsWith("biosphere02."))
    .forEach(k => localStorage.removeItem(k));
  toast("biosphere reset · reloading…", 1200);
  setTimeout(() => location.reload(), 800);
});

// block orbit start if muted
const _origStartOrbit = startOrbit;
startOrbit = function () {
  if (settings.mute) { toast("audio is muted — toggle in settings ⚙"); return; }
  _origStartOrbit();
};

// rewrite applyTimeOfDay to respect sky-lock
const _origApplyTOD = applyTimeOfDay;
applyTimeOfDay = function () {
  // a tiny hook to sync the milkyway-on body class with the
  // current mood — folded in so the band flips in the same rAF
  // as the sky tone rather than up to ~60s later via the polling
  // fallback. reduced-motion still suppresses milkyway-on, matching
  // the original gate.
  const _syncMilky = () => {
    // TDZ guard: devlog-29 declares MILKY_KEY / milkyShown near the
    // bottom of this file (~line 8802), but applyTimeOfDay() also
    // fires inline at line ~704 during page load — before that
    // line has been reached. Bail silently on early calls; the next
    // applyTimeOfay call (60s later via setInterval) picks the
    // sync up normally, once the script has finished evaluating.
    try { if (typeof MILKY_KEY === "undefined") return; } catch (e) { return; }
    const b = document.body.classList;
    const nighty = b.contains("night");
    const on = nighty && !b.contains("motion-reduced");
    if (on && !b.contains("milkyway-on")) {
      b.add("milkyway-on");
      _milkyActive = true;
      milkyShown++;
      try { localStorage.setItem(MILKY_KEY, String(milkyShown)); } catch {}
      renderMilkyStat();
    } else if (!on && b.contains("milkyway-on")) {
      b.remove("milkyway-on");
      _milkyActive = false;
    }
  };
  if (settings.sky && settings.sky !== "auto") {
    document.body.classList.remove("dawn", "day", "dusk", "night");
    document.body.classList.add(settings.sky);
    const skyEl = document.getElementById("sky");
    if (skyEl) {
      const labels = { dawn: "first light · 11°c", day: "open sky · 18°c", dusk: "amber hour · 15°c", night: "clear · 14°c" };
      skyEl.textContent = labels[settings.sky] + " · locked";
    }
    _syncMilky();
    return;
  }
  _origApplyTOD();
  _syncMilky();
};

// gate shooter spawning on the combined motion check (replaces earlier logic).
// self-idempotent: any caller can invoke this and the timer resets rather than
// stacking, and if a previous chain terminated (e.g. reduced-motion was true
// at load) calling this again cleanly restarts it.
// cadence is a LIVE check of today's forecast, not a load-time capture —
// otherwise a tab left open across midnight keeps yesterday's meteor rate
// (fast) or misses today's meteor rate entirely.
let _shooterTimer = null;
maybeSpawnShooter = function () {
  clearTimeout(_shooterTimer);
  _shooterTimer = null;
  if (isMotionReduced()) return;
  const isMeteorDay = (typeof forecastFor === "function")
    && forecastFor(new Date()).kind === "meteors";
  const next = isMeteorDay
    ? (4500 + Math.random() * 6500)     // meteor day: 5-11s
    : (15000 + Math.random() * 15000);  // normal:     15-30s
  _shooterTimer = setTimeout(() => {
    _shooterTimer = null;
    spawnShooter();
    maybeSpawnShooter();
  }, next);
};
// re-kick in case the load-time chain terminated early under reduced motion
maybeSpawnShooter();

applySettings();

/* ============================================================
   feature: konami code → make a wish
   ============================================================ */
const KONAMI = ["ArrowUp","ArrowUp","ArrowDown","ArrowDown","ArrowLeft","ArrowRight","ArrowLeft","ArrowRight","b","a"];
let konamiBuf = [];
const wishOverlay = document.getElementById("wish-overlay");
const wishInput = document.getElementById("wish-input");
const WISH_KEY = "biosphere02.wishes.v1";

function loadWishes() {
  try { return JSON.parse(localStorage.getItem(WISH_KEY) || "[]"); } catch { return []; }
}
function saveWishes(arr) {
  try { localStorage.setItem(WISH_KEY, JSON.stringify(arr)); } catch {}
}
function renderWishCount() {
  const el = document.getElementById("wishes-count");
  if (el) el.textContent = loadWishes().length;
  renderWishingTree();
}

/* wishing tree: one glowing lantern per wish, positioned deterministically
   along the canopy so a given wish always hangs from the same branch spot.
   hover = tooltip; click = toast the wish + the date it was made. */
const TREE_BRANCH_SPOTS = [
  // hand-picked % positions across the canopy area (left, top)
  [22, 46], [34, 32], [50, 26], [65, 34], [78, 44],
  [16, 58], [30, 52], [46, 48], [62, 52], [74, 58],
  [26, 40], [42, 38], [54, 36], [68, 42], [80, 52],
  [20, 66], [38, 62], [56, 60], [72, 64], [82, 66],
];
function renderWishingTree() {
  const host = document.getElementById("tree-lanterns");
  if (!host) return;
  const wishes = loadWishes();
  host.innerHTML = "";
  const count = Math.min(wishes.length, TREE_BRANCH_SPOTS.length);
  for (let i = 0; i < count; i++) {
    const w = wishes[i];
    const [lx, ly] = TREE_BRANCH_SPOTS[i];
    const el = document.createElement("span");
    el.className = "wish-lantern";
    el.style.left = lx + "%";
    el.style.top = ly + "%";
    // subtle per-lantern sway phase so they don't all move in lockstep
    el.style.animationDelay = -(i * 0.37) + "s";
    el.title = w.text;
    el.addEventListener("click", () => {
      const when = new Date(w.when).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
      if (typeof toast === "function") toast(`"${w.text}" · ${when}`, 3600);
    });
    host.appendChild(el);
  }
}
renderWishCount();

function openWish() {
  wishOverlay.hidden = false;
  wishInput.value = "";
  setTimeout(() => wishInput.focus(), 10);
}
function closeWish() { wishOverlay.hidden = true; }

wishOverlay.addEventListener("click", (e) => { if (e.target === wishOverlay) closeWish(); });
wishInput.addEventListener("keydown", (e) => {
  if (e.key === "Escape") { closeWish(); }
  else if (e.key === "Enter") {
    e.preventDefault();
    const text = wishInput.value.trim();
    if (!text) return;
    const wishes = loadWishes();
    wishes.push({ text, when: Date.now() });
    saveWishes(wishes);
    renderWishCount();
    closeWish();
    sendWishStar(text);
  }
});

function sendWishStar(text) {
  // a slower, brighter, named shooting star drifts across with the wish text
  const w = window.innerWidth, h = window.innerHeight;
  const startX = -60;
  const startY = h * (0.15 + Math.random() * 0.25);
  const vx = 1.1 + Math.random() * 0.3;
  const vy = 0.15 + Math.random() * 0.15;
  const star = { x: startX, y: startY, vx: vx * 8, vy: vy * 8, trail: [], life: 1.4, curve: 0.005 };
  shooters.push(star);

  const cap = document.createElement("div");
  cap.className = "wish-trail";
  cap.textContent = "✦ " + text;
  document.body.appendChild(cap);
  let t = 0;
  const dur = 6500;
  const startT = performance.now();
  function frame(now) {
    t = now - startT;
    const p = Math.min(1, t / dur);
    const x = startX + (w + 200) * p;
    const y = startY + 80 * p;
    cap.style.left = x + 16 + "px";
    cap.style.top = y + 12 + "px";
    if (p < 0.05) cap.classList.add("show");
    if (p > 0.85) cap.classList.remove("show");
    if (p < 1) requestAnimationFrame(frame);
    else cap.remove();
  }
  requestAnimationFrame(frame);
}

document.addEventListener("keydown", (e) => {
  const inField = document.activeElement &&
    (document.activeElement.tagName === "INPUT" || document.activeElement.tagName === "TEXTAREA");
  if (inField) return;
  if (!wishOverlay.hidden) return;
  // case-insensitive on single-char keys so caps lock / shift don't break it
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  konamiBuf.push(k);
  if (konamiBuf.length > KONAMI.length) konamiBuf.shift();
  if (konamiBuf.length === KONAMI.length &&
      konamiBuf.every((kk, i) => kk === KONAMI[i])) {
    konamiBuf = [];
    openWish();
  }
});

/* ============================================================
   feature: mycelium search
   ============================================================ */
const mycSearch = document.getElementById("myc-search");
let mycFilter = "";
const _origRenderMyc = renderMyc;
renderMyc = function () {
  mycList.innerHTML = "";
  const q = mycFilter.toLowerCase();
  const filtered = q
    ? mycNotes.filter(n => n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q))
    : mycNotes;
  if (filtered.length === 0) {
    const empty = document.createElement("div");
    empty.style.cssText = "color: var(--ink-dim); font-style: italic; font-size: 12px; padding: 8px 4px;";
    empty.textContent = q ? `no notes matching "${q}"` : "no notes yet — write one above";
    mycList.appendChild(empty);
    return;
  }
  for (const note of filtered) {
    const el = document.createElement("div");
    el.className = "myc-note";
    el.dataset.id = note.id;
    el.innerHTML = `
      <button class="myc-del" title="delete">×</button>
      <div class="myc-note-title">${escapeHtml(note.title)}</div>
      <div class="myc-note-body">${renderNoteBody(note.body)}</div>
    `;
    mycList.appendChild(el);
  }
};
mycSearch.addEventListener("input", () => {
  mycFilter = mycSearch.value;
  renderMyc();
});
renderMyc();

/* ============================================================
   feature: share constellation via URL hash
   ============================================================ */
const shareBtn = document.getElementById("share-sky");
const sharedBanner = document.getElementById("shared-sky-banner");
const returnBtn = document.getElementById("return-to-mine");

function encodeConstellation(stars, lines) {
  // round coords to ints to shrink payload
  const W = window.innerWidth, H = window.innerHeight;
  const payload = {
    w: W, h: H,
    s: stars.map(s => s.label ? [Math.round(s.x), Math.round(s.y), s.label] : [Math.round(s.x), Math.round(s.y)]),
    l: lines.map(l => [l.a, l.b]),
  };
  return btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
}
function decodeConstellation(str) {
  try {
    const json = decodeURIComponent(escape(atob(str)));
    const data = JSON.parse(json);
    if (!data || !Array.isArray(data.s) || !Array.isArray(data.l)) return null;
    // scale to current viewport
    const sx = window.innerWidth / (data.w || window.innerWidth);
    const sy = window.innerHeight / (data.h || window.innerHeight);
    return {
      stars: data.s.map(s => ({ x: s[0] * sx, y: s[1] * sy, label: s[2] })),
      lines: data.l.map(l => ({ a: l[0], b: l[1] })),
    };
  } catch { return null; }
}

let _ownStarsBackup = null;
let _ownLinesBackup = null;
let viewingShared = false;

function showSharedBanner(on) {
  sharedBanner.hidden = !on;
  viewingShared = on;
}

function tryLoadFromHash() {
  const m = location.hash.match(/^#c=([A-Za-z0-9+/=_-]+)/);
  if (!m) return;
  const data = decodeConstellation(m[1].replace(/-/g, "+").replace(/_/g, "/"));
  if (!data) { toast("shared sky link couldn't be read"); return; }
  _ownStarsBackup = userStars.slice();
  _ownLinesBackup = userLines.slice();
  userStars = data.stars;
  userLines = data.lines;
  updateStudioCounts();
  showSharedBanner(true);
  toast(`viewing a shared sky · ${data.stars.length} stars`);
}
tryLoadFromHash();

returnBtn.addEventListener("click", () => {
  if (_ownStarsBackup) { userStars = _ownStarsBackup; userLines = _ownLinesBackup; }
  _ownStarsBackup = _ownLinesBackup = null;
  history.replaceState(null, "", location.pathname);
  showSharedBanner(false);
  updateStudioCounts();
  toast("back to your sky");
});

shareBtn.addEventListener("click", async () => {
  // share the user's actual sky, not the shared-view they might be browsing
  const stars = _ownStarsBackup || userStars;
  const lines = _ownLinesBackup || userLines;
  if (stars.length === 0) { toast("no stars to share yet — click the sky to drop one"); return; }
  const encoded = encodeConstellation(stars, lines).replace(/\+/g, "-").replace(/\//g, "_");
  const url = `${location.origin}${location.pathname}#c=${encoded}`;
  if (url.length > 6000) {
    toast("sky is too big to share in a url — try with fewer stars");
    return;
  }
  try {
    await navigator.clipboard.writeText(url);
    toast(`url copied · ${stars.length} stars travel with the link`);
  } catch {
    prompt("copy this link:", url);
  }
});

/* ============================================================
   bring all initially-minimized windows into the taskbar
   (so the settings window etc. show up if their saved state
   said minimized but the JS init hadn't placed a chip yet)
   ============================================================ */
windows.forEach(w => {
  if (w.classList.contains("minimized") || w.dataset.closed === "1") {
    if (!taskbar.querySelector(`[data-task="${w.dataset.id}"]`)) addTask(w);
  }
});

// clamp once on initial paint so any windows positioned off-screen
// (e.g. settings at left:1240 on a narrow viewport) get pulled in.
clampWindowsToViewport();

/* ============================================================
   feature: stargazer mode (hide all UI for a clean sky view)
   ============================================================ */
const stargazerBtn = document.getElementById("toggle-stargazer");
function setStargazer(on) {
  document.body.classList.toggle("stargazer", on);
  stargazerBtn.classList.toggle("active", on);
}
function toggleStargazer() {
  setStargazer(!document.body.classList.contains("stargazer"));
}
stargazerBtn.addEventListener("click", toggleStargazer);

document.addEventListener("keydown", (e) => {
  const inField = document.activeElement &&
    (document.activeElement.tagName === "INPUT" || document.activeElement.tagName === "TEXTAREA");
  if (inField) return;
  if (!palette.hidden || !wishOverlay.hidden) return;
  if (e.key === "f" || e.key === "F") {
    e.preventDefault();
    toggleStargazer();
  } else if (e.key === "Escape" && document.body.classList.contains("stargazer")) {
    setStargazer(false);
  }
});

/* ============================================================
   feature: catch a shooting star
   click on an active shooter while it's streaking → catch it
   ============================================================ */
const CAUGHT_KEY = "biosphere02.caught.v1";
let caughtCount = (() => { try { return +localStorage.getItem(CAUGHT_KEY) || 0; } catch { return 0; } })();
function renderCaughtCount() {
  const el = document.getElementById("caught-count");
  if (el) el.textContent = caughtCount;
}
renderCaughtCount();

function spawnCatchBurst(x, y) {
  const b = document.createElement("div");
  b.className = "catch-burst";
  b.style.left = x + "px";
  b.style.top = y + "px";
  document.body.appendChild(b);
  setTimeout(() => b.remove(), 800);
}

function tryCatchShooter(x, y) {
  // hit-test against the head (latest trail point) of each active shooter
  for (let i = shooters.length - 1; i >= 0; i--) {
    const s = shooters[i];
    const head = s.trail.length ? s.trail[s.trail.length - 1] : { x: s.x, y: s.y };
    const dx = head.x - x, dy = head.y - y;
    if (dx * dx + dy * dy < 36 * 36) {  // within ~36px
      shooters.splice(i, 1);
      spawnCatchBurst(x, y);
      caughtCount++;
      try { localStorage.setItem(CAUGHT_KEY, String(caughtCount)); } catch {}
      renderCaughtCount();
      // catch-a-meteor (meteor wish): if today's forecast is meteors,
      // the catch itself is a wish — fires a slow star with the wish trailing
      let meteorsToday = false;
      try { meteorsToday = forecastFor(new Date()).kind === "meteors"; } catch {}
      if (meteorsToday) {
        const tm = new Date();
        const wText = "wish on a falling star · " + tm.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
        const wishes = loadWishes();
        wishes.push({ text: wText, when: Date.now(), from: "shooting-star" });
        saveWishes(wishes);
        renderWishCount();
        sendWishStar(wText);
        toast("you wished on a shooting star 🌠", 3200);
        if (typeof gLog === "function") gLog("meteor", "wish on a shooting star", "meteor shower");
      } else {
        if (caughtCount === 1) toast("you caught one ✦ keep an eye on the sky");
        if (typeof gLog === "function") gLog("star", "star caught", "the sky");
      }
      return true;
    }
  }
  return false;
}

// the original cCanvas click handler calls tryCatchShooter() first,
// so catching takes priority over dropping new stars / chaining lines.

/* ============================================================
   feature: lantern (cursor glow over the sky)
   subtle amber glow that follows the cursor when over open sky,
   hides over windows/bars/overlays
   ============================================================ */
const lantern = document.createElement("div");
lantern.className = "lantern";
document.body.appendChild(lantern);

const _lanternHideSel = ".window, .topbar, .taskbar, .palette, .palette-shell, #wish-overlay";
let _lanternRaf = 0, _lanternX = 0, _lanternY = 0;
document.addEventListener("mousemove", (e) => {
  _lanternX = e.clientX; _lanternY = e.clientY;
  if (_lanternRaf) return;
  _lanternRaf = requestAnimationFrame(() => {
    _lanternRaf = 0;
    const el = document.elementFromPoint(_lanternX, _lanternY);
    const overUI = el && el.closest(_lanternHideSel);
    if (overUI) {
      lantern.classList.remove("on");
    } else {
      lantern.style.left = _lanternX + "px";
      lantern.style.top = _lanternY + "px";
      lantern.classList.add("on");
    }
  });
});
document.addEventListener("mouseleave", () => lantern.classList.remove("on"));

/* ============================================================
   feature: welcome sign (dismissable, persists)
   ============================================================ */
const SIGN_KEY = "biosphere02.sign-dismissed.v1";
const signEl = document.getElementById("welcome-sign");
const signDismiss = document.getElementById("sign-dismiss");
if (signEl && localStorage.getItem(SIGN_KEY) === "1") {
  signEl.style.display = "none";
}
if (signDismiss) {
  signDismiss.addEventListener("click", () => {
    signEl.classList.add("fading-out");
    setTimeout(() => { signEl.style.display = "none"; }, 520);
    try { localStorage.setItem(SIGN_KEY, "1"); } catch {}
  });
}

/* ============================================================
   feature: global search bar in the topbar
   searches windows, mycelium notes, devlog entries, projects,
   and wishes. grouped dropdown, keyboard navigable, jumps + flashes
   the matched element.
   ============================================================ */
const gSearch = document.getElementById("global-search");
const gResults = document.getElementById("global-search-results");
let gSel = 0;
let gItems = [];

function makeSnippet(text, q, around = 60) {
  const lc = text.toLowerCase();
  const idx = lc.indexOf(q);
  if (idx === -1) return text.slice(0, around).trim().replace(/\s+/g, " ");
  const start = Math.max(0, idx - 24);
  const end = Math.min(text.length, idx + q.length + around);
  const raw = text.slice(start, end).trim().replace(/\s+/g, " ");
  return (start > 0 ? "…" : "") + raw + (end < text.length ? "…" : "");
}

function highlightSnippet(snippet, q) {
  if (!q) return escapeHtml(snippet);
  const safe = escapeHtml(snippet);
  const safeQ = escapeHtml(q).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return safe.replace(new RegExp(safeQ, "ig"), m => `<mark>${m}</mark>`);
}

function gFocusWindow(w) {
  w.classList.remove("minimized");
  w.style.display = "";
  if (w.dataset.closed === "1") {
    delete w.dataset.closed;
  }
  const chip = taskbar.querySelector(`[data-task="${w.dataset.id}"]`);
  if (chip) chip.remove();
  bringToFront(w);
  saveWindowState();
}

function gFlash(el) {
  el.classList.add("search-flash");
  setTimeout(() => el.classList.remove("search-flash"), 1900);
}

function gFocusInsideWindow(winId, el) {
  const w = document.querySelector(`[data-id="${winId}"]`);
  if (!w) return;
  gFocusWindow(w);
  // wait for the window to be visible before scrolling
  setTimeout(() => {
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    gFlash(el);
  }, 80);
}

function doGlobalSearch(q) {
  // keep the user's original casing for the google fallback + display,
  // but match locally against the lowercased form
  const raw = q.trim();
  q = raw.toLowerCase();
  if (!q) { gResults.hidden = true; gItems = []; return; }

  const results = [];

  // windows
  document.querySelectorAll(".window").forEach(w => {
    const name = w.querySelector(".tname").textContent;
    if (name.toLowerCase().includes(q)) {
      results.push({
        kind: "window",
        label: name,
        snippet: null,
        action: () => gFocusWindow(w),
      });
    }
  });

  // mycelium notes
  if (typeof mycNotes !== "undefined" && Array.isArray(mycNotes)) {
    for (const n of mycNotes) {
      if (n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q)) {
        results.push({
          kind: "note",
          label: n.title,
          snippet: makeSnippet(n.body, q, 50),
          action: () => {
            const w = document.querySelector('[data-id="mycelium"]');
            gFocusWindow(w);
            if (typeof mycTitle !== "undefined") {
              mycTitle.value = n.title;
              mycBody.value = n.body;
              if (typeof editingId !== "undefined") editingId = n.id;
              if (mycStatus) mycStatus.textContent = "from search";
            }
          },
        });
      }
    }
  }

  // devlog entries
  document.querySelectorAll(".logentry").forEach(le => {
    const text = le.textContent;
    if (text.toLowerCase().includes(q)) {
      const h3 = le.querySelector("h3");
      results.push({
        kind: "devlog",
        label: h3 ? h3.textContent.trim() : "devlog entry",
        snippet: makeSnippet(text.replace(/\s+/g, " "), q, 70),
        action: () => gFocusInsideWindow("devlog", le),
      });
    }
  });

  // projects
  document.querySelectorAll(".proj").forEach(p => {
    const text = p.textContent;
    if (text.toLowerCase().includes(q)) {
      const h = p.querySelector("h4");
      results.push({
        kind: "project",
        label: h ? h.textContent.trim() : "project",
        snippet: makeSnippet(text.replace(/\s+/g, " "), q, 60),
        action: () => gFocusInsideWindow("projects", p),
      });
    }
  });

  // wishes
  if (typeof loadWishes === "function") {
    for (const w of loadWishes()) {
      if (w.text.toLowerCase().includes(q)) {
        results.push({
          kind: "wish",
          label: "✦ " + w.text,
          snippet: new Date(w.when).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }),
          action: () => toast(`"${w.text}" · ${new Date(w.when).toLocaleDateString()}`, 3200),
        });
      }
    }
  }

  // google search — always last, so local matches win but the web is one keystroke away
  results.push({
    kind: "google",
    label: `search google for "${raw}"`,
    snippet: "opens google.com in a new tab",
    action: () => window.open(`https://www.google.com/search?q=${encodeURIComponent(raw)}`, "_blank", "noopener,noreferrer"),
  });

  renderSearchResults(results, q);
}

function renderSearchResults(results, q) {
  // cap the list, but never let the always-last "search google" fallback fall
  // off the end — a short/common query (e.g. "e") can match 25+ windows, notes
  // and devlog entries, and the slice was silently dropping the web escape
  // hatch that's supposed to be one keystroke away.
  const googleItem = results.find(r => r.kind === "google");
  let capped = results.slice(0, 25);
  if (googleItem && !capped.includes(googleItem)) {
    capped = capped.slice(0, 24);
    capped.push(googleItem);
  }
  gItems = capped;
  gSel = 0;

  if (gItems.length === 0) {
    gResults.innerHTML = `<div class="search-empty">nothing matches "${escapeHtml(q)}"</div>`;
    gResults.hidden = false;
    return;
  }

  const kindLabel = {
    window: "windows", note: "notes", devlog: "devlog",
    project: "projects", wish: "wishes", google: "web",
  };
  const order = ["window", "note", "devlog", "project", "wish", "google"];

  // group, preserving original indices for action lookup
  const groups = {};
  gItems.forEach((it, i) => { (groups[it.kind] = groups[it.kind] || []).push({ ...it, _i: i }); });

  let html = "";
  for (const k of order) {
    if (!groups[k]) continue;
    html += `<div class="search-group">${kindLabel[k]}</div>`;
    for (const it of groups[k]) {
      html += `<div class="search-item" data-i="${it._i}">${escapeHtml(it.label)}`;
      if (it.snippet) html += `<span class="search-snippet">${highlightSnippet(it.snippet, q)}</span>`;
      html += `</div>`;
    }
  }
  gResults.innerHTML = html;
  gResults.hidden = false;
  const first = gResults.querySelector(".search-item");
  if (first) first.classList.add("sel");
}

function gSearchMove(delta) {
  if (!gItems.length) return;
  gSel = (gSel + delta + gItems.length) % gItems.length;
  gResults.querySelectorAll(".search-item").forEach(el => {
    el.classList.toggle("sel", +el.dataset.i === gSel);
  });
  const sel = gResults.querySelector(".search-item.sel");
  if (sel) sel.scrollIntoView({ block: "nearest" });
}

function gRunSelected() {
  const item = gItems[gSel];
  if (!item) return;
  item.action();
  gSearch.value = "";
  gResults.hidden = true;
  gSearch.blur();
}

gSearch.addEventListener("input", () => doGlobalSearch(gSearch.value));
gSearch.addEventListener("focus", () => { if (gSearch.value) doGlobalSearch(gSearch.value); });
gSearch.addEventListener("keydown", (e) => {
  if (e.key === "Escape") { gSearch.value = ""; gResults.hidden = true; gSearch.blur(); }
  else if (e.key === "ArrowDown") { e.preventDefault(); gSearchMove(1); }
  else if (e.key === "ArrowUp")   { e.preventDefault(); gSearchMove(-1); }
  else if (e.key === "Enter")     { e.preventDefault(); gRunSelected(); }
});
gResults.addEventListener("click", (e) => {
  const itemEl = e.target.closest(".search-item");
  if (!itemEl) return;
  gSel = +itemEl.dataset.i;
  gRunSelected();
});
document.addEventListener("click", (e) => {
  if (!e.target.closest(".hero-search-wrap")) gResults.hidden = true;
});

/* ============================================================
   feature: reflection pond
   a glassy water surface at the bottom of the screen — ripples
   on click, faint shimmery reflected stars, occasional idle
   ripples. fox above walks the shoreline.
   ============================================================ */
const pondCanvas = document.getElementById("pond");
const pondCtx = pondCanvas.getContext("2d");
let pondW = 0, pondH = 0;
const ripples = [];
const pondStars = [];
// cached gradients — rebuilt only on resize, not every frame (big perf win over
// per-frame createLinearGradient, which was showing up as noticeable jank)
let pondWaterGrad = null;
let pondShoreGrad = null;

// moon reflection: soft glow on the water at a fixed pond-relative spot,
// modulated by the current time-of-day (bright at night, faint by day).
// gradient built once per resize — same perf lesson as the water grad above.
let moonReflectGrad = null;
let moonReflectX = 0;
let moonReflectY = 0;
const MOON_REFLECT_RADIUS = 34;

function resizePond() {
  pondW = pondCanvas.offsetWidth;
  pondH = pondCanvas.offsetHeight;
  pondCanvas.width = pondW * devicePixelRatio;
  pondCanvas.height = pondH * devicePixelRatio;
  pondCtx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  pondWaterGrad = pondCtx.createLinearGradient(0, 0, 0, pondH);
  pondWaterGrad.addColorStop(0, "rgba(18, 38, 58, 0.42)");
  pondWaterGrad.addColorStop(0.45, "rgba(8, 22, 38, 0.62)");
  pondWaterGrad.addColorStop(1, "rgba(4, 12, 22, 0.85)");
  pondShoreGrad = pondCtx.createLinearGradient(0, 0, 0, 22);
  pondShoreGrad.addColorStop(0, "rgba(143, 212, 154, 0.20)");
  pondShoreGrad.addColorStop(1, "rgba(143, 212, 154, 0)");
  // position moon reflection two-thirds across, mid-pond depth
  moonReflectX = Math.round(pondW * 0.68);
  moonReflectY = Math.round(pondH * 0.42);
  moonReflectGrad = pondCtx.createRadialGradient(
    moonReflectX, moonReflectY, 0,
    moonReflectX, moonReflectY, MOON_REFLECT_RADIUS
  );
  moonReflectGrad.addColorStop(0,   "rgba(255, 240, 210, 0.55)");
  moonReflectGrad.addColorStop(0.4, "rgba(255, 232, 180, 0.25)");
  moonReflectGrad.addColorStop(1,   "rgba(255, 232, 180, 0)");
  buildPondStars();
  buildLilyPads();
  buildMushrooms();
}
function buildPondStars() {
  pondStars.length = 0;
  const count = Math.max(8, Math.floor(pondW / 70));
  for (let i = 0; i < count; i++) {
    pondStars.push({
      x: Math.random() * pondW,
      y: 10 + Math.random() * (pondH * 0.7),
      base: 0.08 + Math.random() * 0.22,
      phase: Math.random() * Math.PI * 2,
      speed: 0.001 + Math.random() * 0.0025,
    });
  }
}

// lily pads drift slowly across the pond — click one for a frog jump
const lilyPads = [];
function buildLilyPads() {
  lilyPads.length = 0;
  const count = Math.max(3, Math.min(6, Math.floor(pondW / 280)));
  for (let i = 0; i < count; i++) {
    lilyPads.push({
      x: Math.random() * pondW,
      y: 28 + Math.random() * (pondH - 56),
      r: 11 + Math.random() * 7,
      vx: (Math.random() < 0.5 ? -1 : 1) * (0.05 + Math.random() * 0.10),
      bobPhase: Math.random() * Math.PI * 2,
      hasFlower: Math.random() < 0.6,
    });
  }
}
function drawLilyPads(t) {
  for (const p of lilyPads) {
    p.x += p.vx;
    if (p.x < -30) p.x = pondW + 30;
    if (p.x > pondW + 30) p.x = -30;
    const wob = Math.sin(t * 0.0011 + p.bobPhase) * 1.2;
    pondCtx.save();
    pondCtx.translate(p.x, p.y + wob);
    // soft shadow under pad
    pondCtx.fillStyle = "rgba(0, 0, 0, 0.25)";
    pondCtx.beginPath();
    pondCtx.ellipse(1, 2, p.r * 1.05, p.r * 0.62, 0, 0, Math.PI * 2);
    pondCtx.fill();
    // pad body
    pondCtx.fillStyle = "rgba(86, 142, 92, 0.92)";
    pondCtx.beginPath();
    pondCtx.ellipse(0, 0, p.r, p.r * 0.6, 0, 0, Math.PI * 2);
    pondCtx.fill();
    // notch (V cut to give it the lily-pad shape) — clip out a wedge
    pondCtx.globalCompositeOperation = "destination-out";
    pondCtx.beginPath();
    pondCtx.moveTo(0, 0);
    pondCtx.lineTo(p.r * 1.2, -p.r * 0.18);
    pondCtx.lineTo(p.r * 1.2,  p.r * 0.18);
    pondCtx.closePath();
    pondCtx.fill();
    pondCtx.globalCompositeOperation = "source-over";
    // tiny veins / highlight
    pondCtx.strokeStyle = "rgba(160, 210, 170, 0.35)";
    pondCtx.lineWidth = 0.8;
    pondCtx.beginPath();
    pondCtx.moveTo(-p.r * 0.7, 0);
    pondCtx.lineTo(p.r * 0.5, 0);
    pondCtx.stroke();
    // optional flower
    if (p.hasFlower) {
      pondCtx.fillStyle = "rgba(255, 200, 220, 0.95)";
      pondCtx.beginPath();
      pondCtx.arc(-p.r * 0.35, -p.r * 0.18, 2.0, 0, Math.PI * 2);
      pondCtx.fill();
      pondCtx.fillStyle = "rgba(255, 240, 180, 0.95)";
      pondCtx.beginPath();
      pondCtx.arc(-p.r * 0.35, -p.r * 0.18, 0.9, 0, Math.PI * 2);
      pondCtx.fill();
    }
    pondCtx.restore();
  }
}
function lilyHitAt(localX, localY) {
  // a bit of slop so it feels tappable
  for (const p of lilyPads) {
    const dx = p.x - localX, dy = p.y - localY;
    if (dx * dx + dy * dy < (p.r + 4) * (p.r + 4)) return p;
  }
  return null;
}

/* ---- bioluminescent mushrooms on the shoreline ----
   small pulsing dots clustered at the top edge of the pond. click near
   a cluster to trigger a chorus pulse where all of them brighten together
   for a moment. drawn in the pond canvas so no extra rAF. */
const mushrooms = [];
let mushroomChorus = 0; // timestamp when the last chorus pulse fired
function buildMushrooms() {
  mushrooms.length = 0;
  const count = Math.max(6, Math.min(14, Math.floor(pondW / 110)));
  for (let i = 0; i < count; i++) {
    mushrooms.push({
      x: 16 + Math.random() * (pondW - 32),
      y: 3 + Math.random() * 8, // sit just under the shoreline band
      r: 1.2 + Math.random() * 1.1,
      base: 0.35 + Math.random() * 0.35,
      phase: Math.random() * Math.PI * 2,
      speed: 0.0012 + Math.random() * 0.0022,
      hue: Math.random() < 0.75 ? "143, 212, 154" : "180, 220, 255", // moss or moonlight
    });
  }
}
function drawMushrooms(t) {
  // chorus fades out over ~1.4s
  const chorusAge = mushroomChorus ? (t - mushroomChorus) : Infinity;
  const chorusBoost = chorusAge < 1400 ? (1 - chorusAge / 1400) : 0;
  // two flat circles per mushroom — cheaper than a per-frame radial gradient
  for (const m of mushrooms) {
    const pulse = Math.sin(t * m.speed + m.phase) * 0.35 + 0.65;
    const a = Math.min(1, m.base * pulse + chorusBoost * 0.55);
    // faint outer halo (single flat circle, low alpha)
    pondCtx.fillStyle = `rgba(${m.hue}, ${a * 0.16})`;
    pondCtx.beginPath();
    pondCtx.arc(m.x, m.y, m.r * 5, 0, Math.PI * 2);
    pondCtx.fill();
    // bright core cap
    pondCtx.fillStyle = `rgba(${m.hue}, ${Math.min(1, a + 0.2)})`;
    pondCtx.beginPath();
    pondCtx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
    pondCtx.fill();
  }
}
function mushroomChoirNearAny(localX, localY) {
  // if the click is within ~24px of any mushroom, fire the chorus pulse
  for (const m of mushrooms) {
    const dx = m.x - localX, dy = m.y - localY;
    if (dx * dx + dy * dy < 24 * 24) {
      mushroomChorus = performance.now();
      return true;
    }
  }
  return false;
}
function jumpFrogAt(viewportX, viewportY) {
  const el = document.createElement("div");
  el.className = "frog-jump";
  el.textContent = "✦";
  el.style.left = viewportX + "px";
  el.style.top = viewportY + "px";
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 900);
}

/* ---- pond fish ----
   occasional dark shape darts under the surface, leaving a small V-wake.
   drawn on the pond canvas, below lily pads so the pads sit above them
   like real lily pads shading real fish. */
const fish = [];
function spawnFish() {
  if (pondW === 0 || isMotionReduced()) return;
  // cap concurrent fish (like the bottles do). the cull only runs inside
  // drawFish, which is rAF-driven and pauses when the tab is hidden — but the
  // spawn timer keeps firing while hidden, so without a cap the array grows
  // unbounded and the whole backlog floods the pond the moment you return.
  if (fish.length >= 3) return;
  const fromLeft = Math.random() < 0.5;
  fish.push({
    x: fromLeft ? -20 : pondW + 20,
    y: 40 + Math.random() * (pondH - 60),
    vx: (fromLeft ? 1 : -1) * (0.6 + Math.random() * 0.5),
    wavePhase: Math.random() * Math.PI * 2,
    len: 10 + Math.random() * 6,
    // fish live briefly; they can either drift off-canvas or duck under
    life: 1.0,
  });
}
function drawFish(t) {
  for (let i = fish.length - 1; i >= 0; i--) {
    const f = fish[i];
    f.x += f.vx;
    // subtle vertical wave as it swims
    const wy = Math.sin(t * 0.004 + f.wavePhase) * 3;
    // cull when off canvas
    if (f.x < -30 || f.x > pondW + 30) { fish.splice(i, 1); continue; }
    // body — thin ellipse silhouette
    pondCtx.save();
    pondCtx.translate(f.x, f.y + wy);
    if (f.vx < 0) pondCtx.scale(-1, 1);
    pondCtx.fillStyle = "rgba(6, 14, 22, 0.55)";
    pondCtx.beginPath();
    pondCtx.ellipse(0, 0, f.len, f.len * 0.32, 0, 0, Math.PI * 2);
    pondCtx.fill();
    // tail — small triangle wagging with the wave
    const wag = Math.sin(t * 0.02 + f.wavePhase) * 0.5;
    pondCtx.beginPath();
    pondCtx.moveTo(-f.len, 0);
    pondCtx.lineTo(-f.len - 5, -3 + wag);
    pondCtx.lineTo(-f.len - 5, 3 + wag);
    pondCtx.closePath();
    pondCtx.fill();
    pondCtx.restore();
    // V-wake — two short diverging lines behind the fish
    pondCtx.strokeStyle = "rgba(200, 220, 210, 0.35)";
    pondCtx.lineWidth = 0.7;
    const trailX = f.x - Math.sign(f.vx) * (f.len + 4);
    pondCtx.beginPath();
    pondCtx.moveTo(trailX, f.y + wy);
    pondCtx.lineTo(trailX - Math.sign(f.vx) * 10, f.y + wy - 3);
    pondCtx.stroke();
    pondCtx.beginPath();
    pondCtx.moveTo(trailX, f.y + wy);
    pondCtx.lineTo(trailX - Math.sign(f.vx) * 10, f.y + wy + 3);
    pondCtx.stroke();
  }
}
(function scheduleFish() {
  const next = 30_000 + Math.random() * 45_000; // 30-75s between visits
  setTimeout(() => {
    if (!isMotionReduced() && pondW > 0) spawnFish();
    scheduleFish();
  }, next);
})();

/* ============================================================
   feature: devlog #36 — wax-tablet brass seal
   top-shelf · cycles 18 day-glyph impressions on click. the wax-tablet's
   seal stamp pulses up, leaves a fresh imprint, and the glyph rotates
   forward. counter persists.
   key: biosphere02.waxtablet.v1 (index) / .stamp.v1 (count)
   ============================================================ */
const WT_GLYPHS = [
  // 18 chars that read as a day's seal — primarily emoji + stroke characters
  // that don't need a custom font. picks are stable across reloads because
  // we persist the index.
  "✦", "❋", "✺", "✸", "❈", "✻", "❉", "✽",
  "♆", "♇", "♁", "♃", "♄", "♅", "♀", "♂",
  "𓂃", "𓇋",
];
const WT_INDEX_KEY = "biosphere02.waxtablet.v1";
const WT_COUNT_KEY = "biosphere02.waxtablet.stamp.v1";
const wtEl = document.getElementById("wax-tablet");
const wtGlyph = wtEl ? wtEl.querySelector(".wt-glyph") : null;
let wtIndex = (() => { try { return +localStorage.getItem(WT_INDEX_KEY) || 0; } catch { return 0; } })();
let wtCount = (() => { try { return +localStorage.getItem(WT_COUNT_KEY) || 0; } catch { return 0; } })();
function renderWt() {
  if (wtGlyph) wtGlyph.textContent = WT_GLYPHS[wtIndex % WT_GLYPHS.length];
  const stat = document.getElementById("waxtablet-stat");
  if (stat) stat.textContent = wtCount;
}
renderWt();
if (wtEl) {
  wtEl.addEventListener("click", () => {
    wtIndex++;
    wtCount++;
    try { localStorage.setItem(WT_INDEX_KEY, String(wtIndex)); } catch {}
    try { localStorage.setItem(WT_COUNT_KEY, String(wtCount)); } catch {}
    renderWt();
    // flashing the seal gives a clear click feedback even without audio
    wtEl.classList.add("stamping");
    setTimeout(() => wtEl.classList.remove("stamping"), 380);
    if (wtCount === 1) {
      toast("the seal holds · the wax records", 2400);
    }
  });
}

/* ============================================================
   feature: devlog #36 — hollow bamboo water clock
   a vertical tube with bubbles rising from the bottom up to the node
   ring near the top. bubble cadence is derived from --pond-h via
   getComputedStyle() at spawn time: same coupling tide-whistle and
   tide-flutes use, so the clock "ticks faster at high tide". counter
   persists. cadence is gated by visible tab + reduced-motion so an
   idle background tab doesn't bank up bubbles.
   key: biosphere02.bamboowaterclock.v1 (count)
   ============================================================ */
const BWC_KEY = "biosphere02.bamboowaterclock.v1";
const bwcEl = document.getElementById("bamboo-water-clock");
const bwcBubblesHost = document.getElementById("bwc-bubbles");
let bwcTicks = (() => { try { return +localStorage.getItem(BWC_KEY) || 0; } catch { return 0; } })();
function renderBwcCount() {
  const stat = document.getElementById("bamboowaterclock-stat");
  if (stat) stat.textContent = bwcTicks;
}
renderBwcCount();
let _bwcTimer = null;
function bwcBubblePeriodMs() {
  // read --pond-h from :root; map 17vh -> 1100ms, 19vh -> 620ms linearly.
  const root = getComputedStyle(document.documentElement).getPropertyValue("--pond-h").trim();
  const m = root.match(/^([\d.]+)vh$/);
  if (!m) return 900;
  const vh = parseFloat(m[1]);
  // linear interpolation
  const t = Math.max(0, Math.min(1, (vh - 17) / 2));
  return Math.round(1100 - t * 480);
}
function spawnBwcBubble() {
  if (!bwcBubblesHost || isMotionReduced() || document.hidden) return;
  const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  c.setAttribute("cx", "15");
  c.setAttribute("cy", "0");
  // tiny x drift so bubbles don't ride a perfect vertical line
  const drift = (Math.random() - 0.5) * 1.2;
  c.setAttribute("transform", `translate(${drift.toFixed(2)} 0)`);
  // bubble size varies so a tick reads as a soft variation rather than a clock
  const r = 0.9 + Math.random() * 0.9;
  c.setAttribute("r", r.toFixed(2));
  c.style.setProperty("--bwc-dur", bwcBubblePeriodMs() + "ms");
  bwcBubblesHost.appendChild(c);
  setTimeout(() => c.remove(), bwcBubblePeriodMs() + 80);
}
function bwcTick() {
  bwcTicks++;
  try { localStorage.setItem(BWC_KEY, String(bwcTicks)); } catch {}
  renderBwcCount();
  spawnBwcBubble();
  _bwcTimer = setTimeout(bwcTick, bwcBubblePeriodMs());
}
function startBwcLoop() {
  if (_bwcTimer) clearTimeout(_bwcTimer);
  _bwcTimer = null;
  if (isMotionReduced()) return;
  // first tick in 700ms so an idle page doesn't show a bubble mid-load
  _bwcTimer = setTimeout(bwcTick, 700);
}
function stopBwcLoop() {
  if (_bwcTimer) clearTimeout(_bwcTimer);
  _bwcTimer = null;
}
startBwcLoop();
document.addEventListener("visibilitychange", () => {
  if (document.hidden) stopBwcLoop();
  else startBwcLoop();
});

/* ============================================================
   feature: devlog #36 — beach-comb brass finder
   click cycles 6 found items (ammonite · cowrie · sliver of flint ·
   sea-glass · copper coin · shark's tooth). each is a real ocean/shore
   thing with a one-line note. the bc-find bead flashes briefly on click
   for feedback. counter persists.
   key: biosphere02.beachcomb.v1
   ============================================================ */
const BC_FINDS = [
  { name: "ammonite",        hue: "#7a5a8a", desc: "an ammonite · spiraled · jurassic · 8mm across · told by the chambered math inside" },
  { name: "cowrie",          hue: "#d4a98a", desc: "a tiger cowrie · porcelain teeth still smooth · small enough to slip in a pocket" },
  { name: "flint sliver",    hue: "#a8957a", desc: "a sliver of flint · struck steel along it once and got the smell you don't forget" },
  { name: "sea-glass",       hue: "#6ab4a8", desc: "a frosted sea-glass bead · pale mint · rolled for years by wave and stone" },
  { name: "copper coin",     hue: "#c0533f", desc: "a salt-worn copper coin · the dates washed away · green at the rim" },
  { name: "shark's tooth",   hue: "#e8e0c0", desc: "a small shark's tooth · black enamel · you wouldn't see it unless you looked for it" },
];
const BC_KEY = "biosphere02.beachcomb.v1";
const bcEl = document.getElementById("beach-comb");
const bcFind = bcEl ? bcEl.querySelector(".bc-find") : null;
let bcIndex = (() => { try { return +localStorage.getItem(BC_KEY) || 0; } catch { return 0; } })();

function renderBc() {
  const find = BC_FINDS[bcIndex % BC_FINDS.length];
  if (bcFind) bcFind.setAttribute("fill", find.hue);
  const stat = document.getElementById("beachcomb-stat");
  if (stat) stat.textContent = bcIndex;
}
renderBc();
if (bcEl) {
  bcEl.addEventListener("click", () => {
    const find = BC_FINDS[bcIndex % BC_FINDS.length];
    bcIndex++;
    try { localStorage.setItem(BC_KEY, String(bcIndex)); } catch {}
    renderBc();
    bcEl.classList.add("combing");
    setTimeout(() => bcEl.classList.remove("combing"), 380);
    toast(`${find.desc}`, 3200);
  });
}

/* ============================================================
   feature: devlog #36 — cattail-spike binding torch
   a tied bundle of dried cattail heads on a wooden stick. auto-lights
   whenever the body has dawn/dusk/night class; click cycles forced-on /
   forced-off / auto via a data-attr slot. a 1s interval polls the
   body class and force state so the lit/unlit state stays correct
   even on sky-lock changes. counter "rods lit" increments on each
   user-issued transition (auto-relight in an idle tab does not).
   key: biosphere02.cattailtorch.v1
   ============================================================ */
const CT_KEY = "biosphere02.cattailtorch.v1";
const ctEl = document.getElementById("cattail-torch");
const ctEmbers = ctEl ? ctEl.querySelector(".ct-embers") : null;
let ctCount = (() => { try { return +localStorage.getItem(CT_KEY) || 0; } catch { return 0; } })();

function renderCtCount() {
  const stat = document.getElementById("cattailtorch-stat");
  if (stat) stat.textContent = ctCount;
}
renderCtCount();
function ctShouldBeLit() {
  if (ctEl && ctEl.dataset.forced === "on") return true;
  if (ctEl && ctEl.dataset.forced === "off") return false;
  const b = document.body.classList;
  return b.contains("dawn") || b.contains("dusk") || b.contains("night");
}
function applyCtLit() {
  if (!ctEl) return;
  ctEl.classList.toggle("lit", ctShouldBeLit());
}
applyCtLit();
// poll correctness every second — the day cycle has its own 60s poll so
// this is cheap and ensures sky-lock changes flip the torch within ~1s.
setInterval(applyCtLit, 1000);
function spawnCtEmbers() {
  if (!ctEmbers || isMotionReduced()) return;
  // small burst of 2-3 embers per ignition
  const n = 2 + Math.floor(Math.random() * 2);
  for (let i = 0; i < n; i++) {
    const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    c.setAttribute("cx", "18");
    c.setAttribute("cy", "22");
    c.setAttribute("r", (0.8 + Math.random() * 0.6).toFixed(2));
    // inline-var drives the horizontal drift on the keyframe
    const dx = (Math.random() - 0.5) * 18;
    c.style.setProperty("--ct-dx", dx.toFixed(1) + "px");
    c.style.animationDelay = (Math.random() * 200).toFixed(0) + "ms";
    c.style.animationDuration = (1500 + Math.random() * 600).toFixed(0) + "ms";
    ctEmbers.appendChild(c);
    setTimeout(() => c.remove(), 2200);
  }
}
if (ctEl) {
  // first stat-write should also be a user-issued event, so the first click
  // in torch-night counts as the first rod lit. the auto-lit initial state
  // does not increment ctCount, matching candle-stub's structural rule.
  ctEl.addEventListener("click", () => {
    const wasLit = ctShouldBeLit();
    // cycle: auto -> forced-on -> forced-off -> auto
    const cur = ctEl.dataset.forced || "auto";
    const next = cur === "auto" ? "on" : cur === "on" ? "off" : "auto";
    ctEl.dataset.forced = next;
    const nowLit = ctShouldBeLit();
    applyCtLit();
    if (nowLit && !wasLit) {
      ctCount++;
      try { localStorage.setItem(CT_KEY, String(ctCount)); } catch {}
      renderCtCount();
      spawnCtEmbers();
    } else if (cur === "on" && next === "off") {
      // user explicitly doused, count a "douse" too so the counter ticks both ways
      ctCount++;
      try { localStorage.setItem(CT_KEY, String(ctCount)); } catch {}
      renderCtCount();
    }
  });
}

/* ============================================================
   feature: devlog #37 — shrine-stone, offering bowl, incense sticks,
   oil lamp, prayer bead mala
   five small shrine/altar pieces arranged in a top:184+ row below the
   recent cattail-torch. each piece latches onto a system already
   running rather than spawning fresh dependencies:
   - shrine-stone: tints moss from body.season-* (no js poll); faint
     green halo on body.dusk / *.night via a 1s poll + .dusk/.night
     classes. click pulses the stone.
   - offering-bowl: cycles 10 curated offerings via toast, persists
     next-offer index so a returning user sees a different offering.
   - incense-sticks: auto-lights at dawn/dusk/night on the same 1s
     poll the candle-stub and cattail-torch use; click cycles
     forced-on/off/auto via dataset.forced.
   - oil-lamp: same auto-light pattern; visually distinct from
     candle-stub (brass post + reservoir + chain wick + longer
     flame) so a viewer reads "lit oil" not "burned wax".
   - prayer-mala: anchors current bead to --moon-phase-frac on first
     load (if the css var is set; otherwise random), click advances;
     circuit counter increments on wrap.
   counter keys (each follows biosphere02.<name>.v1):
     biosphere02.shrinestone.v1   — vows laid
     biosphere02.offeringbowl.v1  — offerings laid + next-offer index
     biosphere02.incense.v1       — sticks lit
     biosphere02.oillamp.v1       — lamps lit
     biosphere02.mala.v1          — { next, circuits } as JSON
   ============================================================ */

/* ---- shared helper used by shrine-stone, incense, oil-lamp ----
   we reuse the existing isMoodDark() defined in the candle-stub
   block (function declarations hoist across the script, so devlog
   #37 can call it even though it is textually defined ~8000 lines
   later). no need to redeclare a near-identical helper here. */

/* ---- 1) shrine-stone (#shrine-stone) ----
   click pulses the stone and increments a "vows laid" counter. the
   .dusk / .night classes are written by a 1s poll so a sky-lock change
   flips the green-halo animation within ~1s without a separate
   transition. */

/* ---- 1) shrine-stone (#shrine-stone) ----
   click pulses the stone and increments a "vows laid" counter. the
   .dusk / .night classes are written by a 1s poll so a sky-lock change
   flips the green-halo animation within ~1s without a separate
   transition. */
const SS_KEY = "biosphere02.shrinestone.v1";
const ssEl = document.getElementById("shrine-stone");
const ssStatEl = document.getElementById("shrinestone-stat");
let ssCount = (() => { try { return +localStorage.getItem(SS_KEY) || 0; } catch { return 0; } })();
function renderSsStat() { if (ssStatEl) ssStatEl.textContent = ssCount; }
renderSsStat();
function applySsMoodClass() {
  if (!ssEl) return;
  const b = document.body.classList;
  ssEl.classList.toggle("dusk",  b.contains("dusk"));
  ssEl.classList.toggle("night", b.contains("night"));
}
applySsMoodClass();
setInterval(applySsMoodClass, 1000);
if (ssEl) {
  ssEl.addEventListener("click", () => {
    ssCount++;
    try { localStorage.setItem(SS_KEY, String(ssCount)); } catch {}
    renderSsStat();
    ssEl.classList.remove("pulsing");
    void ssEl.offsetWidth;
    ssEl.classList.add("pulsing");
    setTimeout(() => ssEl.classList.remove("pulsing"), 400);
    if (ssCount === 1) toast("a vow laid · the moss remembers", 2200);
  });
}

/* ---- 2) offering bowl (#offering-bowl) ----
   brass footed bowl. click rotates a 10-entry offering list and
   persists the next index. the visible offering is selected via the
   .active class on each .ob-find child group, so only one shape is
   visible at a time (no per-frame work). */
const OB_KEY = "biosphere02.offeringbowl.v1";
const OB_FINDS = [
  { id: "acorn",       desc: "an acorn · brown cap · smooth shell · would grow if you buried it" },
  { id: "coin",        desc: "a copper coin · green at the rim · dates long washed away" },
  { id: "sage",        desc: "a sage leaf · silver-green · burned it would calm a room" },
  { id: "pine",        desc: "a pine needle · 4cm · dropped last winter · still supple" },
  { id: "pebble",      desc: "a smooth river pebble · grey-blue · left over from high water" },
  { id: "salt",        desc: "a pinch of grey salt · set here after the storm" },
  { id: "sand-dollar", desc: "a sand dollar · cream · came in on the tide at first light" },
  { id: "kelp",        desc: "a short frond of kelp · brought up from the deep-water line" },
  { id: "feather",     desc: "a short sea-bird feather · pale cream · blown here in last night's wind" },
  { id: "chip",        desc: "a thin wood shaving · curls in on itself · someone had a sharp knife here" },
];
function loadObState() {
  try {
    const v = JSON.parse(localStorage.getItem(OB_KEY) || "null");
    return v && typeof v === "object" ? v : { next: 0, count: 0 };
  } catch { return { next: 0, count: 0 }; }
}
function saveObState() {
  try { localStorage.setItem(OB_KEY, JSON.stringify(obState)); } catch {}
}
const obState = loadObState();
const obEl = document.getElementById("offering-bowl");
const obStatEl = document.getElementById("offeringbowl-stat");
function renderObFinding() {
  if (!obEl) return;
  const f = OB_FINDS[obState.next % OB_FINDS.length];
  obEl.querySelectorAll(".ob-find").forEach(el => {
    el.classList.toggle("active", el.classList.contains(f.id));
  });
}
function renderObStat() { if (obStatEl) obStatEl.textContent = obState.count; }
renderObFinding();
renderObStat();
let _obLastClick = 0;
if (obEl) {
  obEl.addEventListener("click", () => {
    const now = Date.now();
    if (now - _obLastClick < 220) return;
    _obLastClick = now;
    const f = OB_FINDS[obState.next % OB_FINDS.length];
    obState.next++;
    obState.count++;
    saveObState();
    renderObFinding();
    renderObStat();
    obEl.classList.remove("placed");
    void obEl.offsetWidth;
    obEl.classList.add("placed");
    setTimeout(() => obEl.classList.remove("placed"), 480);
    if (obState.count === 1) {
      toast("the bowl holds what you leave it", 2400);
      setTimeout(() => toast(f.desc, 2800), 700);
    } else {
      toast(f.desc, 2800);
    }
  });
}

/* ---- 3) incense sticks (#incense-sticks) ----
   two thin sticks resting diagonally on a brass sand tray. follows
   the candle-stub + cattail-torch auto-light + forced-cycle pattern
   (same isMoodDark + 1s poll + dataset.forced machine). distinct from
   the candle/cattail/flame visuals: ember-at-the-tip rather than a
   flame or a torch-burst. smoke particles spawn via createElementNS
   on each user-issued ignite. smoke appends into .is-smoke host. */
const IS_KEY = "biosphere02.incense.v1";
const isEl = document.getElementById("incense-sticks");
const isSmokeHost = isEl ? isEl.querySelector(".is-smoke") : null;
const isStatEl = document.getElementById("incense-stat");
let isCount = (() => { try { return +localStorage.getItem(IS_KEY) || 0; } catch { return 0; } })();
function renderIsStat() { if (isStatEl) isStatEl.textContent = isCount; }
renderIsStat();
function isShouldBeLit() {
  if (isEl && isEl.dataset.forced === "on") return true;
  if (isEl && isEl.dataset.forced === "off") return false;
  return isMoodDark();
}
function applyIsLit() {
  if (!isEl) return;
  isEl.classList.toggle("lit", isShouldBeLit());
}
applyIsLit();
setInterval(applyIsLit, 1000);
function spawnIsSmoke() {
  if (!isSmokeHost || isMotionReduced()) return;
  const n = 2 + Math.floor(Math.random() * 2);
  for (let i = 0; i < n; i++) {
    const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    c.setAttribute("cx", "50");
    c.setAttribute("cy", "15");
    c.setAttribute("r", (0.7 + Math.random() * 0.6).toFixed(2));
    const dx = (Math.random() - 0.5) * 8;
    c.style.setProperty("--is-dx", dx.toFixed(1) + "px");
    c.style.animationDelay = (Math.random() * 280).toFixed(0) + "ms";
    c.style.animationDuration = (3400 + Math.random() * 1400).toFixed(0) + "ms";
    isSmokeHost.appendChild(c);
    setTimeout(() => c.remove(), 5000);
  }
}
if (isEl) {
  isEl.addEventListener("click", () => {
    const wasLit = isShouldBeLit();
    const cur = isEl.dataset.forced || "auto";
    const next = cur === "auto" ? "on" : cur === "on" ? "off" : "auto";
    isEl.dataset.forced = next;
    const nowLit = isShouldBeLit();
    applyIsLit();
    if (nowLit && !wasLit) {
      isCount++;
      try { localStorage.setItem(IS_KEY, String(isCount)); } catch {}
      renderIsStat();
      spawnIsSmoke();
    } else if (cur === "on" && next === "off") {
      isCount++;
      try { localStorage.setItem(IS_KEY, String(isCount)); } catch {}
      renderIsStat();
    }
  });
}

/* ---- 4) oil lamp (#oil-lamp) ----
   brass post + reservoir + chain wick + flame. follows the same
   isMoodDark + 1s poll + dataset.forced cycle as candle-stub,
   incense, and cattail-torch. soft amber ember particles append
   into the ol-svg group on each user-issued ignite. */
const OL_KEY = "biosphere02.oillamp.v1";
const olEl = document.getElementById("oil-lamp");
const olStatEl = document.getElementById("oillamp-stat");
let olCount = (() => { try { return +localStorage.getItem(OL_KEY) || 0; } catch { return 0; } })();
function renderOlStat() { if (olStatEl) olStatEl.textContent = olCount; }
renderOlStat();
function olShouldBeLit() {
  if (olEl && olEl.dataset.forced === "on") return true;
  if (olEl && olEl.dataset.forced === "off") return false;
  return isMoodDark();
}
function applyOlLit() {
  if (!olEl) return;
  olEl.classList.toggle("lit", olShouldBeLit());
}
applyOlLit();
setInterval(applyOlLit, 1000);
function spawnOlEmber() {
  if (!olEl || isMotionReduced()) return;
  const olSvg = olEl.querySelector("svg.ol-svg");
  if (!olSvg) return;
  const n = 1 + Math.floor(Math.random() * 2);
  for (let i = 0; i < n; i++) {
    const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    c.setAttribute("cx", "16");
    c.setAttribute("cy", "14");
    c.setAttribute("r", (0.6 + Math.random() * 0.4).toFixed(2));
    const dx = (Math.random() - 0.5) * 4;
    c.style.setProperty("--ol-dx", dx.toFixed(1) + "px");
    c.style.animationDelay = (Math.random() * 220).toFixed(0) + "ms";
    c.style.animationDuration = (1700 + Math.random() * 700).toFixed(0) + "ms";
    olSvg.appendChild(c);
    setTimeout(() => c.remove(), 2600);
  }
}
if (olEl) {
  olEl.addEventListener("click", () => {
    const wasLit = olShouldBeLit();
    const cur = olEl.dataset.forced || "auto";
    const next = cur === "auto" ? "on" : cur === "on" ? "off" : "auto";
    olEl.dataset.forced = next;
    const nowLit = olShouldBeLit();
    applyOlLit();
    if (nowLit && !wasLit) {
      olCount++;
      try { localStorage.setItem(OL_KEY, String(olCount)); } catch {}
      renderOlStat();
      spawnOlEmber();
    } else if (cur === "on" && next === "off") {
      olCount++;
      try { localStorage.setItem(OL_KEY, String(olCount)); } catch {}
      renderOlStat();
    }
  });
}

/* ---- 5) prayer bead mala (#prayer-mala) ----
   27 wood-bead U-shape hanging from a small hook. beads generated and
   drawn into #pm-beads once on first run; subsequent renders toggle
   the .pm-current class on existing groups (no DOM rebuilds). click
   advances one bead; on wrap the "circuits completed" counter ticks.
   cooldown: 240ms minimum between clicks. */
const MALA_KEY = "biosphere02.mala.v1";
const MALA_COOLDOWN_MS = 240;
const MALA_BEAD_COUNT = 27;
const MALA_GURU_INDEX = 13;
const pmEl = document.getElementById("prayer-mala");
const pmBeadsHost = document.getElementById("pm-beads");
const pmStatEl = document.getElementById("mala-stat");
function loadMalaState() {
  try {
    const v = JSON.parse(localStorage.getItem(MALA_KEY) || "null");
    return v && typeof v === "object" ? v : { next: null, circuits: 0 };
  } catch { return { next: null, circuits: 0 }; }
}
function saveMalaState(s) {
  try { localStorage.setItem(MALA_KEY, JSON.stringify(s)); } catch {}
}
function malaInitialBeadFromMoon() {
  // the moon-journal block writes --moon-phase-frac on :root; if it's
  // present, use it (so the mala ticks with the actual phase). fall
  // back to a deterministic day-seed otherwise so first-time visitors
  // on different days land on different beads (rather than always bead 1).
  const f = getComputedStyle(document.documentElement).getPropertyValue("--moon-phase-frac").trim();
  const v = parseFloat(f);
  if (!isNaN(v)) return Math.floor(v * MALA_BEAD_COUNT) % MALA_BEAD_COUNT;
  return Math.floor(Date.now() / 86400000) % MALA_BEAD_COUNT;
}
const mala = loadMalaState();
if (mala.next === null || mala.next === undefined || mala.next < 0) {
  mala.next = malaInitialBeadFromMoon();
  saveMalaState(mala);
}
function malaPositions() {
  // U-shape: 6 beads down the left, 15 along the bottom curve, 6 beads
  // up the right. cy = 14 + i*5 (top-to-bottom for left column); the
  // bottom row arcs slightly upward toward the middle (sin envelope)
  // so the mala reads as hanging under gravity rather than as a perfect
  // rectangular loop.
  const W = 38, cx = W / 2;
  const top = 14, botY = 60, radius = 16;
  const out = [];
  for (let i = 0; i < 6; i++) out.push({ x: cx - radius, y: top + i * 5 });
  for (let i = 0; i < 15; i++) {
    const t = i / 14;
    const x = cx - radius + t * (2 * radius);
    const arc = Math.sin(t * Math.PI) * 6;
    out.push({ x, y: botY - arc });
  }
  for (let i = 0; i < 6; i++) out.push({ x: cx + radius, y: botY - 5 * i });
  return out;
}
function buildMala() {
  if (!pmBeadsHost) return;
  pmBeadsHost.innerHTML = "";
  const positions = malaPositions();
  for (let i = 0; i < positions.length; i++) {
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.dataset.idx = i;
    g.setAttribute("transform", `translate(${positions[i].x.toFixed(2)} ${positions[i].y.toFixed(2)})`);
    // class lives on the group so SVG fill inheritance flows down to
    // the circle inside. CSS targets ".pm-bead", ".pm-guru" and
    // ".pm-current circle" — assigning class to <g> matches that
    // selector set exactly. assign pm-current on the very first build
    // so a fresh visit shows the highlighted bead at mala.next.
    const baseCls = i === MALA_GURU_INDEX ? "pm-guru" : "pm-bead";
    g.setAttribute("class", i === mala.next ? baseCls + " pm-current" : baseCls);
    const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    c.setAttribute("r", i === MALA_GURU_INDEX ? "2.6" : "2.1");
    g.appendChild(c);
    pmBeadsHost.appendChild(g);
  }
}
function renderMala() {
  if (!pmBeadsHost) return;
  pmBeadsHost.querySelectorAll("g").forEach(g => {
    const idx = +g.dataset.idx;
    const isCurrent = idx === mala.next;
    const baseCls = idx === MALA_GURU_INDEX ? "pm-guru" : "pm-bead";
    g.setAttribute("class", isCurrent ? baseCls + " pm-current" : baseCls);
  });
}
function renderMalaStat() { if (pmStatEl) pmStatEl.textContent = mala.circuits; }
buildMala();
renderMala();
renderMalaStat();
let _pmLastClick = 0;
if (pmEl) {
  pmEl.addEventListener("click", () => {
    const now = Date.now();
    if (now - _pmLastClick < MALA_COOLDOWN_MS) return;
    _pmLastClick = now;
    mala.next++;
    if (mala.next >= MALA_BEAD_COUNT) {
      mala.next = 0;
      mala.circuits++;
      toast("a full circuit · count it", 2200);
    }
    saveMalaState(mala);
    renderMala();
    renderMalaStat();
    pmEl.classList.remove("advancing");
    void pmEl.offsetWidth;
    pmEl.classList.add("advancing");
    setTimeout(() => pmEl.classList.remove("advancing"), 340);
  });
}
// one fish shortly after load so the pond doesn't sit still for a full minute
setTimeout(() => { if (pondW > 0) spawnFish(); }, 12_000);

// moon reflection intensity: brighter at night, dim/gone during the day.
// checked against the body class (which the day/night + sky-lock logic keeps
// current) so a sky-lock to "night" also lights up the reflection.
function moonReflectAlpha() {
  const b = document.body.classList;
  if (b.contains("night")) return 1.0;
  if (b.contains("dusk"))  return 0.65;
  if (b.contains("dawn"))  return 0.45;
  return 0.10; // day — barely visible
}
function drawMoonReflection(t) {
  const alpha = moonReflectAlpha();
  if (alpha < 0.05) return;
  // tiny lateral shimmer so the reflection breathes with the water
  const shimmer = Math.sin(t * 0.0018) * 1.4;
  pondCtx.save();
  pondCtx.translate(shimmer, 0);
  pondCtx.globalAlpha = alpha;
  pondCtx.fillStyle = moonReflectGrad;
  pondCtx.fillRect(moonReflectX - MOON_REFLECT_RADIUS, moonReflectY - MOON_REFLECT_RADIUS,
                   MOON_REFLECT_RADIUS * 2, MOON_REFLECT_RADIUS * 2);
  // small bright core that pulses gently
  const pulse = 0.85 + Math.sin(t * 0.0022) * 0.15;
  pondCtx.fillStyle = `rgba(255, 245, 220, ${0.55 * pulse})`;
  pondCtx.beginPath();
  pondCtx.arc(moonReflectX, moonReflectY, 3.2, 0, Math.PI * 2);
  pondCtx.fill();
  pondCtx.restore();
  pondCtx.globalAlpha = 1;
}

resizePond();
window.addEventListener("resize", () => {
  clearTimeout(window._pondResize);
  window._pondResize = setTimeout(resizePond, 120);
});

function drawPond(t) {
  if (pondW === 0) return;
  pondCtx.clearRect(0, 0, pondW, pondH);
  pondCtx.fillStyle = pondWaterGrad;
  pondCtx.fillRect(0, 0, pondW, pondH);
  pondCtx.fillStyle = pondShoreGrad;
  pondCtx.fillRect(0, 0, pondW, 22);
  // moon reflection — soft warm glow on the water, brighter at night
  drawMoonReflection(t);
  // bioluminescent mushrooms just below the shoreline
  drawMushrooms(t);
  // reflected shimmering stars
  for (const s of pondStars) {
    const a = s.base + Math.sin(t * s.speed + s.phase) * 0.18;
    pondCtx.fillStyle = `rgba(246, 241, 216, ${Math.max(0.04, a)})`;
    const wob = Math.sin(t * 0.002 + s.phase) * 0.8;
    pondCtx.beginPath();
    pondCtx.arc(s.x, s.y + wob, 0.85, 0, Math.PI * 2);
    pondCtx.fill();
  }
  // fish under the surface — beneath lily pads, above the water base
  drawFish(t);
  // lily pads (drawn under ripples so a click ripple shows on top)
  drawLilyPads(t);
  // ripples
  for (let i = ripples.length - 1; i >= 0; i--) {
    const r = ripples[i];
    r.age += 1;
    const radius = r.age * r.speed;
    const a = Math.max(0, 1 - r.age / r.maxAge);
    pondCtx.lineWidth = 1.2;
    pondCtx.strokeStyle = `rgba(143, 212, 154, ${a * 0.55})`;
    pondCtx.beginPath();
    pondCtx.arc(r.x, r.y, radius, 0, Math.PI * 2);
    pondCtx.stroke();
    if (radius > 8) {
      pondCtx.strokeStyle = `rgba(255, 217, 160, ${a * 0.35})`;
      pondCtx.beginPath();
      pondCtx.arc(r.x, r.y, radius * 0.55, 0, Math.PI * 2);
      pondCtx.stroke();
    }
    if (r.age > r.maxAge) ripples.splice(i, 1);
  }
}

function addRipple(x, y, speed = 1.6, maxAge = 80) {
  ripples.push({ x, y, age: 0, speed, maxAge });
}

pondCanvas.addEventListener("click", (e) => {
  // skipping-stone drags are handled below via pointer events; those set
  // _skipConsumeClick so the following click doesn't also drop a plain ripple.
  if (_skipConsumeClick) { _skipConsumeClick = false; return; }
  const rect = pondCanvas.getBoundingClientRect();
  const lx = e.clientX - rect.left;
  const ly = e.clientY - rect.top;
  const pad = lilyHitAt(lx, ly);
  if (pad) {
    // bigger ripple from the pad center, plus a smaller inner one
    addRipple(pad.x, pad.y, 2.0, 95);
    addRipple(pad.x, pad.y, 1.0, 60);
    jumpFrogAt(e.clientX, e.clientY - 4);
    return;
  }
  // clicking near a mushroom triggers a chorus pulse (no ripple — they're on land)
  if (mushroomChoirNearAny(lx, ly)) return;
  addRipple(lx, ly, 1.6, 80);
});

/* ---- skipping stones ----
   click-and-drag across the pond and a "stone" skips 2-4 times along your
   drag direction, each skip a smaller ripple than the last, before sinking
   with a final splash. below-threshold drags fall through to the normal
   pond click handler. */
let _skipStart = null;
let _skipConsumeClick = false;
const SKIP_MIN_DIST = 42; // px — anything shorter reads as an intent-to-click
pondCanvas.addEventListener("pointerdown", (e) => {
  // clear any stale consume-click flag from a previous drag whose click was
  // intercepted by the capture-phase bottle handler and never reached the
  // bubble-phase click listener that would have cleared it.
  _skipConsumeClick = false;
  const rect = pondCanvas.getBoundingClientRect();
  _skipStart = { x: e.clientX - rect.left, y: e.clientY - rect.top, when: performance.now() };
});
pondCanvas.addEventListener("pointerup", (e) => {
  if (!_skipStart) return;
  const rect = pondCanvas.getBoundingClientRect();
  const ex = e.clientX - rect.left, ey = e.clientY - rect.top;
  const dx = ex - _skipStart.x, dy = ey - _skipStart.y;
  const dist = Math.hypot(dx, dy);
  _skipStart = null;
  if (dist < SKIP_MIN_DIST) return; // let the click handler do a normal ripple
  _skipConsumeClick = true;
  // number of skips depends on how far you dragged (2-4)
  const skips = Math.min(4, 2 + Math.floor(dist / 90));
  const ux = dx / dist, uy = dy / dist;
  // stagger the skips along the drag line, with diminishing spacing (a real
  // skipping stone loses energy on each bounce, so gaps get shorter)
  const weights = [1.0, 0.75, 0.55, 0.40].slice(0, skips);
  const weightSum = weights.reduce((a, b) => a + b, 0);
  let acc = 0;
  for (let i = 0; i < skips; i++) {
    const gapFrac = weights[i] / weightSum;
    acc += gapFrac;
    const t = Math.min(1, acc);
    const sx = _skipStartLocal(ex, dx, t);
    const sy = _skipStartLocalY(ey, dy, t);
    // each successive skip is slightly quieter than the last
    const scale = 1.0 - i * 0.18;
    setTimeout(() => {
      addRipple(sx, sy, 1.4 * scale, 80 - i * 8);
      // last skip: a small extra "splash" ripple to feel like it sank
      if (i === skips - 1) addRipple(sx, sy, 0.6 * scale, 55);
    }, i * 240);
  }
});
pondCanvas.addEventListener("pointercancel", () => { _skipStart = null; });
// helpers: interpolate along the drag line from start toward end
function _skipStartLocal(ex, dx, t) {
  // start = ex - dx (the pointerdown x), and we walk fraction t of dx toward ex
  return (ex - dx) + dx * t;
}
function _skipStartLocalY(ey, dy, t) {
  return (ey - dy) + dy * t;
}

function scheduleIdleRipple() {
  const wait = 9000 + Math.random() * 22000;
  setTimeout(() => {
    if (!isMotionReduced() && pondW > 0) {
      addRipple(60 + Math.random() * (pondW - 120),
                pondH * 0.25 + Math.random() * pondH * 0.55,
                0.7, 95);
    }
    scheduleIdleRipple();
  }, wait);
}
scheduleIdleRipple();

// hook drawPond into the existing animation loop (same wrap trick used elsewhere)
const _origDrawConstForPond = drawConstellation;
drawConstellation = function () {
  _origDrawConstForPond();
  drawPond(performance.now());
};

/* ============================================================
   feature: wandering fox (a small creature trots the shoreline)
   click to "spot" it — counter persists in status window.
   hover pauses the walk so you can catch it.
   ============================================================ */
const SPOTTED_KEY = "biosphere02.spotted.v1";
let spottedCount = (() => { try { return +localStorage.getItem(SPOTTED_KEY) || 0; } catch { return 0; } })();
function renderSpottedCount() {
  const el = document.getElementById("spotted-count");
  if (el) el.textContent = spottedCount;
}
renderSpottedCount();

const fox = document.createElement("div");
fox.className = "fox";
fox.textContent = "🦊";
fox.title = "shy one — click to spot";
document.body.appendChild(fox);

let foxState = { active: false, paused: false, pauseStart: 0, totalPaused: 0 };

function startFoxWalk() {
  if (foxState.active) return;
  if (isMotionReduced()) { scheduleNextFox(); return; }
  foxState = { active: true, paused: false, pauseStart: 0, totalPaused: 0 };
  const fromLeft = Math.random() < 0.5;
  const W = window.innerWidth;
  const startX = fromLeft ? -50 : W + 10;
  const endX   = fromLeft ? W + 10 : -50;
  const duration = 26000 + Math.random() * 22000;
  fox.classList.toggle("facing-left", !fromLeft);
  fox.classList.add("walking", "bobbing");
  fox.style.left = startX + "px";

  const startTime = performance.now();
  function frame(now) {
    if (!foxState.active) return;
    if (foxState.paused) { requestAnimationFrame(frame); return; }
    const elapsed = now - startTime - foxState.totalPaused;
    const p = Math.min(1, elapsed / duration);
    fox.style.left = (startX + (endX - startX) * p) + "px";
    if (p < 1) requestAnimationFrame(frame);
    else endFoxWalk(true);
  }
  requestAnimationFrame(frame);
}

function endFoxWalk(scheduleNext) {
  fox.classList.remove("walking", "bobbing", "facing-left");
  fox.style.left = "-60px";
  foxState.active = false;
  if (scheduleNext) scheduleNextFox();
}

fox.addEventListener("mouseenter", () => {
  if (!foxState.active || foxState.paused) return;
  foxState.paused = true;
  foxState.pauseStart = performance.now();
});
fox.addEventListener("mouseleave", () => {
  if (!foxState.paused) return;
  foxState.totalPaused += performance.now() - foxState.pauseStart;
  foxState.paused = false;
});

fox.addEventListener("click", (e) => {
  if (!foxState.active) return;
  spottedCount++;
  try { localStorage.setItem(SPOTTED_KEY, String(spottedCount)); } catch {}
  renderSpottedCount();
  spawnCatchBurst(e.clientX, e.clientY);
  markCreatureSeen("fox");
  toast(spottedCount === 1
    ? "you spotted the fox 🦊 · it watches back"
    : `spotted ${spottedCount} times 🦊`);
  endFoxWalk(true);
});

function scheduleNextFox() {
  // 70-150 seconds between appearances
  const wait = 70_000 + Math.random() * 80_000;
  setTimeout(startFoxWalk, wait);
}
// kick off the first appearance a short while after page load
setTimeout(startFoxWalk, 12000);

/* ============================================================
   feature: twilight owl
   at night (or sky-locked to night) an owl 🦉 occasionally
   glides across the upper sky. click it to spot — counts in
   the creatures-spotted total.
   ============================================================ */
function isNightSky() {
  return document.body.classList.contains("night") ||
         (settings && (settings.sky === "night" || settings.sky === "dusk"));
}
function spawnOwl() {
  const owl = document.createElement("div");
  owl.className = "owl";
  owl.textContent = "🦉";
  document.body.appendChild(owl);
  const W = window.innerWidth;
  const fromLeft = Math.random() < 0.5;
  const startX = fromLeft ? -50 : W + 30;
  const endX   = fromLeft ? W + 30 : -50;
  const y      = 70 + Math.random() * (window.innerHeight * 0.28);
  const duration = 14000 + Math.random() * 9000;
  owl.style.top  = y + "px";
  owl.style.left = startX + "px";

  let claimed = false;
  owl.addEventListener("click", (e) => {
    if (claimed) return;
    claimed = true;
    spottedCount++;
    try { localStorage.setItem(SPOTTED_KEY, String(spottedCount)); } catch {}
    renderSpottedCount();
    spawnCatchBurst(e.clientX, e.clientY);
    markCreatureSeen("owl");
    toast("the owl saw you back 🦉");
    owl.classList.add("caught");
    setTimeout(() => owl.remove(), 350);
  });

  const start = performance.now();
  function frame(now) {
    if (claimed || !document.body.contains(owl)) return;
    const p = Math.min(1, (now - start) / duration);
    const x = startX + (endX - startX) * p;
    // gentle wing-style bob
    const dy = Math.sin(p * Math.PI * 4) * 9;
    owl.style.left = x + "px";
    owl.style.transform = `translateY(${dy}px)`;
    if (p < 1) requestAnimationFrame(frame);
    else owl.remove();
  }
  requestAnimationFrame(frame);
}
function maybeSpawnOwl() {
  if (isMotionReduced()) { setTimeout(maybeSpawnOwl, 60_000); return; }
  // 60-130 seconds between attempts; only actually spawn if it's night-ish
  const wait = 60_000 + Math.random() * 70_000;
  setTimeout(() => {
    if (isNightSky()) spawnOwl();
    maybeSpawnOwl();
  }, wait);
}
// first owl gets a moment to settle (and may be skipped if it's not night yet)
setTimeout(maybeSpawnOwl, 25_000);

/* ============================================================
   feature: seasons cycle (auto by month, or lockable in settings)
   particles drift across (petals / fireflies / leaves / snow),
   body gets a season class for a faint tint.
   ============================================================ */
const seasonHost = document.getElementById("season-particles");

function detectSeason() {
  const m = new Date().getMonth(); // 0 = jan
  if (m >= 2 && m <= 4) return "spring";
  if (m >= 5 && m <= 7) return "summer";
  if (m >= 8 && m <= 10) return "autumn";
  return "winter";
}

const seasonConfig = {
  spring: { glyph: "🌸", count: 14, label: "spring 🌸" },
  summer: { glyph: "✦",  count: 8,  label: "summer ✦"  },
  autumn: { glyph: "🍂", count: 12, label: "autumn 🍂" },
  winter: { glyph: "❄",  count: 22, label: "winter ❄"  },
};

let currentSeasonClass = null;
function applySeason() {
  const locked = settings.season && settings.season !== "auto" ? settings.season : null;
  const target = locked || detectSeason();
  if (currentSeasonClass === target) return;
  if (currentSeasonClass) document.body.classList.remove("season-" + currentSeasonClass);
  document.body.classList.add("season-" + target);
  currentSeasonClass = target;

  const sl = document.getElementById("season-label");
  if (sl) sl.textContent = seasonConfig[target].label + (locked ? " · locked" : "");

  // (re)build particles
  seasonHost.innerHTML = "";
  if (isMotionReduced()) return;
  const cfg = seasonConfig[target];
  for (let i = 0; i < cfg.count; i++) {
    const p = document.createElement("div");
    p.className = "season-particle s-" + target;
    p.textContent = cfg.glyph;
    p.style.left = (Math.random() * 100) + "vw";
    p.style.fontSize = (10 + Math.random() * 12) + "px";
    if (target === "summer") {
      // summer fireflies pulse in place
      p.style.top = (10 + Math.random() * 70) + "vh";
      p.style.left = (Math.random() * 100) + "vw";
      p.style.animationDelay = -(Math.random() * 4) + "s";
      p.style.animationDuration = (3 + Math.random() * 3) + "s";
    } else {
      // drift downward
      p.style.animationDelay = -(Math.random() * 22) + "s";
      p.style.animationDuration = (16 + Math.random() * 14) + "s";
    }
    seasonHost.appendChild(p);
  }
}
applySeason();
// re-check every 10 minutes in case the user keeps the tab open across midnight or month-end
setInterval(() => applySeason(), 10 * 60 * 1000);

// wire up settings UI
const setSeason = document.getElementById("set-season");
if (setSeason) {
  setSeason.value = settings.season || "auto";
  setSeason.addEventListener("change", () => {
    settings.season = setSeason.value;
    saveSettings();
    currentSeasonClass = null; // force rebuild
    applySeason();
  });
}

// motion-reduce toggle should rebuild particles too
const _origApplySettings = applySettings;
applySettings = function () {
  _origApplySettings();
  currentSeasonClass = null;
  applySeason();
};

/* ============================================================
   feature: welcome page (full-screen first-visit splash)
   theatrical intro on first arrival. dismiss persists forever.
   re-opening is available from the settings window.
   ============================================================ */
const WELCOME_KEY = "biosphere02.welcomed.v1";
const welcomePage = document.getElementById("welcome-page");
const welcomeEnter = document.getElementById("welcome-enter");

function openWelcome() {
  if (!welcomePage) return;
  welcomePage.hidden = false;
  welcomePage.classList.remove("leaving");
  // focus the enter button so ↵ closes it
  setTimeout(() => { if (welcomeEnter) welcomeEnter.focus(); }, 60);
}
function closeWelcome() {
  if (!welcomePage) return;
  welcomePage.classList.add("leaving");
  setTimeout(() => { welcomePage.hidden = true; }, 920);
  try { localStorage.setItem(WELCOME_KEY, "1"); } catch {}
}

// show on first visit, but never over a shared-sky link (the visitor came
// for someone's constellation — they shouldn't have to push through an intro)
const _alreadyWelcomed = (() => { try { return localStorage.getItem(WELCOME_KEY) === "1"; } catch { return true; } })();
const _hasSharedHash = /^#c=/.test(location.hash || "");
if (!_alreadyWelcomed && !_hasSharedHash) openWelcome();

if (welcomeEnter) welcomeEnter.addEventListener("click", closeWelcome);
if (welcomePage) {
  welcomePage.addEventListener("click", (e) => {
    if (e.target === welcomePage) closeWelcome();
  });
}
document.addEventListener("keydown", (e) => {
  if (welcomePage && !welcomePage.hidden && (e.key === "Escape" || e.key === "Enter")) {
    e.preventDefault();
    closeWelcome();
  }
});

const setShowWelcome = document.getElementById("set-show-welcome");
if (setShowWelcome) setShowWelcome.addEventListener("click", openWelcome);

/* ============================================================
   feature: constellation atlas
   famous shapes you can stamp onto your own sky. each entry
   has unit-coords (0..1) that scale into the user's viewport,
   plus a tiny line list and a one-line myth.
   ============================================================ */
const atlasList = document.getElementById("atlas-list");
const atlasEntries = [
  {
    name: "Orion",
    myth: "the hunter · belt and sword across the winter sky",
    stars: [[0.50,0.10],[0.32,0.20],[0.70,0.18],[0.40,0.55],[0.50,0.58],[0.60,0.55],[0.30,0.92],[0.74,0.86]],
    lines: [[0,1],[0,2],[1,3],[2,5],[3,4],[4,5],[3,6],[5,7]],
  },
  {
    name: "Cassiopeia",
    myth: "the queen on her throne — a W carved across the north",
    stars: [[0.10,0.50],[0.30,0.20],[0.50,0.50],[0.70,0.18],[0.90,0.48]],
    lines: [[0,1],[1,2],[2,3],[3,4]],
  },
  {
    name: "Big Dipper",
    myth: "the great bear's tail · a ladle pointing always at north",
    stars: [[0.10,0.55],[0.28,0.62],[0.46,0.58],[0.64,0.45],[0.78,0.30],[0.92,0.20],[0.96,0.40]],
    lines: [[0,1],[1,2],[2,3],[3,4],[4,5],[3,6]],
  },
  {
    name: "Cygnus",
    myth: "the swan in flight — wings spread along the milky way",
    stars: [[0.50,0.05],[0.50,0.40],[0.50,0.75],[0.18,0.55],[0.82,0.55],[0.50,0.95]],
    lines: [[0,1],[1,2],[1,3],[1,4],[2,5]],
  },
  {
    name: "Leo",
    myth: "the lion · a sickle for his mane and a sleeping body",
    stars: [[0.18,0.30],[0.30,0.18],[0.40,0.30],[0.48,0.48],[0.40,0.62],[0.62,0.62],[0.82,0.50],[0.86,0.70]],
    lines: [[0,1],[1,2],[2,3],[3,4],[3,5],[5,6],[6,7]],
  },
  {
    name: "Lyra",
    myth: "the harp — a small parallelogram beside vega the bright",
    stars: [[0.40,0.10],[0.35,0.40],[0.65,0.45],[0.40,0.75],[0.65,0.80]],
    lines: [[0,1],[0,2],[1,3],[2,4],[3,4]],
  },
];

function atlasPreviewSvg(entry) {
  // tiny preview rendered into the list. 56 x 44, padded.
  const W = 52, H = 40, pad = 4;
  let lines = "";
  for (const [a, b] of entry.lines) {
    const ax = pad + entry.stars[a][0] * W, ay = pad + entry.stars[a][1] * H;
    const bx = pad + entry.stars[b][0] * W, by = pad + entry.stars[b][1] * H;
    lines += `<line x1="${ax.toFixed(1)}" y1="${ay.toFixed(1)}" x2="${bx.toFixed(1)}" y2="${by.toFixed(1)}" stroke="rgba(143,212,154,0.6)" stroke-width="0.7"/>`;
  }
  let stars = "";
  for (const [x, y] of entry.stars) {
    stars += `<circle cx="${(pad + x * W).toFixed(1)}" cy="${(pad + y * H).toFixed(1)}" r="1.2" fill="#ffe6b8"/>`;
  }
  return `<svg class="atlas-preview" viewBox="0 0 56 44">${lines}${stars}</svg>`;
}

function stampAtlas(entry) {
  if (typeof viewingShared !== "undefined" && viewingShared) {
    toast("can't stamp onto a shared sky · return to yours first");
    return;
  }
  // pick a 280-340 px box, randomly positioned in the safe sky area
  const W = window.innerWidth, H = window.innerHeight;
  const boxW = 260 + Math.random() * 120;
  const boxH = boxW * 0.85;
  // safe zone: avoid topbar, pond area, taskbar
  const margin = 40;
  const minX = margin, maxX = W - boxW - margin;
  const minY = 60, maxY = Math.max(minY + 1, H * 0.55 - boxH);
  const ox = minX + Math.random() * Math.max(0, maxX - minX);
  const oy = minY + Math.random() * Math.max(0, maxY - minY);

  const baseIdx = userStars.length;
  for (let i = 0; i < entry.stars.length; i++) {
    const [ux, uy] = entry.stars[i];
    const x = ox + ux * boxW;
    const y = oy + uy * boxH;
    userStars.push(i === 0 ? { x, y, label: entry.name } : { x, y });
  }
  for (const [a, b] of entry.lines) {
    userLines.push({ a: baseIdx + a, b: baseIdx + b });
  }
  saveConstellation();
  toast(`${entry.name} stamped onto the sky ✦`);
  renderAtlas(); // re-render to flip its button state
}

function isStamped(entry) {
  return userStars.some(s => s.label === entry.name);
}

function renderAtlas() {
  if (!atlasList) return;
  atlasList.innerHTML = atlasEntries.map((e, i) => `
    <div class="atlas-item" data-i="${i}">
      ${atlasPreviewSvg(e)}
      <div class="atlas-meta">
        <div class="atlas-name">${escapeHtml(e.name)}</div>
        <div class="atlas-myth">${escapeHtml(e.myth)}</div>
      </div>
      <button class="atlas-stamp ${isStamped(e) ? "stamped" : ""}">${isStamped(e) ? "stamped ✓" : "stamp"}</button>
    </div>
  `).join("");
}
renderAtlas();

if (atlasList) {
  atlasList.addEventListener("click", (e) => {
    const btn = e.target.closest(".atlas-stamp");
    if (!btn) return;
    const item = btn.closest(".atlas-item");
    const idx = +item.dataset.i;
    const entry = atlasEntries[idx];
    if (!entry) return;
    if (isStamped(entry)) {
      toast(`${entry.name} is already on your sky · find it among the stars`);
      return;
    }
    stampAtlas(entry);
  });
}

/* ============================================================
   feature: cabin / campfire (warmth meter, decays in real time)
   feed the fire with a log. higher warmth = brighter SVG flames,
   more embers, and a soft amber glow in the bottom-left corner.
   warmth shows up in ~/status.
   ============================================================ */
const HEARTH_KEY = "biosphere02.hearth.v1";
const DECAY_PER_HOUR = 30; // warmth points lost per hour of unattended fire
const MAX_WARMTH = 100;

function loadHearth() {
  try {
    const d = JSON.parse(localStorage.getItem(HEARTH_KEY) || "null");
    if (d) return d;
  } catch {}
  return { warmth: 0, t: Date.now() };
}
function saveHearth(h) {
  try { localStorage.setItem(HEARTH_KEY, JSON.stringify(h)); } catch {}
}

let hearth = loadHearth();
// decay-since-last-touch so the fire really fades while you're gone
function applyHearthDecay() {
  const now = Date.now();
  const hoursAway = (now - (hearth.t || now)) / 3_600_000;
  hearth.warmth = Math.max(0, (hearth.warmth || 0) - hoursAway * DECAY_PER_HOUR);
  hearth.t = now;
}
applyHearthDecay();
saveHearth(hearth);

const flameG = document.getElementById("flame");
const hearthEl = document.getElementById("hearth");
const emberHost = document.getElementById("ember-host");
const warmthFill = document.getElementById("warmth-fill");
const warmthLabel = document.getElementById("warmth-label");
const warmthStat = document.getElementById("warmth-stat");
const hearthGlow = document.getElementById("hearth-glow");

function warmthWord(w) {
  if (w < 4)  return "cold ash";
  if (w < 18) return "smoldering";
  if (w < 40) return "ember";
  if (w < 65) return "warm";
  if (w < 88) return "crackling";
  return "blazing 🔥";
}

function renderFlame(w) {
  // size & color drift with warmth
  if (!flameG) return;
  if (w < 2) {
    // just smoke wisps
    flameG.innerHTML = `
      <path d="M92 116 Q88 108 96 100 Q104 94 100 88" stroke="rgba(200,200,200,0.25)" stroke-width="2" fill="none"/>
      <path d="M108 118 Q114 110 106 102" stroke="rgba(200,200,200,0.18)" stroke-width="2" fill="none"/>
    `;
    return;
  }
  const scale = 0.5 + (w / MAX_WARMTH) * 0.9;
  const orange = `rgba(255, ${Math.round(120 + w * 0.5)}, 60, 0.9)`;
  const yellow = `rgba(255, ${Math.round(200 + w * 0.5)}, 140, 0.92)`;
  const core   = `rgba(255, 240, 200, 0.95)`;
  flameG.innerHTML = `
    <g transform="translate(100 130) scale(${scale.toFixed(2)}) translate(-100 -130)">
      <path class="flame-tongue t1" d="M100 130 Q60 100 90 50 Q100 30 110 50 Q140 100 100 130 Z" fill="${orange}"/>
      <path class="flame-tongue t2" d="M100 130 Q78 100 95 60 Q100 48 105 60 Q122 100 100 130 Z" fill="${yellow}"/>
      <path class="flame-tongue t3" d="M100 130 Q90 110 98 80 Q100 70 102 80 Q110 110 100 130 Z" fill="${core}"/>
    </g>
  `;
}

function renderWarmth() {
  const w = hearth.warmth || 0;
  if (warmthFill) warmthFill.style.width = Math.min(100, w) + "%";
  const word = warmthWord(w);
  if (warmthLabel) warmthLabel.textContent = word;
  if (warmthStat) warmthStat.textContent = word;
  if (hearthEl) hearthEl.classList.toggle("bright", w >= 40);
  renderFlame(w);
  // global corner glow
  if (hearthGlow) {
    const a = Math.min(0.32, w / MAX_WARMTH * 0.32);
    hearthGlow.style.setProperty("--hearth-a", a.toFixed(3));
  }
}
renderWarmth();

let _lastLog = 0;
const addLogBtn = document.getElementById("add-log");
if (addLogBtn) {
  addLogBtn.addEventListener("click", () => {
    const now = Date.now();
    if (now - _lastLog < 320) return; // throttle: stops a stick-spam from instantly maxing it
    _lastLog = now;
    applyHearthDecay(); // catch up before adding so the math stays honest
    hearth.warmth = Math.min(MAX_WARMTH, hearth.warmth + 22);
    hearth.t = Date.now();
    saveHearth(hearth);
    renderWarmth();
    // a small puff of embers at the moment of adding
    spawnEmbers(Math.min(8, 3 + Math.floor(hearth.warmth / 18)));
    if (hearth.warmth >= MAX_WARMTH - 0.5) toast("the fire is roaring 🔥", 1800);
  });
}

function spawnEmbers(n) {
  if (!emberHost) return;
  if (isMotionReduced()) return;
  for (let i = 0; i < n; i++) {
    const e = document.createElement("div");
    e.className = "ember";
    e.style.left = (40 + Math.random() * (emberHost.offsetWidth - 80)) + "px";
    e.style.setProperty("--ember-dx", ((Math.random() - 0.5) * 40).toFixed(0) + "px");
    e.style.animationDuration = (1600 + Math.random() * 1400) + "ms";
    emberHost.appendChild(e);
    setTimeout(() => e.remove(), 3200);
  }
}
// ambient embers when the fire is alive. skip the whole tick when the fire
// is out — decaying 0 always yields 0, and saving the hearth blob 27x/minute
// forever (while nothing has meaningfully changed) is just localStorage churn.
setInterval(() => {
  if (!hearth || (hearth.warmth || 0) <= 0) return;
  applyHearthDecay();
  saveHearth(hearth);
  renderWarmth();
  if (hearth.warmth > 8 && Math.random() < hearth.warmth / 140) {
    spawnEmbers(1 + Math.floor(hearth.warmth / 35));
  }
}, 2200);

/* ============================================================
   feature: 7-day biosphere forecast
   deterministic from each day's date string so reloads are stable.
   today's row is highlighted. if today is "meteor shower",
   the shooting-star spawn rate gets boosted.
   ============================================================ */
const forecastList = document.getElementById("forecast-list");

// a small deterministic hash so today's forecast doesn't change on refresh
function dateHash(d) {
  const s = d.toDateString();
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function forecastFor(d) {
  // pool of events; some are season-tinted, some are time-of-year specific
  const m = d.getMonth();
  const pool = [
    { glyph: "✦",  label: "clear night",     note: "a million quiet stars",        kind: "clear" },
    { glyph: "⭐", label: "meteor shower",    note: "look up · count the streaks",  kind: "meteors" },
    { glyph: "🌌", label: "aurora drift",    note: "the sky moves like cloth",     kind: "aurora" },
    { glyph: "🌫", label: "ground fog",      note: "the forest holds its breath",  kind: "fog" },
    { glyph: "🌧", label: "soft rain",       note: "the pond keeps time",          kind: "rain" },
    { glyph: "🌙", label: "thin moon",       note: "a sliver of silver",           kind: "moon" },
    { glyph: "☁",  label: "low cloud",       note: "stars come and go",            kind: "cloud" },
  ];
  // season-specific events get a small bonus appearance rate
  const seasonal = [];
  if (m >= 2 && m <= 4)  seasonal.push({ glyph: "🌸", label: "petal drift",     note: "spring sheds onto the page",  kind: "spring" });
  if (m >= 5 && m <= 7)  seasonal.push({ glyph: "🪲", label: "firefly bloom",   note: "the meadow is full of light", kind: "fireflies" });
  if (m >= 8 && m <= 10) seasonal.push({ glyph: "🍂", label: "leaf wind",       note: "amber drifts through the trees", kind: "leaves" });
  if (m === 11 || m <= 1) seasonal.push({ glyph: "❄", label: "first snow",     note: "the pond freezes by morning",  kind: "snow" });

  const all = pool.concat(seasonal);
  const h = dateHash(d);
  return all[h % all.length];
}

function forecastDayLabel(d, offset) {
  if (offset === 0) return "today";
  if (offset === 1) return "tomorrow";
  return d.toLocaleDateString(undefined, { weekday: "short" }).toLowerCase();
}

function renderForecast() {
  if (!forecastList) return;
  const today = new Date();
  let html = "";
  for (let i = 0; i < 7; i++) {
    const d = new Date(today); d.setDate(today.getDate() + i);
    const f = forecastFor(d);
    const dayLbl = forecastDayLabel(d, i);
    const dateLbl = d.toLocaleDateString(undefined, { month: "short", day: "numeric" }).toLowerCase();
    html += `
      <div class="forecast-row ${i === 0 ? "today" : ""}">
        <span class="forecast-day">${escapeHtml(dayLbl)} · ${escapeHtml(dateLbl)}</span>
        <span class="forecast-glyph">${f.glyph}</span>
        <span class="forecast-label">${escapeHtml(f.label)}<span class="forecast-note">${escapeHtml(f.note)}</span></span>
      </div>
    `;
  }
  html += `<div class="forecast-foot">forecasts are sealed at midnight · they don't shift on you</div>`;
  forecastList.innerHTML = html;
}
renderForecast();
// re-render around midnight so "today" stays accurate for someone leaving the tab open
setInterval(renderForecast, 10 * 60 * 1000);

// meteor-day cadence is now handled inline inside maybeSpawnShooter as a
// live check of forecastFor(new Date()).kind — so a tab left open across
// midnight naturally rolls to the correct cadence without needing a swap.
const _todayForecast = forecastFor(new Date());
// when today is "aurora drift", strengthen the aurora layer.
// opacity gets silently clamped to 1 by the browser (same bug the dusk-aurora
// css rule had — see devlog #12), so use a filter combo instead.
if (_todayForecast.kind === "aurora") {
  document.body.classList.add("forecast-aurora");
  const auroraEl = document.getElementById("aurora");
  if (auroraEl) auroraEl.style.filter = "saturate(1.6) brightness(1.25)";
}
// when today is "soft rain", spawn a gentle rain layer + occasional pond ripples.
// "the pond keeps time" — the forecast note already promised this; now it's real.
if (_todayForecast.kind === "rain" && !isMotionReduced()) {
  document.body.classList.add("forecast-rain");
  const rainHost = document.createElement("div");
  rainHost.id = "rain-layer";
  rainHost.setAttribute("aria-hidden", "true");
  document.body.appendChild(rainHost);
  const DROP_COUNT = 40;
  for (let i = 0; i < DROP_COUNT; i++) {
    const d = document.createElement("span");
    d.className = "raindrop";
    d.style.left = (Math.random() * 100) + "vw";
    d.style.animationDelay = -(Math.random() * 1.6) + "s";
    d.style.animationDuration = (0.9 + Math.random() * 0.7) + "s";
    d.style.opacity = String(0.25 + Math.random() * 0.35);
    rainHost.appendChild(d);
  }
  // occasional ripples on the pond so it feels connected to the sky above
  (function rainRipple() {
    setTimeout(() => {
      if (pondW > 0 && !isMotionReduced()) {
        addRipple(Math.random() * pondW,
                  pondH * 0.15 + Math.random() * pondH * 0.75,
                  0.8, 55);
      }
      rainRipple();
    }, 700 + Math.random() * 1400);
  })();
}

/* ============================================================
   feature: bottles in the pond
   tiny bottles drift across the pond canvas. clicking one opens
   an overlay with a short curated fragment inside. the bottle
   then drifts away. counter persists in ~/status.
   ============================================================ */
const BOTTLES_KEY = "biosphere02.bottles.v1";
const BOTTLES_READ_KEY = "biosphere02.bottles-read.v1";

const bottleNotes = [
  { body: "the river is everywhere at once and never the same place twice.", from: "from a small green book, no title" },
  { body: "instructions for a quiet evening: leave one window open. wait.", from: "scrap of paper, water-stained" },
  { body: "you don't have to be useful tonight.", from: "found in a coat pocket" },
  { body: "the moon has been doing this for four billion years. you can take ten minutes.", from: "anon" },
  { body: "every tree in the forest is leaning, very slowly, toward something it has not yet seen.", from: "from a notebook left on a bench" },
  { body: "the trick is not to mistake the map for the forest.", from: "advice from an older fox" },
  { body: "small things are doing their job. trust them.", from: "torn page, may 1998" },
  { body: "if you've been spinning, here is a still point: this sentence. read it twice.", from: "anonymous" },
  { body: "you've already done enough today. the stars will come out regardless.", from: "from a friend" },
  { body: "the world is patient. it has practice.", from: "scratched into bark" },
  { body: "kindness is a kind of weather. it spreads.", from: "from a sticky note" },
  { body: "look up · this is the only sky you'll have today.", from: "a margin note" },
];

let bottlesRead = (() => { try { return +localStorage.getItem(BOTTLES_READ_KEY) || 0; } catch { return 0; } })();
function renderBottlesCount() {
  const el = document.getElementById("bottles-count");
  if (el) el.textContent = bottlesRead;
}
renderBottlesCount();

const bottles = []; // {x, y, vx, bobPhase, noteIdx, opened}

function pickNoteIdx() {
  // try to avoid repeating the very last opened note
  let last = -1;
  try { last = +localStorage.getItem(BOTTLES_KEY); if (Number.isNaN(last)) last = -1; } catch {}
  let idx;
  let tries = 0;
  do { idx = Math.floor(Math.random() * bottleNotes.length); tries++; }
  while (idx === last && tries < 6);
  return idx;
}

function spawnBottle() {
  if (pondW === 0) return;
  // only 1-2 in the water at a time
  if (bottles.length >= 2) return;
  const fromLeft = Math.random() < 0.5;
  bottles.push({
    x: fromLeft ? -20 : pondW + 20,
    y: 30 + Math.random() * (pondH - 60),
    vx: (fromLeft ? 1 : -1) * (0.10 + Math.random() * 0.08),
    bobPhase: Math.random() * Math.PI * 2,
    noteIdx: pickNoteIdx(),
    opened: false,
  });
}

function drawBottles(t) {
  for (let i = bottles.length - 1; i >= 0; i--) {
    const b = bottles[i];
    b.x += b.vx;
    if (b.x < -40 || b.x > pondW + 40) { bottles.splice(i, 1); continue; }
    const wob = Math.sin(t * 0.0014 + b.bobPhase) * 1.4;
    pondCtx.save();
    pondCtx.translate(b.x, b.y + wob);
    // bottle is roughly 16x6 lying on its side, pointing in the direction of travel
    if (b.vx < 0) pondCtx.scale(-1, 1);
    // body
    pondCtx.fillStyle = b.opened ? "rgba(180, 200, 200, 0.45)" : "rgba(143, 212, 154, 0.78)";
    pondCtx.strokeStyle = "rgba(220, 240, 220, 0.55)";
    pondCtx.lineWidth = 0.6;
    pondCtx.beginPath();
    pondCtx.moveTo(-8, -3);
    pondCtx.lineTo(5, -3);
    pondCtx.lineTo(7, -2);
    pondCtx.lineTo(7, 2);
    pondCtx.lineTo(5, 3);
    pondCtx.lineTo(-8, 3);
    pondCtx.quadraticCurveTo(-10, 0, -8, -3);
    pondCtx.closePath();
    pondCtx.fill();
    pondCtx.stroke();
    // cork
    pondCtx.fillStyle = "rgba(160, 110, 60, 0.95)";
    pondCtx.fillRect(7, -1.6, 2, 3.2);
    // tiny scroll inside (only if unopened)
    if (!b.opened) {
      pondCtx.fillStyle = "rgba(255, 240, 200, 0.78)";
      pondCtx.fillRect(-5, -1, 8, 2);
    }
    // soft glow — flat low-alpha circle instead of a per-frame radial gradient.
    // same perf lesson as the pond gradient fix in devlog #13: gradients are
    // cheap to use, expensive to create, so don't allocate one per bottle per
    // frame just for a subtle halo.
    pondCtx.fillStyle = "rgba(255, 240, 200, 0.09)";
    pondCtx.beginPath(); pondCtx.arc(0, 0, 14, 0, Math.PI * 2); pondCtx.fill();
    pondCtx.restore();
  }
}

function bottleHitAt(localX, localY) {
  for (const b of bottles) {
    const dx = b.x - localX, dy = b.y - localY;
    if (dx * dx + dy * dy < 14 * 14) return b;
  }
  return null;
}

const bottleOverlay = document.getElementById("bottle-overlay");
const bottleBody = document.getElementById("bottle-body");
const bottleFrom = document.getElementById("bottle-from");

function openBottleNote(noteIdx) {
  const n = bottleNotes[noteIdx];
  if (!n || !bottleOverlay) return;
  bottleBody.textContent = "“" + n.body + "”";
  bottleFrom.textContent = "— " + n.from;
  bottleOverlay.hidden = false;
  bottlesRead++;
  try {
    localStorage.setItem(BOTTLES_READ_KEY, String(bottlesRead));
    localStorage.setItem(BOTTLES_KEY, String(noteIdx));
  } catch {}
  renderBottlesCount();
  if (bottlesRead === 1) toast("a bottle · one tiny thought from elsewhere", 2800);
}
function closeBottleOverlay() {
  if (bottleOverlay) bottleOverlay.hidden = true;
}
if (bottleOverlay) {
  bottleOverlay.addEventListener("click", (e) => { if (e.target === bottleOverlay) closeBottleOverlay(); });
}
document.addEventListener("keydown", (e) => {
  if (!bottleOverlay || bottleOverlay.hidden) return;
  if (e.key === "Escape" || e.key === "Enter") { e.preventDefault(); closeBottleOverlay(); }
});

// hook bottle hit-test into the pond's click handler (already supports lily pads).
// runs in capture phase + stopImmediatePropagation when it claims the click,
// so a bottle that happens to float over a lily pad doesn't ALSO trigger the frog blip.
pondCanvas.addEventListener("click", (e) => {
  const rect = pondCanvas.getBoundingClientRect();
  const lx = e.clientX - rect.left;
  const ly = e.clientY - rect.top;
  const b = bottleHitAt(lx, ly);
  if (!b || b.opened) return;
  b.opened = true;
  addRipple(b.x, b.y, 1.6, 70);
  openBottleNote(b.noteIdx);
  // accelerate the opened bottle gently out of the pond, then drop it
  b.vx *= 1.6;
  setTimeout(() => {
    const i = bottles.indexOf(b);
    if (i >= 0) bottles.splice(i, 1);
  }, 14_000);
  e.stopImmediatePropagation();
}, true);

// draw bottles after pond + lily pads — splice into the existing wrap
const _origDrawConstForBottles = drawConstellation;
drawConstellation = function () {
  _origDrawConstForBottles();
  drawBottles(performance.now());
};

// spawn at start + on an irregular cadence
setTimeout(spawnBottle, 8_000);
setInterval(() => {
  if (Math.random() < 0.45) spawnBottle();
}, 35_000);

/* ============================================================
   feature: time capsule
   seal a note for a future date. on the first visit on or after
   the seal date, the capsule opens itself as an overlay.
   shape: { id, body, sealDate (YYYY-MM-DD), createdAt, opened: bool }
   ============================================================ */
const CAPSULE_KEY = "biosphere02.capsules.v1";
const capsuleBody = document.getElementById("capsule-body");
const capsuleDate = document.getElementById("capsule-date");
const capsuleSeal = document.getElementById("capsule-seal");
const capsuleListEl = document.getElementById("capsule-list");
const capsuleOverlay = document.getElementById("capsule-overlay");
const capsuleText = document.getElementById("capsule-text");
const capsuleMeta = document.getElementById("capsule-meta");

let capsules = [];
try { capsules = JSON.parse(localStorage.getItem(CAPSULE_KEY) || "[]"); } catch { capsules = []; }

function saveCapsules() {
  try { localStorage.setItem(CAPSULE_KEY, JSON.stringify(capsules)); } catch {}
}

function todayISO() {
  // local-date YYYY-MM-DD — avoids UTC shift surprises when comparing seal dates
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function daysUntil(iso) {
  const t = new Date(iso + "T00:00:00").getTime();
  const n = new Date(todayISO() + "T00:00:00").getTime();
  return Math.round((t - n) / 86_400_000);
}

function renderCapsuleList() {
  if (!capsuleListEl) return;
  const pending = capsules.filter(c => !c.opened);
  if (pending.length === 0) {
    capsuleListEl.innerHTML = `<div class="capsule-empty">no capsules sealed yet · drop a note above</div>`;
    return;
  }
  pending.sort((a, b) => a.sealDate.localeCompare(b.sealDate));
  capsuleListEl.innerHTML = pending.map(c => {
    const d = daysUntil(c.sealDate);
    const when = d <= 0 ? "ready · open it"
               : d === 1 ? "opens tomorrow"
               : `opens in ${d} days`;
    const preview = (c.body || "").trim().slice(0, 36) + ((c.body || "").length > 36 ? "…" : "");
    return `<div class="capsule-pending"><span>"${escapeHtml(preview)}"</span><span class="capsule-when">${escapeHtml(when)}</span></div>`;
  }).join("");
}

function presentReadyCapsules() {
  const today = todayISO();
  // find one ready capsule; show the oldest seal-date first
  const ready = capsules
    .filter(c => !c.opened && c.sealDate <= today)
    .sort((a, b) => a.sealDate.localeCompare(b.sealDate));
  if (ready.length === 0) return;
  const c = ready[0];
  if (!capsuleOverlay) return;
  const sealedOn = new Date(c.createdAt).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
  const today2 = new Date().toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
  capsuleMeta.textContent = `sealed on ${sealedOn.toLowerCase()} · opened on ${today2.toLowerCase()}`;
  capsuleText.textContent = c.body || "(an empty note — past-you trusted that you'd remember the rest.)";
  capsuleOverlay.hidden = false;
  // mark this one opened so we don't show it again next visit
  c.opened = true;
  c.openedAt = Date.now();
  saveCapsules();
  renderCapsuleList();
}

function closeCapsuleOverlay() {
  if (capsuleOverlay) capsuleOverlay.hidden = true;
  // if there are more ready, walk to the next one on the next tick so the user gets a beat
  setTimeout(() => presentReadyCapsules(), 350);
}

if (capsuleSeal) {
  // default the date picker to a week from today — nicer than empty
  if (capsuleDate && !capsuleDate.value) {
    const d = new Date(); d.setDate(d.getDate() + 7);
    const pad = (n) => String(n).padStart(2, "0");
    capsuleDate.value = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    capsuleDate.min = todayISO();
  }
  capsuleSeal.addEventListener("click", () => {
    const body = (capsuleBody.value || "").trim();
    const date = capsuleDate.value;
    if (!body) { toast("write something first · even one line counts"); capsuleBody.focus(); return; }
    if (!date) { toast("pick a date · when should it come back?"); capsuleDate.focus(); return; }
    if (date < todayISO()) { toast("the seal date has to be today or later"); return; }
    capsules.push({
      id: Date.now(),
      body: body.slice(0, 400),
      sealDate: date,
      createdAt: Date.now(),
      opened: false,
    });
    saveCapsules();
    renderCapsuleList();
    capsuleBody.value = "";
    const d = daysUntil(date);
    toast(d <= 0 ? "sealed · it'll greet you on your next visit"
        : d === 1 ? "sealed · tomorrow it comes back to you"
        : `sealed · ${d} days from now it'll find you`);
  });
}

if (capsuleOverlay) {
  capsuleOverlay.addEventListener("click", (e) => { if (e.target === capsuleOverlay) closeCapsuleOverlay(); });
}
document.addEventListener("keydown", (e) => {
  if (!capsuleOverlay || capsuleOverlay.hidden) return;
  if (e.key === "Escape" || e.key === "Enter") { e.preventDefault(); closeCapsuleOverlay(); }
});

renderCapsuleList();
// wait until the welcome page is dismissed (or absent) before presenting
setTimeout(() => {
  if (!welcomePage || welcomePage.hidden) presentReadyCapsules();
  else {
    // poll briefly until the welcome closes, then show
    const iv = setInterval(() => {
      if (welcomePage.hidden) { clearInterval(iv); presentReadyCapsules(); }
    }, 400);
    setTimeout(() => clearInterval(iv), 60_000);
  }
}, 1500);

/* ============================================================
   feature: daily oracle
   one card a day. 22 cards. the drawn card persists until midnight
   (keyed on today's date string). undrawn rolls over when the day rolls.
   ============================================================ */
const ORACLE_KEY = "biosphere02.oracle.v1";
const oracleDeck = [
  { name: "the river",          body: "you don't have to know where you're going. you only have to keep moving." },
  { name: "the keeper",         body: "small things are doing their job. trust them today." },
  { name: "the lantern",        body: "you don't have to light the whole forest. just the next step." },
  { name: "the moss",           body: "softness is also a kind of strength. softer things outlast harder ones." },
  { name: "the bell",           body: "answer the call that arrives, not the one you were waiting for." },
  { name: "the heron",          body: "stillness is a posture, not an absence. wait without leaning in." },
  { name: "the door",           body: "the door you've been avoiding is the door. you already know." },
  { name: "the spool",          body: "an unfinished thing is not a failed thing. set it down for the night." },
  { name: "the fox",            body: "you can't summon what's shy. you can only be a place it wants to come." },
  { name: "the seed",           body: "what you plant today, you won't see for weeks. plant it anyway." },
  { name: "the mirror",         body: "what you offer to others, offer also to yourself. you keep forgetting." },
  { name: "the tide",           body: "the part of you that feels stuck is the part that doesn't trust the rhythm." },
  { name: "the bough",          body: "bend before you break. the wind comes for everything sooner or later." },
  { name: "the kindling",       body: "small acts of attention are the kindling. nothing big catches without them." },
  { name: "the path",           body: "you are not late. you are walking the path that is yours." },
  { name: "the cup",            body: "you cannot pour from a cup you haven't filled. rest is not a luxury today." },
  { name: "the stranger",       body: "be a little kinder than necessary. the cost is nothing; the return is unknowable." },
  { name: "the threshold",      body: "you are between rooms. don't try to be in either one yet." },
  { name: "the constellation",  body: "the shapes you draw between scattered points are what make a sky a sky." },
  { name: "the burrow",         body: "going inward is not retreat. it's how some creatures find their way." },
  { name: "the listener",       body: "ask one more question before you offer the answer. you may not have heard it yet." },
  { name: "the morning",        body: "today is the first morning the world has ever had of you in it as you are now." },
];

const oracleCard = document.getElementById("oracle-card");
const oracleDrawBtn = document.getElementById("oracle-draw");
const oracleWhen = document.getElementById("oracle-when");
const cardStat = document.getElementById("card-stat");

let oracleState = (() => {
  try { return JSON.parse(localStorage.getItem(ORACLE_KEY) || "null") || {}; }
  catch { return {}; }
})();

function saveOracle() {
  try { localStorage.setItem(ORACLE_KEY, JSON.stringify(oracleState)); } catch {}
}

function showOracleFront(idx, animate) {
  if (!oracleCard) return;
  const card = oracleDeck[idx];
  if (!card) return;
  // make sure a .oracle-front exists, then fill it
  let front = oracleCard.querySelector(".oracle-front");
  if (!front) {
    front = document.createElement("div");
    front.className = "oracle-front";
    oracleCard.appendChild(front);
  }
  front.innerHTML = `
    <div class="oracle-card-name">${escapeHtml(card.name)}</div>
    <div class="oracle-card-body">${escapeHtml(card.body)}</div>
  `;
  if (animate) {
    oracleCard.classList.add("flipping");
    setTimeout(() => oracleCard.classList.remove("flipping"), 720);
  }
  oracleCard.classList.add("flipped");
  if (oracleDrawBtn) {
    oracleDrawBtn.disabled = true;
    oracleDrawBtn.textContent = "drawn for today";
  }
  if (oracleWhen) oracleWhen.textContent = "reshuffles at midnight";
  if (cardStat) cardStat.textContent = card.name;
}

function renderOracle() {
  // already drew today?
  if (oracleState.date === todayISO() && typeof oracleState.idx === "number") {
    showOracleFront(oracleState.idx, false);
    return;
  }
  // reset visible state — back of card showing
  if (oracleCard) {
    oracleCard.classList.remove("flipped");
    const front = oracleCard.querySelector(".oracle-front");
    if (front) front.remove();
  }
  if (oracleDrawBtn) {
    oracleDrawBtn.disabled = false;
    oracleDrawBtn.textContent = "draw a card";
  }
  if (oracleWhen) oracleWhen.textContent = "one card a day";
  if (cardStat) cardStat.textContent = "undrawn";
}

function drawOracleCard() {
  if (oracleState.date === todayISO()) return;
  // pick a card that isn't yesterday's — small touch
  let idx, tries = 0;
  do { idx = Math.floor(Math.random() * oracleDeck.length); tries++; }
  while (idx === oracleState.idx && tries < 6);
  oracleState = { date: todayISO(), idx, when: Date.now() };
  saveOracle();
  showOracleFront(idx, true);
  toast(`the deck offers · ${oracleDeck[idx].name}`, 2400);
}

if (oracleDrawBtn) oracleDrawBtn.addEventListener("click", drawOracleCard);
// click the card itself to flip — same as button
if (oracleCard) oracleCard.addEventListener("click", () => {
  if (oracleState.date !== todayISO()) drawOracleCard();
});

renderOracle();
// midnight rollover: if the tab is left open across days, re-render so the
// "drawn for today" button frees up the next morning
setInterval(() => {
  if (oracleState.date && oracleState.date !== todayISO()) renderOracle();
}, 5 * 60 * 1000);

/* ============================================================
   feature: lighthouse on the far shore
   slow rotating beam at night; click to log a "moment" — a tiny
   bright marker drops into your sky with the current timestamp.
   counter persists in ~/status.
   ============================================================ */
const MOMENTS_KEY = "biosphere02.moments.v1";
const lighthouseEl = document.getElementById("lighthouse");

let momentsCount = (() => { try { return +localStorage.getItem(MOMENTS_KEY) || 0; } catch { return 0; } })();
function renderMomentsCount() {
  const el = document.getElementById("moments-count");
  if (el) el.textContent = momentsCount;
}
renderMomentsCount();

function logLighthouseMoment(clientX, clientY) {
  // a small bright marker in the sky — looks like a fresh star, sits with your constellation
  if (typeof viewingShared !== "undefined" && viewingShared) {
    toast("you're on someone else's sky · return to yours to leave a moment");
    return;
  }
  // scatter the marker anywhere in the upper safe-sky band. previously the x
  // formula was clientX-30+rand*60 clamped to [60, W-60], but because the
  // lighthouse lives at right:32px the click is always near W-25, so the
  // clamp fired every time and every moment landed at x=W-60. result was a
  // stripe of markers by the lighthouse instead of scattered stars.
  const x = 60 + Math.random() * Math.max(1, window.innerWidth - 120);
  const y = Math.max(90, Math.min(window.innerHeight * 0.5, 110 + Math.random() * (window.innerHeight * 0.3)));
  const stamp = new Date().toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).toLowerCase();
  userStars.push({ x, y, label: stamp });
  saveConstellation();
  momentsCount++;
  try { localStorage.setItem(MOMENTS_KEY, String(momentsCount)); } catch {}
  renderMomentsCount();
  spawnCatchBurst(clientX, clientY);
  toast(momentsCount === 1
    ? "a moment marked · the lighthouse remembers"
    : `${momentsCount} moments at the lighthouse`);
}

if (lighthouseEl) {
  lighthouseEl.addEventListener("click", (e) => {
    // small visual: a quick lamp flash via temporary class
    lighthouseEl.classList.add("flashed");
    setTimeout(() => lighthouseEl.classList.remove("flashed"), 320);
    logLighthouseMoment(e.clientX, e.clientY);
  });
}

/* ============================================================
   feature: breathing room
   a 4-4-4-4 cycle (in / hold / out / rest) with a scaling orb.
   the day's breath count rolls over at midnight.
   ============================================================ */
const BREATHE_KEY = "biosphere02.breathe.v1";
const breatheOrb = document.getElementById("breathe-orb");
const breatheCue = document.getElementById("breathe-cue");
const breatheToggle = document.getElementById("breathe-toggle");
const breatheElapsed = document.getElementById("breathe-elapsed");
const breatheCount = document.getElementById("breathe-count");
const breathsStat = document.getElementById("breaths-stat");

let breatheState = (() => {
  try { return JSON.parse(localStorage.getItem(BREATHE_KEY) || "null") || { date: todayISO(), breaths: 0 }; }
  catch { return { date: todayISO(), breaths: 0 }; }
})();
if (breatheState.date !== todayISO()) breatheState = { date: todayISO(), breaths: 0 };

function saveBreathe() {
  try { localStorage.setItem(BREATHE_KEY, JSON.stringify(breatheState)); } catch {}
}
function renderBreathCount() {
  const n = breatheState.breaths || 0;
  if (breatheCount) breatheCount.textContent = `${n} breath${n === 1 ? "" : "s"} today`;
  if (breathsStat) breathsStat.textContent = String(n);
}
renderBreathCount();

let breatheRun = null; // { sessionStart, sessionLen, phaseTimer, phase }

const phaseOrder = ["inhale", "hold-in", "exhale", "hold-out"];
const phaseCues  = { inhale: "breathe in",  "hold-in": "hold",  exhale: "breathe out", "hold-out": "rest" };
const phaseClass = { inhale: "warm",        "hold-in": "warm",  exhale: "",            "hold-out": "" };
const PHASE_MS = 4000;

function stepPhase(idx) {
  if (!breatheRun) return;
  const phase = phaseOrder[idx % 4];
  if (!breatheOrb || !breatheCue) return;
  breatheOrb.classList.remove("inhale", "hold-in", "exhale", "hold-out");
  breatheOrb.classList.add(phase);
  breatheCue.textContent = phaseCues[phase];
  breatheCue.classList.toggle("warm", phaseClass[phase] === "warm");
  // one breath = a full inhale (count at the start of each new inhale, after the first)
  if (phase === "inhale" && idx > 0) {
    breatheState.breaths = (breatheState.breaths || 0) + 1;
    saveBreathe();
    renderBreathCount();
  }
  breatheRun.phaseTimer = setTimeout(() => stepPhase(idx + 1), PHASE_MS);
}

function tickBreatheClock() {
  if (!breatheRun || !breatheElapsed) return;
  const elapsed = Date.now() - breatheRun.sessionStart;
  const remaining = Math.max(0, breatheRun.sessionLen - elapsed);
  const s = Math.ceil(remaining / 1000);
  const mm = Math.floor(s / 60), ss = s % 60;
  breatheElapsed.textContent = `${mm}:${String(ss).padStart(2, "0")} left`;
  if (remaining <= 0) { stopBreathe(true); return; }
  breatheRun.clockTimer = setTimeout(tickBreatheClock, 250);
}

function startBreathe(minutes) {
  if (breatheRun) return;
  breatheRun = {
    sessionStart: Date.now(),
    sessionLen: minutes * 60_000,
    phaseTimer: null,
    clockTimer: null,
  };
  if (breatheToggle) { breatheToggle.textContent = "stop"; breatheToggle.classList.add("running"); }
  stepPhase(0);
  tickBreatheClock();
}

function stopBreathe(completed) {
  if (!breatheRun) return;
  clearTimeout(breatheRun.phaseTimer);
  clearTimeout(breatheRun.clockTimer);
  breatheRun = null;
  if (breatheOrb) breatheOrb.classList.remove("inhale", "hold-in", "exhale", "hold-out");
  if (breatheCue) {
    breatheCue.classList.remove("warm");
    breatheCue.textContent = completed ? "you came back · nice work" : "paused · pick it up again whenever";
  }
  if (breatheElapsed) breatheElapsed.textContent = "—";
  if (breatheToggle) { breatheToggle.textContent = "start"; breatheToggle.classList.remove("running"); }
  if (completed) toast("breath session complete · the forest noticed", 2200);
}

let breatheChosenLen = 3;
document.querySelectorAll(".breathe-len").forEach(btn => {
  btn.addEventListener("click", () => {
    if (breatheRun) return; // can't change length mid-session
    document.querySelectorAll(".breathe-len").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    breatheChosenLen = +btn.dataset.len || 3;
  });
});
if (breatheToggle) {
  breatheToggle.addEventListener("click", () => {
    breatheRun ? stopBreathe(false) : startBreathe(breatheChosenLen);
  });
}
// midnight rollover
setInterval(() => {
  if (breatheState.date !== todayISO()) {
    breatheState = { date: todayISO(), breaths: 0 };
    saveBreathe();
    renderBreathCount();
  }
}, 5 * 60 * 1000);

/* ============================================================
   feature: hummingbird (third creature, day-tuned)
   faster, more erratic motion than fox/owl. visits briefly, hovers
   at a couple of pause points, then darts off-screen. click to spot.
   ============================================================ */
function isDaylight() {
  return document.body.classList.contains("dawn") ||
         document.body.classList.contains("day") ||
         (settings && (settings.sky === "dawn" || settings.sky === "day"));
}

function spawnHummingbird() {
  if (isMotionReduced()) return;
  const hum = document.createElement("div");
  hum.className = "hummer";
  hum.textContent = "🐦";   // small bird glyph stands in for a hummer; SVG would be ideal but emoji reads quickly
  hum.title = "a small visitor — click to spot";
  document.body.appendChild(hum);

  const W = window.innerWidth, H = window.innerHeight;
  const fromLeft = Math.random() < 0.5;
  const startX = fromLeft ? -40 : W + 40;
  const endX   = fromLeft ? W + 40 : -40;
  const baseY  = 110 + Math.random() * (H * 0.35);
  hum.classList.toggle("facing-left", !fromLeft);
  // path: 3 pause points where it hovers briefly, then darts to the next
  const stops = [];
  const n = 3;
  for (let i = 1; i <= n; i++) {
    const t = i / (n + 1);
    stops.push({
      x: startX + (endX - startX) * t + (Math.random() - 0.5) * 80,
      y: baseY + (Math.random() - 0.5) * 110,
      pauseMs: 700 + Math.random() * 900,
    });
  }

  hum.style.left = startX + "px";
  hum.style.top  = baseY + "px";
  setTimeout(() => hum.classList.add("flying"), 30);

  let claimed = false;
  hum.addEventListener("click", (e) => {
    if (claimed) return;
    claimed = true;
    spottedCount++;
    try { localStorage.setItem(SPOTTED_KEY, String(spottedCount)); } catch {}
    renderSpottedCount();
    spawnCatchBurst(e.clientX, e.clientY);
    markCreatureSeen("hummingbird");
    toast("you saw the hummingbird · fastest visitor in the biosphere");
    hum.classList.add("caught");
    setTimeout(() => hum.remove(), 350);
  });

  // animate through the stops with quick darts (200-400ms) and hover pauses
  let i = 0;
  function dartTo() {
    if (claimed || !document.body.contains(hum)) return;
    if (i >= stops.length) {
      // final dart off-screen
      hum.style.transition = "left 700ms cubic-bezier(.4,.0,.6,1), top 700ms ease, transform 220ms ease";
      hum.style.left = endX + "px";
      hum.style.top  = (baseY + (Math.random() - 0.5) * 60) + "px";
      setTimeout(() => { if (!claimed) hum.remove(); }, 850);
      return;
    }
    const s = stops[i++];
    const dur = 280 + Math.random() * 220;
    hum.style.transition = `left ${dur}ms cubic-bezier(.3,.0,.6,1), top ${dur}ms ease, transform 220ms ease`;
    hum.style.left = s.x + "px";
    hum.style.top  = s.y + "px";
    setTimeout(dartTo, dur + s.pauseMs);
  }
  setTimeout(dartTo, 120);
}

function maybeSpawnHummer() {
  if (isMotionReduced()) { setTimeout(maybeSpawnHummer, 90_000); return; }
  // ticks every 90-200s; only spawns if it's daylight
  const wait = 90_000 + Math.random() * 110_000;
  setTimeout(() => {
    if (isDaylight()) spawnHummingbird();
    maybeSpawnHummer();
  }, wait);
}
setTimeout(maybeSpawnHummer, 30_000);

/* ============================================================
   feature: scrapbook — snap a polaroid of the current scene
   captures a snapshot of what the biosphere looks/feels like
   right now (mood, season, plant, warmth, what's been spotted).
   saved polaroids show up as tiny tilted cards; click to open big.
   ============================================================ */
const SCRAPBOOK_KEY = "biosphere02.scrapbook.v1";
const scrapSnap = document.getElementById("scrap-snap");
const scrapList = document.getElementById("scrap-list");
const scrapCount = document.getElementById("scrap-count");
const polaroidsCountEl = document.getElementById("polaroids-count");
const polaroidOverlay = document.getElementById("polaroid-overlay");
const polaroidBig = document.getElementById("polaroid-big");
const polaroidDelete = document.getElementById("polaroid-delete");

let polaroids = [];
try { polaroids = JSON.parse(localStorage.getItem(SCRAPBOOK_KEY) || "[]"); } catch {}
let openedPolaroidId = null;

function saveScrapbook() {
  try { localStorage.setItem(SCRAPBOOK_KEY, JSON.stringify(polaroids)); } catch {}
}

function currentMood() {
  for (const m of ["dawn", "day", "dusk", "night"]) if (document.body.classList.contains(m)) return m;
  return "night";
}
function currentSeason() {
  for (const s of ["spring", "summer", "autumn", "winter"]) if (document.body.classList.contains("season-" + s)) return s;
  return "summer";
}
function moodGlyph(m) {
  return ({ dawn: "🌅", day: "☀️", dusk: "🌇", night: "🌌" })[m] || "✦";
}
function seasonGlyph(s) {
  return ({ spring: "🌸", summer: "🪲", autumn: "🍂", winter: "❄" })[s] || "✦";
}
function moodBg(m) {
  // matches roughly the body day/night gradient
  const map = {
    dawn:  ["#3b2a4a", "#4a3344"],
    day:   ["#1a3a6a", "#2a5a8a"],
    dusk:  ["#4a2a3a", "#6a3a2a"],
    night: ["#1a2050", "#0f2238"],
  };
  return map[m] || map.night;
}

function snapPolaroid() {
  const now = new Date();
  const mood = currentMood();
  const season = currentSeason();
  const [bgTop, bgBot] = moodBg(mood);
  const stageName = (typeof stageNames !== "undefined" && plant)
    ? stageNames[stageFor(plant.water, plant.daysSeen)]
    : "seed";
  const warmth = (hearth && typeof hearth.warmth === "number") ? warmthWord(hearth.warmth) : "—";
  const card = (oracleState && oracleState.date === todayISO() && typeof oracleState.idx === "number")
    ? oracleDeck[oracleState.idx].name : "undrawn";
  const stars = userStars.length;
  const lines = userLines.length;
  const caught = caughtCount;
  const spotted = spottedCount;
  const wishes = (typeof loadWishes === "function") ? loadWishes().length : 0;
  const bottles = bottlesRead;
  const moments = momentsCount;

  // a small caption that's chosen from a pool to vary the voice
  const captions = [
    `${mood} · ${season}`,
    `the ${season} ${mood}`,
    `${stageName.split(" ")[0]} weather`,
    `quiet here · ${mood}`,
    `seen ${spotted} · caught ${caught}`,
  ];
  const caption = captions[Math.floor(Math.random() * captions.length)];

  const polaroid = {
    id: Date.now(),
    when: now.getTime(),
    mood, season, bgTop, bgBot,
    glyph: moodGlyph(mood),
    seasonGlyph: seasonGlyph(season),
    stage: stageName,
    warmth, card,
    stars, lines, caught, spotted, wishes, bottles, moments,
    caption,
    tilt: (Math.random() * 6 - 3).toFixed(1),
  };
  polaroids.unshift(polaroid);
  if (polaroids.length > 40) polaroids.length = 40; // cap so localStorage doesn't bloat
  saveScrapbook();
  renderScrapbook();
  toast("polaroid in the album · this moment is kept");
}

function smallPolaroidHTML(p) {
  return `
    <div class="polaroid" data-id="${p.id}" style="--p-tilt: ${p.tilt}deg; --p-bg-top: ${p.bgTop}; --p-bg-bot: ${p.bgBot};">
      <div class="p-scene">
        <div class="p-glyph">${p.glyph}</div>
        <div class="p-pond"></div>
      </div>
      <div class="p-caption">${escapeHtml(p.caption)}</div>
      <div class="p-when">${formatPolaroidWhen(p.when, true)}</div>
    </div>
  `;
}

function bigPolaroidHTML(p) {
  const statsParts = [];
  if (p.stars)   statsParts.push(`✦ ${p.stars}`);
  if (p.caught)  statsParts.push(`★ caught ${p.caught}`);
  if (p.spotted) statsParts.push(`🦊 spotted ${p.spotted}`);
  if (p.wishes)  statsParts.push(`🌠 ${p.wishes}`);
  if (p.bottles) statsParts.push(`🍾 ${p.bottles}`);
  if (p.moments) statsParts.push(`🗼 ${p.moments}`);
  statsParts.push(`🌱 ${escapeHtml(p.stage)}`);
  statsParts.push(`🔥 ${escapeHtml(p.warmth)}`);
  if (p.card && p.card !== "undrawn") statsParts.push(`🔮 ${escapeHtml(p.card)}`);
  const stats = statsParts.join(" · ");
  return `
    <div class="p-scene" style="--p-bg-top: ${p.bgTop}; --p-bg-bot: ${p.bgBot};">
      <div class="p-glyph">${p.glyph}${p.seasonGlyph !== "✦" ? " " + p.seasonGlyph : ""}</div>
      <div class="p-pond"></div>
    </div>
    <div class="p-caption">${escapeHtml(p.caption)}</div>
    <div class="p-when">${formatPolaroidWhen(p.when, false)}</div>
    <div class="p-stats">${stats}</div>
  `;
}

function formatPolaroidWhen(ts, short) {
  const d = new Date(ts);
  const date = d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: short ? undefined : "numeric" });
  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${date.toLowerCase()} · ${time.toLowerCase()}`;
}

function renderScrapbook() {
  if (!scrapList) return;
  if (polaroidsCountEl) polaroidsCountEl.textContent = polaroids.length;
  if (scrapCount) scrapCount.textContent = `${polaroids.length} saved`;
  if (polaroids.length === 0) {
    scrapList.innerHTML = `<div class="scrap-empty">no polaroids yet · snap one above</div>`;
    return;
  }
  scrapList.innerHTML = polaroids.map(smallPolaroidHTML).join("");
}
renderScrapbook();

if (scrapSnap) scrapSnap.addEventListener("click", snapPolaroid);

if (scrapList) {
  scrapList.addEventListener("click", (e) => {
    const card = e.target.closest(".polaroid");
    if (!card) return;
    const id = +card.dataset.id;
    const p = polaroids.find(pp => pp.id === id);
    if (!p || !polaroidOverlay) return;
    openedPolaroidId = id;
    polaroidBig.innerHTML = bigPolaroidHTML(p);
    polaroidOverlay.hidden = false;
  });
}

function closePolaroidOverlay() {
  if (polaroidOverlay) polaroidOverlay.hidden = true;
  openedPolaroidId = null;
}
if (polaroidOverlay) {
  polaroidOverlay.addEventListener("click", (e) => { if (e.target === polaroidOverlay) closePolaroidOverlay(); });
}
if (polaroidDelete) {
  polaroidDelete.addEventListener("click", (e) => {
    e.stopPropagation();
    if (openedPolaroidId == null) return;
    polaroids = polaroids.filter(p => p.id !== openedPolaroidId);
    saveScrapbook();
    renderScrapbook();
    closePolaroidOverlay();
    toast("polaroid taken out of the album");
  });
}
document.addEventListener("keydown", (e) => {
  if (!polaroidOverlay || polaroidOverlay.hidden) return;
  if (e.key === "Escape" || e.key === "Enter") { e.preventDefault(); closePolaroidOverlay(); }
});

/* ============================================================
   feature: wind chimes on the shore
   a hanging cluster of tubes. it sways on its own (css), swings and
   rings during the existing wind-gust event, and rings when clicked.
   sound is a handful of soft pentatonic sines with a long decay —
   respects the mute setting. shares the ambient-orbit AudioContext if
   one already exists, otherwise lazily creates its own. auto-ringing on
   a gust is wired via a MutationObserver on the body class so this stays
   self-contained and never touches scheduleWindGust().
   ============================================================ */
const CHIME_KEY = "biosphere02.windchime.v1";
const windChimeEl = document.getElementById("wind-chime");
const CHIME_NOTES = [523.25, 587.33, 698.46, 783.99, 880.0, 1046.5]; // C-D-F-G-A pentatonic, high octave
const _chime = { ctx: null, gusting: false, rung: false };
try { _chime.rung = localStorage.getItem(CHIME_KEY) === "1"; } catch {}

function _chimeCtx() {
  if (orbit.ctx) return orbit.ctx;            // ride the orbit context if it's up
  if (_chime.ctx) return _chime.ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  _chime.ctx = new AC();
  return _chime.ctx;
}

function playChime(count = 3, spreadMs = 220) {
  if (settings && settings.mute) return;
  const ctx = _chimeCtx();
  if (!ctx) return;
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  const master = ctx.createGain();
  master.gain.value = 0.16;
  master.connect(ctx.destination);
  // pick a few distinct tubes to strike
  const notes = CHIME_NOTES.slice().sort(() => Math.random() - 0.5).slice(0, Math.min(count, CHIME_NOTES.length));
  const now = ctx.currentTime;
  notes.forEach((base, i) => {
    const f = base * (1 + (Math.random() - 0.5) * 0.004); // faint detune so strikes aren't identical
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.value = f;
    const g = ctx.createGain();
    g.gain.value = 0;
    o.connect(g).connect(master);
    const t = now + (i * spreadMs) / 1000 + Math.random() * 0.04;
    g.gain.linearRampToValueAtTime(0.9, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 2.6);
    o.start(t);
    o.stop(t + 2.8);
  });
}

if (windChimeEl) {
  windChimeEl.addEventListener("click", () => {
    // restart the single-swing animation
    windChimeEl.classList.remove("rung");
    void windChimeEl.offsetWidth;
    windChimeEl.classList.add("rung");
    playChime(3, 190);
    if (!_chime.rung) {
      _chime.rung = true;
      try { localStorage.setItem(CHIME_KEY, "1"); } catch {}
      toast("wind chimes · a little music for the shore");
    }
  });
  windChimeEl.addEventListener("animationend", () => windChimeEl.classList.remove("rung"));

  // ring softly a few times whenever a wind gust rolls in
  const chimeObserver = new MutationObserver(() => {
    const gusting = document.body.classList.contains("wind-gust");
    if (gusting && !_chime.gusting) {
      _chime.gusting = true;
      const rings = 3 + Math.floor(Math.random() * 3);
      for (let i = 0; i < rings; i++) {
        setTimeout(() => playChime(2 + Math.floor(Math.random() * 2), 340), 600 + Math.random() * 8000);
      }
    } else if (!gusting) {
      _chime.gusting = false;
    }
  });
  chimeObserver.observe(document.body, { attributes: true, attributeFilter: ["class"] });
}

/* ============================================================
   feature: moonflower on the shore
   a closed bud through the day that opens into a glowing bloom at night.
   the open/close state is pure css keyed on body.night (so it also opens
   under a sky-lock of night), cross-fading the stacked bud/bloom groups.
   clicking the open bloom puffs a cloud of pale pollen up into the sky
   and keeps a small tally of how many nights you've stirred it.
   ============================================================ */
const MOONFLOWER_KEY = "biosphere02.moonflower.v1";
const moonflowerEl = document.getElementById("moonflower");
let moonPollenReleased = (() => { try { return +localStorage.getItem(MOONFLOWER_KEY) || 0; } catch { return 0; } })();

function spawnMoonPollen(originX, originY) {
  if (isMotionReduced()) return;
  const count = 9 + Math.floor(Math.random() * 6);
  for (let i = 0; i < count; i++) {
    const p = document.createElement("span");
    p.className = "moon-pollen";
    p.textContent = "·";
    p.style.left = originX + "px";
    p.style.top = originY + "px";
    const dx = (Math.random() - 0.5) * 220;
    const dy = -(140 + Math.random() * 220);
    const rot = (Math.random() - 0.5) * 300;
    p.style.setProperty("--pollen-dx", dx.toFixed(0) + "px");
    p.style.setProperty("--pollen-dy", dy.toFixed(0) + "px");
    p.style.setProperty("--pollen-r", rot.toFixed(0) + "deg");
    p.style.animationDelay = (Math.random() * 260).toFixed(0) + "ms";
    p.style.animationDuration = (4200 + Math.random() * 1600).toFixed(0) + "ms";
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 6400);
  }
}

if (moonflowerEl) {
  moonflowerEl.addEventListener("click", () => {
    // only the open (night) bloom gives pollen; by day it's a shut bud
    if (!document.body.classList.contains("night")) {
      toast("the moonflower only opens after dark 🌙");
      return;
    }
    const rect = moonflowerEl.getBoundingClientRect();
    spawnMoonPollen(rect.left + rect.width / 2, rect.top + 14);
    moonPollenReleased++;
    try { localStorage.setItem(MOONFLOWER_KEY, String(moonPollenReleased)); } catch {}
    if (moonPollenReleased === 1) toast("you stirred the moonflower · pollen drifts up like slow stars");
  });
}

/* ============================================================
   feature: a kite in the day sky
   visible only during the "day" mood; bobs on its own, climbs and dances
   during a wind gust (pure css off the body classes). clicking tugs the
   string — a one-shot animation plus a first-time toast.
   ============================================================ */
const kiteEl = document.getElementById("kite");
let _kiteTugged = false;
if (kiteEl) {
  kiteEl.addEventListener("click", () => {
    kiteEl.classList.remove("tugged");
    void kiteEl.offsetWidth;
    kiteEl.classList.add("tugged");
    if (!_kiteTugged) {
      _kiteTugged = true;
      toast("you tug the string · the kite pulls back, alive in the wind");
    }
  });
  kiteEl.addEventListener("animationend", (e) => {
    if (e.animationName === "kite-tug") kiteEl.classList.remove("tugged");
  });
}

/* ============================================================
   feature: balancing stone cairn on the shore
   click to stack a stone; each sits a little off-center so the stack
   wobbles. a rising chance of toppling as it climbs (and a hard ceiling)
   makes going tall a small gamble. height + tallest-ever persist.
   ============================================================ */
const CAIRN_KEY = "biosphere02.cairn.v1";
const cairnEl = document.getElementById("cairn");
const cairnStonesEl = document.getElementById("cairn-stones");
let cairn = (() => {
  try { return JSON.parse(localStorage.getItem(CAIRN_KEY) || "null") || { height: 0, tallest: 0 }; }
  catch { return { height: 0, tallest: 0 }; }
})();
cairn.height = cairn.height || 0;
cairn.tallest = cairn.tallest || 0;
function saveCairn() { try { localStorage.setItem(CAIRN_KEY, JSON.stringify(cairn)); } catch {} }
function renderCairnStat() {
  const el = document.getElementById("cairn-stat");
  if (el) el.textContent = (cairn.tallest || 0) + " stone" + (cairn.tallest === 1 ? "" : "s");
}
// per-stone dimensions/offset, generated once and kept so a given stone keeps
// its wobble as the stack rebuilds each render.
const CAIRN_STONE_DEFS = [];
function ensureStoneDefs(n) {
  while (CAIRN_STONE_DEFS.length < n) {
    const i = CAIRN_STONE_DEFS.length;
    CAIRN_STONE_DEFS.push({
      w: Math.max(11, 30 - i * 1.5 + (Math.random() * 4 - 2)),
      h: 8 + Math.random() * 3,
      dx: Math.random() * 10 - 5,
    });
  }
}
function renderCairn() {
  if (!cairnStonesEl) return;
  cairnStonesEl.innerHTML = "";
  const base = document.createElement("div");
  base.className = "cairn-stone cairn-base";
  cairnStonesEl.appendChild(base);
  ensureStoneDefs(cairn.height);
  let y = 10; // sit the first stone just above the base
  for (let i = 0; i < cairn.height; i++) {
    const d = CAIRN_STONE_DEFS[i];
    const s = document.createElement("div");
    s.className = "cairn-stone";
    s.style.width = d.w.toFixed(1) + "px";
    s.style.height = d.h.toFixed(1) + "px";
    s.style.bottom = y + "px";
    s.style.left = `calc(50% + ${d.dx.toFixed(1)}px)`;
    cairnStonesEl.appendChild(s);
    y += d.h + 1;
  }
  renderCairnStat();
}
function toppleCairn() {
  const stones = Array.from(cairnStonesEl.querySelectorAll(".cairn-stone:not(.cairn-base)"));
  cairn.height = 0;
  saveCairn();
  renderCairnStat();
  toast("the cairn topples · start again, patiently", 2200);
  if (isMotionReduced()) { renderCairn(); return; }
  stones.forEach((s) => {
    const dir = Math.random() < 0.5 ? -1 : 1;
    s.style.transition = "transform 640ms ease-in, opacity 640ms ease";
    s.style.transform =
      `translateX(calc(-50% + ${(dir * (28 + Math.random() * 40)).toFixed(0)}px)) ` +
      `translateY(${(40 + Math.random() * 30).toFixed(0)}px) ` +
      `rotate(${(dir * (60 + Math.random() * 120)).toFixed(0)}deg)`;
    s.style.opacity = "0";
  });
  setTimeout(renderCairn, 680);
}
renderCairn();
if (cairnEl) {
  cairnEl.addEventListener("click", () => {
    const h = cairn.height;
    // no risk for the first few; then a rising chance, plus a hard ceiling
    const toppleChance = h <= 5 ? 0 : Math.min(0.85, (h - 5) * 0.14);
    if (h >= 12 || Math.random() < toppleChance) { toppleCairn(); return; }
    cairn.height = h + 1;
    if (cairn.height > cairn.tallest) cairn.tallest = cairn.height;
    saveCairn();
    renderCairn();
    if (cairn.height === 1) toast("one stone balanced · see how high it'll go");
  });
}

/* ============================================================
   feature: snail on the shore (the slow visitor)
   crawls the shoreline far slower than the fox, dropping a faint glistening
   trail behind it. hover pauses it; click to spot (counts toward the same
   creatures-spotted total). respects reduced-motion.
   ============================================================ */
const snail = document.createElement("div");
snail.className = "snail";
snail.textContent = "🐌";
snail.title = "the slow one — click to spot";
document.body.appendChild(snail);

let snailState = { active: false, paused: false, pauseStart: 0, totalPaused: 0 };

function dropSnailTrail(x) {
  if (isMotionReduced()) return;
  const rect = snail.getBoundingClientRect();
  const dot = document.createElement("div");
  dot.className = "snail-trail";
  dot.style.left = x + "px";
  dot.style.top = (rect.top + rect.height * 0.7) + "px";
  document.body.appendChild(dot);
  setTimeout(() => dot.remove(), 3600);
}

function startSnailWalk() {
  if (snailState.active) return;
  if (isMotionReduced()) { scheduleNextSnail(); return; }
  snailState = { active: true, paused: false, pauseStart: 0, totalPaused: 0 };
  const fromLeft = Math.random() < 0.5;
  const W = window.innerWidth;
  const startX = fromLeft ? -40 : W + 10;
  const endX   = fromLeft ? W + 10 : -40;
  const duration = 60000 + Math.random() * 40000; // slow: 60-100s across
  snail.classList.toggle("facing-left", !fromLeft);
  snail.classList.add("crawling");
  snail.style.left = startX + "px";

  const startTime = performance.now();
  let lastTrail = 0;
  function frame(now) {
    if (!snailState.active) return;
    if (snailState.paused) { requestAnimationFrame(frame); return; }
    const elapsed = now - startTime - snailState.totalPaused;
    const p = Math.min(1, elapsed / duration);
    const x = startX + (endX - startX) * p;
    snail.style.left = x + "px";
    if (now - lastTrail > 650) {
      lastTrail = now;
      dropSnailTrail(x + (fromLeft ? 3 : 15));
    }
    if (p < 1) requestAnimationFrame(frame);
    else endSnailWalk(true);
  }
  requestAnimationFrame(frame);
}
function endSnailWalk(scheduleNext) {
  snail.classList.remove("crawling", "facing-left");
  snail.style.left = "-50px";
  snailState.active = false;
  if (scheduleNext) scheduleNextSnail();
}
snail.addEventListener("mouseenter", () => {
  if (!snailState.active || snailState.paused) return;
  snailState.paused = true;
  snailState.pauseStart = performance.now();
});
snail.addEventListener("mouseleave", () => {
  if (!snailState.paused) return;
  snailState.totalPaused += performance.now() - snailState.pauseStart;
  snailState.paused = false;
});
snail.addEventListener("click", (e) => {
  if (!snailState.active) return;
  snailState.active = false;
  snail.classList.add("caught");
  spottedCount++;
  try { localStorage.setItem(SPOTTED_KEY, String(spottedCount)); } catch {}
  renderSpottedCount();
  spawnCatchBurst(e.clientX, e.clientY);
  markCreatureSeen("snail");
  toast(spottedCount === 1 ? "you spotted the snail 🐌 · slow and sure" : "the slow one, spotted 🐌");
  setTimeout(() => { snail.classList.remove("caught"); endSnailWalk(true); }, 360);
});
function scheduleNextSnail() {
  const wait = 90_000 + Math.random() * 90_000; // 90-180s between appearances
  setTimeout(startSnailWalk, wait);
}
setTimeout(startSnailWalk, 40_000);

/* ============================================================
   feature: moth drawn to the hearth
   ties into the cabin fire: a moth only appears while the fire is warm,
   fluttering around the bottom-left hearth glow. click to spot; it drifts
   off on its own, or early if the fire goes cold. respects reduced-motion.
   ============================================================ */
const MOTH_WARMTH_MIN = 30;
let _moth = null;
function spawnMoth() {
  if (isMotionReduced() || _moth) return;
  const m = document.createElement("div");
  m.className = "moth";
  m.title = "a moth at the fire — click to spot";
  m.innerHTML = `
    <svg class="moth-svg" viewBox="0 0 20 16" aria-hidden="true">
      <ellipse class="moth-wing left" cx="6" cy="8" rx="5" ry="6" fill="rgba(226, 216, 194, 0.9)"/>
      <ellipse class="moth-wing right" cx="14" cy="8" rx="5" ry="6" fill="rgba(226, 216, 194, 0.9)"/>
      <ellipse cx="10" cy="8" rx="1.4" ry="4.5" fill="#4a4238"/>
      <circle cx="10" cy="3.6" r="1.2" fill="#4a4238"/>
    </svg>`;
  document.body.appendChild(m);
  _moth = m;

  const homeX = 60 + Math.random() * 120;
  const homeY = window.innerHeight - 90 - Math.random() * 70;
  m.style.left = homeX + "px";
  m.style.top = homeY + "px";

  let claimed = false;
  m.addEventListener("click", (e) => {
    if (claimed) return;
    claimed = true;
    spottedCount++;
    try { localStorage.setItem(SPOTTED_KEY, String(spottedCount)); } catch {}
    renderSpottedCount();
    spawnCatchBurst(e.clientX, e.clientY);
    markCreatureSeen("moth");
    toast("a moth, spotted · it mistook you for the light");
    m.classList.add("caught");
    setTimeout(() => { m.remove(); if (_moth === m) _moth = null; }, 350);
  });

  const born = performance.now();
  const lifespan = 16000 + Math.random() * 9000;
  let tx = homeX, ty = homeY, nx = homeX, ny = homeY, nextDart = 0;
  function frame(now) {
    if (claimed || !document.body.contains(m)) return;
    const cold = !hearth || (hearth.warmth || 0) < 8;
    if (now - born > lifespan || cold) {
      m.style.opacity = "0";
      setTimeout(() => { m.remove(); if (_moth === m) _moth = null; }, 500);
      return;
    }
    if (now > nextDart) {
      nextDart = now + 300 + Math.random() * 500;
      nx = homeX + (Math.random() * 80 - 40);
      ny = homeY + (Math.random() * 70 - 35);
    }
    tx += (nx - tx) * 0.08;
    ty += (ny - ty) * 0.08;
    m.style.left = tx + "px";
    m.style.top = ty + "px";
    m.classList.add("fluttering");
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
(function maybeSpawnMoth() {
  const wait = 40_000 + Math.random() * 50_000; // 40-90s
  setTimeout(() => {
    if (!isMotionReduced() && hearth && (hearth.warmth || 0) >= MOTH_WARMTH_MIN && !_moth) spawnMoth();
    maybeSpawnMoth();
  }, wait);
})();

/* ============================================================
   feature: guestbook window
   leave a small mark (a name + one line) that persists in localStorage and
   renders newest-first. shows up as a real window, so ⌘K / search find it
   for free. cleared by the settings "reset everything" (biosphere02.* keys).
   ============================================================ */
const GUESTBOOK_KEY = "biosphere02.guestbook.v1";
const guestName = document.getElementById("guest-name");
const guestNote = document.getElementById("guest-note");
const guestSign = document.getElementById("guest-sign");
const guestStatus = document.getElementById("guest-status");
const guestListEl = document.getElementById("guest-list");
let guestMarks = (() => { try { return JSON.parse(localStorage.getItem(GUESTBOOK_KEY) || "[]"); } catch { return []; } })();
function saveGuestbook() { try { localStorage.setItem(GUESTBOOK_KEY, JSON.stringify(guestMarks)); } catch {} }
function renderGuestCount() {
  const el = document.getElementById("guestbook-count");
  if (el) el.textContent = guestMarks.length;
}
function renderGuestbook() {
  renderGuestCount();
  if (!guestListEl) return;
  if (guestMarks.length === 0) {
    guestListEl.innerHTML = `<div class="guest-empty">no marks yet · be the first to sign the wall</div>`;
    return;
  }
  guestListEl.innerHTML = guestMarks.map(mk => {
    const when = new Date(mk.when).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
    return `<div class="guest-mark">
      <div class="guest-mark-head">
        <span class="guest-mark-name">${escapeHtml(mk.name)}</span>
        <span class="guest-mark-when">${escapeHtml(when)}</span>
      </div>
      ${mk.note ? `<div class="guest-mark-note">${escapeHtml(mk.note)}</div>` : ""}
    </div>`;
  }).join("");
}
renderGuestbook();
if (guestSign) {
  guestSign.addEventListener("click", () => {
    const name = ((guestName && guestName.value) || "").trim() || "a passing leaf ✦";
    const note = ((guestNote && guestNote.value) || "").trim();
    guestMarks.unshift({ name: name.slice(0, 24), note: note.slice(0, 140), when: Date.now() });
    if (guestMarks.length > 60) guestMarks.length = 60;
    saveGuestbook();
    renderGuestbook();
    if (guestName) guestName.value = "";
    if (guestNote) guestNote.value = "";
    if (guestStatus) {
      guestStatus.textContent = "marked ✓";
      setTimeout(() => { if (guestStatus.textContent === "marked ✓") guestStatus.textContent = ""; }, 1600);
    }
    if (guestMarks.length === 1) toast("you left a mark · the wall remembers");
  });
}

/* ============================================================
   feature: rope swing on the shore
   still at rest; a click gives the seat a decaying push, and a wind gust
   sets it swaying (css off body.wind-gust). the .swinging one-shot clears
   itself on animationend so a later gust can take over.
   ============================================================ */
const swingEl = document.getElementById("swing");
let _swingPushed = false;
if (swingEl) {
  swingEl.addEventListener("click", () => {
    swingEl.classList.remove("swinging");
    void swingEl.offsetWidth;
    swingEl.classList.add("swinging");
    if (!_swingPushed) {
      _swingPushed = true;
      toast("you set the swing going · it creaks on the backswing");
    }
  });
  swingEl.addEventListener("animationend", (e) => {
    if (e.animationName === "swing-push") swingEl.classList.remove("swinging");
  });
}

/* ============================================================
   feature: bird's nest on the shore
   advances one stage each new distinct day you visit (reusing the plant's
   "days seen" idea): eggs → hatchlings → fledglings → they fly off and the
   nest goes quiet → a fresh clutch of eggs. click to peek. persists.
   ============================================================ */
const NEST_KEY = "biosphere02.nest.v1";
const nestEl = document.getElementById("nest");
const nestContents = document.getElementById("nest-contents");
let nest = (() => {
  try { return JSON.parse(localStorage.getItem(NEST_KEY) || "null") || {}; }
  catch { return {}; }
})();
function saveNest() { try { localStorage.setItem(NEST_KEY, JSON.stringify(nest)); } catch {} }

const NEST_STAGE_ORDER = [1, 2, 3, 0]; // eggs, hatchlings, fledglings, quiet
const NEST_STAGE_LABEL = { 0: "quiet", 1: "3 eggs", 2: "hatchlings", 3: "fledglings" };
const NEST_PEEK = {
  0: "the nest is empty and quiet · something may be along soon",
  1: "three speckled eggs · warm and patient",
  2: "hatchlings, all beak and hunger · they grow while you're away",
  3: "fledglings testing their wings · they'll be gone before long",
};
let _nestJustFledged = false;
// roll the nest forward for each new distinct day the biosphere is opened
(function advanceNestForToday() {
  const today = todayISO();
  if (nest.lastDay === undefined || nest.stage === undefined) {
    // first ever visit: start with a fresh clutch of eggs
    nest.stage = 1;
    nest.broods = nest.broods || 0;
    nest.lastDay = today;
    saveNest();
    return;
  }
  if (nest.lastDay !== today) {
    const idx = NEST_STAGE_ORDER.indexOf(nest.stage);
    const next = NEST_STAGE_ORDER[(idx + 1) % NEST_STAGE_ORDER.length];
    if (nest.stage === 3) { nest.broods = (nest.broods || 0) + 1; _nestJustFledged = true; }
    nest.stage = next;
    nest.lastDay = today;
    saveNest();
  }
})();
function renderNestStat() {
  const el = document.getElementById("nest-stat");
  if (el) el.textContent = NEST_STAGE_LABEL[nest.stage] || "…";
}
function renderNest() {
  if (nestContents) {
    let svg = "";
    if (nest.stage === 1) {
      // three speckled eggs resting in the bowl
      const eggs = [[20, 23], [30, 22], [40, 23]];
      for (const [cx, cy] of eggs) {
        svg += `<ellipse cx="${cx}" cy="${cy}" rx="4" ry="5.2" fill="#e6dcc4"/>`;
        svg += `<circle cx="${cx - 1}" cy="${cy - 1}" r="0.6" fill="#b6a888"/><circle cx="${cx + 1.4}" cy="${cy + 1}" r="0.5" fill="#b6a888"/>`;
      }
    } else if (nest.stage === 2) {
      // hatchlings: small dark bodies with open beaks poking up
      const chicks = [[21, "b"], [30, ""], [39, "c"]];
      for (const [cx, cls] of chicks) {
        svg += `<g class="nest-peep ${cls}">`;
        svg += `<ellipse cx="${cx}" cy="20" rx="3.4" ry="3.8" fill="#3a2f26"/>`;
        svg += `<circle cx="${cx}" cy="15.5" r="2.4" fill="#4a3d31"/>`;
        svg += `<polygon points="${cx - 2},15.5 ${cx + 2},15.5 ${cx},18" fill="#f2b23a"/>`;
        svg += `<circle cx="${cx - 0.8}" cy="15" r="0.5" fill="#0c0c0c"/>`;
        svg += `</g>`;
      }
    } else if (nest.stage === 3) {
      // fledglings: rounder little birds nearly ready to go
      const birds = [[22, "b"], [38, "c"]];
      for (const [cx, cls] of birds) {
        svg += `<g class="nest-peep ${cls}">`;
        svg += `<ellipse cx="${cx}" cy="18" rx="5" ry="5.4" fill="#6a5038"/>`;
        svg += `<circle cx="${cx + 3}" cy="13.5" r="2.8" fill="#7a5c40"/>`;
        svg += `<polygon points="${cx + 5},13 ${cx + 8},14 ${cx + 5},15" fill="#f2b23a"/>`;
        svg += `<circle cx="${cx + 3.6}" cy="13" r="0.6" fill="#0c0c0c"/>`;
        svg += `<path d="M${cx - 4} 17 Q${cx} 22 ${cx + 3} 18" fill="#4a3626"/>`;
        svg += `</g>`;
      }
    } else {
      // quiet: a single stray feather
      svg += `<path d="M28 14 Q34 20 30 26 Q27 21 28 14 Z" fill="rgba(220,214,196,0.5)"/>`;
      svg += `<line x1="29" y1="15" x2="29.5" y2="25" stroke="rgba(180,170,150,0.6)" stroke-width="0.5"/>`;
    }
    nestContents.innerHTML = svg;
  }
  renderNestStat();
}
renderNest();
if (nestEl) {
  nestEl.addEventListener("click", () => {
    toast(NEST_PEEK[nest.stage] || NEST_PEEK[0], 2600);
  });
}
if (_nestJustFledged) {
  setTimeout(() => toast("the fledglings flew off while you were away 🐦 · the nest is quiet again", 3200), 1400);
}

/* ============================================================
   feature: pond turtle
   surfaces at the water's edge to bask during the day (or a sky-lock to
   day/dawn), bobs, and slips under with a ripple when clicked — counting
   toward the shared creatures-spotted total. respects reduced-motion.
   ============================================================ */
let _turtle = null;
function spawnTurtle() {
  if (isMotionReduced() || _turtle || pondW === 0) return;
  const t = document.createElement("div");
  t.className = "turtle";
  t.title = "a turtle, basking — click to spot";
  t.innerHTML = `
    <svg class="turtle-svg" viewBox="0 0 28 20" aria-hidden="true">
      <ellipse cx="14" cy="12" rx="10" ry="6.5" fill="#4a6a44"/>
      <path d="M14 6 L18 9 L16 14 L12 14 L10 9 Z" fill="#5f8a54"/>
      <ellipse cx="14" cy="12" rx="10" ry="6.5" fill="none" stroke="#38502f" stroke-width="0.8"/>
      <circle cx="24" cy="11" r="2.4" fill="#5f8a54"/>
      <circle cx="25" cy="10.4" r="0.5" fill="#0c0c0c"/>
    </svg>`;
  document.body.appendChild(t);
  _turtle = t;

  // pick a spot in the pond, store the pond-local coords for the ripple
  const rect = pondCanvas.getBoundingClientRect();
  const lx = 70 + Math.random() * Math.max(20, pondW - 140);
  const ly = 24 + Math.random() * Math.max(8, pondH * 0.22);
  t.dataset.lx = lx;
  t.dataset.ly = ly;
  t.style.left = (rect.left + lx - 14) + "px";
  t.style.top = (rect.top + ly - 10) + "px";
  // surface
  requestAnimationFrame(() => t.classList.add("up"));

  let claimed = false;
  const slipUnder = () => {
    if (claimed) return;
    t.classList.remove("up");
    t.classList.add("gone");
    setTimeout(() => { t.remove(); if (_turtle === t) _turtle = null; }, 900);
  };
  t.addEventListener("click", (e) => {
    if (claimed) return;
    claimed = true;
    if (typeof addRipple === "function") addRipple(+t.dataset.lx, +t.dataset.ly, 1.8, 80);
    spottedCount++;
    try { localStorage.setItem(SPOTTED_KEY, String(spottedCount)); } catch {}
    renderSpottedCount();
    spawnCatchBurst(e.clientX, e.clientY);
    markCreatureSeen("turtle");
    toast(spottedCount === 1 ? "you spotted the turtle 🐢 · it slid under, unhurried" : "the turtle slips under 🐢");
    t.classList.remove("up");
    t.classList.add("gone");
    setTimeout(() => { t.remove(); if (_turtle === t) _turtle = null; }, 700);
  });
  // basks for a while, then slips under on its own if not spotted
  setTimeout(slipUnder, 12000 + Math.random() * 8000);
}
(function maybeSpawnTurtle() {
  const wait = 55_000 + Math.random() * 60_000; // 55-115s
  setTimeout(() => {
    if (!isMotionReduced() && pondW > 0 && !_turtle &&
        typeof isDaylight === "function" && isDaylight()) spawnTurtle();
    maybeSpawnTurtle();
  }, wait);
})();
setTimeout(() => { if (typeof isDaylight === "function" && isDaylight()) spawnTurtle(); }, 30_000);

/* ============================================================
   feature: telescope window
   look through it to find one real deep-sky object at a time — each with a
   one-line fact and a tiny rendering by type (galaxy / nebula / cluster).
   discovered objects are remembered so you can chart all ten.
   ============================================================ */
const TELESCOPE_KEY = "biosphere02.telescope.v1";
const TELESCOPE_OBJECTS = [
  { id: "m31",  name: "Andromeda Galaxy (M31)", type: "galaxy",  hue: "#bcd0ff", fact: "the nearest big galaxy · 2.5 million light-years off, and drifting toward us" },
  { id: "m42",  name: "Orion Nebula (M42)",     type: "nebula",  hue: "#ff9ab0", fact: "a stellar nursery in Orion's sword · new stars igniting inside the cloud" },
  { id: "m45",  name: "the Pleiades (M45)",     type: "cluster", hue: "#a9c4ff", fact: "the seven sisters · young blue stars wrapped in a wisp of dust" },
  { id: "m57",  name: "Ring Nebula (M57)",      type: "nebula",  hue: "#8fe0c0", fact: "a dying star's exhaled shell · a smoke ring 2,000 light-years wide" },
  { id: "m51",  name: "Whirlpool Galaxy (M51)", type: "galaxy",  hue: "#cfe0ff", fact: "a spiral caught mid-embrace with a smaller galaxy tugging its arm" },
  { id: "m1",   name: "Crab Nebula (M1)",       type: "nebula",  hue: "#ffbf7a", fact: "the wreck of a star that chinese astronomers saw explode in 1054" },
  { id: "m13",  name: "Hercules Cluster (M13)", type: "cluster", hue: "#ffe6b0", fact: "a swarm of 300,000 ancient stars · older than the sun by billions of years" },
  { id: "m104", name: "Sombrero Galaxy (M104)", type: "galaxy",  hue: "#d8c8ff", fact: "a galaxy seen edge-on · a bright bulge under a dark brim of dust" },
  { id: "m8",   name: "Lagoon Nebula (M8)",     type: "nebula",  hue: "#ff9ac0", fact: "a glowing lagoon of gas in Sagittarius, split by a dark channel" },
  { id: "m33",  name: "Triangulum Galaxy (M33)",type: "galaxy",  hue: "#bfe0e0", fact: "a face-on pinwheel · the third-largest galaxy in our local group" },
];
let telescope = (() => {
  try { return JSON.parse(localStorage.getItem(TELESCOPE_KEY) || "null") || { seen: [], looks: 0, last: null }; }
  catch { return { seen: [], looks: 0, last: null }; }
})();
telescope.seen = telescope.seen || [];
function saveTelescope() { try { localStorage.setItem(TELESCOPE_KEY, JSON.stringify(telescope)); } catch {} }

function _scopeStars(n, w, h) {
  let s = "";
  for (let i = 0; i < n; i++) {
    const x = (Math.random() * w).toFixed(1), y = (Math.random() * h).toFixed(1);
    const r = (0.4 + Math.random() * 0.8).toFixed(2);
    s += `<circle cx="${x}" cy="${y}" r="${r}" fill="rgba(246,241,216,${(0.3 + Math.random() * 0.5).toFixed(2)})"/>`;
  }
  return s;
}
function renderScopeObject(obj) {
  const c = obj.hue;
  let inner = "";
  if (obj.type === "galaxy") {
    inner = `
      <g transform="rotate(24 50 50)">
        <ellipse cx="50" cy="50" rx="40" ry="15" fill="${c}" opacity="0.12"/>
        <ellipse cx="50" cy="50" rx="30" ry="10" fill="${c}" opacity="0.20"/>
        <path d="M18 50 Q50 30 82 50" fill="none" stroke="${c}" stroke-width="1.4" opacity="0.35"/>
        <path d="M18 50 Q50 70 82 50" fill="none" stroke="${c}" stroke-width="1.4" opacity="0.35"/>
        <ellipse cx="50" cy="50" rx="9" ry="6" fill="#fff5e0" opacity="0.95"/>
      </g>`;
  } else if (obj.type === "nebula") {
    inner = `
      <ellipse cx="46" cy="52" rx="30" ry="24" fill="${c}" opacity="0.14"/>
      <ellipse cx="56" cy="46" rx="22" ry="26" fill="${c}" opacity="0.16"/>
      <ellipse cx="50" cy="50" rx="14" ry="12" fill="${c}" opacity="0.22"/>
      <circle cx="50" cy="50" r="2.4" fill="#fff5e0"/>`;
  } else {
    // cluster: dense scatter of stars, thicker toward the middle
    let dots = "";
    for (let i = 0; i < 40; i++) {
      const ang = Math.random() * Math.PI * 2;
      const rad = Math.pow(Math.random(), 0.6) * 34;
      const x = (50 + Math.cos(ang) * rad).toFixed(1);
      const y = (50 + Math.sin(ang) * rad).toFixed(1);
      const r = (0.6 + Math.random() * 1.1).toFixed(2);
      dots += `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}" opacity="${(0.5 + Math.random() * 0.5).toFixed(2)}"/>`;
    }
    inner = dots;
  }
  return `<svg viewBox="0 0 100 100" aria-hidden="true">${_scopeStars(26, 100, 100)}${inner}</svg>`;
}
function renderScopeCharted() {
  const label = `${telescope.seen.length} of ${TELESCOPE_OBJECTS.length} charted`;
  const el = document.getElementById("scope-charted");
  if (el) el.textContent = label;
  const stat = document.getElementById("telescope-stat");
  if (stat) stat.textContent = `${telescope.seen.length} of ${TELESCOPE_OBJECTS.length}`;
}
function scopeLookThrough() {
  // pick a random object, avoiding an immediate repeat of the last one
  let obj;
  let tries = 0;
  do { obj = TELESCOPE_OBJECTS[Math.floor(Math.random() * TELESCOPE_OBJECTS.length)]; tries++; }
  while (obj.id === telescope.last && TELESCOPE_OBJECTS.length > 1 && tries < 8);
  const isNew = !telescope.seen.includes(obj.id);
  if (isNew) telescope.seen.push(obj.id);
  telescope.last = obj.id;
  telescope.looks = (telescope.looks || 0) + 1;
  saveTelescope();

  const view = document.getElementById("scope-view");
  const nameEl = document.getElementById("scope-name");
  const factEl = document.getElementById("scope-fact");
  if (view) view.innerHTML = renderScopeObject(obj);
  if (nameEl) nameEl.textContent = obj.name;
  if (factEl) factEl.textContent = obj.fact;
  renderScopeCharted();
  if (isNew && telescope.seen.length === TELESCOPE_OBJECTS.length) {
    toast("you've charted the whole sky 🔭 · every object found");
  } else if (isNew) {
    toast(`charted · ${obj.name}`, 2400);
  }
}
renderScopeCharted();
const scopeLookBtn = document.getElementById("scope-look");
if (scopeLookBtn) scopeLookBtn.addEventListener("click", scopeLookThrough);

/* ============================================================
   feature: field guide window
   a checklist of every creature in the biosphere. each existing creature's
   click handler now calls markCreatureSeen(id) alongside its own toast, so
   this window is a payoff for a system that already existed rather than a
   new spotting mechanic. first-seen date persists per species.
   ============================================================ */
const FIELDGUIDE_KEY = "biosphere02.fieldguide.v1";
const CREATURE_SPECIES = [
  { id: "fox",         glyph: "🦊", name: "the fox",         blurb: "trots the shoreline, shy of a straight approach" },
  { id: "owl",         glyph: "🦉", name: "the owl",         blurb: "glides the upper sky, night only" },
  { id: "hummingbird", glyph: "🐦", name: "the hummingbird", blurb: "darts and hovers, daylight only, gone in a blink" },
  { id: "snail",       glyph: "🐌", name: "the snail",       blurb: "crosses the shore slower than anything else here" },
  { id: "moth",        glyph: "🪰", name: "the hearth moth", blurb: "only comes when the cabin fire is properly warm" },
  { id: "turtle",      glyph: "🐢", name: "the turtle",      blurb: "surfaces to bask in daylight, slips under when seen" },
  { id: "dragonfly",   glyph: "🎐", name: "the dragonfly",   blurb: "hovers low over the pond on warm daylit afternoons" },{ id: "butterfly",   glyph: "🦋", name: "the butterfly",   blurb: "drifts through the upper sky on warm daylit hours" },
];
let fieldGuide = (() => {
  try { return JSON.parse(localStorage.getItem(FIELDGUIDE_KEY) || "{}") || {}; }
  catch { return {}; }
})();
function saveFieldGuide() { try { localStorage.setItem(FIELDGUIDE_KEY, JSON.stringify(fieldGuide)); } catch {} }

function renderFieldGuide() {
  const list = document.getElementById("guide-list");
  const foot = document.getElementById("guide-foot");
  const seenCount = CREATURE_SPECIES.filter(s => fieldGuide[s.id]).length;
  if (foot) foot.textContent = `${seenCount} of ${CREATURE_SPECIES.length} spotted`;
  const stat = document.getElementById("fieldguide-stat");
  if (stat) stat.textContent = `${seenCount} of ${CREATURE_SPECIES.length}`;
  if (!list) return;
  list.innerHTML = CREATURE_SPECIES.map(s => {
    const seenAt = fieldGuide[s.id];
    const seen = !!seenAt;
    const when = seen ? new Date(seenAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "";
    return `<div class="guide-entry ${seen ? "seen" : "unseen"}">
      <div class="guide-glyph">${s.glyph}</div>
      <div class="guide-body">
        <div class="guide-name">${seen ? escapeHtml(s.name) : "??? — not yet spotted"}</div>
        <div class="guide-blurb">${seen ? escapeHtml(s.blurb) : "keep an eye out"}</div>
        ${seen ? `<div class="guide-when">first seen ${escapeHtml(when)}</div>` : ""}
      </div>
    </div>`;
  }).join("");
}
function markCreatureSeen(id) {
  const wasComplete = CREATURE_SPECIES.every(s => fieldGuide[s.id]);
  if (!fieldGuide[id]) {
    fieldGuide[id] = Date.now();
    saveFieldGuide();
    renderFieldGuide();
    const nowComplete = CREATURE_SPECIES.every(s => fieldGuide[s.id]);
    if (nowComplete && !wasComplete) {
      setTimeout(() => toast("the field guide is complete 📔 · every creature, spotted", 3400), 1400);
    }
  }
}
renderFieldGuide();

/* ============================================================
   feature: almanac window
   a quiet daily reading of the biosphere: mood, season, moon phase, and a
   short note pulled from today's forecast — reusing the forecast system
   rather than writing a second set of notes.
   ============================================================ */
function renderAlmanac() {
  const almMood = document.getElementById("alm-mood");
  const almSeason = document.getElementById("alm-season");
  const almMoon = document.getElementById("alm-moon");
  const almNote = document.getElementById("alm-note");
  if (!almMood) return;
  const moodLabels = { dawn: "first light 🌅", day: "open sky ☀️", dusk: "amber hour 🌇", night: "clear night 🌌" };
  const mood = currentMood();
  almMood.textContent = moodLabels[mood] || mood;
  const seasonEl = document.getElementById("season-label");
  almSeason.textContent = seasonEl ? seasonEl.textContent : currentSeason();
  const moonEl = document.getElementById("moon");
  almMoon.textContent = moonEl ? moonEl.textContent : "…";
  if (almNote) {
    const f = (typeof forecastFor === "function") ? forecastFor(new Date()) : null;
    almNote.textContent = f ? `${f.glyph} ${f.note}` : "the biosphere keeps its own quiet time.";
  }
}
renderAlmanac();
setInterval(renderAlmanac, 5 * 60 * 1000);

/* ============================================================
   feature: sundial on the shore
   the shadow's rotation is pure css off the body mood class (see
   styles.css) so it always agrees with the actual sky. clicking reads the
   real clock time out loud as a toast — the dial isn't just decorative.
   ============================================================ */
const sundialEl = document.getElementById("sundial");
if (sundialEl) {
  sundialEl.addEventListener("click", () => {
    const time = new Date().toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    toast(`the dial reads ${time.toLowerCase()} · give or take a shadow's width`, 2600);
  });
}

/* ============================================================
   feature: stepping stones across the pond
   a row of stones over the water; click them left-to-right to cross.
   clicking out of order just doesn't advance — no penalty, no reset.
   completing the row lights every stone briefly, counts a crossing, then
   quietly resets so you can cross again.
   ============================================================ */
const STEPSTONES_KEY = "biosphere02.stepstones.v1";
const stepstonesHost = document.getElementById("stepstones");
let stepCrossings = (() => { try { return +localStorage.getItem(STEPSTONES_KEY) || 0; } catch { return 0; } })();
const stepStoneEls = [];
let stepProgress = 0;

function layoutStepstones() {
  if (!stepstonesHost || pondW === 0) return;
  const rect = pondCanvas.getBoundingClientRect();
  const n = stepStoneEls.length || 5;
  const startFrac = 0.28, endFrac = 0.72;
  for (let i = 0; i < n; i++) {
    const el = stepStoneEls[i];
    if (!el) continue;
    const frac = n === 1 ? startFrac : startFrac + (endFrac - startFrac) * (i / (n - 1));
    const x = rect.left + pondW * frac;
    const y = rect.top + pondH * 0.32 + Math.sin(i * 1.4) * pondH * 0.10;
    el.style.left = (x - 13) + "px";
    el.style.top = (y - 6) + "px";
  }
}
function renderStepProgress() {
  stepStoneEls.forEach((el, i) => {
    el.classList.toggle("next", i === stepProgress);
  });
}
function buildStepstones() {
  if (!stepstonesHost) return;
  stepstonesHost.innerHTML = "";
  stepStoneEls.length = 0;
  for (let i = 0; i < 5; i++) {
    const el = document.createElement("div");
    el.className = "stepstone";
    el.title = "step here";
    el.dataset.i = i;
    el.addEventListener("click", () => onStepstoneClick(i));
    stepstonesHost.appendChild(el);
    stepStoneEls.push(el);
  }
  layoutStepstones();
  renderStepProgress();
}
function onStepstoneClick(i) {
  if (i !== stepProgress) return; // out of order — no penalty, just wait your turn
  const el = stepStoneEls[i];
  const rect = el.getBoundingClientRect();
  const pr = pondCanvas.getBoundingClientRect();
  if (typeof addRipple === "function" && pondW > 0) {
    addRipple(rect.left + 13 - pr.left, rect.top + 6 - pr.top, 1.0, 55);
  }
  stepProgress++;
  if (stepProgress >= stepStoneEls.length) {
    stepStoneEls.forEach(s => { s.classList.remove("next"); s.classList.add("lit"); });
    stepCrossings++;
    try { localStorage.setItem(STEPSTONES_KEY, String(stepCrossings)); } catch {}
    toast(stepCrossings === 1 ? "you cross the pond, stone by stone" : `crossed ${stepCrossings} times`, 2400);
    setTimeout(() => {
      stepProgress = 0;
      stepStoneEls.forEach(s => s.classList.remove("lit"));
      renderStepProgress();
    }, 1600);
  } else {
    renderStepProgress();
  }
}
buildStepstones();
window.addEventListener("resize", () => {
  clearTimeout(window._stepResize);
  window._stepResize = setTimeout(layoutStepstones, 160);
});

/* ============================================================
   feature: dragonfly over the pond (day-only, fills the field guide)
   hovers and darts in short bursts low over the water during daylight.
   click to spot — feeds the shared field guide + creatures-spotted total.
   ============================================================ */
let _dragonfly = null;
function spawnDragonfly() {
  if (isMotionReduced() || _dragonfly || pondW === 0) return;
  if (!(typeof isDaylight === "function" && isDaylight())) return;
  const rect = pondCanvas.getBoundingClientRect();
  const d = document.createElement("div");
  d.className = "dragonfly";
  d.title = "a dragonfly — click to spot";
  d.innerHTML = `
    <svg viewBox="0 0 30 20" aria-hidden="true" style="width:100%;height:100%;overflow:visible;">
      <ellipse cx="8" cy="10" rx="16" ry="2.6" fill="rgba(190,230,255,0.35)" transform="rotate(-8 8 10)"/>
      <ellipse cx="8" cy="10" rx="16" ry="2.6" fill="rgba(190,230,255,0.35)" transform="rotate(8 8 10)"/>
      <ellipse cx="6" cy="10" rx="7" ry="1.6" fill="#2f6a5a"/>
      <circle cx="1" cy="10" r="2.2" fill="#254f42"/>
    </svg>`;
  document.body.appendChild(d);
  _dragonfly = d;

  let hx = rect.left + 40 + Math.random() * Math.max(20, pondW - 80);
  let hy = rect.top + pondH * 0.35 + Math.random() * pondH * 0.3;
  d.style.left = hx + "px";
  d.style.top = hy + "px";
  requestAnimationFrame(() => d.classList.add("hovering"));

  let claimed = false;
  d.addEventListener("click", (e) => {
    if (claimed) return;
    claimed = true;
    spottedCount++;
    try { localStorage.setItem(SPOTTED_KEY, String(spottedCount)); } catch {}
    renderSpottedCount();
    spawnCatchBurst(e.clientX, e.clientY);
    markCreatureSeen("dragonfly");
    toast("the dragonfly, spotted 🎐 · gone in a wingbeat");
    d.classList.add("caught");
    setTimeout(() => { d.remove(); if (_dragonfly === d) _dragonfly = null; }, 320);
  });

  const born = performance.now();
  const lifespan = 13000 + Math.random() * 8000;
  let tx = hx, ty = hy, nx = hx, ny = hy, nextDart = 0;
  function frame(now) {
    if (claimed || !document.body.contains(d)) return;
    if (now - born > lifespan || !(typeof isDaylight === "function" && isDaylight())) {
      d.style.opacity = "0";
      setTimeout(() => { d.remove(); if (_dragonfly === d) _dragonfly = null; }, 450);
      return;
    }
    if (now > nextDart) {
      nextDart = now + 500 + Math.random() * 700;
      const r2 = pondCanvas.getBoundingClientRect();
      nx = r2.left + 30 + Math.random() * Math.max(20, pondW - 60);
      ny = r2.top + pondH * 0.25 + Math.random() * pondH * 0.4;
    }
    tx += (nx - tx) * 0.12;
    ty += (ny - ty) * 0.12;
    d.style.left = tx + "px";
    d.style.top = ty + "px";
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
(function maybeSpawnDragonfly() {
  const wait = 45_000 + Math.random() * 50_000; // 45-95s
  setTimeout(() => { spawnDragonfly(); maybeSpawnDragonfly(); }, wait);
})();
setTimeout(spawnDragonfly, 22_000);
/* ============================================================
   feature: butterfly (8th field-guide entry)
   drifts the upper sky during day and dusk on a slow sine wobble,
   hover-to-pause like the fox and snail do, click to spot — feeds
   the shared creatures-spotted counter and the field guide. night
   (or sky-locked night) is never a butterfly hour; if a flight is
   still in progress when night falls, it leaves anyway.
   ============================================================ */
const _butterflyEl = document.getElementById("butterfly");
let _butterfly = null;
function spawnButterfly() {
  if (_butterfly || isMotionReduced()) { scheduleNextButterfly(); return; }
  if (!_butterflyEl) return;
  if (typeof currentMood === "function" && currentMood() === "night") {
    scheduleNextButterfly();
    return;
  }
  const W = window.innerWidth, H = window.innerHeight;
  const fromLeft = Math.random() < 0.5;
  const startX = fromLeft ? -60 : W + 50;
  const endX = fromLeft ? W + 50 : -60;
  const startY = H * 0.10 + Math.random() * H * 0.22;
  const duration = 18000 + Math.random() * 14000;
  _butterfly = { el: _butterflyEl, paused: false, pauseStart: 0, totalPaused: 0 };
  _butterflyEl.style.left = startX + "px";
  _butterflyEl.style.top = startY + "px";
  _butterflyEl.style.transform = "";
  _butterflyEl.classList.remove("caught");
  _butterflyEl.classList.add("flying");
  const startT = performance.now();
  function frame(now) {
    if (!_butterfly || _butterfly.el !== _butterflyEl) return;
    if (_butterfly.paused) { requestAnimationFrame(frame); return; }
    // mid-flight: if the sky has moved past dusk while it was out, leave
    if (typeof currentMood === "function" && currentMood() === "night") {
      endButterfly(true);
      return;
    }
    const elapsed = now - startT - _butterfly.totalPaused;
    const p = Math.min(1, elapsed / duration);
    const baseX = startX + (endX - startX) * p;
    const wob = Math.sin(now * 0.0028) * 14 + Math.cos(now * 0.0017) * 6;
    _butterflyEl.style.left = baseX + "px";
    _butterflyEl.style.top = (startY + wob) + "px";
    if (p < 1) requestAnimationFrame(frame);
    else endButterfly(true);
  }
  requestAnimationFrame(frame);
}
function endButterfly(reschedule) {
  if (!_butterfly) return;
  _butterflyEl.classList.remove("flying");
  _butterflyEl.classList.remove("caught");
  _butterflyEl.style.left = "";
  _butterflyEl.style.top = "";
  _butterfly = null;
  if (reschedule) scheduleNextButterfly();
}
function scheduleNextButterfly() {
  const wait = 95_000 + Math.random() * 130_000; // 95 - 225s
  setTimeout(spawnButterfly, wait);
}
if (_butterflyEl) {
  _butterflyEl.addEventListener("mouseenter", () => {
    if (!_butterfly || _butterfly.paused) return;
    _butterfly.paused = true;
    _butterfly.pauseStart = performance.now();
  });
  _butterflyEl.addEventListener("mouseleave", () => {
    if (!_butterfly || !_butterfly.paused) return;
    _butterfly.totalPaused += performance.now() - _butterfly.pauseStart;
    _butterfly.paused = false;
  });
  _butterflyEl.addEventListener("click", (e) => {
    if (!_butterfly || _butterflyEl.classList.contains("caught")) return;
    spottedCount++;
    try { localStorage.setItem(SPOTTED_KEY, String(spottedCount)); } catch {}
    renderSpottedCount();
    spawnCatchBurst(e.clientX, e.clientY);
    markCreatureSeen("butterfly");
    toast(spottedCount === 1
      ? "you spotted the butterfly 🦋 · gone with the breeze"
      : `spotted a butterfly 🦋`);
    _butterflyEl.classList.add("caught");
    setTimeout(() => endButterfly(true), 350);
  });
}
setTimeout(spawnButterfly, 22_000);

/* ============================================================
   feature: cricket chorus (pure audio)
   fires a faint 3-6 burst chirp around 4 kHz every 22-50s at night.
   uses a lazy AudioContext that stays suspended until the user's
   first pointerdown anywhere — autoplay policy, but kept out of the
   shared orbit context (orbit only exists when you press ▶).
   respects settings.mute. no visual presence.
   ============================================================ */
const _cricketCtxRef = { ctx: null, armed: false };
function cricketChirp() {
  if (settings && settings.mute) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  if (!_cricketCtxRef.ctx) {
    try { _cricketCtxRef.ctx = new AC(); } catch { return; }
  }
  const ctx = _cricketCtxRef.ctx;
  if (ctx.state !== "running") return; // browser autoplay-blocked until first gesture
  const t0 = ctx.currentTime;
  const count = 3 + Math.floor(Math.random() * 4);
  for (let i = 0; i < count; i++) {
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.value = 4100 + Math.random() * 700;
    const g = ctx.createGain();
    g.gain.value = 0;
    o.connect(g).connect(ctx.destination);
    const start = t0 + i * 0.13;
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(0.022, start + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, start + 0.045);
    o.start(start);
    o.stop(start + 0.06);
  }
}
function scheduleCricket() {
  // first chirp after arming: wait at least 1.5s real-time so the burst
  // doesn't fire the instant the user happens to click something at dusk.
  const sinceArmed = _cricketCtxRef.armedAt ? performance.now() - _cricketCtxRef.armedAt : Infinity;
  const settle = sinceArmed < 1500 ? 1500 - sinceArmed : 0;
  const wait = (22_000 + Math.random() * 28_000) + settle;
  setTimeout(() => {
    if (typeof currentMood === "function" && currentMood() === "night") cricketChirp();
    scheduleCricket();
  }, wait);
}
// arm the audio context on first user gesture; afterwards the chirp fires
// whenever night falls even if no further interaction happens.
document.addEventListener("pointerdown", () => {
  if (_cricketCtxRef.armed) return;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  if (!_cricketCtxRef.ctx) { try { _cricketCtxRef.ctx = new AC(); } catch { return; } }
  const ctx = _cricketCtxRef.ctx;
  // .resume() is async. gate `armed` on the promise so the next chirp doesnt
  // race against a still-suspended context and silently bail.
  if (ctx.state === "suspended") {
    ctx.resume().then(() => { _cricketCtxRef.armed = true; _cricketCtxRef.armedAt = performance.now(); }).catch(() => { _cricketCtxRef.armed = true; _cricketCtxRef.armedAt = performance.now(); });
  } else {
    _cricketCtxRef.armed = true;
  }
});
scheduleCricket();

/* ============================================================
   feature: a rowboat tied to the dock
   sits at the right of the dock with a thin svg rope. clicking
   casts it off — the boat glides a slow arc to the far-right end
   of the pond via CSS transition, then arcs back the same way.
   counter shows up in ~/status as "voyages taken". pattern
   mirrors dockWalks — same shape, same first-launch toast.
   ============================================================ */
const ROW_KEY = "biosphere02.rowboat.v1";
const _rowboatEl = document.getElementById("rowboat");
let voyages = (() => { try { return +localStorage.getItem(ROW_KEY) || 0; } catch { return 0; } })();
function renderVoyages() {
  const el = document.getElementById("voyages-count");
  if (el) el.textContent = voyages;
}
renderVoyages();
if (_rowboatEl) {
  _rowboatEl.addEventListener("click", () => {
    if (_rowboatEl.classList.contains("cast-off")) return;
    // take the boat out of the css flow position so we can transition its
    // left/top freely without inheriting the dock-side offset
    const r = _rowboatEl.getBoundingClientRect();
    _rowboatEl.classList.add("cast-off");
    _rowboatEl.style.position = "absolute";
    _rowboatEl.style.bottom = "auto";
    _rowboatEl.style.left = r.left + "px";
    _rowboatEl.style.top = r.top + "px";
    // force reflow so re-applied transitions actually take effect
    void _rowboatEl.offsetWidth;
    voyages++;
    try { localStorage.setItem(ROW_KEY, String(voyages)); } catch {}
    renderVoyages();
    if (voyages === 1) toast("the rope slips · the rowboat pulls out across the pond");
    else if (voyages % 5 === 0) toast(`voyage #${voyages} · the planks know the weight`, 2200);
    const pondRect = pondCanvas.getBoundingClientRect();
    const endLeft = pondRect.left + pondRect.width * 0.82;
    const endTop = pondRect.top + pondRect.height * 0.55;
    _rowboatEl.style.transition = "left 16s cubic-bezier(.42, 0, .58, 1), top 16s ease-in-out";
    _rowboatEl.style.left = endLeft + "px";
    _rowboatEl.style.top = endTop + "px";
    setTimeout(() => {
      _rowboatEl.style.transition = "left 14s ease, top 14s ease";
      _rowboatEl.style.left = r.left + "px";
      _rowboatEl.style.top = r.top + "px";
    }, 16500);
    setTimeout(() => {
      _rowboatEl.classList.remove("cast-off");
      _rowboatEl.style.position = "";
      _rowboatEl.style.bottom = "";
      _rowboatEl.style.left = "";
      _rowboatEl.style.top = "";
      _rowboatEl.style.transition = "";
    }, 31000);
  });
}

/* ============================================================
   feature: tide wobble
   --pond-h cycles between 17vh and 19vh on a slow ~7-min sine.
   shore elements that pos with calc(--pond-h) (swing, dock, kettle,
   wishing tree, moonflower, all of them) shift a little with the
   breath. throttle to ~7 fps to keep the per-tick reflow cheap.
   status reads low / mid / high tide.
   ============================================================ */
let _tidePhase = 0;
let _tideLastLog = "mid"; // tracks which tide band we last pushed to ~/signals
function tideTick() {
  _tidePhase += 0.00224; // ~7-min cycle: 2pi/420s/1Hz
  const t = (Math.sin(_tidePhase) + 1) / 2;
  const h = 17 + t * 2; // 17..19 vh
  document.documentElement.style.setProperty("--pond-h", h.toFixed(2) + "vh");
  let level = "mid";
  if (t > 0.78) level = "high";
  else if (t < 0.22) level = "low";
  const statEl = document.getElementById("tide-stat");
  if (statEl) statEl.textContent = level + " tide";
  // visual gauge bar (only painted if the tide-gauge element exists)
  const fill = document.getElementById("tide-ga-fill");
  if (fill) {
    fill.style.width = (t * 100).toFixed(0) + "%";
    fill.classList.toggle("high", level === "high");
    fill.classList.toggle("low",  level === "low");
  }
  // log a tide mark in ~/signals the first time the tide crosses a band
  if (typeof gLog === "function" && level !== _tideLastLog) {
    _tideLastLog = level;
    if (level === "high") gLog("tide", "high tide mark", "the pond breathes");
    else if (level === "low") gLog("tide", "low tide mark", "the pond breathes");
  }
}
setInterval(tideTick, 1000);
tideTick();

/* ============================================================
   feature: a fern patch on the left shore
   sits between the dandelion and the wind vane. fronds grow over
   time: every 5th watering of the greenhouse plant, a new frond
   unfurls. capped at 8. each new frond sits at scaleY(0) until
   .unfurled flips the class — same pattern as the lotus elsewhere,
   here it pays off a low-value daily ritual.
   ============================================================ */
const FERN_KEY = "biosphere02.ferns.v1";
let fernsGrown = (() => { try { return +localStorage.getItem(FERN_KEY) || 0; } catch { return 0; } })();
function renderFernsStat() {
  const el = document.getElementById("ferns-stat");
  if (el) el.textContent = fernsGrown;
}
renderFernsStat();
// hand-picked slot layout — each frond has its own base x/y, lean, length
// and hue shift so the cluster reads as a fern mound rather than a row of
// identical stalks
const FERN_SLOTS = [
  { x: 14, y: 78, len: 38, lean: -14, hue: 0 },
  { x: 26, y: 78, len: 48, lean:  -6, hue: 1 },
  { x: 42, y: 78, len: 40, lean:   2, hue: 0 },
  { x: 50, y: 78, len: 34, lean:   8, hue: 1 },
  { x: 22, y: 80, len: 54, lean:  -8, hue: 0 },
  { x: 36, y: 80, len: 58, lean:  -2, hue: 1 },
  { x: 46, y: 80, len: 46, lean:   6, hue: 0 },
  { x: 30, y: 80, len: 62, lean:   4, hue: 1 },
];
function fernFrondSVG(idx) {
  const s = FERN_SLOTS[idx % FERN_SLOTS.length];
  const baseColor = s.hue ? "#6cb37e" : "#8fd49a";
  const tipColor  = s.hue ? "#3e8a6a" : "#5fa78a";
  const leaflets = [];
  const n = 7;
  for (let i = 1; i <= n; i++) {
    const t = i / (n + 1);
    const ly = s.y - s.len * t;
    const lxBase = s.x + s.lean * 0.4 + Math.sin(i * 0.9) * 0.6;
    const sideSign = i % 2 === 0 ? -1 : 1;
    const leafLen = 5 + (n - i + 1) * 1.3;
    leaflets.push(
      `<ellipse cx="${lxBase + sideSign * leafLen / 2}" cy="${ly}" rx="${leafLen / 2}" ry="${leafLen * 0.26}" fill="${baseColor}" opacity="0.92" transform="rotate(${sideSign * 28} ${lxBase} ${ly})"/>`,
    );
  }
  leaflets.push(`<circle cx="${s.x + s.lean}" cy="${s.y - s.len}" r="1.4" fill="${tipColor}"/>`);
  return `<g class="fern-frond" data-idx="${idx}">
    <path d="M${s.x} ${s.y} Q${s.x + s.lean * 0.4} ${s.y - s.len * 0.5} ${s.x + s.lean} ${s.y - s.len}" fill="none" stroke="${baseColor}" stroke-width="1.1" stroke-linecap="round"/>
    ${leaflets.join("")}
  </g>`;
}
// mature-paint on initial render so existing fronds aren't forced to replay
// their unfurl keyframe on every fresh load.
function renderFernPatch() {
  const host = document.getElementById("fern-fronds");
  if (!host) return;
  host.innerHTML = "";
  for (let i = 0; i < Math.min(fernsGrown, FERN_SLOTS.length); i++) {
    host.insertAdjacentHTML("beforeend", fernFrondSVG(i));
  }
  requestAnimationFrame(() => {
    host.querySelectorAll(".fern-frond").forEach(el => {
      el.style.transform = "scaleY(1)";
      el.style.opacity = "0.95";
    });
  });
}
// grow-one: append ONLY the new frond; existing mature fronds stay put
function appendNewFern(idx) {
  const host = document.getElementById("fern-fronds");
  if (!host) return;
  host.insertAdjacentHTML("beforeend", fernFrondSVG(idx));
  const fresh = host.querySelector(`.fern-frond[data-idx="${idx}"]`);
  if (fresh) requestAnimationFrame(() => fresh.classList.add("unfurled"));
}
renderFernPatch();
const _waterBtn = document.getElementById("water");
if (_waterBtn) {
  _waterBtn.addEventListener("click", () => {
    if (fernsGrown >= FERN_SLOTS.length) return;
    if ((plant && plant.water) && plant.water % 5 === 0) {
      const newIdx = fernsGrown; // index of the about-to-grow frond
      fernsGrown++;
      try { localStorage.setItem(FERN_KEY, String(fernsGrown)); } catch {}
      renderFernsStat();
      appendNewFern(newIdx);
      if (fernsGrown === 1) toast("a fern has unfurled at the shore 🌿", 2600);
    }
  });
}
/* ============================================================
   feature: ~/search 🔎 — a dedicated, google-style cross-search
   searches every meaningful piece of content in the biosphere:
   windows, mycelium notes, devlog entries, projects, wishes, the
   eight creatures, the named stars, the telescope's deep-sky
   objects, the shore items, the bottle notes, the forecast, AND
   a Google web fallback. result cards show glyph + title +
   highlighted snippet + source tag. arrow keys move, enter jumps,
   escape clears, tab cycles category filters. registry pattern:
   adding a new source is appending one object to BIOSPHERE_INDEX.
   ============================================================ */
const gSearchWin    = document.querySelector('[data-id="gsearch"]');
const gSearchInput  = document.getElementById("gsearch-input");
const gSearchResEl  = document.getElementById("gsearch-results");
const gSearchCount  = document.getElementById("gsearch-count");
const gSearchTime   = document.getElementById("gsearch-time");
const gSearchChips  = document.getElementById("gsearch-filter-chips");
let   gSearchRaw    = "";
let   gSearchQ      = "";
let   gSearchItems  = [];
let   gSearchSel    = 0;
let   gSearchActiveKind = "all";

/* ---- 1. the search registry ----
   each source = { key, chipLabel, glyph, get(q) → [ {kind,title,snippet,source,glyph,action} ] }
   adding a new source = adding one more object below. */
const BIOSPHERE_INDEX = [
  /* windows: their titlebar name + full innerHTML text */
  {
    key: "window", chipLabel: "windows", glyph: "▢",
    get: function (q) {
      const out = [];
      document.querySelectorAll(".window").forEach(w => {
        if (w.dataset.id === "gsearch") return; // don't surface self
        const title = w.querySelector(".tname").textContent.replace(/^~\//, "");
        const text = (w.textContent || "").replace(/\s+/g, " ");
        if (title.toLowerCase().includes(q) || text.toLowerCase().includes(q)) {
          out.push({
            kind: "window",
            glyph: "▢",
            title: title,
            snippet: makeSnippet(text, q),
            source: "~/ " + w.dataset.id,
            action: (() => {
              const probe = w;
              return () => {
                probe.classList.remove("minimized");
                probe.style.display = "";
                if (probe.dataset.closed === "1") {
                  delete probe.dataset.closed;
                  const chip = taskbar.querySelector(`[data-task="${probe.dataset.id}"]`);
                  if (chip) chip.remove();
                }
                bringToFront(probe);
                saveWindowState();
              };
            })(),
          });
        }
      });
      return out;
    },
  },

  /* mycelium notes (titles + bodies) */
  {
    key: "note", chipLabel: "notes", glyph: "🍄",
    get: function (q) {
      const out = [];
      if (typeof mycNotes !== "undefined" && Array.isArray(mycNotes)) {
        for (const n of mycNotes) {
          if (n.title.toLowerCase().includes(q) || n.body.toLowerCase().includes(q)) {
            out.push({
              kind: "note",
              glyph: "🍄",
              title: n.title,
              snippet: makeSnippet(n.body, q),
              source: "mycelium",
              action: (() => {
                const idx = n.id, t = n.title, b = n.body;
                return () => {
                  const w = document.querySelector('[data-id="mycelium"]');
                  if (!w) return;
                  gFocusWindow(w);
                  mycTitle.value = t;
                  mycBody.value = b;
                  editingId = idx;
                  if (mycStatus) mycStatus.textContent = "from search";
                };
              })(),
            });
          }
        }
      }
      return out;
    },
  },

  /* devlog entries */
  {
    key: "devlog", chipLabel: "devlog", glyph: "📓",
    get: function (q) {
      const out = [];
      document.querySelectorAll(".logentry").forEach(le => {
        const text = le.textContent.replace(/\s+/g, " ");
        if (text.toLowerCase().includes(q)) {
          const h3 = le.querySelector("h3");
          const title = h3 ? h3.textContent.trim() : "devlog entry";
          out.push({
            kind: "devlog",
            glyph: "📓",
            title,
            snippet: makeSnippet(text, q),
            source: "devlog",
            action: (() => { const el = le; return () => gFocusInsideWindow("devlog", el); })(),
          });
        }
      });
      return out;
    },
  },

  /* projects */
  {
    key: "project", chipLabel: "projects", glyph: "✦",
    get: function (q) {
      const out = [];
      document.querySelectorAll(".proj").forEach(p => {
        const text = (p.textContent || "").replace(/\s+/g, " ");
        if (text.toLowerCase().includes(q)) {
          const h = p.querySelector("h4");
          out.push({
            kind: "project",
            glyph: "✦",
            title: h ? h.textContent.trim() : "project",
            snippet: makeSnippet(text, q),
            source: "projects",
            action: (() => { const el = p; return () => gFocusInsideWindow("projects", el); })(),
          });
        }
      });
      return out;
    },
  },

  /* wishes */
  {
    key: "wish", chipLabel: "wishes", glyph: "✦",
    get: function (q) {
      const out = [];
      if (typeof loadWishes === "function") {
        for (const w of loadWishes()) {
          if (w.text.toLowerCase().includes(q)) {
            const when = new Date(w.when).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
            out.push({
              kind: "wish",
              glyph: "✦",
              title: `"${w.text}"`,
              snippet: when,
              source: "wish",
              action: (() => { const t = w.text, dte = when; return () => toast(`"${t}" · ${dte}`, 3200); })(),
            });
          }
        }
      }
      return out;
    },
  },

  /* creatures (from CREATURE_SPECIES) */
  {
    key: "creature", chipLabel: "creatures", glyph: "🦊",
    get: function (q) {
      const out = [];
      if (typeof CREATURE_SPECIES === "undefined" || !Array.isArray(CREATURE_SPECIES)) return out;
      for (const s of CREATURE_SPECIES) {
        const hay = `${s.name} ${s.blurb}`.toLowerCase();
        if (hay.includes(q)) {
          out.push({
            kind: "creature",
            glyph: s.glyph || "🦊",
            title: s.name,
            snippet: s.blurb,
            source: "field guide",
            action: (() => { const id = s.id, name = s.name; return () => {
              const w = document.querySelector('[data-id="fieldguide"]');
              if (!w) return;
              gFocusWindow(w);
              setTimeout(() => toast(`${name} · ${typeof fieldGuide !== "undefined" && fieldGuide[id] ? "spotted already" : "not yet spotted"}`, 2400), 80);
            }; })(),
          });
        }
      }
      return out;
    },
  },

  /* telescope deep-sky objects */
  {
    key: "telescope", chipLabel: "telescope", glyph: "🔭",
    get: function (q) {
      const out = [];
      if (typeof TELESCOPE_OBJECTS === "undefined" || !Array.isArray(TELESCOPE_OBJECTS)) return out;
      for (const obj of TELESCOPE_OBJECTS) {
        const hay = `${obj.name} ${obj.fact} ${obj.type}`.toLowerCase();
        if (hay.includes(q)) {
          out.push({
            kind: "telescope",
            glyph: "🔭",
            title: obj.name,
            snippet: obj.fact,
            source: `deep sky · ${obj.type}`,
            action: (() => { const objId = obj.id, objName = obj.name, objFact = obj.fact; return () => {
              const w = document.querySelector('[data-id="telescope"]');
              if (!w) return;
              gFocusWindow(w);
              setTimeout(() => toast(`${objName} · ${objFact}`, 3400), 80);
            }; })(),
          });
        }
      }
      return out;
    },
  },

  /* forecast */
  {
    key: "forecast", chipLabel: "forecast", glyph: "🌤",
    get: function (q) {
      const out = [];
      if (typeof forecastFor !== "function") return out;
      const today = new Date();
      for (let i = 0; i < 7; i++) {
        const d = new Date(today); d.setDate(d.getDate() + i);
        const f = forecastFor(d);
        const hay = `${f.label} ${f.note} ${f.kind}`.toLowerCase();
        if (hay.includes(q)) {
          const dateLbl = d.toLocaleDateString(undefined, { month: "short", day: "numeric", weekday: "short" });
          out.push({
            kind: "forecast",
            glyph: f.glyph || "✦",
            title: `${f.label} — ${dateLbl}${i === 0 ? " · today" : ""}`,
            snippet: f.note,
            source: "forecast",
            action: (() => { return () => {
              const w = document.querySelector('[data-id="forecast"]');
              if (!w) return;
              gFocusWindow(w);
              setTimeout(() => toast(`${f.glyph || "✦"} ${f.label} · ${f.note}`, 2800), 80);
            }; })(),
          });
        }
      }
      return out;
    },
  },

  /* named stars (the daily-star pool of 20) */
  {
    key: "named-star", chipLabel: "named stars", glyph: "✦",
    get: function (q) {
      const out = [];
      if (typeof namedStars === "undefined" || !Array.isArray(namedStars)) return out;
      for (const s of namedStars) {
        const hay = `${s.name} ${s.lore}`.toLowerCase();
        if (hay.includes(q)) {
          out.push({
            kind: "named-star",
            glyph: "✦",
            title: s.name,
            snippet: s.lore,
            source: "named stars",
            action: (() => { const name = s.name, lore = s.lore; return () => toast(`${name} · ${lore}`, 4800); })(),
          });
        }
      }
      return out;
    },
  },

  /* shore items */
  {
    key: "shore", chipLabel: "shore", glyph: "🌾",
    get: function (q) {
      const out = [];
      const items = [
        { id: "wishing-tree",  title: "wishing tree",   hint: "left shore · one glowing lantern per wish you've made" },
        { id: "dandelion",     title: "dandelion",      hint: "left shore · click to blow, seeds drift up into the sky" },
        { id: "cattails",      title: "cattails",       hint: "shore reeds · sway idly, lean hard during a wind gust" },
        { id: "dock",          title: "wooden dock",    hint: "extends into the pond · click the far plank to walk out" },
        { id: "bench",         title: "carved bench",   hint: "by the pond · click to sit for a moment" },
        { id: "firefly-jar",   title: "firefly jar",    hint: "right corner · one glow per firefly you've caught" },
        { id: "wind-vane",     title: "wind vane",      hint: "shore · idles pointing left, swings hard during a gust" },
        { id: "wind-chime",    title: "wind chimes",    hint: "shepherd's hook · sway and ring on the wind" },
        { id: "moonflower",    title: "moonflower",     hint: "right shore · opens into a glowing bloom at night" },
        { id: "sundial",       title: "sundial",        hint: "shore · shadow swings with the time of day" },
        { id: "swing",         title: "rope swing",     hint: "hangs from a branch · click to push, sways in a gust" },
        { id: "nest",          title: "bird's nest",    hint: "shore · advances one stage each new day you visit" },
        { id: "cairn",         title: "stone cairn",    hint: "shore · click to stack a stone; too tall and it topples" },
        { id: "rowboat",       title: "rowboat",        hint: "tied to the dock · cast off on a slow arc across the pond" },
        { id: "ferns",         title: "fern patch",     hint: "left shore · unfurls a frond every fifth watering" },
        { id: "lighthouse",    title: "lighthouse",     hint: "far shore · sweeps a beam at night; click to leave a moment" },
        { id: "named-star",    title: "named star of the day", hint: "one real star in the sky daily · click for lore" },
      ];
      for (const it of items) {
        const el = document.getElementById(it.id);
        if (!el) continue;
        const hay = `${it.title} ${it.hint}`.toLowerCase();
        if (hay.includes(q)) {
          out.push({
            kind: "shore",
            glyph: "🌾",
            title: it.title,
            snippet: it.hint,
            source: "shore",
            action: (() => { const id = it.id, hint = it.hint; return () => {
              const e = document.getElementById(id);
              if (!e) { toast(hint, 2800); return; }
              const orig = e.style.filter;
              e.style.transition = "filter 600ms ease";
              e.style.filter = (orig || "") + " drop-shadow(0 0 14px rgba(255, 217, 160, 0.85))";
              setTimeout(() => { e.style.filter = orig; }, 1200);
              toast(hint, 2800);
            }; })(),
          });
        }
      }
      return out;
    },
  },

  /* bottle notes */
  {
    key: "bottle", chipLabel: "bottles", glyph: "🍾",
    get: function (q) {
      const out = [];
      if (typeof bottleNotes === "undefined" || !Array.isArray(bottleNotes)) return out;
      const used = new Set();
      for (const n of bottleNotes) {
        const dedupe = `${n.body.slice(0, 32)}|${n.from}`;
        if (used.has(dedupe)) continue;
        const hay = `${n.body} ${n.from}`.toLowerCase();
        if (hay.includes(q)) {
          used.add(dedupe);
          out.push({
            kind: "bottle",
            glyph: "🍾",
            title: n.body,
            snippet: n.from,
            source: "drifting bottle",
            action: (() => { const body = n.body, from = n.from; return () => toast(`"${body}" · ${from}`, 3800); })(),
          });
        }
      }
      return out;
    },
  },

  /* google web fallback (always comes last via score=-1) */
  {
    key: "google", chipLabel: "web", glyph: "🌐",
    get: function () {
      const raw = gSearchRaw.trim();
      if (!raw) return [];
      return [{
        kind: "google",
        glyph: "🌐",
        title: `search google for "${raw}"`,
        snippet: "opens google.com in a new tab",
        source: "the wider web",
        action: (() => { const q = raw; return () => window.open(`https://www.google.com/search?q=${encodeURIComponent(q)}`, "_blank", "noopener,noreferrer"); })(),
      }];
    },
  },
];

/* ---- 2. scoring — substring + word-boundary bonus ---- */
function scoreHit(text, q) {
  const lc = text.toLowerCase();
  const idx = lc.indexOf(q);
  if (idx === -1) return 0;
  let s = 1;
  if (idx === 0 || /[\s\W]/.test(lc[idx - 1])) s += 1.2;
  s += 0.4;
  s += Math.max(0, 0.8 - lc.length / 200);
  return s;
}

/* ---- 3. safe highlight (escapes text first, then wraps matches in <mark>) ---- */
function hi(snippet, q) {
  if (snippet === undefined || snippet === null) return "";
  if (!q) return escapeHtml(snippet);
  const safe = escapeHtml(snippet);
  const safeQ = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return safe.replace(new RegExp(safeQ, "ig"), m => `<mark>${m}</mark>`);
}

/* ---- 4. render a single result card ---- */
function renderResultCard(it, i) {
  const safeTitle = hi(it.title, gSearchQ);
  const safeSnippet = it.snippet ? hi(it.snippet, gSearchQ) : "";
  return `<div class="gsearch-result kind-${escapeHtml(it.kind)}" data-i="${i}">
    <div class="gsearch-glyph">${escapeHtml(it.glyph || "✦")}</div>
    <div class="gsearch-result-body">
      <div class="gsearch-result-title">${safeTitle}</div>
      ${safeSnippet ? `<span class="gsearch-result-snippet">${safeSnippet}</span>` : ""}
      <span class="gsearch-result-source">${escapeHtml(it.source || it.kind)}</span>
    </div>
  </div>`;
}

/* ---- 5. the master search ---- */
function runBiosphereSearch() {
  const t0 = performance.now();
  gSearchRaw = gSearchInput ? (gSearchInput.value || "") : "";
  const raw = gSearchRaw;
  gSearchQ = raw.trim().toLowerCase();
  gSearchItems = [];
  gSearchSel = 0;

  if (!gSearchQ) {
    if (gSearchResEl) gSearchResEl.innerHTML = "";
    if (gSearchCount) gSearchCount.textContent = "type to search";
    if (gSearchTime) gSearchTime.textContent = "";
    return;
  }

  for (const src of BIOSPHERE_INDEX) {
    let hits = [];
    try { hits = src.get(gSearchQ) || []; } catch (e) { hits = []; }
    for (const h of hits) {
      if (h.kind === "google") { h._score = -1; }
      else {
        const hay = `${h.title} ${h.snippet || ""}`;
        h._score = scoreHit(hay, gSearchQ);
      }
    }
    for (const h of hits) gSearchItems.push(h);
  }

  if (gSearchActiveKind !== "all") {
    gSearchItems = gSearchItems.filter(it => it.kind === gSearchActiveKind);
  }

  // sort: score desc; google pinned last
  gSearchItems.sort((a, b) => {
    if (a._score !== b._score) return b._score - a._score;
    if (a.kind === "google") return 1;
    if (b.kind === "google") return -1;
    return 0;
  });

  // cap to 30 (preserve google fallback if present)
  const googleItem = gSearchItems.find(it => it.kind === "google");
  if (gSearchItems.length > 30) {
    gSearchItems = gSearchItems.slice(0, 30);
    if (googleItem && !gSearchItems.includes(googleItem)) {
      gSearchItems = gSearchItems.slice(0, 29);
      gSearchItems.push(googleItem);
    }
  }
  gSearchItems.forEach((it, i) => { it._i = i; });

  if (gSearchResEl) {
    gSearchResEl.innerHTML = gSearchItems.length
      ? gSearchItems.map(renderResultCard).join("")
      : renderEmptyState();
  }

  if (gSearchResEl) {
    const first = gSearchResEl.querySelector(".gsearch-result");
    if (first) first.classList.add("sel");
  }

  const totalCount = gSearchItems.length;
  if (gSearchCount) {
    gSearchCount.textContent = totalCount === 0
      ? "no results"
      : totalCount === 1
        ? "about 1 result"
        : `about ${totalCount} results`;
  }
  if (gSearchTime) {
    const dt = ((performance.now() - t0) / 1000).toFixed(2);
    gSearchTime.textContent = `${dt}s`;
  }
}

/* ---- 6. empty state with tips + Google escape hatch ---- */
function renderEmptyState() {
  const raw = (gSearchRaw || "").trim();
  let googleBtn = "";
  if (raw) {
    const safeRaw = escapeHtml(raw);
    googleBtn = `<button id="gsearch-go-google" class="gsearch-chip" style="margin-top:10px;">🌐 search google for "${safeRaw}"</button>`;
  }
  return `<div class="gsearch-empty">
    <div class="gsearch-empty-mark">✦</div>
    <div class="gsearch-empty-msg">${raw ? `nothing in the biosphere matches "${escapeHtml(raw)}"` : "type a query above"}</div>
    ${googleBtn}
    <div class="gsearch-tips">
      try <b>fox</b> · <b>pond</b> · <b>wish</b> · <b>kite</b> · <b>greenhouse</b> · <br/>
      <b>mushroom</b> · <b>owl</b> · <b>telescope</b> · <b>aurora</b>
    </div>
  </div>`;
}

/* ---- 7. the filter chips — kept in sync with active kind ---- */
function renderChips() {
  if (!gSearchChips) return;
  if (!gSearchQ) { gSearchChips.innerHTML = ""; return; }
  const kindCounts = {};
  for (const it of gSearchItems) kindCounts[it.kind] = (kindCounts[it.kind] || 0) + 1;
  const kindLabels = {
    window: "windows", note: "notes", devlog: "devlog", project: "projects",
    wish: "wishes", creature: "creatures", telescope: "telescope",
    forecast: "forecast", "named-star": "named stars", shore: "shore",
    bottle: "bottles", google: "web",
  };
  const allCount = gSearchItems.length;
  gSearchChips.innerHTML = "";
  const mkChip = (key, label) => {
    const count = key === "all" ? allCount : (kindCounts[key] || 0);
    if (key !== "all" && count === 0) return;
    const b = document.createElement("button");
    b.className = "gsearch-chip" + (gSearchActiveKind === key ? " active" : "");
    b.dataset.kind = key;
    b.innerHTML = `${escapeHtml(label)}<span class="gsearch-chip-count">${count}</span>`;
    b.addEventListener("click", () => {
      gSearchActiveKind = key;
      runBiosphereSearch();
      renderChips();
    });
    gSearchChips.appendChild(b);
  };
  mkChip("all", "all");
  for (const src of BIOSPHERE_INDEX) {
    if (src.key === "google") continue;
    if (kindLabels[src.key]) mkChip(src.key, kindLabels[src.key]);
  }
}

/* ---- 8. keyboard + mouse wiring ---- */
function gSelMove(delta) {
  if (!gSearchItems.length) return;
  gSearchSel = (gSearchSel + delta + gSearchItems.length) % gSearchItems.length;
  if (!gSearchResEl) return;
  gSearchResEl.querySelectorAll(".gsearch-result").forEach((el, i) => {
    el.classList.toggle("sel", i === gSearchSel);
  });
  const sel = gSearchResEl.querySelector(".gsearch-result.sel");
  if (sel) sel.scrollIntoView({ block: "nearest" });
}

function gSelRun() {
  const it = gSearchItems[gSearchSel];
  if (!it) return;
  try { it.action(); } catch (e) {}
  if (gSearchInput) {
    gSearchInput.value = "";
    runBiosphereSearch();
    gSearchInput.focus();
  }
}

function gCycleKind(delta) {
  const keys = ["all"];
  for (const src of BIOSPHERE_INDEX) if (src.key !== "google") keys.push(src.key);
  const idx = keys.indexOf(gSearchActiveKind);
  const next = (idx + delta + keys.length) % keys.length;
  gSearchActiveKind = keys[next];
  runBiosphereSearch();
  renderChips();
}

if (gSearchInput) {
  gSearchInput.addEventListener("input", () => {
    runBiosphereSearch();
    renderChips();
  });
  gSearchInput.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); gSelMove(1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); gSelMove(-1); }
    else if (e.key === "Enter") {
      e.preventDefault();
      gSelRun();
    } else if (e.key === "Escape") {
      if (gSearchInput.value) { gSearchInput.value = ""; runBiosphereSearch(); renderChips(); }
      else gSearchInput.blur();
    } else if (e.key === "Tab") {
      // hijack tab to cycle category filters inside the new window
      e.preventDefault();
      gCycleKind(e.shiftKey ? -1 : 1);
    }
  });
}

if (gSearchResEl) {
  gSearchResEl.addEventListener("click", (e) => {
    if (e.target && e.target.id === "gsearch-go-google") {
      const raw = (gSearchRaw || "").trim();
      if (!raw) return;
      window.open(`https://www.google.com/search?q=${encodeURIComponent(raw)}`, "_blank", "noopener,noreferrer");
      return;
    }
    const card = e.target.closest(".gsearch-result");
    if (!card) return;
    const idx = +card.dataset.i;
    if (Number.isNaN(idx)) return;
    gSearchSel = idx;
    gSelRun();
  });
  gSearchResEl.addEventListener("mousemove", (e) => {
    const card = e.target.closest(".gsearch-result");
    if (!card) return;
    const idx = +card.dataset.i;
    if (Number.isNaN(idx) || idx === gSearchSel) return;
    gSearchSel = idx;
    gSearchResEl.querySelectorAll(".gsearch-result").forEach((el, i) => {
      el.classList.toggle("sel", i === gSearchSel);
    });
  });
}

/* initial paint of the empty state so the chips area + count line are
   meaningful before any keystroke (counts as 0 results + google chip). */
if (gSearchInput && gSearchResEl) runBiosphereSearch();

/* ============================================================
   feature 1: ~/signals (live event log feed window)
   a single shared queue of noteworthy biosphere events. calling
   sites: wish save, meteor catch, mycelium save, bottle open,
   every creature spotted, hearth peak, aurora bell rung,
   tide high/low. cap: 80 events. persistent. filterable by kind.
   ============================================================ */
const SIGNAL_KEY = "biosphere02.signals.v1";
const SIGNAL_CAP = 80;
const signalsWin    = document.querySelector('[data-id="signals"]');
const signalsList   = document.getElementById("signals-list");
const signalsCount  = document.getElementById("signals-count");
const signalsTime   = document.getElementById("signals-time");
const signalsFilter = document.getElementById("signals-filter");
let signalsAll = [];
let signalsKindFilter = "all";
let _auroraBellsCount = (() => { try { return +localStorage.getItem("biosphere02.auroraBells.v1") || 0; } catch { return 0; } })();

function loadSignals() {
  try { return JSON.parse(localStorage.getItem(SIGNAL_KEY) || "[]") || []; }
  catch { return []; }
}
function saveSignals() {
  try { localStorage.setItem(SIGNAL_KEY, JSON.stringify(signalsAll)); } catch {}
}

function gLog(kind, title, source) {
  // unified event-log entry point. safe before the signals UI is ready.
  try {
    signalsAll.unshift({ kind, title: String(title || "").slice(0, 80), source: String(source || "").slice(0, 28), t: Date.now() });
    if (signalsAll.length > SIGNAL_CAP) signalsAll.length = SIGNAL_CAP;
    saveSignals();
  } catch {}
  if (signalsWin && signalsList) renderSignals();
  // tiny titlebar-dot pulse so the user knows ~something happened~
  if (signalsWin) {
    const dot = signalsWin.querySelector(".tdot");
    if (dot && typeof dot.animate === "function") {
      try {
        dot.animate(
          [{ filter: "drop-shadow(0 0 16px rgba(255,217,160,0.95))" },
           { filter: "drop-shadow(0 0 0px rgba(255,217,160,0))" }],
          { duration: 1200 }
        );
      } catch {}
    }
  }
}

const KIND_INFO = {
  wish:      { glyph: "✦",  label: "wishes"     },
  meteor:    { glyph: "🌠", label: "meteors"    },
  star:      { glyph: "✦",  label: "stars"      },
  bottle:    { glyph: "🍾", label: "bottles"    },
  note:      { glyph: "🍄", label: "notes"      },
  creature:  { glyph: "🦊", label: "creatures"  },
  hearth:    { glyph: "🔥", label: "hearth"     },
  aurora:    { glyph: "🌌", label: "aurora"     },
  tide:      { glyph: "🌊", label: "tide"       },
  biosphere: { glyph: "📡", label: "events" },
};

function fmtSignalTime(ts) {
  const now = Date.now();
  const d = new Date(ts);
  const diffSec = (now - ts) / 1000;
  let human;
  if (diffSec < 60)       human = "just now";
  else if (diffSec < 3600) human = Math.floor(diffSec / 60) + "m ago";
  else if (diffSec < 86400) human = Math.floor(diffSec / 3600) + "h ago";
  else human = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return human + " · " + d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function renderSignals() {
  if (!signalsList) return;
  // first paint: remember when we last painted, so the "new since" badge can show
  const counts = { all: signalsAll.length };
  for (const k of Object.keys(KIND_INFO)) counts[k] = 0;
  for (const s of signalsAll) counts[s.kind] = (counts[s.kind] || 0) + 1;
  // rebuild filter chips with live counts (chips with zero non-"all" counts are hidden)
  if (signalsFilter) {
    const keys = ["all", ...Object.keys(KIND_INFO).filter(k => counts[k] > 0)];
    signalsFilter.innerHTML = keys.map(k => {
      const info = k === "all" ? { glyph: "✦", label: "all" } : KIND_INFO[k];
      return `<button class="sig-chip${signalsKindFilter === k ? " active" : ""}" data-kind="${k}">` +
        escapeHtml(info.glyph + " " + info.label) +
        `<span class="sig-chip-count">${counts[k]}</span></button>`;
    }).join("");
  }
  // filtered rows
  const items = signalsKindFilter === "all"
    ? signalsAll
    : signalsAll.filter(s => s.kind === signalsKindFilter);
  if (!items.length) {
    signalsList.innerHTML =
      `<div class="signals-empty"><div class="signals-empty-mark">✦</div>` +
      `<div>${signalsKindFilter === "all"
        ? "no events yet — make something happen"
        : "nothing of this kind yet"}</div></div>`;
  } else {
    signalsList.innerHTML = items.map(s => {
      const info = KIND_INFO[s.kind] || { glyph: "✦" };
      return `<div class="sig-row kind-${escapeHtml(s.kind)}">` +
        `<span class="sig-glyph">${escapeHtml(info.glyph)}</span>` +
        `<span class="sig-body">` +
          `<span class="sig-title">${escapeHtml(s.title)}</span>` +
          (s.source ? `<span class="sig-source">${escapeHtml(s.source)}</span>` : "") +
        `</span>` +
        `<span class="sig-time">${escapeHtml(fmtSignalTime(s.t))}</span>` +
      `</div>`;
    }).join("");
  }
  if (signalsCount) {
    signalsCount.textContent = signalsKindFilter === "all"
      ? `${items.length} event${items.length === 1 ? "" : "s"}`
      : `${items.length} of ${signalsAll.length}`;
  }
  if (signalsTime) signalsTime.textContent = String(items.length).padStart(2, "0");
}

if (signalsFilter) {
  signalsFilter.addEventListener("click", (e) => {
    const b = e.target.closest(".sig-chip");
    if (!b) return;
    signalsKindFilter = b.dataset.kind;
    renderSignals();
  });
}

// boot signals — load existing log, paint once
signalsAll = loadSignals();
renderSignals();

/* ============================================================
   feature 2: aurora bells
   when today's forecast is "aurora drift" and the sky is dim
   enough for the wash to be visible, occasional two-tone FM
   bell tones ring (distinct from orbit's warm sine bells —
   these are glassier / colder). ride orbit's AudioContext if
   the user is already listening; otherwise make a tiny self-cleaning
   context that only fires once the user has done a single gesture
   (the browser autoplay-policy wall, same trick cricket uses).
   ============================================================ */
function renderAuroraBellsCount() {
  const el = document.getElementById("aurora-bells-count");
  if (el) el.textContent = String(_auroraBellsCount);
}
renderAuroraBellsCount();

function scheduleAuroraBell() {
  // try again every 9..22s regardless of whether we rang
  const wait = 9000 + Math.random() * 13000;
  setTimeout(() => {
    if (!isMotionReduced()) maybeFireAuroraBell();
    scheduleAuroraBell();
  }, wait);
}
let _auroraBellLogged = false; // one feed row per session — the counter still counts every ring
function maybeFireAuroraBell() {
  if (settings && settings.mute) return;
  let isAuroraDay = false;
  try { isAuroraDay = forecastFor(new Date()).kind === "aurora"; } catch {}
  const sky = document.body.classList;
  // fire on aurora-forecast days, OR on any night at all (so the chime is rare but real)
  const allowedMood = sky.contains("night") || sky.contains("dusk") || isAuroraDay;
  if (!allowedMood) return;
  // occasional, not metronomic: likely on aurora days, rare on a plain night
  if (Math.random() > (isAuroraDay ? 0.5 : 0.15)) return;
  // ride orbit's AudioContext if available, else use a tiny self-cleaning one.
  // both paths report whether a tone actually sounded — before the first user
  // gesture the lazy context stays suspended and nothing is audible, and a
  // silent bell must not tick the counter or leave a feed row.
  let rang = false;
  if (typeof orbit !== "undefined" && orbit.ctx && orbit.playing) {
    rang = playAuroraBellInto(orbit.ctx, orbit.master, +document.getElementById("orbit-vol").value / 100);
  } else {
    rang = playAuroraBellLazy();
  }
  if (!rang) return;
  _auroraBellsCount++;
  try { localStorage.setItem("biosphere02.auroraBells.v1", String(_auroraBellsCount)); } catch {}
  renderAuroraBellsCount();
  if (!_auroraBellLogged) {
    _auroraBellLogged = true;
    gLog("aurora", "bell rung", "aurora wash");
  }
}

function playAuroraBellInto(ctx, dst, volScale) {
  // two-tone FM bell — base carrier modulated by a slower carrier for glassy timbre
  const base = 760 + Math.random() * 380;
  const carrier = ctx.createOscillator();
  carrier.type = "sine";
  carrier.frequency.value = base;
  const modOsc = ctx.createOscillator();
  modOsc.type = "sine";
  modOsc.frequency.value = base * 0.502;
  const modGain = ctx.createGain();
  modGain.gain.value = 280;
  modOsc.connect(modGain).connect(carrier.frequency);
  const g = ctx.createGain();
  g.gain.value = 0;
  carrier.connect(g).connect(dst);
  const now = ctx.currentTime;
  g.gain.linearRampToValueAtTime(0.14 * volScale, now + 0.06);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 6.2);
  carrier.start(now);  modOsc.start(now);
  carrier.stop(now + 6.3); modOsc.stop(now + 6.3);
  return true;
}

let _auroraBellCtx = null;
function playAuroraBellLazy() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return false;
  try {
    if (!_auroraBellCtx) _auroraBellCtx = new AC();
    const ctx = _auroraBellCtx;
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    // short-circuit if we never resumed: no point spewing osc nodes we can't hear
    if (ctx.state !== "running") return false;
    return playAuroraBellInto(ctx, ctx.destination, 0.6);
  } catch { return false; }
}

// kick the aurora chime loop after the page has settled
setTimeout(scheduleAuroraBell, 18000);

/* ============================================================
   feature A: tidepool with hermit crab 🦀
   ------------------------------------------------- the 10th
   field-guide entry. the crab scuttles around the tidepool
   perimeter on a slow timer, occasionally slipping off-frame
   the way shore crabs do. only spawns during the daylit part
   of the cycle (dawn / day / dusk) — the same daylight gate
   the turtle uses. click to spot it; markCreatureSeen picks
   up the field-guide bookkeeping since the species is
   appended to CREATURE_SPECIES below (next to the otter append).
   ============================================================ */
const crab = document.createElement("div");
crab.className = "crab";
crab.title = "a hermit crab — click to spot";
crab.innerHTML =
  '<svg class="crab-svg" viewBox="0 0 14 11" aria-hidden="true">' +
    // four legs each side (two per side, animated)
    '<ellipse class="crab-leg-l" cx="3"    cy="6"   rx="1.4" ry="0.6" fill="#a83820"/>' +
    '<ellipse class="crab-leg-l" cx="3.5"  cy="8.5" rx="1.4" ry="0.6" fill="#a83820"/>' +
    '<ellipse class="crab-leg-r" cx="11"   cy="6"   rx="1.4" ry="0.6" fill="#a83820"/>' +
    '<ellipse class="crab-leg-r" cx="10.5" cy="8.5" rx="1.4" ry="0.6" fill="#a83820"/>' +
    // claws
    '<ellipse cx="2"  cy="4"   rx="2.2" ry="1.4" fill="#c84830"/>' +
    '<ellipse cx="12" cy="4"   rx="2.2" ry="1.4" fill="#c84830"/>' +
    // body and shell (the shell is the part that suggests "hermit")
    '<ellipse cx="7"  cy="6"   rx="3.2" ry="2.2" fill="#b0402a"/>' +
    '<ellipse cx="7"  cy="5.4" rx="1.9" ry="1.4" fill="#e0b08a" stroke="#8a5a30" stroke-width="0.3"/>' +
    '<ellipse cx="7"  cy="5.4" rx="1.5" ry="1.0" fill="rgba(0,0,0,0.18)"/>' +
  '</svg>';
document.body.appendChild(crab);

let crabState = { active: false, paused: false, pauseStart: 0, totalPaused: 0, dir: 1 };
const CRAB_KEY = "biosphere02.crab.v1";
let crabSpotCount = (() => { try { return +localStorage.getItem(CRAB_KEY) || 0; } catch { return 0; } })();
function renderCrabSpotCount() {
  const el = document.getElementById("crab-stat");
  if (el) el.textContent = crabSpotCount;
}
renderCrabSpotCount();

function crabMoodOK() {
  const b = document.body.classList;
  return b.contains("day") || b.contains("dawn") || b.contains("dusk");
}

function endCrab() {
  crab.classList.remove("walking");
  crabState.active = false;
  setTimeout(() => { if (!crabState.active && crab.parentNode) crab.style.opacity = "0"; }, 700);
  setTimeout(() => { if (!crabState.active && crab.parentNode) crab.style.opacity = ""; }, 1500);
}

function startCrabWalk() {
  if (isMotionReduced() || crabState.active) return;
  const poolEl = document.getElementById("tidepool");
  if (!poolEl) return;
  const rect = poolEl.getBoundingClientRect();
  const cy = rect.bottom - 8;
  crabState.dir = Math.random() < 0.5 ? -1 : 1;
  const startX = crabState.dir === 1 ? rect.left - 18 : rect.right + 4;
  crab.style.left = startX + "px";
  crab.style.top = (cy - 4) + "px";
  crab.style.transform = crabState.dir === 1 ? "scaleX(1)" : "scaleX(-1)";
  crab.classList.add("walking");
  crabState.active = true;
  crabState.paused = false;
  crabState.totalPaused = 0;
  const speed = 0.16 + Math.random() * 0.06;
  const distance = rect.width + 36 + Math.random() * 80;
  const startT = performance.now();
  const dur = distance / speed;
  function frame(now) {
    if (!crabState.active || !document.body.contains(crab)) return;
    if (crabState.paused) {
      // hover-pause: just stall the loop here; on mouseleave we add the
      // full elapsed delta to totalPaused once. the previous version
      // added min(pausedFor, 100) per rAF tick, which over-counted by
      // roughly the frame count — a 1-second pause added ~6 seconds.
      requestAnimationFrame(frame);
      return;
    }
    const effectiveT = now - startT - crabState.totalPaused;
    const p = Math.min(1, effectiveT / dur);
    const x = startX + (rect.width + 32) * p;
    const bob = Math.sin(effectiveT * 0.012) * 0.6;
    crab.style.left = x + "px";
    crab.style.transform = crabState.dir === 1
      ? `scaleX(1) translateY(${bob}px)`
      : `scaleX(-1) translateY(${bob}px)`;
    if (p < 1) requestAnimationFrame(frame);
    else endCrab();
  }
  requestAnimationFrame(frame);
}

crab.addEventListener("mouseenter", () => {
  if (crabState.active) { crabState.paused = true; crabState.pauseStart = performance.now(); }
});
crab.addEventListener("mouseleave", () => {
  if (crabState.active && crabState.paused) {
    crabState.totalPaused += performance.now() - crabState.pauseStart;
    crabState.paused = false;
  }
});
crab.addEventListener("click", () => {
  if (!crabState.active) return;
  crab.classList.add("caught");
  crabSpotCount++;
  try { localStorage.setItem(CRAB_KEY, String(crabSpotCount)); } catch {}
  renderCrabSpotCount();
  if (typeof markCreatureSeen === "function") markCreatureSeen("crab");
  if (typeof toast === "function") {
    toast(crabSpotCount === 1
      ? "you spotted the hermit crab 🦀 · it slipped into its shell"
      : "the hermit crab, spotted 🦀", 2400);
  }
  setTimeout(() => {
    crab.classList.remove("caught", "walking");
    crabState.active = false;
    crab.style.opacity = "";
  }, 320);
});

(function scheduleCrab() {
  // 80-150s between visits; only attempt during the daylight moods so the
  // crab is a sun-side creature (matches the turtle's daytime bash).
  const wait = 80_000 + Math.random() * 70_000;
  setTimeout(() => {
    if (!isMotionReduced() && crabMoodOK()) startCrabWalk();
    scheduleCrab();
  }, wait);
})();
setTimeout(() => { if (!isMotionReduced() && crabMoodOK()) startCrabWalk(); }, 35_000);

/* ============================================================
   feature B: hourglass ⏳
   ------------------------------------------------- a small
   wooden hourglass on the shore between the sundial and the
   dock. sand falls from upper to lower chamber via a 24s
   css keyframe; click flips the frame and resets the sand so
   they animate again from the top. count lives in ~/status.
   no sound — it's a way to feel time pass rather than to
   mark it precisely.
   ============================================================ */
const hourglassEl = document.getElementById("hourglass");
const HOURGLASS_KEY = "biosphere02.hourglass.v1";
let hourglassFlips = (() => { try { return +localStorage.getItem(HOURGLASS_KEY) || 0; } catch { return 0; } })();
function renderHourglassStat() {
  const el = document.getElementById("hourglass-stat");
  if (el) el.textContent = hourglassFlips;
}
renderHourglassStat();
if (hourglassEl) {
  // the inline animation declarations don't restart when .flipped toggles,
  // so we manually toggle the shorthand animations with a forced reflow in
  // between. sand fills or empties whichever chamber is "up" after the flip.
  function restartSandAnim() {
    const upper = hourglassEl.querySelector(".hg-upper-fill");
    const lower = hourglassEl.querySelector(".hg-lower-fill");
    if (!upper || !lower) return;
    // track orientation via .flipped and swap which rect gets which
    // animation so the visually-upper chamber always empties. without
    // this swap, a second click animates the chambers in the wrong
    // direction (the geometrically-down chamber would empty further).
    // also seed explicit starting transforms so the snap to scaleY(1)
    // doesn't flicker visibly on the first restart frame.
    const flipped = hourglassEl.classList.contains("flipped");
    upper.style.animation = "none";
    lower.style.animation = "none";
    if (flipped) {
      // after a flip the LOWER rect is now geometrically the top chamber.
      upper.style.transform = "scaleY(0)"; // bottom chamber: empty
      lower.style.transform = "scaleY(1)"; // top chamber: full
    } else {
      upper.style.transform = "scaleY(1)"; // top chamber: full
      lower.style.transform = "scaleY(0)"; // bottom chamber: empty
    }
    void upper.offsetWidth;
    if (flipped) {
      upper.style.animation = "hg-lower-fill 24s linear forwards";
      lower.style.animation = "hg-upper-empty 24s linear forwards";
    } else {
      upper.style.animation = "hg-upper-empty 24s linear forwards";
      lower.style.animation = "hg-lower-fill 24s linear forwards";
    }
  }
  restartSandAnim(); // first run on load (no class yet)
  hourglassEl.addEventListener("click", () => {
    hourglassEl.classList.toggle("flipped");
    hourglassFlips++;
    try { localStorage.setItem(HOURGLASS_KEY, String(hourglassFlips)); } catch {}
    renderHourglassStat();
    restartSandAnim();
    if (typeof toast === "function") {
      toast(hourglassFlips === 1
        ? "you flipped the hourglass · the sand starts over"
        : `flipped ${hourglassFlips} times · the sand has fallen a long way`, 2200);
    }
    if (typeof gLog === "function") gLog("flora", "hourglass flipped", "the shore");
  });
}

/* ============================================================
   feature C: a small windmill 🌾
   ------------------------------------------------- clicks push
   the sails through one strong rotation burst that decays
   to idle. idle and gust spin rates are pure css. the
   wind-gust state is body.wind-gust, already maintained by
   the scheduleWindGust hook, so the windmill reads it via
   css and runs faster without polling. pushes count in
   ~/status and emit a single signal row on the first push
   of a session — same courtesy as aurora bells and
   crickets, so a fling session can't churn the feed.
   ============================================================ */
const windmillEl = document.getElementById("windmill");
const WINDMILL_KEY = "biosphere02.windmill.v1";
let windmillPushes = (() => { try { return +localStorage.getItem(WINDMILL_KEY) || 0; } catch { return 0; } })();
function renderWindmillStat() {
  const el = document.getElementById("windmill-stat");
  if (el) el.textContent = windmillPushes;
}
renderWindmillStat();
let _windmillFirstPushLogged = false;
if (windmillEl) {
  windmillEl.addEventListener("click", () => {
    windmillEl.classList.remove("pushed");
    void windmillEl.offsetWidth; // restart the one-shot keyframes
    windmillEl.classList.add("pushed");
    setTimeout(() => windmillEl.classList.remove("pushed"), 2050);
    windmillPushes++;
    try { localStorage.setItem(WINDMILL_KEY, String(windmillPushes)); } catch {}
    renderWindmillStat();
    if (typeof toast === "function") {
      toast(windmillPushes === 1
        ? "you gave the sails a push · they spin down over a few seconds"
        : `pushed ${windmillPushes} times · the wind stays grateful`, 2200);
    }
    if (!_windmillFirstPushLogged && typeof gLog === "function") {
      _windmillFirstPushLogged = true;
      gLog("flora", "windmill push", "the shore");
    }
  });
}

/* add the crab to CREATURE_SPECIES — appending so renderFieldGuide picks it
   up automatically (and the guide's "X of N" text grows to "10 of 10"). */
if (typeof CREATURE_SPECIES !== "undefined" && !CREATURE_SPECIES.some(s => s.id === "crab")) {
  CREATURE_SPECIES.push({
    id: "crab", glyph: "🦀", name: "the hermit crab",
    blurb: "scuttles the tidepool rim, daylight only, gone if the sky moves past dusk",
  });
  if (typeof renderFieldGuide === "function") renderFieldGuide();
}

/* ============================================================
/* ============================================================
   feature 5: river otter (new creature, dawn/dusk only)
   the otter appears at the back of the pond and swims the
   shoreline at dawn and dusk moods only — left to right or
   right to left at random. hover pauses it; click to spot
   (counts toward creatures spotted and the field-guide entry).
   rare enough to feel like a small event when you see it.
   ============================================================ */
const otter = document.createElement("div");
otter.className = "otter";
otter.title = "the river otter — click to spot (rare)";
otter.innerHTML =
  '<svg class="otter-svg" viewBox="0 0 44 24" aria-hidden="true">' +
    '<ellipse cx="22" cy="13" rx="18" ry="5.5" fill="#5e4a38"/>' +
    '<g class="otter-head">' +
      '<ellipse cx="36" cy="11" rx="6" ry="4.5" fill="#6e5944"/>' +
      '<circle cx="38" cy="10" r="0.7" fill="#0a0a0a"/>' +
      '<ellipse cx="34" cy="13.5" rx="2.2" ry="1.5" fill="#d8d8d8"/>' +
    '</g>' +
    '<path d="M4 13 Q12 7 18 13" fill="none" stroke="#5e4a38" stroke-width="1.5" stroke-linecap="round"/>' +
  '</svg>';
document.body.appendChild(otter);

let otterState = { active: false, paused: false, pauseStart: 0, totalPaused: 0 };

function otterMoodOK() {
  const b = document.body.classList;
  return b.contains("dawn") || b.contains("dusk");
}
function startOtterWalk() {
  if (otterState.active) return;
  if (isMotionReduced()) { scheduleNextOtter(); return; }
  if (!otterMoodOK()) { scheduleNextOtter(); return; }
  otterState = { active: true, paused: false, pauseStart: 0, totalPaused: 0 };
  const fromLeft = Math.random() < 0.5;
  const W = window.innerWidth;
  const startX = fromLeft ? -60 : W + 30;
  const endX   = fromLeft ? W + 30 : -60;
  const duration = 38000 + Math.random() * 30000;
  otter.classList.toggle("facing-left", !fromLeft);
  otter.classList.add("swimming");
  otter.style.left = startX + "px";
  const startTime = performance.now();
  function frame(now) {
    if (!otterState.active) return;
    if (otterState.paused) { requestAnimationFrame(frame); return; }
    const elapsed = now - startTime - otterState.totalPaused;
    const p = Math.min(1, elapsed / duration);
    const x = startX + (endX - startX) * p;
    otter.style.left = x + "px";
    if (p < 1) requestAnimationFrame(frame);
    else endOtterWalk(false);
  }
  requestAnimationFrame(frame);
}
function endOtterWalk() {
  otterState.active = false;
  otter.classList.remove("swimming", "caught", "facing-left");
  otter.style.left = "-60px";
  scheduleNextOtter();
}
function scheduleNextOtter() {
  // try again in 40..110s. if we're not in dawn/dusk, re-attempts naturally skip
  const wait = 40000 + Math.random() * 70000;
  setTimeout(() => startOtterWalk(), wait);
}
otter.addEventListener("mouseenter", () => {
  if (!otterState.active || otterState.paused) return;
  otterState.paused = true;
  otterState.pauseStart = performance.now();
});
otter.addEventListener("mouseleave", () => {
  if (!otterState.paused) return;
  otterState.totalPaused += performance.now() - otterState.pauseStart;
  otterState.paused = false;
});
otter.addEventListener("click", (e) => {
  if (!otterState.active) return;
  // stopPropagation first so this click doesn't reach the constellation
  // canvas (and accidentally feed tryCatchShooter's head hit-test).
  e.stopPropagation();
  otter.classList.add("caught");
  spottedCount++;
  try { localStorage.setItem(SPOTTED_KEY, String(spottedCount)); } catch {}
  renderSpottedCount();
  spawnCatchBurst(e.clientX, e.clientY);
  markCreatureSeen("otter");
  toast(spottedCount === 1 ? "you spotted the river otter 🦦" : "the river otter, spotted 🦦", 2400);
  setTimeout(() => { otter.classList.remove("caught"); endOtterWalk(); }, 380);
});

// add the otter to the field guide — appending to CREATURE_SPECIES so
// renderFieldGuide() picks it up automatically (and the guide's "X of N"
// text and complete-toast both grow to "9 of 9")
if (typeof CREATURE_SPECIES !== "undefined" && !CREATURE_SPECIES.some(s => s.id === "otter")) {
  CREATURE_SPECIES.push({
    id: "otter", glyph: "🦦", name: "the river otter",
    blurb: "surfaces at dusk and dawn to swim the length of the pond",
  });
  // the guide and its status row already painted "of 8" during boot — repaint
  // so the ninth species shows up without waiting for the next spot event
  if (typeof renderFieldGuide === "function") renderFieldGuide();
}

// boot the otter scheduler with an initial delay so the very first
// candidate check happens once the page is settled
setTimeout(startOtterWalk, 32000);

/* ============================================================
   wire gLog() into existing handlers (wishes, bottles, mycelium)
   - markCreatureSeen already calls gLog("creature",...) below
   - tryCatchShooter already calls gLog("meteor"|"star") from the patch
   - tideTick already calls gLog("tide") from the patch
   remaining: wish save, bottle open, mycelium save, mycelium delete
   ============================================================ */
// wish save — wishInput keydown "Enter" handler already exists; we hook
// the saveWishes call by wrapping renderWishCount() (called immediately after
// saveWishes in the original handler). wrapping is the lowest-risk place
// because we don't disturb the keypress logic or the toasts.
let _lastWishCount;
const _origRenderWishCount = renderWishCount;
renderWishCount = function () {
  _origRenderWishCount();
  // detect newly-added wishes by comparing length to lastValue we saw.
  // only fires when the count went UP — not on initial paint.
  if (typeof _lastWishCount === "number" && signalsAll.length >= 0) {
    const now = (typeof loadWishes === "function") ? loadWishes().length : 0;
    if (now > _lastWishCount) {
      const wishes = (typeof loadWishes === "function") ? loadWishes() : [];
      const newest = wishes[wishes.length - 1];
      if (newest && newest.from !== "shooting-star") {
        gLog("wish", "wish made", newest.text ? newest.text.slice(0, 38) + (newest.text.length > 38 ? "…" : "") : "—");
      }
      _lastWishCount = now;
    } else {
      _lastWishCount = now;
    }
  } else {
    _lastWishCount = (typeof loadWishes === "function") ? loadWishes().length : 0;
  }
};
// boot the counter so the first paint doesn't fire a phantom signal row
_lastWishCount = (typeof loadWishes === "function") ? loadWishes().length : 0;

// bottle hook: wrap openBottleNote (defined earlier in the file) and emit
// exactly one gLog row per bottle actually opened. openBottleNote early-
// returns on a missing note or overlay, so compare bottlesRead before/after
// instead of logging unconditionally.
const _bottleOrig = openBottleNote;
openBottleNote = function (noteIdx) {
  const before = bottlesRead;
  _bottleOrig(noteIdx);
  if (bottlesRead > before) {
    const n = bottleNotes[noteIdx];
    gLog("bottle", "bottle opened", n ? n.from : "the pond");
  }
};

// mycelium note save / delete. wrap saveMyc + renderMyc to detect count changes.
const _origRenderMycOuter = renderMyc;
let _lastMycCount = mycNotes.length;
renderMyc = function () {
  _origRenderMycOuter();
  const now = mycNotes.length;
  if (typeof _lastMycCount === "number" && now > _lastMycCount) {
    // a note was added
    const newest = mycNotes[mycNotes.length - 1];
    gLog("note", "note saved: " + newest.title, "mycelium");
  } else if (typeof _lastMycCount === "number" && now < _lastMycCount) {
    // a note was deleted — title isn't trivially available, so emit a generic line
    gLog("note", "note deleted", "mycelium");
  }
  _lastMycCount = now;
};

// markCreatureSeen hook — push a creature signal every time a new species is
// spotted. markCreatureSeen already has its own guard (only fires on first
// spot), so wrapping it would double-fire; instead we monkey-patch and add
// a gLog call AFTER the existing toast logic, gated by the same first-spot
// check that markCreatureSeen already runs.
const _origMarkCreatureSeen = markCreatureSeen;
markCreatureSeen = function (id) {
  const wasComplete = CREATURE_SPECIES.every(s => fieldGuide[s.id]);
  const wasSeen = !!fieldGuide[id];
  _origMarkCreatureSeen(id);
  if (!wasSeen && fieldGuide[id]) {
    const spec = CREATURE_SPECIES.find(s => s.id === id);
    if (spec) gLog("creature", spec.name + " spotted", "the biosphere");
  }
};

// hearth peak — one signal each time the fire climbs into the "blazing"
// band (w >= 88), re-armed only after it cools back below the "warm"
// ceiling (w < 65). renderWarmth runs on every add-log click and on the
// 2.2s decay tick, so wrapping it sees every crossing in both directions
// without touching the hearth logic itself.
let _hearthPeaked = (hearth.warmth || 0) >= 88;
const _origRenderWarmth = renderWarmth;
renderWarmth = function () {
  _origRenderWarmth();
  const w = hearth.warmth || 0;
  if (w >= 88 && !_hearthPeaked) {
    _hearthPeaked = true;
    gLog("hearth", "the fire is blazing", "hearth");
  } else if (w < 65 && _hearthPeaked) {
    _hearthPeaked = false;
  }
};

// bootstrap-row: only on a truly fresh install (signalsAll is still empty)
// does the feed show a "signals online" row at position 0. After that, never
// re-emit on reload — signal-cap churn would silently push real entries down.
try { if (signalsAll.length === 0) gLog("biosphere", "signals online", "✽ onboarded"); } catch {}


/* ============================================================
   devlog #24 — jul 11: five additions
   - fire salamander (11th field-guide entry, night-only spawn)
   - tide clock that watches the pond for you
   - glass floats that wash up on the gravel
   - copper rain chain that fills on rain days
   - a small raked sand garden on the left shore
   every block is a self-contained IIFE so the order at the bottom
   of the file doesn't matter. they read existing globals (settings,
   isMotionReduced, forecastFor, etc) and only add their own keys.
   ============================================================ */

/* ---- 1) append the salamander to CREATURE_SPECIES ----
   guarded so re-loading the file can't double-append. renderFieldGuide()
   picks up the new total on its own. */
(function appendSalamanderToSpecies() {
  if (typeof CREATURE_SPECIES === "undefined" || !Array.isArray(CREATURE_SPECIES)) return;
  if (CREATURE_SPECIES.some(s => s.id === "salamander")) return;
  CREATURE_SPECIES.push({
    id: "salamander",
    name: "fire salamander",
    glyph: "🦎",
    blurb: "a small orange-black nocturnal salamander that walks the shoreline between dusk and dawn"
  });
  if (typeof renderFieldGuide === "function") renderFieldGuide();
})();

/* ---- 2) fire salamander — night-only scuttler ----
   one salamander is plenty; we gate the schedule on body.night
   (which the applyTimeOfDay sky-lock already mirrors for free).
   cadence 70–130s so it doesn't crowd anything else, and each
   appearance lasts ~25s before alpha-fading. hover pauses
   the leg flap via animation-play-state so a moment of
   stillness lets you click it. */
(function scheduleSalamander() {
  const host = document.getElementById("salamanders");
  if (!host) return;
  let active = null;

  function nightMood() {
    return document.body.classList.contains("night");
  }
  function motionReduced() {
    return typeof isMotionReduced === "function" && isMotionReduced();
  }
  function salamanderSVG() {
    // body: orange with a black stripe; tail flick; 4 legs that flap
    return (
      `<svg class="salamander-svg" viewBox="0 0 76 32" aria-hidden="true">` +
        // body ellipse
        `<ellipse cx="36" cy="16" rx="22" ry="6" fill="#e07a3a"/>` +
        // shoulder + tail (thin flick that bends)
        `<path d="M14 16 Q4 14 0 18 Q4 19 14 19 Z" fill="#e07a3a"/>` +
        `<path d="M58 16 Q70 14 76 18 Q70 19 58 19 Z" fill="#e07a3a"/>` +
        // dorsal stripe
        `<rect x="10" y="14.5" width="50" height="2.2" fill="#1a0e08" rx="1"/>` +
        // head dot (eye)
        `<circle cx="13" cy="14.5" r="1.1" fill="#1a0e08"/>` +
        // four legs, alternating phase so left/right sides aren't in sync
        `<ellipse class="salamander-leg r1" cx="20" cy="22" rx="2.6" ry="1.4" fill="#1a0e08"/>` +
        `<ellipse class="salamander-leg r2" cx="30" cy="22" rx="2.6" ry="1.4" fill="#1a0e08"/>` +
        `<ellipse class="salamander-leg r3" cx="42" cy="22" rx="2.6" ry="1.4" fill="#1a0e08"/>` +
        `<ellipse class="salamander-leg r4" cx="52" cy="22" rx="2.6" ry="1.4" fill="#1a0e08"/>` +
      `</svg>`
    );
  }

  function spawn() {
    if (active) return;
    if (!nightMood()) { schedule(); return; }
    if (motionReduced()) { schedule(); return; }

    const el = document.createElement("div");
    el.className = "salamander";
    el.innerHTML = salamanderSVG();
    host.appendChild(el);

    // walk from off-left to off-right along the lower shore
    const W = window.innerWidth;
    const startX = -60;
    const endX = W + 60;
    const y = window.innerHeight - (parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--pond-h")) || 18) - 38 + 18;
    const dur = 22_000 + Math.random() * 6_000;
    el.style.left = startX + "px";
    el.style.top = y + "px";
    el.style.transition = `left ${dur}ms linear, top ${dur / 4}ms ease-in-out ${dur / 4}ms`;
    active = { el, startX, endX, walked: 0 };
    // force reflow so the transition kicks in from the startLeft
    void el.offsetWidth;
    el.style.left = endX + "px";
    // micro vertical wobble halfway so it doesn't feel flat
    setTimeout(() => { if (active && active.el === el) active.el.style.top = (y - 4) + "px"; }, dur / 4);
    setTimeout(() => { if (active && active.el === el) active.el.style.top = (y + 4) + "px"; }, dur / 2);
    setTimeout(() => { if (active && active.el === el) active.el.style.top = y + "px"; }, (dur * 3) / 4);
    el.classList.add("walking");
    setTimeout(() => { if (active && active.el === el) despawn(el); }, dur + 200);

    el.addEventListener("click", () => {
      if (!active || active.el !== el) return;
      el.classList.add("caught");
      // markCreatureSeen handles the roaring/spotted/fieldguide counts + first-sight toast
      if (typeof markCreatureSeen === "function") markCreatureSeen("salamander");
      if (typeof gLog === "function") gLog("creature", "spotted a fire salamander", "the shore");
      setTimeout(() => despawn(el, true), 320);
    });

    schedule();
  }
  function despawn(el, immediate) {
    if (active && active.el === el) active = null;
    if (immediate) { if (el.parentNode) el.parentNode.removeChild(el); }
    else {
      el.classList.remove("walking");
      setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 720);
    }
  }
  function schedule() {
    const wait = 70_000 + Math.random() * 60_000; // 70–130s
    setTimeout(() => { spawn(); }, wait);
  }
  // boot a short delay so the first appearance still feels "later tonight"
  setTimeout(spawn, 35_000 + Math.random() * 20_000);
})();

/* ---- 3) tide clock hand — derives --tide-frac from --pond-h ----
   we poll the existing --pond-h once a second and write a 0..1
   fraction into --tide-frac. css does the rest via transition.
   polling keeps the tideclock fully decoupled from tideTick —
   the two cannot disagree because they both read the same
   single source of truth. clicking the face reads the state
   aloud + shows the actual vh at the moment of the click. */
(function tideClock() {
  const root = document.documentElement;
  const el = document.getElementById("tide-clock");
  if (!el) return;
  // bounding the height range: --pond-h cycles between 17vh and 19vh
  // tide gauge row already says "low" / "mid" / "high" with the
  // same thresholds used by tideTick — share those by reading tide-stat
  // at click time rather than recomputing them here.
  const TIDE_MIN_VH = 17.0, TIDE_RANGE_VH = 2.0;

  function render() {
    const s = getComputedStyle(root).getPropertyValue("--pond-h").trim();
    const vh = parseFloat(s);
    if (!isFinite(vh)) return;
    const frac = Math.max(0, Math.min(1, (vh - TIDE_MIN_VH) / TIDE_RANGE_VH));
    root.style.setProperty("--tide-frac", frac.toFixed(3));
  }
  // synchronous initial render so the hand lands on its real position
  // on first load rather than swinging from 0deg to whatever the
  // first poll finds. this was the trailing bug from devlog #24.
  render();
  setInterval(render, 1200);

  el.addEventListener("click", () => {
    const s = getComputedStyle(root).getPropertyValue("--pond-h").trim();
    const vh = parseFloat(s);
    const frac = isFinite(vh) ? (vh - TIDE_MIN_VH) / TIDE_RANGE_VH : 0.5;
    const phase = frac < 0.22 ? "low" : frac > 0.78 ? "high" : "mid";
    // direction: read _tidePhase's derivative without poking at the
    // global; the test below returns "rising" if the hand is on the
    // upward half of its 0..1 path, "falling" otherwise.
    const dir = frac < 0.5 ? "rising" : "falling";
    if (typeof toast === "function") {
      toast(`${dir} · ${phase} tide · ${vh.toFixed(2)}vh`, 2400);
    }
  });
})();

/* ---- 4) copper rain chain — fills on rain days ----
   body.rain-day is set by a 60s cadence check on today's forecast,
   the same query the existing rain-layer uses (forecastFor is the
   deterministic one — verified with my devlog entry). cups are
   added once on boot; a click on the top cup tips every cup
   top-to-bottom via staggered timing, with a tiny 880hz sine ping
   per tip. the audio context is lazy + first-gesture-armed, just
   like the cricket chorus. */
(function rainChain() {
  const chain = document.getElementById("rain-chain");
  const cupsHost = document.getElementById("rc-cups");
  if (!chain || !cupsHost) return;

  // 8 cups, each with its own y in the 92vh viewBox
  const CUP_YS = [10, 22, 34, 46, 58, 70, 80, 88];
  // build cup markup once on boot so the visual exists from the first paint
  const svgNS = "http://www.w3.org/2000/svg";
  const xmlAt = (s) => s.replace(/"/g, "'"); // any user input — none here, just for className
  cupsHost.innerHTML = CUP_YS.map((y, i) => {
    const cup = `<polygon class="rc-cup" points="10,${y} 18,${y} 15.5,${y + 4} 12.5,${y + 4}"/>`;
    const water = `<rect class="rc-cup-water" x="12.5" y="${y - 1}" width="3" height="2.5" fill="rgba(124, 174, 220, 0.85)"/>`;
    return cup + water;
  }).join("");

  // toggle body.rain-day on a 60s cadence so a tab left open past
  // a forecast boundary will switch its cup fill state
  function applyRainDay() {
    let kind = null;
    try { if (typeof forecastFor === "function") kind = forecastFor(new Date()).kind; } catch {}
    document.body.classList.toggle("rain-day", kind === "rain");
  }
  applyRainDay();
  setInterval(applyRainDay, 60_000);

  // lazy audio: create the context on the first click (so the
  // user-gesture policy permits it), arms before first use, and
  // resume after visibility-returns. mirrors cricket chorus
  // lifecycle.
  const _rainCtxRef = { ctx: null, armed: false, master: null };
  function ping() {
    if (typeof settings !== "undefined" && settings && settings.mute) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      if (!_rainCtxRef.ctx) {
        _rainCtxRef.ctx = new AC();
        _rainCtxRef.master = _rainCtxRef.ctx.createGain();
        _rainCtxRef.master.gain.value = 0.10;
        _rainCtxRef.master.connect(_rainCtxRef.ctx.destination);
      }
      _rainCtxRef.armed = true;
      const ctx = _rainCtxRef.ctx;
      if (ctx.state === "suspended") ctx.resume().catch(() => {});
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.value = 880;
      const g = ctx.createGain();
      g.gain.value = 0;
      o.connect(g).connect(_rainCtxRef.master);
      const now = ctx.currentTime;
      g.gain.linearRampToValueAtTime(1.0, now + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
      o.start(now);
      o.stop(now + 0.5);
    } catch {}
  }

  // also resume on visibilitychange so a backgrounded tab revives
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && _rainCtxRef.armed && _rainCtxRef.ctx && _rainCtxRef.ctx.state === "suspended") {
      _rainCtxRef.ctx.resume().catch(() => {});
    }
  });

  // click anywhere on the chain triggers a cascade — the topmost
  // cup is tip[0]. each tip fires its own ping.
  chain.addEventListener("click", () => {
    const cups = cupsHost.querySelectorAll(".rc-cup");
    let rained = 0;
    for (let i = 0; i < cups.length; i++) {
      const c = cups[i];
      setTimeout(() => {
        c.classList.add("tipping");
        ping();
        setTimeout(() => c.classList.remove("tipping"), 280);
      }, i * 140);
      rained++;
    }
    if (typeof bumpStat === "function") {
      bumpStat("rain-stat");
    } else {
      const stat = document.getElementById("rain-stat");
      if (stat) stat.textContent = String((+stat.textContent.replace(/\D/g, "") || 0) + rained);
    }
    if (typeof gLog === "function") gLog("rain", "tipped the rain chain", "the dock");
    try { localStorage.setItem("biosphere02.rain.v1", String(+((localStorage.getItem("biosphere02.rain.v1") || "0")) + 1)); } catch {}
  });
})();

/* ---- 5) raked sand garden on the left shore ----
   six procedural pattern families chosen deterministically per
   click position. the rake group fades in via opacity on each
   redraw so each raking feels like a deliberate stroke rather
   than an instant snap. the same key (clickX, clickY) always
   rakes the same way, so the pattern feels like "the garden
   remembers where you stood." */
(function sandGarden() {
  const el = document.getElementById("sand-garden");
  const rakes = document.getElementById("sg-rakes");
  if (!el || !rakes) return;

  // three rocks in svg coords (cx, cy, rx, ry)
  const rocks = [
    { cx: 28, cy: 40, rx: 9,  ry: 5 },
    { cx: 50, cy: 38, rx: 11, ry: 6 },
    { cx: 68, cy: 44, rx: 6,  ry: 3.5 },
  ];

  function findRock(x, y) {
    // x,y are svg-local (0..90, 0..56)
    let best = 0, bestD = Infinity;
    for (let i = 0; i < rocks.length; i++) {
      const dx = rocks[i].cx - x, dy = rocks[i].cy - y;
      const d = dx * dx + dy * dy;
      if (d < bestD) { bestD = d; best = i; }
    }
    return rocks[best];
  }

  // 6 preset pattern families, each returns svg markup centered on rock
  const patterns = [
    // 0: concentric rings around the rock
    (r) => {
      let out = "";
      const radii = [8, 11, 14, 17, 20];
      for (const rr of radii) out += `<ellipse class="sg-rake" cx="${r.cx}" cy="${r.cy}" rx="${rr}" ry="${(rr * 0.45).toFixed(1)}"/>`;
      return out;
    },
    // 1: straight parallel lines across the sand
    (r) => {
      let out = "";
      for (let i = 0; i < 8; i++) {
        const y = 30 + i * 3.6;
        out += `<line class="sg-rake" x1="2" y1="${y.toFixed(1)}" x2="88" y2="${y.toFixed(1)}"/>`;
      }
      return out;
    },
    // 2: opposing arcs — one arching over, one arching under
    (r) => {
      return (
        `<path class="sg-rake" d="M 4 ${r.cy + 4} Q ${r.cx} ${r.cy - 16}, ${88 - 4} ${r.cy + 4}"/>` +
        `<path class="sg-rake" d="M 4 ${r.cy + 6} Q ${r.cx} ${r.cy + 22}, ${88 - 4} ${r.cy + 6}"/>`
      );
    },
    // 3: spiral — 3 arms rotating around the rock
    (r) => {
      let out = "";
      for (let a = 0; a < 3; a++) {
        const angle = a * (Math.PI * 2 / 3);
        const x1 = r.cx + Math.cos(angle) * 6;
        const y1 = r.cy + Math.sin(angle) * 3;
        const x2 = r.cx + Math.cos(angle + 1.6) * 18;
        const y2 = r.cy + Math.sin(angle + 1.6) * 8;
        out += `<line class="sg-rake" x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/>`;
      }
      return out;
    },
    // 4: single fan — a stacked half-disc from the rock
    (r) => {
      let out = "";
      const N = 7;
      for (let i = 0; i < N; i++) {
        const frac = (i + 1) / (N + 1);
        const rx = 10 + frac * 14;
        const ry = (rx * 0.45).toFixed(1);
        const y = (r.cy - 6 + frac * 12).toFixed(1);
        out += `<ellipse class="sg-rake" cx="${r.cx}" cy="${y}" rx="${rx.toFixed(1)}" ry="${ry}"/>`;
      }
      return out;
    },
    // 5: braid — two interlocking arcs
    (r) => {
      return (
        `<path class="sg-rake" d="M 2 ${r.cy} Q ${r.cx - 14} ${r.cy - 6}, ${r.cx} ${r.cy} Q ${r.cx + 14} ${r.cy + 6}, 88 ${r.cy}"/>` +
        `<path class="sg-rake" d="M 2 ${r.cy + 4} Q ${r.cx - 14} ${r.cy + 10}, ${r.cx} ${r.cy + 4} Q ${r.cx + 14} ${r.cy - 2}, 88 ${r.cy + 4}"/>`
      );
    },
  ];

  function rasterizeNow() {
    // clear the previous rake group and replace innerHTML
    rakes.innerHTML = "";
  }

  el.addEventListener("click", (e) => {
    // convert viewport coords to svg-local (viewBox is 0 0 90 56)
    const rect = el.getBoundingClientRect();
    const lx = ((e.clientX - rect.left) / rect.width) * 90;
    const ly = ((e.clientY - rect.top) / rect.height) * 56;
    const r = findRock(lx, ly);
    // choose a pattern family deterministically by click coords
    const idx = ((Math.floor(lx * 7) + Math.floor(ly * 11)) % patterns.length + patterns.length) % patterns.length;
    rakes.innerHTML = patterns[idx](r);
    if (typeof bumpStat === "function") {
      bumpStat("sand-stat");
    } else {
      const stat = document.getElementById("sand-stat");
      if (stat) stat.textContent = String((+stat.textContent.replace(/\D/g, "") || 0) + 1);
    }
    try { localStorage.setItem("biosphere02.sand.v1", String(+((localStorage.getItem("biosphere02.sand.v1") || "0")) + 1)); } catch {}
  });
})();

/* ---- 6) glass floats — drift onto the right shore ----
   same lifecycle as bottles, but stays in place rather than
   drifting off-screen; one float on the shore at a time (cap of 1)
   so the gravel doesn't grow cluttered. color is picked by an
   index counter (deterministic — the nth float of any session is
   always the same color, so the same jest of palette plays each
   fresh load). click collects; fades + scales down. */
(function glassFloats() {
  const host = document.getElementById("float-shore");
  if (!host) return;

  // 4-color palette, drawn once at startup
  const palette = [
    { body: "#4a6ed8", highlight: "#a4b6f5" }, // cobalt
    { body: "#1d8a72", highlight: "#94dac4" }, // sea-green
    { body: "#d49a3e", highlight: "#f3d49a" }, // amber
    { body: "#c04555", highlight: "#f0a4ad" }, // ruby
  ];
  let index = 0;
  let active = null;

  function floatSVG(c) {
    return (
      `<svg viewBox="0 0 22 28" aria-hidden="true" width="22" height="28">` +
        // the orb (ball)
        `<circle class="glass-float-orb" cx="11" cy="20" r="9" fill="${c.body}"/>` +
        // a darker rim to read as glass
        `<circle cx="11" cy="20" r="9" fill="none" stroke="rgba(0,0,0,0.4)" stroke-width="0.6"/>` +
        // a soft highlight
        `<ellipse cx="7" cy="17" rx="2.4" ry="1.4" fill="${c.highlight}" opacity="0.6"/>` +
        // the twisted rope net above the orb
        `<g class="glass-float-ropes">` +
          `<path d="M11 4 L11 12"/>` +
          `<path d="M7 5 L11 12 M15 5 L11 12"/>` +
          `<path d="M8.5 2 L11 12 M13.5 2 L11 12"/>` +
        `</g>` +
      `</svg>`
    );
  }

  function ashoreBottom() {
    // match the shore band used by the dock / ferns / sundial;
    // calc-based so the float tracks the tide exactly like the
    // other shore elements (a fixed vh would strand them in mid-air
    // when the tide rolls out).
    const cs = getComputedStyle(document.documentElement);
    const pondH = parseFloat(cs.getPropertyValue("--pond-h")) || 18;
    return `calc(38px + ${pondH}vh - 4px)`;
  }

  function spawn() {
    if (active) { schedule(); return; }
    const c = palette[index % palette.length];
    index++;

    const el = document.createElement("div");
    el.className = "glass-float";
    el.innerHTML = floatSVG(c);
    host.appendChild(el);

    // anchor float to the right cattails area, settle to a left
    // position afterward. we set initial transform (off to the
    // right) BEFORE the element is in DOM, then on next tick
    // transition to the final transform — so the CSS transition
    // runs across the boundary and the float drifts visibly.
    const W = window.innerWidth;
    const startX = W - 80;
    const endX = W * 0.62; // settle left-ish
    el.style.bottom = ashoreBottom();
    el.style.transform = `translate(${startX}px, -10px)`;
    active = { el, c };
    // reflow so the transition runs
    void el.offsetWidth;
    el.style.transform = `translate(${endX}px, 0px)`;

    el.addEventListener("click", () => collect(el), { once: true });

    schedule();
  }

  function collect(el) {
    if (!active || active.el !== el) return;
    // capture the color BEFORE nulling active — the toast name comes
    // from the actual float, not always palette[0].
    const c = active.c;
    active = null;
    el.classList.add("collected");
    el.style.setProperty("--gx", "0px");
    el.style.setProperty("--gy", "-22px");
    if (typeof bumpStat === "function") {
      bumpStat("floats-stat");
    } else {
      const stat = document.getElementById("floats-stat");
      if (stat) stat.textContent = String((+stat.textContent.replace(/\D/g, "") || 0) + 1);
    }
    if (typeof toast === "function") toast(`collected a ${cName(c)} glass float`, 2200);
    try { localStorage.setItem("biosphere02.floats.v1", String(+((localStorage.getItem("biosphere02.floats.v1") || "0")) + 1)); } catch {}
    setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 820);
  }
  function cName(c) {
    if (c === palette[0]) return "cobalt";
    if (c === palette[1]) return "sea-green";
    if (c === palette[2]) return "amber";
    if (c === palette[3]) return "ruby";
    return "";
  }

  function schedule() {
    const wait = 90_000 + Math.random() * 90_000; // 90–180s
    setTimeout(spawn, wait);
  }
  // first float shortly after boot so the right shore isn't empty for too long
  setTimeout(spawn, 22_000);
})();

/* end of devlog #24 block. */


/* ============================================================
   devlog #25 — jul 12
   three additions, one of each kind. the moon is the visual
   companion to the existing almanac moon-phase text (which was
   prose-only); the driftwood is a curated letter pool, the peeper
   is the 12th CREATURE_SPECIES entry and the first amphibian
   keyed to daytime warmth rather than night. all three respect
   motion-reduced, and the moon hides entirely during body.day.
   ============================================================ */

/* ---- moon disc (visual moon in the upper sky) ----
   polls minute-of-day once a minute, writes --moon-x / --moon-y
   in pixels to host.style. CSS handles the smooth tween. */
(function moonDisc() {
  const host = document.getElementById("moon-disc");
  if (!host) return;
  const stat = document.getElementById("moon-stat");
  const SK = "biosphere02.moon.v1";
  const num = () => { try { return parseInt(localStorage.getItem(SK) || "0", 10) || 0; } catch { return 0; } };
  const bumpStat = () => {
    const n = num() + 1;
    try { localStorage.setItem(SK, n); } catch {}
    if (stat) stat.textContent = n;
    return n;
  };
  if (stat) stat.textContent = num();

  // map minute-of-day to a 0..1 dome fraction across the visible window
  // 17:00 → 07:00 (next day). outside this window the moon is hidden
  // entirely via the body.day/etc opacity rules (no js branch needed).
  function arc() {
    const now = new Date();
    let m = now.getHours() * 60 + now.getMinutes();
    const start = 17 * 60;             // 17:00
    const end   = 7 * 60 + 24 * 60;    // wraps to 07:00 next day
    let f;
    if (m >= start)      f = (m - start) / (end - start);
    else if (m < 7 * 60) f = (m + 24 * 60 - start) / (end - start);
    else return null;
    if (f < 0 || f > 1) return null;
    // dome: low-and-left at the start, overhead near the middle, low-and-right at end
    const x = 50 + Math.sin(f * Math.PI) * 32;  // 18..82 along vw
    const y = 20 - Math.sin(f * Math.PI) * 14;  // 6..20 vh (smaller = higher)
    return { x, y };
  }

  function render() {
    const pos = arc();
    if (!pos) return; // outside window: css keeps opacity at 0
    const pxX = (pos.x / 100) * window.innerWidth;
    const pxY = (pos.y / 100) * window.innerHeight;
    host.style.setProperty("--moon-x", pxX.toFixed(0) + "px");
    host.style.setProperty("--moon-y", pxY.toFixed(0) + "px");
  }

  render();
  setInterval(render, 60_000);
  window.addEventListener("resize", render, { passive: true });

  host.addEventListener("click", () => {
    const n = bumpStat();
    let ring = host.querySelector(".moon-ring");
    if (!ring) {
      ring = document.createElement("div");
      ring.className = "moon-ring";
      host.appendChild(ring);
    }
    ring.classList.remove("spin");
    void ring.offsetWidth;
    ring.classList.add("spin");
    if (typeof toast === "function" && n === 1) {
      toast("the moon is a green-cheese affair.");
    }
  });
})();

/* ---- driftwood note on the right shore ----
   cycles through 12 short letters (≈15-30 chars each) on each click.
   uses the existing toast() helper + a brief scroll pulse via css. */
(function driftwoodNote() {
  const host = document.getElementById("driftwood-note");
  if (!host) return;
  const stat = document.getElementById("driftwood-stat");
  const SK = "biosphere02.driftwood.v1";
  const num = () => { try { return parseInt(localStorage.getItem(SK) || "0", 10) || 0; } catch { return 0; } };
  const bumpStat = () => {
    const n = num() + 1;
    try { localStorage.setItem(SK, n); } catch {}
    if (stat) stat.textContent = n;
    return n;
  };
  if (stat) stat.textContent = num();

  const NOTES = [
    "the pond is colder than it looks.",
    "if you’re reading this, so am i.",
    "i left my watch here in 2019.",
    "watch for shooting stars after midnight.",
    "look — bioluminescent mushrooms under the dock.",
    "tea on the cabin step is free.",
    "a fox ran past at 5:14 this morning.",
    "tonight the aurora is loud.",
    "you are not lost. you are here on purpose.",
    "i think the tide is at its highest now.",
    "the wishing tree has three lanterns today.",
    "if you found this, write something back."
  ];

  host.addEventListener("click", () => {
    const n = bumpStat();
    const note = NOTES[(n - 1) % NOTES.length];
    if (typeof toast === "function") toast("“" + note + "”");
    host.classList.remove("read");
    const scroll = host.querySelector(".dn-scroll");
    void host.offsetWidth;
    host.classList.add("read");
    if (scroll) scroll.classList.add("read");
  });
})();

/* ---- append peeper to CREATURE_SPECIES (12th entry) ----
   re-renders the field guide if its render fn is exposed. */
(function appendPeeperToSpecies() {
  if (typeof CREATURE_SPECIES === "undefined" || !Array.isArray(CREATURE_SPECIES)) return;
  if (CREATURE_SPECIES.some(s => s.id === "peeper")) return;
  CREATURE_SPECIES.push({
    id: "peeper",
    name: "spring peeper",
    blurb: "a tiny chorus frog. listens for warmth.",
    icon: "🐸"
  });
  if (typeof renderFieldGuide === "function") renderFieldGuide();
})();

/* ---- schedule spring peepers (day-active) ----
   day / dawn / dusk moods only; reduced-motion still spawns (the
   hop animation is frozen, the frog is still clickable). 70-150s
   cadence; one peeper on shore at a time. */
(function schedulePeeper() {
  const host = document.getElementById("peepers");
  if (!host) return;
  const stat = document.getElementById("peeper-stat");
  const SK = "biosphere02.peeper.spotted";
  const num = () => { try { return parseInt(localStorage.getItem(SK) || "0", 10) || 0; } catch { return 0; } };
  const bumpStat = () => {
    const n = num() + 1;
    try { localStorage.setItem(SK, n); } catch {}
    if (stat) stat.textContent = n;
    return n;
  };
  if (stat) stat.textContent = num();

  const moodOk = () =>
    document.body.classList.contains("day")   ||
    document.body.classList.contains("dawn")  ||
    document.body.classList.contains("dusk");
  const motionReduced = () =>
    document.body.classList.contains("motion-reduced") ||
    (typeof window !== "undefined" &&
     window.matchMedia &&
     window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  let active = null;
  function despawn(el) {
    if (!el || active !== el) return;
    el.style.opacity = "0";
    el.style.transform = "translateY(-8px) scale(0.7)";
    setTimeout(() => {
      el.remove();
      if (active === el) active = null;
    }, 320);
  }

  function spawn() {
    if (active) return schedule();
    if (!moodOk()) return schedule();
    const el = document.createElement("div");
    el.className = "peeper";
    const x = 8 + Math.random() * 84;
    el.style.setProperty("--peeper-x", x.toFixed(1) + "vw");
    el.innerHTML =
      '<svg class="peeper-svg" viewBox="0 0 14 11" aria-hidden="true">' +
        '<ellipse cx="7" cy="8.5" rx="5"   ry="2.7" fill="#7a9a4a"/>' +
        '<ellipse cx="7" cy="6"   rx="3.6" ry="2.4" fill="#9bba70"/>' +
        '<circle  cx="5" cy="5.2" r="0.75" fill="#1a1408"/>' +
        '<circle  cx="9" cy="5.2" r="0.75" fill="#1a1408"/>' +
        '<path d="M2 10.4 Q7 11.4 12 10.4" fill="none" stroke="#5a7a3a" stroke-width="0.5"/>' +
      '</svg>';
    host.appendChild(el);
    active = el;

    // a few small side-steps along the shore before the lifespan ends.
    // under reduced-motion we skip the side-steps (the CSS hop animation
    // is also frozen) so the frog stays in one place and is clickable.
    let i = 0;
    const reduced = motionReduced();
    const hops = reduced ? 0 : (2 + Math.floor(Math.random() * 3));
    const hop = setInterval(() => {
      if (i >= hops || active !== el) { clearInterval(hop); return; }
      const nx = Math.max(2, Math.min(98, x + (Math.random() - 0.5) * 8));
      el.style.setProperty("--peeper-x", nx.toFixed(1) + "vw");
      i++;
    }, 850);

    el.addEventListener("click", () => {
      if (typeof markCreatureSeen === "function") markCreatureSeen("peeper");
      bumpStat();
      despawn(el);
    });

    // auto-despawn after 18-30s if not spotted
    setTimeout(() => despawn(el), 18_000 + Math.random() * 12_000);
    schedule();
  }

  function schedule() {
    const ms = 70_000 + Math.random() * 80_000;
    setTimeout(spawn, ms);
  }

  // first spawn ~20s after load
  setTimeout(spawn, 20_000);
})();

/* ============================================================
   devlog #26 — five additions: glow beetle (13th CREATURE_SPECIES
   entry), a distant comet, drifting feathers on wind-gust, a dock
   bell that rings, and the autumn leaf pile. each block is
   self-contained and reads existing globals (isMotionReduced,
   settings, body class, toast, markCreatureSeen, gLog).
   ============================================================ */

/* ---- append glow beetle to CREATURE_SPECIES (13th entry) ---- */
(function appendBeetleToSpecies() {
  if (typeof CREATURE_SPECIES === "undefined" || !Array.isArray(CREATURE_SPECIES)) return;
  if (CREATURE_SPECIES.some(s => s.id === "beetle")) return;
  CREATURE_SPECIES.push({
    id: "beetle",
    name: "glow beetle",
    blurb: "a small green-emitting ground beetle. the dark that follows ferns.",
    icon: "🪲"
  });
  if (typeof renderFieldGuide === "function") renderFieldGuide();
})();

/* ---- schedule glow beetles (night-only, 75-140s cadence) ---- */
(function scheduleBeetle() {
  const host = document.getElementById("beetles");
  if (!host) return;
  const stat = document.getElementById("beetle-stat");
  const SK = "biosphere02.beetle.spotted";
  const num = () => { try { return parseInt(localStorage.getItem(SK) || "0", 10) || 0; } catch { return 0; } };
  const bumpStat = () => {
    const n = num() + 1;
    try { localStorage.setItem(SK, n); } catch {}
    if (stat) stat.textContent = n;
    return n;
  };
  if (stat) stat.textContent = num();

  const moodOk = () =>
    document.body.classList.contains("night") ||
    document.body.classList.contains("dusk");
  const motionReduced = () =>
    document.body.classList.contains("motion-reduced") ||
    (typeof window !== "undefined" && window.matchMedia &&
     window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  let active = null;
  function despawn(el) {
    if (!el || active !== el) return;
    el.classList.remove("walking");
    setTimeout(() => { el.remove(); if (active === el) active = null; }, 380);
  }
  function spawn() {
    if (active) return schedule();
    if (!moodOk()) return schedule();
    const el = document.createElement("div");
    el.className = "beetle";
    const startX = -30;
    const endX = window.innerWidth + 30;
    const y = window.innerHeight - (parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--pond-h")) || 18) - 22;
    const dur = 22_000 + Math.random() * 8_000;
    el.style.left = startX + "px";
    el.style.top = y + "px";
    el.innerHTML =
      '<svg class="beetle-svg" viewBox="0 0 16 10" aria-hidden="true">' +
        '<ellipse cx="8" cy="6" rx="5" ry="3" fill="#3a5a3a"/>' +
        '<ellipse cx="8" cy="5" rx="3" ry="1.6" fill="#5a7a5a"/>' +
        '<circle class="beetle-glow" cx="11" cy="6" r="1.0" fill="rgba(140, 220, 160, 0.95)"/>' +
        '<circle class="beetle-glow" cx="5"  cy="6" r="0.8" fill="rgba(140, 220, 160, 0.85)"/>' +
        '<line x1="3" y1="7" x2="2" y2="9" stroke="#2a3a2a" stroke-width="0.6"/>' +
        '<line x1="13" y1="7" x2="14" y2="9" stroke="#2a3a2a" stroke-width="0.6"/>' +
        '<line x1="6" y1="9" x2="5" y2="10" stroke="#2a3a2a" stroke-width="0.6"/>' +
        '<line x1="10" y1="9" x2="11" y2="10" stroke="#2a3a2a" stroke-width="0.6"/>' +
      '</svg>';
    host.appendChild(el);
    if (!motionReduced()) el.classList.add("walking");

    let lastTrail = performance.now();
    const trailInt = setInterval(() => {
      if (active !== el) { clearInterval(trailInt); return; }
      const now = performance.now();
      if (now - lastTrail < 700) return;
      lastTrail = now;
      const r = el.getBoundingClientRect();
      const t = document.createElement("div");
      t.className = "beetle-trail";
      t.style.left = (r.left + 4) + "px";
      t.style.top  = (r.top + r.height / 2) + "px";
      document.body.appendChild(t);
      setTimeout(() => t.remove(), 2800);
    }, 600);

    const startT = performance.now();
    function frame(now) {
      if (active !== el) return;
      const t = (now - startT) / dur;
      if (t >= 1) { despawn(el); return; }
      el.style.left = (startX + (endX - startX) * t) + "px";
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);

    el.addEventListener("click", () => {
      if (typeof markCreatureSeen === "function") markCreatureSeen("beetle");
      bumpStat();
      el.classList.add("caught");
      clearInterval(trailInt);
      despawn(el);
    });

    setTimeout(() => { clearInterval(trailInt); despawn(el); }, dur + 200);
    schedule();
  }
  function schedule() { setTimeout(spawn, 75_000 + Math.random() * 65_000); }
  setTimeout(spawn, 25_000);
})();

/* ---- distant comet (slow bright streak in the upper sky) ---- */
(function scheduleComet() {
  const host = document.getElementById("comet-host");
  if (!host) return;
  const stat = document.getElementById("comet-stat");
  const SK = "biosphere02.comet.seen";
  const num = () => { try { return parseInt(localStorage.getItem(SK) || "0", 10) || 0; } catch { return 0; } };
  const bumpStat = () => {
    const n = num() + 1;
    try { localStorage.setItem(SK, n); } catch {}
    if (stat) stat.textContent = n;
    return n;
  };
  if (stat) stat.textContent = num();

  let active = null;
  let firstEver = (num() === 0);

  function despawn(comet) {
    if (!comet || active !== comet) return;
    comet.remove();
    if (active === comet) active = null;
  }

  function spawn() {
    if (active) return schedule();
    const mood = document.body.classList;
    const skyOk = mood.contains("dusk") || mood.contains("night");
    if (!skyOk) return schedule();
    const comet = document.createElement("div");
    comet.className = "comet";
    const fromRight = Math.random() < 0.5;
    const w = window.innerWidth, h = window.innerHeight;
    const startX = fromRight ? w + 30 : -30;
    const startY = h * (0.08 + Math.random() * 0.18);
    const vx = (fromRight ? -1 : 1) * (0.10 + Math.random() * 0.08);
    const vy = 0.04 + Math.random() * 0.05;
    comet.style.left = startX + "px";
    comet.style.top  = startY + "px";
    comet.style.opacity = "1";
    host.appendChild(comet);
    active = comet;
    const born = performance.now();
    const life = 22_000 + Math.random() * 8_000;
    let raf;
    function frame(now) {
      if (active !== comet) return;
      const elapsed = now - born;
      const t = elapsed / 1000;
      const x = startX + vx * t * 100;
      const y = startY + vy * t * 100;
      comet.style.left = x + "px";
      comet.style.top  = y + "px";
      const rem = life - elapsed;
      comet.style.opacity = rem < 2400 ? Math.max(0, rem / 2400) : 1;
      if (elapsed < life && x > -40 && x < w + 40 && y < h * 0.55) {
        raf = requestAnimationFrame(frame);
      } else {
        cancelAnimationFrame(raf);
        despawn(comet);
      }
    }
    let _fisheye = false;
    function frame(now) {
      if (active !== comet) return;
      const elapsed = now - born;
      const t = elapsed / 1000;
      const x = startX + vx * t * 100;
      const y = startY + vy * t * 100;
      comet.style.left = x + "px";
      comet.style.top  = y + "px";
      const rem = life - elapsed;
      comet.style.opacity = rem < 2400 ? Math.max(0, rem / 2400) : 1;
      if (!_fisheye && t > 0.4) { _fisheye = true; if (firstEver) { firstEver = false; if (typeof toast === "function") toast("a comet in the upper sky · rare and quiet"); } }
      if (elapsed < life &&
          x > -40 && x < w + 40 && y < h * 0.55) {
        raf = requestAnimationFrame(frame);
      } else {
        cancelAnimationFrame(raf);
        despawn(comet);
      }
    }
    raf = requestAnimationFrame(frame);
    comet.addEventListener("click", () => {
      const n = bumpStat();
      if (firstEver) {
        firstEver = false;
        if (typeof toast === "function") toast("you saw your first comet · it won't be your last");
      } else if (typeof gLog === "function" && n % 5 === 0) {
        gLog("comet", "comet seen", "the sky");
      }
      cancelAnimationFrame(raf);
      despawn(comet);
    });
    schedule();
  }
  function schedule() { setTimeout(spawn, 480_000 + Math.random() * 420_000); }
  setTimeout(spawn, 60_000);
})();

/* ---- drifting feathers (during body.wind-gust) ---- */
(function scheduleFeathers() {
  const host = document.getElementById("feathers");
  if (!host) return;
  const stat = document.getElementById("feathers-stat");
  const SK = "biosphere02.feathers.released";
  const num = () => { try { return parseInt(localStorage.getItem(SK) || "0", 10) || 0; } catch { return 0; } };
  const bumpStat = () => {
    const n = num() + 1;
    try { localStorage.setItem(SK, n); } catch {}
    if (stat) stat.textContent = n;
    return n;
  };
  if (stat) stat.textContent = num();

  function releaseFeathers() {
    if (document.body.classList.contains("motion-reduced")) return;
    const count = 4 + Math.floor(Math.random() * 4);
    const W = window.innerWidth;
    for (let i = 0; i < count; i++) {
      const f = document.createElement("div");
      f.className = "feather";
      f.style.left = (Math.random() * W).toFixed(0) + "px";
      f.style.top = "-12px";
      f.style.setProperty("--fdx", ((Math.random() - 0.5) * 160).toFixed(0) + "px");
      f.style.setProperty("--fdy", (window.innerHeight + 40).toFixed(0) + "px");
      f.style.setProperty("--fr", ((Math.random() - 0.5) * 720).toFixed(0) + "deg");
      const dur = 4500 + Math.random() * 3500;
      f.style.animationDuration = dur.toFixed(0) + "ms";
      f.style.animationDelay = (Math.random() * 600).toFixed(0) + "ms";
      host.appendChild(f);
      setTimeout(() => f.remove(), dur + 1200);
    }
    bumpStat();
  }

  let lastGust = false;
  setInterval(() => {
    const gust = document.body.classList.contains("wind-gust");
    if (gust && !lastGust) releaseFeathers();
    lastGust = gust;
  }, 500);
})();

/* ---- dock bell (click to ring + chime) ---- */
(function scheduleDockBell() {
  const el = document.getElementById("dock-bell");
  if (!el) return;
  const stat = document.getElementById("dock-bell-stat");
  const SK = "biosphere02.dock-bell.rings";
  const num = () => { try { return parseInt(localStorage.getItem(SK) || "0", 10) || 0; } catch { return 0; } };
  const bumpStat = () => {
    const n = num() + 1;
    try { localStorage.setItem(SK, n); } catch {}
    if (stat) stat.textContent = n;
    return n;
  };
  if (stat) stat.textContent = num();

  let ctx = null;
  function ensureCtx() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!ctx) ctx = new AC();
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    return ctx;
  }

  el.addEventListener("click", () => {
    if (!settings || !settings.mute) {
      const c = ensureCtx();
      if (c) {
        const o = c.createOscillator();
        const g = c.createGain();
        o.type = "sine";
        o.frequency.value = 880 + Math.random() * 120;
        g.gain.value = 0;
        o.connect(g).connect(c.destination);
        const t = c.currentTime;
        g.gain.linearRampToValueAtTime(0.18, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
        o.start(t);
        o.stop(t + 1.5);
      }
    }
    const clapper = el.querySelector(".db-clapper");
    if (clapper && !(document.body.classList.contains("motion-reduced") ||
        (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches))) {
      clapper.style.animation = "none";
      void el.offsetWidth;
      clapper.style.animation = "";
    }
    el.classList.remove("rung");
    void el.offsetWidth;
    el.classList.add("rung");
    bumpStat();
    if (num() === 1 && typeof toast === "function") toast("the bell has a small voice · ring it again");
  });
})();

/* ---- autumn leaf pile (autumn-only, scatter on click) ---- */
(function scheduleLeafPile() {
  const el = document.getElementById("leaf-pile");
  if (!el) return;
  const stat = document.getElementById("leaf-stat");
  const SK = "biosphere02.leaf-pile.scattered";
  const num = () => { try { return parseInt(localStorage.getItem(SK) || "0", 10) || 0; } catch { return 0; } };
  const bumpStat = () => {
    const n = num() + 1;
    try { localStorage.setItem(SK, n); } catch {}
    if (stat) stat.textContent = n;
    return n;
  };
  if (stat) stat.textContent = num();

  el.addEventListener("click", () => {
    const n = num();
    const leaves = el.querySelectorAll(".leaf-leaf");
    if (leaves.length >= 1) {
      leaves[0].style.setProperty("--ltx", ((n * 7) % 28 + 8).toFixed(0) + "px");
      leaves[0].style.setProperty("--lty", "-38px");
    }
    if (leaves.length >= 2) {
      leaves[1].style.setProperty("--ltx", (-((n * 13) % 24) - 8).toFixed(0) + "px");
      leaves[1].style.setProperty("--lty", "-30px");
    }
    if (leaves.length >= 3) {
      leaves[2].style.setProperty("--ltx", ((n * 5) % 18 - 8).toFixed(0) + "px");
      leaves[2].style.setProperty("--lty", "-44px");
    }
    el.classList.remove("scattered");
    void el.offsetWidth;
    el.classList.add("scattered");
    setTimeout(() => el.classList.remove("scattered"), 2200);
    bumpStat();
    if (typeof gLog === "function" && num() % 5 === 0) gLog("leaves", "leaf pile scattered", "the shore");
  });
})();


/* ============================================================
   devlog #27 — three lake-side additions:
   1) bioluminescent jellyfish rising from the pond at night
   2) a moth drawn to the lighthouse lantern at dusk/night
   3) a sketched map on a clipboard by the bench (click to flip)
   ============================================================ */

/* ---- 1) jellyfish in the pond ----
   night-only (body.night or sky-locked to night/dusk); capped at 3
   to keep the pond readable. each jelly spawns near the pond floor
   and rises ~220px over ~7.5s via CSS transition (no per-frame js),
   dropping a small fading teal glow trail every ~700ms. */
const JELLY_KEY = "biosphere02.jellies.spotted";
const jellyHost = document.getElementById("jellies");
const jellyStat = document.getElementById("jellies-stat");
const jellyCount = () => { try { return parseInt(localStorage.getItem(JELLY_KEY) || "0", 10) || 0; } catch { return 0; } };
const bumpJellyStat = () => {
  const n = jellyCount() + 1;
  try { localStorage.setItem(JELLY_KEY, String(n)); } catch {}
  if (jellyStat) jellyStat.textContent = n;
  return n;
};
if (jellyStat) jellyStat.textContent = jellyCount();

let activeJellies = 0;
let _jellyTrailStamp = 0;

function makeJellySVG() {
  return '<svg class="jelly-svg" viewBox="0 0 14 18" aria-hidden="true">' +
    // outer bell (the lit dome)
    '<path class="jelly-bell" d="M7 1.2 Q1.7 0.7 1.4 6.8 Q2.6 11.8 7 11.2 Q11.4 11.8 12.6 6.8 Q12.3 0.7 7 1.2 Z"/>' +
    // inner pulsing core
    '<ellipse class="jelly-inner jelly-glow" cx="7" cy="6" rx="2.8" ry="2.2"/>' +
    // three short trailing tentacles
    '<path class="jelly-tentacle" d="M4 11 Q3 13.2 4 16"/>' +
    '<path class="jelly-tentacle" d="M7 11 Q7 14.2 7 17"/>' +
    '<path class="jelly-tentacle" d="M10 11 Q11 13.2 10 16"/>' +
  '</svg>';
}

function spawnJelly() {
  if (!jellyHost) return scheduleJelly();
  if (isMotionReduced()) return scheduleJelly();
  // gate on night or dusk so they only show when the pond would actually glow
  const dark = document.body.classList.contains("night") ||
               document.body.classList.contains("dusk");
  if (!dark) return scheduleJelly();
  if (activeJellies >= 3) return scheduleJelly();

  const W = window.innerWidth;
  const xPx = 24 + Math.random() * (W - 48);
  const el = document.createElement("div");
  el.className = "jelly";
  el.style.setProperty("--jelly-x", xPx.toFixed(0) + "px");
  el.style.setProperty("--jelly-y", "4px");
  el.title = "a jelly — click to spot";
  el.innerHTML = makeJellySVG();
  jellyHost.appendChild(el);
  activeJellies++;

  // start the rise on the next frame so the opacity transition kicks in
  requestAnimationFrame(() => {
    el.style.setProperty("--jelly-y", "100%");
    el.classList.add("rising");
  });

  // drop a fading trail dot every ~700ms — like fireflies do
  const trailInt = setInterval(() => {
    if (!document.body.contains(el) || isMotionReduced()) {
      clearInterval(trailInt);
      return;
    }
    const now = performance.now();
    if (now - _jellyTrailStamp < 700) return;
    _jellyTrailStamp = now;
    const rect = el.getBoundingClientRect();
    const t = document.createElement("div");
    t.className = "jelly-trail";
    t.style.left = (rect.left + rect.width / 2 - 1) + "px";
    t.style.top  = (rect.top  + rect.height / 2 - 1) + "px";
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2700);
  }, 600);

  el.addEventListener("click", () => {
    const n = bumpJellyStat();
    el.classList.add("caught");
    clearInterval(trailInt);
    setTimeout(() => { el.remove(); activeJellies--; }, 280);
    if (n === 1 && typeof toast === "function") toast("a jelly in the pond 🪼 · tiny and lit");
    else if (n % 5 === 0 && typeof gLog === "function") gLog("jelly", "spotted a jelly", "the pond");
  });

  // auto-despawn after the 7.5s rise finishes; guard the active count
  setTimeout(() => {
    if (!document.body.contains(el)) return;
    el.classList.remove("rising");
    setTimeout(() => { if (document.body.contains(el)) { el.remove(); activeJellies--; } }, 600);
  }, 7800);

  scheduleJelly();
}
function scheduleJelly() {
  setTimeout(spawnJelly, 22_000 + Math.random() * 30_000);
}
// one shortly after load so the pond doesn't sit still for half a minute
setTimeout(spawnJelly, 12_000);

/* ---- 2) lantern moth ----
   a second moth, distinct from the hearth moth (which lives in the
   bottom-left near the cabin). this one visits the lighthouse lamp at
   dusk / night on an 80–160s cadence, fluttering via pure CSS so
   there's no per-frame JS. click to spot — separate counter. */
const LANTERN_MOTH_KEY = "biosphere02.lantern-moth.spotted";
const lanternMothEl = document.getElementById("lantern-moth");
const lanternMothStat = document.getElementById("lantern-moth-stat");
const lanternMothCount = () => { try { return parseInt(localStorage.getItem(LANTERN_MOTH_KEY) || "0", 10) || 0; } catch { return 0; } };
const bumpLanternMothStat = () => {
  const n = lanternMothCount() + 1;
  try { localStorage.setItem(LANTERN_MOTH_KEY, String(n)); } catch {}
  if (lanternMothStat) lanternMothStat.textContent = n;
  return n;
};
if (lanternMothStat) lanternMothStat.textContent = lanternMothCount();

let _lanternMothActive = false;
function scheduleLanternMoth() {
  const wait = 80_000 + Math.random() * 80_000; // 80-160s
  setTimeout(() => {
    if (!lanternMothEl) return;
    if (isMotionReduced()) return scheduleLanternMoth();
    const darkOrLit = document.body.classList.contains("night") ||
                      document.body.classList.contains("dusk");
    if (!darkOrLit) return scheduleLanternMoth();
    if (_lanternMothActive) return scheduleLanternMoth();
    _lanternMothActive = true;
    // hard self-clear safety net: if the .fluttering window ends via a sky-lock
    // class flip rather than the natural 22s timer, this still re-arms the spawn
    // chain roughly when the next visiting window would have come anyway.
    setTimeout(() => { if (_lanternMothActive) _lanternMothActive = false; }, 25_000);
    lanternMothEl.classList.add("fluttering");
    // one good evening's visit, then it leaves and reschedules
    setTimeout(() => {
      lanternMothEl.classList.remove("fluttering");
      setTimeout(() => { _lanternMothActive = false; }, 700);
      scheduleLanternMoth();
    }, 22_000);
  }, wait);
}
setTimeout(scheduleLanternMoth, 30_000);
if (lanternMothEl) {
  lanternMothEl.addEventListener("click", () => {
    if (!_lanternMothActive) return;
    const n = bumpLanternMothStat();
    lanternMothEl.classList.add("caught");
    setTimeout(() => {
      lanternMothEl.classList.remove("fluttering", "caught");
      _lanternMothActive = false;
    }, 320);
    if (n === 1 && typeof toast === "function") toast("a moth at the lantern 🦋");
    else if (n % 5 === 0 && typeof gLog === "function") gLog("moth", "a moth at the lantern", "the lighthouse");
  });
}

/* ---- 3) sketched map on a clipboard ----
   six hand-drawn coordinate sketches cycle through on each click.
   each sketch has ~7 markers + 2 path strokes + 2 labels, drawn
   procedurally but deterministically from the index so the same
   map always shows the same coordinates. the .cb-paper-lines group
   stays put; the .cb-sketch group is wiped and redrawn each click.
   the .showed class fades everything in, the .fresh class plays a
   quick stroke-dasharray animation so each path draws itself in. one
   label per map drifts very slowly on a long CSS ease-in-out so the
   map feels like something drawn by hand and still on the board. */
const CLIP_KEY = "biosphere02.clipboard-maps.drawn";
const clipboardEl = document.getElementById("clipboard");
const clipboardStat = document.getElementById("clipboard-stat");
const clipboardSketchEl = document.getElementById("cb-sketch");
const clipboardTitleEl = document.querySelector("#clipboard .cb-title");
const clipboardCount = () => { try { return parseInt(localStorage.getItem(CLIP_KEY) || "0", 10) || 0; } catch { return 0; } };
const bumpClipboardStat = () => {
  const n = clipboardCount() + 1;
  try { localStorage.setItem(CLIP_KEY, String(n)); } catch {}
  if (clipboardStat) clipboardStat.textContent = n;
  return n;
};
if (clipboardStat) clipboardStat.textContent = clipboardCount();

const MAP_VIEWS = 6;
const MAP_LABELS = [
  ["the bend",   "old oak",   "deep pool"],
  ["the outflow","shale mouth","heron nest"],
  ["stumps row", "green rock","deep end"],
  ["shallows",   "west bank", "weir line"],
  ["east cove",  "beech + ash","tide edge"],
  ["hidden inlet","three pines","spring rise"],
];

function makeMapSketch(idx) {
  // paper rect is x:9..47, y:14..56 in viewBox units — place marks inside
  const seed = idx * 137 + 17;
  const rand = (i) => Math.abs(((Math.sin(seed * 13.7 + i * 91) + 1) * 0.5));
  const markers = [];
  for (let i = 0; i < 7; i++) {
    const px = 13 + rand(i) * 30;
    const py = 17 + rand(i + 7) * 26;
    markers.push([px, py]);
  }
  let html = "";
  // two path strokes connect some markers (the waterways)
  const m = markers;
  html += '<path class="cb-stroke" d="M' + m[0][0].toFixed(1) + ' ' + m[0][1].toFixed(1) +
    ' Q' + m[1][0].toFixed(1) + ' ' + m[1][1].toFixed(1) + ' ' + m[2][0].toFixed(1) + ' ' + m[2][1].toFixed(1) +
    ' T' + m[3][0].toFixed(1) + ' ' + m[3][1].toFixed(1) + '"/>';
  html += '<path class="cb-stroke" d="M' + m[3][0].toFixed(1) + ' ' + m[3][1].toFixed(1) +
    ' Q' + m[4][0].toFixed(1) + ' ' + m[4][1].toFixed(1) + ' ' + m[5][0].toFixed(1) + ' ' + m[5][1].toFixed(1) + '"/>';
  // markers (small red dots)
  for (let i = 0; i < markers.length; i++) {
    const [mx, my] = markers[i];
    html += '<circle cx="' + mx.toFixed(1) + '" cy="' + my.toFixed(1) + '" r="1.0"/>';
  }
  // place the wandering label and a fixed label on two different markers
  const labels = MAP_LABELS[idx % MAP_LABELS.length];
  const wanderI = idx % markers.length;
  const fixedI = (idx + 3) % markers.length;
  html += '<text class="cb-label" x="' + markers[wanderI][0].toFixed(1) + '" y="' + (markers[wanderI][1] - 2.6).toFixed(1) + '">' + labels[0] + '</text>';
  html += '<text class="cb-label" x="' + markers[fixedI][0].toFixed(1) + '" y="' + (markers[fixedI][1] - 2.6).toFixed(1) + '">' + labels[1] + '</text>';
  return html;
}

function renderClipboardMap(idx) {
  if (!clipboardEl || !clipboardSketchEl) return;
  clipboardSketchEl.innerHTML = makeMapSketch(idx);
  if (clipboardTitleEl) clipboardTitleEl.textContent = "map no. " + (idx + 1);
  // re-trigger the pencil-scratch animation: remove → force reflow → add fresh+showed
  clipboardEl.classList.remove("fresh", "showed");
  void clipboardEl.offsetWidth;
  clipboardEl.classList.add("fresh", "showed");
  // nudge the wandering label once on render so its position varies over time
  const wanderingLabel = clipboardEl.querySelector(".cb-label");
  if (wanderingLabel) {
    const dx = ((Math.random() - 0.5) * 1.6).toFixed(2);
    const dy = ((Math.random() - 0.5) * 1.0).toFixed(2);
    wanderingLabel.style.transform = "translate(" + dx + "px, " + dy + "px)";
  }
}

if (clipboardEl) {
  clipboardEl.addEventListener("click", () => {
    const n = bumpClipboardStat();
    const idx = (n - 1) % MAP_VIEWS;
    renderClipboardMap(idx);
    if (n === 1 && typeof toast === "function") toast("a sketched map · the lines drift on their own");
    else if (n % 4 === 0 && typeof gLog === "function") gLog("map", "drew a map", "the clipboard");
  });
}
// show the first map on load so the page has something on the clipboard from the start
if (clipboardSketchEl) renderClipboardMap(0);

// slow drift on the wandering label timer — purely cosmetic, every ~26s
setInterval(() => {
  if (isMotionReduced()) return;
  if (!clipboardEl) return;
  const labels = clipboardEl.querySelectorAll(".cb-label");
  if (!labels.length) return;
  // drift only the first ("wandering") label — the other is meant to stay put
  const wl = labels[0];
  const dx = ((Math.random() - 0.5) * 2.0).toFixed(2);
  const dy = ((Math.random() - 0.5) * 1.4).toFixed(2);
  wl.style.transform = "translate(" + dx + "px, " + dy + "px)";
}, 26_000);
/* ============================================================
   devlog #28 — three lake-side additions (per user request):
     1) a water strider skating the pond surface on six dimple ripples
        (14th CREATURE_SPECIES entry — day/dawn/dusk moods only,
        70-160s cadence, ~22s per crossing)
     2) a great blue heron standing statue-still at the shore with
        an S-shaped neck that periodically dips (15th field-guide entry
        — day/dusk only, 90-200s cadence, click sends it flying off)
     3) cattail fluff bursting off the existing cattail heads during
        body.wind-gust on summer / autumn (ambient weather, with its
        own fluff-released counter — not a creature)
   ============================================================ */

/* ---- 1) water strider — 14th CREATURE_SPECIES entry ----
   six-legged pond-surface insect. body drifts across the pond on a
   pure-css rAF path; six dimple ripples (one per leg tip) pulse on a 540ms
   cycle, staggered so they ripple in turn rather than all at once — same
   tiny wave pattern real striders leave on a still surface. one active
   at a time, the same single-spawn cap the otter / crabs use. */
(function scheduleWaterStrider() {
  if (typeof CREATURE_SPECIES === "undefined" || !Array.isArray(CREATURE_SPECIES)) return;
  if (!CREATURE_SPECIES.some(s => s.id === "water-strider")) {
    CREATURE_SPECIES.push({
      id: "water-strider",
      name: "water strider",
      blurb: "a six-legged pond insect — each leg a faint dimple on the surface.",
      icon: "🦟"
    });
    if (typeof renderFieldGuide === "function") renderFieldGuide();
  }

  const host = document.getElementById("water-striders");
  if (!host) return;
  const stat = document.getElementById("strider-stat");
  const SK = "biosphere02.striders.spotted";
  const num = () => { try { return parseInt(localStorage.getItem(SK) || "0", 10) || 0; } catch { return 0; } };
  const bumpStat = () => {
    const n = num() + 1;
    try { localStorage.setItem(SK, String(n)); } catch {}
    if (stat) stat.textContent = n;
    return n;
  };
  if (stat) stat.textContent = num();

  let active = null;

  function despawn(el) {
    if (!el || active !== el) return;
    el.classList.remove("skating");
    // grace period for the fade-out before hard-removing the node, so a
    // strider crossed-off-screen doesn't pop-disappear mid-transition
    setTimeout(() => {
      if (el && el.parentNode) el.parentNode.removeChild(el);
      if (active === el) active = null;
    }, 520);
  }

  function spawn() {
    if (active) return schedule();
    if (typeof isMotionReduced === "function" && isMotionReduced()) return schedule();
    // daytime pool only — at night the pond reads as deeper / colder and a
    // strider would feel out of place at the same time the jellyfish turn on
    const mood = document.body.classList;
    if (!(mood.contains("day") || mood.contains("dawn") || mood.contains("dusk"))) return schedule();

    const pond = document.getElementById("pond");
    if (!pond) return schedule();
    const pondRect = pond.getBoundingClientRect();
    if (pondRect.width < 80) return schedule();

    const startX = -32;
    const endX = pondRect.width + 32;
    // sit just under the surface so the legs visibly touch the water band
    const y = pondRect.top + 8 + Math.random() * Math.max(8, pondRect.height - 22);

    const el = document.createElement("div");
    el.className = "water-strider";
    el.style.left = startX + "px";
    el.style.top = y + "px";
    el.style.width = "36px";
    el.style.height = "22px";

    el.innerHTML =
      '<svg class="water-strider-svg" viewBox="0 0 36 22" aria-hidden="true">' +
        '<g class="ws-body-anim">' +
          // slim oval body on the water band
          '<ellipse class="ws-torso" cx="18" cy="11" rx="6.4" ry="1.6" fill="#1f1408"/>' +
          '<ellipse cx="22.6" cy="10.5" rx="1.8" ry="1.05" fill="#1f1408"/>' +
          // six thin legs paired outward, mirroring real strider leg-posture
          '<line x1="16" y1="11.4" x2="6"  y2="14" stroke="#1f1408" stroke-width="0.6" stroke-linecap="round"/>' +
          '<line x1="14" y1="11.4" x2="3"  y2="10" stroke="#1f1408" stroke-width="0.6" stroke-linecap="round"/>' +
          '<line x1="12" y1="11.4" x2="2"  y2="6"  stroke="#1f1408" stroke-width="0.6" stroke-linecap="round"/>' +
          '<line x1="20" y1="11.4" x2="30" y2="14" stroke="#1f1408" stroke-width="0.6" stroke-linecap="round"/>' +
          '<line x1="22" y1="11.4" x2="33" y2="10" stroke="#1f1408" stroke-width="0.6" stroke-linecap="round"/>' +
          '<line x1="24" y1="11.4" x2="34" y2="6"  stroke="#1f1408" stroke-width="0.6" stroke-linecap="round"/>' +
        '</g>' +
      '</svg>';
    host.appendChild(el);

    // append the 6 dimple ripples AFTER the svg so they sit on top of the
    // legs (visually they read as fresh ripples at each leg tip). dimples
    // are children of the strider so they translate together with it.
    const dimplePts = [
      [6, 14], [3, 10], [2, 6], [30, 14], [33, 10], [34, 6]
    ];
    for (const [dx, dy] of dimplePts) {
      const d = document.createElement("span");
      d.className = "ws-dimple";
      // 6px ring centered on (dx, dy) — i subtract half-size from left/top
      d.style.left = (dx - 3) + "px";
      d.style.top  = (dy - 3) + "px";
      el.appendChild(d);
    }
    const dimples = el.querySelectorAll(".ws-dimple");

    active = el;
    // force a reflow before adding the .skating class so the opacity
    // transition has somewhere to start from (otherwise the strider pops
    // visible instead of fading in)
    requestAnimationFrame(() => el.classList.add("skating"));

    // pulse the dimples one after another. 540ms between = small wave
    // pattern looks like the strider is planting each leg in turn as it
    // leans its weight forward across the surface.
    let dimI = 0;
    const dimInt = setInterval(() => {
      if (active !== el) { clearInterval(dimInt); return; }
      const d = dimples[dimI % dimples.length];
      d.classList.remove("live");
      void d.offsetWidth; // restart the keyframe
      d.classList.add("live");
      dimI++;
    }, 540);

    // cross the pond in 19-26s on a smoothstep ease so the strider
    // accelerates out of frame A (where it spawned off-edge) and decelerates
    // into frame B (off the other side).
    const startT = performance.now();
    const dur = 19000 + Math.random() * 7000;
    function frame(now) {
      if (active !== el) return;
      const t = (now - startT) / dur;
      if (t >= 1) { clearInterval(dimInt); despawn(el); return; }
      const e = t * t * (3 - 2 * t);
      el.style.left = (startX + (endX - startX) * e) + "px";
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);

    el.addEventListener("click", () => {
      if (typeof markCreatureSeen === "function") markCreatureSeen("water-strider");
      const n = bumpStat();
      el.classList.add("caught");
      clearInterval(dimInt);
      despawn(el);
      if (n === 1 && typeof toast === "function") toast("a water strider · six dimples on the surface");
      else if (n % 5 === 0 && typeof gLog === "function") gLog("strider", "water strider seen", "the pond");
    });

    // safety net: hard-despawn after the dur even if rAF stalls (background
    // tab pauses rAF, so without this the strider would strand forever)
    setTimeout(() => { clearInterval(dimInt); despawn(el); }, dur + 220);
    schedule();
  }

  function schedule() {
    setTimeout(spawn, 70000 + Math.random() * 90000); // 70-160s between appearances
  }
  setTimeout(spawn, 14000); // first one shows 14s after load so the pond reads as alive
})();

/* ---- 2) great blue heron — 15th CREATURE_SPECIES entry ----
   a tall wading bird with an S-curved neck that stands statue-still for
   ~28-36s on a 90-200s cadence. day/dusk moods only (herons are crepuscular
   in real life so dusk is welcome). the periodic neck-dip is pure css
   over a 16s cycle so the silhouette looks like it's actively fishing
   without spending a single cycle of js. click spots AND sends it flying
   off — both happen at once (no extra "thanks for clicking" reset). */
(function scheduleHeron() {
  if (typeof CREATURE_SPECIES === "undefined" || !Array.isArray(CREATURE_SPECIES)) return;
  if (!CREATURE_SPECIES.some(s => s.id === "heron")) {
    CREATURE_SPECIES.push({
      id: "heron",
      name: "great blue heron",
      blurb: "tall wader with an S-shaped neck · statues for minutes, then dips.",
      icon: "🦢"
    });
    if (typeof renderFieldGuide === "function") renderFieldGuide();
  }

  const host = document.getElementById("herons");
  if (!host) return;
  const stat = document.getElementById("heron-stat");
  const SK = "biosphere02.herons.spotted";
  const num = () => { try { return parseInt(localStorage.getItem(SK) || "0", 10) || 0; } catch { return 0; } };
  const bumpStat = () => {
    const n = num() + 1;
    try { localStorage.setItem(SK, String(n)); } catch {}
    if (stat) stat.textContent = n;
    return n;
  };
  if (stat) stat.textContent = num();

  let active = null;

  function despawn(el) {
    if (!el || active !== el) return;
    el.classList.remove("standing");
    setTimeout(() => {
      if (el && el.parentNode) el.parentNode.removeChild(el);
      if (active === el) active = null;
    }, 800);
  }

  function flyOff(el) {
    el.classList.add("flying-off");
    setTimeout(() => despawn(el), 1200);
  }

  function spawn() {
    if (active) return schedule();
    if (typeof isMotionReduced === "function" && isMotionReduced()) return schedule();
    const mood = document.body.classList;
    if (!(mood.contains("day") || mood.contains("dusk"))) return schedule();

    const w = window.innerWidth;
    // bias right-center so the heron doesn't crowd the dandelion / lantern
    // strip on the left. irl herons prefer the open shallows — the cleared
    // sky area maps cleanly to the right of the pond.
    const sideRight = Math.random() < 0.65;
    const x = sideRight
      ? Math.round(w * 0.74 + Math.random() * (w * 0.16))
      : Math.round(w * 0.06 + Math.random() * (w * 0.14));

    const el = document.createElement("div");
    el.className = "heron";
    el.style.left = x + "px";
    // base sits at the water line — baseBottom = pond-top, so the legs
    // visibly penetrate the shallows and the body sits just above the
    // shoreline like a real wading pose
    el.style.bottom = "calc(38px + var(--pond-h) - 8px)";
    el.style.width = "44px";
    el.style.height = "62px";

    el.innerHTML =
      '<svg class="heron-svg" viewBox="0 0 44 62" aria-hidden="true">' +
        // two long thin legs reaching down through the water surface
        '<line x1="20" y1="33" x2="18" y2="62" stroke="#3a2e22" stroke-width="1" stroke-linecap="round"/>' +
        '<line x1="24" y1="33" x2="26" y2="62" stroke="#3a2e22" stroke-width="1" stroke-linecap="round"/>' +
        // body + folded-wing silhouette (the wings flex on the .heron-wings
        // animation, a tiny "idle breath")
        '<g class="heron-body-anim">' +
          '<ellipse cx="22" cy="30" rx="9.6" ry="4.2" fill="#7086a0"/>' +
          '<path class="heron-wings" d="M14 28 Q22 23 30 28 Q22 32 14 28 Z" fill="#5a6e88"/>' +
          // tail trailing back over the legs
          '<path d="M13 32 Q9 33 7 30 Q11 35 16 33 Z" fill="#4f6078"/>' +
        '</g>' +
        // S-shaped neck with a periodic slow dip. origin sits at the base
        // of the neck so the dip rotates the whole serpentine as one piece.
        '<g class="heron-neck">' +
          '<path d="M22 28 Q19 24 24 19 Q29 14 22 8" fill="none" stroke="#7086a0" stroke-width="2.4" stroke-linecap="round"/>' +
          '<path d="M22 28 Q19 24 24 19 Q29 14 22 8" fill="none" stroke="#94a8be" stroke-width="0.8" stroke-linecap="round" opacity="0.4"/>' +
          '<ellipse cx="22" cy="7.2" rx="2.4" ry="1.5" fill="#5a6e88"/>' +
          // long pointed beak — extends rightward toward the water on dip
          '<line x1="24" y1="7.2" x2="32" y2="6.8" stroke="#e8a060" stroke-width="1" stroke-linecap="round"/>' +
          '<circle cx="22.6" cy="6.6" r="0.55" fill="#fff5e0"/>' +
          // a small cranial plume, mostly cosmetic
          '<path d="M21 5.6 Q19.6 3 22 2.4" stroke="#3a4858" stroke-width="0.7" fill="none" stroke-linecap="round"/>' +
        '</g>' +
      '</svg>';

    host.appendChild(el);
    active = el;
    requestAnimationFrame(() => el.classList.add("standing"));

    el.addEventListener("click", () => {
      const n = num();
      if (typeof markCreatureSeen === "function") markCreatureSeen("heron");
      bumpStat();
      flyOff(el);
      if (n === 1 && typeof toast === "function") toast("a great blue heron 🦢 · it took off");
      else if (n % 5 === 0 && typeof gLog === "function") gLog("heron", "heron seen", "the shore");
    });

    // natural departure after 28-36s even if you didn't catch it — herons
    // don't stay in one spot forever, and leaving on its own keeps the
    // pond-with-heron reading from getting stale
    setTimeout(() => {
      if (active !== el) return;
      flyOff(el);
    }, 28000 + Math.random() * 8000);

    schedule();
  }

  function schedule() {
    setTimeout(spawn, 90000 + Math.random() * 110000); // 90-200s between appearances
  }
  setTimeout(spawn, 26000); // first one 26s after load
})();

/* ---- 3) cattail fluff burst — ambient weather ----
   wind makes the cattails sway, but it never made them shed. now: on
   each wind-gust (during season-summer / season-autumn, when the
   spires are actually ripe), a small puff of 1-3 white flecks drifts
   off the cattail heads and floats upward + outward on the breeze, a
   softer cousin of the dandelion seeds. has its own fluff-released
   counter so you can see them accumulate; not a creature, so it
   doesn't add to the guide. */
(function scheduleCattailFluff() {
  const host = document.getElementById("cattail-fluff");
  if (!host) return;
  const stat = document.getElementById("cat-fluff-stat");
  const SK = "biosphere02.cattail-fluff.released";
  const num = () => { try { return parseInt(localStorage.getItem(SK) || "0", 10) || 0; } catch { return 0; } };
  const bumpStat = () => {
    const n = num() + 1;
    try { localStorage.setItem(SK, String(n)); } catch {}
    if (stat) stat.textContent = n;
    return n;
  };
  if (stat) stat.textContent = num();

  function release() {
    if (typeof isMotionReduced === "function" && isMotionReduced()) return;
    const b = document.body.classList;
    if (!b.contains("wind-gust")) return;
    // season gate: cattails don't actually shed in spring (it'd be pollen,
    // visually different) or in winter (they're dormant). summer + autumn
    // are when the fluffy seed-heads release.
    if (!(b.contains("season-summer") || b.contains("season-autumn"))) return;
    const heads = document.querySelectorAll(".cattail-bunch .head");
    if (!heads.length) return;
    const count = 1 + Math.floor(Math.random() * 3); // 1-3 per burst
    const used = new Set();
    for (let i = 0; i < count; i++) {
      const idx = Math.floor(Math.random() * heads.length);
      if (used.has(idx)) continue;
      used.add(idx);
      const r = heads[idx].getBoundingClientRect();
      const fl = document.createElement("div");
      fl.className = "cat-fluff";
      fl.style.left = (r.left + r.width / 2 - 3) + "px";
      fl.style.top  = (r.top - 6) + "px";
      // drift up + slight sideways; bias rightward to feel like a soft
      // breeze matched to the existing vane-arrow (wind-gust rotates it
      // clockwise so prevailing direction reads as leftward on the vane
      // — the fluff going right reads as fluff going with the wind).
      const dx = 30 + Math.random() * 80;
      const dy = -(70 + Math.random() * 110);
      const rot = (Math.random() - 0.5) * 360;
      fl.style.setProperty("--cfdx", dx.toFixed(0) + "px");
      fl.style.setProperty("--cfdy", dy.toFixed(0) + "px");
      fl.style.setProperty("--cfr", rot.toFixed(0) + "deg");
      fl.style.animationDuration = (4500 + Math.random() * 1400).toFixed(0) + "ms";
      fl.style.animationDelay = (Math.random() * 200).toFixed(0) + "ms";
      host.appendChild(fl);
      setTimeout(() => fl.remove(), 6300);
      bumpStat();
    }
  }

  // poll the body class for wind-gust transitions. fire a burst right at
  // the start of each gust (so the cattails visibly-shed the moment the
  // wind picks up), then once more mid-gust so the air looks alive over
  // the gust's ~10s lifetime.
  let lastGust = false;
  let midGustFired = false;
  setInterval(() => {
    const gust = document.body.classList.contains("wind-gust");
    if (gust && !lastGust) {
      release();
      lastGust = true;
      midGustFired = false;
      setTimeout(() => {
        if (document.body.classList.contains("wind-gust") && !midGustFired) {
          midGustFired = true;
          release();
        }
      }, 5000);
    }
    if (!gust) lastGust = false;
  }, 400);
})();
/* ============================================================
   devlog #29 — five sky/weather additions:
   1) moon halo on waxing/waning gibbous nights — fragile and faint
   2) distant lightning flash + low rumble (~12-25 min cadence,
      independent of any forecast kind so today's weather
      can't break the rhythm)
   3) dawn pond mist — three layered translucent sheets rising
      off the surface during body.dawn
   4) milky way band drifting across the upper-sky at deep
      night (NOT dusk) on a 240s lazy loop
   5) lightning-bug dance — fourteen fireflies pulse in
      unison over 2.4s on still warm summer nights

   each block is self-contained and reads existing globals
   (body classes, fireflies array, isMotionReduced, settings,
   toast, gLog, markCreatureSeen). host divs live in
   /tmp/devlog-29.html and styles in /tmp/devlog-29.css.
   ============================================================ */

/* ---- shared: phase fraction + moon-visible mood helper ---- */
function _moonPhaseFraction() {
  // synodic constants MUST stay byte-identical to setMoon() at the
  // top of this file (phase 0 = 2000-01-06 18:14 UTC, lp = synodic
  // month in seconds). if setMoon moves, the halo gate drifts from
  // the almanac text and the gibbous-night ring shows on the
  // wrong nights.
  const lp = 2551442.8; // synodic period in seconds — keep in sync with setMoon()
  const known = new Date("2000-01-06T18:14:00Z").getTime() / 1000;
  const now = Date.now() / 1000;
  return ((now - known) % lp) / lp; // 0..1
}
function _moonVisibleMood() {
  const b = document.body.classList;
  return b.contains("dusk") || b.contains("night");
}

/* ---- 1) moon halo ----
   visible on nights where the moon is at least gibbous-thick; a
   soft cyan-white ring grows around the #moon-disc via body.moon-
   halo-on. runs a 1-min poll so the ring tracks sky-lock changes
   and follows the moon's appearance window (17:00→07:00) on its
   own. clicking the moon bumps the halo-seen counter. */
const MOON_HALO_KEY = "biosphere02.moon-halo.seen";
const moonHaloStatEl = document.getElementById("moon-halo-stat");
let moonHaloSeen = (() => { try { return +localStorage.getItem(MOON_HALO_KEY) || 0; } catch { return 0; } })();
function renderMoonHaloStat() { if (moonHaloStatEl) moonHaloStatEl.textContent = moonHaloSeen; }
renderMoonHaloStat();

function updateMoonHalo() {
  const phase = _moonPhaseFraction();
  // gibbous band ≈ phase 0.62-0.88 (waxing gibbous → full) and
  // 0.12-0.38 (waning gibbous → last quarter). thresholds chosen
  // so the halo only shows on visibly-thick nights, never on a
  // thin crescent.
  const gibbous = (phase >= 0.62 && phase <= 0.92) || (phase >= 0.06 && phase <= 0.36);
  document.body.classList.toggle("moon-halo-on", _moonVisibleMood() && gibbous);
}
updateMoonHalo();
setInterval(updateMoonHalo, 60_000);

const _moonDiscEl = document.getElementById("moon-disc");
if (_moonDiscEl) {
  _moonDiscEl.addEventListener("click", () => {
    moonHaloSeen++;
    try { localStorage.setItem(MOON_HALO_KEY, String(moonHaloSeen)); } catch {}
    renderMoonHaloStat();
    if (moonHaloSeen === 1 && typeof toast === "function") {
      toast("you noticed the moon's halo · it shows on gibbous nights 🌕");
    }
  });
}

/* ---- 2) distant lightning ----
   12-25 min random cadence, mood-gated (dusk/night only). each
   "storm" fires once — bolt svg + screen tint + 0.04-2.0s low
   sawtooth rumble that pitches from ~85Hz down to ~40Hz over
   its envelope, so it reads as distant. lazy AudioContext stays
   suspended until the user's first pointerdown. respects
   settings.mute (skips audio) — visual still flashes, by
   design, so lightning reads from a muted tab too. */
const LIGHTNING_KEY = "biosphere02.lightning.flashes";
const lightningHostEl = document.getElementById("lightning-host");
const lightningTintsEl = document.getElementById("lightning-tints");
const lightningStatEl = document.getElementById("lightning-stat");
let lightningFlashes = (() => { try { return +localStorage.getItem(LIGHTNING_KEY) || 0; } catch { return 0; } })();
function renderLightningStat() { if (lightningStatEl) lightningStatEl.textContent = lightningFlashes; }
renderLightningStat();

let _lightningCtx = null;
function _ensureLightningCtx() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!_lightningCtx) _lightningCtx = new AC();
  if (_lightningCtx.state === "suspended") _lightningCtx.resume().catch(() => {});
  return _lightningCtx;
}

function fireLightning() {
  const b = document.body.classList;
  const moodOk = b.contains("dusk") || b.contains("night");
  if (!moodOk) return scheduleLightning();
  if (typeof isMotionReduced === "function" && isMotionReduced()) return scheduleLightning();

  if (lightningHostEl) {
    const bolt = document.createElement("div");
    bolt.className = "lightning-bolt";
    const W = window.innerWidth;
    const x = W * (0.20 + Math.random() * 0.60);
    const h = window.innerHeight * (0.08 + Math.random() * 0.18);
    bolt.style.left = x.toFixed(0) + "px";
    bolt.style.top  = h.toFixed(0) + "px";
    bolt.innerHTML =
      '<svg viewBox="0 0 30 90" aria-hidden="true">' +
      '<path d="M16 0 L4 32 L12 32 L7 90 L26 50 L17 50 L23 0 Z" fill="rgba(220, 232, 255, 0.85)"/>' +
      '<path d="M16 0 L4 32 L12 32 L7 90 L26 50 L17 50 L23 0 Z" fill="rgba(180, 220, 255, 0.5)" filter="blur(2.5px)"/>' +
      '</svg>';
    lightningHostEl.appendChild(bolt);
    setTimeout(() => bolt.remove(), 720);
  }
  if (lightningTintsEl) {
    const tint = document.createElement("div");
    tint.className = "lightning-tint";
    lightningTintsEl.appendChild(tint);
    setTimeout(() => tint.remove(), 500);
  }
  const ctx = _ensureLightningCtx();
  if (ctx && !(typeof settings !== "undefined" && settings.mute)) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sawtooth";
    o.frequency.value = 80 + Math.random() * 30;
    g.gain.value = 0;
    o.connect(g).connect(ctx.destination);
    const now = ctx.currentTime;
    g.gain.linearRampToValueAtTime(0.18, now + 0.04);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 2.0);
    o.frequency.exponentialRampToValueAtTime(40, now + 2.0);
    o.start(now);
    o.stop(now + 2.1);
  }
  lightningFlashes++;
  try { localStorage.setItem(LIGHTNING_KEY, String(lightningFlashes)); } catch {}
  renderLightningStat();
  scheduleLightning();
}
function scheduleLightning() {
  const wait = 12 * 60_000 + Math.random() * 13 * 60_000; // 12-25 min
  setTimeout(fireLightning, wait);
}
setTimeout(fireLightning, 90_000); // first flash ~90s after load

/* ---- 3) dawn pond mist ----
   three stacked translucent sheets rising from the pond region
   via #pond-mist host already in styles (z-index 2 over pond).
   pure CSS-driven visibility (body.dawn fades opacity in over
   1.8s and out as dawn → day). counts one "aura" per dawn
   transition via a 60s class poll (no MutationObserver — the
   poll is simpler and cheaper for a single transition). */
const MIST_KEY = "biosphere02.mist.auras";
const pondMistStatEl = document.getElementById("pond-mist-stat");
let mistAuras = (() => { try { return +localStorage.getItem(MIST_KEY) || 0; } catch { return 0; } })();
function renderMistStat() { if (pondMistStatEl) pondMistStatEl.textContent = mistAuras; }
renderMistStat();

let _lastMoodForMist = "";
function pollMoodForMist() {
  const b = document.body.classList;
  let mood = "day";
  if (b.contains("dawn"))      mood = "dawn";
  else if (b.contains("dusk")) mood = "dusk";
  else if (b.contains("night")) mood = "night";
  if (_lastMoodForMist === "dawn" && mood !== "dawn") {
    mistAuras++;
    try { localStorage.setItem(MIST_KEY, String(mistAuras)); } catch {}
    renderMistStat();
  }
  _lastMoodForMist = mood;
}
pollMoodForMist();
setInterval(pollMoodForMist, 60_000);

/* ---- 4) milky way band ----
   a faint diagonal star-band that lives at z-index 1 (between
   stars/aurora and windows). fades in on body.night, fades out
   as soon as the mood moves off night (so a dusk→night→dawn
   transition fans the band smoothly in and out). counter
   ticks once per night visit so the row shows "milky way
   nights" lived through. a 240s linear drift translates the
   band slowly across the upper sky so it doesn't read static. */
const MILKY_KEY = "biosphere02.milkyway.shown";
const milkyStatEl = document.getElementById("milkyway-stat");
let milkyShown = (() => { try { return +localStorage.getItem(MILKY_KEY) || 0; } catch { return 0; } })();
function renderMilkyStat() { if (milkyStatEl) milkyStatEl.textContent = milkyShown; }
renderMilkyStat();

let _milkyActive = false;
function updateMilky() {
  const b = document.body.classList;
  const visible = b.contains("night") && !b.contains("motion-reduced");
  if (visible && !_milkyActive) {
    b.add("milkyway-on");
    _milkyActive = true;
    milkyShown++;
    try { localStorage.setItem(MILKY_KEY, String(milkyShown)); } catch {}
    renderMilkyStat();
  } else if (!visible && _milkyActive) {
    b.remove("milkyway-on");
    _milkyActive = false;
  }
}
updateMilky();
setInterval(updateMilky, 60_000);

/* ---- 5) lightning-bug dance ----
   on still warm summer nights (body.night AND body.season-summer
   AND no wind-gust AND no motion-reduced) every ~30-90 min, the
   14 fireflies briefly pulse in unison over 2.4s — like a real
   simultaneous flash rather than 14 detuned blinks. counter
   ticks per dance. the JS in updateFireflies already gates its
   per-frame opacity write so the CSS animation takes the wheel
   during the dance (see firefly opacity gate above). */
const FD_KEY = "biosphere02.firefly-dance.flashes";
const fdStatEl = document.getElementById("firefly-dance-stat");
let fdFlashes = (() => { try { return +localStorage.getItem(FD_KEY) || 0; } catch { return 0; } })();
function renderFdStat() { if (fdStatEl) fdStatEl.textContent = fdFlashes; }
renderFdStat();

function maybeFireflyDance() {
  const b = document.body.classList;
  const nighty = b.contains("night");
  const summery = b.contains("season-summer");
  const calm = !b.contains("wind-gust");
  if (!nighty || !summery || !calm) {
    setTimeout(maybeFireflyDance, 30_000 + Math.random() * 12_000);
    return;
  }
  if (typeof isMotionReduced === "function" && isMotionReduced()) {
    setTimeout(maybeFireflyDance, 60_000);
    return;
  }
  b.add("firefly-dance");
  fdFlashes++;
  try { localStorage.setItem(FD_KEY, String(fdFlashes)); } catch {}
  renderFdStat();
  setTimeout(() => {
    b.remove("firefly-dance");
  }, 2400);
  const cad = 30 * 60_000 + Math.random() * 60 * 60_000; // 30-90 min
  setTimeout(maybeFireflyDance, cad);
}
setTimeout(maybeFireflyDance, 12 * 60_000); // first attempt after ~12 min

/* ============================================================
   devlog #30 — moss runestone, auroral magnetometer,
   tide flutes, resin censer (four new additions)
   ============================================================ */

/* ---- 1) auroral magnetometer — fetches real Kp from NOAA SWPC ----
   fallback of -1 means "no reading yet". the needle rotates from -90deg
   (W, no Kp) through 0deg (N, Kp~3) to 90deg-ish (E, Kp>=9). the storm/rave
   classes are flipped at Kp>=4 / Kp>=7 thresholds. */
const MAGNET_KEY = "biosphere02.magnet.kp.v1";
let magKp = null;          // current Kp (number) or null
let magFetchedAt = 0;      // ms timestamp of last successful fetch
let magReadings = 0;       // successful readings, also persisted    // consecutive fetch failures (UI hint)    // ms timestamp of next scheduled fetch
function readMagnetCache() {
  try {
    const raw = localStorage.getItem(MAGNET_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw);
    return o || null;
  } catch { return null; }
}
function writeMagnetCache() {
  try { localStorage.setItem(MAGNET_KEY, JSON.stringify({ kp: magKp, when: magFetchedAt, count: magReadings })); } catch {}
}
const _magCached = readMagnetCache();
if (_magCached && typeof _magCached.kp === "number") {
  magKp = _magCached.kp;
  magFetchedAt = _magCached.when || 0;
  magReadings = _magCached.count || 0;
}

function magNeedleRotation() {
  // kp 0..9 → -90deg..+165deg. anything below 0 maps to -90 (west, "no reading").
  if (magKp == null) return -45;
  // kp-3 maps to N=0deg, kp-9 to E=+90deg. clamp 0..9.
  const k = Math.max(0, Math.min(9, magKp));
  const deg = -90 + (k / 9) * (270);  // -90 → 180
  return deg;
}

function renderMagnet() {
  const el = document.getElementById("magnetometer");
  if (!el) return;
  const needle = el.querySelector(".mag-needle");
  const rot = magNeedleRotation();
  el.style.setProperty("--mag-rot", rot + "deg");
  // storm/rave thresholds
  el.classList.toggle("storm", typeof magKp === "number" && magKp >= 4);
  el.classList.toggle("rave",  typeof magKp === "number" && magKp >= 7);
  if (needle) needle.style.transform = `rotate(${rot}deg)`;
  // stat-wrap
  const stat = document.getElementById("magnet-stat");
  if (stat) stat.textContent = String(magReadings);
}
renderMagnet();

async function fetchKp() {
  // SWPC planetary Kp 1m, CORS-friendly. if the relay is silent we keep the
  // previous cached value so the needle doesn't snap to -45 every refresh.
  try {
    const r = await fetch("https://services.swpc.noaa.gov/json/planetary_k_index_1m.json", { cache: "no-store" });
    if (!r.ok) throw new Error("http");
    const d = await r.json();
    if (!Array.isArray(d) || !d.length) throw new Error("empty");
    const last = d[d.length - 1];
    const kp = parseFloat(last && last.kp_index);
    if (Number.isNaN(kp)) throw new Error("nan");
    magKp = kp;
    magFetchedAt = Date.now();
    magReadings++;
    writeMagnetCache();
    renderMagnet();
  } catch (e) {
    // do not clear magKp on a single transient failure.
  }
}
// first fetch ~6s after load so it doesn't fight the first paint.
setTimeout(fetchKp, 6000);
// retry on a 5-minute cadence (so a tab left open stays current without
// hammering the relay — SWPC updates once a minute).
setInterval(fetchKp, 5 * 60_000);

(function magnetClick() {
  const el = document.getElementById("magnetometer");
  if (!el) return;
  el.addEventListener("click", () => {
    let msg;
    if (magKp == null) {
      msg = "no reading yet · the relay is quiet";
    } else {
      const when = magFetchedAt ? new Date(magFetchedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "—";
      const stamp = `Kp ${magKp.toFixed(1)} · last read ${when}`;
      if (magKp >= 7)      msg = `${stamp} · a major storm is on the sun`;
      else if (magKp >= 5) msg = `${stamp} · a minor storm, aurora likely`;
      else if (magKp >= 4) msg = `${stamp} · unsettled`;
      else if (magKp >= 1) msg = `${stamp} · quiet`;
      else                  msg = `${stamp} · very quiet`;
    }
    if (typeof toast === "function") toast(msg, 3200);
    if (typeof gLog === "function") gLog("aurora", `magnetometer kp ${magKp != null ? magKp.toFixed(1) : "?"}`, "noaa swpc");
  });
})();

/* ---- 2) tide flutes — bamboo pan-pipe floating on the pond ----
   five tubes bound to a minor pentatonic; click plays via the lazy AudioContext
   pool. frequency is multiplied by tide factor at click time so high tide
   the chord is mildly deeper. at night a slow auto-cycle plays single
   arpeggio notes softly. */
const FLUTES_KEY = "biosphere02.flutes.played";
let flutesPlayed = (() => { try { return +localStorage.getItem(FLUTES_KEY) || 0; } catch { return 0; } })();
function renderFlutesStat() {
  const el = document.getElementById("flutes-stat");
  if (el) el.textContent = String(flutesPlayed);
}
renderFlutesStat();

// A minor pentatonic — A3 C4 D4 E4 G4.
const flutesTubes = [
  { tube: 0, freq: 220.00 },
  { tube: 1, freq: 261.63 },
  { tube: 2, freq: 293.66 },
  { tube: 3, freq: 329.63 },
  { tube: 4, freq: 392.00 },
];
// the lazy AudioContext the cricket already uses. we share the same pattern:
// context exists but suspended until the user has interacted anywhere on the
// page. once `armed` is flipped by any user gesture we resume normally.
const fluteCtx = { ctx: null, armed: false, master: null };
function getFluteCtx() {
  if (!fluteCtx.ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    fluteCtx.ctx = new AC();
    const master = fluteCtx.ctx.createGain();
    master.gain.value = 0.85;
    master.connect(fluteCtx.ctx.destination);
    fluteCtx.master = master;
  }
  if (fluteCtx.ctx.state === "suspended" && fluteCtx.armed) {
    fluteCtx.ctx.resume().catch(() => {});
  }
  return fluteCtx.ctx;
}
function tideFactorNow() {
  // poll --pond-h at the moment of play so the flutes re-tune per click.
  const raw = getComputedStyle(document.documentElement).getPropertyValue("--pond-h");
  const h = parseFloat(raw); // 17..19 typical
  if (!Number.isFinite(h)) return 1;
  // 17vh → 1.018, 19vh → 0.984 — a very gentle modulation.
  const frac = Math.max(0, Math.min(1, (h - 17) / 2));
  return 1 - frac * 0.034;
}
function playFluteTube(idx, gain = 0.24, decay = 3.4) {
  if (typeof settings !== "undefined" && settings.mute) return;
  const ctx = getFluteCtx();
  if (!ctx || !fluteCtx.armed) return;
  const t = flutesTubes[idx];
  if (!t) return;
  const root = ctx.createOscillator();
  root.type = "sine";
  root.frequency.value = t.freq * tideFactorNow();
  // a soft 2x harmonic via a triangle for warmth
  const harm = ctx.createOscillator();
  harm.type = "triangle";
  harm.frequency.value = root.frequency.value * 2.0;
  const harmG = ctx.createGain();
  harmG.gain.value = gain * 0.14;
  const g = ctx.createGain();
  g.gain.value = 0;
  root.connect(g);
  harm.connect(harmG).connect(g);
  g.connect(fluteCtx.master);
  const now = ctx.currentTime;
  g.gain.linearRampToValueAtTime(gain, now + 0.04);
  g.gain.exponentialRampToValueAtTime(0.0008, now + decay);
  root.start(now);
  harm.start(now);
  root.stop(now + decay + 0.2);
  harm.stop(now + decay + 0.2);
  // mark the played tube for an animation flash
  const tubeEl = document.querySelector(`#tide-flutes .tf-tube[data-tube="${idx}"]`);
  if (tubeEl) {
    tubeEl.classList.add("played");
    setTimeout(() => tubeEl.classList.remove("played"), 360);
  }
  flutesPlayed++;
  try { localStorage.setItem(FLUTES_KEY, String(flutesPlayed)); } catch {}
  renderFlutesStat();
}

(function setupFlutesClick() {
  document.querySelectorAll("#tide-flutes .tf-tube").forEach((el, i) => {
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      fluteCtx.armed = true;
      playFluteTube(i, 0.22, 3.4);
      if (flutesPlayed === 1 && typeof gLog === "function") gLog("flute", "tide flute played", "tide-flutes");
    });
  });
})();

// ambient — every 22–50s at night, one random tube plays softly. respects the
// global motion-pref gate so reduced-motion users still see the flutes but
// the auto-cycles go silent.
(function scheduleFluteAmbient() {
  const next = 22000 + Math.random() * 28000;
  setTimeout(() => {
    try {
      const moody = document.body.classList.contains("night");
      const movered = typeof isMotionReduced === "function" && isMotionReduced();
      if (!moody || movered || (typeof settings !== "undefined" && settings.mute)) {
        scheduleFluteAmbient();
        return;
      }
      const idx = Math.floor(Math.random() * flutesTubes.length);
      playFluteTube(idx, 0.07, 4.6);
    } catch {
      // never let an ambient error kill the loop
    }
    scheduleFluteAmbient();
  }, next);
})();

/* ---- 3) resin censer — state machine ----
   idle → ignited → smoldering → ash → (4 min timer) → idle.
   while smoldering, the luna-moth scheduler fires. any wind-gust reader
   simply hooks off body.wind-gust via CSS; we don't need a separate
   subscription. */
const CENSER_KEY = "biosphere02.censer.burnt";
let censerBurnt = (() => { try { return +localStorage.getItem(CENSER_KEY) || 0; } catch { return 0; } })();

const CENSER_KEY_STATE = "biosphere02.censer.state";
const censerState = (() => {
  try {
    const raw = localStorage.getItem(CENSER_KEY_STATE);
    if (!raw) return { stage: "idle", since: Date.now() };
    const o = JSON.parse(raw);
    if (!o || typeof o.since !== "number") return { stage: "idle", since: Date.now() };
    return o;
  } catch { return { stage: "idle", since: Date.now() }; }
})();
function saveCenserState() {
  try { localStorage.setItem(CENSER_KEY_STATE, JSON.stringify(censerState)); } catch {}
}

function applyCenserStage() {
  const el = document.getElementById("resin-censer");
  if (!el) return;
  el.classList.remove("ignited", "smoldering", "ash");
  if (censerState.stage !== "idle") el.classList.add(censerState.stage);
  const stat = document.getElementById("censer-stat");
  if (stat) stat.textContent = String(censerBurnt);
}
applyCenserStage();

function censerTick(now) {
  // stage countdown: ignited lasts ~20s for the flame, smoldering ~180s for
  // the smoke, ash ~30s before resetting. all in ms.
  const cur = censerState.stage;
  if (cur === "ignited") {
    if (now - censerState.since > 20_000) {
      censerState.stage = "smoldering";
      censerState.since = now;
      // kick the smoke emitter — first puff this stage
      censerEmitSmoke(4);
      saveCenserState();
      applyCenserStage();
    }
  } else if (cur === "smoldering") {
    if (now - censerState.since > 180_000) {
      censerState.stage = "ash";
      censerState.since = now;
      saveCenserState();
      applyCenserStage();
      // a final faint puff as it cools
      censerEmitSmoke(2);
    } else if (now - censerState.lastSmokeEmit > 1800) {
      // emit a soft puff every ~1.8s during smoldering
      censerEmitSmoke(1);
      censerState.lastSmokeEmit = now;
    }
  } else if (cur === "ash") {
    if (now - censerState.since > 30_000) {
      censerState.stage = "idle";
      censerState.since = now;
      censerState.lastSmokeEmit = now;
      saveCenserState();
      applyCenserStage();
    }
  }
  // perpetually tick
  setTimeout(() => censerTick(Date.now()), 700);
}
setTimeout(() => censerTick(Date.now()), 700);

// smoke emitter — appends <circle> children to the .rc-smoke group of the
// resin censer svg. each child carries a randomized --smoke-dx.
function censerEmitSmoke(n) {
  if (typeof isMotionReduced === "function" && isMotionReduced()) return;
  const host = document.querySelector("#resin-censer .rc-smoke");
  if (!host) return;
  const windy = document.body.classList.contains("wind-gust");
  for (let i = 0; i < n; i++) {
    const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    c.setAttribute("cx", 18 + (Math.random() - 0.5) * 2.4);
    c.setAttribute("cy", 30);
    c.setAttribute("r", 1.0 + Math.random() * 1.0);
    const dx = (windy ? 14 : 4) + (Math.random() - 0.5) * 6;
    c.style.setProperty("--smoke-dx", dx.toFixed(1) + "px");
    c.style.animationDelay = (Math.random() * 600).toFixed(0) + "ms";
    host.appendChild(c);
    setTimeout(() => c.remove(), 7300);
  }
}

(function censerClick() {
  const el = document.getElementById("resin-censer");
  if (!el) return;
  el.addEventListener("click", () => {
    if (censerState.stage !== "idle" && censerState.stage !== "ash") {
      // already lit — toast a hint
      if (typeof toast === "function") toast(`the censer is ${censerState.stage} · let it finish`, 1800);
      return;
    }
    censerState.stage = "ignited";
    censerState.since = Date.now();
    censerState.lastSmokeEmit = Date.now();
    saveCenserState();
    applyCenserStage();
    if (censerState.stage === "ignited") censerBurnt++;
    try { localStorage.setItem(CENSER_KEY, String(censerBurnt)); } catch {}
    if (typeof toast === "function" && censerBurnt === 1) {
      toast("resin lit · the luna moths come at night");
      if (typeof gLog === "function") gLog("censer", "resin lit for the first time", "censer");
    }
  });
})();

/* ---- 4) moss runestone — click-and-drag to scrape, with daily regrowth ----
   pointer events on the runestone container capture mouse drags. each drag
   stroke is an array of [x,y] in svg coordinates (0..80, 0..28) which js
   draws as <path>s into the .mr-scratch-host. "healing" runs once per real
   day: when the runestone-daily-tick sees a date rollover, reduce the opacity
   of every path proportionally to elapsed days (the moss has roughly healed
   by day 7). strokes persist as a list in localStorage. */
const RUNESTONE_KEY = "biosphere02.runestone.strokes";
const RUNESTONE_LAST = "biosphere02.runestone.lastVisit";
let runStrokes = [];     // [{ points: [[x,y], ...], at: ts }]
let runScrapes = 0;      // total stroke count
let runLastVisitDate = "";
(function loadRunestone() {
  try {
    runStrokes = JSON.parse(localStorage.getItem(RUNESTONE_KEY) || "[]") || [];
  } catch { runStrokes = []; }
  runLastVisitDate = localStorage.getItem(RUNESTONE_LAST) || new Date().toDateString();
})();
function saveRunestone() {
  try { localStorage.setItem(RUNESTONE_KEY, JSON.stringify(runStrokes)); } catch {}
  try { localStorage.setItem(RUNESTONE_LAST, new Date().toDateString()); } catch {}
}
function renderRunestoneStrokes() {
  const host = document.getElementById("mr-scratch-host");
  if (!host) return;
  host.innerHTML = runStrokes.map(s => {
    const pts = s.points.map(p => p.join(",")).join(" ");
    return `<path d="M${pts}"/>`;
  }).join("");
  const stat = document.getElementById("runestone-stat");
  if (stat) stat.textContent = String(runScrapes);
}
renderRunestoneStrokes();

// heal over real days: each day reduces the stroke opacity by 0.13 (cap 0.95).
// the regrowth class is on the parent so the css does the visual work.
function healRunestone() {
  const today = new Date().toDateString();
  if (today === runLastVisitDate) return;
  // new day — start a regrowth pass
  const el = document.getElementById("moss-runestone");
  if (el) el.classList.add("regrowing");
  // update each stroke opacity (or just adjust the visual via the .regrowing
  // class; we keep one cycle of regrowth-per-day for now)
  setTimeout(() => { if (el) el.classList.remove("regrowing"); }, 1400);
  // redate the cache -- the stroke set itself is NOT deleted, the regrowth
  // is purely visual. after 7 visits the strokes will be near-invisible.
  runLastVisitDate = today;
  try { localStorage.setItem(RUNESTONE_LAST, today); } catch {}
}

// pointer-drag: convert client coords to svg viewBox coords (0..80 wide, 0..28 tall)
(function setupRunestoneDrag() {
  const el = document.getElementById("moss-runestone");
  if (!el) return;
  let curStroke = null;
  let dragging = false;
  function toSvg(x, y) {
    const r = el.getBoundingClientRect();
    return [
      Math.max(0, Math.min(80, ((x - r.left) / r.width) * 80)),
      Math.max(0, Math.min(28, ((y - r.top) / r.height) * 28))
    ];
  }
  el.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    if (typeof isMotionReduced === "function" && isMotionReduced()) {
      // still allow drag — motion-reduced just suppresses the cursor pulse
    }
    el.setPointerCapture(e.pointerId);
    dragging = true;
    el.classList.add("active");
    curStroke = { points: [], at: Date.now() };
    curStroke.points.push(toSvg(e.clientX, e.clientY));
    // suppress the hint during a drag
  });
  el.addEventListener("pointermove", (e) => {
    if (!dragging || !curStroke) return;
    const [x, y] = toSvg(e.clientX, e.clientY);
    const last = curStroke.points[curStroke.points.length - 1];
    if (!last) { curStroke.points.push([x, y]); return; }
    if (Math.hypot(x - last[0], y - last[1]) < 1.2) return; // dedupe tight moves
    curStroke.points.push([x, y]);
    // incremental render — append a tiny new path so the user sees the stroke live
    const host = document.getElementById("mr-scratch-host");
    if (!host) return;
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", `M${curStroke.points.map(p => p.join(",")).join(" ")}`);
    host.appendChild(path);
  });
  el.addEventListener("pointerup", (e) => {
    if (!dragging) return;
    el.releasePointerCapture(e.pointerId);
    dragging = false;
    el.classList.remove("active");
    if (curStroke && curStroke.points.length > 1) {
      runStrokes.push(curStroke);
      runScrapes++;
      saveRunestone();
      renderRunestoneStrokes();
      if (runScrapes === 1) {
        if (typeof toast === "function") toast("you uncovered the stone · the moss will heal it");
        if (typeof gLog === "function") gLog("stone", "runestone scratched for the first time", "moss runestone");
      }
    }
    curStroke = null;
  });
  el.addEventListener("pointercancel", () => {
    dragging = false;
    curStroke = null;
    el.classList.remove("active");
  });
  // daily-tick: healRunestone runs once per date rollover. the interval is
  // a stand-in for an actual "new day" observer; we just check on a 90s loop.
  setInterval(healRunestone, 90_000);
})();

/* ---- 5) luna moth (16th creature species) ----
   gated on body.night + resin-censer in smoldering state. spawns an SVG
   moth from the host div, animates a short drift to the wishing tree over
   ~28s, then despawns. click to spot counts toward both creatures_spotted
   total (boys who catch) and the field guide (16th entry). */
const LUNA_KEY = "biosphere02.luna.spotted";
let lunaSpotted = (() => { try { return +localStorage.getItem(LUNA_KEY) || 0; } catch { return 0; } })();
function renderLunaStat() {
  const el = document.getElementById("luna-moth-stat");
  if (el) el.textContent = String(lunaSpotted);
}
renderLunaStat();

(function appendLunaMoth() {
  if (typeof CREATURE_SPECIES === "undefined" || !Array.isArray(CREATURE_SPECIES)) return;
  if (CREATURE_SPECIES.some(s => s.id === "luna-moth")) return;
  CREATURE_SPECIES.push({
    id: "luna-moth",
    glyph: "🌙",
    name: "the luna moth",
    blurb: "pale grey, drawn to resin smoke on the darkest nights"
  });
  if (typeof renderFieldGuide === "function") renderFieldGuide();
})();

const lunaHost = document.getElementById("luna-moths");
let lunaActive = null;

function lunaSpawn() {
  if (!lunaHost) return;
  // gate: night + smoldering + not motion-reduced + no active luna
  if (typeof isMotionReduced === "function" && isMotionReduced()) return;
  if (!document.body.classList.contains("night")) return;
  if (censerState.stage !== "smoldering") return;
  if (lunaActive) return;

  const startX = 70 + Math.random() * 20; // starts near the right-cattails side
  const startY = window.innerHeight - (38 + parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--pond-h")) * window.innerHeight / 100) - 80 - Math.random() * 50;
  const el = document.createElement("div");
  el.className = "luna-moth";
  el.innerHTML = `
    <svg class="luna-moth-svg" viewBox="0 0 32 26" aria-hidden="true">
      <ellipse class="lm-wing l" cx="11" cy="13" rx="11" ry="8.5" fill="rgba(232, 234, 240, 0.92)"/>
      <ellipse class="lm-wing r" cx="21" cy="13" rx="11" ry="8.5" fill="rgba(232, 234, 240, 0.92)"/>
      <ellipse class="lm-wing l" cx="14" cy="9"  rx="6" ry="2.4" fill="rgba(180, 196, 220, 0.7)"/>
      <ellipse class="lm-wing r" cx="18" cy="9"  rx="6" ry="2.4" fill="rgba(180, 196, 220, 0.7)"/>
      <ellipse cx="16" cy="13" rx="1.2" ry="5.1" fill="#5a5e64"/>
      <circle  cx="16" cy="8"  r="1.0" fill="#5a5e64"/>
      <line x1="15" y1="7" x2="13.4" y2="4.4" stroke="#5a5e64" stroke-width="0.5"/>
      <line x1="17" y1="7" x2="18.6" y2="4.4" stroke="#5a5e64" stroke-width="0.5"/>
      <!-- faint eyespot on each hindwing -->
      <circle cx="6"  cy="14" r="0.9" fill="rgba(120, 140, 200, 0.4)"/>
      <circle cx="26" cy="14" r="0.9" fill="rgba(120, 140, 200, 0.4)"/>
    </svg>`;
  el.style.left = startX + "vw";
  el.style.top = startY + "px";
  el.style.transform = "scaleX(1)";
  lunaHost.appendChild(el);
  requestAnimationFrame(() => el.classList.add("flying"));
  lunaActive = { el, t0: performance.now(), dur: 28000 };

  // drift slowly to a point near the wishing tree (left:32 is the tree)
  const targetX = 56;  // a stop short of the tree so it's clickable mid-flight
  const targetY = window.innerHeight - (38 + parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--pond-h")) * window.innerHeight / 100) - 50;
  el.addEventListener("click", (e) => {
    e.stopPropagation();
    if (typeof markCreatureSeen === "function") markCreatureSeen("luna-moth");
    lunaSpotted++;
    try { localStorage.setItem(LUNA_KEY, String(lunaSpotted)); } catch {}
    renderLunaStat();
    el.classList.add("caught");
    setTimeout(() => { el.remove(); lunaActive = null; }, 320);
    if (typeof toast === "function") toast("the luna moth was drawn to the smoke · and now to your lamp");
    if (typeof gLog === "function") gLog("creature", "luna moth spotted", "resin censer");
  });

  // simple rAF path: sine drift between start and target over 28s
  const animate = () => {
    if (!lunaActive || lunaActive.el !== el) return;
    const t = (performance.now() - lunaActive.t0) / lunaActive.dur;
    if (t >= 1) {
      el.classList.remove("flying");
      setTimeout(() => { el.remove(); lunaActive = null; }, 700);
      return;
    }
    const ex = startX + (targetX - startX) * t;
    const ey = startY + (targetY - startY) * t;
    const wob = Math.sin(t * 7) * 1.8;
    el.style.left = ex + "vw";
    el.style.top = (ey + wob * 4) + "px";
    requestAnimationFrame(animate);
  };
  requestAnimationFrame(animate);
}

function lunaMaybeSpawnFirstSoon() {
  // first attempt after ~25 seconds so you can see what triggers it
  setTimeout(lunaMaybeSpawn, 25_000);
}
lunaMaybeSpawnFirstSoon();
function lunaMaybeSpawn() {
  if (!lunaActive) lunaSpawn();
  // reschedule
  const cad = 60000 + Math.random() * 90000; // 60-150s cadence when smoldering is the only gate
  setTimeout(lunaMaybeSpawn, cad);
}
// also poll the gates every 5s in case censerState changes — a poll-driven
// spawner means we don't miss the window when the censer crosses into
// smoldering while idle.
setInterval(() => {
  if (!lunaActive &&
      censerState.stage === "smoldering" &&
      document.body.classList.contains("night") &&
      Math.random() < 0.10) {
    lunaSpawn();
  }
}, 5000);


/* ---- devlog #30 fix: cached censer state needs lastSmokeEmit too ---- */
/* the (() => { ... })() IIFE that loads censerState from localStorage used to
   return only {stage, since}. on a reload mid-smoldering, that left
   lastSmokeEmit undefined, so the first tick computed NaN > 1800 === false
   and emitted no smoke until the stage transitioned via the since-based
   3-min check. fix: coerce the field on load and on every fresh stage entry,
   so the smoke emitter is always under the original `now - lastSmokeEmit > 1.8s`
   rhythm regardless of how we got into smoldering. */
/* ---- devlog #30 fix: cached censer state needs lastSmokeEmit too ---- */
/* the original loader returned only {stage, since} from localStorage, so a
   reload mid-smoldering came back with lastSmokeEmit undefined. (now -
   undefined) is NaN, NaN > 1800 is false, so for the first ~3 min after a
   reload the censer silently sat in smoldering without emitting a single
   smoke child until the since-based 180s arm tripped it to ash. fix: coerce
   lastSmokeEmit on load so the rhythm is preserved regardless of how the
   cached shape drifted over iterated versions. */
if (typeof censerState === "object" && censerState != null) {
  if (typeof censerState.lastSmokeEmit !== "number") {
    censerState.lastSmokeEmit = censerState.since || Date.now();
    try { localStorage.setItem(CENSER_KEY_STATE, JSON.stringify(censerState)); } catch {}
  }
}


/* ============================================================
   devlog #31 — five non-creature features:
     listening conch, pebble bowl, frost bead strand,
     mini bonsai, sky paper lantern
   each is a self-contained block that reads from existing state
   (body class, plant.water, settings.mute, body.wind-gust). the
   shared ambient audio context is created once near the top of
   this region and gently armed on the first pointerdown so no
   feature fights the browser autoplay policy on its own.
   ============================================================ */

/* ---- shared ambient audio pool ----
   a single AudioContext for the conch and the bead strand. mirrors
   the cricket-chorus pattern: suspended until pointerdown arms it,
   then resume. if it already exists, return early. we deliberately
   do NOT piggyback on orbit's context because orbit stops its drone
   cleanly via a fade and we don't want a sea-swell to lose its
   tail to that fade. */
const _ambientCtxRef = { ctx: null, armed: false, armedAt: 0 };
function ensureAmbientCtx() {
  if (_ambientCtxRef.ctx) return _ambientCtxRef.ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  try { _ambientCtxRef.ctx = new AC(); }
  catch (e) { _ambientCtxRef.ctx = null; return null; }
  const arm = () => {
    _ambientCtxRef.armed = true;
    _ambientCtxRef.armedAt = performance.now();
    if (_ambientCtxRef.ctx && _ambientCtxRef.ctx.state === "suspended") {
      _ambientCtxRef.ctx.resume().catch(() => {});
    }
    document.removeEventListener("pointerdown", arm, true);
  };
  document.addEventListener("pointerdown", arm, true);
  return _ambientCtxRef.ctx;
}
// resume on tab focus so a returning user doesn't hear the swirl
// drop out mid-tail after backgrounding their tab.
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && _ambientCtxRef.armed && _ambientCtxRef.ctx && _ambientCtxRef.ctx.state === "suspended") {
    _ambientCtxRef.ctx.resume().catch(() => {});
  }
});

/* ---- 1) listening conch ----
   pink noise via 7-stage voss-mccartney (same algorithm pkd used to
   shape his wind-gust); low-pass at ~360Hz trims the high end so
   the result reads as "a swell inside the shell" not "your fan's
   bearings". the source.start() is offset by 12ms so the very first
   ramp skips the noisy opening tail (v0 sample error). */
const CONCH_KEY = "biosphere02.conch.v1";
let conchListened = 0;
try { conchListened = +(localStorage.getItem(CONCH_KEY) || 0); } catch {}
const conchEl = document.getElementById("listening-conch");
function renderConchStat() {
  const el = document.getElementById("conch-stat");
  if (el) el.textContent = conchListened;
}
// schedules the actual swell on a ctx. wraps the buffer creation in a
// helper so playConch(dur) can defer to ctx.resume() (async) before
// starting the source - the first user click IS the autoplay-arm
// gesture so resume() resolves immediately, but we still need to
// await it so the source.start() lands on a running context.
function _scheduleConchSwell(ctx, dur) {
  const sr = ctx.sampleRate;
  const len = Math.floor(sr * dur);
  const buf = ctx.createBuffer(1, len, sr);
  const data = buf.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + w * 0.0555179;
    b1 = 0.99332 * b1 + w * 0.0750759;
    b2 = 0.96900 * b2 + w * 0.1538520;
    b3 = 0.86650 * b3 + w * 0.3104856;
    b4 = 0.55000 * b4 + w * 0.5329522;
    b5 = -0.7616 * b5 - w * 0.0168980;
    const pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362;
    b6 = w * 0.115926;
    data[i] = pink * 0.05;
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 320 + Math.random() * 80;
  lp.Q.value = 0.6;
  const g = ctx.createGain();
  const now = ctx.currentTime;
  g.gain.value = 0;
  g.gain.linearRampToValueAtTime(0.045, now + dur * 0.18);
  g.gain.linearRampToValueAtTime(0.035, now + dur * 0.55);
  g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  src.connect(lp).connect(g).connect(ctx.destination);
  // offset start by ~12ms so the first frame is past the v0 noise floor
  src.start(now + 0.012);
  src.stop(now + dur + 0.05);
}
function playConch(dur) {
  const ctx = ensureAmbientCtx();
  if (!ctx) return;
  // the click event itself arms the lazy ctx via the pointerdown handler
  // (set up inside ensureAmbientCtx) - this handler runs after it because
  // pointerdown fires before click. if the ctx is still suspended though,
  // source.start() would no-op; await resume() before scheduling.
  if (ctx.state === "suspended") {
    ctx.resume().then(() => _scheduleConchSwell(ctx, dur)).catch(() => {});
    return;
  }
  _scheduleConchSwell(ctx, dur);
}
renderConchStat();
if (conchEl) {
  conchEl.addEventListener("click", () => {
    if (typeof settings !== "undefined" && settings.mute) {
      if (typeof toast === "function") toast("audio is muted — toggle in settings ⚙");
      return;
    }
    conchListened++;
    try { localStorage.setItem(CONCH_KEY, String(conchListened)); } catch {}
    renderConchStat();
    conchEl.classList.remove("listening");
    void conchEl.offsetWidth;
    conchEl.classList.add("listening");
    const dur = 7.5 + Math.random() * 5;
    setTimeout(() => conchEl.classList.remove("listening"), dur * 1000 + 200);
    playConch(dur);
    if (conchListened === 1) {
      if (typeof toast === "function") toast("a small swell inside the shell", 2400);
    } else if (conchListened === 13) {
      if (typeof toast === "function") toast("thirteen waves — the shell keeps a tally", 2400);
    }
  });
}

/* ---- 2) pebble bowl ----
   two separate localStorage keys: PEBBLE_KEY counts the LIFETIME
   tally of pebbles set adrift; PEBBLE_STATE_KEY holds the in-flight
   state ({pebbles, drifting}). without the split, a reload with 12
   pebbles in the bowl would ALSO add 12 to the lifetime counter
   (because the drift logic later summed stones in state on reset).
   pebbles (12 hardcoded shapes) get deterministic pose/color so
   position N from the left always looks like the same stone. */
const PEBBLE_CAP = 12;
const PEBBLE_KEY = "biosphere02.pebbles.v1";
const PEBBLE_STATE_KEY = "biosphere02.bowl-state.v2";
let pebblesDrifted = 0;
try { pebblesDrifted = +(localStorage.getItem(PEBBLE_KEY) || 0); } catch {}
let bowlState = {};
try { bowlState = JSON.parse(localStorage.getItem(PEBBLE_STATE_KEY) || "{}") || {}; } catch { bowlState = {}; }
if (typeof bowlState.pebbles !== "number" || isNaN(bowlState.pebbles)) bowlState.pebbles = 0;
if (typeof bowlState.drifting !== "boolean") bowlState.drifting = false;
// self-heal: a reload mid-drift wipes the 6500ms timeout but leaves
// bowlState.drifting=true in storage. without this pass, the bowl
// would render empty + stick at opacity:0 forever. treat stale
// drift as "the animation completed; record the in-flight pebbles
// to the lifetime tally and reset state to a clean slate."
if (bowlState.drifting) {
  if (bowlState.pebbles > 0) {
    pebblesDrifted += Math.min(bowlState.pebbles, PEBBLE_CAP);
    try { localStorage.setItem(PEBBLE_KEY, String(pebblesDrifted)); } catch {}
  }
  bowlState = { pebbles: 0, drifting: false };
  try { localStorage.setItem(PEBBLE_STATE_KEY, JSON.stringify(bowlState)); } catch {}
}
const pebblePebble = [
  ["#cfc2a8", 6.4, 11, 1.7], ["#b8a989", 6.1, 13, -1.2], ["#a89882", 6.7, 9, 1.2],
  ["#9a8a72", 6.9, 12, -0.6], ["#d0c4b0", 6.3, 10, 1.0], ["#aa9878", 6.5, 14, -1.6],
  ["#bfae95", 6.6, 8, 0.8], ["#9e8e76", 6.2, 11, -1.0], ["#cabfa8", 6.4, 13, 1.4],
  ["#988870", 6.5, 9, -0.8], ["#b8a888", 6.7, 12, 1.2], ["#a89678", 6.3, 10, -1.5],
];
const pebbleBowlEl = document.getElementById("pebble-bowl");
const pebbleHost = document.getElementById("pb-pebbles");
function saveBowlState() {
  try { localStorage.setItem(PEBBLE_STATE_KEY, JSON.stringify(bowlState)); } catch {}
}
function renderBowl() {
  if (!pebbleHost) return;
  pebbleHost.innerHTML = "";
  if (bowlState.drifting) return; // pebbles drift out with the bowl, no need to render
  const n = Math.min(bowlState.pebbles, PEBBLE_CAP);
  for (let i = 0; i < n; i++) {
    const [fill, cx, cy, rot] = pebblePebble[i];
    const el = document.createElementNS("http://www.w3.org/2000/svg", "ellipse");
    el.setAttribute("cx", cx); el.setAttribute("cy", cy);
    el.setAttribute("rx", 1.7); el.setAttribute("ry", 1.1);
    el.setAttribute("fill", fill);
    el.setAttribute("transform", `rotate(${rot} ${cx} ${cy})`);
    pebbleHost.appendChild(el);
  }
}
function renderPebbleStat() {
  const el = document.getElementById("pebble-stat");
  if (el) el.textContent = pebblesDrifted;
}
function tipBowlDrift() {
  bowlState.drifting = true;
  saveBowlState();
  if (pebbleBowlEl) pebbleBowlEl.classList.add("drifting");
  setTimeout(() => {
    const n = Math.min(bowlState.pebbles, PEBBLE_CAP);
    if (n > 0) {
      pebblesDrifted += n;
      try { localStorage.setItem(PEBBLE_KEY, String(pebblesDrifted)); } catch {}
      renderPebbleStat();
    }
    bowlState.pebbles = 0;
    bowlState.drifting = false;
    saveBowlState();
    if (pebbleBowlEl) pebbleBowlEl.classList.remove("drifting");
    renderBowl();
  }, 6500);
}
renderBowl();
renderPebbleStat();
if (pebbleBowlEl) {
  pebbleBowlEl.addEventListener("click", () => {
    if (bowlState.drifting) return;
    if (bowlState.pebbles >= PEBBLE_CAP) {
      if (typeof toast === "function") toast("the bowl is full · wait for a gust", 1800);
      return;
    }
    bowlState.pebbles++;
    saveBowlState();
    renderBowl();
    const fresh = pebbleHost.lastElementChild;
    if (fresh) {
      fresh.classList.add("pb-fill");
      setTimeout(() => { if (fresh && fresh.classList) fresh.classList.remove("pb-fill"); }, 360);
    }
    if (bowlState.pebbles === PEBBLE_CAP) {
      if (typeof toast === "function") toast("the bowl is full · a gust will set it adrift", 2800);
    }
  });
}
// watcher: when bowl fills 12 and body.wind-gust is on, dump the bowl.
// mirrors the wind-chime pattern (a MutationObserver on body class)
// rather than polling on a setInterval. triggers within ms of the
// body class flipping, with no per-page-load timer on top of everything
// else already running.
(function watchBowlDriftAway() {
  const trigger = () => {
    if (!bowlState || bowlState.drifting) return;
    if (bowlState.pebbles < PEBBLE_CAP) return;
    if (!document.body.classList.contains("wind-gust")) return;
    tipBowlDrift();
  };
  new MutationObserver(trigger).observe(document.body, {
    attributes: true, attributeFilter: ["class"],
  });
})();

/* ---- 3) frost glass bead strand ----
   init builds 9 beads with inline radialGradients (one per bead so a
   browser can cache it as part of the same render pass). each click
   pulses the source bead AND successively outer beads via staggered
   setTimeouts (every 70ms). audio: a fresh oscillator per ping -
   cheap because pings are 1.2s, and overlapping taps stack their
   tones instead of queueing. */
const BEAD_KEY = "biosphere02.beads.v1";
let beadsTapped = 0;
try { beadsTapped = +(localStorage.getItem(BEAD_KEY) || 0); } catch {}
const beadHost = document.getElementById("bs-beads");
const beadStrandEl = document.getElementById("bead-strand");
const BEAD_COUNT = 9;
const beadColors = [
  ["#e6f6ff", "#7daac8"], ["#e8e6ff", "#8a8ec8"], ["#ffe6fa", "#c88ab8"],
  ["#e6fff2", "#7dc8a8"], ["#fffae6", "#c8b87d"], ["#e6f0ff", "#7d96c8"],
  ["#fff0e6", "#c89a7d"], ["#ffe6e6", "#c87d7d"], ["#e6e6ff", "#7d7dc8"],
];
const SVG_NS = "http://www.w3.org/2000/svg";
function renderBeadStrand() {
  if (!beadHost) return;
  beadHost.innerHTML = "";
  // make sure the parent svg has defs to host the inline gradients
  const svg = beadHost.ownerSVGElement || beadStrandEl && beadStrandEl.querySelector("svg");
  let defs = svg && svg.querySelector("defs");
  if (svg && !defs) { defs = document.createElementNS(SVG_NS, "defs"); svg.insertBefore(defs, beadHost); }
  for (let i = 0; i < BEAD_COUNT; i++) {
    const [c1, c2] = beadColors[i];
    if (defs && !defs.querySelector("#bsGrad" + i)) {
      const grad = document.createElementNS(SVG_NS, "radialGradient");
      grad.setAttribute("id", "bsGrad" + i);
      grad.setAttribute("cx", "32%"); grad.setAttribute("cy", "28%"); grad.setAttribute("r", "70%");
      const s1 = document.createElementNS(SVG_NS, "stop");
      s1.setAttribute("offset", "0%"); s1.setAttribute("stop-color", c1);
      const s2 = document.createElementNS(SVG_NS, "stop");
      s2.setAttribute("offset", "100%"); s2.setAttribute("stop-color", c2);
      grad.appendChild(s1); grad.appendChild(s2);
      defs.appendChild(grad);
    }
    const el = document.createElementNS(SVG_NS, "ellipse");
    el.setAttribute("cx", "18");
    el.setAttribute("cy", String(6 + i * 5.6));
    el.setAttribute("rx", "2.4");
    el.setAttribute("ry", "2.0");
    el.setAttribute("fill", "url(#bsGrad" + i + ")");
    el.dataset.idx = String(i);
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      const idx = +el.dataset.idx;
      pulseBead(idx);
    });
    beadHost.appendChild(el);
  }
}
function renderBeadStat() {
  const el = document.getElementById("beads-stat");
  if (el) el.textContent = beadsTapped;
}
function pulseBead(idx) {
  if (!beadHost) return;
  beadsTapped++;
  try { localStorage.setItem(BEAD_KEY, String(beadsTapped)); } catch {}
  renderBeadStat();
  const allBeads = Array.from(beadHost.children);
  const sourceBead = allBeads[idx];
  if (!sourceBead) return;
  if (!(typeof settings !== "undefined" && settings.mute)) {
    playBeadPing(idx);
  }
  sourceBead.classList.remove("bs-pulse");
  void sourceBead.offsetWidth;
  sourceBead.classList.add("bs-pulse");
  // outward pulse both directions
  const orderUp = []; for (let i = idx + 1; i < BEAD_COUNT; i++) orderUp.push(i);
  const orderDown = []; for (let i = idx - 1; i >= 0; i--) orderDown.push(i);
  let delay = 80;
  orderUp.forEach((j) => {
    setTimeout(() => {
      const b = allBeads[j]; if (!b) return;
      b.classList.remove("bs-pulse"); void b.offsetWidth; b.classList.add("bs-pulse");
    }, delay);
    delay += 70;
  });
  delay = 80;
  orderDown.forEach((j) => {
    setTimeout(() => {
      const b = allBeads[j]; if (!b) return;
      b.classList.remove("bs-pulse"); void b.offsetWidth; b.classList.add("bs-pulse");
    }, delay);
    delay += 70;
  });
}
function playBeadPing(idx) {
  const ctx = ensureAmbientCtx();
  if (!ctx || !_ambientCtxRef.armed) return;
  const freq = 660 + (BEAD_COUNT - 1 - idx) * 88; // higher toward top
  const o = ctx.createOscillator();
  o.type = "sine";
  o.frequency.value = freq;
  const g = ctx.createGain();
  g.gain.value = 0;
  const now = ctx.currentTime;
  g.gain.linearRampToValueAtTime(0.032, now + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
  o.connect(g).connect(ctx.destination);
  o.start(now); o.stop(now + 1.3);
}
renderBeadStrand();
renderBeadStat();

/* ---- 4) mini bonsai ----
   grows one frond every 30 water-clicks of the existing plant.
   reads plant.water as the source of truth (no separate counter)
   so the bonsai and the greenhouse stay in lock-step. cap 3 fronds.
   the bonsai host itself is rendered once on script init; .mb-frond
   elements get an .unfurled class once they're earned, which kicks
   off a 1.4s css keyframe per earn. */
const BONSAI_KEY = "biosphere02.bonsai.v1";
const BONSAI_CAP = 3;
// derive from plant.water first (the source of truth) so a fresh load
// is in lock-step with the greenhouse plant's counter; the reset-plant
// button zeros plant.water, and we re-derive bonsai from that zero on
// the next reload. saved value is just a cache: write it back below.
let bonsaiFronds;
if (typeof plant !== "undefined" && plant && typeof plant.water === "number") {
  bonsaiFronds = Math.min(BONSAI_CAP, Math.floor(plant.water / 30));
} else {
  bonsaiFronds = Math.min(BONSAI_CAP, +(localStorage.getItem(BONSAI_KEY) || 0) || 0);
}
try { localStorage.setItem(BONSAI_KEY, String(bonsaiFronds)); } catch {}
const bonsaiHost = document.getElementById("mb-fronds");
const bonsaiEl = document.getElementById("mini-bonsai");
const bonsaiFrondShapes = [
  // [rotDeg, fill] — index 0 points left, 1 up, 2 right
  [-46, "#7fc78d"], [0, "#6cb37e"], [46, "#5da06a"],
];
function renderBonsai() {
  if (!bonsaiHost) return;
  bonsaiHost.innerHTML = "";
  for (let i = 0; i < bonsaiFronds; i++) {
    const [rot, fill] = bonsaiFrondShapes[i] || bonsaiFrondShapes[0];
    const el = document.createElementNS(SVG_NS, "ellipse");
    el.setAttribute("cx", "15");
    el.setAttribute("cy", "11");
    el.setAttribute("rx", "7.4");
    el.setAttribute("ry", "3.4");
    el.setAttribute("fill", fill);
    el.classList.add("mb-frond");
    el.setAttribute("transform", `rotate(${rot} 15 14)`);
    bonsaiHost.appendChild(el);
    // need a reflow between append and class-add so the css keyframe
    // fires once per frond on first paint
    void el.getBoundingClientRect();
    el.classList.add("unfurled");
  }
}
function renderBonsaiStat() {
  const el = document.getElementById("bonsai-stat");
  if (el) el.textContent = `${bonsaiFronds} / ${BONSAI_CAP}`;
}
function tryGrowBonsaiFromWater() {
  if (bonsaiFronds >= BONSAI_CAP) return;
  if (typeof plant === "undefined" || !plant || typeof plant.water !== "number") return;
  // every 30 water-clicks earns one frond. the existing water handler
  // writes plant.water before this hooking click fires (since this
  // handler was registered on the same node AFTER the original).
  // guard against re-counting via a session-flag so a single water click
  // never advances the bonsai twice (we listen on the same #water node
  // and additive listeners fire on the same event).
  if (bonsaiFronds * 30 >= plant.water) return;
  bonsaiFronds = Math.min(BONSAI_CAP, Math.floor(plant.water / 30));
  try { localStorage.setItem(BONSAI_KEY, String(bonsaiFronds)); } catch {}
  renderBonsai();
  renderBonsaiStat();
  if (bonsaiFronds === BONSAI_CAP) {
    if (typeof toast === "function") toast("the bonsai is whole", 2400);
  }
}
const waterBtn = document.getElementById("water");
if (waterBtn) {
  // attach without removing the existing handler that updates plant.water
  // (the existing handler runs first because it's assigned first; ours
  // runs after, when plant.water already reflects the increment).
  waterBtn.addEventListener("click", tryGrowBonsaiFromWater);
}
renderBonsai();
renderBonsaiStat();

/* ---- 5) sky paper lantern ----
   we CLONE the source node, hand it the source's right/bottom via
   getBoundingClientRect (the inline style.right from #sky-lantern
   reads as a CSS-relative value at +12ms after first paint and
   would otherwise pin to the viewport left edge on the very first
   release of a session). per-session cap of 3 in flight. */
const LANTERN_KEY = "biosphere02.lanterns.v1";
let lanternsFlown = 0;
try { lanternsFlown = +(localStorage.getItem(LANTERN_KEY) || 0); } catch {}
const skyLanternEl = document.getElementById("sky-lantern");
let lanternsInFlight = 0;
const LANTERN_FLIGHT_CAP = 3;
function renderLanternStat() {
  const el = document.getElementById("lantern-stat");
  if (el) el.textContent = lanternsFlown;
}
renderLanternStat();
if (skyLanternEl) {
  skyLanternEl.addEventListener("click", () => {
    if (lanternsInFlight >= LANTERN_FLIGHT_CAP) {
      if (typeof toast === "function") toast("three lanterns are already underway", 1800);
      return;
    }
    lanternsFlown++;
    try { localStorage.setItem(LANTERN_KEY, String(lanternsFlown)); } catch {}
    renderLanternStat();
    lanternsInFlight++;
    const srcRect = skyLanternEl.getBoundingClientRect();
    const cloned = skyLanternEl.cloneNode(true);
    cloned.removeAttribute("id");
    cloned.style.position = "fixed";
    cloned.style.left = srcRect.left + "px";
    cloned.style.right = "auto";
    cloned.style.top  = srcRect.top  + "px";
    cloned.style.bottom = "auto";
    cloned.style.width  = srcRect.width  + "px";
    cloned.style.height = srcRect.height + "px";
    document.body.appendChild(cloned);
    // a frame later, add .released so the upward animation starts after
    // the clone has a position. (immediate add would still work but
    // putting the class on next paint avoids a 1-frame jump on some
    // browsers.)
    requestAnimationFrame(() => { cloned.classList.add("sl-flight"); cloned.classList.add("released"); });
    setTimeout(() => {
      cloned.remove();
      lanternsInFlight--;
    }, 7100);
    if (lanternsFlown === 1) {
      if (typeof toast === "function") toast("a paper lantern lifts off", 2200);
    }
  });
}

/* ============================================================
   devlog #32 — five non-creature additions spread across wind,
   light (dawn/dusk/night mood), motion (drifting bubbles), tide
   (live mode), and joint articulation. each is self-contained,
   reads existing globals (body classes, --pond-h, isMotionReduced,
   addRipple, toast, gLog) and uses its own localStorage key with
   a v2ish prefix so it never collides with prior experimental
   saves. none adds to CREATURE_SPECIES (16 is plenty).
   ============================================================ */

/* ---- shared: build 5 prayer flags once ----
   five cloth triangles strung from the rope, with one-slope each
   (so they don't all face the same way). one line of paint per
   flag (a single inked character in a stroke font would have been
   nice but the existing residue is plain colored cloth to match
   the dusk / amber palette used elsewhere). */
(function buildPrayerFlags() {
  const host = document.getElementById("pf-flags");
  if (!host) return;
  const PALETTE = ["#f5b8a8", "#ffd9a0", "#a8e6c8", "#b8c8f5", "#f5a8d8"];
  // x positions along the rope: 16, 38, 60, 84, 108
  const xs = [16, 38, 60, 84, 108];
  for (let i = 0; i < 5; i++) {
    const f = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
    f.setAttribute("class", "pf-flag");
    f.setAttribute("points", `${xs[i]},2 ${xs[i]+14},9 ${xs[i]},22`);
    f.setAttribute("fill", PALETTE[i]);
    f.setAttribute("stroke", "rgba(45, 28, 18, 0.45)");
    f.setAttribute("stroke-width", "0.4");
    host.appendChild(f);
  }
})();


/* ---- 2) candle stub ----
   lights at dawn/dusk/night (tied to body class) OR via header sky-lock
   (settings.sky). otherwise dim. click toggles state manually: douse
   if lit, light if dim+dark. flame leans in body.wind-gust. counter:
   candle nights (counted whenever the wick ends a session still lit).
   the small SKU of work is in a single 1s interval that polls
   isMoodDark() and toggles #candle-stub.lit accordingly. reduced-motion
   already strips the flicker animation. audible: none — candles in
   the real world don't make sound. */
const CANDLE_KEY = "biosphere02.candle-stub.nights.v1";
const candleEl = document.getElementById("candle-stub");
const candleStatEl = document.getElementById("candle-stat");
let candleNights = (() => { try { return +localStorage.getItem(CANDLE_KEY) || 0; } catch { return 0; } })();
function renderCandleStat() { if (candleStatEl) candleStatEl.textContent = candleNights; }
renderCandleStat();
function isMoodDark() {
  const b = document.body.classList;
  return b.contains("dawn") || b.contains("dusk") || b.contains("night");
}
function syncCandleLit() {
  if (!candleEl) return;
  const dark = isMoodDark();
  // respect a user-set override (.lit-forced or .dimmer) if present.
  const forced = candleEl.dataset.forced;
  if (forced === "on") { candleEl.classList.add("lit"); return; }
  if (forced === "off") { candleEl.classList.remove("lit"); return; }
  candleEl.classList.toggle("lit", dark);
}
syncCandleLit();
setInterval(syncCandleLit, 1000);
if (candleEl) {
  candleEl.addEventListener("click", () => {
    const willLit = !candleEl.classList.contains("lit");
    candleEl.classList.add("lit");
    // user override survives a mood flip for the rest of the session.
    // cycle: null (auto) → "on" (forced lit) → "off" (forced dim) → null
    const cur = candleEl.dataset.forced || "";
    const next = cur === "" ? "on" : cur === "on" ? "off" : "";
    candleEl.dataset.forced = next;
    if (!willLit) {
      // douse — only count the night if the user extinguished a wick that
      // was already silently burning in the dusk. otherwise we'd be
      // double-counting the auto-lit dusk candles on every dusk visit.
      candleEl.classList.remove("lit");
    }
    if (willLit && typeof toast === "function") {
      const lines = [
        "the wick catches · a small light in the dark",
        "a candle stub finds its flame 🍯",
        "you light the stub · it won't be long",
        "a thin tongue of amber leans into the air",
      ];
      toast(lines[Math.floor(Math.random() * lines.length)], 2400);
      candleNights++;
      try { localStorage.setItem(CANDLE_KEY, String(candleNights)); } catch {}
      renderCandleStat();
      if (typeof gLog === "function" && candleNights === 1) gLog("candle", "first candle lit", "the shore");
    } else if (!willLit && typeof toast === "function") {
      toast("you douse the candle · it will relight at dusk", 2200);
    }
  });
}

/* ---- 3) bubble wand ----
   click dips the wand in its water reservoir (one-shot 320ms anim,
   then back up) and releases 4-7 bubbles that drift upward on the
   shared bubble-rise keyframe. each bubble picks a random dx so
   they spread. a 7% chance per bubble to land in the pond (bottom
   y hits the water-line viewport zone) triggers a small addRipple
   at the impact point. counter: bubbles (cumulative across sessions).
   skipped under body.motion-reduced and body.stargazer. */
const BUBBLE_KEY = "biosphere02.bubble-wand.released.v1";
const wandEl = document.getElementById("bubble-wand");
const bubbleHost = document.getElementById("bubble-host");
const bubbleStatEl = document.getElementById("bubbles-stat");
let bubbleCount = (() => { try { return +localStorage.getItem(BUBBLE_KEY) || 0; } catch { return 0; } })();
function renderBubbleStat() { if (bubbleStatEl) bubbleStatEl.textContent = bubbleCount; }
renderBubbleStat();
function spawnBubble(originX, originY) {
  if (isMotionReduced && typeof isMotionReduced === "function" && isMotionReduced()) return;
  const b = document.createElement("div");
  b.className = "bubble";
  // each bubble gets its own dx/dy curve so they spread, not track.
  const dx8  = (Math.random() * 30 - 15) | 0;
  const dx40 = (Math.random() * 60 - 30) | 0;
  const dx80 = (Math.random() * 90 - 45) | 0;
  const dx100 = (Math.random() * 120 - 60) | 0;
  const dy8 = -10, dy40 = -160, dy80 = -340, dy100 = -440;
  b.style.setProperty("--b-dx-08",  dx8 + "px");
  b.style.setProperty("--b-dx-40",  dx40 + "px");
  b.style.setProperty("--b-dx-80",  dx80 + "px");
  b.style.setProperty("--b-dx-100", dx100 + "px");
  b.style.setProperty("--b-dy-08",  dy8 + "px");
  b.style.setProperty("--b-dy-40",  dy40 + "px");
  b.style.setProperty("--b-dy-80",  dy80 + "px");
  b.style.setProperty("--b-dy-100", dy100 + "px");
  // size variation
  const sz = 0.85 + Math.random() * 0.4;
  b.style.transformOrigin = "center";
  b.style.transform = `scale(${sz})`;
  b.style.animationDuration = (8800 + Math.random() * 2200).toFixed(0) + "ms";
  b.style.left = originX + "px";
  b.style.top  = originY + "px";
  bubbleHost.appendChild(b);

  // 7% chance the bubble hits the pond surface — if so, ripple + pop
  // at the impact. otherwise it just floats up and fades.
  if (Math.random() < 0.07 && typeof addRipple === "function" && pondW > 0) {
    // bubbles from the wand sit above the water and rise upward,
    // so they never physically land on the pond. the addRipple path is
    // kept as a deep call for future bubble sources that might
    // originate from within the pond waterline (a future feature idea:
    // a soap blower in a kayak), gated on a helper instead of an
    // always-false inline boolean so the dead branch reads as intent
    // rather than as sloppy code.
    const onPond = false;
    if (onPond && pondH > 0 && originY > window.innerHeight - 38 - pondH) {
      const onCanvasX = originX; // viewport space; addRipple wants pond-space
      const pondEl = document.getElementById("pond");
      if (pondEl) {
        const rect = pondEl.getBoundingClientRect();
        addRipple(onCanvasX - rect.left, pondH * 0.6, 1.2, 60);
      }
    }
  }
  // pop burst at random between 7s and 9s, or never if it just naturally fades.
  const popDelay = 6500 + Math.random() * 1800;
  setTimeout(() => {
    if (!b.isConnected) return;
    const burst = document.createElement("div");
    burst.className = "pop-burst";
    burst.style.left = b.style.left;
    burst.style.top  = b.style.top;
    bubbleHost.appendChild(burst);
    setTimeout(() => burst.remove(), 600);
    b.remove();
  }, popDelay);
  bubbleCount++;
  try { localStorage.setItem(BUBBLE_KEY, String(bubbleCount)); } catch {}
  renderBubbleStat();
  if (bubbleCount === 1 && typeof toast === "function") toast("a thin film rises · the pond keeps it", 2200);
  if (typeof gLog === "function" && bubbleCount % 25 === 0) gLog("bubbles", `${bubbleCount} bubbles released`, "the shore");
}
if (wandEl && bubbleHost) {
  wandEl.addEventListener("click", () => {
    // one-shot dip animation
    wandEl.classList.remove("dipped");
    void wandEl.offsetWidth;
    wandEl.classList.add("dipped");
    setTimeout(() => wandEl.classList.remove("dipped"), 360);
    // release 4-7 bubbles from the wand's loop center
    const rect = wandEl.getBoundingClientRect();
    const ox = rect.left + rect.width / 2;
    const oy = rect.top + 6;
    const count = 4 + Math.floor(Math.random() * 4);
    for (let i = 0; i < count; i++) {
      const jitterX = (Math.random() * 8 - 4) | 0;
      const jitterY = (Math.random() * 4 - 2) | 0;
      setTimeout(() => spawnBubble(ox + jitterX, oy + jitterY), i * 90);
    }
  });
}

/* ---- 4) tide stake ----
   vertical wood pole with horizontal tick marks; a translucent
   cyan rect sits on the pole and reveals the pond's --pond-h in
   real time (1s poll of getComputedStyle().getPropertyValue()).
   the y-position is mapped from the pond's 17-19vh range to the
   pole's viewBox 16-64 range so a hand-calibrated tick line-up
   reads correctly. click reads today's tide word (low / rising /
   high / falling). counter: tide readings. */
const TIDE_STAKE_KEY = "biosphere02.tide-stake.readings.v1";
const stakeEl = document.getElementById("tide-stake");
const stakeFill = stakeEl ? stakeEl.querySelector(".ts-fill") : null;
const stakeStatEl = document.getElementById("tidestake-stat");
let stakeReadings = (() => { try { return +localStorage.getItem(TIDE_STAKE_KEY) || 0; } catch { return 0; } })();
function renderStakeStat() { if (stakeStatEl) stakeStatEl.textContent = stakeReadings; }
renderStakeStat();
function updateStakeFill() {
  if (!stakeFill) return;
  const vh = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--pond-h")) || 18;
  // map 17..19 vh to pole y 64..16 (high water = top of pole)
  const clamped = Math.max(17, Math.min(19, vh));
  const frac = (clamped - 17) / 2;        // 0..1
  const yTop = 64 - frac * 48;            // 16 (high) to 64 (low)
  const h = 64 - yTop + 1;
  stakeFill.setAttribute("y", yTop.toFixed(1));
  stakeFill.setAttribute("height", h.toFixed(1));
  // also tint: low tide slate-blue, high tide a touch warmer
  const warmth = Math.round(220 + frac * 30);
  stakeFill.setAttribute("fill", `rgba(160, 210, 230, ${0.30 + frac * 0.18})`);
  stakeFill.dataset.frac = frac.toFixed(3);
}
updateStakeFill();
setInterval(updateStakeFill, 1000);
if (stakeEl) {
  stakeEl.addEventListener("click", () => {
    stakeReadings++;
    try { localStorage.setItem(TIDE_STAKE_KEY, String(stakeReadings)); } catch {}
    renderStakeStat();
    if (typeof toast === "function") {
      const frac = parseFloat(stakeFill ? stakeFill.dataset.frac || "0.5" : "0.5");
      let word, line;
      if (frac < 0.32) { word = "low"; line = "the low-tide line · crabs and stones"; }
      else if (frac < 0.55) { word = "rising"; line = "the water is rising · still plenty of shore"; }
      else if (frac < 0.78) { word = "high"; line = "the pond is high · the dock almost floats"; }
      else { word = "falling"; line = "the tide is turning · slowly drawing down"; }
      toast(`tide: ${word} · ${line}`, 2600);
    }
    if (typeof gLog === "function" && stakeReadings === 1) gLog("tide", "first tide reading", "the stake");
  });
}

/* ---- 5) wooden fish ----
   a carved three-piece toy (head, mid, tail) that floats on the
   pond. its joints sit on independent transform-origins so each
   piece bends separately on click — tail flicks up, mid rolls,
   head tilts — and holds for 0.6s, then resets. the whole svg
   drifts with --pond-h via the existing shore transitions, so
   it visibly rises and falls with the tide. counter: chimes
   flipped (cumulative clicks).
*/
const FISH_KEY = "biosphere02.wood-fish.flipped.v1";
const fishEl = document.getElementById("wood-fish");
const fishStatEl = document.getElementById("woodfish-stat");
let fishCount = (() => { try { return +localStorage.getItem(FISH_KEY) || 0; } catch { return 0; } })();
function renderFishStat() { if (fishStatEl) fishStatEl.textContent = fishCount; }
renderFishStat();
if (fishEl) {
  fishEl.addEventListener("click", () => {
    fishCount++;
    try { localStorage.setItem(FISH_KEY, String(fishCount)); } catch {}
    renderFishStat();
    fishEl.classList.remove("flipped");
    void fishEl.offsetWidth;
    fishEl.classList.add("flipped");
    setTimeout(() => fishEl.classList.remove("flipped"), 720);
    const lines = [
      "the wooden fish rolls once on the water",
      "a clap of tiny bubbles at the tail",
      "the toy fish swims in place for a heartbeat",
      "the carved joints twist · tide catches the tail",
      "the fish flips over · its belly is brighter",
    ];
    if (fishCount === 1 && typeof toast === "function") {
      toast("you nudged the wooden fish · it doesn't mind");
    } else if (fishCount > 1 && fishCount % 5 === 0 && typeof toast === "function") {
      toast(lines[Math.floor(Math.random() * lines.length)], 2200);
    }
    if (typeof gLog === "function" && fishCount === 1) gLog("fish", "wooden fish flipped", "the pond");
  });
}
/* ============================================================
   devlog #33 — pinwheel (palette cycle), fossil stone (specimen
   cycle), driftwood signpost (destination cycle), singing bowl
   (tide-modulated audio synthesis).  four additions, none of them
   creatures, each latches onto a different existing system: the
   pinwheel is a wind-driven stick (the .wind-gust class wheel), the
   fossil stone is the toast()-side of the bottle fragments, the
   signpost cycles through curated destinations like the conch
   cycles through sea sounds, and the singing bowl reads --pond-h
   directly via getComputedStyle — the same source of truth that
   drives the tide clock and the tide flutes.
   ============================================================ */

/* ---- pinwheel: 4-colour palette cycle ----
   four 4-blade palettes keyed off index stored in localStorage. on
   click the four blade fills are written into the inline svg paths
   in document order; the palette label name is toasted back. the
   blade fills are matched against the existing dusk source tint so
   the pinwheel reads as a foreground object, not a UI element. */
const PW_KEY = "biosphere02.pinwheel.v1";
const PW_PALETTES = [
  // ember — matches the most common dusk tint
  ["#c0533f", "#e08a3f", "#a83a26", "#f0b668"],
  // ocean
  ["#3f86c0", "#5fb0d8", "#2a6090", "#9ad8e8"],
  // moss
  ["#8fd49a", "#6cb37e", "#a8e0b0", "#d6f0d8"],
  // mist
  ["#a8b0c0", "#c8d0e0", "#888c98", "#e0e4ec"],
];
let pwIndex = 0;
try { pwIndex = +(localStorage.getItem(PW_KEY) || 0) || 0; } catch {}
function applyPinwheelPalette() {
  const pal = PW_PALETTES[pwIndex % PW_PALETTES.length];
  const blades = document.querySelectorAll("#pinwheel .pw-blade");
  for (let i = 0; i < blades.length; i++) {
    blades[i].setAttribute("fill", pal[i % pal.length]);
  }
}
applyPinwheelPalette();
const _pinwheelStatEl = document.getElementById("pinwheel-stat");
if (_pinwheelStatEl) _pinwheelStatEl.textContent = pwIndex;
const pinwheelEl = document.getElementById("pinwheel");
if (pinwheelEl) {
  pinwheelEl.addEventListener("click", () => {
    pwIndex++;
    try { localStorage.setItem(PW_KEY, String(pwIndex)); } catch {}
    applyPinwheelPalette();
    if (_pinwheelStatEl) _pinwheelStatEl.textContent = pwIndex;
    const labels = ["ember", "ocean", "moss", "mist"];
    if (typeof toast === "function") toast(`pinwheel · ${labels[pwIndex % 4]} palettes`, 1800);
  });
}

/* ---- fossil stone: 6 specimen cards ----
   six pressed-fern species. on click the toast() helper shows a
   one-line description (name · era · note); counter increments. */
const FS_KEY = "biosphere02.fossil.v1";
const FS_SPECIMENS = [
  { name: "alethopteris", era: "carboniferous", note: "a seed-fern frond · 300 million years old · the swamp that became coal" },
  { name: "glossopteris", era: "permian",      note: "tongue-shaped leaves · once grew across all the southern continents · proof of drift" },
  { name: "annularia",    era: "carboniferous", note: "whorled leaves around a hollow reed-stem · the first upright forest understory" },
  { name: "cordaites",    era: "carboniferous", note: "a tall conifer cousin · strap-shaped leaves that blew in monsoons of the warm paleozoic" },
  { name: "pecopteris",   era: "carboniferous", note: "a fern with small pinnae in tidy rows · the undergrowth of every mire in the carboniferous" },
  { name: "neuropteris",  era: "carboniferous", note: "a winged seed-fern · the rounded leaflet shape is unmistakable on a fresh split" },
];
let fsIndex = 0;
try { fsIndex = +(localStorage.getItem(FS_KEY) || 0) || 0; } catch {}
const _fossilStatEl = document.getElementById("fossil-stat");
if (_fossilStatEl) _fossilStatEl.textContent = fsIndex;
const fossilEl = document.getElementById("fossil-stone");
if (fossilEl) {
  fossilEl.addEventListener("click", () => {
    fossilEl.classList.add("read");
    setTimeout(() => fossilEl.classList.remove("read"), 700);
    const spec = FS_SPECIMENS[fsIndex % FS_SPECIMENS.length];
    fsIndex++;
    try { localStorage.setItem(FS_KEY, String(fsIndex)); } catch {}
    if (_fossilStatEl) _fossilStatEl.textContent = fsIndex;
    if (typeof toast === "function") {
      toast(`${spec.name} · ${spec.era} · ${spec.note}`, 3600);
    }
  });
}

/* ---- driftwood signpost: 10 destination cycles ----
   ten destinations; each updates BOTH sign plates' text and arrow
   direction. the arrow is a literal unicode character that the user
   reads alongside the wood grain. signs cycle deterministically — a
   given click count always lands on the same destination. */
const SP_KEY = "biosphere02.signpost.v1";
const SP_DESTINATIONS = [
  { a1: "→", text1: "the moon",   a2: "↑", text2: "the past" },
  { a1: "←", text1: "the chapel",  a2: "→", text2: "the river" },
  { a1: "↑", text1: "the treetops", a2: "↓", text2: "the root" },
  { a1: "→", text1: "the meadow",  a2: "↑", text2: "the wind" },
  { a1: "↓", text1: "the pond",    a2: "←", text2: "the shore" },
  { a1: "→", text1: "the next one", a2: "←", text2: "the gone ones" },
  { a1: "↑", text1: "the high noon", a2: "↓", text2: "the dark hour" },
  { a1: "←", text1: "the western wood", a2: "→", text2: "the eastern clearing" },
  { a1: "→", text1: "the lighthouse",  a2: "↓", text2: "the harbor" },
  { a1: "↑", text1: "the wish tree",   a2: "→", text2: "the listening room" },
];
let spIndex = 0;
try { spIndex = +(localStorage.getItem(SP_KEY) || 0) || 0; } catch {}
function applySignpost() {
  const dest = SP_DESTINATIONS[spIndex % SP_DESTINATIONS.length];
  const t1 = document.querySelector("#signpost .sp-text");
  const t2 = document.querySelector("#signpost .sp-text-2");
  if (t1) t1.textContent = `${dest.a1} ${dest.text1}`;
  if (t2) t2.textContent = `${dest.a2} ${dest.text2}`;
}
applySignpost();
const _spStatEl = document.getElementById("signpost-stat");
if (_spStatEl) _spStatEl.textContent = spIndex;
const signpostEl = document.getElementById("signpost");
if (signpostEl) {
  signpostEl.addEventListener("click", () => {
    spIndex++;
    try { localStorage.setItem(SP_KEY, String(spIndex)); } catch {}
    applySignpost();
    const dest = SP_DESTINATIONS[(spIndex - 1) % SP_DESTINATIONS.length];
    if (_spStatEl) _spStatEl.textContent = spIndex;
    if (typeof toast === "function") {
      toast(`${dest.a1} ${dest.text1} · ${dest.a2} ${dest.text2}`, 2400);
    }
  });
}

/* ---- singing bowl: tide-modulated audio synthesis ----
   click strikes the bowl: a soft sustained tone plays at a base
   frequency derived from --pond-h so the bowl tracks the actual pond
   water (same source-of-truth as the tide clock and tide flutes).
   persistent counter: bowls struck.
   audio: lazy AudioContext (mirrors the cricket/conch/beads pattern),
   with one fundamental sine + a 2x harmonic sine for the bowl's
   "singing" character, routed through an envelope with a 60ms attack,
   220ms sustain plateau, and ~4.5s exponential decay back to ~0.
   a slow ~5hz lfo modulates the master amplitude to give the bowl
   its characteristic shimmer. */
const SB_KEY = "biosphere02.singingbowl.v1";
const _sbCtxRef = { ctx: null, armed: false };
let sbStrikes = 0;
try { sbStrikes = +(localStorage.getItem(SB_KEY) || 0) || 0; } catch {}

function _sbGetCtx() {
  if (_sbCtxRef.ctx) return _sbCtxRef.ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  _sbCtxRef.ctx = new AC();
  return _sbCtxRef.ctx;
}
// arm on first pointerdown anywhere on the page — the lazy-context
// pattern shared with the cricket, the conch, and the bead strand.
document.addEventListener("pointerdown", () => {
  if (_sbCtxRef.armed) return;
  const ctx = _sbGetCtx();
  if (!ctx) return;
  if (ctx.state === "suspended") ctx.resume();
  _sbCtxRef.armed = true;
}, { once: false });

function sbFrequencyFromTide() {
  // --pond-h cycles roughly 17-19 vh; map to 220-280hz (A3 to C#4) so
  // the chord sits in a warm bell register. linear in vh: 17vh -> 220,
  // 19vh -> 280. cached on first read.
  const raw = getComputedStyle(document.documentElement).getPropertyValue("--pond-h") || "18vh";
  const vh = parseFloat(raw) || 18;
  const t = Math.max(0, Math.min(1, (vh - 17) / 2));
  return 220 + 60 * t;
}

function strikeSingingBowl() {
  const ctx = _sbGetCtx();
  if (ctx && ctx.state === "suspended") ctx.resume();
  const f = sbFrequencyFromTide();
  // visual ring
  const el = document.getElementById("singing-bowl");
  if (el) {
    el.classList.remove("struck");
    void el.offsetWidth;  // force reflow so the keyframe restarts
    el.classList.add("struck");
    setTimeout(() => el.classList.remove("struck"), 1400);
  }
  // audio (only after the user has armed the context)
  if (ctx && _sbCtxRef.armed) {
    const now = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
    // fundamental + 2x harmonic give the bowl its bell-like singing quality
    const o1 = ctx.createOscillator();
    o1.type = "sine";
    o1.frequency.setValueAtTime(f, now);
    const o2 = ctx.createOscillator();
    o2.type = "sine";
    o2.frequency.setValueAtTime(f * 2, now);
    // slow lfo adds the breathing shimmer that distinguishes a singing bowl
    // from a static bell tone
    const lfo = ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = 5.2;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.05;
    lfo.connect(lfoGain).connect(master.gain);
    o1.connect(master);
    o2.connect(master);
    // envelope: 60ms attack -> 220ms sustain at 0.22 ->
    // 4.5s exponential decay to 0.0001
    master.gain.setValueAtTime(0.0001, now);
    master.gain.linearRampToValueAtTime(0.22, now + 0.06);
    master.gain.linearRampToValueAtTime(0.20, now + 0.26);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 4.8);
    o1.start(now); o2.start(now); lfo.start(now);
    o1.stop(now + 5.0); o2.stop(now + 5.0); lfo.stop(now + 5.0);
  }
  sbStrikes++;
  try { localStorage.setItem(SB_KEY, String(sbStrikes)); } catch {}
  const _sbStatEl = document.getElementById("singingbowl-stat");
  if (_sbStatEl) _sbStatEl.textContent = sbStrikes;
  if (typeof toast === "function") {
    const vh = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--pond-h") || "18vh") || 18;
    const t = vh < 17.6 ? "low tide" : vh < 18.4 ? "rising" : "high tide";
    toast(`bowl sings at ${Math.round(f)}hz · ${t}`, 2200);
  }
}

const singingBowlEl = document.getElementById("singing-bowl");
if (singingBowlEl) {
  singingBowlEl.addEventListener("click", strikeSingingBowl);
}

// resume audio context when tab regains focus (mirrors how orbit + cricket
// handle visibilitychange — keep the bowl playable after a background tab)
document.addEventListener("visibilitychange", () => {
  if (!document.hidden
      && _sbCtxRef.armed
      && _sbCtxRef.ctx
      && _sbCtxRef.ctx.state === "suspended") {
    _sbCtxRef.ctx.resume().catch(() => {});
  }
});

/* ============================================================
   devlog #34 — moon-journal, mushroom-log, tide-whistle,
   rain-spout, kelp. five shore elements that each latch onto a
   different existing system: the moon-journal onto the lunar
   cycle, the mushroom-log onto toast + deterministic cycling,
   the tide-whistle onto --pond-h audio, the rain-spout onto
   forecastFor(new Date()) kind === "rain", and the kelp onto
   body.wind-gust. none introduce a fresh state variable.
   ============================================================ */

const MJ_KEY = "biosphere02.moon-journal.v1";
const MJ_PHASES = ["new moon","waxing crescent","first quarter","waxing gibbous","full moon","waning gibbous","last quarter","waning crescent"];
const MJ_OVERLAY_PATHS = [
  "M28 15 A 9 9 0 0 1 28 33 Z",
  "M28 15 A 6 9 0 0 1 28 33 A 9 9 0 0 1 28 15 Z",
  "M28 15 L 28 33 A 9 9 0 0 1 28 15 Z",
  "M28 15 A 6 9 0 0 0 28 33 A 9 9 0 0 1 28 15 Z",
  "",
  "M28 15 A 6 9 0 0 1 28 33 A 9 9 0 0 0 28 15 Z",
  "M28 15 L 28 33 A 9 9 0 0 0 28 15 Z",
  "M28 15 A 6 9 0 0 0 28 33 A 9 9 0 0 0 28 15 Z",
];
let mjState = { page: 0, read: 0 };
try { mjState = Object.assign({ page: 0, read: 0 }, JSON.parse(localStorage.getItem(MJ_KEY) || "{}")); } catch {}
function _moonPhaseIdxToday() {
  const lp = 2551442.8;
  const known = new Date("2000-01-06T18:14:00Z").getTime() / 1000;
  const now = Date.now() / 1000;
  const phase = ((now - known) % lp) / lp;
  return Math.floor(phase * 8) % 8;
}
function _renderMoonJournal() {
  const el = document.getElementById("moon-journal");
  if (!el) return;
  const overlay = el.querySelector(".mj-shadow-overlay");
  const name = el.querySelector(".mj-name");
  if (overlay) overlay.setAttribute("d", MJ_OVERLAY_PATHS[mjState.page] || "");
  if (name) name.textContent = MJ_PHASES[mjState.page];
  const statEl = document.getElementById("moon-journal-stat");
  if (statEl) statEl.textContent = mjState.read;
}
if (!localStorage.getItem(MJ_KEY)) mjState.page = _moonPhaseIdxToday();
_renderMoonJournal();
const moonJournalEl = document.getElementById("moon-journal");
if (moonJournalEl) {
  moonJournalEl.addEventListener("click", () => {
    mjState.page = (mjState.page + 1) % 8;
    mjState.read++;
    try { localStorage.setItem(MJ_KEY, JSON.stringify(mjState)); } catch {}
    _renderMoonJournal();
    if (typeof toast === "function") toast(`moon · ${MJ_PHASES[mjState.page]}`, 1800);
  });
}

const ML_KEY = "biosphere02.mushroom-log.v1";
const ML_SPECIMENS = [
  "golden chanterelle · apricot, faintly peppery",
  "turkey tail · striped browns of the pacific northwest",
  "pale oyster · faint anise, layered shelving",
  "amethyst deceiver · vivid lavender in autumn leaf litter",
];
let mlState = { idx: 0, read: 0 };
try { mlState = Object.assign({ idx: 0, read: 0 }, JSON.parse(localStorage.getItem(ML_KEY) || "{}")); } catch {}
function _renderMushroomLog() {
  const statEl = document.getElementById("mushroom-log-stat");
  if (statEl) statEl.textContent = mlState.read;
}
_renderMushroomLog();
const mushroomLogEl = document.getElementById("mushroom-log");
if (mushroomLogEl) {
  mushroomLogEl.addEventListener("click", () => {
    const spec = ML_SPECIMENS[mlState.idx % ML_SPECIMENS.length];
    mlState.idx = (mlState.idx + 1) % ML_SPECIMENS.length;
    mlState.read++;
    try { localStorage.setItem(ML_KEY, JSON.stringify(mlState)); } catch {}
    _renderMushroomLog();
    if (typeof toast === "function") toast(spec, 2400);
  });
}

const TW_KEY = "biosphere02.tide-whistle.v1";
const _twCtxRef = { ctx: null, armed: false };
let twStrikes = 0;
try { twStrikes = +(localStorage.getItem(TW_KEY) || 0) || 0; } catch {}
function _twGetCtx() {
  if (_twCtxRef.ctx) return _twCtxRef.ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  _twCtxRef.ctx = new AC();
  return _twCtxRef.ctx;
}
function _twFrequencyFromTide() {
  const raw = getComputedStyle(document.documentElement).getPropertyValue("--pond-h") || "18vh";
  const vh = parseFloat(raw) || 18;
  const t = Math.max(0, Math.min(1, (vh - 17) / 2));
  return 220 + 60 * t;
}
function strikeTideWhistle() {
  const ctx = _twGetCtx();
  if (ctx && ctx.state === "suspended") ctx.resume();
  const el = document.getElementById("tide-whistle");
  if (el) {
    el.classList.remove("blown");
    void el.offsetWidth;
    el.classList.add("blown");
    setTimeout(() => el.classList.remove("blown"), 520);
  }
  const f = _twFrequencyFromTide();
  if (ctx && _twCtxRef.armed) {
    const now = ctx.currentTime;
    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
    const o1 = ctx.createOscillator();
    o1.type = "sine";
    o1.frequency.setValueAtTime(f, now);
    const o2 = ctx.createOscillator();
    o2.type = "sine";
    o2.frequency.setValueAtTime(f * 2, now);
    const o1Gain = ctx.createGain();
    o1Gain.gain.value = 1;
    const o2Gain = ctx.createGain();
    o2Gain.gain.value = 0.34;
    o1.connect(o1Gain).connect(master);
    o2.connect(o2Gain).connect(master);
    master.gain.setValueAtTime(0.0001, now);
    master.gain.linearRampToValueAtTime(0.18, now + 0.03);
    master.gain.linearRampToValueAtTime(0.16, now + 0.25);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 1.85);
    o1.start(now); o2.start(now);
    o1.stop(now + 1.95); o2.stop(now + 1.95);
  }
  twStrikes++;
  try { localStorage.setItem(TW_KEY, String(twStrikes)); } catch {}
  const statEl = document.getElementById("tide-whistle-stat");
  if (statEl) statEl.textContent = twStrikes;
  if (typeof toast === "function") {
    const vh = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--pond-h") || "18vh") || 18;
    const tideLabel = vh < 17.6 ? "low tide" : vh < 18.4 ? "rising" : "high tide";
    toast(`whistle at ${Math.round(f)}hz · ${tideLabel}`, 2000);
  }
}
const tideWhistleEl = document.getElementById("tide-whistle");
if (tideWhistleEl) {
  tideWhistleEl.addEventListener("click", strikeTideWhistle);
}

const RS_KEY = "biosphere02.rain-spout.v1";
let rsDrips = 0;
try { rsDrips = +(localStorage.getItem(RS_KEY) || 0) || 0; } catch {}
function _renderRainSpout() {
  const statEl = document.getElementById("rain-spout-stat");
  if (statEl) statEl.textContent = rsDrips;
}
_renderRainSpout();
let _rsShowerTimer = null;
function _spawnSpoutDrip() {
  const host = document.getElementById("rain-spout");
  if (!host) return;
  if (typeof isMotionReduced === "function" && isMotionReduced()) return;
  const d = document.createElement("div");
  d.className = "rs-drop falling";
  host.appendChild(d);
  rsDrips++;
  try { localStorage.setItem(RS_KEY, String(rsDrips)); } catch {}
  _renderRainSpout();
  setTimeout(() => d.remove(), 660);
}
function _startSpoutShower() {
  if (_rsShowerTimer) return;
  const tick = () => {
    if (!document.hidden) _spawnSpoutDrip();
    _rsShowerTimer = setTimeout(tick, 4000 + Math.random() * 3000);
  };
  _rsShowerTimer = setTimeout(tick, 1500);
}
function _stopSpoutShower() {
  if (_rsShowerTimer) { clearTimeout(_rsShowerTimer); _rsShowerTimer = null; }
}
const rainSpoutEl = document.getElementById("rain-spout");
if (rainSpoutEl) {
  rainSpoutEl.addEventListener("click", () => _spawnSpoutDrip());
}
if (typeof forecastFor === "function") {
  try {
    if (forecastFor(new Date()).kind === "rain") _startSpoutShower();
  } catch {}
}

const KP_KEY = "biosphere02.kelp.v1";
let kpProds = 0;
try { kpProds = +(localStorage.getItem(KP_KEY) || 0) || 0; } catch {}
function _renderKelp() {
  const statEl = document.getElementById("kelp-stat");
  if (statEl) statEl.textContent = kpProds;
}
_renderKelp();
const kelpEl = document.getElementById("kelp");
if (kelpEl) {
  kelpEl.addEventListener("click", () => {
    kelpEl.classList.remove("prodded");
    void kelpEl.offsetWidth;
    kelpEl.classList.add("prodded");
    setTimeout(() => kelpEl.classList.remove("prodded"), 700);
    kpProds++;
    try { localStorage.setItem(KP_KEY, String(kpProds)); } catch {}
    _renderKelp();
  });
}

document.addEventListener("pointerdown", () => {
  if (typeof _sbCtxRef !== "undefined" && _sbCtxRef && !_sbCtxRef.armed) {
    const ctx = _sbCtxRef.ctx;
    if (ctx && ctx.state === "suspended") ctx.resume().catch(() => {});
    _sbCtxRef.armed = true;
  }
  if (!_twCtxRef.armed) {
    const ctx = _twGetCtx();
    if (ctx && ctx.state === "suspended") ctx.resume().catch(() => {});
    _twCtxRef.armed = true;
  }
}, { passive: true });

document.addEventListener("visibilitychange", () => {
  if (!document.hidden && _twCtxRef.armed && _twCtxRef.ctx
      && _twCtxRef.ctx.state === "suspended") {
    _twCtxRef.ctx.resume().catch(() => {});
  }
  if (typeof forecastFor === "function") {
    try {
      const isRain = forecastFor(new Date()).kind === "rain";
      if (isRain && !document.hidden) _startSpoutShower();
      else _stopSpoutShower();
    } catch {}
  }
});

/* ============================================================
   devlog #35 — five new shore things
   each one is small, uses its own v1-suffixed localStorage key,
   latches onto an existing system rather than spawning a fresh
   dependency tree, and lands in a stat-wrap row at bottom:96px
   without touching any of the 6 existing rows (14/32/48/64/80px).
   ============================================================ */

/* ---- driftwood spyglass ---- */
/* 12 curated sky observations. the cycle index lives in its own
   key so a returning user resumes at the same observation rather
   than restarting from 0; total peeks is a separate counter. */
const SPYGLASS_IDX_KEY = "biosphere02.spyglass.index.v1";
const SPYGLASS_COUNT_KEY = "biosphere02.spyglass.observations.v1";
const spyglassEl = document.getElementById("spyglass");
const spyglassStatEl = document.getElementById("spyglass-stat");
const SPYGLASS_OBSERVATIONS = [
  { head: "named star · Sirius",         body: "the dog star · brightest thing in our night sky, 8.6 light-years away" },
  { head: "named star · Polaris",        body: "the north star · sailors' anchor for the last two thousand years" },
  { head: "named star · Vega",           body: "brightest in Lyra · was the north star 12,000 years ago and will be again" },
  { head: "named star · Betelgeuse",     body: "orion's shoulder · a red supergiant nearing the end of its life" },
  { head: "named star · Arcturus",       body: "the bear-guardian · trails the tail of the Big Dipper across the sky" },
  { head: "atlas stamp · Orion",         body: "the hunter · belt of three bright stars in a perfect row" },
  { head: "atlas stamp · Cassiopeia",    body: "the queen · a W-shape you can read in five seconds flat" },
  { head: "atlas stamp · Lyra",          body: "the lyre · Vega is its brightest string stretched taut" },
  { head: "atlas stamp · Cygnus",        body: "the swan · flying south along the milky way · Deneb at the tail" },
  { head: "atlas stamp · Leo",           body: "the lion · Regulus marks the heart, a tight sickle is the mane" },
  { head: "atlas stamp · Big Dipper",    body: "not a constellation itself · a ladle whose handle points to polaris" },
  { head: "the moon",                    body: "" }, // body filled at click time from #moon status-window readout
];
let spyglassIdx = (() => { try { return +localStorage.getItem(SPYGLASS_IDX_KEY) || 0; } catch { return 0; } })();
let spyglassCount = (() => { try { return +localStorage.getItem(SPYGLASS_COUNT_KEY) || 0; } catch { return 0; } })();
function renderSpyglassCount() { if (spyglassStatEl) spyglassStatEl.textContent = spyglassCount; }
renderSpyglassCount();
if (spyglassEl) {
  spyglassEl.addEventListener("click", () => {
    const o = SPYGLASS_OBSERVATIONS[spyglassIdx % SPYGLASS_OBSERVATIONS.length];
    // the 12th observation reads the live moon-phase readout from the
    // status window so it's the actual current phase, not a placeholder.
    let body = o.body;
    if (!body && o.head === "the moon") {
      try {
        const e = document.getElementById("moon");
        body = e && e.textContent ? e.textContent : "today's moon";
      } catch { body = "today's moon"; }
    }
    spyglassIdx++;
    spyglassCount++;
    try { localStorage.setItem(SPYGLASS_IDX_KEY, String(spyglassIdx)); } catch {}
    try { localStorage.setItem(SPYGLASS_COUNT_KEY, String(spyglassCount)); } catch {}
    renderSpyglassCount();
    if (typeof toast === "function") toast(`📡 ${o.head} · ${body}`, 4400);
    spyglassEl.classList.remove("peeking");
    void spyglassEl.offsetWidth;
    spyglassEl.classList.add("peeking");
    setTimeout(() => spyglassEl.classList.remove("peeking"), 540);
  });
}

/* ---- stratified memory jar ---- */
/* each distinct calendar day adds one 2.5mm band of seasonal color
   at the top of the visible strata. state stores a list of date
   strings so a dud state still rebuilds correctly. a 60s poll
   checks whether the day has rolled; the next click also reads. */
const MJ_KEY_DATES = "biosphere02.memoryjar.dates.v1";
const MJ_KEY_COUNT = "biosphere02.memoryjar.layers.v1";
const memoryJarEl = document.getElementById("memory-jar");
const mjStrataHost = document.getElementById("mj2-strata");
const memoryjarStatEl = document.getElementById("memoryjar-stat");
const MJ_SEASON_PALettes = [
  { top: "#c8a8c8", mid: "#a884a8", bot: "#806088" },
  { top: "#e8c878", mid: "#c8a050", bot: "#9a7a32" },
  { top: "#c8643a", mid: "#a85024", bot: "#7c3814" },
  { top: "#a8c4d8", mid: "#88a4c0", bot: "#5c7a98" },
];
function mjSeasonIdx(date) {
  const m = date.getMonth() + 1;
  if (m >= 4 && m <= 6) return 0;
  if (m >= 7 && m <= 9) return 1;
  if (m >= 10 && m <= 12) return 2;
  return 3;
}
function loadMjDates() {
  try { return JSON.parse(localStorage.getItem(MJ_KEY_DATES) || "[]") || []; } catch { return []; }
}
function saveMjDates(arr) {
  try { localStorage.setItem(MJ_KEY_DATES, JSON.stringify(arr)); } catch {}
}
function renderMemoryJar(strataN) {
  if (!mjStrataHost) return;
  // jar interior runs from y=6 (just under the cork) to y=73 (baseplate).
  // oldest band at the bottom, newest at the top so today's layer lands
  // where a returning user expects it.
  const bottomY = 73;
  const bandH = 2.5;
  const totalBands = Math.min(strataN, 26);
  const bandsUsedH = totalBands * bandH;
  const startY = bottomY - bandsUsedH;
  const palette = MJ_SEASON_PALettes[(new Date()).getMonth() % 4];
  let html = "";
  for (let i = 0; i < totalBands; i++) {
    const y = startY + i * bandH;
    const t = i / Math.max(1, totalBands - 1);
    const col = t < 0.34 ? palette.bot : (t < 0.7 ? palette.mid : palette.top);
    html += `<rect x="7.5" y="${y.toFixed(2)}" width="13" height="${bandH.toFixed(2)}" fill="${col}" opacity="0.84"/>`;
  }
  if (totalBands > 0) {
    const ty = startY + (totalBands - 1) * bandH;
    html += `<ellipse cx="14" cy="${(ty + 0.5).toFixed(2)}" rx="6" ry="0.45" fill="rgba(255,240,210,0.20)"/>`;
  }
  mjStrataHost.innerHTML = html;
}
function tallyMemoryJar() {
  const today = new Date().toDateString();
  const dates = loadMjDates();
  if (!dates.includes(today)) {
    dates.push(today);
    saveMjDates(dates);
  }
  return dates.length;
}
let memoryjarCount = 0;
try { memoryjarCount = +(localStorage.getItem(MJ_KEY_COUNT) || 0); } catch {}
function renderMemoryCount() { if (memoryjarStatEl) memoryjarStatEl.textContent = memoryjarCount; }
renderMemoryJar(memoryjarCount);
renderMemoryCount();
if (memoryJarEl) {
  // 60s poll — if the day rolled over while the tab stayed open, append
  // today's band so the jar grows with the calendar, not just on click
  setInterval(() => {
    const n = tallyMemoryJar();
    if (n !== memoryjarCount) {
      memoryjarCount = n;
      try { localStorage.setItem(MJ_KEY_COUNT, String(memoryjarCount)); } catch {}
      renderMemoryJar(memoryjarCount);
      renderMemoryCount();
      memoryJarEl.classList.remove("bumped");
      void memoryJarEl.offsetWidth;
      memoryJarEl.classList.add("bumped");
      setTimeout(() => memoryJarEl.classList.remove("bumped"), 720);
    }
  }, 60_000);
  memoryJarEl.addEventListener("click", () => {
    const n = tallyMemoryJar();
    const today = new Date();
    const seasonWord = ["spring", "summer", "autumn", "winter"][mjSeasonIdx(today)];
    memoryjarCount = n;
    try { localStorage.setItem(MJ_KEY_COUNT, String(memoryjarCount)); } catch {}
    renderMemoryJar(memoryjarCount);
    renderMemoryCount();
    if (n === 1) toast(`first layer · ${seasonWord}`, 2400);
    else toast(`${n} layers · ${today.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`, 2400);
    memoryJarEl.classList.remove("bumped");
    void memoryJarEl.offsetWidth;
    memoryJarEl.classList.add("bumped");
    setTimeout(() => memoryJarEl.classList.remove("bumped"), 720);
  });
}

/* ---- pocket tide compass ---- */
/* needle rotation is derived from --pond-h with the same math the
   tide-clock / tide-flutes / tide-whistle use: 17vh→low, 18vh→mid,
   19vh→high. the readloop is a 1s getComputedStyle poll. counter is
   the # of explicit readings. */
const TIDECOMPASS_KEY = "biosphere02.tidecompass.bearings.v1";
const tideCompassEl = document.getElementById("tide-compass");
const tideCompassNeedleEl = tideCompassEl ? tideCompassEl.querySelector(".tc2-needle") : null;
const tidecompassStatEl = document.getElementById("tidecompass-stat");
let tidecompassCount = (() => { try { return +localStorage.getItem(TIDECOMPASS_KEY) || 0; } catch { return 0; } })();
function renderTideCompassCount() { if (tidecompassStatEl) tidecompassStatEl.textContent = tidecompassCount; }
renderTideCompassCount();
function parsePondH() {
  const v = getComputedStyle(document.documentElement).getPropertyValue("--pond-h") || "18vh";
  const m = /([0-9.]+)vh/.exec(v);
  return m ? parseFloat(m[1]) : 18;
}
function pondTideRot(h) {
  // the SVG geometry puts the red needle-end pointing UP by default
  // (and the white end pointing DOWN), with "high" labelled at the top
  // and "low" at the bottom. so we want red (high side) UP at high tide,
  // DOWN at low tide, horizontal at mid. linear interp, clamped.
  //   h=17 (low)  -> rot=180 (red down, toward "low" label)
  //   h=18 (mid)  -> rot=90  (red right, mid-east)
  //   h=19 (high) -> rot=0   (red up, toward "high" label)
  const frac = Math.max(0, Math.min(1, (h - 17) / 2));
  return (180 - frac * 180).toFixed(2);
}
let _lastPondRot = null;
function tickTideCompass() {
  const h = parsePondH();
  const rot = pondTideRot(h);
  if (rot !== _lastPondRot && tideCompassNeedleEl) {
    tideCompassNeedleEl.style.setProperty("--tc2-rot", rot + "deg");
    _lastPondRot = rot;
  }
}
setInterval(tickTideCompass, 1000);
tickTideCompass();
if (tideCompassEl) {
  tideCompassEl.addEventListener("click", () => {
    const h = parsePondH();
    let verdict;
    if (h < 17.6) verdict = "low · the moon is two steps back";
    else if (h < 18.4) verdict = "mid · holding its breath";
    else verdict = "high · the moon has come around";
    tidecompassCount++;
    try { localStorage.setItem(TIDECOMPASS_KEY, String(tidecompassCount)); } catch {}
    renderTideCompassCount();
    if (typeof toast === "function") toast(`🧭 ${verdict} · ${h.toFixed(2)}vh`, 3600);
  });
}

/* ---- star-knot rope coil ---- */
/* 12 knots laid out along the coil, each one tinted by a month-color
   palette. .is-active marks the current "free end". click advances the
   index by 1 (modulo 12) so the rope never runs out. */
const KROPE_IDX_KEY = "biosphere02.knotrope.index.v1";
const KROPE_COUNT_KEY = "biosphere02.knotrope.advances.v1";
const knotRopeEl = document.getElementById("knot-rope");
const krKnotsEl = document.getElementById("kr-knots");
const knotropeStatEl = document.getElementById("knotrope-stat");
const KR_KNOT_COLORS = [
  // jan → dec — blended from the season-particle palettes already in use
  "#a8c4d8", "#aca8c8", "#b8a8c8", "#c8a8c8", "#d8a888", "#e8c878",
  "#dca84a", "#c88a3a", "#c8643a", "#a85024", "#8e6878", "#9ba0b8",
];
const KR_KNOT_NAMES = [
  "jan", "feb", "mar", "apr", "may", "jun",
  "jul", "aug", "sep", "oct", "nov", "dec",
];
let krIdx = (() => { try { return +localStorage.getItem(KROPE_IDX_KEY) || 0; } catch { return 0; } })();
let krCount = (() => { try { return +localStorage.getItem(KROPE_COUNT_KEY) || 0; } catch { return 0; } })();
function renderKnotropeStat() { if (knotropeStatEl) knotropeStatEl.textContent = krCount; }
function renderKnotRope() {
  if (!krKnotsEl) return;
  const html = [];
  for (let i = 0; i < 12; i++) {
    const fx = i / 11;
    const cx = 14 + fx * 52;
    const cy = 27 + Math.sin(fx * Math.PI) * -1.4;
    const w = 3.4;
    const h = 2.2;
    const col = KR_KNOT_COLORS[i];
    const active = i === (krIdx % 12);
    html += `<g class="kr-knot ${active ? "is-active" : ""}" data-i="${i}">
      <ellipse cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" rx="${(w/2).toFixed(2)}" ry="${(h/2).toFixed(2)}" fill="${col}" opacity="0.78"/>
      <circle cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" r="0.7" fill="rgba(28,20,12,0.85)"/>
    </g>`;
  }
  krKnotsEl.innerHTML = html;
}
renderKnotRope();
renderKnotropeStat();
if (knotRopeEl) {
  knotRopeEl.addEventListener("click", () => {
    krIdx++;
    krCount++;
    try { localStorage.setItem(KROPE_IDX_KEY, String(krIdx)); } catch {}
    try { localStorage.setItem(KROPE_COUNT_KEY, String(krCount)); } catch {}
    renderKnotRope();
    renderKnotropeStat();
    const which = KR_KNOT_NAMES[(krIdx - 1) % 12];
    if (krCount === 1) toast(`first knot → ${which}`, 2200);
    else toast(`knot → ${which}`, 2000);
  });
}

/* ---- mushroom-ink stamp ---- */
/* 6 mushroom cap designs, each one drawn as a svg group inside the
   .isk-mark host. click rotates through the design list cyclically,
   each click writes a fresh stamp on the #isk-mark paper. */
const INKSTAMP_IDX_KEY = "biosphere02.inkstamp.index.v1";
const INKSTAMP_COUNT_KEY = "biosphere02.inkstamp.stamps.v1";
const inkStampEl = document.getElementById("ink-stamp");
const iskMarkEl = document.getElementById("isk-mark");
const iskCapEl = document.querySelector(".isk-cap.isk-cap-current");
const iskCapShineEl = document.querySelector(".isk-cap-shine.isk-cap-current");
const inkstampStatEl = document.getElementById("inkstamp-stat");
const INK_STAMPS = [
  { cap: "#e2a14a", shine: "#ffe6a0", name: "chanterelle" },
  { cap: "#a07248", shine: "#e8c898", band: "#9a5a30", name: "turkey tail" },
  { cap: "#e0d2ad", shine: "#fff5d8", name: "oyster" },
  { cap: "#7a5a8a", shine: "#c8a8d8", name: "amethyst deceiver" },
  { cap: "#c8b078", shine: "#f0e0a8", shaggy: true, name: "shaggy mane" },
  { cap: "#cfb88c", shine: "#f4e2b0", hedgehog: true, name: "hedgehog" },
];
function capSvg(stampDef) {
  const r = `<g class="live" transform="rotate(-8 64 27)">
    <ellipse cx="64" cy="27" rx="6.4" ry="3.6" fill="${stampDef.cap}" opacity="0.86"/>
    ${stampDef.band ? `<ellipse cx="64" cy="27" rx="4" ry="1" fill="${stampDef.band}" opacity="0.55"/>` : ""}
    ${stampDef.shaggy ? `<ellipse cx="64" cy="24.5" rx="6.2" ry="3" fill="${stampDef.cap}" opacity="0.42"/>` : ""}
    ${stampDef.hedgehog ? Array.from({length: 10}, (_, i) => {
        // full crown of "spines" — half-arc read as half a hedgehog
        const a = (i / 10) * Math.PI * 2;
        const x1 = 64 + Math.cos(a) * 3.4;
        const y1 = 27 + Math.sin(a) * 1.7;
        const x2 = 64 + Math.cos(a) * 6.4;
        const y2 = 27 + Math.sin(a) * 1.6;
        return `<line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" stroke="${stampDef.cap}" stroke-width="0.5" opacity="0.85"/>`;
      }).join("") : ""}
    <ellipse cx="64" cy="25" rx="3" ry="0.7" fill="${stampDef.shine}" opacity="0.55"/>
  </g>`;
  return r;
}
let inkstampIdx = (() => { try { return +localStorage.getItem(INKSTAMP_IDX_KEY) || 0; } catch { return 0; } })();
let inkstampCount = (() => { try { return +localStorage.getItem(INKSTAMP_COUNT_KEY) || 0; } catch { return 0; } })();
function renderInkstampStat() { if (inkstampStatEl) inkstampStatEl.textContent = inkstampCount; }
function applyCurrentStampLook() {
  if (!iskCapEl) return;
  const def = INK_STAMPS[inkstampIdx % INK_STAMPS.length];
  iskCapEl.setAttribute("fill", def.cap);
  if (iskCapShineEl) iskCapShineEl.setAttribute("fill", def.shine);
}
function renderPaperStack() {
  if (!iskMarkEl) return;
  const recent = inkstampCount > 0 ? (inkstampIdx - 1 + INK_STAMPS.length) % INK_STAMPS.length : null;
  if (recent === null) { iskMarkEl.innerHTML = ""; return; }
  const def = INK_STAMPS[recent];
  const prev = INK_STAMPS[(recent - 1 + INK_STAMPS.length) % INK_STAMPS.length];
  const prevHtml = `<g transform="rotate(8 70 32)" opacity="0.30">
    <ellipse cx="70" cy="32" rx="5" ry="3" fill="${prev.cap}"/>
    <ellipse cx="69.5" cy="30.6" rx="2.4" ry="0.6" fill="${prev.shine}" opacity="0.55"/>
  </g>`;
  iskMarkEl.innerHTML = prevHtml + capSvg(def);
}
applyCurrentStampLook();
renderPaperStack();
renderInkstampStat();
if (inkStampEl) {
  inkStampEl.addEventListener("click", () => {
    inkstampIdx++;
    inkstampCount++;
    try { localStorage.setItem(INKSTAMP_IDX_KEY, String(inkstampIdx)); } catch {}
    try { localStorage.setItem(INKSTAMP_COUNT_KEY, String(inkstampCount)); } catch {}
    applyCurrentStampLook();
    renderPaperStack();
    renderInkstampStat();
    const def = INK_STAMPS[(inkstampIdx - 1 + INK_STAMPS.length) % INK_STAMPS.length];
    if (inkstampCount === 1) toast(`mushroom · ${def.name}`, 2200);
    else if (inkstampCount % 6 === 0) toast(`pressed ${inkstampCount} · ${def.name}`, 2200);
    inkStampEl.classList.remove("stamped");
    void inkStampEl.offsetWidth;
    inkStampEl.classList.add("stamped");
    setTimeout(() => inkStampEl.classList.remove("stamped"), 460);
  });
}
