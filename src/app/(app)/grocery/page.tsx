import { getGroceryList } from '@/lib/queries'
import { addGroceryItem, clearCheckedGroceryItems } from '@/lib/actions'
import { GroceryRow } from '@/components/GroceryRow'

export const metadata = { title: 'Grocery list — Recipe Box' }

export default async function GroceryPage() {
  const items = await getGroceryList()
  const open = items.filter((i) => !i.checked)
  const done = items.filter((i) => i.checked)

  // Group by the recipe that put each line on the list, so a shop reads as
  // "these four are for the lasagna" rather than one undifferentiated column.
  const groups = new Map<string, typeof open>()
  for (const item of open) {
    const key = item.sourceLabel ?? 'Other'
    groups.set(key, [...(groups.get(key) ?? []), item])
  }
  const ordered = [...groups.entries()].sort(([a], [b]) =>
    a === 'Other' ? 1 : b === 'Other' ? -1 : a.localeCompare(b),
  )

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="font-display text-2xl font-semibold tracking-tight">Grocery list</h1>
        <p className="text-ink-faint text-sm">{open.length} to get</p>
      </div>

      <form action={addGroceryItem} className="flex gap-2">
        <input
          name="text"
          placeholder="Add something…"
          aria-label="Add a grocery item"
          className="field flex-1"
        />
        <button
          type="submit"
          className="bg-accent shrink-0 rounded-[10px] px-4 py-2 font-medium text-white"
        >
          Add
        </button>
      </form>

      {items.length === 0 ? (
        <div className="border-rule rounded-[14px] border border-dashed px-6 py-12 text-center">
          <p className="text-ink-soft">The list is empty.</p>
          <p className="text-ink-faint mt-1 text-sm">
            Add items above, or send a recipe here from its page.
          </p>
        </div>
      ) : null}

      {ordered.map(([label, groupItems]) => (
        <section key={label} className="space-y-1">
          <h2 className="text-ink-faint text-[11px] font-medium uppercase tracking-wide">
            {label}
          </h2>
          <ul>
            {groupItems.map((item) => (
              <GroceryRow key={item.id} item={item} />
            ))}
          </ul>
        </section>
      ))}

      {done.length ? (
        <section className="border-rule space-y-1 border-t pt-4">
          <div className="flex items-center gap-2">
            <h2 className="text-ink-faint text-[11px] font-medium uppercase tracking-wide">
              Got it ({done.length})
            </h2>
            <form action={clearCheckedGroceryItems} className="ml-auto">
              <button type="submit" className="text-ink-soft hover:text-warn text-sm">
                Clear
              </button>
            </form>
          </div>
          <ul>
            {done.map((item) => (
              <GroceryRow key={item.id} item={item} />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
