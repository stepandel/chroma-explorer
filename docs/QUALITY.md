# Quality Harness

The quality harness is intentionally small and mechanical. It should be cheap for
agents and humans to run locally and in CI.

## Required Commands

- `pnpm typecheck`: TypeScript validation for renderer and Electron code.
- `pnpm lint`: static checks for architecture and risky patterns.
- `pnpm test`: unit tests for contract and pure logic.
- `pnpm test:smoke`: Electron startup and core UI smoke coverage.
- `pnpm check`: local equivalent of the default CI check set.

## Current Coverage Targets

- IPC contract parsing and URL validation.
- Metadata filter parsing.
- Electron startup in development mode.
- Basic connect/list/search/document flows against the seeded local Chroma test
  database.

## Cleanup Cadence

When repeated review comments or bugs appear, encode them in this order:

1. A targeted test if the behavior is executable.
2. A lint or structural check if the rule is mechanical.
3. A short doc entry if judgment or context is required.

Track recurring debt by adding a dated note to this file or a focused doc under
`docs/`.
