# Agent Map

This file is the entry point for automated engineering work in this repository.
Keep it short and point to durable sources of truth instead of duplicating them.

## Start Here

- Read `README.md` for product scope and local development basics.
- Read `docs/ARCHITECTURE.md` before changing module boundaries.
- Read `docs/IPC.md` before changing Electron preload, IPC handlers, or shared types.
- Read `docs/QUALITY.md` before adding tests, lint rules, or cleanup automation.
- Read `scripts/README.md` before using the local Chroma test database.

## Required Checks

Run these before handing off changes:

```bash
pnpm typecheck
pnpm lint
pnpm test
```

For changes that affect Electron startup, Chroma connections, or document flows,
also run:

```bash
pnpm test:smoke
```

## Repository Rules

- Treat `electron/ipc-contract.ts` as the canonical renderer/main process API
  contract.
- Validate all renderer-provided IPC payloads in the main process before use.
- Keep privileged Electron capabilities in `electron/`; renderer code should call
  `window.electronAPI` only.
- Prefer small modules with clear ownership over adding more behavior to the
  existing large files.
- Add or update docs when a pattern is introduced so future agents can discover
  the rule without external context.

