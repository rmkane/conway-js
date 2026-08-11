# Conway's Game of Life

Browser app with a full simulator and a pattern gallery.

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

CI (`.github/workflows/ci.yml`) runs the same gate on Node 24 with pnpm.

## Layout

```none
index.html              Simulator shell
about.html              Pattern gallery
Makefile                Dev / quality targets
src/
  conway.ts             Canvas engine (update / render)
  pattern.ts            Shape rotate / offsets / spawn anchor
  rng.ts                PRNG + random soup
  life.ts               Shared B3/S23 cell helpers
  life-data.ts          Pattern shapes (`shape`, optional `pad`)
  types.ts              Shared domain types
  params.ts             URL query-param parse / write
  simulator.ts          Simulator UI binding
  about.ts              Gallery animations
  dom.ts                Typed DOM helpers
  styles/main.css       Tailwind entry
  styles/life-board.css Gallery board CSS
.githooks/pre-commit    Runs make precommit
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
| `mode`            | Board interaction: `spawn` or `inspect`                 |
| `spawn`           | Pattern id for spawn mode (`glider`, …)                 |
| `rot`             | Spawn orientation: `0`, `90`, `180`, or `270`           |
| `anchor`          | Cursor anchor: `center` or `corner`                     |
| `flipX` / `flipY` | Mirror spawn pattern (`1` / `0`)                        |

Refreshing always restores generation 0 from the PRNG `seed` (spawns are not replayed).
