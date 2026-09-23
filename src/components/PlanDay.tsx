'use client'

import Link from 'next/link'
import { useRef, useState, useTransition } from 'react'
import { planMeal, unplanMeal } from '@/lib/actions'
import type { PlanEntry } from '@/lib/queries'
import { MEAL_SLOTS, slotRank, type MealSlot } from '@/lib/meal-slots'

export function PlanDay({
  date,
  label,
  isToday,
  entries,
  recipes,
}: {
  date: string
  label: string
  isToday: boolean
  entries: PlanEntry[]
  recipes: { id: string; title: string; slug: string }[]
}) {
  const [adding, setAdding] = useState(false)
  // Kept across submissions so adding a dressing straight after the salad
  // doesn't mean re-picking "Dinner" every time.
  const [slot, setSlot] = useState<MealSlot>('dinner')
  const [justAdded, setJustAdded] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)

  // One meal can be several recipes — a main and its dressing, a roast and its
  // sides — so entries are grouped under a single slot heading rather than
  // repeating "Dinner" down the day.
  const bySlot = new Map<string, PlanEntry[]>()
  for (const entry of entries) {
    bySlot.set(entry.slot, [...(bySlot.get(entry.slot) ?? []), entry])
  }
  const grouped = [...bySlot.entries()].sort(([a], [b]) => slotRank(a) - slotRank(b))

  const labelFor = (value: string) =>
    MEAL_SLOTS.find((s) => s.value === value)?.label ?? value

  return (
    <section
      className={
        isToday
          ? 'border-accent bg-raised rounded-[14px] border p-3.5'
          : 'border-rule bg-raised rounded-[14px] border p-3.5'
      }
    >
      <div className="flex items-center gap-2">
        <h2 className="text-[15px] font-medium">
          {label}
          {isToday ? <span className="text-accent ml-2 text-xs">today</span> : null}
        </h2>
        <button
          onClick={() => setAdding((a) => !a)}
          className="text-ink-faint hover:text-ink ml-auto text-sm"
          aria-label={`Add a meal to ${label}`}
        >
          {adding ? 'Close' : '+ Add'}
        </button>
      </div>

      {grouped.length ? (
        <div className="mt-2.5 space-y-2.5">
          {grouped.map(([slotValue, slotEntries]) => (
            <div key={slotValue} className="flex gap-2">
              <span className="text-ink-faint w-16 shrink-0 pt-0.5 text-xs">
                {labelFor(slotValue)}
              </span>
              <ul className="min-w-0 flex-1 space-y-1">
                {slotEntries.map((entry) => (
                  <li key={entry.id} className="flex items-start gap-2 text-[15px]">
                    {entry.recipe ? (
                      // A dotted underline that is always present, because
                      // hover-only affordances tell a phone user nothing.
                      <Link
                        href={`/recipes/${entry.recipe.slug}`}
                        className="decoration-ink-faint hover:decoration-accent hover:text-accent min-w-0 flex-1 py-0.5 underline decoration-dotted underline-offset-4 transition-colors"
                      >
                        {entry.recipe.title}
                      </Link>
                    ) : (
                      <span className="text-ink-soft min-w-0 flex-1 italic">{entry.noteText}</span>
                    )}
                    <button
                      onClick={() => startTransition(() => unplanMeal(entry.id))}
                      className="text-ink-faint hover:text-warn shrink-0 text-sm leading-tight"
                      aria-label={`Remove ${entry.recipe?.title ?? entry.noteText} from ${labelFor(slotValue)}`}
                    >
                      ×
                    </button>
                  </li>
                ))}
                {slotEntries.length > 1 ? (
                  <li className="text-ink-faint text-[11px]">
                    {slotEntries.length} things in this meal
                  </li>
                ) : null}
              </ul>
            </div>
          ))}
        </div>
      ) : null}

      {adding ? (
        <form
          ref={formRef}
          onSubmit={(event) => {
            // Submitted by hand rather than via the `action` prop: React resets
            // a form automatically once its action resolves, and that DOM reset
            // knocks the controlled slot <select> back to its first option
            // without React's state changing — so the next add silently landed
            // in breakfast. Owning the submit means owning what gets cleared.
            event.preventDefault()
            const form = event.currentTarget
            const formData = new FormData(form)
            const picked = recipes.find((r) => r.id === formData.get('recipeId'))
            const note = String(formData.get('noteText') ?? '').trim()
            if (!picked && !note) return

            startTransition(async () => {
              await planMeal(formData)
              setJustAdded(picked?.title ?? note)
              const recipeSelect = form.elements.namedItem('recipeId') as HTMLSelectElement | null
              const noteInput = form.elements.namedItem('noteText') as HTMLInputElement | null
              if (recipeSelect) recipeSelect.value = ''
              if (noteInput) noteInput.value = ''
            })
          }}
          className="mt-3 space-y-2"
        >
          <input type="hidden" name="date" value={date} />
          <div className="flex flex-wrap gap-2">
            <select
              name="slot"
              value={slot}
              onChange={(e) => setSlot(e.target.value as MealSlot)}
              className="field w-auto flex-none text-sm"
            >
              {MEAL_SLOTS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select name="recipeId" className="field min-w-0 flex-1 text-sm" defaultValue="">
              <option value="">— pick a recipe —</option>
              {recipes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.title}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <input
              name="noteText"
              placeholder="…or type something (leftovers, eat out)"
              className="field flex-1 text-sm"
            />
            <button
              type="submit"
              disabled={pending}
              className="bg-accent shrink-0 rounded-[10px] px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {pending ? 'Adding…' : 'Add'}
            </button>
          </div>
          <p className="text-ink-faint text-[11px]">
            {justAdded
              ? `Added ${justAdded} to ${labelFor(slot)}. Add another for the same meal, or Close.`
              : `Add as many as the meal needs — a main and its dressing both go under ${labelFor(slot)}.`}
          </p>
        </form>
      ) : null}
    </section>
  )
}
