import Link from 'next/link'
import { listRecipes, getAllTags, getCounts } from '@/lib/queries'
import { SearchBar } from '@/components/SearchBar'
import { TagFilter } from '@/components/TagFilter'
import { RecipeGrid } from '@/components/RecipeGrid'
import { ViewSwitch } from '@/components/ViewSwitch'

function asArray(v: string | string[] | undefined) {
  if (!v) return []
  return Array.isArray(v) ? v : [v]
}

export default async function RecipesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tag?: string | string[]; sort?: string; show?: string }>
}) {
  const sp = await searchParams
  const tags = asArray(sp.tag)
  const sort = sp.sort === 'newest' ? 'newest' : 'title'

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

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          {sp.show === 'favorites'
            ? 'Favourites'
            : sp.show === 'review'
              ? 'Needs a look'
              : 'All recipes'}
        </h1>
        <p className="text-ink-faint text-sm">
          {recipes.length} of {counts.total}
        </p>
      </div>

      <ViewSwitch current="recipes" />

      <SearchBar />

      <TagFilter tags={allTags} selected={tags} counts={counts} />

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
            <Link href="/recipes/new" className="text-accent mt-2 inline-block text-sm font-medium">
              Add the first one
            </Link>
          )}
        </div>
      ) : (
        <RecipeGrid recipes={recipes} />
      )}
    </div>
  )
}
