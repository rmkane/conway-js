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

  /** Accept #rrggbb or rrggbb; never keep bare # in the query string. */
  function decodeColor(value, fallback) {
    if (!value) return fallback;
    const hex = value.startsWith("#") ? value : `#${value}`;
    return /^#[0-9a-fA-F]{6}$/.test(hex) ? hex.toLowerCase() : fallback;
  }

  function encodeColor(value) {
    return String(value || "").replace(/^#/, "").toLowerCase();
  }

  function parseMode(value) {
    if (value === "inspect" || value === "spawn") return value;
    // Legacy click=0/1 → mode
    if (params.has("click")) return parseBool(params.get("click"), true) ? "spawn" : "inspect";
    return "spawn";
  }

  const zoomRaw = Number(params.get("zoom") ?? 12);
  const zoom = clamp(Number.isFinite(zoomRaw) ? zoomRaw : 12, 2, 48);
  const rotRaw = Number(params.get("rot") ?? 0);
  const sysFg = dark ? "#e8e8e8" : "#111111";
  const sysBg = dark ? "#121212" : "#ffffff";

  const boot = {
    seed: params.get("seed") || newSeedValue(),
    zoom,
    fg: decodeColor(params.get("fg"), sysFg),
    bg: decodeColor(params.get("bg"), sysBg),
    grid: parseBool(params.get("grid"), true),
    mode: parseMode(params.get("mode")),
    spawn: params.get("spawn") || "glider",
    rot: [0, 90, 180, 270].includes(rotRaw) ? rotRaw : 0,
    anchor: params.get("anchor") === "corner" ? "corner" : "center",
    flipX: parseBool(params.get("flipX"), false),
    flipY: parseBool(params.get("flipY"), false)
  };

  // Always rewrite colors as hashless hex so `#` cannot truncate the query.
  params.set("seed", boot.seed);
  params.set("zoom", String(boot.zoom));
  params.set("fg", encodeColor(boot.fg));
  params.set("bg", encodeColor(boot.bg));
  params.set("grid", boot.grid ? "1" : "0");
  params.set("mode", boot.mode);
  params.set("spawn", boot.spawn);
  params.set("rot", String(boot.rot));
  params.set("anchor", boot.anchor);
  params.set("flipX", boot.flipX ? "1" : "0");
  params.set("flipY", boot.flipY ? "1" : "0");
  params.delete("click");
  params.delete("x");
  params.delete("y");
  history.replaceState(null, "", `${location.pathname}?${params.toString()}`);

  window.__LIFE_BOOT__ = boot;
  document.documentElement.classList.add("boot-pending");
})();
