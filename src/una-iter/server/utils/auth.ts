import { timingSafeEqual } from 'node:crypto'
import type { H3Event } from 'h3'
import { resolveAppSecret } from './appSecret'

export type AuthSession = {
  user?: {
    username: string
  }
  rememberMe?: boolean
}

/** Persistent login (Remember me). */
export const REMEMBER_ME_MAX_AGE = 60 * 60 * 24 * 30
/** Seal TTL when Remember me is off (cookie itself is session-scoped). */
export const SESSION_SEAL_MAX_AGE = 60 * 60 * 24

/** Server-only constant-time compare. */
export function safeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a)
  const bBuf = Buffer.from(b)
  const len = Math.max(aBuf.length, bBuf.length, 1)
  const aPad = Buffer.alloc(len)
  const bPad = Buffer.alloc(len)
  aBuf.copy(aPad)
  bBuf.copy(bPad)
  return timingSafeEqual(aPad, bPad) && aBuf.length === bBuf.length
}

function cookieSecure(event: H3Event) {
  return getRequestHeader(event, 'x-forwarded-proto') === 'https'
    || getRequestURL(event).protocol === 'https:'
}

type AuthSessionOptions = {
  /** When set (login), controls cookie persistence. */
  rememberMe?: boolean
}

/** Sealed session cookie (server crypto via iron). */
export async function useAuthSession(event: H3Event, options: AuthSessionOptions = {}) {
  const password = await resolveAppSecret(event)
  const rememberMe = options.rememberMe ?? true
  const maxAge = rememberMe ? REMEMBER_ME_MAX_AGE : SESSION_SEAL_MAX_AGE

  return useSession<AuthSession>(event, {
    name: 'literoute-session',
    password,
    maxAge,
    cookie: {
      httpOnly: true,
      secure: cookieSecure(event),
      sameSite: 'lax',
      path: '/',
      ...(rememberMe ? { maxAge: REMEMBER_ME_MAX_AGE } : {}),
    },
  })
}

export async function requireAuthUser(event: H3Event) {
  const session = await useAuthSession(event)
  const user = session.data.user
  if (!user?.username) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorised' })
  }
  return { session, user }
}
