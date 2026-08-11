import { Conway } from "./conway.js";
import { LIFE_PATTERNS } from "./life-data.js";

const DEFAULTS = {
  zoom: 12,
  grid: true,
  spawn: "glider",
  x: 0,
  y: 0,
  rot: 0
};

function parseBool(value, fallback) {
  if (value === null || value === undefined || value === "") return fallback;
  if (value === "1" || value === "true" || value === "on") return true;
  if (value === "0" || value === "false" || value === "off") return false;
  return fallback;
}

function systemColors() {
  const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  return dark
    ? { fg: "#e8e8e8", bg: "#121212" }
    : { fg: "#111111", bg: "#ffffff" };
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

function newSeedValue() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return String(Math.floor(Math.random() * 1e15));
}

function readParams() {
  // Prefer blocking boot parse (src/boot.js) so seed/colors are stable before module runs.
  if (window.__LIFE_BOOT__) {
    const boot = window.__LIFE_BOOT__;
    return {
      ...boot,
      spawn: LIFE_PATTERNS[boot.spawn] ? boot.spawn : DEFAULTS.spawn
    };
  }

  const params = new URLSearchParams(location.search);
  const sys = systemColors();
  const spawnKey = params.get("spawn") || DEFAULTS.spawn;
  const zoom = clamp(Number(params.get("zoom") ?? DEFAULTS.zoom), 2, 48);
  const rot = Number(params.get("rot") ?? DEFAULTS.rot);
  const x = Number(params.get("x") ?? DEFAULTS.x);
  const y = Number(params.get("y") ?? DEFAULTS.y);

  return {
    seed: params.get("seed") || newSeedValue(),
    zoom: Number.isFinite(zoom) ? zoom : DEFAULTS.zoom,
    fg: params.get("fg") || sys.fg,
    bg: params.get("bg") || sys.bg,
    grid: parseBool(params.get("grid"), DEFAULTS.grid),
    spawn: LIFE_PATTERNS[spawnKey] ? spawnKey : DEFAULTS.spawn,
    x: Number.isFinite(x) ? Math.round(x) : DEFAULTS.x,
    y: Number.isFinite(y) ? Math.round(y) : DEFAULTS.y,
    rot: [0, 90, 180, 270].includes(rot) ? rot : DEFAULTS.rot
  };
}

function writeParams(state) {
  const params = new URLSearchParams();
  params.set("seed", state.seed);
  params.set("zoom", String(state.zoom));
  params.set("fg", state.fg);
  params.set("bg", state.bg);
  params.set("grid", state.grid ? "1" : "0");
  params.set("spawn", state.spawn);
  params.set("x", String(state.x));
  params.set("y", String(state.y));
  params.set("rot", String(state.rot));
  history.replaceState(null, "", `${location.pathname}?${params.toString()}`);
}

function formState() {
  return {
    seed: seedInput.value.trim() || newSeedValue(),
    zoom: clamp(Number(zoomInput.value), 2, 48),
    fg: fgInput.value,
    bg: bgInput.value,
    grid: gridInput.checked,
    spawn: spawnSelect.value,
    x: Math.round(Number(spawnXInput.value) || 0),
    y: Math.round(Number(spawnYInput.value) || 0),
    rot: Number(spawnRotSelect.value) || 0
  };
}

function revealUi() {
  document.documentElement.classList.remove("boot-pending");
}

const form = document.querySelector("#settings");
const seedInput = document.querySelector("#seed");
const seedRandomBtn = document.querySelector("#seed-random");
const zoomInput = document.querySelector("#zoom");
const zoomLabel = document.querySelector("#zoom-label");
const fgInput = document.querySelector("#fg");
const bgInput = document.querySelector("#bg");
const gridInput = document.querySelector("#grid");
const spawnSelect = document.querySelector("#spawn");
const spawnXInput = document.querySelector("#spawn-x");
const spawnYInput = document.querySelector("#spawn-y");
const spawnRotSelect = document.querySelector("#spawn-rot");
const spawnBtn = document.querySelector("#spawn-btn");
const canvas = document.querySelector("#life");
const playBtn = document.querySelector("#play");
const prevBtn = document.querySelector("#prev");
const nextBtn = document.querySelector("#next");
const resetBtn = document.querySelector("#reset");
const speedInput = document.querySelector("#speed");
const speedLabel = document.querySelector("#speed-label");
const statusGen = document.querySelector("#status-gen");
const statusPop = document.querySelector("#status-pop");
const statusCursor = document.querySelector("#status-cursor");
const statusState = document.querySelector("#status-state");

const initial = readParams();

for (const [id, pattern] of Object.entries(LIFE_PATTERNS)) {
  const opt = document.createElement("option");
  opt.value = id;
  opt.textContent = `${pattern.name} (${pattern.category})`;
  if (id === initial.spawn) opt.selected = true;
  spawnSelect.append(opt);
}

seedInput.value = initial.seed;
zoomInput.value = String(initial.zoom);
zoomLabel.textContent = `${initial.zoom}px`;
fgInput.value = initial.fg;
bgInput.value = initial.bg;
gridInput.checked = initial.grid;
spawnSelect.value = initial.spawn;
spawnXInput.value = String(initial.x);
spawnYInput.value = String(initial.y);
spawnRotSelect.value = String(initial.rot);
writeParams(initial);

const game = new Conway(canvas, {
  cellSize: initial.zoom,
  foreground: initial.fg,
  background: initial.bg,
  showGrid: initial.grid
});

// Refresh always restores generation 0 from the PRNG seed in the URL.
game.setRandomSeed(initial.seed, { render: false });
game.render(); // sync first paint before revealing UI
revealUi();

function syncStatus() {
  statusGen.textContent = String(game.generation);
  statusPop.textContent = String(game.population);
  statusState.textContent = game.running ? "running" : "paused";
  playBtn.textContent = game.running ? "Pause" : "Play";
  playBtn.setAttribute("aria-pressed", game.running ? "true" : "false");
  prevBtn.disabled = game.running || game.generation === 0;
  nextBtn.disabled = game.running;
}

game.onChange(syncStatus);
syncStatus();

function applyFormToGame({ resetSeed = false } = {}) {
  const state = formState();
  seedInput.value = state.seed;
  zoomInput.value = String(state.zoom);
  zoomLabel.textContent = `${state.zoom}px`;
  spawnXInput.value = String(state.x);
  spawnYInput.value = String(state.y);
  writeParams(state);
  window.__LIFE_BOOT__ = state;

  game.setZoom(state.zoom);
  game.setColors(state.fg, state.bg);
  game.setShowGrid(state.grid);

  if (resetSeed) {
    game.pause();
    game.setRandomSeed(state.seed);
  }

  syncStatus();
}

form.addEventListener("change", (event) => {
  const resetSeed = event.target === seedInput;
  applyFormToGame({ resetSeed });
});

seedInput.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  event.preventDefault();
  applyFormToGame({ resetSeed: true });
});

seedRandomBtn.addEventListener("click", () => {
  seedInput.value = newSeedValue();
  applyFormToGame({ resetSeed: true });
});

zoomInput.addEventListener("input", () => {
  zoomLabel.textContent = `${zoomInput.value}px`;
  applyFormToGame();
});

fgInput.addEventListener("input", () => applyFormToGame());
bgInput.addEventListener("input", () => applyFormToGame());

spawnBtn.addEventListener("click", () => {
  const state = formState();
  writeParams(state);
  window.__LIFE_BOOT__ = state;
  const pattern = LIFE_PATTERNS[state.spawn];
  if (!pattern) return;
  game.spawn(pattern.seed, state.x, state.y, state.rot);
  syncStatus();
});

playBtn.addEventListener("click", () => {
  game.toggle();
  syncStatus();
});

prevBtn.addEventListener("click", () => {
  if (!game.paused) return;
  game.prev();
});

nextBtn.addEventListener("click", () => {
  if (!game.paused) return;
  game.next();
});

resetBtn.addEventListener("click", () => {
  game.pause();
  game.resetToSeed();
  syncStatus();
});

let interval = Number(speedInput.value);
speedLabel.textContent = `${interval} ms`;

speedInput.addEventListener("input", () => {
  interval = Number(speedInput.value);
  speedLabel.textContent = `${interval} ms`;
});

const ro = new ResizeObserver(() => game.resize());
ro.observe(canvas);

function setCursorStatus(cell) {
  statusCursor.textContent = cell ? `${cell.x}, ${cell.y}` : "—";
}

canvas.addEventListener("mousemove", (event) => {
  const cell = game.cellAtEvent(event);
  setCursorStatus(cell);
  game.setHoverCell(cell);
});

canvas.addEventListener("mouseleave", () => {
  setCursorStatus(null);
  game.setHoverCell(null);
});

canvas.addEventListener("click", (event) => {
  const cell = game.cellAtEvent(event);
  if (!cell) return;
  spawnXInput.value = String(cell.x);
  spawnYInput.value = String(cell.y);
  applyFormToGame();
});

let last = 0;

function tick(now) {
  if (!last) last = now;
  const dt = Math.min(100, now - last);
  last = now;
  game.update(dt, interval);
  requestAnimationFrame(tick);
}

requestAnimationFrame(tick);
