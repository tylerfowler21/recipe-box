import 'server-only'
import { prisma } from '@/lib/prisma'
import { slotRank } from '@/lib/meal-slots'

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

/** Just the flagged count, for the nav badge — one COUNT per page view. */
export async function getNeedsReviewCount() {
  return prisma.recipe.count({ where: { needsReview: true } })
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
  const entries = await prisma.mealPlanEntry.findMany({
    where: { date: { gte: start, lt: end } },
    include: { recipe: { select: { title: true, slug: true, photoUrl: true } } },
    orderBy: [{ date: 'asc' }, { position: 'asc' }, { createdAt: 'asc' }],
  })

  // Meals read in the order they're eaten, not the order they were added.
  // Sorted here rather than in SQL because ordering by an arbitrary sequence of
  // string values needs a CASE expression Prisma can't express, and a week of
  // meals is far too small for that to be worth raw SQL.
  return entries.sort((a, b) => {
    const byDate = a.date.getTime() - b.date.getTime()
    if (byDate !== 0) return byDate
    const bySlot = slotRank(a.slot) - slotRank(b.slot)
    if (bySlot !== 0) return bySlot
    return a.position - b.position || a.createdAt.getTime() - b.createdAt.getTime()
  })
}

export type PlanEntry = Awaited<ReturnType<typeof getWeekPlan>>[number]

export async function getGroceryList() {
  return prisma.groceryItem.findMany({
    orderBy: [{ checked: 'asc' }, { createdAt: 'asc' }],
  })
}

/**
 * Looks up a share link by its token and records the view.
 *
 * A revoked link is treated exactly like one that never existed — the caller
 * gets null and renders a 404, so revoking leaks nothing about what the link
 * used to point at.
 */
export async function getSharedRecipe(token: string) {
  const link = await prisma.shareLink.findUnique({
    where: { token },
    include: {
      recipe: {
        include: {
          ingredients: { orderBy: { position: 'asc' } },
          steps: { orderBy: { position: 'asc' } },
          tags: { include: { tag: true } },
        },
      },
    },
  })

  if (!link || link.revokedAt) return null

  // Fire-and-forget: a failed counter update must never block the recipe.
  prisma.shareLink
    .update({
      where: { id: link.id },
      data: { viewCount: { increment: 1 }, lastViewedAt: new Date() },
    })
    .catch(() => {})

  return link.recipe
}

export async function getShareLinks(recipeId: string) {
  return prisma.shareLink.findMany({
    where: { recipeId, revokedAt: null },
    orderBy: { createdAt: 'desc' },
  })
}

export type ShareLinkRow = Awaited<ReturnType<typeof getShareLinks>>[number]
