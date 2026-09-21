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
            <h3 className="text-ink-faint mb-2 text-[11px] font-medium uppercase tracking-wide">
              {section.name}
            </h3>
          ) : null}
          <ol className="space-y-2.5">
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
                    <span
                      aria-hidden
                      className={
                        isDone
                          ? 'bg-accent mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium text-white'
                          : 'border-rule text-ink-faint mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-medium'
                      }
                    >
                      {isDone ? '✓' : n}
                    </span>
                    <span className={isDone ? 'struck text-[15px]' : 'text-[15px]'}>
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
