import Link from 'next/link'

/**
 * Switches the landing page between the recipe library and saved meals.
 *
 * Two routes rather than one with a query parameter, so each view keeps its own
 * URL, its own filters and its own back-button history.
 */
export function ViewSwitch({ current }: { current: 'recipes' | 'meals' }) {
  const base = 'rounded-full px-3.5 py-1.5 text-[13px] transition-colors'
  const on = `bg-ink text-paper font-medium ${base}`
  const off = `border-rule-strong text-ink-soft hover:border-ink border ${base}`

  return (
    <div className="no-print flex items-center gap-1.5">
      <Link href="/" className={current === 'recipes' ? on : off}>
        Recipes
      </Link>
      <Link href="/meals" className={current === 'meals' ? on : off}>
        Meals
      </Link>
      {current === 'meals' ? (
        <Link href="/meals/new" className="text-accent ml-auto text-sm font-medium">
          + Build a meal
        </Link>
      ) : null}
    </div>
  )
}
