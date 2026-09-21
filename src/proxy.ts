import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { SESSION_COOKIE, verifySessionValue } from '@/lib/auth'

/**
 * Optimistic gate only — it keeps signed-out visitors from seeing the shell.
 * Real authorization lives in the pages and Server Actions themselves, since
 * Server Actions are reachable by direct POST and never pass through here.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const signedIn = await verifySessionValue(request.cookies.get(SESSION_COOKIE)?.value)

  if (!signedIn && pathname !== '/login') {
    const url = new URL('/login', request.url)
    if (pathname !== '/') url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }
  if (signedIn && pathname === '/login') {
    return NextResponse.redirect(new URL('/', request.url))
  }
  return NextResponse.next()
}

export const config = {
  // Everything except Next internals, the uploaded photos, and static assets.
  matcher: ['/((?!_next/static|_next/image|uploads|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)'],
}
