'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'

// "Recipes" is deliberately absent: the wordmark goes home, and the page's own
// Recipes / Meals switch covers that choice. Repeating it here made two
// controls for one destination.
const TABS = [
  { href: '/plan', label: 'Plan' },
  { href: '/grocery', label: 'Grocery' },
]

export function NavTabs({ needsReviewCount }: { needsReviewCount: number }) {
  const pathname = usePathname()
  const params = useSearchParams()

  const reviewing = pathname === '/' && params.get('show') === 'review'

  return (
    <nav className="ml-auto flex shrink-0 items-center gap-0.5 text-sm sm:gap-1">
      {TABS.map((tab) => {
        const active = pathname.startsWith(tab.href)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? 'page' : undefined}
            className={
              active
                ? 'text-ink px-2.5 py-1.5 font-medium sm:px-3'
                : 'text-ink-faint hover:text-ink px-2.5 py-1.5 sm:px-3'
            }
          >
            {tab.label}
          </Link>
        )
      })}

      {/*
        Only rendered while something is actually flagged, so the nav goes back
        to normal once the last gap is filled rather than leaving a dead "0".
        Shown as a bare count to survive a 375px-wide phone, with the full
        meaning carried by the label for screen readers and hover.
      */}
      {needsReviewCount > 0 ? (
        <Link
          href="/?show=review"
          title={`${needsReviewCount} recipes need a look`}
          aria-current={reviewing ? 'page' : undefined}
          className={
            reviewing
              ? 'bg-warn text-paper ml-0.5 shrink-0 rounded-full px-2.5 py-1.5 text-xs font-medium sm:ml-1'
              : 'text-warn ml-0.5 shrink-0 px-2.5 py-1.5 text-xs font-medium sm:ml-1'
          }
        >
          <span aria-hidden>{needsReviewCount}</span>
          <span className="sr-only">{needsReviewCount} recipes need a look</span>
        </Link>
      ) : null}

      <Link
        href="/recipes/new"
        className="bg-accent ml-0.5 shrink-0 rounded-full px-3 py-1.5 font-medium text-white sm:ml-1"
      >
        <span aria-hidden>+</span>
        <span className="sr-only">Add a recipe</span>
      </Link>
    </nav>
  )
}
