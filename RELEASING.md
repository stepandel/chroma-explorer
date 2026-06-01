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

    `build:release` sets `CHROMA_EXPLORER_RELEASE=1`; without that flag, local
    dev and packaged builds use the separate `Chroma Explorer Dev` user-data
    store.

    Watch the log for `notarization successful` (one line per arch).
    Artifacts: `dist/chroma-explorer-<X.Y.Z>-arm64.dmg`,
    `dist/chroma-explorer-<X.Y.Z>-arm64.zip`, `dist/latest-mac.yml`.

3. **Bridge existing users.** Version `0.5.2` is the last GitHub-updated free
   bridge build. It shows a one-time notice explaining that users can keep using
   this version for free, or download the new website binary to receive future
   updates.

    Keep the updater config pointed at GitHub for `v0.5.2`, because installed
    `v0.5.1` apps poll GitHub. Do not point this bridge build at the marketing
    update feed.

4. **Verify paid-track builds after the bridge release.** Builds distributed
   from the website should use the marketing update feed:

    ```bash
    rg "https://www.chroma-explorer.com/api/updates" dist-electron
    ```

    If `dist/mac-arm64/Chroma Explorer.app/Contents/Resources/app-update.yml`
    is present, confirm it also uses the generic provider URL.

5. **Upload paid-track release artifacts to Vercel Blob.** The paid website serves the
   initial DMG from a private Blob path, and the in-app updater reads the public
   generic feed at `https://www.chroma-explorer.com/api/updates`.

    From the marketing repo:

    ```bash
    cd ../chroma-explorer-marketing
    bun run upload:release -- --version <X.Y.Z> --dist ../chroma-explorer/dist
    ```

    The production website should point `CHROMA_EXPLORER_BLOB_PATHNAME` at the
    DMG and `CHROMA_EXPLORER_UPDATE_CHANNEL_PATHNAME` at
    `releases/latest-mac.yml`.

6. **Tag and publish to GitHub.** Draft notes from the commits since the
   prior tag (`git log v<prev>..HEAD --oneline`). GitHub remains the public
   changelog/source release. It is also the one-release bridge for existing
   installed versions: v0.5.1 and earlier still poll GitHub, so this release
   must include the DMG, ZIP, and `latest-mac.yml`. Once users install this
   version, future checks use the marketing update feed embedded in
   `app-update.yml`.

    ```bash
    git tag -a v<X.Y.Z> -m "v<X.Y.Z>" && git push origin v<X.Y.Z>
    gh release create v<X.Y.Z> --title v<X.Y.Z> --notes "..." \
      dist/chroma-explorer-<X.Y.Z>-arm64.dmg \
      dist/chroma-explorer-<X.Y.Z>-arm64.zip \
      dist/latest-mac.yml
    ```

    `latest-mac.yml` is required — it's the manifest the in-app autoupdater
    polls.

7. **Sanity check** the release page and try the autoupdater from the
   prior version if possible.

## Autoupdater behavior

The macOS **Check for Updates...** app menu item runs the update flow in the
main process and uses native Electron dialogs to report the result, download the
update, and offer **Restart and Install**. The menu flow temporarily disables
auto-download so the user confirms before the download starts.

## Known gotchas

- **Only arm64 is built.** Electron-builder reads its config from the
  `build` field in `package.json` (which lists `["dmg", "zip"]` with no
  arch spec, so it defaults to host arch) and ignores
  `electron-builder.yml`. Historical releases have all been arm64-only
  for the same reason. If x64 is needed, consolidate the config and set
  `mac.target[].arch: [x64, arm64]`.
- **`build:release` does not publish.** It runs `electron-builder` with no
  `--publish` flag, so upload the artifacts to Vercel Blob and create the
  GitHub release explicitly.
- **Notarization needs network.** Each arch makes a round trip to Apple;
  budget ~3–5 min per arch.
