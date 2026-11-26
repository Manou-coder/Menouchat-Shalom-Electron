# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project

Menouchat Chalom displays a synagogue's prayer times (zmanim), Hebrew calendar information and a slideshow on a full-screen display, with an admin to edit times, slides, location and display layout from the PC or from a phone on the local Wi-Fi.

This branch (`v2`) is a full TypeScript rewrite. **`docs/v2/plan.md` is the project memory**: read it first, take the next unchecked step, and tick it in the same PR. The v1 code (plain JavaScript, Express + Electron Forge) lives on `main` until v2 is merged.

## Stack

- Electron 41+ (`contextIsolation`, `sandbox`, no `nodeIntegration`), built with electron-vite, packaged with electron-builder (Windows NSIS), updated with `electron-updater` from GitHub Releases.
- TypeScript strict everywhere; React + Vite for the web app; zod for every schema; tRPC v11 on Fastify, SSE subscriptions for live updates.
- `kosher-zmanim` and `@hebcal/core` (pinned, see the plan) for calculations.
- pdf.js in a Web Worker for PDF → JPEG conversion.
- Vitest, ESLint (`strict-type-checked`), Prettier, pnpm workspace.

## Commands

To be confirmed when step 1 (skeleton) lands; update this section then.

- `pnpm dev` — run the app in development.
- `pnpm build` — build all packages.
- `pnpm test` — run Vitest.
- `pnpm lint` / `pnpm typecheck` — static checks.
- `pnpm dist` — build the Windows installer.

## Layout

```
packages/core     pure calculations (zmanim, candle lighting, daf yomi, parasha, Hebrew date)
packages/shared   zod schemas, derived types, API contracts, Hebrew UI strings
apps/desktop      Electron main + preload: store, services, HTTP server, windows, updates, v1 import
apps/web          React SPA: /admin, /display/:id, layouts/, workers/
tests/fixtures    v1 reference outputs
docs/v2           rewrite plan
```

## Architecture rules

- One typed HTTP API (tRPC) for every client: Electron windows, phone, future screens. Do not add IPC channels for business logic; the preload only passes the per-launch token and base URL.
- `packages/core` is pure: no I/O, no `Date.now()` (the date is a parameter), no Electron or Node APIs.
- All disk access goes through the `store` module in `apps/desktop`: zod-validated reads, atomic writes (temp file → fsync → rename, `.bak` kept).
- Zmanim are computed on the server and sent as a `DisplayState` snapshot; displays only render and animate.
- Times are always formatted in the configured location's time zone, never the PC's.
- A display layout is a React component plus a zod options schema, registered by id. Displays reference layouts by id.
- The server binds to `127.0.0.1` unless phone access is enabled; admin routes require the PIN session.

## Data

Stored in Electron `userData/data/` (`settings.json`, `schedule.json`, `slides.json`, `displays.json`) and `userData/slides/<id>/`. On first launch, v1 data in `userData/db/` and `userData/images/` is imported, never modified. Schemas and migration rules are in `docs/v2/plan.md` §4.7 and §5.

## Reference tests

`tests/fixtures/v1-reference.json` records v1 outputs. v2 must match them exactly, except parasha and candle lighting (known v1 bugs, checked against corrected expectations). Never edit fixtures by hand or loosen a comparison to make a test pass.

## Conventions

- **Everything in English**: code, identifiers, comments, logs, error messages, commits, docs. Only user-facing UI text is Hebrew (RTL), and it lives in one strings module in `packages/shared`.
- No `any`, no dead code, no stray `console.log`; comments explain why, not what.
- Small single-purpose modules; typed errors, always handled; zod at every boundary.
- Admin UI is mobile first (usable from 320 px), accessible, one card per topic, toast feedback, no page reloads. Full rules in `docs/v2/plan.md` §9.
- Conventional commits; one PR per plan step into `v2`; CI (`typecheck`, `lint`, `test`, `build`) must pass.

## Release

On `main`, every push triggers `.github/workflows/build.yml`, which bumps the version, tags and publishes a GitHub Release to the synagogue PC. Never push to `main` without the owner's explicit approval. Work on `v2` (or branches off it) until the release step of the plan.
