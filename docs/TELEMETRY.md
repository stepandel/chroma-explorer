# Telemetry

Chroma Explorer keeps product analytics and error reporting separate.

## Product Analytics

`electron/analytics.ts` owns Aptabase event tracking. Analytics is disabled unless
`APTABASE_APP_KEY` is provided at build time.

Only coarse product events should be tracked. Do not include user document
contents, collection data, embeddings, metadata values, connection URLs, API
keys, auth tokens, or provider credentials in event names or properties.

## Error Reporting

`electron/error-monitoring.ts` owns Sentry initialization for the Electron main
process. `src/error-monitoring.ts` owns renderer initialization.

Error reporting is enabled by default and can be disabled from
**Settings > Privacy**. The setting is stored as `errorReportingEnabled` in
`electron/settings-store.ts` and exposed through the canonical IPC contract in
`electron/ipc-contract.ts`.

Release builds must provide a public DSN at build time:

```bash
SENTRY_DSN=https://public-key@o0.ingest.sentry.io/project-id pnpm build:release
```

`vite.config.js` embeds `SENTRY_DSN` for the main process and renderer bridge.
Renderer events are forwarded through the Electron SDK preload integration once
the renderer initializes.

Sentry releases use `chroma-explorer@<package version>` by default. Set
`SENTRY_RELEASE` only when the Sentry upload release and runtime
`Sentry.init({ release })` value need to be overridden together.

Readable production stack traces require source map upload. Release builds
generate hidden source maps when a DSN is present. They upload maps only when all
of these build-time values are present:

```bash
SENTRY_AUTH_TOKEN=sntrys_...
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=your-project-slug
```

The manual GitHub Actions release workflow (`.github/workflows/release.yml`)
passes those secrets into `pnpm build:release --publish always`. Configure the
same repository secrets there, along with the existing Apple notarization
secrets, before publishing production artifacts.

## Production Validation

Before shipping a release:

1. Run the manual `Release` workflow from GitHub Actions.
2. Install the produced app artifact.
3. Confirm **Settings > Privacy > Error reporting** is enabled.
4. Trigger a known renderer and main-process failure in a test build.
5. Confirm Sentry receives events under the expected
   `chroma-explorer@<package version>` release with readable stack traces.

## Privacy Rules

Sentry events are scrubbed before sending:

- URL-like values are replaced with `[redacted-url]`.
- Long token-like strings are replaced with `[redacted-token]`.
- Keys containing API key, token, secret, password, credential, authorization,
  document, metadata, embedding, query, or URL are replaced with `[redacted]`.
- Event `request` and `user` fields are removed.

Do not add manual Sentry context that contains:

- document text;
- metadata values;
- embeddings;
- collection names when they may reveal user data;
- connection URLs;
- auth headers, tokens, credentials, or API keys.

Prefer tags with stable categories such as window type, operation category,
platform, packaged status, and app version.
