# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Desktop app that displays Jewish prayer times (zmanim) for a synagogue, packaged with Electron. An Express server (port 3000) serves both an admin UI and a public display UI; Electron opens two `BrowserWindow`s pointing at `http://localhost:3000` (admin) and `http://localhost:3000/shoul` (public display).

## Commands

- `npm run dev` — run the Express server standalone with nodemon (fastest loop when working on routes/controllers/views; no Electron shell).
- `npm start` — launch the full Electron app via `electron-forge start` (this also boots the Express server through `main.js` → `server.js`).
- `npm run make` — build distributable installers with `electron-forge make`, then run `postBuild.js` to flatten the output.
- No test or lint scripts are configured.

## Architecture

**Electron + Express hybrid.** `main.js` is the Electron entrypoint: it imports `./app` (to share the `path` handle) and `./server` (which starts the HTTP listener as a side effect), then opens two windows against the local server. The server is a normal Express app — nothing is wired through IPC, everything goes over HTTP on `localhost:3000`.

**`main.js` startup sequence.**
1. `electron-log` is wired up — redirects `console.log/error` to `userData/logs/main.log` in addition to stdout.
2. Blob polyfill: Electron 28 doesn't expose `Blob` in the Node global scope; `globalThis.Blob = require('node:buffer').Blob` fixes this before the server loads.
3. `process.env.MENOUCHAT_USER_DATA = app.getPath('userData')` — must be set **before** `require('./server')` so that `paths.js` resolves to the correct runtime directories.
4. `seedUserData()` copies the default `db/`, `images/`, `files/` bundle directories into `userData` on first launch.

**Request flow.**
- `app.js` mounts two routers: `/admin` (HTML form + POST handlers, in `routes/admin.js` → `controllers/admin.js`) and `/api/zmanim` (read-only JSON for the display, in `routes/zmanim.js` → `controllers/zmanim.js`). `/` redirects to `/admin`; `/shoul` serves `views/index-frontend.html`.
- Static folders `views/`, `public/`, `files/`, `images/`, `db/`, and `/pdfjs` are all exposed directly via `express.static`.

**Path resolution (`paths.js`).** All references to `db/`, `images/`, and `files/` go through `paths.js`, never hardcoded:
- In **production** (packaged Electron): `MENOUCHAT_USER_DATA` is set by `main.js` → directories resolve to `userData/db`, `userData/images`, `userData/files` (writable, outside the app bundle).
- In **dev** (`npm run dev`): `MENOUCHAT_USER_DATA` is unset → directories fall back to the repo root (`db/`, `images/`, `files/`).

**"Database" is flat JSON files.** `db/*.txt` are JSON documents read/written with `fs.readFileSync` / `fs.writeFileSync` on every request via `DB_DIR` from `paths.js`. Keys are hardcoded in the controllers:
- `zmanChol.txt`, `zmanShbt.txt` — prayer time tables (weekday / shabbat)
- `checkbox.txt` — display toggles + `secInterval`
- `reload.txt` — `{ reload: bool }` flipped by `POST /admin/reload`, polled by the frontend to trigger a refresh
- `images-display.txt` — names of uploaded display images

**Zmanim computation.** `cities/zmanim.js` wraps `kosher-zmanim` with hardcoded Jerusalem coordinates and returns the full zmanim JSON plus a custom `HadlakAndTzais` block (candle-lighting = sunset − 40 min). `hebcal3.js` wraps `@hebcal/core` to return today's events (parsha, daf yomi, omer, Hebrew date) in Hebrew without nikud.

**PDF/image upload pipeline.** `POST /admin/upload_pdf` works as follows:
1. `multer-config.js` — receives the file and writes it to `files/`
2. `gmshell-config.js` — copies the received JPEG to `images/imageAffiche{N}.jpg` and updates `db/images-display.txt`
3. `controllers/admin.savePdf` — responds with success

The conversion from PDF or image to JPEG happens **entirely in the browser** before upload:
- `public/myApp.js` imports `pdfjs-dist` (v5) via ES module from `/pdfjs/pdf.mjs` (served from `node_modules/pdfjs-dist/build` via `express.static`)
- `fileToJpegBlob(file)` renders page 1 of a PDF (or any image) onto a native browser Canvas, then calls `canvas.toBlob('image/jpeg')` — no server-side native module needed
- The resulting JPEG blob is sent to the server; `gmshell-config.js` only does file I/O, no conversion

No system dependencies (no GraphicsMagick, no Ghostscript, no `@napi-rs/canvas`) are required.

**Compatibility notes.**
- `pdfjs-dist` v5 uses `Map.prototype.getOrInsertComputed` (available from Chrome 129+). Electron 19 embeds Chromium 102 which lacks this method. A polyfill is injected via a plain `<script>` tag in `views/index.html` before the ES module is loaded.
- Electron 28 doesn't expose `Blob` in the Node.js global scope. A polyfill is applied in `main.js` before the server starts.

## CI/CD

`.github/workflows/build.yml` triggers on every push to `main`:
1. **create-tag** — reads the latest `v*` tag, bumps the patch version, updates `package.json` via `node -e` (pnpm-compatible), commits `chore: bump version to X.X.X [skip ci]` on `main` using `git push origin HEAD:refs/heads/main`, then pushes the new tag. Outputs `tag` for downstream jobs.
2. **build** — matrix job (ubuntu-latest + windows-latest): checks out the new tag, runs `pnpm install` then `electron-forge make`. Produces `.deb` (Linux) and `.zip` (Windows).
3. **release** — downloads all artifacts and publishes a GitHub Release using `softprops/action-gh-release`.

Key design decisions:
- Everything runs in one workflow because `GITHUB_TOKEN`-pushed tags do not trigger new workflow runs (GitHub anti-loop protection).
- `[skip ci]` in the version bump commit message prevents the push to `main` from re-triggering the workflow.
- `ref: main` on checkout and `HEAD:refs/heads/main` on push avoid detached HEAD issues in CI.
- `node -e` is used instead of `npm version` to avoid creating a `package-lock.json` in a pnpm project.

## Platform notes

- **`postBuild.js`** only handles `out/menouchat-chalom-win32-x64/`. Electron Forge on Linux produces `linux-x64` / `.deb` / `.rpm` artifacts; adjust the source path or guard by platform if you run `npm run make` locally.
- The Electron main process sets `app.commandLine.appendSwitch('lang', 'fr')` — UI locale is French.

## Conventions

- Code comments, log messages, and API response messages are in French. Keep that style when editing existing files; documentation files (like this one) are in English.
- Controllers read/write `db/*.txt` with synchronous `fs` calls via `DB_DIR` from `paths.js` — there is no abstraction layer, and that is intentional for this project's size. Do not introduce a DB or ORM unless explicitly asked.
- `public/myApp.js` is loaded as an **ES module** (`<script type="module">`). `public/myApp-frontend.js` is a plain browser script.
- Upload logging uses the prefixes `[upload]` (server, `gmshell-config.js`) and `[upload]` / `[conversion]` (browser, `myApp.js`) — visible in the Electron DevTools console and Node.js stdout respectively.
