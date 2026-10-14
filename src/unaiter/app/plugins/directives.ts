import type { Directive } from 'vue'

/**
 * Auto-register custom Vue directives from `app/directives/`.
 *
 * `import.meta.glob` (Vite) scans the directory at build time and, with
 * `eager: true`, returns a map of path → module we can register right away.
 * The file name maps 1:1 to the directive name: `sanitize-html.ts` becomes
 * `v-sanitize-html`. Adding a new directive is a single file, no wiring.
 *
 * Registration runs on both client and server (no `.client` / `.server`
 * suffix) to avoid hydration warnings; directive DOM hooks such as `mounted`
 * only execute on the client anyway.
 */
const modules = import.meta.glob('../directives/*.ts', { eager: true }) as
  Record<string, { default?: Directive }>

export default defineNuxtPlugin((nuxtApp) => {
  for (const [path, module] of Object.entries(modules)) {
    const name = path.match(/([^/]+)\.ts$/)?.[1]
    const directive = module.default
    if (!name || !directive) {
      continue
    }
    nuxtApp.vueApp.directive(name, directive)
  }
})
