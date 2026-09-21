'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { href: '/', label: 'Recipes' },
  { href: '/plan', label: 'Plan' },
  { href: '/grocery', label: 'Grocery' },
]

export function NavTabs() {
  const pathname = usePathname()

  return (
    <nav className="ml-auto flex shrink-0 items-center gap-0.5 text-sm sm:gap-1">
      {TABS.map((tab) => {
        const active = tab.href === '/' ? pathname === '/' : pathname.startsWith(tab.href)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? 'page' : undefined}
            className={
              active
                ? 'bg-accent-soft text-accent rounded-full px-2.5 py-1.5 font-medium sm:px-3'
                : 'text-ink-soft hover:text-ink rounded-full px-2.5 py-1.5 sm:px-3'
            }
          >
            {tab.label}
          </Link>
        )
      })}
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
