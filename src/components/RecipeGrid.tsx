import Link from 'next/link'
import type { RecipeCard } from '@/lib/queries'
import { formatTotalTime } from '@/lib/recipes'

export function RecipeGrid({ recipes }: { recipes: RecipeCard[] }) {
  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {recipes.map((r) => {
        const time = formatTotalTime(r.prepMinutes, r.cookMinutes)
        return (
          <li key={r.id}>
            <Link
              href={`/recipes/${r.slug}`}
              className="bg-raised border-rule hover:border-accent/50 block h-full overflow-hidden rounded-[14px] border transition-colors"
            >
              {r.photoUrl ? (
                // Photos are user-supplied (uploads or pasted URLs), so a plain
                // <img> avoids next/image's remote-host allowlist entirely.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={r.photoUrl}
                  alt=""
                  className="h-36 w-full object-cover"
                  loading="lazy"
                />
              ) : null}
              <div className="p-3.5">
                <div className="flex items-start gap-2">
                  <h2 className="font-display flex-1 text-[17px] font-semibold leading-snug">
                    {r.title}
                  </h2>
                  {r.isFavorite ? <span className="text-accent text-sm">★</span> : null}
                </div>

                {r.description ? (
                  <p className="text-ink-soft mt-1 line-clamp-2 text-sm">{r.description}</p>
                ) : null}

                <div className="text-ink-faint mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                  {time ? <span>{time}</span> : null}
                  <span>{r._count.ingredients} ingredients</span>
                  {r.needsReview ? (
                    <span className="text-warn bg-warn-soft rounded-full px-1.5 py-0.5">
                      needs a look
                    </span>
                  ) : null}
                </div>

                {r.tags.length ? (
                  <div className="mt-2.5 flex flex-wrap gap-1">
                    {r.tags.slice(0, 4).map(({ tag }) => (
                      <span
                        key={tag.slug}
                        className="bg-accent-soft text-accent rounded-full px-2 py-0.5 text-[11px]"
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
