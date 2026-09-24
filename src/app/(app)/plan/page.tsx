import Link from 'next/link'
import { getWeekPlan, getRecipeTitles, getMealTitles, weekStart } from '@/lib/queries'
import { addWeekToGroceryList } from '@/lib/actions'
import { PlanDay } from '@/components/PlanDay'

export const metadata = { title: 'Meal plan — Recipe Box' }

const DAY_FMT = new Intl.DateTimeFormat('en-GB', {
  weekday: 'long',
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
})
// The rail shows a big date and a short weekday, so meals align down the page.
const WEEKDAY_FMT = new Intl.DateTimeFormat('en-GB', { weekday: 'short', timeZone: 'UTC' })
const ISO = (d: Date) => d.toISOString().slice(0, 10)

export default async function PlanPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>
}) {
  const { week } = await searchParams
  const anchor = week && /^\d{4}-\d{2}-\d{2}$/.test(week) ? new Date(`${week}T00:00:00Z`) : new Date()
  const start = weekStart(anchor)

  const [entries, recipes, meals] = await Promise.all([
    getWeekPlan(start),
    getRecipeTitles(),
    getMealTitles(),
  ])

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
      <div className="flex flex-wrap items-end gap-3">
        <h1 className="font-display text-[40px] font-light leading-[0.95] tracking-[-0.02em]">
          This week
        </h1>
        <div className="text-ink-faint ml-auto flex items-center gap-1 pb-1.5 text-sm">
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
            className="text-accent hover:text-ink text-[13px] font-medium underline decoration-dotted underline-offset-4"
          >
            Shop this week&rsquo;s ingredients
          </button>
        </form>
      ) : null}

      <div>
        {days.map((day) => (
          <PlanDay
            key={ISO(day)}
            date={ISO(day)}
            label={DAY_FMT.format(day)}
            dayNumber={day.getUTCDate()}
            weekday={WEEKDAY_FMT.format(day)}
            isToday={ISO(day) === today}
            entries={entries.filter((e) => ISO(e.date) === ISO(day))}
            recipes={recipes}
            meals={meals}
          />
        ))}
      </div>
    </div>
  )
}
