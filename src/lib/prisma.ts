import { PrismaClient } from '@/generated/prisma/client'
import { createAdapter } from './db-schema'

/**
 * The single place a PrismaClient is constructed.
 *
 * Everything — app code, the seed script, one-off tooling — goes through this
 * factory, so the ORM and any raw SQL can never end up pointed at different
 * schemas. See db-schema.ts for why that matters.
 *
 * Construction is deferred until the first property access. `next build`
 * imports every route module to collect its config, and doing real work at
 * import time would mean the build needed DATABASE_URL — which it shouldn't,
 * since nothing is prerendered from the database. A missing URL should fail
 * the request that needs it, not the build.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export function createPrismaClient() {
  return new PrismaClient({ adapter: createAdapter() })
}

function getClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    const client = createPrismaClient()
    // In dev, hold it on globalThis so hot reloads don't leak connections.
    // In production the module is evaluated once anyway.
    globalForPrisma.prisma = client
  }
  return globalForPrisma.prisma
}

export const prisma: PrismaClient = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const client = getClient()
    const value = Reflect.get(client, prop) as unknown
    // Model delegates and methods must stay bound to the real client.
    return typeof value === 'function' ? value.bind(client) : value
  },
})
