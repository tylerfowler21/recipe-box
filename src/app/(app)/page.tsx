import Link from 'next/link'
import { listRecipes, getAllTags, getCounts, type RecipeCard } from '@/lib/queries'
import { SearchBar } from '@/components/SearchBar'
import { TagFilter } from '@/components/TagFilter'
import { RecipeGrid } from '@/components/RecipeGrid'
import { ViewSwitch } from '@/components/ViewSwitch'
import { GroupSwitch } from '@/components/GroupSwitch'

function asArray(v: string | string[] | undefined) {
  if (!v) return []
  return Array.isArray(v) ? v : [v]
}

/** Courses in the order they'd be eaten, so the page reads like a menu. */
const COURSE_ORDER = [
  'Breakfast',
  'Main Dish',
  'Side',
  'Salad',
  'Soup',
  'Sauce',
  'Bread',
  'Snack',
  'Drink',
  'Dessert',
]

/**
 * Splits the list under course headings.
 *
 * A recipe with two course tags (Breakfast + Snack) appears under the first in
 * menu order rather than twice — a shopping-style list that repeats entries
 * makes the count at the top a lie.
 */
function groupByCourse(recipes: RecipeCard[]) {
  const groups = new Map<string, RecipeCard[]>()
  for (const recipe of recipes) {
    const courses = recipe.tags
      .filter((t) => t.tag.kind === 'course')
      .map((t) => t.tag.name)
    const best =
      COURSE_ORDER.find((name) => courses.includes(name)) ?? courses[0] ?? 'Everything else'
    groups.set(best, [...(groups.get(best) ?? []), recipe])
  }

  return [...groups.entries()].sort(([a], [b]) => {
    const ai = COURSE_ORDER.indexOf(a)
    const bi = COURSE_ORDER.indexOf(b)
    if (ai === -1 && bi === -1) return a.localeCompare(b)
    if (ai === -1) return 1
    if (bi === -1) return -1
    return ai - bi
  })
}

export default async function RecipesPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string
    tag?: string | string[]
    sort?: string
    show?: string
    group?: string
  }>
}) {
  const sp = await searchParams
  const tags = asArray(sp.tag)
  const sort = sp.sort === 'newest' ? 'newest' : 'title'
  const grouped = sp.group === 'course'

  const [recipes, allTags, counts] = await Promise.all([
    listRecipes({
      q: sp.q,
      tags,
      sort,
      onlyFavorites: sp.show === 'favorites',
      onlyNeedsReview: sp.show === 'review',
    }),
    getAllTags(),
    getCounts(),
  ])

  const filtered = Boolean(sp.q || tags.length || sp.show)
  const heading =
    sp.show === 'favorites'
      ? 'Favourites'
      : sp.show === 'review'
        ? 'Still to finish'
        : 'recipes'

  return (
    <div>
      {/* The count is the headline: it says how big the box is at a glance. */}
      <header className="pb-1 pt-1">
        {sp.show ? (
          <h1 className="font-display text-[40px] font-light leading-[0.95] tracking-[-0.02em]">
            {heading}
          </h1>
        ) : (
          <h1 className="font-display text-[40px] font-light leading-[0.95] tracking-[-0.02em]">
            {recipes.length}{' '}
            <span className="text-ink-faint">
              {recipes.length === 1 ? 'recipe' : 'recipes'}
            </span>
          </h1>
        )}
        {filtered && !sp.show ? (
          <p className="text-ink-ghost mt-2 text-xs">of {counts.total} in the box</p>
        ) : null}
      </header>

      <div className="mt-5">
        <ViewSwitch current="recipes" />
      </div>

      <div className="mt-5">
        <SearchBar />
      </div>

      <div className="mt-5">
        <TagFilter tags={allTags} selected={tags} counts={counts} />
      </div>

      <div className="mt-4">
        <GroupSwitch grouped={grouped} />
      </div>

      <div className="mt-5">
        {recipes.length === 0 ? (
          <div className="border-rule rounded-[14px] border border-dashed px-6 py-12 text-center">
            <p className="text-ink-soft">
              {filtered ? 'Nothing matches those filters.' : 'No recipes yet.'}
            </p>
            {filtered ? (
              <Link href="/" className="text-accent mt-2 inline-block text-sm font-medium">
                Clear filters
              </Link>
            ) : (
              <Link
                href="/recipes/new"
                className="text-accent mt-2 inline-block text-sm font-medium"
              >
                Add the first one
              </Link>
            )}
          </div>
        ) : grouped ? (
          <div className="space-y-9">
            {groupByCourse(recipes).map(([course, inCourse]) => (
              <section key={course}>
                <div className="flex items-baseline gap-3">
                  <h2 className="font-display text-[26px] font-normal leading-none tracking-[-0.015em]">
                    {course}
                  </h2>
                  <span className="text-ink-ghost text-xs">
                    {inCourse.length} recipe{inCourse.length === 1 ? '' : 's'}
                  </span>
                </div>
                <div className="mt-3">
                  <RecipeGrid recipes={inCourse} />
                </div>
              </section>
            ))}
          </div>
        ) : (
          <RecipeGrid recipes={recipes} />
        )}
      </div>
    </div>
  )
}
