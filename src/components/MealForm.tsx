'use client'

import Link from 'next/link'
import { useActionState, useMemo, useState } from 'react'
import { PhotoField } from '@/components/PhotoField'

type RecipeOption = { id: string; title: string; slug: string }

export type MealFormValues = {
  name: string
  description: string
  photoUrl: string
  recipeIds: string[]
}

type Action = (
  prev: { error?: string } | undefined,
  formData: FormData,
) => Promise<{ error?: string } | undefined>

/**
 * Builds a meal from existing recipes.
 *
 * The picked recipes keep the order they were chosen in, because that's the
 * order they'll appear on the meal and in the plan — main first, then the
 * dressing, then the sides.
 */
export function MealForm({
  action,
  initial,
  recipes,
  submitLabel,
  cancelHref,
}: {
  action: Action
  initial: MealFormValues
  recipes: RecipeOption[]
  submitLabel: string
  cancelHref: string
}) {
  const [state, formAction, pending] = useActionState(action, undefined)
  const [photoUrl, setPhotoUrl] = useState(initial.photoUrl)
  const [picked, setPicked] = useState<string[]>(initial.recipeIds)
  const [query, setQuery] = useState('')

  const byId = useMemo(() => new Map(recipes.map((r) => [r.id, r])), [recipes])

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase()
    const available = recipes.filter((r) => !picked.includes(r.id))
    if (!q) return available
    return available.filter((r) => r.title.toLowerCase().includes(q))
  }, [recipes, picked, query])

  return (
    <form action={formAction} className="space-y-5">
      {picked.map((id) => (
        <input key={id} type="hidden" name="recipeIds" value={id} />
      ))}

      <label className="block space-y-1.5">
        <span className="text-sm font-medium">
          Name<span className="text-warn"> *</span>
        </span>
        <input
          name="name"
          defaultValue={initial.name}
          required
          placeholder="Costa Vida Night"
          className="field"
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium">Description</span>
        <span className="text-ink-faint block text-xs">
          Optional — when you make it, who likes it.
        </span>
        <input name="description" defaultValue={initial.description} className="field" />
      </label>

      <PhotoField value={photoUrl} onChange={setPhotoUrl} />

      <div className="space-y-2">
        <span className="text-sm font-medium">
          Recipes in this meal<span className="text-warn"> *</span>
        </span>

        {picked.length === 0 ? (
          <p className="text-ink-faint text-xs">Nothing picked yet.</p>
        ) : (
          <ol className="space-y-1.5">
            {picked.map((id, index) => {
              const recipe = byId.get(id)
              if (!recipe) return null
              return (
                <li
                  key={id}
                  className="border-rule bg-raised flex items-center gap-2 rounded-[10px] border px-3 py-2 text-[15px]"
                >
                  <span className="text-ink-faint w-4 shrink-0 text-xs">{index + 1}</span>
                  <span className="min-w-0 flex-1">{recipe.title}</span>
                  <button
                    type="button"
                    onClick={() => setPicked((p) => p.filter((x) => x !== id))}
                    className="text-ink-faint hover:text-warn shrink-0 text-sm"
                    aria-label={`Remove ${recipe.title} from this meal`}
                  >
                    ×
                  </button>
                </li>
              )
            })}
          </ol>
        )}

        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search recipes to add…"
          aria-label="Search recipes to add to this meal"
          className="field"
        />

        <div className="border-rule max-h-56 overflow-y-auto rounded-[10px] border">
          {matches.length === 0 ? (
            <p className="text-ink-faint px-3 py-3 text-sm">
              {query ? 'Nothing matches that.' : 'Every recipe is already in this meal.'}
            </p>
          ) : (
            <ul>
              {matches.map((recipe) => (
                <li key={recipe.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setPicked((p) => [...p, recipe.id])
                      setQuery('')
                    }}
                    className="border-rule hover:bg-accent-soft w-full border-b px-3 py-2 text-left text-[15px] last:border-b-0"
                  >
                    {recipe.title}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {state?.error ? (
        <p className="text-warn text-sm" role="alert">
          {state.error}
        </p>
      ) : null}

      <div className="border-rule bg-paper/90 sticky bottom-0 flex items-center gap-3 border-t py-3 backdrop-blur">
        <button
          type="submit"
          disabled={pending || picked.length === 0}
          className="bg-accent rounded-[10px] px-4 py-2.5 font-medium text-white disabled:opacity-60"
        >
          {pending ? 'Saving…' : submitLabel}
        </button>
        <Link href={cancelHref} className="text-ink-soft text-sm">
          Cancel
        </Link>
      </div>
    </form>
  )
}
