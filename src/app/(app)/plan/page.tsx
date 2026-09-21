import Link from 'next/link'
import { getWeekPlan, getRecipeTitles, weekStart } from '@/lib/queries'
import { addWeekToGroceryList } from '@/lib/actions'
import { PlanDay } from '@/components/PlanDay'

export const metadata = { title: 'Meal plan — Recipe Box' }

const DAY_FMT = new Intl.DateTimeFormat('en-GB', {
  weekday: 'long',
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
})
const ISO = (d: Date) => d.toISOString().slice(0, 10)

export default async function PlanPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>
}) {
  const { week } = await searchParams
  const anchor = week && /^\d{4}-\d{2}-\d{2}$/.test(week) ? new Date(`${week}T00:00:00Z`) : new Date()
  const start = weekStart(anchor)

  const [entries, recipes] = await Promise.all([getWeekPlan(start), getRecipeTitles()])

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start)
    d.setUTCDate(d.getUTCDate() + i)
    return d
  })

  const prev = new Date(start)
  prev.setUTCDate(prev.getUTCDate() - 7)
  const next = new Date(start)
  next.setUTCDate(next.getUTCDate() + 7)
  const today = ISO(new Date())

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-2xl font-semibold tracking-tight">This week</h1>
        <div className="text-ink-soft ml-auto flex items-center gap-1 text-sm">
          <Link href={`/plan?week=${ISO(prev)}`} className="rounded-full px-2.5 py-1.5">
            ←
          </Link>
          <Link href="/plan" className="rounded-full px-2.5 py-1.5">
            Today
          </Link>
          <Link href={`/plan?week=${ISO(next)}`} className="rounded-full px-2.5 py-1.5">
            →
          </Link>
        </div>
      </div>

      {entries.some((e) => e.recipeId) ? (
        <form action={addWeekToGroceryList}>
          <input type="hidden" name="start" value={ISO(start)} />
          <button
            type="submit"
            className="bg-accent-soft text-accent rounded-full px-3 py-1.5 text-sm font-medium"
          >
            Add this week&rsquo;s ingredients to the grocery list
          </button>
        </form>
      ) : null}

      <div className="space-y-2.5">
        {days.map((day) => (
          <PlanDay
            key={ISO(day)}
            date={ISO(day)}
            label={DAY_FMT.format(day)}
            isToday={ISO(day) === today}
            entries={entries.filter((e) => ISO(e.date) === ISO(day))}
            recipes={recipes}
          />
        ))}
      </div>
    </div>
  )
}
