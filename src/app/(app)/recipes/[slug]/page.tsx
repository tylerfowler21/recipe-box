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
    <article className="space-y-6">
      <Link href="/" className="text-ink-soft hover:text-ink no-print inline-block text-sm">
        ← All recipes
      </Link>

      {recipe.photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={recipe.photoUrl}
          alt={recipe.title}
          className="max-h-80 w-full rounded-[14px] object-cover"
        />
      ) : null}

      <header className="space-y-3">
        <h1 className="font-display text-3xl font-semibold leading-tight tracking-tight">
          {recipe.title}
        </h1>

        {recipe.description ? (
          <p className="text-ink-soft text-[15px]">{recipe.description}</p>
        ) : null}

        <div className="text-ink-faint flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          {time ? <span>{time}</span> : null}
          {recipe.servings ? <span>Serves {recipe.servings}</span> : null}
          {recipe.source ? (
            recipe.sourceUrl ? (
              <a
                href={recipe.sourceUrl}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="hover:text-ink underline"
              >
                from {recipe.source} ↗
              </a>
            ) : (
              <span>from {recipe.source}</span>
            )
          ) : null}
        </div>

        {recipe.tags.length ? (
          <div className="flex flex-wrap gap-1.5">
            {recipe.tags.map(({ tag }) => (
              <Link
                key={tag.slug}
                href={`/?tag=${tag.slug}`}
                className="bg-accent-soft text-accent rounded-full px-2.5 py-1 text-xs"
              >
                {tag.name}
              </Link>
            ))}
          </div>
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
        <p className="bg-warn-soft text-warn no-print rounded-[14px] px-4 py-3 text-sm">
          This one came over from the recipe book missing{' '}
          {recipe.ingredients.length === 0 ? 'its ingredients' : 'its instructions'}.{' '}
          <Link href={`/recipes/${recipe.slug}/edit`} className="font-medium underline">
            Fill it in
          </Link>
          .
        </p>
      ) : null}

      <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <section>
          <h2 className="font-display mb-3 text-lg font-semibold">Ingredients</h2>
          {recipe.ingredients.length === 0 ? (
            <p className="text-ink-faint text-sm">Not recorded yet.</p>
          ) : (
            <IngredientList sections={ingredientSections} servings={recipe.servings} />
          )}
        </section>

        <section>
          <h2 className="font-display mb-3 text-lg font-semibold">Instructions</h2>
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
        <section className="border-rule border-t pt-5">
          <h2 className="font-display mb-2 text-lg font-semibold">Notes</h2>
          <p className="text-ink-soft whitespace-pre-wrap text-[15px]">{recipe.notes}</p>
        </section>
      ) : null}
    </article>
  )
}
