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
window.addEventListener("resize", () => { resizeStars(); resizeConstellation(); });
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
  let data;
  try { data = JSON.parse(localStorage.getItem(STATE_KEY) || "{}"); } catch { data = {}; }
  windows.forEach(w => {
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

document.getElementById("water").addEventListener("click", () => {
  plant.water = (plant.water || 0) + 1;
  savePlant(plant);
  renderPlant();
  // little particle burst
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
