require('dotenv').config()
const pool = require('../src/config/db')

async function main() {
  const month = '2026-01'
  const res = await pool.query(`
    SELECT action_code, ca_status, due_date, created_at
    FROM corrective_actions ca
    WHERE ca_status IN ('assigned', 'in_progress', 'rejected')
      AND due_date < CURRENT_DATE
      AND ca.created_at >= $1::date
      AND ca.created_at < ($1::date + INTERVAL '1 month')
    ORDER BY action_code
  `, [`${month}-01`])

  console.log(`January overdue actions: ${res.rows.length}`)
  res.rows.forEach((row) => {
    console.log(`  ${row.action_code} | ${row.ca_status} | due ${String(row.due_date).split('T')[0]} | created ${String(row.created_at).split('T')[0]}`)
  })

  await pool.end()
  process.exit(res.rows.length === 3 ? 0 : 1)
}

main().catch(async (err) => {
  console.error(err)
  await pool.end()
  process.exit(1)
})
