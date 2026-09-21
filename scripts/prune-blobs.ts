/**
 * Finds stored photos that no recipe points at, and optionally deletes them.
 *
 *   npx tsx scripts/prune-blobs.ts           # report only
 *   npx tsx scripts/prune-blobs.ts --apply   # actually delete
 *
 * Automatic cleanup in src/lib/blob.ts handles replaced and deleted photos from
 * now on; this exists for orphans that predate it, and as a safety net, since
 * that cleanup deliberately swallows its own failures rather than blocking a
 * save.
 *
 * Needs BLOB_READ_WRITE_TOKEN in .env — copy it from the Vercel project's
 * environment variables.
 */
import 'dotenv/config'
import { list, del } from '@vercel/blob'
import { createPrismaClient } from '../src/lib/prisma'
import { resolveBlobToken } from '../src/lib/blob'

const APPLY = process.argv.includes('--apply')

function bytes(n: number) {
  return n < 1024 * 1024 ? `${Math.round(n / 1024)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`
}

async function main() {
  const token = resolveBlobToken()
  if (!token) {
    console.error(
      'No Blob token found. Copy BLOB_READ_WRITE_TOKEN from the Vercel project\n' +
        'into .env (Settings -> Environment Variables) and run this again.',
    )
    process.exit(1)
  }

  const prisma = createPrismaClient()

  // Every photo any recipe currently points at.
  const referenced = new Set(
    (
      await prisma.recipe.findMany({
        where: { photoUrl: { not: null } },
        select: { photoUrl: true },
      })
    ).map((r) => r.photoUrl!),
  )

  // Walk the whole store; the API pages.
  const stored: { url: string; pathname: string; size: number; uploadedAt: Date }[] = []
  let cursor: string | undefined
  do {
    const page = await list({ token, cursor, limit: 500 })
    stored.push(...page.blobs)
    cursor = page.hasMore ? page.cursor : undefined
  } while (cursor)

  const orphans = stored.filter((b) => !referenced.has(b.url))
  const reclaimed = orphans.reduce((sum, b) => sum + b.size, 0)

  console.log(`recipes with a photo : ${referenced.size}`)
  console.log(`blobs in the store   : ${stored.length}`)
  console.log(`unreferenced         : ${orphans.length}  (${bytes(reclaimed)})`)

  if (orphans.length === 0) {
    console.log('\nNothing to clean up.')
    await prisma.$disconnect()
    return
  }

  console.log()
  for (const b of orphans) {
    console.log(`  ${b.pathname}  ${bytes(b.size)}  uploaded ${b.uploadedAt.toISOString().slice(0, 10)}`)
  }

  if (!APPLY) {
    console.log('\nDry run — nothing deleted. Re-run with --apply to remove these.')
    await prisma.$disconnect()
    return
  }

  await del(
    orphans.map((b) => b.url),
    { token },
  )
  console.log(`\nDeleted ${orphans.length} blob(s), reclaiming ${bytes(reclaimed)}.`)
  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
