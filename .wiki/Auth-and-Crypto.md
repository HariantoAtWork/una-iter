# Auth and crypto (server-only)

## Policy

| Area | Crypto? | Notes |
|------|---------|--------|
| `src/literoute/server/**` | Yes | `node:crypto` for secrets and compares |
| `src/literoute/app/**` | **No** | No Web Crypto / `node:crypto` / `crypto.randomUUID()` |
| Entity IDs | `uuid` package | `import { v7 as uuidv7 } from 'uuid'` via `newId()` |

Browser Web Crypto needs a secure context (HTTPS). That is why the frontend must not depend on it. Server-side Node/Bun crypto is fine on HTTP or HTTPS.

## What uses crypto today (server)

1. **`server/utils/appSecret.ts`** — `randomBytes` to generate `dataRoot/app.secret` when `NUXT_APP_SECRET` is unset. Ignores Nuxt’s generated `NUXT_APP_SECRET_GENERATED=1` value so the persisted file is the source of truth.
2. **`server/utils/auth.ts`** — `timingSafeEqual` for administrator username/password checks; seals the session with h3 `useSession` (iron) using that secret.
3. **Boot plugin** `server/plugins/app-secret.ts` — ensures the secret exists at startup.

## Sessions

- Cookie name: `literoute-session` (httpOnly, `sameSite=lax`).
- `Secure` is set **only** when the request is HTTPS (`x-forwarded-proto` or request URL protocol). Plain HTTP login still works in local/dev.
- Session payload holds `{ user: { username }, rememberMe }`.
- **Remember me** (default on): persistent cookie for 30 days.
- Remember me off: browser session cookie (cleared when the browser closes); seal TTL still 24h.

## Frontend auth

- `app/composables/useAuth.ts` talks to `/api/auth/*` only.
- No client-side hashing, sealing, or `crypto.*`.

## Guardrail

```bash
./scripts/check-no-frontend-crypto.sh
```

Fails if `app/` imports or calls crypto APIs (excluding harmless UI strings like Nuxt UI `variant="subtle"`).
