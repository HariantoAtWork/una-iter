# Providers

OpenAI-compatible provider registry stored in `dataRoot/providers.json`. Full CRUD from `/providers`.

## UI

- Visiting `/providers` while the list is **empty** opens the add modal automatically.
- **Add provider** (navbar / empty state) opens create mode.
- Each row has **edit** (pencil) and **delete** (trash). Destructive actions use an in-app confirm dialog; success/errors use toasts (no `alert` / `confirm`).
- Key badges show a masked hint and validity colour. The **×** on a badge removes that key only.
- Edit modal updates name / slug / base URL, optionally **appends** more bulk keys, and lists existing keys for removal.

## Form fields

| Field | Behaviour |
|-------|-----------|
| Name | Required |
| Slug | Auto from name; editable |
| Base URL | OpenAI-compatible root, e.g. `https://api.openai.com/v1` |
| Bulk keys | Create: required. Edit: optional append. One entry per line (see below) |
| Auto-check keys | Optional: `GET {baseUrl}/models` with `Authorization: Bearer …`; only valid keys saved |

## Bulk key lines

```text
sk-key-here
my-id|sk-key-something
cursor@harianto.dev|another-key
```

- No `|` → API key only; **uuid v7** id is generated (`uuid` package, server-side).
- `id|key` → use the given id (email or custom string ok).
- Duplicate API keys (in the paste or already stored anywhere) are **skipped**.

## Public API shape

List/get/update responses **mask** secrets: only a hint like `••••abcd` is returned. Full keys never go to the browser intentionally.

## Server helpers

See `server/utils/providers.ts`:

- `listProviders` / `getProvider` / `createProvider` / `updateProvider` / `deleteProvider` / `deleteProviderKey`
- `parseBulkKeys()` for bulk paste
- `toPublicProvider()` for masked responses
