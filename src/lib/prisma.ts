import { PrismaClient } from '@/generated/prisma/client'
import { createAdapter } from './db-schema'

/**
 * The single place a PrismaClient is constructed.
 *
 * Everything — app code, the seed script, one-off tooling — goes through this
 * factory, so the ORM and any raw SQL can never end up pointed at different
 * schemas. See db-schema.ts for why that matters.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export function createPrismaClient() {
  return new PrismaClient({ adapter: createAdapter() })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
