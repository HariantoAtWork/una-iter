import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { H3Event } from 'h3'
import { ensureDataRoot } from './dataRoot'
import { newId } from './id'
import { slugify } from './slug'

export type ProviderKey = {
  id: string
  key: string
  valid: boolean | null
  createdAt: string
}

export type Provider = {
  id: string
  name: string
  slug: string
  baseUrl: string
  type: 'openai-compatible'
  keys: ProviderKey[]
  createdAt: string
  updatedAt: string
}

export type ProviderPublic = Omit<Provider, 'keys'> & {
  keyCount: number
  validKeyCount: number
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

function readStore(event?: H3Event): Provider[] {
  const path = storePath(event)
  if (!existsSync(path)) {
    return []
  }

  try {
    const raw = readFileSync(path, 'utf8')
    const parsed = JSON.parse(raw) as Provider[]
    return Array.isArray(parsed) ? parsed : []
  }
  catch {
    return []
  }
}

function writeStore(providers: Provider[], event?: H3Event) {
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
  return {
    id: provider.id,
    name: provider.name,
    slug: provider.slug,
    baseUrl: provider.baseUrl,
    type: provider.type,
    createdAt: provider.createdAt,
    updatedAt: provider.updatedAt,
    keyCount: provider.keys.length,
    validKeyCount: provider.keys.filter(item => item.valid === true).length,
    keys: provider.keys.map(item => ({
      id: item.id,
      hint: keyHint(item.key),
      valid: item.valid,
      createdAt: item.createdAt,
    })),
  }
}

export function listProviders(event?: H3Event) {
  return readStore(event).map(toPublicProvider)
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

function uniqueSlug(name: string, providers: Provider[], preferred?: string) {
  const base = slugify(preferred || name) || 'provider'
  let slug = base
  let index = 2

  while (providers.some(provider => provider.slug === slug)) {
    slug = `${base}-${index}`
    index += 1
  }

  return slug
}

function existingKeySet(providers: Provider[]) {
  return new Set(
    providers.flatMap(provider => provider.keys.map(item => item.key)),
  )
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
  if (!baseUrl) {
    throw createError({ statusCode: 400, statusMessage: 'Base URL is required' })
  }

  if (!URL.canParse(baseUrl)) {
    throw createError({ statusCode: 400, statusMessage: 'Base URL is invalid' })
  }

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
    keys,
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
