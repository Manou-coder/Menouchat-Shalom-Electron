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

**Request flow.**
- `app.js` mounts two routers: `/admin` (HTML form + POST handlers, in `routes/admin.js` → `controllers/admin.js`) and `/api/zmanim` (read-only JSON for the display, in `routes/zmanim.js` → `controllers/zmanim.js`). `/` redirects to `/admin`; `/shoul` serves `views/index-frontend.html`.
- Static folders `views/`, `public/`, `files/`, `images/`, and `db/` are all exposed directly via `express.static`.

**"Database" is flat JSON files.** `db/*.txt` are JSON documents read/written with `fs.readFileSync` / `fs.writeFileSync` on every request. Keys are hardcoded in the controllers:
- `zmanChol.txt`, `zmanShbt.txt` — prayer time tables (weekday / shabbat)
- `checkbox.txt` — display toggles + `secInterval`
- `reload.txt` — `{ reload: bool }` flipped by `POST /admin/reload`, polled by the frontend to trigger a refresh
- `images-display.txt` — names of uploaded display images (note: `controllers/zmanim.js:41` reads `display-images.txt`, which is a bug — the writer uses `images-display.txt`)

**Zmanim computation.** `cities/zmanim.js` wraps `kosher-zmanim` with hardcoded Jerusalem coordinates and returns the full zmanim JSON plus a custom `HadlakAndTzais` block (candle-lighting = sunset − 40 min). `hebcal3.js` wraps `@hebcal/core` to return today's events (parsha, daf yomi, omer, Hebrew date) in Hebrew without nikud.

**PDF upload pipeline.** `POST /admin/upload_pdf` chains three middlewares: `multer-config.js` (writes the upload to `files/`), `gmshell-config.js` (shells out to GraphicsMagick to convert page 0 of the PDF to `images/imageAffiche{N}.jpg` and updates `db/images-display.txt`), then `controllers/admin.savePdf` responds.

## Platform notes (Linux dev, Windows origin)

The project was originally developed on Windows and still has Windows-specific code paths. When working on Linux, watch for:

- **`middleware/gmshell-config.js`** invokes `gm.exe` and uses a backslash path (`files\\${nameOfFile}`). On Linux the binary is `gm` and paths must use forward slashes. Fix at the call site if touching this flow.
- **`postBuild.js`** only handles `out/menouchat-chalom-win32-x64/`. Electron Forge on Linux produces `linux-x64` / `.deb` / `.rpm` artifacts; adjust the source path or guard by platform if you run `npm run make` here.
- **GraphicsMagick + Ghostscript** are runtime requirements for PDF upload. On Debian/Ubuntu: `sudo apt install graphicsmagick ghostscript`. The README's note about Ghostscript 9.50 being mandatory was a Windows-specific quirk; modern distro packages work on Linux.
- The Electron main process sets `app.commandLine.appendSwitch('lang', 'fr')` — UI locale is French.

## Conventions

- Code comments, log messages, and API response messages are in French. Keep that style when editing existing files; documentation files (like this one) are in English.
- Controllers read/write `db/*.txt` with synchronous `fs` calls — there is no abstraction layer, and that is intentional for this project's size. Do not introduce a DB or ORM unless explicitly asked.
- No build step for the frontend: `public/myApp.js` and `public/myApp-frontend.js` are plain browser scripts loaded by the HTML views.
