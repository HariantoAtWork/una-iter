# Architecture

## Layout

```text
literoute/
  dc.sh                 # build / push / dev lifecycle
  _dev.yml              # hot-reload Nuxt (bun)
  _build.yml / _push.yml
  .env.example
  .data/                # runtime data (gitignored) → mounted as /var/lib/literoute
  src/literoute/        # Nuxt 4 app
    app/                # UI only — no crypto
    server/             # Nitro APIs + utils — crypto allowed here
```

## Stack

| Layer | Choice |
|-------|--------|
| App | Nuxt 4 + Vue 3 |
| UI | `@nuxt/ui` (emerald primary in `app.config.ts`) |
| Runtime | Bun in Docker |
| Auth | Sealed session cookie (server crypto) |
| IDs | `uuid` v7 (`server/utils/id.ts`) |
| Provider store | JSON under `dataRoot` |

## Routes

| Path | Purpose |
|------|---------|
| `/login` | Sign in (auth layout) |
| `/` | Overview dashboard |
| `/providers` | Add / list OpenAI-compatible providers |

Global middleware `auth.global.ts` redirects unauthenticated users to `/login` (except `/login` itself).

## API (selected)

| Method | Path | Notes |
|--------|------|-------|
| POST | `/api/auth/login` | Sets sealed session |
| POST | `/api/auth/logout` | Clears session |
| GET | `/api/auth/me` | Current user or `null` |
| GET | `/api/overview` | Counts + provider summary |
| GET | `/api/providers` | List (keys masked) |
| POST | `/api/providers` | Create + bulk keys |
