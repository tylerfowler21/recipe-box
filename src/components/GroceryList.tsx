'use client'

import { useMemo, useOptimistic, useState, useTransition } from 'react'
import { combineIngredients } from '@/lib/ingredients'
import { setGroceryItemsChecked } from '@/lib/actions'
import { GroceryRow } from '@/components/GroceryRow'

type Item = {
  id: string
  text: string
  checked: boolean
  sourceLabel: string | null
}

/**
 * The grocery list, two ways.
 *
 * "By recipe" answers "why is this on the list"; "Combined" answers "how much
 * do I actually buy", which is the question you have in the shop. Both read the
 * same rows — the combined view is a presentation of them, not a second copy.
 */
export function GroceryList({ items }: { items: Item[] }) {
  const [combined, setCombined] = useState(false)

  const open = items.filter((i) => !i.checked)
  const done = items.filter((i) => i.checked)

  const heading = combined ? 'Shopping list' : 'Shopping list, by recipe'

  return (
    <div className="space-y-5">
      <div className="print-title mb-4">
        <h2 className="font-display text-xl font-semibold">{heading}</h2>
        <p className="print-meta">
          {open.length} items ·{' '}
          {new Date().toLocaleDateString(undefined, {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })}
        </p>
      </div>

      <div className="no-print flex items-center gap-1.5">
        <button
          onClick={() => setCombined(false)}
          aria-pressed={!combined}
          className={tab(!combined)}
        >
          By recipe
        </button>
        <button
          onClick={() => setCombined(true)}
          aria-pressed={combined}
          className={tab(combined)}
        >
          Combined
        </button>

        <button
          onClick={() => window.print()}
          className="text-ink-soft hover:text-ink ml-auto rounded-full px-2.5 py-1.5 text-sm"
        >
          Print
        </button>
        <CopyButton items={items} combined={combined} />
      </div>

      <div className="print-columns">
        {combined ? <CombinedView items={items} /> : <ByRecipeView open={open} />}
      </div>

      {!combined && done.length ? <DoneSection done={done} /> : null}
    </div>
  )
}

/**
 * Copies the list as plain text.
 *
 * No grocery service has a public "add these to my cart" API, so the practical
 * route into any of them — Walmart, Instacart, a notes app, a text message — is
 * still a list you can paste.
 */
function CopyButton({ items, combined }: { items: Item[]; combined: boolean }) {
  const [copied, setCopied] = useState(false)

  function asText() {
    const outstanding = items.filter((i) => !i.checked)
    if (!combined) return outstanding.map((i) => i.text).join('\n')
    return combineIngredients(items)
      .filter((l) => l.parts.some((p) => !p.checked))
      .map((l) => (l.amount ? `${l.amount} ${l.name}` : l.name))
      .join('\n')
  }

  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(asText())
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
        } catch {
          // Clipboard access can be refused; the print view still works.
        }
      }}
      className="text-ink-soft hover:text-ink rounded-full px-2.5 py-1.5 text-sm"
    >
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

function tab(active: boolean) {
  return active
    ? 'bg-accent rounded-full px-3 py-1.5 text-sm font-medium text-white'
    : 'bg-raised border-rule text-ink-soft rounded-full border px-3 py-1.5 text-sm'
}

function ByRecipeView({ open }: { open: Item[] }) {
  const groups = new Map<string, Item[]>()
  for (const item of open) {
    const key = item.sourceLabel ?? 'Other'
    groups.set(key, [...(groups.get(key) ?? []), item])
  }
  const ordered = [...groups.entries()].sort(([a], [b]) =>
    a === 'Other' ? 1 : b === 'Other' ? -1 : a.localeCompare(b),
  )

  return (
    <>
      {ordered.map(([label, groupItems]) => (
        <section key={label} className="space-y-1">
          <h2 className="text-ink-faint text-[11px] font-medium uppercase tracking-wide">
            {label}
          </h2>
          <ul>
            {groupItems.map((item) => (
              <GroceryRow key={item.id} item={item} />
            ))}
          </ul>
        </section>
      ))}
    </>
  )
}

function CombinedView({ items }: { items: Item[] }) {
  const lines = useMemo(() => combineIngredients(items), [items])
  const outstanding = lines.filter((l) => l.parts.some((p) => !p.checked))
  const cleared = lines.filter((l) => l.parts.every((p) => p.checked))

  return (
    <div className="space-y-1">
      {outstanding.map((line) => (
        <CombinedRow key={line.parts[0].id} line={line} />
      ))}
      {cleared.length ? (
        <div className="border-rule mt-4 space-y-1 border-t pt-4">
          <h2 className="text-ink-faint text-[11px] font-medium uppercase tracking-wide">
            Got it ({cleared.length})
          </h2>
          {cleared.map((line) => (
            <CombinedRow key={line.parts[0].id} line={line} />
          ))}
        </div>
      ) : null}
    </div>
  )
}

function CombinedRow({
  line,
}: {
  line: ReturnType<typeof combineIngredients>[number]
}) {
  const [, startTransition] = useTransition()
  const allChecked = line.parts.every((p) => p.checked)
  const [checked, setChecked] = useOptimistic(allChecked)

  // One ingredient can come from several meals; name each one once.
  const meals = [...new Set(line.parts.map((p) => p.sourceLabel).filter(Boolean))] as string[]

  return (
    <div className="border-rule flex items-start gap-3 border-b py-2.5">
      <button
        onClick={() =>
          startTransition(async () => {
            setChecked(!checked)
            await setGroceryItemsChecked(
              line.parts.map((p) => p.id),
              !checked,
            )
          })
        }
        aria-pressed={checked}
        aria-label={`${checked ? 'Uncheck' : 'Check off'} ${line.name}`}
        className={
          checked
            ? 'bg-accent print-box mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md text-[11px] text-white'
            : 'border-rule print-box mt-0.5 size-5 shrink-0 rounded-md border'
        }
      >
        {checked ? '✓' : ''}
      </button>

      <div className={checked ? 'struck min-w-0 flex-1' : 'min-w-0 flex-1'}>
        <span className="text-[15px]">
          {line.amount ? <strong className="font-medium">{line.amount} </strong> : null}
          {line.name}
        </span>
        {line.partial ? (
          <span
            className="text-warn ml-1.5 text-[11px]"
            title="Some lines had no amount, so they aren't in this total"
          >
            +more
          </span>
        ) : null}
        {line.parts.length > 1 ? (
          <span className="text-ink-faint block text-[11px]">
            {line.parts.map((p) => p.text).join(' + ')}
          </span>
        ) : null}
      </div>

      {meals.length ? (
        <span className="text-ink-faint print-meta shrink-0 text-right text-[11px] leading-tight">
          {meals.join(', ')}
        </span>
      ) : null}
    </div>
  )
}

function DoneSection({ done }: { done: Item[] }) {
  return (
    <section className="border-rule space-y-1 border-t pt-4">
      <h2 className="text-ink-faint text-[11px] font-medium uppercase tracking-wide">
        Got it ({done.length})
      </h2>
      <ul>
        {done.map((item) => (
          <GroceryRow key={item.id} item={item} />
        ))}
      </ul>
    </section>
  )
}
