# Dashboard

Built with **Nuxt UI** dashboard primitives:

- `UDashboardGroup` + `UDashboardSidebar` in `app/layouts/default.vue`
- Pages use `UDashboardPanel` / `UDashboardNavbar`

## Navigation

- **Home** `/` — overview cards (providers, keys, valid, unchecked) + recent provider list
- **Providers** `/providers` — create form + saved providers
- Footer: signed-in username + sign out

## Theming

`app/app.config.ts`:

```ts
ui: {
  colors: {
    primary: 'emerald',
    neutral: 'zinc',
  },
}
```

Customise components via Nuxt UI `app.config` / `ui` props — no custom crypto or auth logic in the layout.
