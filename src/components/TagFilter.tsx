'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

type Tag = { name: string; slug: string; kind: string; _count: { recipes: number } }

const KIND_ORDER = ['course', 'main-ingredient', 'cuisine', 'method', 'general']
const KIND_LABEL: Record<string, string> = {
  course: 'Course',
  'main-ingredient': 'Main ingredient',
  cuisine: 'Cuisine',
  method: 'How it cooks',
  general: 'Other',
}

export function TagFilter({
  tags,
  selected,
  counts,
}: {
  tags: Tag[]
  selected: string[]
  counts: { total: number; needsReview: number; favorites: number }
}) {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const [expanded, setExpanded] = useState(false)

  const show = params.get('show')

  function toggleTag(slug: string) {
    const next = new URLSearchParams(params.toString())
    const current = next.getAll('tag')
    next.delete('tag')
    const updated = current.includes(slug)
      ? current.filter((t) => t !== slug)
      : [...current, slug]
    updated.forEach((t) => next.append('tag', t))
    router.replace(`${pathname}?${next}`, { scroll: false })
  }

  function setShow(value: string | null) {
    const next = new URLSearchParams(params.toString())
    if (value) next.set('show', value)
    else next.delete('show')
    router.replace(`${pathname}?${next}`, { scroll: false })
  }

  const byKind = KIND_ORDER.map((kind) => ({
    kind,
    items: tags.filter((t) => t.kind === kind),
  })).filter((g) => g.items.length)

  // Collapsed by default so the list of recipes stays above the fold on a phone.
  const visible = expanded ? byKind : byKind.slice(0, 1)
  const hasFilters = selected.length > 0 || Boolean(show) || Boolean(params.get('q'))

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <button
          onClick={() => setShow(show === 'favorites' ? null : 'favorites')}
          className={chip(show === 'favorites')}
        >
          ★ Favourites {counts.favorites ? `(${counts.favorites})` : ''}
        </button>
        {counts.needsReview > 0 ? (
          <button
            onClick={() => setShow(show === 'review' ? null : 'review')}
            className={
              show === 'review'
                ? 'bg-warn rounded-full px-3 py-1.5 font-medium text-white'
                : 'bg-warn-soft text-warn rounded-full px-3 py-1.5'
            }
          >
            Needs a look ({counts.needsReview})
          </button>
        ) : null}
        <button
          onClick={() => setExpanded((e) => !e)}
          className="text-ink-soft hover:text-ink ml-auto rounded-full px-2 py-1.5"
        >
          {expanded ? 'Fewer filters' : 'More filters'}
        </button>
        {hasFilters ? (
          <Link href={pathname} className="text-accent px-2 py-1.5 font-medium">
            Clear
          </Link>
        ) : null}
      </div>

      {visible.map((group) => (
        <div key={group.kind} className="space-y-1.5">
          <p className="text-ink-faint text-[11px] font-medium uppercase tracking-wide">
            {KIND_LABEL[group.kind] ?? group.kind}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {group.items.map((tag) => (
              <button
                key={tag.slug}
                onClick={() => toggleTag(tag.slug)}
                aria-pressed={selected.includes(tag.slug)}
                className={chip(selected.includes(tag.slug))}
              >
                {tag.name}
                <span className="opacity-55"> {tag._count.recipes}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function chip(active: boolean) {
  return active
    ? 'bg-accent rounded-full px-3 py-1.5 text-sm font-medium text-white'
    : 'bg-raised border-rule text-ink-soft hover:text-ink rounded-full border px-3 py-1.5 text-sm'
}
