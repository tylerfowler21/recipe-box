'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'

export function RecipeActions({
  slug,
  isFavorite,
  toggleFavoriteAction,
  addToGroceryAction,
}: {
  slug: string
  isFavorite: boolean
  toggleFavoriteAction: () => Promise<void>
  addToGroceryAction: () => Promise<void>
}) {
  const [pending, startTransition] = useTransition()
  const [added, setAdded] = useState(false)

  return (
    <>
      <button
        onClick={() => startTransition(() => toggleFavoriteAction())}
        disabled={pending}
        className={
          isFavorite
            ? 'bg-accent text-paper rounded-full px-3.5 py-1.5 text-[13px] font-medium'
            : 'border-rule-strong text-ink-soft hover:border-ink rounded-full border px-3.5 py-1.5 text-[13px] transition-colors'
        }
      >
        {isFavorite ? '★ Favourite' : '☆ Favourite'}
      </button>

      <button
        onClick={() =>
          startTransition(async () => {
            await addToGroceryAction()
            setAdded(true)
          })
        }
        disabled={pending || added}
        className="border-rule-strong text-ink-soft hover:border-ink rounded-full border px-3.5 py-1.5 text-[13px] transition-colors disabled:opacity-60"
      >
        {added ? '✓ On the list' : '+ Grocery list'}
      </button>

      <Link
        href={`/recipes/${slug}/edit`}
        className="border-rule-strong text-ink-soft hover:border-ink rounded-full border px-3.5 py-1.5 text-[13px] transition-colors"
      >
        Edit
      </Link>

      <button
        onClick={() => window.print()}
        className="border-rule-strong text-ink-soft hover:border-ink rounded-full border px-3.5 py-1.5 text-[13px] transition-colors"
      >
        Print
      </button>
    </>
  )
}
