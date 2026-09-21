import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { PrismaClient } from '@/generated/prisma/client'

/**
 * The single place a PrismaClient is constructed.
 *
 * Everything — app code, seed scripts, one-off tooling — goes through this
 * factory. Prisma's query engine targets whatever the *adapter* was built with
 * and ignores the connection string's own routing hints, so having exactly one
 * construction site is what keeps the ORM and any raw SQL pointed at the same
 * database.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export function createPrismaClient() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is not set')
  return new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
