import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getRecipeBySlug, getShareLinks } from '@/lib/queries'
import { groupBySection, formatTotalTime } from '@/lib/recipes'
import {
  toggleFavorite,
  addRecipeToGroceryList,
  createShareLink,
  revokeShareLink,
} from '@/lib/actions'
import { StepList } from '@/components/StepList'
import { IngredientList } from '@/components/IngredientList'
import { RecipeActions } from '@/components/RecipeActions'
import { ShareLinks } from '@/components/ShareLinks'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const recipe = await getRecipeBySlug(slug)
  return { title: recipe ? `${recipe.title} — Recipe Box` : 'Recipe Box' }
}

export default async function RecipePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const recipe = await getRecipeBySlug(slug)
  if (!recipe) notFound()

  const time = formatTotalTime(recipe.prepMinutes, recipe.cookMinutes)
  const ingredientSections = groupBySection(recipe.ingredients)
  const stepSections = groupBySection(recipe.steps)

  const favorite = toggleFavorite.bind(null, recipe.id)
  const toGrocery = addRecipeToGroceryList.bind(null, recipe.id)
  const share = createShareLink.bind(null, recipe.id)
  const links = await getShareLinks(recipe.id)

  return (
    <article>
      <Link href="/" className="text-ink-faint hover:text-ink no-print inline-block text-[13px]">
        ← Recipes
      </Link>

      {/* The title leads, not the photo — most recipes here don't have one. */}
      <header className="mt-4 space-y-3">
        <h1 className="font-display text-[34px] font-normal leading-[1.02] tracking-[-0.02em]">
          {recipe.title}
        </h1>

        {recipe.description ? (
          <p className="text-ink-soft text-[15px] leading-relaxed">{recipe.description}</p>
        ) : null}

        <div className="text-ink-faint flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          <span>
            {recipe.ingredients.length} ingredient
            {recipe.ingredients.length === 1 ? '' : 's'}
          </span>
          {time ? (
            <>
              <span aria-hidden>·</span>
              <span>{time}</span>
            </>
          ) : null}
          {recipe.servings ? (
            <>
              <span aria-hidden>·</span>
              <span>serves {recipe.servings}</span>
            </>
          ) : null}
          {recipe.source ? <span aria-hidden>·</span> : null}
          {recipe.source ? (
            recipe.sourceUrl ? (
              <a
                href={recipe.sourceUrl}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="hover:text-ink underline decoration-dotted underline-offset-2"
              >
                from {recipe.source} ↗
              </a>
            ) : (
              <span>from {recipe.source}</span>
            )
          ) : null}
        </div>

        {recipe.tags.length ? (
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {recipe.tags.map(({ tag }) => (
              <Link
                key={tag.slug}
                href={`/?tag=${tag.slug}`}
                className="text-accent text-xs hover:underline"
              >
                {tag.name}
              </Link>
            ))}
          </div>
        ) : null}

        {recipe.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={recipe.photoUrl}
            alt={recipe.title}
            className="max-h-72 w-full rounded-[6px] object-cover"
          />
        ) : null}

        <div className="no-print flex flex-wrap items-center gap-2 pt-1">
          <RecipeActions
            slug={recipe.slug}
            isFavorite={recipe.isFavorite}
            toggleFavoriteAction={favorite}
            addToGroceryAction={toGrocery}
          />
          <ShareLinks links={links} createAction={share} revokeAction={revokeShareLink} />
        </div>
      </header>

      {recipe.needsReview ? (
        <p className="border-warn/40 text-warn no-print mt-6 border-l-2 py-1 pl-4 text-sm">
          This one came over from the recipe book missing{' '}
          {recipe.ingredients.length === 0 ? 'its ingredients' : 'its instructions'}.{' '}
          <Link href={`/recipes/${recipe.slug}/edit`} className="font-medium underline">
            Fill it in
          </Link>
          .
        </p>
      ) : null}

      <div className="mt-8 grid gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
        <section>
          <h2 className="text-ink-ghost mb-3 text-[10px] font-medium uppercase tracking-[0.12em]">
            Ingredients
          </h2>
          {recipe.ingredients.length === 0 ? (
            <p className="text-ink-faint text-sm">Not recorded yet.</p>
          ) : (
            <IngredientList sections={ingredientSections} servings={recipe.servings} />
          )}
        </section>

        <section>
          <h2 className="text-ink-ghost mb-3 text-[10px] font-medium uppercase tracking-[0.12em]">
            Method
          </h2>
          {recipe.steps.length === 0 ? (
            <p className="text-ink-faint text-sm">
              Not recorded yet —{' '}
              <Link href={`/recipes/${recipe.slug}/edit`} className="text-accent underline">
                add them
              </Link>
              .
            </p>
          ) : (
            <StepList sections={stepSections} />
          )}
        </section>
      </div>

      {recipe.notes ? (
        <section className="border-rule mt-10 border-t pt-5">
          <h2 className="text-ink-ghost mb-2 text-[10px] font-medium uppercase tracking-[0.12em]">
            Notes
          </h2>
          <p className="text-ink-soft whitespace-pre-wrap text-[15px]">{recipe.notes}</p>
        </section>
      ) : null}
    </article>
  )
}
