import { Conway } from "./conway.js";
import { LIFE_PATTERNS } from "./life-data.js";

const DEFAULTS = {
  zoom: 12,
  grid: true,
  mode: "spawn",
  spawn: "glider",
  rot: 0,
  anchor: "center",
  flipX: false,
  flipY: false
};

function parseBool(value, fallback) {
  if (value === null || value === undefined || value === "") return fallback;
  if (value === "1" || value === "true" || value === "on") return true;
  if (value === "0" || value === "false" || value === "off") return false;
  return fallback;
}

function parseMode(value, params) {
  if (value === "inspect" || value === "spawn") return value;
  if (params?.has("click")) return parseBool(params.get("click"), true) ? "spawn" : "inspect";
  return DEFAULTS.mode;
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

/** Store colors without `#` so the fragment delimiter cannot truncate the query. */
function encodeColor(value) {
  return String(value || "").replace(/^#/, "").toLowerCase();
}

function decodeColor(value, fallback) {
  if (!value) return fallback;
  const hex = value.startsWith("#") ? value : `#${value}`;
  return /^#[0-9a-fA-F]{6}$/.test(hex) ? hex.toLowerCase() : fallback;
}

function readParams() {
  // Prefer blocking boot parse (src/boot.js) so seed/colors are stable before module runs.
  if (window.__LIFE_BOOT__) {
    const boot = window.__LIFE_BOOT__;
    const sys = systemColors();
    return {
      ...boot,
      fg: decodeColor(boot.fg, sys.fg),
      bg: decodeColor(boot.bg, sys.bg),
      mode: boot.mode === "inspect" ? "inspect" : "spawn",
      spawn: LIFE_PATTERNS[boot.spawn] ? boot.spawn : DEFAULTS.spawn
    };
  }

  const params = new URLSearchParams(location.search);
  const sys = systemColors();
  const spawnKey = params.get("spawn") || DEFAULTS.spawn;
  const zoom = clamp(Number(params.get("zoom") ?? DEFAULTS.zoom), 2, 48);
  const rot = Number(params.get("rot") ?? DEFAULTS.rot);

  return {
    seed: params.get("seed") || newSeedValue(),
    zoom: Number.isFinite(zoom) ? zoom : DEFAULTS.zoom,
    fg: decodeColor(params.get("fg"), sys.fg),
    bg: decodeColor(params.get("bg"), sys.bg),
    grid: parseBool(params.get("grid"), DEFAULTS.grid),
    mode: parseMode(params.get("mode"), params),
    spawn: LIFE_PATTERNS[spawnKey] ? spawnKey : DEFAULTS.spawn,
    rot: [0, 90, 180, 270].includes(rot) ? rot : DEFAULTS.rot,
    anchor: params.get("anchor") === "corner" ? "corner" : DEFAULTS.anchor,
    flipX: parseBool(params.get("flipX"), DEFAULTS.flipX),
    flipY: parseBool(params.get("flipY"), DEFAULTS.flipY)
  };
}

function writeParams(state) {
  const params = new URLSearchParams();
  params.set("seed", state.seed);
  params.set("zoom", String(state.zoom));
  params.set("fg", encodeColor(state.fg));
  params.set("bg", encodeColor(state.bg));
  params.set("grid", state.grid ? "1" : "0");
  params.set("mode", state.mode);
  params.set("spawn", state.spawn);
  params.set("rot", String(state.rot));
  params.set("anchor", state.anchor);
  params.set("flipX", state.flipX ? "1" : "0");
  params.set("flipY", state.flipY ? "1" : "0");
  const search = `?${params.toString()}`;
  history.replaceState(null, "", `${location.pathname}${search}`);

  if (aboutLink) aboutLink.href = `./about.html${search}`;
}

function formState() {
  return {
    seed: seedInput.value.trim() || newSeedValue(),
    zoom: clamp(Number(zoomInput.value), 2, 48),
    fg: fgInput.value,
    bg: bgInput.value,
    grid: gridInput.checked,
    mode: modeSelect.value === "inspect" ? "inspect" : "spawn",
    spawn: spawnSelect.value,
    rot: Number(spawnRotSelect.value) || 0,
    anchor: spawnAnchorSelect.value === "corner" ? "corner" : "center",
    flipX: spawnFlipXInput.checked,
    flipY: spawnFlipYInput.checked
  };
}

function spawnOptions(state) {
  return {
    rotation: state.rot,
    anchor: state.anchor,
    flipX: state.flipX,
    flipY: state.flipY
  };
}

function revealUi() {
  document.documentElement.classList.remove("boot-pending");
}

const form = document.querySelector("#settings");
const aboutLink = document.querySelector("#about-link");
const seedInput = document.querySelector("#seed");
const seedRandomBtn = document.querySelector("#seed-random");
const zoomInput = document.querySelector("#zoom");
const zoomLabel = document.querySelector("#zoom-label");
const fgInput = document.querySelector("#fg");
const bgInput = document.querySelector("#bg");
const gridInput = document.querySelector("#grid");
const modeSelect = document.querySelector("#mode");
const spawnSelect = document.querySelector("#spawn");
const spawnRotSelect = document.querySelector("#spawn-rot");
const spawnAnchorSelect = document.querySelector("#spawn-anchor");
const spawnFlipXInput = document.querySelector("#spawn-flip-x");
const spawnFlipYInput = document.querySelector("#spawn-flip-y");
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
modeSelect.value = initial.mode === "inspect" ? "inspect" : "spawn";
spawnSelect.value = initial.spawn;
spawnRotSelect.value = String(initial.rot);
spawnAnchorSelect.value = initial.anchor === "corner" ? "corner" : "center";
spawnFlipXInput.checked = Boolean(initial.flipX);
spawnFlipYInput.checked = Boolean(initial.flipY);
writeParams(initial);

const game = new Conway(canvas, {
  cellSize: initial.zoom,
  foreground: initial.fg,
  background: initial.bg,
  showGrid: initial.grid
});

function syncModeUi() {
  const mode = modeSelect.value === "inspect" ? "inspect" : "spawn";
  game.setMode(mode);
  canvas.style.cursor = mode === "spawn" ? "crosshair" : "default";
  form.dataset.mode = mode;
}

function syncGhost() {
  const pattern = LIFE_PATTERNS[spawnSelect.value];
  const anchor = spawnAnchorSelect.value === "corner" ? "corner" : "center";
  game.setGhostAnchor(anchor);
  if (!pattern) {
    game.setGhostPattern(null);
    return;
  }
  game.setGhostPattern(pattern.seed, {
    rotation: Number(spawnRotSelect.value) || 0,
    flipX: spawnFlipXInput.checked,
    flipY: spawnFlipYInput.checked
  });
}

// Refresh always restores generation 0 from the PRNG seed in the URL.
game.setRandomSeed(initial.seed, { render: false });
syncGhost();
syncModeUi();
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
  writeParams(state);
  window.__LIFE_BOOT__ = state;

  game.setZoom(state.zoom);
  game.setColors(state.fg, state.bg);
  game.setShowGrid(state.grid);
  syncGhost();
  syncModeUi();

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
  if (modeSelect.value !== "spawn") return;
  const cell = game.cellAtEvent(event);
  if (!cell) return;

  const state = formState();
  writeParams(state);
  window.__LIFE_BOOT__ = state;

  const pattern = LIFE_PATTERNS[state.spawn];
  if (!pattern) return;
  game.spawn(pattern.seed, cell.x, cell.y, spawnOptions(state));
  syncStatus();
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
