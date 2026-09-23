import { getRecipeTitles } from '@/lib/queries'
import { createMeal } from '@/lib/actions'
import { MealForm } from '@/components/MealForm'

export const metadata = { title: 'Build a meal — Recipe Box' }

export default async function NewMealPage() {
  const recipes = await getRecipeTitles()

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <h1 className="font-display text-2xl font-semibold tracking-tight">Build a meal</h1>
      <MealForm
        action={createMeal}
        recipes={recipes}
        initial={{ name: '', description: '', photoUrl: '', recipeIds: [] }}
        submitLabel="Save meal"
        cancelHref="/meals"
      />
    </div>
  )
}
