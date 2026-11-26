# Menouchat Chalom v2 — rewrite plan

This document is the project memory for the v2 rewrite. Each work session picks the next unchecked step in [§7](#7-steps), does it on a branch off `v2`, and checks the box in the same PR.

Status: plan approved on 2026-11-26. Steps 1 (skeleton) and 2 (reference tests) done.

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

| Question                     | Answer                                       | Consequence                                                                                                                         |
| ---------------------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Edit from a phone?           | Yes, on the local Wi-Fi                      | Keep an embedded HTTP server, PIN-protected, mobile-friendly admin                                                                  |
| How many places?             | One synagogue, city configurable             | Location lives in settings, Jerusalem by default                                                                                    |
| Screens on the synagogue PC? | One PC, one screen                           | Public display is full screen; admin opens on demand                                                                                |
| Operating system             | Windows                                      | NSIS installer + `electron-updater`                                                                                                 |
| v1 calculation bugs (§3.4)   | Fix both                                     | Reference tests flag candle lighting as a known v1 bug (parasha turned out correct, see §3.4); two display defects fixed too (§6.1) |
| Future "several screens"     | Several layouts, chosen from the admin       | Displays and layouts are first-class in the data model from v2.0                                                                    |
| Code style                   | Everything in English, professional quality  | See §8                                                                                                                              |
| Admin UI                     | Clean and simple on desktop and small phones | See §9                                                                                                                              |

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

- Listens on `127.0.0.1` by default; on `0.0.0.0` only when "Phone access" is enabled in the admin. The admin shows the LAN address and a QR code.
- Admin protected by a PIN (hashed with scrypt) exchanged for an `HttpOnly`, `SameSite=Strict` session cookie; rate-limited PIN attempts.
- Local Electron windows receive a per-launch token through the preload script.
- Display routes are read-only.
- Plain HTTP on the synagogue Wi-Fi is an accepted, documented risk.

### 4.5 Displays and layouts

- A **layout** is a React component in `apps/web/layouts/<id>/` plus a zod schema of its options (e.g. show daf yomi, show clock, show slideshow). A registry maps `layoutId` to component and schema.
- A **display** is `{ id, name, layoutId, layoutOptions, slideIds, slideIntervalSec }`. The admin's "Screens" card lets the user pick the layout, set its options and see a live preview.
- The kiosk window on the PC shows display `main`. Adding monitors (`screen.getAllDisplays()`) or network TVs (`/display/:id` with a pairing code) later needs no redesign.
- **`DisplayState` snapshot**: entered times, today's zmanim already formatted in the location's time zone, Hebrew calendar info, the display's slides and layout options. Rebuilt at local midnight (location time) and on every change. The display keeps the last snapshot if the server restarts.

### 4.6 Windows and reliability

- Public display: full-screen kiosk window at startup. The `classic-portrait` layout keeps the v1 540×960 design and scales it to the screen (RTL, Guttman Mantova fonts).
- Admin: separate window opened with Ctrl+Alt+A or from the tray icon.
- Start at login (`app.setLoginItemSettings`), `powerSaveBlocker` against display sleep, reload on `render-process-gone`, `app.relaunch()` after a fatal main-process error, logs with `electron-log`.
- `electron-updater` against GitHub Releases, plus a "Check for updates" action in the admin.

### 4.7 Persisted data (`userData/data/`)

| File                    | Content                                                                                                                                                                                     |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `settings.json`         | `schemaVersion`; `location { name, latitude, longitude, elevation, timeZoneId, inIsrael }`; `candleLightingMinutes` (40); `motzashArvitOffsetMinutes` (1); `lan { enabled, port, pinHash }` |
| `schedule.json`         | `weekday { shacharit, mincha, arvit }`; `shabbat { shirHashirim, minchaErev, shacharit, mincha }` — `"HH:MM"`                                                                               |
| `slides.json`           | ordered library of `{ id, title, originalFile, pages[], enabled }`                                                                                                                          |
| `displays.json`         | displays as in §4.5; only `main` in v2.0                                                                                                                                                    |
| `userData/slides/<id>/` | original file + one JPEG per page                                                                                                                                                           |

Writes: temporary file → `fsync` → `rename`, previous version kept as `.bak`. Reads: zod validation with migrations keyed on `schemaVersion`; fall back to `.bak`, then to defaults, logging each fallback.

## 5. v1 data import

Runs on first launch when `userData/data/` does not exist.

- The package name stays `menouchat-chalom`, so `userData` is the same folder as v1 (`%APPDATA%\menouchat-chalom`). v1 files are read, never modified.
- `zmanChol.txt` / `zmanShbt.txt` → `schedule.json`.
- `secInterval` → `slideIntervalSec` of display `main` (10 when empty); layout `classic-portrait`.
- Each `imageAffiche{1..4}.jpg` → a one-page slide; title from `images-display.txt`; `enabled` from `checkbox.txt`; `originalFile` empty (v1 never kept the original).
- Location: Jerusalem with the v1 coordinates (31.770707215675863, 35.18218638465854, elevation 800, `Asia/Jerusalem`).
- A `migration.log` records what was imported. v1 (portable zip) is removed by hand; v2 installs through NSIS.

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
- [ ] **3. Zmanim calculation** — `packages/core` for any location: zmanim, candle lighting, Motzei Shabbat, daf yomi, parasha, Hebrew date; all reference tests green.
- [ ] **4. Storage** — zod schemas, atomic writes, `.bak`, defaults, schema migrations, tests.
- [ ] **5. Display** — layout registry, `DisplayState` + SSE subscription, `classic-portrait` layout faithful to v1, clock, multi-page slideshow, kiosk window.
- [ ] **6. Admin** — times, slides (pdf.js worker, all pages, original kept, ordering, enable/disable), location, "Screens" card (layout, options, live preview), phone access (LAN listening, PIN, QR code); UI rules in §9.
- [ ] **7. v1 import** — §5, tested against a copy of a real v1 `userData`.
- [ ] **8. Reliability and auto-update** — start at login, crash recovery, sleep prevention, `electron-updater`, "Check for updates".
- [ ] **9. Release workflow** — Windows NSIS build with `latest.yml`; version read from `package.json` (2.0.0) instead of always bumping the patch; v2.0.0 published when `v2` is merged into `main`; manual pre-release builds from `v2` for testing on the synagogue PC.

## 8. Code quality rules

- **Everything in English**: code, identifiers, comments, logs, internal error messages, commit messages, documentation. Only user-facing UI text is Hebrew (RTL), centralised in `packages/shared` strings.
- TypeScript `strict` plus `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`; ESLint `strict-type-checked`; Prettier. No `any`, no dead code, no stray `console.log`.
- Comments explain _why_, never restate _what_.
- Small single-purpose modules; pure functions in `core`; typed errors, always handled; zod validation at every boundary (disk, HTTP, preload).
- Vitest for `core`, `store`, import and services. CI must pass `typecheck`, `lint`, `test` and `build` on every PR.
- Conventional commits; one reviewed PR per step.

## 9. Admin UI rules

- Mobile first: usable from 320 px wide with no horizontal scrolling; the same cards laid out in a grid on desktop.
- One card per topic: Weekday times, Shabbat times, Slides, Screens, Location, Phone access, Updates.
- Touch targets ≥ 44 px, native time inputs, inline validation, one Save button per card, disabled until something changes.
- Immediate toast feedback (saved / error with the reason); never a page reload.
- Slides: thumbnails, drag to reorder (up/down buttons on touch screens), per-slide toggle, progress bar during PDF conversion.
- Live preview of the public display.
- Accessible: sufficient contrast, visible focus, a label on every field, full keyboard navigation; light and dark themes.
- Components: **React Aria Components**, styled with **Tailwind CSS v4** (chosen in step 1, see below).

### 9.1 UI library decision (step 1)

**React Aria Components + Tailwind CSS v4**, rather than Radix UI or CSS Modules:

- **RTL and Hebrew built in.** React Aria takes the locale from `I18nProvider` (`he-IL`) and mirrors keyboard navigation, overlays and date/number formatting for RTL. Radix only offers a direction provider.
- **Touch and pointer handling.** `usePress` gives consistent press behaviour across mouse, touch and keyboard (no stuck hover on phones, no 300 ms delays), which matters for an admin used from a phone.
- **Accessible drag and drop.** The Slides card needs reordering; React Aria's `GridList` drag and drop includes keyboard and screen-reader alternatives. Radix has no drag and drop, so it would need a second library.
- **Forms, validation and toasts** come from the same library with consistent ARIA wiring (labels, descriptions, inline errors), covering the rules above.
- **Tailwind rather than CSS Modules.** Vite types CSS-module classes as an index signature, which conflicts with `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` (every class becomes `string | undefined`). Tailwind needs no generated types, its logical utilities (`ps-*`, `me-*`, `start-*`) suit RTL, its `data-*` variants target React Aria's state attributes (`data-pressed`, `data-focus-visible`), and dark mode is a set of semantic colour tokens switched in one place (`apps/web/src/styles/global.css`). Class order is kept stable by `prettier-plugin-tailwindcss`.
