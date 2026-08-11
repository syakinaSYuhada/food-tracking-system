/**
 * Recalculate correct_expiry_date for all batches from retort_date + shelf_life_months.
 * Usage: node scripts/fix-batch-expiry.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })
const { Pool } = require('pg')
const batchService = require('../src/services/batchService')
const { toDateOnlyString } = require('../src/utils/dateOnly')

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const client = await pool.connect()

  try {
    const result = await client.query(`
      SELECT b.id, b.batch_number, b.retort_date, b.correct_expiry_date, b.printed_expiry_date,
             p.shelf_life_months
      FROM batches b
      JOIN products p ON p.id = b.product_id
      ORDER BY b.id
    `)

    let updated = 0

    for (const row of result.rows) {
      const retortDate = toDateOnlyString(row.retort_date)
      const nextCorrect = batchService.calculateCorrectExpiryDate(retortDate, row.shelf_life_months)
      const currentCorrect = toDateOnlyString(row.correct_expiry_date)

      if (!nextCorrect || nextCorrect === currentCorrect) continue

      const printedDate = toDateOnlyString(row.printed_expiry_date)
      const batchStatus = batchService.determineBatchStatus(nextCorrect, printedDate)

      await client.query(
        `
        UPDATE batches
        SET correct_expiry_date = $1,
            batch_status = $2,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
        `,
        [nextCorrect, batchStatus, row.id]
      )

      console.log(`  fixed ${row.batch_number}: ${currentCorrect} -> ${nextCorrect}`)
      updated += 1
    }

    console.log(`\nDone. Updated ${updated} batch(es).`)
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
