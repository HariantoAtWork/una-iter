import { defaultAdapter, DEFAULT_ADAPTER_ID } from './default'
import type {
  AdapterPublic,
  ProviderAdapter,
  ResolveAdapterInput,
} from './types'

const adapters = new Map<string, ProviderAdapter>()

export function registerAdapter(adapter: ProviderAdapter) {
  adapters.set(adapter.id, adapter)
}

export function getAdapter(id: string): ProviderAdapter | undefined {
  return adapters.get(id)
}

export function isKnownAdapterId(id: string): boolean {
  return adapters.has(id)
}

export function listAdapters(): ProviderAdapter[] {
  return [...adapters.values()]
}

export function listAdaptersPublic(): AdapterPublic[] {
  return listAdapters().map(adapter => ({
    id: adapter.id,
    label: adapter.label,
  }))
}

/**
 * Prefer explicit adapterId; else first adapter whose match(baseUrl) hits;
 * else default.
 */
export function resolveAdapter(input: ResolveAdapterInput = {}): ProviderAdapter {
  const id = typeof input.adapterId === 'string' ? input.adapterId.trim() : ''
  if (id) {
    const byId = adapters.get(id)
    if (byId) {
      return byId
    }
  }

  const baseUrl = typeof input.baseUrl === 'string' ? input.baseUrl.trim() : ''
  if (baseUrl) {
    for (const adapter of adapters.values()) {
      if (adapter.id === DEFAULT_ADAPTER_ID) {
        continue
      }
      if (adapter.match?.(baseUrl)) {
        return adapter
      }
    }
  }

  return adapters.get(DEFAULT_ADAPTER_ID) || defaultAdapter
}

/** Normalise / migrate a stored adapterId (unknown → default; empty + URL hint). */
export function normalizeAdapterId(
  adapterId: unknown,
  baseUrl?: string,
): string {
  if (typeof adapterId === 'string' && adapterId.trim()) {
    const id = adapterId.trim()
    if (adapters.has(id)) {
      return id
    }
  }
  if (baseUrl) {
    const hinted = resolveAdapter({ baseUrl })
    if (hinted.id !== DEFAULT_ADAPTER_ID) {
      return hinted.id
    }
  }
  return DEFAULT_ADAPTER_ID
}
