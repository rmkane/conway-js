# Conway's Game of Life

Browser app with a full simulator and a pattern gallery. Built with Vite, TypeScript, Tailwind CSS, and the Oxc toolchain (Oxfmt + Oxlint).

```bash
cd conway
make install
make dev
```

- Simulator: [http://localhost:5173/](http://localhost:5173/)
- Pattern gallery: [http://localhost:5173/about.html](http://localhost:5173/about.html)

```bash
make build          # outputs to dist/
make preview        # serve dist locally
make format         # Oxfmt
make lint           # Oxlint
make test           # Vitest
make check          # format-check + lint + test + build
make help           # list targets
```

## Layout

```none
index.html          Simulator shell
about.html          Pattern gallery
src/
  conway.ts         Conway game class (update / render)
  params.ts         URL query-param parse / write
  simulator.ts      Simulator UI binding
  about.ts          Gallery animations
  life-data.ts      Pattern shapes
  styles/main.css   Tailwind entry + gallery board CSS
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
