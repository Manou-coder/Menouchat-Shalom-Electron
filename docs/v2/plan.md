# Menouchat Chalom v2 — rewrite plan

This document is the project memory for the v2 rewrite. Each work session picks the next unchecked step in [§7](#7-steps), does it on a branch off `v2`, and checks the box in the same PR.

Status: plan approved on 2026-11-26. All steps done; v2.0.0 is released when `v2` is merged into `main`.

## 1. Goals

Rewrite Menouchat Chalom (synagogue prayer-times display) in strict TypeScript, keeping what works in v1 and fixing what is fragile:

- configurable city instead of hard-coded Jerusalem;
- edit times and slides from a phone on the local Wi-Fi;
- multi-page PDF slides with the original file kept;
- full-screen kiosk display that starts with Windows, survives crashes and updates itself from GitHub Releases;
- a data model ready for several display layouts selectable from the admin;
- a clean, professional codebase: typed end to end, tested, linted, documented.

## 2. Product decisions

Answers given by the owner on 2026-11-26:

| Question                               | Answer                                          | Consequence                                                                                                                                                                             |
| -------------------------------------- | ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Edit from a phone?                     | Yes, on the local Wi-Fi                         | Keep an embedded HTTP server, PIN-protected, mobile-friendly admin                                                                                                                      |
| How many places?                       | One synagogue, city configurable                | Location lives in settings, Jerusalem by default                                                                                                                                        |
| Screens on the synagogue PC?           | One PC, one screen                              | Public display is full screen; admin opens on demand                                                                                                                                    |
| Operating system                       | Windows                                         | NSIS installer + `electron-updater`                                                                                                                                                     |
| v1 calculation bugs (§3.4)             | Fix both                                        | Reference tests flag candle lighting as a known v1 bug (parasha turned out correct, see §3.4); two display defects fixed too (§6.1)                                                     |
| Future "several screens"               | Several layouts, chosen from the admin          | Displays and layouts are first-class in the data model from v2.0                                                                                                                        |
| Code style                             | Everything in English, professional quality     | See §8                                                                                                                                                                                  |
| Admin UI                               | Clean and simple on desktop and small phones    | See §9                                                                                                                                                                                  |
| Admin scope (2026-11-26, after step 6) | Exactly v1's features with a mobile-friendly UI | See §9.2: weekday and Shabbat times, four slide slots (first PDF page), seconds per slide, phone access with a PIN and the full address; no location, screen or ordering UI, no QR code |
| Phone access (2026-11-26, after 2.0.0) | Just the address, always on, no PIN             | The server always listens on the local network; anyone on the synagogue Wi-Fi can edit. The admin shows the address under its title (§4.4, §9.2)                                        |

Decisions taken earlier, with their reasons:

- **Stay on Electron** (not Tauri): one Windows PC, bundled Chromium gives predictable rendering, the zmanim libraries are JavaScript, and Electron provides kiosk mode, auto-start and auto-update in one installer.
- **Strict TypeScript, React.** React over Svelte for its larger ecosystem and the accessible component libraries available.
- **electron-vite + electron-builder** (replacing Electron Forge): electron-builder produces the NSIS installer and the `latest.yml` metadata that `electron-updater` needs.
- **`contextIsolation` on, `sandbox` on, no `nodeIntegration`.**
- **JSON files validated by zod, written atomically**, not SQLite: a few kilobytes of data and a single writer. Access goes through one `store` module, so switching to SQLite later touches only that module.
- **PDF conversion stays in the browser**, in a Web Worker (pdf.js + `OffscreenCanvas`), all pages, original kept.
- **Reference tests**: v1 outputs are recorded for a range of dates; v2 must reproduce them exactly (except the two fixed bugs).
- **Import v1 data** on first launch.
- **Branch `v2`** of the same repository, one session per step, project memory kept in repository files (this document and `CLAUDE.md`).
- Pinned `kosher-zmanim` 0.8.2 and `@hebcal/core` 3.50.x until the reference tests pass; upgrades afterwards are guarded by those tests.
- The installer is unsigned for now (SmartScreen warning on first install). Code signing can be added later without architectural change.

## 3. v1 inventory

v1 is about 1,800 lines of JavaScript: an Express server on port 3000 started inside Electron, two `BrowserWindow`s loading it over HTTP, flat JSON files in `db/*.txt`.

### 3.1 Admin (`/admin` → `views/index.html`, `public/myApp.js`, Hebrew, RTL)

| Feature             | Behaviour                                                                                                                                                                | Endpoint                  |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------- |
| Weekday times       | שחרית, מנחה, ערבית as `<input type="time">`                                                                                                                              | `POST /admin/zman-chol`   |
| Shabbat times       | שיר השירים, מנחה ער״ש, שחרית, מנחה                                                                                                                                       | `POST /admin/zman-shabat` |
| 4 image slots       | Pick a PDF/PNG/JPG; page 1 rendered to JPEG in the browser (150 dpi, quality 0.92) and uploaded; saved as `images/imageAffiche{N}.jpg`; file name shown next to the slot | `POST /admin/upload_pdf`  |
| Slideshow selection | One checkbox per slot + seconds per image (3–30)                                                                                                                         | `POST /admin/checkbox`    |
| Preview             | Modal showing a slot's image; slideshow preview inside the admin                                                                                                         | —                         |
| Feedback            | Spinner, then a "valid" or "error" icon, then a full page reload                                                                                                         | —                         |
| Display refresh     | Every save toggles `reload.txt`; both pages poll it every second and reload when it changes                                                                              | `POST /admin/reload`      |

### 3.2 Public display (`/shoul` → `views/index-frontend.html`, `public/myApp-frontend.js`)

Frameless 540×960 portrait window. Absolute-positioned text over a background image, Guttman Mantova fonts.

- Weekday and Shabbat times as entered.
- Motzei Shabbat ערבית = Saturday `Tzais` **+ 1 minute**.
- Daily zmanim: עלות השחר (`AlosHashachar`), נץ החמה (`SeaLevelSunrise`), סוף זמן ק״ש מג״א, סוף זמן ק״ש גר״א, חצות, שקיעה (`Sunset`), צאת הכוכבים (`Tzais`).
- הדלקת נרות = **Saturday** sunset − 40 min (see §3.4).
- מוצ״ש ר״ת = Saturday `Tzais16Point1Degrees`.
- Daf yomi with the page number in gematria, parasha, Hebrew date. A French date is rendered but hidden. The holiday name is computed but never shown.
- Analog clock drawn with hand images.
- Slideshow of checked slots; `imageAffiche0.jpg` when none is checked.
- Every value is re-fetched from the server **every second**.

### 3.3 Data files (`userData/db/*.txt`, JSON)

| File                 | Shape                                                                               |
| -------------------- | ----------------------------------------------------------------------------------- |
| `zmanChol.txt`       | `{ shacharitChol, minchaChol, arvitChol }` — `"HH:MM"` strings                      |
| `zmanShbt.txt`       | `{ shirAshirim, minchaErevShbt, shaharitShbt, minchaShbt }`                         |
| `checkbox.txt`       | `{ image1, image2, image3, image4: boolean, secInterval: string }`                  |
| `images-display.txt` | `{ imageDisplay: [string, string, string, string] }` — original file names per slot |
| `reload.txt`         | `{ reload: boolean }`                                                               |
| `userData/images/`   | `imageAffiche0.jpg` (fallback) … `imageAffiche4.jpg`                                |
| `userData/files/`    | one file per upload, named after the original file                                  |

Read API: `GET /api/zmanim/{jerusalem,info,zman-chol,zman-shabat,get-reload,checkbox,images-display}`. `db/`, `images/` and `files/` are also served statically.

### 3.4 v1 defects not to reproduce

- **Parasha** uses the hard-coded year 5782 (`new Sedra(5782, true)`). _Finding from step 2:_ this is harmless for any date from 5782 on, because `Sedra.lookup` in `@hebcal/core` moves on to the following years by itself; the reference test proves v1's parasha equals the one computed for the actual year on every captured day. v2 computes it for the actual year and must match v1 exactly.
- **Candle lighting** is computed from Saturday's sunset instead of Friday's (about one minute off). **Fixed in v2.**
- The clock adds a hard-coded 2 hours (`getHours() + 2`); all times are formatted in the PC's time zone rather than the location's.
- The "original" kept in `files/` is the converted JPEG renamed with the original extension: the real PDF is lost.
- Empty `secInterval` yields an undefined interval.
- The server listens on every interface with no authentication and open CORS; `.env` is committed; `nodeIntegration: true`.
- Needless recomputation timers (Hebrew calendar every second) and per-second polling.

### 3.5 Build and release

`.github/workflows/build.yml`, on every push to `main`: bump the patch from the latest `v*` tag, commit `chore: bump version … [skip ci]`, tag, build `.deb` (Ubuntu) and `.zip` (Windows) with Electron Forge, publish a GitHub Release. Neither `.zip` nor `.deb` supports auto-update.

## 4. Architecture

### 4.1 Review of the options

1. **IPC for local windows plus HTTP for the phone — rejected.** The phone requires an HTTP API anyway; keeping IPC as well would double every call, its tests and its push mechanism. **One typed HTTP API** serves the Electron windows, the phone and any future screen. Electron becomes a thin shell: server, windows, kiosk, updates.
2. **Several layouts chosen from the admin** is a confirmed future need, so displays and layouts exist in the data model from v2.0 even though only one layout ships.
3. **Zmanim are computed on the server**, once per day per location. Displays receive a ready-to-render snapshot and only animate the clock and the slideshow: one source of truth, correct time zone, light clients.
4. **Electron is still the right shell** for a single Windows PC (kiosk, auto-start, auto-update in one installer).
5. **JSON over SQLite** remains adequate, isolated behind the `store` module.

### 4.2 Repository layout (pnpm workspace)

```
packages/
  core/      Pure calculations: zmanim(date, location), candle lighting, daf yomi,
             parasha, Hebrew date. No I/O. Fully unit-tested.
  shared/    zod schemas (persisted data, API inputs/outputs), derived types,
             UI strings (Hebrew), layout option schemas.
apps/
  desktop/   Electron main process: store, services, HTTP server (Fastify + tRPC),
             windows, kiosk, auto-update, v1 import. Preload script.
  web/       One React SPA (Vite), served by the embedded server:
               /admin          responsive admin (desktop and phone)
               /display/:id    public display, renders the layout assigned to that display
               layouts/        one folder per layout (v2.0: "classic-portrait", the v1 look)
               workers/        PDF → JPEG conversion (pdf.js + OffscreenCanvas)
tests/
  fixtures/  v1 reference outputs
docs/v2/     this plan
```

### 4.3 API and real-time updates

- tRPC v11 on Fastify. Every input is validated with zod; the client is fully typed without code generation.
- Server-pushed updates through tRPC subscriptions over SSE (`displayState`, `adminState`). No polling, no page reloads.
- Services in `apps/desktop` hold the business logic; tRPC routers are thin adapters.

### 4.4 Network and security

- Listens on `0.0.0.0` (every interface) on port 3741, so phones on the local Wi-Fi reach the admin (owner's decision after 2.0.0). The admin shows the full address to type.
- No PIN (owner's decision after 2.0.0): anyone on the synagogue's Wi-Fi can edit times and pictures. 2.0.0 had a PIN; 2.0.1 removed it, and settings schema 2 drops its fields.
- Local Electron windows receive a per-launch token through the preload script.
- Display routes are read-only.
- Plain HTTP on the synagogue Wi-Fi is an accepted, documented risk.

### 4.5 Displays and layouts

- A **layout** is a React component in `apps/web/layouts/<id>/` plus a zod schema of its options (e.g. show daf yomi, show clock, show slideshow). A registry maps `layoutId` to component and schema.
- A **display** is `{ id, name, layoutId, layoutOptions, slideIntervalSec }`. It shows the enabled slide slots in slot order. The admin chooses the main display's layout ("theme", §9.2) and its seconds per slide; layout options stay out of the admin and reset to the defaults when the layout changes.
- The kiosk window on the PC shows display `main`. Adding monitors (`screen.getAllDisplays()`) or network TVs (`/display/:id` with a pairing code) later needs no redesign.
- **`DisplayState` snapshot**: entered times, today's zmanim already formatted in the location's time zone, Hebrew calendar info, the display's slides and layout options. Rebuilt at local midnight (location time) and on every change. The display keeps the last snapshot if the server restarts.

Implemented in step 5:

- `DisplayState` (zod schema in `packages/shared/src/display-state.ts`) is built by `buildDisplayState()` in `apps/desktop/src/main/services/`. The display-state service pushes it through the `display.onState` tRPC subscription (SSE): first on connection, then after every `notifyChanged()` and just after local midnight. `display.state` is the one-off query.
- Slide pages are served read-only from `userData/slides/<id>/<file>` under `/slides/`. A display shows the enabled slide slots in slot order.
- Layouts live in `apps/web/src/layouts/<id>/`, registered in `layouts/registry.ts` through `defineLayout({ id, optionsSchema, Component })`. Options that no longer validate fall back to the defaults instead of blanking the screen.
- `classic-portrait` uses v1's background, Guttman Mantova fonts and clock hands. The synagogue screen is a 46" TV in portrait (1080 × 1920) with Windows scaling at 150 %, so v1's page was a 720 × 1280 viewport, and v1's pixel offsets only line up in that configuration. Every text box, the clock pivot, the hand sizes and the slide box were measured on v1's own page there and recorded in `layouts/classic-portrait/placements.ts`, including the half-moon indent of the times around the clock. v2 draws on that 720 × 1280 surface and scales it uniformly to any window (letterboxed), so a small window, a maximised one and the kiosk all show the same picture whatever the Windows scaling.
- `blue-gold` draws on the same 720 × 1280 surface. Its background (`assets/background.jpg`) was generated with an image model at 941 × 1672, then edited by hand (banner flourish removed, frames aligned, picture frame narrowed so its opening is exactly 594 × 280) and resized to 1080 × 1920; every box is measured in those 941 × 1672 pixels in `layouts/blue-gold/placements.ts`. The picture frame is drawn a second time over the slide, cut out of the same background with an SVG mask, so a slide sits under the frame's inner gold line. Text is David Libre (Fontsource, bundled).
- Differences from v1:
  - The clock follows the location's time zone (v1 added a fixed 2 hours).
  - The bottom frame stays empty without slides: v1's fallback image is an error icon.
  - "ירושלים" is part of the background artwork, so it stays even if the city changes.
- Windows: the `main` display opens at startup, in kiosk mode in production and as a 540×960 window in development. The admin opens with Ctrl+Alt+A, and in development at startup too.

### 4.6 Windows and reliability

- Public display: full-screen kiosk window at startup. The `classic-portrait` layout keeps the v1 540×960 design and scales it to the screen (RTL, Guttman Mantova fonts).
- Admin: separate window opened with Ctrl+Alt+A or from the tray icon.
- Start at login (`app.setLoginItemSettings`), `powerSaveBlocker` against display sleep, reload on `render-process-gone`, `app.relaunch()` after a fatal main-process error, logs with `electron-log`.
- `electron-updater` against GitHub Releases, plus a "Check for updates" action in the admin.

Decided with the owner in step 8 (2026-11-26), replacing the points above where they differ:

- **No start at login:** someone launches the app.
- **At launch, only the public display opens**, in plain full screen (not kiosk): Escape leaves full screen, F11 toggles it, Alt+F4 closes it. In development it is a 540 × 960 window.
- **Opening the admin:** moving the mouse over the display shows the cursor and a "ניהול" button at the top; both hide 3 s after the mouse stops. The button opens the admin window. It is shown only in the app's own windows and calls `desktop.showAdmin`, a procedure reserved for them. Ctrl+Alt+A also opens the admin. There is no tray icon.
- **Screen sleep:** `powerSaveBlocker` keeps the screen on while the app runs.
- **Updates:** `electron-updater` checks GitHub Releases at start and every 6 hours, downloads in the background and installs when the app next starts. The admin shows "new version X ready" with an "install now" button (`admin.installUpdate`). Only packaged builds check; `electron-builder.yml` names the GitHub repository.
- **Crash recovery:** a crashed page reloads (`render-process-gone`). An uncaught error in the main process relaunches the app, unless it happens in the first minute, so a broken start cannot loop.

### 4.7 Persisted data (`userData/data/`)

| File                    | Content                                                                                                                                                                                                                                                                                                                               |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `settings.json`         | `schemaVersion`; `location { name, latitude, longitude, elevation, timeZoneId, inIsrael }`; `candleLightingMinutes` (40); `motzashArvitOffsetMinutes` (1); `lan { enabled, port, pinHash }`                                                                                                                                           |
| `schedule.json`         | Version 2: `weekday` and `shabbat` are lists (at most 6) of `{ id, name, time }`, in screen order, edited in the admin. Version 1 had the fixed v1 prayers (`weekday { shacharit, mincha, arvit }`, `shabbat { shirHashirim, minchaErev, shacharit, mincha }`); its migration keeps each time under its v1 name. Times are `"HH:MM"`. |
| `slides.json`           | Version 2: `library` (every uploaded file and template, newest first: `{ kind, id, name, folder, image, … }`) and `slots` (`{ slot, itemId, enabled }`, one per filled slot). Files in `slides/<folder>/`. Migration 1 → 2 turns each slide into a library item whose folder is its old `slides/<id>/`.                               |
| `displays.json`         | displays as in §4.5; only `main` in v2.0                                                                                                                                                                                                                                                                                              |
| `userData/slides/<id>/` | original file + one JPEG per page                                                                                                                                                                                                                                                                                                     |

Writes: temporary file → `fsync` → `rename`, previous version kept as `.bak`. Reads: zod validation with migrations keyed on `schemaVersion`; fall back to `.bak`, then to defaults, logging each fallback.

Implemented in step 4: schemas and defaults in `packages/shared/src/persisted/`, the store in `apps/desktop/src/main/store/` (`createStore(userData/data, logger)`). Details:

- `migrations[n]` upgrades a version-`n` document to `n + 1`; a document from a newer app version, or with no migration path, is treated as unreadable.
- Writes are validated first and serialised per document. A current file that is unreadable is moved to `<file>.invalid` instead of becoming the backup, so a corruption never destroys the good `.bak`.
- A crash between the two renames leaves only `.bak`, which the next read uses.
- The store is not wired into the main process yet: the v1 import (step 7) must still see `userData/data/` missing on first launch.

## 5. v1 data import

Runs on first launch when `userData/data/` does not exist.

- The package name stays `menouchat-chalom`, so `userData` is the same folder as v1 (`%APPDATA%\menouchat-chalom`). v1 files are read, never modified.
- `zmanChol.txt` / `zmanShbt.txt` → `schedule.json`.
- `secInterval` → `slideIntervalSec` of display `main` (10 when empty); layout `classic-portrait`.
- Each `imageAffiche{1..4}.jpg` → a one-page slide; title from `images-display.txt`; `enabled` from `checkbox.txt`; `originalFile` empty (v1 never kept the original).
- Location: Jerusalem with the v1 coordinates (31.770707215675863, 35.18218638465854, elevation 800, `Asia/Jerusalem`).
- A `migration.log` records what was imported. v1 (portable zip) is removed by hand; v2 installs through NSIS.

Implemented in step 7 (`apps/desktop/src/main/v1-import/`), run at startup before anything touches `userData/data/`:

- Everything is written to `data.importing/` and renamed to `data/` at the end, so an interrupted import is redone on the next launch. Leftover `slides/` folders without `data/` are removed first.
- v1 values that cannot be used are replaced by the defaults and noted in `data/migration.log`:
  - times that are not `H:MM`, `HH:MM` or `HH:MM:SS`;
  - an empty or out-of-range `secInterval`, clamped to 3–300;
  - unreadable or missing documents;
  - slot images that are missing or not JPEG.
- Each v1 slot becomes the same v2 slot; its title is the v1 file name without extension, or "שקופית N" when v1 had none.
- Tested against `tests/fixtures/v1-userdata/`, a copy of a real v1 `userData` (its `db/` byte for byte); the tests also check that v1's files are unchanged.

## 6. Reference tests

- `tests/reference/` (package `@menouchat/reference-tests`) holds verbatim copies of v1's `cities/zmanim.js` and `hebcal3.js` from `main` (commit `31850dd`), with the library versions v1 shipped: `kosher-zmanim` 0.8.2 and `@hebcal/core` 3.50.4.
- `src/generate-fixture.ts` loads them under a fake clock (`@sinonjs/fake-timers`) with `TZ=Asia/Jerusalem`, calls v1's two API functions at noon Israel time for each day, and formats times exactly as the v1 display did (`toLocaleTimeString()` in French, first five characters: **truncated** to the minute, not rounded).
- Dates: every day of Hebrew years 5787 (leap) and 5788 (common), 12 Sep 2026 – 20 Sep 2028: 740 days, all holidays, four DST transitions (checked by the test).
- Output: `tests/fixtures/v1-reference.json` (schema in `src/fixture-schema.ts`): per day, the seven daily zmanim, the coming Shabbat's candle lighting, Motzei Shabbat arvit and Rabbeinu Tam, the parasha, daf yomi and Hebrew date, each time with its raw ISO value and its displayed `HH:MM`.
- v2's `core` must match every value exactly, except candle lighting, parasha and daf yomi, which are checked against `correctedV1Bugs` (Friday's sunset − 40 min; the two display defects of §6.1), computed by v1's own code path with only the defect fixed.
- Fixtures are never edited by hand. `pnpm --filter @menouchat/reference-tests generate` rewrites the fixture; `… check` fails if it differs from v1's output and runs in CI. Regenerating requires a deliberate, reviewed change.

### 6.1 v1 display defects found while capturing

Found in step 2; the owner decided on 2026-11-26 to fix both in v2. The fixture keeps v1's values and records the expected v2 values in `correctedV1Bugs`, computed by v1's own code path with only the defect fixed:

- **Daf yomi tractate name in English:** v1 replaces the rendered event with its English `desc` and only converts the page number, so the screen shows e.g. `Arachin  י׳` (Latin name, two spaces). v2 shows `ערכין י׳`: Hebrew tractate name, one space, page in gematria.
- **Multi-word parashot joined with commas:** `Array.prototype.toString()` turns `חיי שרה` into `חיי,שרה` (also `אחרי,מות`, `ראש,השנה`, `פסח,שבת,חול,המועד`…). v2 separates the words with spaces.

## 7. Steps

One session per step, each on its own branch and PR into `v2`.

- [x] **1. Skeleton** — pnpm workspace (`packages/core`, `packages/shared`, `apps/desktop` with electron-vite, `apps/web` with Vite + React), strict TS, electron-builder NSIS, ESLint + Prettier, Vitest, CI running `typecheck`, `lint`, `test`, `build`; minimal tRPC server and one window loading it over `127.0.0.1`. Pick the UI component library (§9).
- [x] **2. Reference tests** — capture v1 outputs as described in §6.
- [x] **3. Zmanim calculation** — `packages/core` for any location: zmanim, candle lighting, Motzei Shabbat, daf yomi, parasha, Hebrew date; all reference tests green.
- [x] **4. Storage** — zod schemas, atomic writes, `.bak`, defaults, schema migrations, tests.
- [x] **5. Display** — layout registry, `DisplayState` + SSE subscription, `classic-portrait` layout faithful to v1, clock, multi-page slideshow, kiosk window.
- [x] **6. Admin** (simplified afterwards with the owner, see §9.2) — times, slides (pdf.js worker, all pages, original kept, ordering, enable/disable), location, "Screens" card (layout, options, live preview), phone access (LAN listening, PIN, QR code); UI rules in §9.
- [x] **7. v1 import** — §5, tested against a copy of a real v1 `userData`.
- [x] **8. Reliability and auto-update** (as decided with the owner, see §4.6) — start at login, crash recovery, sleep prevention, `electron-updater`, "Check for updates".
- [x] **9. Release workflow** (as decided with the owner, see below) — Windows NSIS build with `latest.yml`; version read from `package.json` (2.0.0) instead of always bumping the patch; v2.0.0 published when `v2` is merged into `main`; manual pre-release builds from `v2` for testing on the synagogue PC.
- [x] **10. Screen themes** (owner's request after 2.0.3) — `blue-gold` layout: an AI-drawn parchment, navy and gold background with the text written over it, v1's slide size (594 × 280) under a picture frame redrawn from the background, David Libre; theme choice in the admin (§9.2). Its daf yomi tile alternates every 5 s with Dirshu's Amud HaYomi (`packages/core/src/amud-yomi.ts`: one amud a day from Berachot 2a on 15 October 2023, Vilna lengths from Sefaria, checked against the Yoma siyum on 17 October 2026).

## 8. Code quality rules

- **Everything in English**: code, identifiers, comments, logs, internal error messages, commit messages, documentation. Only user-facing UI text is Hebrew (RTL), centralised in `packages/shared` strings.
- TypeScript `strict` plus `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`; ESLint `strict-type-checked`; Prettier. No `any`, no dead code, no stray `console.log`.
- Comments explain _why_, never restate _what_.
- Small single-purpose modules; pure functions in `core`; typed errors, always handled; zod validation at every boundary (disk, HTTP, preload).
- Vitest for `core`, `store`, import and services. CI must pass `typecheck`, `lint`, `test` and `build` on every PR.
- Conventional commits; one reviewed PR per step.

## 9. Admin UI rules

- Mobile first: usable from 320 px wide with no horizontal scrolling; the same cards laid out in a grid on desktop.
- One card per topic: Weekday times, Shabbat times, Pictures, plus the update banner (step 8). See §9.2.
- Touch targets ≥ 44 px, native time inputs, inline validation, one Save button per card, disabled until something changes.
- Immediate toast feedback (saved / error with the reason); never a page reload.
- Slides: v1's four slots, each with a thumbnail, the file name, a "show" switch and a button to choose or replace the file.
- Accessible: sufficient contrast, visible focus, a label on every field, full keyboard navigation; light and dark themes.
- Components: **React Aria Components**, styled with **Tailwind CSS v4** (chosen in step 1, see below).

### 9.1 UI library decision (step 1)

**React Aria Components + Tailwind CSS v4**, rather than Radix UI or CSS Modules:

- **RTL and Hebrew built in.** React Aria takes the locale from `I18nProvider` (`he-IL`) and mirrors keyboard navigation, overlays and date/number formatting for RTL. Radix only offers a direction provider.
- **Touch and pointer handling.** `usePress` gives consistent press behaviour across mouse, touch and keyboard (no stuck hover on phones, no 300 ms delays), which matters for an admin used from a phone.
- **Accessible drag and drop.** The Slides card needs reordering; React Aria's `GridList` drag and drop includes keyboard and screen-reader alternatives. Radix has no drag and drop, so it would need a second library.
- **Forms, validation and toasts** come from the same library with consistent ARIA wiring (labels, descriptions, inline errors), covering the rules above.
- **Tailwind rather than CSS Modules.** Vite types CSS-module classes as an index signature, which conflicts with `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` (every class becomes `string | undefined`). Tailwind needs no generated types, its logical utilities (`ps-*`, `me-*`, `start-*`) suit RTL, its `data-*` variants target React Aria's state attributes (`data-pressed`, `data-focus-visible`), and dark mode is a set of semantic colour tokens switched in one place (`apps/web/src/styles/global.css`). Class order is kept stable by `prettier-plugin-tailwindcss`.

### 9.2 Admin as built (step 6, simplified with the owner)

After step 6 the owner asked for exactly v1's features, with a better, mobile-friendly UI (2026-11-26). The admin therefore has these cards:

- **Weekday times** and **Shabbat times**: native time inputs, one Save button each.
- **Pictures:**
  - v1's four slots. Each has a thumbnail, the file name, a "show" switch and "choose / replace".
  - A PDF contributes its first page, as in v1, rendered to JPEG in a Web Worker: pdf.js legacy build, `OffscreenCanvas`, pdf.js parsing in its own nested worker. The original file is kept.
  - Replacing a slot's file keeps whether it was shown. There is no ordering and no deletion: slots show in order 1–4, as in v1.
  - The seconds per picture (3–300) are saved with their own button.
- **Screen theme** (added after 2.0.3, owner's request, 2026-11-26): two picture choices, "קלאסי" (`classic-portrait`, the v1 look, still the default) and "כחול וזהב" (`blue-gold`). Picking one saves it at once (`admin.setLayout`) and the screen follows; the ids the admin may choose are `LAYOUT_IDS` in `packages/shared`.
- **Phone address** (simplified again after 2.0.0): no card, no PIN, no switch. The address to type on a phone (e.g. `http://192.168.1.20:3741/admin`) is shown under the admin's title.

Not in the admin, by decision: location (Jerusalem with v1's coordinates stays fixed, but remains configurable in `settings.json`), layout options, live preview, slide ordering.

Unchanged from step 6:

- The admin state is pushed by `admin.onState` (SSE).
- Each card keeps a draft that follows the server until edited, and results show as toasts.
- **Access:** the server listens on `0.0.0.0` on port 3741, and every admin procedure is open to anyone who reaches it (no PIN, owner's decision). Windows will ask once to allow the app through its firewall. The app's own windows still present the launch token, which only `desktop.showAdmin` requires.
- CSP: scripts from the app only (plus WebAssembly for pdf.js), inline styles allowed for React Aria.

## 10. Release (step 9, decided with the owner on 2026-11-26)

- **Workflow:** `.github/workflows/build.yml` runs on every push to `main`, as in v1.
  - **Version and tag:** `apps/desktop/scripts/next-version.ts` (tested) bumps the patch of the latest `v*` tag, unless `apps/desktop/package.json` already names a newer version. The first v2 release is therefore 2.0.0 (after v1.1.11), then 2.0.1, 2.0.2… A minor or major bump is made by editing `package.json`. The version is committed to `main` with `[skip ci]` and tagged.
  - **Build:** on `windows-latest`, `pnpm dist` produces the NSIS installer, its blockmap and `latest.yml`.
  - **Publish:** a GitHub Release with those three files and generated notes. Installed copies find it through `electron-updater` (§4.6).
- **Scope:** Windows only, with no Linux build. There are no pre-release or test builds: v2 is installed on the synagogue PC once it is merged and released. The v1 portable zip is removed by hand; v1's data is imported on first launch (§5).
- **Pull requests:** `v2-ci.yml` checks every PR into `v2`, including building the installer, the blockmap and `latest.yml`.
