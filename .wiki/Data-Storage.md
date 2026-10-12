# Data storage

Runtime files live under **`dataRoot`** (Docker: `/var/lib/literoute` → host `.data/` or `./data/literoute`).

| File | Purpose |
|------|---------|
| `app.secret` | Server session seal secret (≥32 chars, mode `0600`) |
| `providers.json` | Providers + API keys (mode `0600`) |

Helpers:

- `server/utils/dataRoot.ts` — `dataRoot()` / `ensureDataRoot()`
- `.data/` and `/data/` are gitignored

Never commit secrets or provider key files.
