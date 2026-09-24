'use client'

import Link from 'next/link'
import { useRef, useState, useTransition } from 'react'
import { planMeal, planWholeMeal, unplanMeal } from '@/lib/actions'
import type { PlanEntry } from '@/lib/queries'
import { MEAL_SLOTS, slotRank, type MealSlot } from '@/lib/meal-slots'

export function PlanDay({
  date,
  label,
  dayNumber,
  weekday,
  isToday,
  entries,
  recipes,
  meals,
}: {
  date: string
  label: string
  dayNumber: number
  weekday: string
  isToday: boolean
  entries: PlanEntry[]
  recipes: { id: string; title: string; slug: string }[]
  meals: { id: string; name: string; slug: string; _count: { recipes: number } }[]
}) {
  const [adding, setAdding] = useState(false)
  // Kept across submissions so adding a dressing straight after the salad
  // doesn't mean re-picking "Dinner" every time.
  const [slot, setSlot] = useState<MealSlot>('dinner')
  const [justAdded, setJustAdded] = useState<string | null>(null)
  const [mealId, setMealId] = useState('')

  const remove = (id: string) => startTransition(() => unplanMeal(id))
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
          ? 'flex gap-4 border-t-2 border-ink py-3.5'
          : 'border-rule flex gap-4 border-t py-3.5'
      }
    >
      {/* Date rail: the day recedes so the meals read as the content. */}
      <div className="w-10 shrink-0">
        <div
          className={
            isToday
              ? 'font-display text-ink text-[22px] leading-none'
              : 'font-display text-ink-ghost text-[22px] leading-none'
          }
        >
          {dayNumber}
        </div>
        <div
          className={
            isToday
              ? 'text-ink mt-1 text-[10px] font-medium uppercase tracking-[0.06em]'
              : 'text-ink-ghost mt-1 text-[10px] uppercase tracking-[0.06em]'
          }
        >
          {isToday ? 'Today' : weekday}
        </div>
      </div>

      <div className="min-w-0 flex-1">
        {grouped.map(([slotValue, slotEntries]) => (
          <div key={slotValue} className="mb-3 last:mb-0">
            <div className="text-ink-ghost text-[10px] uppercase tracking-[0.1em]">
              {labelFor(slotValue)}
            </div>
            <div className="mt-1 space-y-1">
              {groupIntoMeals(slotEntries).map((block) =>
                block.meal ? (
                  // A saved meal is bracketed so its parts read as one dinner.
                  <div key={block.key} className="flex gap-2.5 py-0.5">
                    <div className="bg-accent w-0.5 shrink-0 rounded-sm" />
                    <div className="min-w-0 flex-1">
                      <div className="text-accent text-[10px] font-medium uppercase tracking-[0.06em]">
                        {block.meal.name}
                      </div>
                      {block.entries.map((entry) => (
                        <EntryRow key={entry.id} entry={entry} onRemove={remove} />
                      ))}
                    </div>
                  </div>
                ) : (
                  block.entries.map((entry) => (
                    <EntryRow key={entry.id} entry={entry} onRemove={remove} />
                  ))
                ),
              )}
            </div>
          </div>
        ))}

        <button
          onClick={() => setAdding((a) => !a)}
          className="text-ink-faint hover:text-ink text-[13px]"
          aria-label={`Add a meal to ${label}`}
        >
          {adding ? 'Close' : entries.length ? '+ Add' : '+ Add a meal'}
        </button>

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

          {meals.length ? (
            <div className="flex gap-2">
              <select
                value={mealId}
                onChange={(e) => setMealId(e.target.value)}
                aria-label="Add a whole meal"
                className="field min-w-0 flex-1 text-sm"
              >
                <option value="">— or a whole meal —</option>
                {meals.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m._count.recipes})
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={!mealId || pending}
                onClick={() => {
                  const meal = meals.find((m) => m.id === mealId)
                  if (!meal) return
                  const data = new FormData()
                  data.set('date', date)
                  data.set('slot', slot)
                  data.set('mealId', mealId)
                  startTransition(async () => {
                    await planWholeMeal(data)
                    setJustAdded(`${meal.name} (${meal._count.recipes} recipes)`)
                    setMealId('')
                  })
                }}
                className="bg-accent shrink-0 rounded-[10px] px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                Add meal
              </button>
            </div>
          ) : null}
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
      </div>
    </section>
  )
}

/** One planned recipe or note, with its remove control. */
function EntryRow({
  entry,
  onRemove,
}: {
  entry: PlanEntry
  onRemove: (id: string) => void
}) {
  return (
    <div className="flex items-start gap-2">
      {entry.recipe ? (
        <Link
          href={`/recipes/${entry.recipe.slug}`}
          className="font-display decoration-ink-ghost hover:decoration-accent hover:text-accent min-w-0 flex-1 text-[17px] leading-[1.2] underline decoration-dotted underline-offset-4 transition-colors"
        >
          {entry.recipe.title}
        </Link>
      ) : (
        <span className="text-ink-soft min-w-0 flex-1 text-[15px] italic">{entry.noteText}</span>
      )}
      <button
        onClick={() => onRemove(entry.id)}
        className="text-ink-ghost hover:text-warn shrink-0 text-sm leading-tight"
        aria-label={`Remove ${entry.recipe?.title ?? entry.noteText} from the plan`}
      >
        ×
      </button>
    </div>
  )
}

/**
 * Splits one slot's entries into blocks: each saved meal becomes one block,
 * everything else stands alone. Consecutive entries of the same meal stay
 * together so the bracket is unbroken.
 */
function groupIntoMeals(entries: PlanEntry[]) {
  const blocks: { key: string; meal: PlanEntry['meal']; entries: PlanEntry[] }[] = []
  for (const entry of entries) {
    const last = blocks[blocks.length - 1]
    if (entry.mealId && last && last.meal?.id === entry.mealId) {
      last.entries.push(entry)
    } else {
      blocks.push({ key: entry.id, meal: entry.mealId ? entry.meal : null, entries: [entry] })
    }
  }
  return blocks
}
