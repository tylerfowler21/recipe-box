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
      {/* Scaling is the control used most while cooking, so it gets a band of
          its own rather than hiding among the page's other buttons. */}
      <div className="no-print bg-accent-soft flex flex-wrap items-center gap-1 rounded-[10px] px-3 py-2.5">
        <span className="text-ink-faint mr-1 text-[10px] uppercase tracking-[0.1em]">Make</span>
        <div className="flex-1" />
        {SCALE_OPTIONS.map((option) => (
          <button
            key={option.factor}
            onClick={() => setFactor(option.factor)}
            aria-pressed={factor === option.factor}
            className={
              factor === option.factor
                ? 'font-display bg-ink text-paper rounded-full px-3.5 py-1.5 text-[15px]'
                : 'font-display text-ink-soft hover:text-ink px-3 py-1.5 text-[15px]'
            }
          >
            {option.label}
          </button>
        ))}
      </div>

      {factor !== 1 && scaledServings ? (
        <p className="text-ink-faint text-xs">Serves {scaledServings} at this size.</p>
      ) : null}

      <div className="space-y-4">
        {sections.map((section, i) => (
          <div key={i}>
            {section.name ? (
              <h3 className="text-warn mb-2 text-[10px] font-medium uppercase tracking-[0.12em]">
                {section.name}
              </h3>
            ) : null}
            <ul>
              {section.items.map((ing) => {
                const scaled = scaleIngredient(ing.text, factor)
                return (
                  <li
                    key={ing.id}
                    className="border-rule border-b py-2.5 text-[15px] leading-snug"
                  >
                    {scaled}
                    {factor !== 1 && scaled !== ing.text ? (
                      <span className="text-ink-ghost ml-1.5 text-xs">({ing.text})</span>
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
