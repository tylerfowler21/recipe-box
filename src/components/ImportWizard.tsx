'use client'

import { useActionState, useState } from 'react'
import { lookupRecipeUrl, createRecipe } from '@/lib/actions'
import { parseRecipeText, linesToText } from '@/lib/recipe-text'
import { RecipeForm, type RecipeFormValues } from '@/components/RecipeForm'

const EMPTY: RecipeFormValues = {
  title: '', description: '', notes: '', source: '', servings: '',
  prepMinutes: '', cookMinutes: '', photoUrl: '', sourceUrl: '',
  ingredients: '', steps: '', tags: '',
}

/**
 * Paste a link, get a recipe.
 *
 * Recipe sites carry machine-readable recipe data and fill the form outright.
 * Instagram and Facebook don't, and can't be scraped honestly, so those fall
 * back to asking for the caption — which then goes through the same parser that
 * imported the family Word document.
 */
export function ImportWizard() {
  const [result, lookupAction, looking] = useActionState(lookupRecipeUrl, undefined)
  const [pasted, setPasted] = useState('')
  const [draft, setDraft] = useState<RecipeFormValues | null>(null)

  // A successful structured import goes straight to a prefilled form.
  if (result?.kind === 'recipe' && !draft) {
    setDraft({
      ...EMPTY,
      title: result.title,
      description: result.description ?? '',
      source: result.source ?? '',
      sourceUrl: result.sourceUrl,
      servings: result.servings ?? '',
      prepMinutes: result.prepMinutes?.toString() ?? '',
      cookMinutes: result.cookMinutes?.toString() ?? '',
      photoUrl: result.photoUrl ?? '',
      ingredients: linesToText(result.ingredients),
      steps: linesToText(result.steps),
      tags: '',
    })
  }

  if (draft) {
    return (
      <div className="space-y-4">
        <p className="bg-accent-soft text-accent rounded-[14px] px-4 py-3 text-sm">
          Check it over before saving — imported recipes are usually right, but
          not always.
        </p>
        <RecipeForm
          action={createRecipe}
          initial={draft}
          submitLabel="Save recipe"
          cancelHref="/"
        />
      </div>
    )
  }

  function useCaption(sourceUrl: string, title?: string, photoUrl?: string) {
    const parsed = parseRecipeText(pasted)
    setDraft({
      ...EMPTY,
      title: title ?? '',
      source: result?.kind === 'needsPaste' ? result.platform : '',
      sourceUrl,
      photoUrl: photoUrl ?? '',
      ingredients: linesToText(parsed.ingredients),
      steps: linesToText(parsed.steps),
    })
  }

  return (
    <div className="space-y-5">
      <form action={lookupAction} className="space-y-2">
        <label htmlFor="url" className="block text-sm font-medium">
          Recipe link
        </label>
        <div className="flex gap-2">
          <input
            id="url"
            name="url"
            type="url"
            required
            placeholder="https://…"
            className="field flex-1"
          />
          <button
            type="submit"
            disabled={looking}
            className="bg-accent shrink-0 rounded-[10px] px-4 py-2 font-medium text-white disabled:opacity-60"
          >
            {looking ? 'Reading…' : 'Read it'}
          </button>
        </div>
        <p className="text-ink-faint text-xs">
          Recipe sites and food blogs fill themselves in. Instagram and Facebook
          don&rsquo;t publish their recipes, so those will ask you to paste the
          caption.
        </p>
      </form>

      {result?.kind === 'error' ? (
        <p className="bg-warn-soft text-warn rounded-[14px] px-4 py-3 text-sm" role="alert">
          {result.message}
        </p>
      ) : null}

      {result?.kind === 'needsPaste' ? (
        <div className="border-rule bg-raised space-y-3 rounded-[14px] border p-4">
          <h2 className="text-sm font-medium">
            {result.platform} won&rsquo;t hand over the recipe
          </h2>
          <p className="text-ink-faint text-xs">
            {result.prefill
              ? 'Here’s the caption it did give us. Tidy it up if needed, then continue.'
              : 'Open the post, copy the caption, and paste it here. The ingredients and steps will be sorted out automatically.'}
          </p>

          {result.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={result.photoUrl} alt="" className="h-28 rounded-[10px] object-cover" />
          ) : null}

          <textarea
            rows={10}
            value={pasted || result.prefill || ''}
            onChange={(e) => setPasted(e.target.value)}
            placeholder={'2 avocados\nJuice of 1 lemon\n\nMash everything together.'}
            className="field font-mono text-[13px]"
          />

          <button
            onClick={() => useCaption(result.sourceUrl, result.title, result.photoUrl)}
            disabled={!(pasted || result.prefill)}
            className="bg-accent rounded-[10px] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            Sort this into a recipe
          </button>
        </div>
      ) : null}
    </div>
  )
}
