# Conway's Game of Life

Browser app with a full simulator and a pattern gallery.

Repository: [github.com/rmkane/conway-js](https://github.com/rmkane/conway-js)

Stack: Vite, TypeScript, Tailwind CSS, pnpm, Oxfmt, Oxlint, Vitest, and Fallow.

```bash
make install
make hooks    # once: enable .githooks/pre-commit
make dev
```

- Simulator: [http://localhost:5173/](http://localhost:5173/)
- Pattern gallery: [http://localhost:5173/about.html](http://localhost:5173/about.html)

```bash
make help       # sectioned list of all targets
make check      # format-check + lint + typecheck + test + analyze + build
make precommit  # format-check + lint + test + typecheck (git hook)
```

Fallow scripts (`pnpm analyze:*` / `make analyze-*`): `analyze` (dead-code+dupes, CI), `analyze:full`, `analyze:health`, `analyze:hotspots`, `analyze:targets`, `analyze:audit`, `analyze:security`, `analyze:list`, `analyze:viz`, `analyze:watch`, `analyze:fix`.

CI (`.github/workflows/ci.yml`) runs the same gate on Node 24 with pnpm.

## Deploy

```bash
make build   # writes dist/
```

Asset URLs are relative (`base: './'`), so you can serve or drop `dist/` from any path (site root or a subdirectory). Upload the whole folder, including `dist/assets/`.

## Layout

```none
index.html                 Simulator shell
about.html                 Pattern gallery
Makefile                   Dev / quality targets
packages/
  dom/                     @conway/dom — el() + mustGet() (no deps)
  geom/                    @conway/geom — discrete 2D geometry
  query/                   @conway/query — generic URL query helpers (no app deps)
  rng/                     @conway/rng — hashSeed + mulberry32 (no deps)
src/
  app/                     Page entrypoints + simulator URL glue
    simulator.ts
    gallery.ts
    params.ts              LifeParams ↔ @conway/query
  life/                    Domain: cells, shapes, engine
    cells.ts               B3/S23 set helpers
    shape.ts               #/. shape parser
    pattern.ts             Shape rows → transformed offsets
    rng.ts                 Random soup (uses @conway/rng)
    data.ts                Pattern catalog
    identify.ts            Hover: match live clusters to catalog
    paint.ts               Canvas paint from a scene snapshot
    conway.ts              Simulation engine + interaction types
  styles/
    main.css               Tailwind entry
    life-board.css         Gallery board CSS
.githooks/pre-commit
scripts/install-hooks.sh
```

## Simulator query params

| Param             | Meaning                                                 |
| ----------------- | ------------------------------------------------------- |
| `seed`            | PRNG seed (UUID or number) for the random starting soup |
| `zoom`            | Cell size in pixels                                     |
| `fg`              | Alive cell color (`rrggbb`, no `#`)                     |
| `bg`              | Background color (`rrggbb`, no `#`)                     |
| `grid`            | Show cell grid (`1` / `0`)                              |
| `origin`          | Show world-origin crosshair (`1` / `0`)                 |
| `mode`            | Board interaction: `spawn` or `inspect`                 |
| `spawn`           | Pattern id for spawn mode (`glider`, …)                 |
| `rot`             | Spawn orientation: `0`, `90`, `180`, or `270`           |
| `anchor`          | Cursor anchor: `center` or `corner`                     |
| `flipX` / `flipY` | Mirror spawn pattern (`1` / `0`)                        |

Refreshing always restores generation 0 from the PRNG `seed` (spawns are not replayed).

## License

This project is licensed under the [MIT License](./LICENSE).
