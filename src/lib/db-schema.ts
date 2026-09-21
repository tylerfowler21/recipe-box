import { PrismaPg } from '@prisma/adapter-pg'

/**
 * Which Postgres schema this process reads and writes.
 *
 * Pointing a Prisma app at a non-default schema takes THREE separate settings,
 * each honoured by a different layer:
 *
 *   ?schema=<name>                  the Prisma CLI — where migrations land
 *   options=-c search_path=<name>   the pg driver — where RAW SQL lands
 *   new PrismaPg(cfg, { schema })   the query engine — where the ORM lands
 *
 * The third matters most and has no presence in the connection string at all:
 * Prisma emits fully qualified table names from the schema its ADAPTER was
 * built with, defaulting to "public". So an isolated URL is not isolation, and
 * `select current_schema()` can answer one thing while the next `create`
 * writes somewhere else. Building every client from this one factory is what
 * keeps the CLI, the driver and the ORM pointed at the same place.
 */
export const DATABASE_SCHEMA: string = process.env.DATABASE_SCHEMA?.trim() || 'public'

/** The adapter every entry point builds its client from, so all three agree. */
export function createAdapter(
  connectionString: string | undefined = process.env.DATABASE_URL,
): PrismaPg {
  if (!connectionString) throw new Error('DATABASE_URL is not set')
  return new PrismaPg({ connectionString }, { schema: DATABASE_SCHEMA })
}
