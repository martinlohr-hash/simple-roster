import 'dotenv/config'
import { Client } from 'pg'

async function main() {
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL
  if (!connectionString) throw new Error('DIRECT_URL/DATABASE_URL fehlt')

  const client = new Client({ connectionString })
  await client.connect()

  // Alle echten Tabellen im public-Schema einsammeln
  const { rows } = await client.query<{ tablename: string; rls: boolean }>(
    `SELECT c.relname AS tablename, c.relrowsecurity AS rls
     FROM pg_class c
     JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relkind = 'r'
     ORDER BY c.relname`
  )

  console.log(`Gefundene Tabellen im public-Schema: ${rows.length}`)
  for (const { tablename, rls } of rows) {
    if (rls) {
      console.log(`  • ${tablename}: RLS bereits aktiv – übersprungen`)
      continue
    }
    // ENABLE (nicht FORCE): postgres-Rolle (BYPASSRLS, via Prisma) bleibt unberührt,
    // anon/authenticated (PostgREST) wird ohne Policies komplett gesperrt.
    await client.query(`ALTER TABLE public."${tablename}" ENABLE ROW LEVEL SECURITY`)
    console.log(`  ✓ ${tablename}: RLS aktiviert`)
  }

  await client.end()
  console.log('Fertig.')
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
