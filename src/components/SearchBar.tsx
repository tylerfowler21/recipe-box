'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

/**
 * Search box that writes straight to the URL, so a search is shareable and the
 * back button behaves. Typing is debounced and replaces history rather than
 * pushing, so one search doesn't bury the previous page under 12 entries.
 */
export function SearchBar() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [pending, startTransition] = useTransition()

  const urlQuery = params.get('q') ?? ''
  const [value, setValue] = useState(urlQuery)
  const latest = useRef(urlQuery)

  // Keep in step when the query changes from elsewhere (back button, Clear).
  useEffect(() => {
    if (urlQuery !== latest.current) {
      latest.current = urlQuery
      setValue(urlQuery)
    }
  }, [urlQuery])

  useEffect(() => {
    if (value === latest.current) return
    const id = setTimeout(() => {
      latest.current = value
      const next = new URLSearchParams(params.toString())
      if (value.trim()) next.set('q', value.trim())
      else next.delete('q')
      startTransition(() => router.replace(`${pathname}?${next}`, { scroll: false }))
    }, 200)
    return () => clearTimeout(id)
  }, [value, params, pathname, router])

  return (
    <div className="relative">
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search recipes, ingredients, tags…"
        aria-label="Search recipes"
        className="field pl-9"
      />
      <span
        aria-hidden
        className="text-ink-faint pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
      >
        ⌕
      </span>
      {pending ? (
        <span className="text-ink-faint absolute right-3 top-1/2 -translate-y-1/2 text-xs">…</span>
      ) : null}
    </div>
  )
}
