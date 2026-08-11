import { LIFE_PATTERNS } from "./life-data.js";

const gallery = document.querySelector("#gallery");
const speedInput = document.querySelector("#speed");
const speedLabel = document.querySelector("#speed-label");
const toggleButton = document.querySelector("#toggle");

let running = true;
let generationDuration = Number(speedInput.value);
let generationStartedAt = 0;

function pack(x, y) {
  return `${x},${y}`;
}

function unpack(key) {
  const i = key.indexOf(",");
  return [Number(key.slice(0, i)), Number(key.slice(i + 1))];
}

function parseSeed(seed) {
  const alive = new Set();
  for (let y = 0; y < seed.length; y++) {
    for (let x = 0; x < seed[y].length; x++) {
      if (seed[y][x] === "#") alive.add(pack(x, y));
    }
  }
  return { alive, cols: seed[0].length, rows: seed.length };
}

function step(alive) {
  const counts = new Map();
  for (const key of alive) {
    const [x, y] = unpack(key);
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const k = pack(x + dx, y + dy);
        counts.set(k, (counts.get(k) || 0) + 1);
      }
    }
  }
  const next = new Set();
  for (const [key, n] of counts) {
    if (n === 3 || (n === 2 && alive.has(key))) next.add(key);
  }
  return next;
}

function bbox(alive) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const key of alive) {
    const [x, y] = unpack(key);
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  return { minX, minY, maxX, maxY };
}

function shiftAlive(alive, dx, dy) {
  if (dx === 0 && dy === 0) return alive;
  const next = new Set();
  for (const key of alive) {
    const [x, y] = unpack(key);
    next.add(pack(x + dx, y + dy));
  }
  return next;
}

function homeAlive(alive, cols, rows) {
  if (!alive.size) return alive;
  const { minX, minY, maxX, maxY } = bbox(alive);
  const width = maxX - minX + 1;
  const height = maxY - minY + 1;
  const targetMinX = Math.floor((cols - width) / 2);
  const targetMinY = Math.floor((rows - height) / 2);
  return shiftAlive(alive, targetMinX - minX, targetMinY - minY);
}

function prepareTransition(item) {
  if (item.pattern.period === 1) {
    item.pendingAlive = item.alive;
    item.moveX = 0;
    item.moveY = 0;
    return;
  }

  const next = step(item.alive);
  if (item.isShip) {
    const [dx, dy] = item.pattern.velocity;
    item.moveX = dx / item.pattern.period;
    item.moveY = dy / item.pattern.period;
    item.pendingAlive = homeAlive(next, item.cols, item.rows);
  } else {
    item.moveX = 0;
    item.moveY = 0;
    item.pendingAlive = next;
  }
}

function cellSize(item) {
  const value = getComputedStyle(item.board).getPropertyValue("--cell-size");
  return Number.parseFloat(value) || 10;
}

function setGridScroll(item, t) {
  if (!item.isShip) return;
  const size = cellSize(item);
  const x = item.gridOffsetX - item.moveX * size * t;
  const y = item.gridOffsetY - item.moveY * size * t;
  item.board.style.backgroundPosition = `${x}px ${y}px`;
}

function commitGeneration(item) {
  if (item.isShip) {
    const size = cellSize(item);
    item.gridOffsetX -= item.moveX * size;
    item.gridOffsetY -= item.moveY * size;
  }
  item.alive = item.pendingAlive;
  renderCells(item);
  prepareTransition(item);
  setGridScroll(item, 0);
}

function renderCells(item) {
  const { inner, alive, cols, rows } = item;
  const frag = document.createDocumentFragment();
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const cell = document.createElement("span");
      cell.className = alive.has(pack(x, y))
        ? "life-cell is-alive"
        : "life-cell";
      frag.append(cell);
    }
  }
  inner.replaceChildren(frag);
}

function makePatternCard(pattern) {
  const parsed = parseSeed(pattern.seed);
  const isShip = pattern.category === "Spaceships";
  const cols = parsed.cols;
  const rows = parsed.rows;
  const alive = isShip ? homeAlive(parsed.alive, cols, rows) : parsed.alive;

  const card = document.createElement("article");
  card.className = "min-h-[180px] rounded-[10px] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-3.5 shadow-sm";

  const header = document.createElement("div");
  header.className = "mb-3.5 flex items-baseline justify-between gap-3";

  const title = document.createElement("h3");
  title.className = "m-0 text-[0.95rem] font-semibold";
  title.textContent = pattern.name;

  const info = document.createElement("span");
  info.className = "whitespace-nowrap text-xs text-zinc-500 dark:text-zinc-400";
  info.textContent = pattern.period === 1
    ? "still · seed only"
    : `period ${pattern.period} · computed`;

  header.append(title, info);

  const board = document.createElement("div");
  board.className = "life-board border border-zinc-300 dark:border-zinc-700";
  board.style.setProperty("--rows", rows);
  board.style.setProperty("--cols", cols);

  const inner = document.createElement("div");
  inner.className = "life-board-inner";
  board.append(inner);
  card.append(header, board);

  const item = {
    card,
    board,
    inner,
    pattern,
    cols,
    rows,
    isShip,
    alive,
    pendingAlive: null,
    moveX: 0,
    moveY: 0,
    gridOffsetX: 0,
    gridOffsetY: 0
  };

  renderCells(item);
  prepareTransition(item);
  return item;
}

const groups = ["Still lifes", "Oscillators", "Spaceships"];
const rendered = [];

for (const groupName of groups) {
  const section = document.createElement("section");
  section.className = "mb-9";

  const heading = document.createElement("h2");
  heading.className = "mb-3 mt-0 text-[1.05rem] font-semibold";
  heading.textContent = groupName;

  const cards = document.createElement("div");
  cards.className = "grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3.5";

  for (const pattern of Object.values(LIFE_PATTERNS).filter((p) => p.category === groupName)) {
    const item = makePatternCard(pattern);
    rendered.push(item);
    cards.append(item.card);
  }

  section.append(heading, cards);
  gallery.append(section);
}

function tick(now) {
  if (!running) {
    requestAnimationFrame(tick);
    return;
  }

  if (!generationStartedAt) generationStartedAt = now;

  let t = (now - generationStartedAt) / generationDuration;
  if (t >= 1) {
    for (const item of rendered) commitGeneration(item);
    generationStartedAt = now;
    t = 0;
  }

  for (const item of rendered) {
    if (item.isShip) setGridScroll(item, Math.min(t, 1));
  }

  requestAnimationFrame(tick);
}

speedInput.addEventListener("input", () => {
  generationDuration = Number(speedInput.value);
  speedLabel.textContent = `${generationDuration} ms`;
});

toggleButton.addEventListener("click", () => {
  running = !running;
  toggleButton.textContent = running ? "Pause" : "Play";
  if (running) generationStartedAt = 0;
});

speedLabel.textContent = `${generationDuration} ms`;
requestAnimationFrame(tick);
