import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { query, pool } from './db.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function ensureMigrationsTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `)
}

async function getApplied() {
  const res = await query('SELECT id FROM migrations ORDER BY id ASC')
  return new Set(res.rows.map((r) => r.id))
}

async function applyMigration(id, sql) {
  await query('BEGIN')
  try {
    await query(sql)
    await query('INSERT INTO migrations (id) VALUES ($1)', [id])
    await query('COMMIT')
    console.log(`Applied migration ${id}`)
  } catch (e) {
    await query('ROLLBACK')
    throw e
  }
}

async function main() {
  const migrationsDir = path.resolve(__dirname, '..', 'migrations')
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => /^\d+_.+\.sql$/.test(f))
    .sort()

  await ensureMigrationsTable()
  const applied = await getApplied()

  for (const file of files) {
    if (applied.has(file)) continue
    const full = path.join(migrationsDir, file)
    const sql = fs.readFileSync(full, 'utf8')
    await applyMigration(file, sql)
  }

  console.log('Migrations complete')
}

main()
  .catch((e) => {
    console.error('Migration failed:', e?.message || e)
    process.exitCode = 1
  })
  .finally(async () => {
    await pool.end()
  })
