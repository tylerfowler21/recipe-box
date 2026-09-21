import 'dotenv/config'
import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'npx tsx prisma/seed.ts',
  },
  // Prisma 7: the connection URL lives here, not in schema.prisma.
  datasource: {
    url: process.env['DATABASE_URL'],
  },
})
