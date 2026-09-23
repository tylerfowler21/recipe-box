import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getMealBySlug } from '@/lib/queries'
import { addMealToGroceryList } from '@/lib/actions'
import { formatTotalTime } from '@/lib/recipes'
import { MealActions } from '@/components/MealActions'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const meal = await getMealBySlug(slug)
  return { title: meal ? `${meal.name} — Recipe Box` : 'Recipe Box' }
}

export default async function MealPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const meal = await getMealBySlug(slug)
  if (!meal) notFound()

  const toGrocery = addMealToGroceryList.bind(null, meal.id)
  const totalIngredients = meal.recipes.reduce((n, l) => n + l.recipe._count.ingredients, 0)

  return (
    <article className="space-y-6">
      <Link href="/meals" className="text-ink-soft hover:text-ink no-print inline-block text-sm">
        ← All meals
      </Link>

      {meal.photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={meal.photoUrl}
          alt={meal.name}
          className="max-h-72 w-full rounded-[14px] object-cover"
        />
      ) : null}

      <header className="space-y-3">
        <h1 className="font-display text-3xl font-semibold leading-tight tracking-tight">
          {meal.name}
        </h1>
        {meal.description ? (
          <p className="text-ink-soft text-[15px]">{meal.description}</p>
        ) : null}
        <p className="text-ink-faint text-sm">
          {meal.recipes.length} recipe{meal.recipes.length === 1 ? '' : 's'} ·{' '}
          {totalIngredients} ingredients in total
        </p>
        <MealActions slug={meal.slug} addToGroceryAction={toGrocery} />
      </header>

      <section className="space-y-2.5">
        {meal.recipes.map((link, index) => {
          const time = formatTotalTime(link.recipe.prepMinutes, link.recipe.cookMinutes)
          return (
            <Link
              key={link.recipeId}
              href={`/recipes/${link.recipe.slug}`}
              className="bg-raised border-rule hover:border-accent/50 flex items-center gap-3 rounded-[14px] border p-3.5 transition-colors"
            >
              <span className="text-ink-faint w-4 shrink-0 text-sm">{index + 1}</span>
              {link.recipe.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={link.recipe.photoUrl}
                  alt=""
                  className="size-12 shrink-0 rounded-[8px] object-cover"
                />
              ) : null}
              <span className="min-w-0 flex-1">
                <span className="font-display block text-[16px] font-semibold leading-snug">
                  {link.recipe.title}
                </span>
                <span className="text-ink-faint block text-xs">
                  {time ? `${time} · ` : ''}
                  {link.recipe._count.ingredients} ingredients
                </span>
              </span>
              <span className="text-ink-faint shrink-0 text-sm" aria-hidden>
                ›
              </span>
            </Link>
          )
        })}
      </section>
    </article>
  )
}
