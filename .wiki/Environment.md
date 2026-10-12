# Environment

Copy `.env.example` → `.env` (gitignored).

| Variable | Required | Default / notes |
|----------|----------|-----------------|
| `ADMINISTRATOR_USERNAME` | No | `admin` |
| `ADMINISTRATOR_PASSWORD` | Yes (for login) | — |
| `NUXT_APP_SECRET` | No | If unset, generated into `dataRoot/app.secret` (server-only) |
| `PORT` | No | Host publish port for `_dev.yml` (default `3000`) |
| `TZ` | No | `UTC` |

Docker always sets container `NUXT_DATA_ROOT=/var/lib/literoute` for the mounted volume.

`NUXT_APP_SECRET` is consumed only on the server for sealing sessions. Do not expose it as `runtimeConfig.public`.
