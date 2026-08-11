// Blocking (non-module) boot: parse URL before paint so the UI can hydrate without flicker.
(() => {
  const params = new URLSearchParams(location.search);
  const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;

  function clamp(n, min, max) {
    return Math.min(max, Math.max(min, n));
  }

  function parseBool(value, fallback) {
    if (value === null || value === undefined || value === "") return fallback;
    if (value === "1" || value === "true" || value === "on") return true;
    if (value === "0" || value === "false" || value === "off") return false;
    return fallback;
  }

  function newSeedValue() {
    if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
    return String(Math.floor(Math.random() * 1e15));
  }

  const zoomRaw = Number(params.get("zoom") ?? 12);
  const zoom = clamp(Number.isFinite(zoomRaw) ? zoomRaw : 12, 2, 48);
  const rotRaw = Number(params.get("rot") ?? 0);
  const xRaw = Number(params.get("x") ?? 0);
  const yRaw = Number(params.get("y") ?? 0);
  const hadSeed = params.has("seed");

  const boot = {
    seed: params.get("seed") || newSeedValue(),
    zoom,
    fg: params.get("fg") || (dark ? "#e8e8e8" : "#111111"),
    bg: params.get("bg") || (dark ? "#121212" : "#ffffff"),
    grid: parseBool(params.get("grid"), true),
    spawn: params.get("spawn") || "glider",
    x: Number.isFinite(xRaw) ? Math.round(xRaw) : 0,
    y: Number.isFinite(yRaw) ? Math.round(yRaw) : 0,
    rot: [0, 90, 180, 270].includes(rotRaw) ? rotRaw : 0
  };

  // Persist a freshly generated seed immediately so refresh is stable.
  if (!hadSeed) {
    params.set("seed", boot.seed);
    params.set("zoom", String(boot.zoom));
    params.set("fg", boot.fg);
    params.set("bg", boot.bg);
    params.set("grid", boot.grid ? "1" : "0");
    params.set("spawn", boot.spawn);
    params.set("x", String(boot.x));
    params.set("y", String(boot.y));
    params.set("rot", String(boot.rot));
    history.replaceState(null, "", `${location.pathname}?${params.toString()}`);
  }

  window.__LIFE_BOOT__ = boot;
  document.documentElement.classList.add("boot-pending");
})();
