import { notFound } from 'next/navigation'
import { getMealBySlug, getRecipeTitles } from '@/lib/queries'
import { updateMeal, deleteMeal } from '@/lib/actions'
import { MealForm } from '@/components/MealForm'
import { DeleteRecipeButton } from '@/components/DeleteRecipeButton'

export default async function EditMealPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const [meal, recipes] = await Promise.all([getMealBySlug(slug), getRecipeTitles()])
  if (!meal) notFound()

  const action = updateMeal.bind(null, meal.id)
  const removeAction = deleteMeal.bind(null, meal.id)

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <h1 className="font-display text-2xl font-semibold tracking-tight">Edit {meal.name}</h1>
      <MealForm
        action={action}
        recipes={recipes}
        initial={{
          name: meal.name,
          description: meal.description ?? '',
          photoUrl: meal.photoUrl ?? '',
          recipeIds: meal.recipes.map((l) => l.recipeId),
        }}
        submitLabel="Save changes"
        cancelHref={`/meals/${meal.slug}`}
      />
      <DeleteRecipeButton title={meal.name} action={removeAction} />
    </div>
  )
}
