import 'dotenv/config'
import { Client } from 'pg'

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()

  const cols = await client.query(
    `select column_name from information_schema.columns
     where table_name = 'Recipe' and column_name = 'sourceUrl'`,
  )
  console.log('Recipe.sourceUrl exists:', cols.rowCount === 1)

  const migs = await client.query(
    `select migration_name, finished_at, rolled_back_at, applied_steps_count
     from "_prisma_migrations" order by started_at`,
  )
  console.log('\nmigrations:')
  for (const r of migs.rows) {
    console.log(
      `  ${r.migration_name}  finished=${r.finished_at ? 'yes' : 'NO'}  rolledback=${r.rolled_back_at ? 'yes' : 'no'}  steps=${r.applied_steps_count}`,
    )
  }

  const locks = await client.query(
    `select l.pid, a.state, a.query_start, left(a.query, 60) as query
     from pg_locks l join pg_stat_activity a on a.pid = l.pid
     where l.locktype = 'advisory'`,
  )
  console.log('\nadvisory locks held:', locks.rowCount)
  for (const r of locks.rows) console.log(' ', r.pid, r.state, r.query)

  await client.end()
}
main()
