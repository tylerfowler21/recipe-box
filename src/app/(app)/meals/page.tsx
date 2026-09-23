import Link from 'next/link'
import { listMeals } from '@/lib/queries'
import { ViewSwitch } from '@/components/ViewSwitch'

export const metadata = { title: 'Meals — Recipe Box' }

export default async function MealsPage() {
  const meals = await listMeals()

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="font-display text-2xl font-semibold tracking-tight">Meals</h1>
        <p className="text-ink-faint text-sm">{meals.length}</p>
      </div>

      <ViewSwitch current="meals" />

      <p className="text-ink-soft text-sm">
        A meal is the recipes that go together — the salad, its dressing and the
        chips. Plan one and every part lands on the same dinner.
      </p>

      {meals.length === 0 ? (
        <div className="border-rule rounded-[14px] border border-dashed px-6 py-12 text-center">
          <p className="text-ink-soft">No meals yet.</p>
          <Link href="/meals/new" className="text-accent mt-2 inline-block text-sm font-medium">
            Build the first one
          </Link>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {meals.map((meal) => (
            <li key={meal.id}>
              <Link
                href={`/meals/${meal.slug}`}
                className="bg-raised border-rule hover:border-accent/50 block h-full overflow-hidden rounded-[14px] border transition-colors"
              >
                {meal.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={meal.photoUrl} alt="" className="h-36 w-full object-cover" loading="lazy" />
                ) : null}
                <div className="p-3.5">
                  <h2 className="font-display text-[17px] font-semibold leading-snug">
                    {meal.name}
                  </h2>
                  {meal.description ? (
                    <p className="text-ink-soft mt-1 line-clamp-2 text-sm">{meal.description}</p>
                  ) : null}
                  <ul className="mt-2 space-y-0.5">
                    {meal.recipes.map((link) => (
                      <li key={link.recipeId} className="text-ink-soft text-[13px]">
                        · {link.recipe.title}
                      </li>
                    ))}
                  </ul>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
