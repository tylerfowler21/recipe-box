'use client'

import { useState } from 'react'

type Step = { id: string; text: string; group: string | null }

/**
 * Steps you can tick off while cooking. Deliberately client-only state — it
 * resets on reload and is never shared, because "step 3 done" is one cook's
 * place in the recipe, not something the whole household should see.
 */
export function StepList({ sections }: { sections: { name: string | null; items: Step[] }[] }) {
  const [done, setDone] = useState<Record<string, boolean>>({})

  let counter = 0

  return (
    <div className="space-y-5">
      {sections.map((section, i) => (
        <div key={i}>
          {section.name ? (
            <h3 className="text-warn mb-2 text-[10px] font-medium uppercase tracking-[0.12em]">
              {section.name}
            </h3>
          ) : null}
          <ol className="space-y-4">
            {section.items.map((step) => {
              counter += 1
              const n = counter
              const isDone = done[step.id]
              return (
                <li key={step.id}>
                  <button
                    onClick={() => setDone((d) => ({ ...d, [step.id]: !d[step.id] }))}
                    aria-pressed={isDone}
                    className="flex w-full items-start gap-3 text-left"
                  >
                    {/* The numeral is set in the display face and sized up: it
                        has to be findable at a glance from across a counter. */}
                    <span
                      aria-hidden
                      className={
                        isDone
                          ? 'font-display text-accent w-[22px] shrink-0 text-[26px] leading-none'
                          : 'font-display text-ink-ghost w-[22px] shrink-0 text-[26px] leading-none'
                      }
                    >
                      {isDone ? '✓' : n}
                    </span>
                    <span
                      className={
                        isDone ? 'struck text-[15px] leading-relaxed' : 'text-[15px] leading-relaxed'
                      }
                    >
                      {step.text}
                    </span>
                  </button>
                </li>
              )
            })}
          </ol>
        </div>
      ))}
    </div>
  )
}
