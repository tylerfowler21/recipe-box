'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'

/**
 * Flat A–Z list, or the same recipes under course headings.
 *
 * Written to the URL rather than component state so a grouped view is
 * shareable and survives the back button, like the search and tag filters.
 */
export function GroupSwitch({ grouped }: { grouped: boolean }) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()

  function setGrouped(next: boolean) {
    const query = new URLSearchParams(params.toString())
    if (next) query.set('group', 'course')
    else query.delete('group')
    router.replace(`${pathname}?${query}`, { scroll: false })
  }

  return (
    <div className="no-print text-ink-faint flex items-center gap-3 text-xs">
      <button
        onClick={() => setGrouped(false)}
        aria-pressed={!grouped}
        className={!grouped ? 'text-ink font-medium' : 'hover:text-ink'}
      >
        A–Z
      </button>
      <span aria-hidden className="text-rule-strong">
        |
      </span>
      <button
        onClick={() => setGrouped(true)}
        aria-pressed={grouped}
        className={grouped ? 'text-ink font-medium' : 'hover:text-ink'}
      >
        By course
      </button>
    </div>
  )
}
