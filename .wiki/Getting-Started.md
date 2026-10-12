# Getting started

## Prerequisites

- Docker + Docker Compose
- Bun (for local work inside `src/literoute` if needed)
- A `.env` copied from `.env.example`

```bash
cp .env.example .env
# set ADMINISTRATOR_PASSWORD at minimum
```

## Dev stack

```bash
./dc.sh dev            # up -d --build via _dev.yml
./dc.sh dev:down
./dc.sh dev:restart    # down then up
```

Optional host port:

```bash
PORT=3333 ./dc.sh dev
```

App: `http://localhost:3000` (or your `PORT`).

Default admin username is `admin` when `ADMINISTRATOR_USERNAME` is unset.

## Production-ish compose

Copy examples:

```bash
cp docker-compose.yml.example docker-compose.yml
cp docker-compose.override.yml.example docker-compose.override.yml
```

Build / push helpers:

```bash
./dc.sh build
./dc.sh push
```
