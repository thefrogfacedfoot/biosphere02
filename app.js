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
    f.ax += 0.012; f.ay += 0.009;
    f.vx += Math.cos(f.ax) * 0.04;
    f.vy += Math.sin(f.ay) * 0.03;
    f.vx *= 0.96; f.vy *= 0.96;
    f.x += f.vx; f.y += f.vy;
    // bounds
    if (f.x < 0) f.x = window.innerWidth;
    if (f.x > window.innerWidth) f.x = 0;
    if (f.y < window.innerHeight * 0.3) f.y = window.innerHeight * 0.3;
    if (f.y > window.innerHeight) f.y = window.innerHeight;
    const blink = 0.55 + Math.sin(t * 0.003 + f.blinkPhase) * 0.4;
    f.el.style.transform = `translate(${f.x}px, ${f.y}px)`;
    f.el.style.opacity = String(Math.max(0.1, blink));
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
  tb.addEventListener("pointercancel", () => { drag = null; });

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
  plant = { water: 0, visits: plant.visits, lastVisitDate: plant.lastVisitDate, daysSeen: plant.daysSeen };
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
      if (!exists) userLines.push({ a: pendingStar, b: hit });
      pendingStar = null;
      saveConstellation();
    } else {
      pendingStar = null;
    }
  } else {
    // drop a new star
    userStars.push({ x, y });
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
  if (userLines.length) userLines.pop();
  else if (userStars.length) {
    const removed = userStars.length - 1;
    userStars.pop();
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
  userStars = []; userLines = []; pendingStar = null;
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
  const safe = escapeHtml(body);
  return safe.replace(/\[\[([^\]]+)\]\]/g, (m, name) => {
    const target = mycNotes.find(n => n.title.toLowerCase() === name.toLowerCase().trim());
    const cls = target ? "myc-link" : "myc-link dead";
    return `<span class="${cls}" data-link="${escapeHtml(name)}">${escapeHtml(name)}</span>`;
  });
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
  if (settings.sky && settings.sky !== "auto") {
    document.body.classList.remove("dawn", "day", "dusk", "night");
    document.body.classList.add(settings.sky);
    const skyEl = document.getElementById("sky");
    if (skyEl) {
      const labels = { dawn: "first light · 11°c", day: "open sky · 18°c", dusk: "amber hour · 15°c", night: "clear · 14°c" };
      skyEl.textContent = labels[settings.sky] + " · locked";
    }
    return;
  }
  _origApplyTOD();
};

// gate shooter spawning on the combined motion check (replaces earlier logic).
// self-idempotent: any caller can invoke this and the timer resets rather than
// stacking, and if a previous chain terminated (e.g. reduced-motion was true
// at load) calling this again cleanly restarts it.
let _shooterTimer = null;
maybeSpawnShooter = function () {
  clearTimeout(_shooterTimer);
  _shooterTimer = null;
  if (isMotionReduced()) return;
  const next = 15000 + Math.random() * 15000;
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
      if (caughtCount === 1) toast("you caught one ✦ keep an eye on the sky");
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
  gItems = results.slice(0, 25);
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

// boost shooting-star spawn rate when today's forecast calls for meteors.
// same self-idempotent pattern as the base wrap — reuses _shooterTimer so a
// re-kick from the motion toggle resets rather than stacking chains.
const _todayForecast = forecastFor(new Date());
if (_todayForecast.kind === "meteors") {
  maybeSpawnShooter = function () {
    clearTimeout(_shooterTimer);
    _shooterTimer = null;
    if (isMotionReduced()) return;
    const next = 4500 + Math.random() * 6500; // ~5-11s instead of 15-30s
    _shooterTimer = setTimeout(() => {
      _shooterTimer = null;
      spawnShooter();
      maybeSpawnShooter();
    }, next);
  };
  // the base wrap had already started a slow-cadence chain; restart at the
  // meteor cadence now that we've overridden.
  maybeSpawnShooter();
}
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
    // soft glow
    const grad = pondCtx.createRadialGradient(0, 0, 0, 0, 0, 14);
    grad.addColorStop(0, "rgba(255, 240, 200, 0.18)");
    grad.addColorStop(1, "rgba(255, 240, 200, 0)");
    pondCtx.fillStyle = grad;
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
