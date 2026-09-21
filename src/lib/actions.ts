'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { slugify, buildSearchText } from '@/lib/recipes'
import { suggestTags, TAG_KINDS } from '@/lib/tagging'
import {
  SESSION_COOKIE,
  checkPassword,
  createSessionValue,
  requireSession,
  sessionCookieOptions,
} from '@/lib/auth'

/* ------------------------------------------------------------------ auth -- */

export async function signIn(_prev: { error?: string } | undefined, formData: FormData) {
  const password = String(formData.get('password') ?? '')
  const next = String(formData.get('next') ?? '/')
  if (!checkPassword(password)) {
    return { error: 'That password is not right.' }
  }
  const store = await cookies()
  store.set(SESSION_COOKIE, await createSessionValue(), sessionCookieOptions)
  // Only ever bounce to an in-app path, never to an attacker-supplied origin.
  redirect(next.startsWith('/') && !next.startsWith('//') ? next : '/')
}

export async function signOut() {
  const store = await cookies()
  store.delete(SESSION_COOKIE)
  redirect('/login')
}

/* --------------------------------------------------------------- recipes -- */

/**
 * Turns a textarea into positioned lines, honouring "Dressing:" style headers
 * as sub-section labels. This is the inverse of the edit form's `asLines`, so a
 * recipe with groups survives a round-trip through the editor unchanged.
 */
function parseLines(raw: string) {
  const out: { text: string; group: string | null; position: number }[] = []
  let group: string | null = null
  for (const line of raw.split('\n')) {
    const trimmed = line.replace(/^\s*[-–—•*]\s*/, '').trim()
    if (!trimmed) continue
    if (trimmed.endsWith(':') && trimmed.length <= 45) {
      group = trimmed.slice(0, -1).trim() || null
      continue
    }
    out.push({ text: trimmed, group, position: out.length })
  }
  return out
}

const RecipeInput = z.object({
  title: z.string().trim().min(1, 'A title is required').max(200),
  description: z.string().trim().max(2000).optional(),
  notes: z.string().trim().max(5000).optional(),
  source: z.string().trim().max(200).optional(),
  servings: z.string().trim().max(50).optional(),
  prepMinutes: z.coerce.number().int().min(0).max(10000).optional(),
  cookMinutes: z.coerce.number().int().min(0).max(10000).optional(),
  photoUrl: z.string().trim().max(2000).optional(),
  ingredients: z.string(),
  steps: z.string(),
  tags: z.string().optional(),
})

function parseForm(formData: FormData) {
  const raw = Object.fromEntries(formData.entries())
  return RecipeInput.safeParse({
    ...raw,
    prepMinutes: raw.prepMinutes === '' ? undefined : raw.prepMinutes,
    cookMinutes: raw.cookMinutes === '' ? undefined : raw.cookMinutes,
  })
}

async function resolveTagIds(names: string[]) {
  const ids: string[] = []
  for (const name of names) {
    const slug = slugify(name)
    if (!slug) continue
    const tag = await prisma.tag.upsert({
      where: { slug },
      update: {},
      create: { name: name.trim(), slug, kind: TAG_KINDS[slug] ?? 'general' },
    })
    ids.push(tag.id)
  }
  return [...new Set(ids)]
}

async function uniqueSlug(title: string, excludeId?: string) {
  const base = slugify(title)
  let slug = base
  let n = 2
  for (;;) {
    const existing = await prisma.recipe.findUnique({ where: { slug }, select: { id: true } })
    if (!existing || existing.id === excludeId) return slug
    slug = `${base}-${n++}`
  }
}

export async function createRecipe(
  _prev: { error?: string } | undefined,
  formData: FormData,
) {
  await requireSession()
  const parsed = parseForm(formData)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid recipe' }
  const d = parsed.data

  const ingredients = parseLines(d.ingredients)
  const steps = parseLines(d.steps)
  const ingredientText = ingredients.map((i) => i.text)
  const tagNames = d.tags
    ? d.tags.split(',').map((t) => t.trim()).filter(Boolean)
    : suggestTags(d.title, ingredientText, steps.map((s) => s.text))

  const recipe = await prisma.recipe.create({
    data: {
      title: d.title,
      slug: await uniqueSlug(d.title),
      description: d.description || null,
      notes: d.notes || null,
      source: d.source || null,
      servings: d.servings || null,
      prepMinutes: d.prepMinutes ?? null,
      cookMinutes: d.cookMinutes ?? null,
      photoUrl: d.photoUrl || null,
      needsReview: ingredients.length === 0 || steps.length === 0,
      searchText: buildSearchText({
        title: d.title,
        ingredients: ingredientText,
        tags: tagNames,
        notes: d.notes,
        description: d.description,
      }),
      ingredients: { create: ingredients },
      steps: { create: steps },
      tags: { create: (await resolveTagIds(tagNames)).map((tagId) => ({ tagId })) },
    },
  })

  revalidatePath('/')
  redirect(`/recipes/${recipe.slug}`)
}

export async function updateRecipe(
  id: string,
  _prev: { error?: string } | undefined,
  formData: FormData,
) {
  await requireSession()
  const parsed = parseForm(formData)
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid recipe' }
  const d = parsed.data

  const ingredients = parseLines(d.ingredients)
  const steps = parseLines(d.steps)
  const ingredientText = ingredients.map((i) => i.text)
  const tagNames = d.tags ? d.tags.split(',').map((t) => t.trim()).filter(Boolean) : []
  const tagIds = await resolveTagIds(tagNames)
  const slug = await uniqueSlug(d.title, id)

  // Ingredients, steps and tag links are fully replaced rather than diffed —
  // the edit form submits the complete list, so a diff would only add ways to
  // drift out of sync with what the user is looking at.
  await prisma.$transaction([
    prisma.ingredient.deleteMany({ where: { recipeId: id } }),
    prisma.step.deleteMany({ where: { recipeId: id } }),
    prisma.recipeTag.deleteMany({ where: { recipeId: id } }),
    prisma.recipe.update({
      where: { id },
      data: {
        title: d.title,
        slug,
        description: d.description || null,
        notes: d.notes || null,
        source: d.source || null,
        servings: d.servings || null,
        prepMinutes: d.prepMinutes ?? null,
        cookMinutes: d.cookMinutes ?? null,
        photoUrl: d.photoUrl || null,
        needsReview: ingredients.length === 0 || steps.length === 0,
        searchText: buildSearchText({
          title: d.title,
          ingredients: ingredientText,
          tags: tagNames,
          notes: d.notes,
          description: d.description,
        }),
        ingredients: { create: ingredients },
        steps: { create: steps },
        tags: { create: tagIds.map((tagId) => ({ tagId })) },
      },
    }),
  ])

  revalidatePath('/')
  revalidatePath(`/recipes/${slug}`)
  redirect(`/recipes/${slug}`)
}

export async function deleteRecipe(id: string) {
  await requireSession()
  await prisma.recipe.delete({ where: { id } })
  revalidatePath('/')
  redirect('/')
}

export async function toggleFavorite(id: string) {
  await requireSession()
  const recipe = await prisma.recipe.findUnique({ where: { id }, select: { isFavorite: true, slug: true } })
  if (!recipe) return
  await prisma.recipe.update({ where: { id }, data: { isFavorite: !recipe.isFavorite } })
  revalidatePath('/')
  revalidatePath(`/recipes/${recipe.slug}`)
}

/* ------------------------------------------------------------ meal plan -- */

export async function planMeal(formData: FormData) {
  await requireSession()
  const date = String(formData.get('date') ?? '')
  const slot = String(formData.get('slot') ?? 'dinner')
  const recipeId = String(formData.get('recipeId') ?? '')
  const noteText = String(formData.get('noteText') ?? '').trim()

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return
  if (!recipeId && !noteText) return

  await prisma.mealPlanEntry.create({
    data: {
      date: new Date(`${date}T00:00:00.000Z`),
      slot,
      recipeId: recipeId || null,
      noteText: recipeId ? null : noteText,
    },
  })
  revalidatePath('/plan')
}

export async function unplanMeal(id: string) {
  await requireSession()
  await prisma.mealPlanEntry.delete({ where: { id } })
  revalidatePath('/plan')
}

/* --------------------------------------------------------------- grocery -- */

export async function addGroceryItem(formData: FormData) {
  await requireSession()
  const text = String(formData.get('text') ?? '').trim()
  if (!text) return
  await prisma.groceryItem.create({ data: { text, manual: true } })
  revalidatePath('/grocery')
}

export async function toggleGroceryItem(id: string) {
  await requireSession()
  const item = await prisma.groceryItem.findUnique({ where: { id }, select: { checked: true } })
  if (!item) return
  await prisma.groceryItem.update({ where: { id }, data: { checked: !item.checked } })
  revalidatePath('/grocery')
}

export async function deleteGroceryItem(id: string) {
  await requireSession()
  await prisma.groceryItem.delete({ where: { id } })
  revalidatePath('/grocery')
}

export async function clearCheckedGroceryItems() {
  await requireSession()
  await prisma.groceryItem.deleteMany({ where: { checked: true } })
  revalidatePath('/grocery')
}

/** Copies a recipe's ingredient lines onto the shared list, keeping provenance. */
export async function addRecipeToGroceryList(recipeId: string) {
  await requireSession()
  const recipe = await prisma.recipe.findUnique({
    where: { id: recipeId },
    include: { ingredients: { orderBy: { position: 'asc' } } },
  })
  if (!recipe) return

  const existing = new Set(
    (await prisma.groceryItem.findMany({ where: { recipeId }, select: { text: true } })).map(
      (i) => i.text.toLowerCase(),
    ),
  )

  const fresh = recipe.ingredients.filter((i) => !existing.has(i.text.toLowerCase()))
  if (fresh.length) {
    await prisma.groceryItem.createMany({
      data: fresh.map((i) => ({
        text: i.text,
        recipeId,
        sourceLabel: recipe.title,
      })),
    })
  }
  revalidatePath('/grocery')
}

/** Pulls every planned recipe in a week onto the grocery list in one go. */
export async function addWeekToGroceryList(formData: FormData) {
  await requireSession()
  const start = String(formData.get('start') ?? '')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start)) return
  const from = new Date(`${start}T00:00:00.000Z`)
  const to = new Date(from)
  to.setUTCDate(to.getUTCDate() + 7)

  const entries = await prisma.mealPlanEntry.findMany({
    where: { date: { gte: from, lt: to }, recipeId: { not: null } },
    select: { recipeId: true },
  })
  for (const id of new Set(entries.map((e) => e.recipeId!))) {
    await addRecipeToGroceryList(id)
  }
  revalidatePath('/grocery')
  redirect('/grocery')
}
