# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project

Menouchat Chalom displays a synagogue's prayer times (zmanim), Hebrew calendar information and a slideshow on a full-screen display, with an admin to edit times, slides, location and display layout from the PC or from a phone on the local Wi-Fi.

This branch (`v2`) is a full TypeScript rewrite. **`docs/v2/plan.md` is the project memory**: read it first, take the next unchecked step, and tick it in the same PR. The v1 code (plain JavaScript, Express + Electron Forge) lives on `main` until v2 is merged.

## Stack

- Electron 41+ (`contextIsolation`, `sandbox`, no `nodeIntegration`), built with electron-vite, packaged with electron-builder (Windows NSIS), updated with `electron-updater` from GitHub Releases.
- TypeScript strict everywhere; React + Vite for the web app; zod for every schema; tRPC v11 on Fastify, SSE subscriptions for live updates.
- Admin UI: React Aria Components styled with Tailwind CSS v4 (reasons in `docs/v2/plan.md` §9.1).
- `kosher-zmanim` and `@hebcal/core` (pinned, see the plan) for calculations.
- pdf.js in a Web Worker for PDF → JPEG conversion.
- Vitest, ESLint (`strict-type-checked`), Prettier, pnpm workspace.

## Commands

Requires Node.js 24+ and pnpm (version pinned in the root `package.json`).

- `pnpm install` — install the workspace (Electron downloads its binary in a postinstall script).
- `pnpm dev` — run the Vite dev server for `apps/web` and the Electron app (`electron-vite dev --watch`) in parallel. The HTTP server listens on `127.0.0.1:3741`; the window loads the Vite server on `127.0.0.1:5173`, which proxies `/trpc` to it.
- Only the `main` display opens at launch: a 540×960 window in `pnpm dev`, plain full screen in production. Move the mouse over it for the "ניהול" button, or press Ctrl+Alt+A, to open the admin. Updates are only checked in packaged builds.
- `pnpm build` — bundle `apps/desktop` (main + preload into `out/`) and `apps/web` (into `dist/`).
- `pnpm test` — run Vitest across every package (`vitest.config.ts` lists them as projects).
- `pnpm lint` — ESLint (`strict-type-checked`) and `prettier --check`; `pnpm format` rewrites formatting.
- `pnpm typecheck` — `tsc --noEmit` in every package.
- `pnpm dist` — build, then produce the Windows NSIS installer in `apps/desktop/release/`. `makensis` only runs on Windows or x64 Linux/macOS; CI builds the installer on `windows-latest`.
- `pnpm --filter @menouchat/reference-tests generate` / `check` — regenerate or verify `tests/fixtures/v1-reference.json` from the verbatim v1 code in `tests/reference/v1/` (about 25 s; `check` runs in CI). See plan §6.
- `pnpm --filter menouchat-chalom preview` — run the production build in Electron, served by the embedded server.

CI: `.github/workflows/v2-ci.yml` runs typecheck, lint, test and build on every PR and push to `v2`, then builds the installer, blockmap and `latest.yml` on Windows. `.github/workflows/build.yml` is the release workflow, triggered by pushes to `main`.

## Layout

```
packages/core     pure calculations (zmanim, candle lighting, daf yomi, parasha, Hebrew date)
packages/shared   zod schemas, derived types, API contracts, Hebrew UI strings
apps/desktop      Electron main + preload: store, services, HTTP server, windows, updates, v1 import
apps/web          React SPA: /admin, /display/:id, layouts/, workers/
tests/reference   verbatim v1 code and the fixture generator
tests/fixtures    v1 reference outputs (generated, never edited)
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

## Workspace notes

- `packages/core` and `packages/shared` export their TypeScript sources directly (no build step); Vite and electron-vite bundle them. Relative imports always carry the `.ts`/`.tsx` extension, because Vite's config loader runs `@menouchat/shared` through Node's native TypeScript support.
- `packages/core` API: `computeDay(date, location, options)` returns the daily zmanim, the coming Shabbat's times and the Hebrew calendar info for a `CivilDate` (`{ year, month, day }` in the location's time zone). Each time is a `Zman` (`instant` in epoch ms, `time` as `HH:MM` truncated in the location's zone) or `null` when it does not occur. ESLint forbids Node/Electron imports, `Date.now()` and `new Date()` there.
- `@hebcal/core` 3.50.4 has no `types` condition in its `exports`: every package that type-checks code importing it needs the `paths` mapping found in `packages/core/tsconfig.json` (and `@types/node`, which its declarations reference). Keep `@hebcal/core` 3.50.4 and `kosher-zmanim` 0.8.2 pinned until an upgrade passes the reference tests.
- The desktop package is named `menouchat-chalom` (it fixes the installer name and, with the explicit `userData` path in `src/main/index.ts`, the v1 data folder).
- The web app imports the `AppRouter` type from `menouchat-chalom/api` (`apps/desktop/src/main/api/`). That folder must stay free of Node, Electron and server code; ESLint enforces it. Services are injected into `createAppRouter`.
- The main process passes the bridge (`baseUrl`, per-launch `token`) to the sandboxed preload as a `--menouchat-bridge` command-line switch; the preload validates it with zod and exposes it as `window.menouchatDesktop`. Requests carrying `Authorization: Bearer <token>` are treated as local clients.
- Runtime dependencies of `apps/desktop` (`fastify`, `@trpc/server`, …) are externalised and packaged by electron-builder; workspace packages are dev dependencies so that they are bundled. The preload is fully bundled as CommonJS, as sandboxing requires.

## Display

A display renders a `DisplayState` pushed by the server (`display.onState`, SSE) through the layout named by `layoutId`. To add a layout, create `apps/web/src/layouts/<id>/` with a component and a zod options schema whose every field has a default, and register it in `layouts/registry.ts`. Anything that changes settings, schedule, slides or displays must call the display-state service's `notifyChanged()`.

## Admin and access

- Admin procedures use `adminProcedure` (in `apps/desktop/src/main/api/router.ts`). It lets through local windows, which present the launch token, and phones signed in with the PIN session cookie. Display procedures stay public and read-only.
- Business logic lives in `apps/desktop/src/main/services/admin-service.ts`. Every write goes through its queue and wakes the display and admin streams (`ChangeHub.notify()`). Business-rule failures throw `AdminError` (`NOT_FOUND`, `BAD_REQUEST`, `PRECONDITION_FAILED`), which the API turns into the matching status.
- Admin UI code is in `apps/web/src/admin/`: cards, `useDraft`, `useAction` (toasts), and fields that follow the plan §9 rules. The admin offers exactly v1's features (plan §9.2): times, four slide slots, seconds per slide, phone access. Ask the owner before adding anything to it.
- `pnpm dev` writes to this machine's real `userData` as soon as you save in the admin. Delete `data/` and `slides/` there to get back to a first launch.

## Data

Stored in Electron `userData/data/` (`settings.json`, `schedule.json`, `slides.json`, `displays.json`) and `userData/slides/<id>/`. Schemas and defaults live in `packages/shared/src/persisted/`; every read and write goes through `createStore()` in `apps/desktop/src/main/store/`. Bumping a document's `schemaVersion` requires a migration in its definition (`store.ts`) and a test. On first launch, v1 data in `userData/db/` and `userData/images/` is imported, never modified. Schemas and migration rules are in `docs/v2/plan.md` §4.7 and §5.

## Reference tests

`tests/fixtures/v1-reference.json` records v1 outputs. v2 must match them exactly, except candle lighting, parasha separators and the daf yomi tractate name (v1 defects, checked against `correctedV1Bugs`; plan §3.4 and §6.1). Never edit fixtures by hand or loosen a comparison to make a test pass.

## Conventions

- **Everything in English**: code, identifiers, comments, logs, error messages, commits, docs. Only user-facing UI text is Hebrew (RTL), and it lives in one strings module in `packages/shared`.
- No `any`, no dead code, no stray `console.log`; comments explain why, not what.
- Small single-purpose modules; typed errors, always handled; zod at every boundary.
- Admin UI is mobile first (usable from 320 px), accessible, one card per topic, toast feedback, no page reloads. Full rules in `docs/v2/plan.md` §9.
- Conventional commits; one PR per plan step into `v2`; CI (`typecheck`, `lint`, `test`, `build`) must pass.

## Release

Every push to `main` triggers `.github/workflows/build.yml`. It computes the next version (patch bump, or the newer version in `apps/desktop/package.json`), commits it with `[skip ci]`, tags it, builds the Windows installer and publishes a GitHub Release that installed copies update to (plan §10). Never push to `main` without the owner's explicit approval: it releases to the synagogue PC. Work on `v2` or branches off it until it is merged.
