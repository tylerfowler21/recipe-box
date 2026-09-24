import Link from 'next/link'
import type { RecipeCard } from '@/lib/queries'
import { formatTotalTime } from '@/lib/recipes'

/**
 * The recipe list.
 *
 * Deliberately a ruled list rather than a grid of cards: two recipes in this
 * box have a photo and almost none have a recorded time, so a card grid would
 * be mostly empty frames. Every recipe does have a title, a few tags and an
 * ingredient count, so the title carries the row and a photo — where one
 * exists — sits alongside as a small enrichment.
 */
export function RecipeGrid({ recipes }: { recipes: RecipeCard[] }) {
  return (
    <ul className="border-rule border-b">
      {recipes.map((r) => {
        const time = formatTotalTime(r.prepMinutes, r.cookMinutes)
        return (
          <li key={r.id} className="border-rule border-t">
            <Link
              href={`/recipes/${r.slug}`}
              className="hover:bg-raised/60 flex items-start gap-3.5 px-1 py-4 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <h2 className="font-display text-[20px] font-normal leading-[1.15] tracking-[-0.01em]">
                  {r.title}
                  {r.isFavorite ? <span className="text-accent ml-1.5 text-sm">★</span> : null}
                </h2>

                <p className="text-ink-faint mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                  <span>
                    {r._count.ingredients} ingredient{r._count.ingredients === 1 ? '' : 's'}
                  </span>
                  {time ? (
                    <>
                      <span aria-hidden>·</span>
                      <span>{time}</span>
                    </>
                  ) : null}
                  {r.needsReview ? (
                    <>
                      <span aria-hidden>·</span>
                      <span className="text-warn">
                        {r._count.ingredients === 0 ? 'no ingredients yet' : 'no method yet'}
                      </span>
                    </>
                  ) : null}
                  {r.tags.length ? (
                    <>
                      <span aria-hidden>·</span>
                      {r.tags.slice(0, 3).map(({ tag }) => (
                        <span key={tag.slug} className="text-accent">
                          {tag.name}
                        </span>
                      ))}
                    </>
                  ) : null}
                </p>
              </div>

              {r.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={r.photoUrl}
                  alt=""
                  loading="lazy"
                  className="size-[62px] shrink-0 rounded-[3px] object-cover"
                />
              ) : null}
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
