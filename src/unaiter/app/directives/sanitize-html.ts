import type { DirectiveBinding } from 'vue'
import DOMPurify from 'dompurify'

type SanitiseValue = {
  html?: string
} | string

/**
 * v-sanitize-html — set innerHTML from a sanitised string.
 *
 * Registered globally in `app/plugins/directives.ts` (Nuxt does not auto-import
 * directives), so it is used as `v-sanitize-html="someHtml"`. Pass a plain
 * string, or an object `{ html }` when updating it reactively.
 *
 * A function directive runs on both mount and update, so re-binding the value
 * re-sanitises and re-renders. DOMPurify strips scripts, event handlers, and
 * other dangerous markup before the value reaches the DOM, so untrusted
 * Markdown/HTML renders safely.
 */
function resolveHtml(value: SanitiseValue): string {
  if (typeof value === 'string') {
    return value
  }
  return value?.html ?? ''
}

export default function sanitizeHtml(el: HTMLElement, binding: DirectiveBinding<SanitiseValue>) {
  const html = DOMPurify.sanitize(resolveHtml(binding.value))
  el.innerHTML = html
}
