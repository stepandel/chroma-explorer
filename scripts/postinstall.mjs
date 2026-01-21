import { spawnSync } from "node:child_process";

// This repo targets Electron. Some native modules must be rebuilt against the
// Electron headers after install. On Windows (especially ARM64), that rebuild
// can fail if MSVC build tools aren't installed. Failing hard here prevents
// contributors from installing deps at all, even if they're not packaging.
//
// Opt out entirely:
//   set CHROMA_EXPLORER_SKIP_ELECTRON_REBUILD=1
//
// If rebuild fails, we warn and continue. Packaging may still require the
// native toolchain to be installed later.

if (process.env.CHROMA_EXPLORER_SKIP_ELECTRON_REBUILD === "1") {
  console.log(
    "[postinstall] Skipping electron native deps rebuild (CHROMA_EXPLORER_SKIP_ELECTRON_REBUILD=1).",
  );
  process.exit(0);
}

const result = spawnSync(
  "pnpm",
  ["exec", "electron-builder", "install-app-deps"],
  { stdio: "inherit", shell: true },
);

if (result.status === 0) process.exit(0);

console.warn(
  "\n[postinstall] WARNING: Failed to rebuild Electron native dependencies.\n" +
    "[postinstall] This is usually caused by missing C++ build tools (MSVC v143 on Windows) or an unsupported architecture.\n" +
    "[postinstall] Install will continue, but packaging and some features that rely on native modules may not work until you fix the toolchain.\n",
);

process.exit(0);

