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

Error reporting is opt-in and defaults to off. The setting is stored as
`errorReportingEnabled` in `electron/settings-store.ts` and exposed through the
canonical IPC contract in `electron/ipc-contract.ts`.

Release builds must provide a public DSN at build time:

```bash
SENTRY_DSN=https://public-key@o0.ingest.sentry.io/project-id pnpm build:release
```

`vite.config.js` embeds `SENTRY_DSN` for the main process. Renderer events are
forwarded through the Electron SDK once the renderer initializes.

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
