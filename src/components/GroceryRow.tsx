'use client'

import { useOptimistic, useTransition } from 'react'
import { toggleGroceryItem, deleteGroceryItem } from '@/lib/actions'

type Item = { id: string; text: string; checked: boolean; sourceLabel: string | null }

export function GroceryRow({ item }: { item: Item }) {
  const [, startTransition] = useTransition()
  // Ticking things off in a shop should feel instant, even on shop wifi.
  const [checked, setChecked] = useOptimistic(item.checked)

  return (
    <li className="border-rule flex items-center gap-3 border-b py-2.5">
      <button
        onClick={() =>
          startTransition(async () => {
            setChecked(!checked)
            await toggleGroceryItem(item.id)
          })
        }
        aria-pressed={checked}
        className={
          checked
            ? 'bg-accent text-paper print-box flex size-5 shrink-0 items-center justify-center rounded-[4px] text-[11px]'
            : 'border-rule-strong print-box size-5 shrink-0 rounded-[4px] border-[1.5px]'
        }
      >
        {checked ? '✓' : ''}
      </button>
      <span className={checked ? 'struck flex-1 text-[15px]' : 'flex-1 text-[15px]'}>
        {item.text}
      </span>
      <button
        onClick={() => startTransition(() => deleteGroceryItem(item.id))}
        className="text-ink-faint hover:text-warn no-print shrink-0 text-sm"
        aria-label={`Remove ${item.text}`}
      >
        ×
      </button>
    </li>
  )
}
