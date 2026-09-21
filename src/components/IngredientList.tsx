'use client'

import { useState } from 'react'
import { scaleIngredient, scaleServings, SCALE_OPTIONS } from '@/lib/scale'

type Ingredient = { id: string; text: string; group: string | null }

/**
 * Ingredients with a batch-size control.
 *
 * Scaling is display-only and never written back: the recipe is still the
 * recipe, you're just cooking a different amount of it today. Lines without a
 * leading quantity ("Salt", "Dash of vanilla") are left untouched, which is
 * both safer and what a cook would do anyway.
 */
export function IngredientList({
  sections,
  servings,
}: {
  sections: { name: string | null; items: Ingredient[] }[]
  servings: string | null
}) {
  const [factor, setFactor] = useState(1)
  const scaledServings = scaleServings(servings, factor)

  return (
    <div className="space-y-3">
      <div className="no-print flex flex-wrap items-center gap-1.5">
        <span className="text-ink-faint mr-1 text-xs">Make</span>
        {SCALE_OPTIONS.map((option) => (
          <button
            key={option.factor}
            onClick={() => setFactor(option.factor)}
            aria-pressed={factor === option.factor}
            className={
              factor === option.factor
                ? 'bg-accent rounded-full px-2.5 py-1 text-xs font-medium text-white'
                : 'bg-raised border-rule text-ink-soft rounded-full border px-2.5 py-1 text-xs'
            }
          >
            {option.label}
          </button>
        ))}
        {factor !== 1 && scaledServings ? (
          <span className="text-ink-faint ml-1 text-xs">serves {scaledServings}</span>
        ) : null}
      </div>

      <div className="space-y-4">
        {sections.map((section, i) => (
          <div key={i}>
            {section.name ? (
              <h3 className="text-ink-faint mb-1.5 text-[11px] font-medium uppercase tracking-wide">
                {section.name}
              </h3>
            ) : null}
            <ul className="space-y-1.5">
              {section.items.map((ing) => {
                const scaled = scaleIngredient(ing.text, factor)
                return (
                  <li key={ing.id} className="border-rule border-b pb-1.5 text-[15px]">
                    {scaled}
                    {factor !== 1 && scaled !== ing.text ? (
                      <span className="text-ink-faint ml-1.5 text-xs">({ing.text})</span>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}
