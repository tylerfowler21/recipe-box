import { cookies } from 'next/headers'

/**
 * Shared-household auth: one passphrase, one cookie.
 *
 * There are no per-person accounts by design — everyone in the house sees the
 * same recipe box. The cookie carries an HMAC over its own issue time, so it
 * can't be forged and it expires on its own. Web Crypto is used throughout so
 * the same verify runs in Proxy (edge) and in Server Actions (node).
 */

export const SESSION_COOKIE = 'recipe_box_session'
const MAX_AGE_SECONDS = 60 * 60 * 24 * 90 // 90 days — it's a kitchen, not a bank

function secretKeyMaterial() {
  const secret = process.env.SESSION_SECRET
  if (!secret) throw new Error('SESSION_SECRET is not set')
  return new TextEncoder().encode(secret)
}

async function hmac(value: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    secretKeyMaterial(),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value))
  return Buffer.from(new Uint8Array(sig)).toString('base64url')
}

export async function createSessionValue() {
  const issued = Date.now().toString()
  return `${issued}.${await hmac(issued)}`
}

/** Constant-time-ish compare; both sides are fixed-length base64url digests. */
function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export async function verifySessionValue(value: string | undefined) {
  if (!value) return false
  const [issued, sig] = value.split('.')
  if (!issued || !sig) return false
  if (!safeEqual(sig, await hmac(issued))) return false
  const age = (Date.now() - Number(issued)) / 1000
  return Number.isFinite(age) && age >= 0 && age < MAX_AGE_SECONDS
}

export function checkPassword(input: string) {
  const expected = process.env.HOUSEHOLD_PASSWORD
  if (!expected) throw new Error('HOUSEHOLD_PASSWORD is not set')
  return safeEqual(input, expected)
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: MAX_AGE_SECONDS,
}

/** Server-side gate. Proxy handles the redirect; this is the real check. */
export async function isSignedIn() {
  const store = await cookies()
  return verifySessionValue(store.get(SESSION_COOKIE)?.value)
}

export async function requireSession() {
  if (!(await isSignedIn())) throw new Error('Unauthorized')
}
