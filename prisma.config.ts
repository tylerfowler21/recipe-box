import 'dotenv/config'
import { defineConfig } from 'prisma/config'

/**
 * Migrations need a *direct* connection.
 *
 * Neon's pooled endpoint runs pgbouncer in transaction mode, which cannot hold
 * the session-level advisory lock Prisma Migrate takes — it fails with P1002
 * "Timed out trying to acquire a postgres advisory lock". The running app
 * should still use the pooled URL, so only the CLI (which is all this file
 * configures) is pointed at the direct endpoint.
 *
 * Neon's direct host is the pooled host without the "-pooler" suffix, so it can
 * be derived when DIRECT_DATABASE_URL isn't set explicitly.
 */
function migrationUrl(): string | undefined {
  const explicit = process.env.DIRECT_DATABASE_URL
  if (explicit) return explicit

  const pooled = process.env.DATABASE_URL
  if (!pooled) return undefined

  const url = new URL(pooled.replace('-pooler.', '.'))
  // Prisma's migration engine stalls on Neon's channel_binding parameter,
  // surfacing as a P1002 advisory-lock timeout rather than a connection error.
  // sslmode is preserved, so the connection is still encrypted.
  url.searchParams.delete('channel_binding')
  return url.toString()
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'npx tsx prisma/seed.ts',
  },
  datasource: {
    url: migrationUrl(),
  },
})
