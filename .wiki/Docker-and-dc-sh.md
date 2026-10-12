# Docker and `dc.sh`

## Commands

| Command | Action |
|---------|--------|
| `./dc.sh build` | `docker compose -f _build.yml build` |
| `./dc.sh push` | `docker compose -f _push.yml build --no-cache --push` |
| `./dc.sh dev` | `docker compose -f _dev.yml up -d --build` |
| `./dc.sh dev:down` | `docker compose -f _dev.yml down` |
| `./dc.sh dev:restart` | runs `dev:down` then `dev` via `$0` |

## Dev compose notes (`_dev.yml`)

- Image: `oven/bun:canary-alpine`
- Mounts app source + named volume for `node_modules`
- Data: `.data:/var/lib/literoute`
- Forces `NUXT_DATA_ROOT=/var/lib/literoute` (do not use host-relative `./data` inside the container)
- Host port: `${PORT:-3000}:3000`
- Install: `bun install` (not frozen) so Linux can refresh the lockfile when deps change on the Mac host

## Production example

`docker-compose.yml.example` publishes image `harianto/literoute:latest`, mounts `./data/literoute`, sets `NUXT_DATA_ROOT=/var/lib/literoute`.
