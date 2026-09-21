'use client'

import Link from 'next/link'
import { useActionState, useState } from 'react'
import { PhotoField } from '@/components/PhotoField'

export type RecipeFormValues = {
  title: string
  description: string
  notes: string
  source: string
  servings: string
  prepMinutes: string
  cookMinutes: string
  photoUrl: string
  sourceUrl: string
  ingredients: string
  steps: string
  tags: string
}

type Action = (
  prev: { error?: string } | undefined,
  formData: FormData,
) => Promise<{ error?: string } | undefined>

export function RecipeForm({
  action,
  initial,
  submitLabel,
  cancelHref,
}: {
  action: Action
  initial: RecipeFormValues
  submitLabel: string
  cancelHref: string
}) {
  const [state, formAction, pending] = useActionState(action, undefined)
  const [photoUrl, setPhotoUrl] = useState(initial.photoUrl)

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="sourceUrl" value={initial.sourceUrl} />

      <Field label="Title" required>
        <input name="title" defaultValue={initial.title} required className="field" />
      </Field>

      <Field label="Short description" hint="One line — what it is, or who it came from.">
        <input name="description" defaultValue={initial.description} className="field" />
      </Field>

      <PhotoField value={photoUrl} onChange={setPhotoUrl} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field label="Prep (min)">
          <input
            name="prepMinutes"
            type="number"
            min={0}
            inputMode="numeric"
            defaultValue={initial.prepMinutes}
            className="field"
          />
        </Field>
        <Field label="Cook (min)">
          <input
            name="cookMinutes"
            type="number"
            min={0}
            inputMode="numeric"
            defaultValue={initial.cookMinutes}
            className="field"
          />
        </Field>
        <Field label="Serves">
          <input name="servings" defaultValue={initial.servings} className="field" />
        </Field>
        <Field label="Source">
          <input name="source" defaultValue={initial.source} className="field" />
        </Field>
      </div>

      <Field label="Ingredients" hint="One per line.">
        <textarea
          name="ingredients"
          rows={9}
          defaultValue={initial.ingredients}
          placeholder={'2 cups flour\n1 tsp salt'}
          className="field font-mono text-[13px]"
        />
      </Field>

      <Field label="Instructions" hint="One step per line.">
        <textarea
          name="steps"
          rows={9}
          defaultValue={initial.steps}
          placeholder={'Preheat the oven to 350.\nMix the dry ingredients.'}
          className="field font-mono text-[13px]"
        />
      </Field>

      <Field
        label="Tags"
        hint={
          initial.tags
            ? 'Comma separated.'
            : 'Comma separated. Leave blank and tags will be suggested from the ingredients.'
        }
      >
        <input name="tags" defaultValue={initial.tags} className="field" placeholder="Chicken, Quick" />
      </Field>

      <Field label="Notes" hint="Substitutions, what went wrong last time, who likes it.">
        <textarea name="notes" rows={4} defaultValue={initial.notes} className="field" />
      </Field>

      {state?.error ? (
        <p className="text-warn text-sm" role="alert">
          {state.error}
        </p>
      ) : null}

      <div className="border-rule bg-paper/90 sticky bottom-0 flex items-center gap-3 border-t py-3 backdrop-blur">
        <button
          type="submit"
          disabled={pending}
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

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string
  hint?: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">
        {label}
        {required ? <span className="text-warn"> *</span> : null}
      </span>
      {hint ? <span className="text-ink-faint block text-xs">{hint}</span> : null}
      {children}
    </label>
  )
}
