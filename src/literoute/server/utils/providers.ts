import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { H3Event } from 'h3'
import { ensureDataRoot } from './dataRoot'
import { newId } from './id'
import {
  DEFAULT_PROVIDER_KEY_METHOD,
  isProviderKeyMethod,
  normalizeProviderKeyMethod,
  type ProviderKeyMethod,
} from './providerKeyMethods'
import { slugify } from './slug'

export type ProviderKey = {
  id: string
  key: string
  valid: boolean | null
  createdAt: string
}

export type ProviderModel = {
  id: string
  /** Provider model id (unique per provider), e.g. gpt-4o */
  modelId: string
  enabled: boolean
  source: 'manual' | 'fetched'
  lastTestOk: boolean | null
  testedAt: string | null
  createdAt: string
}

export type Provider = {
  id: string
  name: string
  slug: string
  baseUrl: string
  type: 'openai-compatible'
  /** How the key list rotates when a key is exhausted. */
  keyMethod: ProviderKeyMethod
  keys: ProviderKey[]
  /** Catalogue: enabled entries appear on GET /v1/models. */
  models: ProviderModel[]
  createdAt: string
  updatedAt: string
}

export type ProviderPublic = Omit<Provider, 'keys' | 'models'> & {
  keyCount: number
  validKeyCount: number
  modelCount: number
  enabledModelCount: number
  keys: Array<{
    id: string
    hint: string
    valid: boolean | null
    createdAt: string
  }>
}

export type ParsedBulkKey = {
  id: string
  key: string
}

const STORE_FILENAME = 'providers.json'

function storePath(event?: H3Event) {
  return join(ensureDataRoot(event), STORE_FILENAME)
}

function normalizeProvider(raw: Provider): Provider {
  return {
    ...raw,
    keyMethod: normalizeProviderKeyMethod(raw.keyMethod),
    keys: Array.isArray(raw.keys) ? raw.keys : [],
    models: Array.isArray(raw.models) ? raw.models : [],
  }
}

export function readStore(event?: H3Event): Provider[] {
  const path = storePath(event)
  if (!existsSync(path)) {
    return []
  }

  try {
    const raw = readFileSync(path, 'utf8')
    const parsed = JSON.parse(raw) as Provider[]
    return Array.isArray(parsed) ? parsed.map(normalizeProvider) : []
  }
  catch {
    return []
  }
}

export function writeStore(providers: Provider[], event?: H3Event) {
  writeFileSync(storePath(event), `${JSON.stringify(providers, null, 2)}\n`, {
    encoding: 'utf8',
    mode: 0o600,
  })
}

function keyHint(key: string) {
  if (key.length <= 8) {
    return '••••'
  }
  return `••••${key.slice(-4)}`
}

export function toPublicProvider(provider: Provider): ProviderPublic {
  const normalized = normalizeProvider(provider)
  return {
    id: normalized.id,
    name: normalized.name,
    slug: normalized.slug,
    baseUrl: normalized.baseUrl,
    type: normalized.type,
    keyMethod: normalized.keyMethod,
    createdAt: normalized.createdAt,
    updatedAt: normalized.updatedAt,
    keyCount: normalized.keys.length,
    validKeyCount: normalized.keys.filter(item => item.valid === true).length,
    modelCount: normalized.models.length,
    enabledModelCount: normalized.models.filter(item => item.enabled).length,
    keys: normalized.keys.map(item => ({
      id: item.id,
      hint: keyHint(item.key),
      valid: item.valid,
      createdAt: item.createdAt,
    })),
  }
}

export function findProviderOrThrow(providers: Provider[], id: string) {
  const provider = providers.find(item => item.id === id)
  if (!provider) {
    throw createError({ statusCode: 404, statusMessage: 'Provider not found' })
  }
  return provider
}

export function listProviders(event?: H3Event) {
  return readStore(event).map(toPublicProvider)
}

export function getProvider(id: string, event?: H3Event) {
  const provider = findProviderOrThrow(readStore(event), id)
  return toPublicProvider(provider)
}

export function getOverview(event?: H3Event) {
  const providers = readStore(event)
  const keys = providers.flatMap(provider => provider.keys)

  return {
    providerCount: providers.length,
    keyCount: keys.length,
    validKeyCount: keys.filter(key => key.valid === true).length,
    uncheckedKeyCount: keys.filter(key => key.valid === null).length,
    providers: providers.map(toPublicProvider),
  }
}

function uniqueSlug(
  name: string,
  providers: Provider[],
  preferred?: string,
  excludeId?: string,
) {
  const base = slugify(preferred || name) || 'provider'
  let slug = base
  let index = 2

  while (providers.some(provider => provider.slug === slug && provider.id !== excludeId)) {
    slug = `${base}-${index}`
    index += 1
  }

  return slug
}

function existingKeySet(providers: Provider[], excludeProviderId?: string) {
  return new Set(
    providers
      .filter(provider => provider.id !== excludeProviderId)
      .flatMap(provider => provider.keys.map(item => item.key)),
  )
}

function assertBaseUrl(baseUrl: string) {
  if (!baseUrl) {
    throw createError({ statusCode: 400, statusMessage: 'Base URL is required' })
  }
  if (!URL.canParse(baseUrl)) {
    throw createError({ statusCode: 400, statusMessage: 'Base URL is invalid' })
  }
}

/**
 * Parse bulk key lines:
 * - `sk-...` → generate uuid v7 id
 * - `my-id|sk-...` → use given id
 * Duplicate API keys (within the paste or already stored) are skipped.
 */
export function parseBulkKeys(
  raw: string,
  knownKeys: Set<string> = new Set(),
): { entries: ParsedBulkKey[], skippedExisting: number } {
  const seenKeys = new Set<string>(knownKeys)
  const entries: ParsedBulkKey[] = []
  let skippedExisting = 0

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed) {
      continue
    }

    const separator = trimmed.indexOf('|')
    let id: string
    let key: string

    if (separator === -1) {
      id = newId()
      key = trimmed
    }
    else {
      id = trimmed.slice(0, separator).trim() || newId()
      key = trimmed.slice(separator + 1).trim()
    }

    if (!key) {
      continue
    }

    if (seenKeys.has(key)) {
      skippedExisting += 1
      continue
    }

    seenKeys.add(key)
    entries.push({ id, key })
  }

  return { entries, skippedExisting }
}

async function materialiseKeys(
  entries: ParsedBulkKey[],
  baseUrl: string,
  validateKeys: boolean,
  now: string,
) {
  const keys: ProviderKey[] = []
  let skippedInvalid = 0

  for (const entry of entries) {
    let valid: boolean | null = null
    if (validateKeys) {
      valid = await validateOpenAiCompatibleKey(baseUrl, entry.key)
      if (!valid) {
        skippedInvalid += 1
        continue
      }
    }

    keys.push({
      id: entry.id,
      key: entry.key,
      valid,
      createdAt: now,
    })
  }

  return { keys, skippedInvalid }
}

export type CreateProviderInput = {
  name: string
  slug?: string
  baseUrl: string
  keysRaw: string
  validateKeys?: boolean
}

export async function createProvider(
  input: CreateProviderInput,
  event?: H3Event,
) {
  const name = input.name.trim()
  const baseUrl = input.baseUrl.trim().replace(/\/+$/, '')
  const validateKeys = Boolean(input.validateKeys)

  if (!name) {
    throw createError({ statusCode: 400, statusMessage: 'Name is required' })
  }
  assertBaseUrl(baseUrl)

  const providers = readStore(event)
  const { entries, skippedExisting } = parseBulkKeys(
    input.keysRaw,
    existingKeySet(providers),
  )

  if (entries.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: skippedExisting
        ? 'All API keys already exist or were empty'
        : 'At least one API key is required',
    })
  }

  const now = new Date().toISOString()
  const { keys, skippedInvalid } = await materialiseKeys(
    entries,
    baseUrl,
    validateKeys,
    now,
  )

  if (keys.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: validateKeys
        ? 'No valid API keys found'
        : 'At least one API key is required',
    })
  }

  const provider: Provider = {
    id: newId(),
    name,
    slug: uniqueSlug(name, providers, input.slug),
    baseUrl,
    type: 'openai-compatible',
    keyMethod: DEFAULT_PROVIDER_KEY_METHOD,
    keys,
    models: [],
    createdAt: now,
    updatedAt: now,
  }

  providers.push(provider)
  writeStore(providers, event)

  return {
    provider: toPublicProvider(provider),
    acceptedKeyCount: keys.length,
    skippedExisting,
    skippedInvalid,
  }
}

export type UpdateProviderInput = {
  name: string
  slug?: string
  baseUrl: string
  keyMethod?: ProviderKeyMethod
  keysRaw?: string
  validateKeys?: boolean
}

export async function updateProvider(
  id: string,
  input: UpdateProviderInput,
  event?: H3Event,
) {
  const name = input.name.trim()
  const baseUrl = input.baseUrl.trim().replace(/\/+$/, '')
  const validateKeys = Boolean(input.validateKeys)

  if (!name) {
    throw createError({ statusCode: 400, statusMessage: 'Name is required' })
  }
  assertBaseUrl(baseUrl)

  if (input.keyMethod !== undefined && !isProviderKeyMethod(input.keyMethod)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Unknown key list method',
    })
  }

  const providers = readStore(event)
  const provider = findProviderOrThrow(providers, id)
  const now = new Date().toISOString()

  provider.name = name
  provider.slug = uniqueSlug(name, providers, input.slug, id)
  provider.baseUrl = baseUrl
  if (input.keyMethod !== undefined) {
    provider.keyMethod = input.keyMethod
  }
  provider.updatedAt = now

  let acceptedKeyCount = 0
  let skippedExisting = 0
  let skippedInvalid = 0

  const keysRaw = input.keysRaw?.trim() || ''
  if (keysRaw) {
    const known = new Set([
      ...existingKeySet(providers, id),
      ...provider.keys.map(item => item.key),
    ])
    const parsed = parseBulkKeys(keysRaw, known)
    skippedExisting = parsed.skippedExisting

    const materialised = await materialiseKeys(
      parsed.entries,
      baseUrl,
      validateKeys,
      now,
    )
    skippedInvalid = materialised.skippedInvalid
    acceptedKeyCount = materialised.keys.length
    provider.keys.push(...materialised.keys)
  }

  writeStore(providers, event)

  return {
    provider: toPublicProvider(provider),
    acceptedKeyCount,
    skippedExisting,
    skippedInvalid,
  }
}

export function deleteProvider(id: string, event?: H3Event) {
  const providers = readStore(event)
  const index = providers.findIndex(item => item.id === id)
  if (index === -1) {
    throw createError({ statusCode: 404, statusMessage: 'Provider not found' })
  }

  const [removed] = providers.splice(index, 1)
  writeStore(providers, event)
  return { ok: true as const, id: removed.id }
}

