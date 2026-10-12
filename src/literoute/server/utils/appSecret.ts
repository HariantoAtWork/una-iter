import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { randomBytes } from 'node:crypto'
import type { H3Event } from 'h3'
import { ensureDataRoot } from './dataRoot'

const SECRET_FILENAME = 'app.secret'
const MIN_SECRET_LENGTH = 32

let cachedSecret: string | undefined
let secretPromise: Promise<string> | undefined

function isUsableSecret(value: string): boolean {
  return value.length >= MIN_SECRET_LENGTH
}

export async function resolveAppSecret(event?: H3Event): Promise<string> {
  if (cachedSecret && isUsableSecret(cachedSecret)) {
    return cachedSecret
  }

  const fromEnv = process.env.NUXT_APP_SECRET || ''
  if (isUsableSecret(fromEnv)) {
    cachedSecret = fromEnv
    return cachedSecret
  }

  if (!secretPromise) {
    secretPromise = (async () => {
      const root = ensureDataRoot(event)
      const secretPath = join(root, SECRET_FILENAME)

      if (existsSync(secretPath)) {
        const existing = readFileSync(secretPath, 'utf8').trim()
        if (isUsableSecret(existing)) {
          cachedSecret = existing
          return cachedSecret
        }
      }

      const generated = randomBytes(32).toString('base64')
      writeFileSync(secretPath, `${generated}\n`, {
        encoding: 'utf8',
        mode: 0o600,
      })
      cachedSecret = generated
      return cachedSecret
    })().catch((error) => {
      secretPromise = undefined
      throw error
    })
  }

  return secretPromise
}
