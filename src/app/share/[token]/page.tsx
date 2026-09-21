import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getSharedRecipe } from '@/lib/queries'
import { groupBySection, formatTotalTime } from '@/lib/recipes'
import { StepList } from '@/components/StepList'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>
}): Promise<Metadata> {
  const { token } = await params
  const recipe = await getSharedRecipe(token)
  return {
    title: recipe ? recipe.title : 'Recipe',
    // A shared link is for one person, not for search engines.
    robots: { index: false, follow: false },
  }
}

/**
 * The public, read-only view of one recipe.
 *
 * Deliberately outside the (app) group: no nav, no links to other recipes, and
 * nothing that hints at the rest of the collection. Someone with this link sees
 * exactly one recipe and no way to walk to another.
 */
export default async function SharedRecipePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const recipe = await getSharedRecipe(token)
  if (!recipe) notFound()

  const time = formatTotalTime(recipe.prepMinutes, recipe.cookMinutes)
  const ingredientSections = groupBySection(recipe.ingredients)
  const stepSections = groupBySection(recipe.steps)

  return (
    <div className="mx-auto max-w-3xl px-4 pb-20 pt-8">
      <article className="space-y-6">
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
            {recipe.source ? <span>from {recipe.source}</span> : null}
          </div>

          {recipe.tags.length ? (
            <div className="flex flex-wrap gap-1.5">
              {recipe.tags.map(({ tag }) => (
                <span
                  key={tag.slug}
                  className="bg-accent-soft text-accent rounded-full px-2.5 py-1 text-xs"
                >
                  {tag.name}
                </span>
              ))}
            </div>
          ) : null}
        </header>

        <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <section>
            <h2 className="font-display mb-3 text-lg font-semibold">Ingredients</h2>
            {recipe.ingredients.length === 0 ? (
              <p className="text-ink-faint text-sm">Not recorded.</p>
            ) : (
              <div className="space-y-4">
                {ingredientSections.map((section, i) => (
                  <div key={i}>
                    {section.name ? (
                      <h3 className="text-ink-faint mb-1.5 text-[11px] font-medium uppercase tracking-wide">
                        {section.name}
                      </h3>
                    ) : null}
                    <ul className="space-y-1.5">
                      {section.items.map((ing) => (
                        <li key={ing.id} className="border-rule border-b pb-1.5 text-[15px]">
                          {ing.text}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="font-display mb-3 text-lg font-semibold">Instructions</h2>
            {recipe.steps.length === 0 ? (
              <p className="text-ink-faint text-sm">Not recorded.</p>
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

        <footer className="border-rule text-ink-faint no-print border-t pt-5 text-xs">
          Shared from a family recipe box.
        </footer>
      </article>
    </div>
  )
}
