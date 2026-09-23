import { getGroceryList } from '@/lib/queries'
import { addGroceryItem, clearCheckedGroceryItems } from '@/lib/actions'
import { GroceryList } from '@/components/GroceryList'
import { ClearGroceryList } from '@/components/ClearGroceryList'

export const metadata = { title: 'Grocery list — Recipe Box' }

export default async function GroceryPage() {
  const items = await getGroceryList()
  const open = items.filter((i) => !i.checked)
  const done = items.filter((i) => i.checked)

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="font-display text-2xl font-semibold tracking-tight">Grocery list</h1>
        <div className="flex flex-wrap items-baseline gap-3">
          <p className="text-ink-faint text-sm">{open.length} to get</p>
          {done.length ? (
            <form action={clearCheckedGroceryItems}>
              <button type="submit" className="text-ink-soft hover:text-warn no-print text-sm">
                Clear {done.length} done
              </button>
            </form>
          ) : null}
          {items.length ? (
            <ClearGroceryList total={items.length} outstanding={open.length} />
          ) : null}
        </div>
      </div>

      <form action={addGroceryItem} className="no-print flex gap-2">
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
      ) : (
        <GroceryList
          items={items.map((i) => ({
            id: i.id,
            text: i.text,
            checked: i.checked,
            sourceLabel: i.sourceLabel,
          }))}
        />
      )}
    </div>
  )
}
