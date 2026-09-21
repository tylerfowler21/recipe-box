import Link from 'next/link'
import { createRecipe } from '@/lib/actions'
import { RecipeForm } from '@/components/RecipeForm'

const EMPTY = {
  title: '', description: '', notes: '', source: '', servings: '',
  prepMinutes: '', cookMinutes: '', photoUrl: '', sourceUrl: '',
  ingredients: '', steps: '', tags: '',
}

export const metadata = { title: 'Add a recipe — Recipe Box' }

export default function NewRecipePage() {
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex flex-wrap items-baseline gap-3">
        <h1 className="font-display text-2xl font-semibold tracking-tight">Add a recipe</h1>
        <Link href="/recipes/import" className="text-accent text-sm font-medium">
          or paste a link
        </Link>
      </div>
      <RecipeForm action={createRecipe} initial={EMPTY} submitLabel="Save recipe" cancelHref="/" />
    </div>
  )
}
