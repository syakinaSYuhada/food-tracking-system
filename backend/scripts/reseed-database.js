/**
 * Drop/recreate schema and load seed data.
 * Usage: node scripts/reseed-database.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })
const fs = require('fs')
const path = require('path')
const { Client } = require('pg')

async function runSqlFile(client, filePath, label) {
  const sql = fs.readFileSync(filePath, 'utf8')
  console.log(`Running ${label}...`)
  await client.query(sql)
  console.log(`  OK  ${label}`)
}

async function verifyProducts(client) {
  const result = await client.query(`
    SELECT product_code, product_name, size_weight, selling_price, loss_rate_per_unit
    FROM products
    WHERE product_code IN ('DD-060', 'DD-180', 'DSML-350')
    ORDER BY product_code
  `)

  console.log('\nRetail SKU check:')
  for (const row of result.rows) {
    console.log(
      `  ${row.product_code} | ${row.product_name} ${row.size_weight} | sell RM ${row.selling_price} | loss RM ${row.loss_rate_per_unit}`
    )
  }

  if (result.rows.length !== 3) {
    throw new Error(`Expected 3 retail SKUs, found ${result.rows.length}`)
  }
}

async function verifySchemaAndRules(client) {
  const lossStatus = await client.query(`
    SELECT conname, pg_get_constraintdef(oid) AS definition
    FROM pg_constraint
    WHERE conrelid = 'defects'::regclass
      AND conname = 'defects_loss_status_check'
  `)

  const definition = lossStatus.rows[0]?.definition || ''
  if (!definition.includes('pending_review') || !definition.includes('loss_confirmed')) {
    throw new Error('defects.loss_status constraint is not aligned with app enums')
  }

  const rules = await client.query(`SELECT COUNT(*)::int AS count FROM defect_workflow_rules`)
  if (rules.rows[0].count < 10) {
    throw new Error('defect_workflow_rules seed missing')
  }

  const taskColumn = await client.query(`
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'corrective_actions' AND column_name = 'task'
    LIMIT 1
  `)
  if (taskColumn.rows.length === 0) {
    throw new Error('corrective_actions.task column missing from schema')
  }

  const defectQtyReleased = await client.query(`
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'defects' AND column_name = 'qty_released'
    LIMIT 1
  `)
  if (defectQtyReleased.rows.length === 0) {
    throw new Error('defects.qty_released column missing from schema')
  }

  console.log('\nSchema alignment check:')
  console.log('  OK  loss_status enums match app')
  console.log(`  OK  ${rules.rows[0].count} defect workflow rules loaded`)
  console.log('  OK  corrective action task column present')
  console.log('  OK  defects.qty_released column present')
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set in backend/.env')
  }

  const client = new Client({ connectionString: process.env.DATABASE_URL })
  const dbDir = path.join(__dirname, '..', 'database')

  try {
    await client.connect()
    console.log('Connected to PostgreSQL\n')

    await runSqlFile(client, path.join(dbDir, 'schema.sql'), 'schema.sql')
    await runSqlFile(client, path.join(dbDir, 'seed.sql'), 'seed.sql')
    await runSqlFile(client, path.join(dbDir, 'seed_demo_timeline.sql'), 'seed_demo_timeline.sql')
    await runSqlFile(client, path.join(dbDir, 'seed_workflow_rules.sql'), 'seed_workflow_rules.sql')
    await verifyProducts(client)
    await verifySchemaAndRules(client)

    console.log('\nDatabase reseed completed successfully.')
    await client.end()
    process.exit(0)
  } catch (error) {
    console.error(`\nReseed failed: ${error.message}`)
    try {
      await client.end()
    } catch (closeError) {
      // ignore
    }
    process.exit(1)
  }
}

main()
