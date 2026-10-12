import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import type { H3Event } from 'h3'

export function dataRoot(event?: H3Event): string {
  const config = event ? useRuntimeConfig(event) : useRuntimeConfig()
  const root = String(config.dataRoot || process.env.NUXT_DATA_ROOT || './data')
  return resolve(root)
}

export function ensureDataRoot(event?: H3Event): string {
  const root = dataRoot(event)
  mkdirSync(root, { recursive: true })
  return root
}
