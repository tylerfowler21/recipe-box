import 'server-only'
import { prisma } from '@/lib/prisma'

export type RecipeFilters = {
  q?: string
  tags?: string[]
  sort?: 'title' | 'newest' | 'favorites'
  onlyFavorites?: boolean
  onlyNeedsReview?: boolean
}

const cardSelect = {
  id: true,
  title: true,
  slug: true,
  description: true,
  photoUrl: true,
  isFavorite: true,
  needsReview: true,
  prepMinutes: true,
  cookMinutes: true,
  tags: { select: { tag: { select: { name: true, slug: true, kind: true } } } },
  _count: { select: { ingredients: true, steps: true } },
} as const

export async function listRecipes(filters: RecipeFilters = {}) {
  const { q, tags = [], sort = 'title', onlyFavorites, onlyNeedsReview } = filters

  // searchText is stored pre-lowercased, so a lowercased needle makes the LIKE
  // case-insensitive without SQLite-specific collation settings.
  const needle = q?.trim().toLowerCase()

  return prisma.recipe.findMany({
    where: {
      ...(needle ? { searchText: { contains: needle } } : {}),
      ...(onlyFavorites ? { isFavorite: true } : {}),
      ...(onlyNeedsReview ? { needsReview: true } : {}),
      // Every selected tag must be present, so filters narrow rather than widen.
      ...(tags.length ? { AND: tags.map((slug) => ({ tags: { some: { tag: { slug } } } })) } : {}),
    },
    select: cardSelect,
    orderBy:
      sort === 'newest'
        ? { createdAt: 'desc' }
        : sort === 'favorites'
          ? [{ isFavorite: 'desc' }, { title: 'asc' }]
          : { title: 'asc' },
  })
}

export type RecipeCard = Awaited<ReturnType<typeof listRecipes>>[number]

export async function getRecipeBySlug(slug: string) {
  return prisma.recipe.findUnique({
    where: { slug },
    include: {
      ingredients: { orderBy: { position: 'asc' } },
      steps: { orderBy: { position: 'asc' } },
      tags: { include: { tag: true } },
    },
  })
}

export type RecipeDetail = NonNullable<Awaited<ReturnType<typeof getRecipeBySlug>>>

export async function getAllTags() {
  const tags = await prisma.tag.findMany({
    include: { _count: { select: { recipes: true } } },
    orderBy: { name: 'asc' },
  })
  return tags.filter((t) => t._count.recipes > 0)
}

export async function getRecipeTitles() {
  return prisma.recipe.findMany({
    select: { id: true, title: true, slug: true },
    orderBy: { title: 'asc' },
  })
}

export async function getCounts() {
  const [total, needsReview, favorites] = await Promise.all([
    prisma.recipe.count(),
    prisma.recipe.count({ where: { needsReview: true } }),
    prisma.recipe.count({ where: { isFavorite: true } }),
  ])
  return { total, needsReview, favorites }
}

/** Monday-based week containing `date`, normalised to midnight UTC. */
export function weekStart(date: Date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
  const dow = (d.getUTCDay() + 6) % 7 // Mon = 0
  d.setUTCDate(d.getUTCDate() - dow)
  return d
}

export async function getWeekPlan(start: Date) {
  const end = new Date(start)
  end.setUTCDate(end.getUTCDate() + 7)
  return prisma.mealPlanEntry.findMany({
    where: { date: { gte: start, lt: end } },
    include: { recipe: { select: { title: true, slug: true, photoUrl: true } } },
    orderBy: [{ date: 'asc' }, { position: 'asc' }],
  })
}

export type PlanEntry = Awaited<ReturnType<typeof getWeekPlan>>[number]

export async function getGroceryList() {
  return prisma.groceryItem.findMany({
    orderBy: [{ checked: 'asc' }, { createdAt: 'asc' }],
  })
}
