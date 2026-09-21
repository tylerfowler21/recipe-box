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
            ? 'bg-accent rounded-full px-3 py-1.5 text-sm font-medium text-white'
            : 'bg-raised border-rule text-ink-soft rounded-full border px-3 py-1.5 text-sm'
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
        className="bg-raised border-rule text-ink-soft rounded-full border px-3 py-1.5 text-sm disabled:opacity-60"
      >
        {added ? '✓ On the list' : '+ Grocery list'}
      </button>

      <Link
        href={`/recipes/${slug}/edit`}
        className="bg-raised border-rule text-ink-soft rounded-full border px-3 py-1.5 text-sm"
      >
        Edit
      </Link>

      <button
        onClick={() => window.print()}
        className="bg-raised border-rule text-ink-soft rounded-full border px-3 py-1.5 text-sm"
      >
        Print
      </button>
    </>
  )
}
