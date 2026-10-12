import { timingSafeEqual } from 'node:crypto'
import type { H3Event } from 'h3'
import { resolveAppSecret } from './appSecret'

export type AuthSession = {
  user?: {
    username: string
  }
}

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

/** Sealed session cookie (server crypto via iron). Works on HTTP when request is not HTTPS. */
export async function useAuthSession(event: H3Event) {
  const password = await resolveAppSecret(event)

  return useSession<AuthSession>(event, {
    name: 'literoute-session',
    password,
    maxAge: 60 * 60 * 24 * 7,
    cookie: {
      httpOnly: true,
      secure: cookieSecure(event),
      sameSite: 'lax',
      path: '/',
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
