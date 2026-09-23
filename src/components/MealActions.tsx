'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'

export function MealActions({
  slug,
  addToGroceryAction,
}: {
  slug: string
  addToGroceryAction: () => Promise<void>
}) {
  const [pending, startTransition] = useTransition()
  const [added, setAdded] = useState(false)

  return (
    <div className="no-print flex flex-wrap items-center gap-2 pt-1">
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
        {added ? '✓ Everything on the list' : '+ Whole meal to grocery list'}
      </button>
      <Link
        href={`/meals/${slug}/edit`}
        className="bg-raised border-rule text-ink-soft rounded-full border px-3 py-1.5 text-sm"
      >
        Edit
      </Link>
    </div>
  )
}
