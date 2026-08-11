const HISTORY_LIMIT = 1000;

function pack(x, y) {
  return `${x},${y}`;
}

function unpack(key) {
  const i = key.indexOf(",");
  return [Number(key.slice(0, i)), Number(key.slice(i + 1))];
}

function parseSeedRows(rows) {
  const alive = new Set();
  for (let y = 0; y < rows.length; y++) {
    for (let x = 0; x < rows[y].length; x++) {
      if (rows[y][x] === "#") alive.add(pack(x, y));
    }
  }
  return alive;
}

function cloneAlive(alive) {
  return new Set(alive);
}

function stepAlive(alive) {
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
  if (!alive.size) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  return { minX, minY, maxX, maxY };
}

/** FNV-1a → 32-bit seed for the PRNG. */
export function hashSeed(value) {
  const str = String(value);
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Rotate live cells by 0/90/180/270° clockwise around the pattern's top-left bbox.
 * @param {Set<string>} alive
 * @param {0|90|180|270} degrees
 */
export function rotateAlive(alive, degrees) {
  const rot = ((degrees % 360) + 360) % 360;
  if (!alive.size || rot === 0) return cloneAlive(alive);

  const { minX, minY, maxX, maxY } = bbox(alive);
  const w = maxX - minX + 1;
  const h = maxY - minY + 1;
  const next = new Set();

  for (const key of alive) {
    const [gx, gy] = unpack(key);
    const x = gx - minX;
    const y = gy - minY;
    let nx;
    let ny;
    if (rot === 90) {
      nx = h - 1 - y;
      ny = x;
    } else if (rot === 180) {
      nx = w - 1 - x;
      ny = h - 1 - y;
    } else if (rot === 270) {
      nx = y;
      ny = w - 1 - x;
    } else {
      nx = x;
      ny = y;
    }
    next.add(pack(minX + nx, minY + ny));
  }

  return next;
}

/**
 * Canvas Game of Life engine.
 * Call update() on a timer; call render() to paint (render is rAF-debounced).
 */
export class Conway {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {{ cellSize?: number, foreground?: string, background?: string, showGrid?: boolean }} [options]
   */
  constructor(canvas, options = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");

    this.cellSize = options.cellSize ?? 8;
    this.foreground = options.foreground ?? "#111111";
    this.background = options.background ?? "#ffffff";
    this.showGrid = options.showGrid ?? true;

    this.running = false;
    this.generation = 0;
    this.alive = new Set();
    this.seedAlive = new Set();
    this.seedKey = "";
    this.history = [];

    this.originX = 0;
    this.originY = 0;
    this.hoverCell = null;

    this._renderQueued = false;
    this._onChange = null;
  }

  onChange(fn) {
    this._onChange = fn;
  }

  get population() {
    return this.alive.size;
  }

  get paused() {
    return !this.running;
  }

  play() {
    this.running = true;
    this._acc = 0;
    this._emit();
  }

  pause() {
    this.running = false;
    this._acc = 0;
    this._emit();
  }

  toggle() {
    if (this.running) this.pause();
    else this.play();
  }

  setColors(foreground, background) {
    this.foreground = foreground;
    this.background = background;
    this.scheduleRender();
  }

  setZoom(cellSize) {
    this.cellSize = Math.max(1, Math.round(cellSize));
    this.scheduleRender();
  }

  setShowGrid(showGrid) {
    this.showGrid = Boolean(showGrid);
    this.scheduleRender();
  }

  /**
   * Build a deterministic pseudo-random soup from a seed string/number/UUID.
   * @param {string|number} seedKey
   * @param {{ width?: number, height?: number, density?: number }} [options]
   */
  setRandomSeed(seedKey, options = {}) {
    const width = options.width ?? 48;
    const height = options.height ?? 32;
    const density = options.density ?? 0.22;
    const rand = mulberry32(hashSeed(seedKey));
    const alive = new Set();
    const ox = -Math.floor(width / 2);
    const oy = -Math.floor(height / 2);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (rand() < density) alive.add(pack(ox + x, oy + y));
      }
    }

    this.seedKey = String(seedKey);
    this.seedAlive = alive;
    this.resetToSeed({ render: options.render !== false });
  }

  /**
   * Stamp a pattern onto the board at (x, y) with rotation.
   * (x, y) is the top-left of the pattern's bounding box after rotation.
   * @param {string[]} rows
   * @param {number} x
   * @param {number} y
   * @param {0|90|180|270} [rotation]
   */
  spawn(rows, x, y, rotation = 0) {
    let cells = parseSeedRows(rows);
    cells = rotateAlive(cells, rotation);

    if (!cells.size) return;

    const { minX, minY } = bbox(cells);
    const dx = Math.round(x) - minX;
    const dy = Math.round(y) - minY;

    for (const key of cells) {
      const [cx, cy] = unpack(key);
      this.alive.add(pack(cx + dx, cy + dy));
    }

    this.scheduleRender();
    this._emit();
  }

  /**
   * Restore the initial seeded view (generation 0).
   * @param {{ render?: boolean }} [options]
   */
  resetToSeed(options = {}) {
    this.alive = cloneAlive(this.seedAlive);
    this.history = [];
    this.generation = 0;
    this._centerOnAlive(this.alive);
    if (options.render !== false) this.scheduleRender();
    this._emit();
  }

  /** Advance one generation. Safe to spam; paint is debounced. */
  next() {
    this.history.push(cloneAlive(this.alive));
    if (this.history.length > HISTORY_LIMIT) this.history.shift();
    this.alive = stepAlive(this.alive);
    this.generation += 1;
    this.scheduleRender();
    this._emit();
  }

  /** Step back one generation when history exists. */
  prev() {
    if (!this.history.length) return false;
    this.alive = this.history.pop();
    this.generation -= 1;
    this.scheduleRender();
    this._emit();
    return true;
  }

  /**
   * Game tick: advance when enough time has elapsed.
   * @param {number} dt ms since last call
   * @param {number} interval ms per generation
   * @returns {number} leftover ms
   */
  update(dt, interval) {
    if (!this.running) return 0;

    let acc = (this._acc ?? 0) + dt;
    let steps = 0;
    const maxSteps = 32;

    while (acc >= interval && steps < maxSteps) {
      this.history.push(cloneAlive(this.alive));
      if (this.history.length > HISTORY_LIMIT) this.history.shift();
      this.alive = stepAlive(this.alive);
      this.generation += 1;
      acc -= interval;
      steps += 1;
    }

    this._acc = acc;

    if (steps) {
      this.scheduleRender();
      this._emit();
    }

    return acc;
  }

  /** Coalesce rapid next/prev/update paints into one animation frame. */
  scheduleRender() {
    if (this._renderQueued) return;
    this._renderQueued = true;
    requestAnimationFrame(() => {
      this._renderQueued = false;
      this.render();
    });
  }

  render() {
    const { canvas, ctx, cellSize } = this;
    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.clientWidth;
    const cssH = canvas.clientHeight;
    if (cssW < 1 || cssH < 1) return;

    const pixelW = Math.floor(cssW * dpr);
    const pixelH = Math.floor(cssH * dpr);
    if (canvas.width !== pixelW || canvas.height !== pixelH) {
      canvas.width = pixelW;
      canvas.height = pixelH;
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = this.background;
    ctx.fillRect(0, 0, cssW, cssH);

    const cols = Math.ceil(cssW / cellSize) + 1;
    const rows = Math.ceil(cssH / cellSize) + 1;
    const ox = Math.floor(this.originX - cols / 2);
    const oy = Math.floor(this.originY - rows / 2);

    if (this.showGrid) {
      ctx.strokeStyle = this._gridColor();
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let c = 0; c <= cols; c++) {
        const px = Math.round(c * cellSize) + 0.5;
        ctx.moveTo(px, 0);
        ctx.lineTo(px, cssH);
      }
      for (let r = 0; r <= rows; r++) {
        const py = Math.round(r * cellSize) + 0.5;
        ctx.moveTo(0, py);
        ctx.lineTo(cssW, py);
      }
      ctx.stroke();
    }

    ctx.fillStyle = this.foreground;
    for (const key of this.alive) {
      const [x, y] = unpack(key);
      const sx = (x - ox) * cellSize;
      const sy = (y - oy) * cellSize;
      if (sx + cellSize < 0 || sy + cellSize < 0 || sx > cssW || sy > cssH) continue;
      ctx.fillRect(sx, sy, cellSize, cellSize);
    }

    if (this.hoverCell) {
      const hx = (this.hoverCell.x - ox) * cellSize;
      const hy = (this.hoverCell.y - oy) * cellSize;
      if (hx + cellSize >= 0 && hy + cellSize >= 0 && hx <= cssW && hy <= cssH) {
        const alive = this.alive.has(pack(this.hoverCell.x, this.hoverCell.y));
        ctx.fillStyle = alive ? "rgba(255, 220, 60, 0.45)" : "rgba(59, 130, 246, 0.35)";
        ctx.fillRect(hx, hy, cellSize, cellSize);
        ctx.strokeStyle = alive ? "rgba(255, 200, 0, 0.95)" : "rgba(37, 99, 235, 0.95)";
        ctx.lineWidth = Math.max(1, Math.min(2, cellSize / 6));
        ctx.strokeRect(hx + 0.5, hy + 0.5, cellSize - 1, cellSize - 1);
      }
    }
  }

  /**
   * @param {{ x: number, y: number } | null} cell
   */
  setHoverCell(cell) {
    const prev = this.hoverCell;
    const same = (!prev && !cell)
      || (prev && cell && prev.x === cell.x && prev.y === cell.y);
    if (same) return;
    this.hoverCell = cell ? { x: cell.x, y: cell.y } : null;
    this.scheduleRender();
  }

  resize() {
    this.scheduleRender();
  }

  /** Top-left world cell currently mapped to canvas (0, 0). */
  viewOrigin() {
    const cssW = this.canvas.clientWidth;
    const cssH = this.canvas.clientHeight;
    const cols = Math.ceil(cssW / this.cellSize) + 1;
    const rows = Math.ceil(cssH / this.cellSize) + 1;
    return {
      x: Math.floor(this.originX - cols / 2),
      y: Math.floor(this.originY - rows / 2)
    };
  }

  /**
   * Map a mouse event on the canvas to world cell coordinates.
   * @param {MouseEvent} event
   * @returns {{ x: number, y: number } | null}
   */
  cellAtEvent(event) {
    const rect = this.canvas.getBoundingClientRect();
    const localX = event.clientX - rect.left;
    const localY = event.clientY - rect.top;
    if (localX < 0 || localY < 0 || localX >= rect.width || localY >= rect.height) {
      return null;
    }
    const origin = this.viewOrigin();
    return {
      x: origin.x + Math.floor(localX / this.cellSize),
      y: origin.y + Math.floor(localY / this.cellSize)
    };
  }

  _centerOnAlive(alive) {
    if (!alive.size) {
      this.originX = 0;
      this.originY = 0;
      return;
    }
    const { minX, minY, maxX, maxY } = bbox(alive);
    this.originX = (minX + maxX + 1) / 2;
    this.originY = (minY + maxY + 1) / 2;
  }

  _gridColor() {
    const bg = this.background.trim();
    if (bg.startsWith("#") && bg.length >= 7) {
      const r = Number.parseInt(bg.slice(1, 3), 16);
      const g = Number.parseInt(bg.slice(3, 5), 16);
      const b = Number.parseInt(bg.slice(5, 7), 16);
      const luma = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
      return luma > 0.5 ? "rgba(0,0,0,0.18)" : "rgba(255,255,255,0.18)";
    }
    return "rgba(127,127,127,0.35)";
  }

  _emit() {
    this._onChange?.(this);
  }
}
