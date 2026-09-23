'use client'

import { useState, useTransition } from 'react'
import { clearGroceryList } from '@/lib/actions'

/**
 * Empties the grocery list in one go.
 *
 * Asks first, and says how many items and how many of them are still
 * outstanding — there's no undo, and "clear" next to "clear done" is an easy
 * thing to hit by accident.
 */
export function ClearGroceryList({ total, outstanding }: { total: number; outstanding: number }) {
  const [confirming, setConfirming] = useState(false)
  const [pending, startTransition] = useTransition()

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="text-ink-soft hover:text-warn no-print text-sm"
      >
        Clear all
      </button>
    )
  }

  return (
    <span className="no-print inline-flex items-center gap-2 text-sm">
      <span className="text-ink-soft">
        Clear all {total}
        {outstanding > 0 && outstanding < total ? `, including ${outstanding} not got yet` : ''}?
      </span>
      <button
        onClick={() => startTransition(() => clearGroceryList())}
        disabled={pending}
        className="bg-warn rounded-full px-2.5 py-1 text-xs font-medium text-white disabled:opacity-60"
      >
        {pending ? 'Clearing…' : 'Yes, clear'}
      </button>
      <button onClick={() => setConfirming(false)} className="text-ink-soft text-xs">
        Cancel
      </button>
    </span>
  )
}
