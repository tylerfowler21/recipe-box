'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { planMeal, unplanMeal } from '@/lib/actions'
import type { PlanEntry } from '@/lib/queries'

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
  const [, startTransition] = useTransition()

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

      {entries.length ? (
        <ul className="mt-2.5 space-y-1.5">
          {entries.map((entry) => (
            <li key={entry.id} className="flex items-center gap-2 text-[15px]">
              <span className="text-ink-faint w-16 shrink-0 text-xs capitalize">{entry.slot}</span>
              {entry.recipe ? (
                <Link href={`/recipes/${entry.recipe.slug}`} className="flex-1 hover:underline">
                  {entry.recipe.title}
                </Link>
              ) : (
                <span className="text-ink-soft flex-1 italic">{entry.noteText}</span>
              )}
              <button
                onClick={() => startTransition(() => unplanMeal(entry.id))}
                className="text-ink-faint hover:text-warn shrink-0 text-sm"
                aria-label="Remove from plan"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {adding ? (
        <form
          action={async (formData) => {
            await planMeal(formData)
            setAdding(false)
          }}
          className="mt-3 space-y-2"
        >
          <input type="hidden" name="date" value={date} />
          <div className="flex flex-wrap gap-2">
            <select name="slot" className="field w-auto flex-none text-sm" defaultValue="dinner">
              <option value="breakfast">Breakfast</option>
              <option value="lunch">Lunch</option>
              <option value="dinner">Dinner</option>
              <option value="other">Other</option>
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
              className="bg-accent shrink-0 rounded-[10px] px-3 py-2 text-sm font-medium text-white"
            >
              Add
            </button>
          </div>
        </form>
      ) : null}
    </section>
  )
}
