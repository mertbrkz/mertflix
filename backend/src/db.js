import pg from 'pg'
import { config } from './config.js'

const { Pool } = pg

function shouldUseSsl(url) {
  if (process.env.DATABASE_SSL === 'true') return true
  if (process.env.PGSSLMODE && String(process.env.PGSSLMODE).toLowerCase() === 'require') return true
  return /render\.com/i.test(url)
}

export const pool = new Pool({
  connectionString: config.databaseUrl,
  ...(shouldUseSsl(config.databaseUrl)
    ? {
        ssl: {
          // Render Postgres requires SSL; in managed environments a custom CA bundle isn't provided.
          rejectUnauthorized: false,
        },
      }
    : {}),
})

export async function query(text, params) {
  return pool.query(text, params)
}
