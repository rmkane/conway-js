# Conway's Game of Life

Browser app with a full simulator and a pattern gallery.

```bash
cd conway
python3 -m http.server 8000
```

- Simulator: [http://localhost:8000/](http://localhost:8000/)
- Pattern gallery: [http://localhost:8000/about.html](http://localhost:8000/about.html)

## Layout

```
index.html          Simulator shell
about.html          Pattern gallery (former demo)
src/
  conway.js         Conway game class (update / render)
  boot.js           Blocking URL-param parse (before paint)
  simulator.js      Simulator UI, query-param binding
  about.js          Gallery animations
  life-data.js      Seed patterns
  styles/life-board.css  Tiny CSS for dynamic gallery boards (Tailwind elsewhere)
```

## Simulator query params

| Param | Meaning |
|-------|---------|
| `seed` | PRNG seed (UUID or number) for the random starting soup |
| `zoom` | Cell size in pixels |
| `fg`   | Alive cell color (`rrggbb`, no `#`) |
| `bg`   | Background color (`rrggbb`, no `#`) |
| `grid` | Show cell grid (`1` / `0`) |
| `mode` | Board interaction: `spawn` or `inspect` |
| `spawn`| Pattern id for spawn mode (`glider`, …) |
| `rot`  | Spawn orientation: `0`, `90`, `180`, or `270` |
| `anchor` | Cursor anchor: `center` or `corner` |
| `flipX` / `flipY` | Mirror spawn pattern (`1` / `0`) |

Refreshing always restores generation 0 from the PRNG `seed` (spawns are not replayed).
