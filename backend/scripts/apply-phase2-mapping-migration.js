/**
 * Apply Phase 2 mapping cleanup to an existing database (non-destructive).
 * Usage: node scripts/apply-phase2-mapping-migration.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })
const fs = require('fs')
const path = require('path')
const { Client } = require('pg')

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set in backend/.env')
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL })
  const sqlPath = path.join(__dirname, '..', 'database', '2026_06_17_phase2_mapping_cleanup.sql')

  try {
    await client.connect()
    const sql = fs.readFileSync(sqlPath, 'utf8')
    console.log('Applying Phase 2 mapping migration...')
    await client.query(sql)
    console.log('Phase 2 mapping migration completed successfully.')
    await client.end()
    process.exit(0)
  } catch (error) {
    console.error(`Migration failed: ${error.message}`)
    try {
      await client.end()
    } catch (closeError) {
      // ignore
    }
    process.exit(1)
  }
}

main()
