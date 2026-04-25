# Local test ChromaDB

Spins up a local Chroma server with sample data so you can point the explorer at it
and exercise the UI — including authenticated connections.

## Requirements

- [`uv`](https://docs.astral.sh/uv/) on PATH (provides `uvx`). On first run it
  downloads `chromadb` into a cached env; later runs are instant.

## Usage

Start the server (data persists in `./test-db`, gitignored):

```bash
pnpm test:db              # no auth, http://localhost:8000
pnpm test:db:token        # static bearer token
pnpm test:db:basic        # HTTP basic auth
```

Seed the running server (run once after first start; idempotent — safe to re-run):

```bash
pnpm test:db:seed         # against the no-auth server
pnpm test:db:seed:token   # against the token server
pnpm test:db:seed:basic   # against the basic-auth server
```

Stop with `Ctrl+C`.

## Auth credentials

Defaults are baked in (override with env vars before launching):

| Mode  | Default                          | Env var              |
| ----- | -------------------------------- | -------------------- |
| token | `test-token-abc123`              | `CHROMA_TEST_TOKEN`  |
| basic | `admin:secret`                   | `CHROMA_TEST_BASIC`  |

Token mode accepts either header:

- `Authorization: Bearer <token>`
- `X-Chroma-Token: <token>`

Basic mode expects `Authorization: Basic base64(user:password)` (standard
`Authorization` header — any HTTP client's basic auth helper works).

## How it works

Chroma 1.x removed in-process auth, so for `token` and `basic` modes the
script spawns `chroma run` on an internal port and a tiny built-in Node
reverse proxy on the user-facing port. The proxy validates the auth header,
strips it, and forwards everything else upstream. `none` mode skips the proxy.

The persistence dir is shared across modes, so you can switch between them
(stop, restart with a different `--auth`) without re-seeding.

## Pointing the explorer at it

In the explorer's connection profile:

- URL: `http://localhost:8000`
- Token mode: set the API key / authorization header to `test-token-abc123`
- Basic mode: send `Authorization: Basic <base64>` (or rely on the explorer's
  basic-auth profile fields once they exist)
