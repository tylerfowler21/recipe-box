// Quick read-only dump of what's in the database. Handy after a re-seed.
import 'dotenv/config'
import { createPrismaClient } from '../src/lib/prisma'

async function main() {
  const p = createPrismaClient()
  const tags = await p.tag.findMany({
    include: { _count: { select: { recipes: true } } },
    orderBy: { name: 'asc' },
  })
  console.log('TAGS: ' + tags.map((t) => `${t.name}(${t._count.recipes})`).join('  '))
  console.log()
  const sample = await p.recipe.findMany({
    take: 10,
    include: { tags: { include: { tag: true } } },
    orderBy: { title: 'asc' },
  })
  for (const r of sample) {
    console.log(' -', r.title, '=>', r.tags.map((t) => t.tag.name).join(', '))
  }
  console.log()
  const flagged = await p.recipe.findMany({ where: { needsReview: true }, select: { title: true } })
  console.log(`FLAGGED (${flagged.length}): ` + flagged.map((f) => f.title).join(' | '))
  await p.$disconnect()
}
main()
