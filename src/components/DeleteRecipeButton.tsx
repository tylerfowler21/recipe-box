'use client'

import { useState, useTransition } from 'react'

export function DeleteRecipeButton({
  title,
  action,
}: {
  title: string
  action: () => Promise<void>
}) {
  const [confirming, setConfirming] = useState(false)
  const [pending, startTransition] = useTransition()

  if (!confirming) {
    return (
      <div className="border-rule border-t pt-5">
        <button onClick={() => setConfirming(true)} className="text-warn text-sm underline">
          Delete this recipe
        </button>
      </div>
    )
  }

  return (
    <div className="border-rule bg-warn-soft space-y-3 rounded-[14px] border-t p-4">
      <p className="text-sm">
        Delete <strong>{title}</strong> for good? This can&rsquo;t be undone.
      </p>
      <div className="flex gap-3">
        <button
          onClick={() => startTransition(() => action())}
          disabled={pending}
          className="bg-warn rounded-[10px] px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {pending ? 'Deleting…' : 'Yes, delete it'}
        </button>
        <button onClick={() => setConfirming(false)} className="text-ink-soft text-sm">
          Keep it
        </button>
      </div>
    </div>
  )
}
