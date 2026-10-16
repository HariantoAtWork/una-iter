# Provider Nuxt module template

Copy this folder when a provider needs **its own UI or API pages** (admin screens,
extra routes). Most providers only need a **server adapter** — start there.

## Adapter vs Nuxt module

| Need | Where |
|------|--------|
| Headers, URL rewrite, free-tier body, API key quirks | `server/utils/providerAdapters/<id>.ts` + register in `index.ts` |
| Dedicated admin page / API under the app | Nuxt local module (this template) |

OpenCode is adapter-only: see `server/utils/providerAdapters/opencode.ts`.
Providers store an explicit `adapterId` (Edit Provider → Adapter). URL host matching
is only a migration hint.

## How to add a server adapter

1. Create `server/utils/providerAdapters/myprovider.ts` implementing `ProviderAdapter`.
2. `registerAdapter(myproviderAdapter)` from `server/utils/providerAdapters/index.ts`.
3. Optionally add `adapterId: 'myprovider'` on a preset in `app/utils/providerPresets.ts`.

## How to use this Nuxt module scaffold

1. Copy `_provider-template` to e.g. `plugins/myprovider`.
2. Uncomment and rename the module in `index.ts`.
3. Register it in `nuxt.config.ts` under `modules` (same pattern as a local module).
4. Put pages under `runtime/pages/`, APIs under `runtime/server/api/`.

For a working local-module example (intent router), see `plugins/router` when present
in the tree: `defineNuxtModule`, `addServerScanDir`, `extendPages`.
