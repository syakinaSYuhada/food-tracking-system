require('dotenv').config()
const pool = require('../src/config/db')

async function main() {
  const month = '2026-01'
  const res = await pool.query(`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE ca_status = 'completed')::int AS pending_review,
      COUNT(*) FILTER (WHERE ca_status = 'assigned')::int AS assigned,
      COUNT(*) FILTER (WHERE ca_status = 'in_progress')::int AS in_progress,
      COUNT(*) FILTER (WHERE ca_status = 'verified')::int AS verified,
      COUNT(*) FILTER (
        WHERE ca_status IN ('assigned', 'in_progress', 'rejected')
          AND due_date < CURRENT_DATE
      )::int AS overdue
    FROM corrective_actions ca
    WHERE ca.created_at >= $1::date
      AND ca.created_at < ($1::date + INTERVAL '1 month')
  `, [`${month}-01`])

  console.log('January Corrective Actions KPI context:', res.rows[0])
  await pool.end()
}

main().catch(async (err) => {
  console.error(err)
  await pool.end()
  process.exit(1)
})
