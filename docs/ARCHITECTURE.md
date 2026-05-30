# Architecture

Chroma Explorer is an Electron desktop app with a React renderer and a privileged
main process that owns local system access and ChromaDB clients.

## Layers

- `src/`: renderer-only React UI, hooks, contexts, and components.
- `electron/preload.ts`: the only bridge exposed to renderer code.
- `electron/ipc-contract.ts`: shared API contract and runtime validation helpers
  for IPC payloads.
- `electron/main.ts`: IPC registration and orchestration.
- `electron/chromadb-service.ts`: ChromaDB client operations.
- `electron/*-store.ts`: persisted local settings and connection state.
- `scripts/`: local development and smoke-test support.

## Boundaries

- Renderer code must not import Electron runtime modules.
- Main-process handlers must parse or validate untrusted renderer input before
  using it.
- External URLs may only be opened through the validated shell IPC path.
- ChromaDB SDK response normalization belongs in `electron/chromadb-service.ts`
  or helpers under `electron/`, not in React components.
- Shared renderer/main types should be exported from one canonical source and
  referenced from generated or ambient declarations.

## Refactoring Direction

The main risk areas are large modules that accumulate unrelated behavior:

- `electron/chromadb-service.ts`: split by collection, document, search, and copy
  operations when adding new service behavior.
- `electron/main.ts`: move repeated IPC response handling and payload parsing into
  helpers instead of adding more inline handler bodies.
- `src/components/documents/DocumentsView.tsx`: extract document import, paste,
  draft, and selection behavior into hooks before adding new UI workflows.

