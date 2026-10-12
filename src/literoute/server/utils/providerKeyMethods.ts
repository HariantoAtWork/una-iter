export const PROVIDER_KEY_METHODS = ['roundabout'] as const

export type ProviderKeyMethod = (typeof PROVIDER_KEY_METHODS)[number]

export const DEFAULT_PROVIDER_KEY_METHOD: ProviderKeyMethod = 'roundabout'

export const PROVIDER_KEY_METHOD_LABELS: Record<ProviderKeyMethod, string> = {
  roundabout: 'Roundabout',
}

export function isProviderKeyMethod(value: unknown): value is ProviderKeyMethod {
  return typeof value === 'string'
    && (PROVIDER_KEY_METHODS as readonly string[]).includes(value)
}

export function normalizeProviderKeyMethod(value: unknown): ProviderKeyMethod {
  return isProviderKeyMethod(value) ? value : DEFAULT_PROVIDER_KEY_METHOD
}
