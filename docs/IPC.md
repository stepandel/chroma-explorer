# IPC Contract

Electron IPC is the highest-risk boundary in this app because renderer input
crosses into privileged main-process code.

## Canonical Source

`electron/ipc-contract.ts` owns:

- shared domain types used by the renderer and main process;
- runtime validators for renderer-provided payloads;
- the `ElectronAPI` interface exposed by `electron/preload.ts`.

`src/types/electron.d.ts` should only attach those exported types to `window`.
Do not duplicate domain interfaces there.

## Handler Rules

- Every `ipcMain.handle` payload from the renderer must be parsed with a contract
  helper before business logic runs.
- Handler responses should use `{ success: true, data? }` or
  `{ success: false, error }`.
- Preload methods should unwrap handler responses and throw `Error` instances
  when `success` is false.
- Event-style IPC channels may pass simple strings/booleans, but any structured
  payload should have a named type in the contract.

## Shell URLs

Only `http:` and `https:` URLs are allowed through `shell.openExternal`. Reject
other protocols before calling Electron APIs.

