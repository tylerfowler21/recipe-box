import Link from 'next/link'
import { redirect } from 'next/navigation'
import { isSignedIn } from '@/lib/auth'
import { getNeedsReviewCount } from '@/lib/queries'
import { NavTabs } from '@/components/NavTabs'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Proxy already redirected signed-out visitors; this is the authoritative check.
  if (!(await isSignedIn())) redirect('/login')

  const needsReview = await getNeedsReviewCount()

  return (
    <div className="min-h-dvh">
      <header className="border-rule bg-paper/85 no-print sticky top-0 z-20 border-b backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <Link href="/" className="font-display shrink-0 text-lg font-semibold tracking-tight">
            <span aria-hidden>🍜</span>
            {/* The wordmark costs room the nav needs on a phone. */}
            <span className="ml-1.5 hidden sm:inline">Recipe Box</span>
            <span className="sr-only">Recipe Box — home</span>
          </Link>
          <NavTabs needsReviewCount={needsReview} />
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 pb-24 pt-5">{children}</main>
    </div>
  )
}
