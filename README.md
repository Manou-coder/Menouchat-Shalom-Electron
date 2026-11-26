# Menouchat Chalom

Prayer times (zmanim), Hebrew calendar information and a slideshow for the Menouchat Chalom synagogue, shown full screen on a Windows PC and edited from the PC or a phone on the local Wi-Fi.

This branch (`v2`) is a TypeScript rewrite; the plan and its progress are in [`docs/v2/plan.md`](docs/v2/plan.md). The released v1 lives on `main`.

## Requirements

- Node.js 24+
- pnpm (version pinned in `package.json`; `corepack enable` picks it up)

## Development

```bash
pnpm install
pnpm dev
```

`pnpm dev` starts the web app's Vite dev server and the Electron app, which opens the admin.

| Command          | Purpose                                 |
| ---------------- | --------------------------------------- |
| `pnpm build`     | Bundle the desktop and web apps         |
| `pnpm test`      | Run the Vitest suites                   |
| `pnpm lint`      | ESLint and Prettier checks              |
| `pnpm typecheck` | TypeScript checks in every package      |
| `pnpm dist`      | Build the Windows installer (NSIS, x64) |

## Layout

```
packages/core     pure calculations
packages/shared   zod schemas, API contracts, Hebrew UI strings
apps/desktop      Electron main process, preload, embedded Fastify + tRPC server
apps/web          React app: /admin and /display/:id
docs/v2           rewrite plan
```
