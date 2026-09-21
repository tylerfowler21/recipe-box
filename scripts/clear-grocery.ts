// One-off: empty the shared grocery list.
import 'dotenv/config'
import { createPrismaClient } from '../src/lib/prisma'

async function main() {
  const prisma = createPrismaClient()
  const items = await prisma.groceryItem.findMany({
    orderBy: { createdAt: 'asc' },
    select: { text: true, sourceLabel: true, manual: true },
  })

  console.log(`Removing ${items.length} item(s):`)
  for (const i of items) {
    console.log(`  - ${i.text}${i.manual ? '  (added by hand)' : `  [from ${i.sourceLabel}]`}`)
  }

  const { count } = await prisma.groceryItem.deleteMany()
  console.log(`\nDeleted ${count}. Remaining: ${await prisma.groceryItem.count()}`)
  await prisma.$disconnect()
}
main()
