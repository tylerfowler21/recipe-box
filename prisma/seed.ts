import 'dotenv/config'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { createPrismaClient } from '../src/lib/prisma'
import { slugify, buildSearchText } from '../src/lib/recipes'
import { suggestTags, TAG_KINDS } from '../src/lib/tagging'

type ParsedLine = { text: string; group: string | null }
type ParsedRecipe = {
  title: string
  ingredients: ParsedLine[]
  steps: ParsedLine[]
  _warnings: string[]
}
type Correction = Partial<{
  title: string
  source: string
  description: string
  notes: string
}>

const dataDir = path.join(process.cwd(), 'prisma', 'seed-data')
const recipes: ParsedRecipe[] = JSON.parse(
  readFileSync(path.join(dataDir, 'recipes.json'), 'utf8'),
)
const corrections: Record<string, Correction> = JSON.parse(
  readFileSync(path.join(dataDir, 'corrections.json'), 'utf8'),
)

// The doc shouts a few titles ("WHITE BREAD"). Title-case those, but leave
// mixed-case titles alone so "Costa Vida Pulled Pork" keeps its capitals.
function normaliseTitle(raw: string) {
  const t = raw.trim()
  if (t !== t.toUpperCase()) return t
  return t
    .toLowerCase()
    .replace(/\b[a-z]/g, (c) => c.toUpperCase())
    .replace(/\bAnd\b/g, 'and')
    .replace(/\bWith\b/g, 'with')
    .replace(/\bThe\b/g, 'the')
    .replace(/^./, (c) => c.toUpperCase())
}

async function main() {
  const prisma = createPrismaClient()

  // Idempotent: wipe imported content so the seed can be re-run while we're
  // still tuning the parser. Cascades clear ingredients/steps/tag links.
  await prisma.groceryItem.deleteMany()
  await prisma.mealPlanEntry.deleteMany()
  await prisma.recipe.deleteMany()
  await prisma.tag.deleteMany()

  const tagCache = new Map<string, string>()
  async function tagId(name: string) {
    const slug = slugify(name)
    const cached = tagCache.get(slug)
    if (cached) return cached
    const tag = await prisma.tag.upsert({
      where: { slug },
      update: {},
      create: { name, slug, kind: TAG_KINDS[slug] ?? 'general' },
    })
    tagCache.set(slug, tag.id)
    return tag.id
  }

  const usedSlugs = new Set<string>()
  let imported = 0
  let flagged = 0

  for (const parsed of recipes) {
    const fix = corrections[parsed.title] ?? {}
    const title = fix.title ?? normaliseTitle(parsed.title)

    let slug = slugify(title)
    let n = 2
    while (usedSlugs.has(slug)) slug = `${slugify(title)}-${n++}`
    usedSlugs.add(slug)

    // A recipe is worth flagging only if the source genuinely lacked content —
    // not merely because the parser had to guess a sub-section's kind.
    const needsReview =
      parsed.ingredients.length === 0 || parsed.steps.length === 0

    const names = suggestTags(title, parsed.ingredients.map((i) => i.text), parsed.steps.map((s) => s.text))
    const tagIds = await Promise.all(names.map(tagId))

    await prisma.recipe.create({
      data: {
        title,
        slug,
        source: fix.source ?? 'Family Recipe Book',
        description: fix.description ?? null,
        notes: fix.notes ?? null,
        needsReview,
        searchText: buildSearchText({
          title,
          ingredients: parsed.ingredients.map((i) => i.text),
          tags: names,
          notes: fix.notes ?? null,
        }),
        ingredients: {
          create: parsed.ingredients.map((i, idx) => ({
            text: i.text,
            group: i.group,
            position: idx,
          })),
        },
        steps: {
          create: parsed.steps.map((s, idx) => ({
            text: s.text,
            group: s.group,
            position: idx,
          })),
        },
        tags: { create: tagIds.map((id) => ({ tagId: id })) },
      },
    })

    imported++
    if (needsReview) flagged++
  }

  const tagCount = await prisma.tag.count()
  console.log(`Imported ${imported} recipes (${flagged} flagged for review), ${tagCount} tags.`)
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
