# Releasing

End-to-end flow for cutting a new GitHub release. Run from the project root.

## Prerequisites

- `.env` at project root with `APPLE_ID`, `APPLE_TEAM_ID`, and
  `APPLE_APP_SPECIFIC_PASSWORD` (notarization will fail without these).
- `gh` authenticated (`gh auth status`).
- Working tree clean and on `master`.

## Steps

1. **Bump the version** in `package.json` following semver (`feat:` → minor,
   `fix:` → patch). Commit:

    ```bash
    git add package.json
    git commit -m "Release: v<X.Y.Z>"
    git push origin master
    ```

2. **Build, sign, notarize.** `build:release` does not publish — it stops
   after producing artifacts in `dist/`. Load Apple creds before running.

    ```bash
    set -a && source .env && set +a
    pnpm run build:release
    ```

    Watch the log for `notarization successful` (one line per arch).
    Artifacts: `dist/chroma-explorer-<X.Y.Z>-arm64.dmg`,
    `dist/chroma-explorer-<X.Y.Z>-arm64.zip`, `dist/latest-mac.yml`.

3. **Tag and publish to GitHub.** Draft notes from the commits since the
   prior tag (`git log v<prev>..HEAD --oneline`).

    ```bash
    git tag -a v<X.Y.Z> -m "v<X.Y.Z>" && git push origin v<X.Y.Z>
    gh release create v<X.Y.Z> --title v<X.Y.Z> --notes "..." \
      dist/chroma-explorer-<X.Y.Z>-arm64.dmg \
      dist/chroma-explorer-<X.Y.Z>-arm64.zip \
      dist/latest-mac.yml
    ```

    `latest-mac.yml` is required — it's the manifest the in-app autoupdater
    polls.

4. **Sanity check** the release page and try the autoupdater from the
   prior version if possible.

## Known gotchas

- **Only arm64 is built.** Electron-builder reads its config from the
  `build` field in `package.json` (which lists `["dmg", "zip"]` with no
  arch spec, so it defaults to host arch) and ignores
  `electron-builder.yml`. Historical releases have all been arm64-only
  for the same reason. If x64 is needed, consolidate the config and set
  `mac.target[].arch: [x64, arm64]`.
- **`build:release` does not publish.** It runs `electron-builder` with no
  `--publish` flag, so the `publish: github` config in
  `electron-builder.yml` is also ignored. Use `gh release create` (above)
  to ship.
- **Notarization needs network.** Each arch makes a round trip to Apple;
  budget ~3–5 min per arch.
