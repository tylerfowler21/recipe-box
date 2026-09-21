// Checks that a revoked share link stops working, and that a bogus token 404s.
import 'dotenv/config'
import { createPrismaClient } from '../src/lib/prisma'

const BASE = 'http://localhost:3100'

async function status(token: string) {
  const res = await fetch(`${BASE}/share/${token}`, { redirect: 'manual' })
  return res.status
}

async function main() {
  const prisma = createPrismaClient()
  const link = await prisma.shareLink.findFirst({ where: { revokedAt: null } })
  if (!link) throw new Error('no active share link to test')

  console.log('active link          ->', await status(link.token))
  console.log('bogus token          ->', await status('not-a-real-token-at-all'))

  await prisma.shareLink.update({
    where: { id: link.id },
    data: { revokedAt: new Date() },
  })
  console.log('after revoke         ->', await status(link.token))

  // Put it back so the UI still has something to show.
  await prisma.shareLink.update({ where: { id: link.id }, data: { revokedAt: null } })
  console.log('after un-revoke      ->', await status(link.token))

  const fresh = await prisma.shareLink.findUnique({ where: { id: link.id } })
  console.log('view count recorded  ->', fresh?.viewCount)
  await prisma.$disconnect()
}
main()
