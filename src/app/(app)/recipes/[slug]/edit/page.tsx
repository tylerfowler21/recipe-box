import { notFound } from 'next/navigation'
import { getRecipeBySlug } from '@/lib/queries'
import { updateRecipe } from '@/lib/actions'
import { RecipeForm } from '@/components/RecipeForm'
import { DeleteRecipeButton } from '@/components/DeleteRecipeButton'
import { deleteRecipe } from '@/lib/actions'

export default async function EditRecipePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const recipe = await getRecipeBySlug(slug)
  if (!recipe) notFound()

  // Sub-section labels are round-tripped as "Dressing:" header lines so the
  // plain-textarea editor can express groups without a bespoke editor widget.
  const asLines = (items: { text: string; group: string | null }[]) => {
    const out: string[] = []
    let current: string | null = null
    for (const item of items) {
      if (item.group !== current) {
        if (out.length) out.push('')
        if (item.group) out.push(`${item.group}:`)
        current = item.group
      }
      out.push(item.text)
    }
    return out.join('\n')
  }

  const action = updateRecipe.bind(null, recipe.id)
  const removeAction = deleteRecipe.bind(null, recipe.id)

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <h1 className="font-display text-2xl font-semibold tracking-tight">Edit {recipe.title}</h1>
      <RecipeForm
        action={action}
        submitLabel="Save changes"
        cancelHref={`/recipes/${recipe.slug}`}
        initial={{
          title: recipe.title,
          description: recipe.description ?? '',
          notes: recipe.notes ?? '',
          source: recipe.source ?? '',
          servings: recipe.servings ?? '',
          prepMinutes: recipe.prepMinutes?.toString() ?? '',
          cookMinutes: recipe.cookMinutes?.toString() ?? '',
          photoUrl: recipe.photoUrl ?? '',
          ingredients: asLines(recipe.ingredients),
          steps: asLines(recipe.steps),
          tags: recipe.tags.map((t) => t.tag.name).join(', '),
        }}
      />
      <DeleteRecipeButton title={recipe.title} action={removeAction} />
    </div>
  )
}
