# Providers

OpenAI-compatible provider registry stored in `dataRoot/providers.json`.

## Create form fields

| Field | Behaviour |
|-------|-----------|
| Name | Required |
|Slug | Auto from name; editable |
| Base URL | OpenAI-compatible root, e.g. `https://api.openai.com/v1` |
| Bulk keys | One entry per line (see below) |
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

List/overview responses **mask** secrets: only a hint like `••••abcd` is returned. Full keys never go to the browser intentionally.

## Types (server)

See `server/utils/providers.ts`:

- `Provider` / `ProviderKey` with uuid v7 (or supplied) `id`
- `parseBulkKeys()` / `createProvider()`
