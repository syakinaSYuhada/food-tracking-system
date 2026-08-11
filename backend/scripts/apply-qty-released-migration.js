require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })
const fs = require('fs')
const path = require('path')
const { Client } = require('pg')

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set in backend/.env')
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL })
  const migrationPath = path.join(__dirname, '..', 'database', '2026_06_18_add_defects_qty_released.sql')
  const sql = fs.readFileSync(migrationPath, 'utf8')

  await client.connect()
  console.log('Applying migration: 2026_06_18_add_defects_qty_released.sql')
  await client.query(sql)

  const check = await client.query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'defects' AND column_name = 'qty_released'
  `)

  if (check.rows.length !== 1) {
    throw new Error('defects.qty_released column still missing after migration')
  }

  console.log('  OK  defects.qty_released column present')
  await client.end()
}

main().catch((error) => {
  console.error(`Migration failed: ${error.message}`)
  process.exit(1)
})
