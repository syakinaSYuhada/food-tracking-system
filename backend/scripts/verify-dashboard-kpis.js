/**
 * Prints expected dashboard KPIs per H1 2026 month (custom_month filter).
 * Usage: node scripts/verify-dashboard-kpis.js
 */
require('dotenv').config()
const pool = require('../src/config/db')

const months = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06']

function monthRange(month) {
  return `d.created_at >= '${month}-01'::date AND d.created_at < ('${month}-01'::date + INTERVAL '1 month')`
}

function caMonthRange(month) {
  return `ca.created_at >= '${month}-01'::date AND ca.created_at < ('${month}-01'::date + INTERVAL '1 month')`
}

async function main() {
  console.log('Expected dashboard KPIs (Period: Choose Month)\n')

  for (const month of months) {
    const defectPeriod = monthRange(month)
    const actionPeriod = caMonthRange(month)

    const totals = await pool.query(`
      SELECT
        COUNT(*)::int AS total_defects,
        COUNT(*) FILTER (WHERE defect_status IN ('new','under_review','action_assigned','in_progress','ready_verification'))::int AS open_defects
      FROM defects d WHERE ${defectPeriod}
    `)

    const openActions = await pool.query(`
      SELECT COUNT(*)::int AS count FROM corrective_actions ca
      WHERE ca_status IN ('assigned','in_progress','rejected')
        AND ${actionPeriod}
    `)

    const financial = await pool.query(`
      SELECT
        COALESCE(SUM(CASE WHEN d.defect_status != 'closed' THEN d.qty_on_hold * d.loss_rate_per_unit ELSE 0 END), 0)::numeric(12,2) AS loss_at_risk,
        COALESCE(SUM(CASE WHEN d.defect_status != 'closed' AND d.qty_discarded > 0 THEN d.estimated_loss ELSE 0 END), 0)::numeric(12,2) AS pending_loss,
        COALESCE(SUM(CASE WHEN d.loss_status = 'loss_confirmed' OR d.defect_status = 'closed' THEN d.estimated_loss ELSE 0 END), 0)::numeric(12,2) AS confirmed_loss
      FROM defects d WHERE ${defectPeriod}
    `)

    const expiry = await pool.query(`
      SELECT COUNT(DISTINCT b.id)::int AS count
      FROM defects d
      JOIN batches b ON b.id = d.batch_id
      WHERE ${defectPeriod}
        AND b.correct_expiry_date IS NOT NULL
        AND b.printed_expiry_date IS NOT NULL
        AND b.correct_expiry_date != b.printed_expiry_date
    `)

    const caStatus = await pool.query(`
      SELECT ca_status, COUNT(*)::int AS count
      FROM corrective_actions ca WHERE ${actionPeriod}
      GROUP BY ca_status ORDER BY ca_status
    `)

    const trend = await pool.query(`
      SELECT TO_CHAR(date_trunc('day', d.created_at), 'DD Mon') AS label, COUNT(*)::int AS count
      FROM defects d WHERE ${defectPeriod}
      GROUP BY date_trunc('day', d.created_at), TO_CHAR(date_trunc('day', d.created_at), 'DD Mon')
      ORDER BY date_trunc('day', d.created_at)
    `)

    const pendingReview = await pool.query(`
      SELECT COUNT(*)::int AS count FROM corrective_actions ca
      WHERE ca_status = 'completed' AND ${actionPeriod}
    `)

    const attention = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE defect_status = 'new')::int AS new_reports,
        COUNT(*) FILTER (WHERE defect_status != 'closed' AND priority IN ('urgent','critical'))::int AS urgent,
        COUNT(*) FILTER (WHERE defect_status != 'closed' AND review_due_date < CURRENT_DATE)::int AS review_overdue
      FROM defects d WHERE ${defectPeriod}
    `)

    const overdueActions = await pool.query(`
      SELECT COUNT(*)::int AS count FROM corrective_actions ca
      WHERE ca_status IN ('assigned','in_progress','rejected')
        AND due_date < CURRENT_DATE
        AND ${actionPeriod}
    `)

    const row = totals.rows[0]
    const fin = financial.rows[0]
    const att = attention.rows[0]

    console.log(`=== ${month} ===`)
    console.log(`Total Defects: ${row.total_defects}`)
    console.log(`Open Defects: ${row.open_defects}`)
    console.log(`Open Actions: ${openActions.rows[0].count}`)
    console.log(`Expiry Mismatches: ${expiry.rows[0].count}`)
    console.log(`Loss at Risk: RM ${Number(fin.loss_at_risk).toFixed(2)}`)
    console.log(`Pending Loss: RM ${Number(fin.pending_loss).toFixed(2)}`)
    console.log(`Confirmed Loss: RM ${Number(fin.confirmed_loss).toFixed(2)}`)
    console.log(`Pending Review CAs: ${pendingReview.rows[0].count}`)
    console.log(`Attention — new: ${att.new_reports}, urgent: ${att.urgent}, review overdue: ${att.review_overdue}, overdue actions: ${overdueActions.rows[0].count}`)
    console.log(`Defect trend days: ${trend.rows.map((t) => `${t.label}=${t.count}`).join(', ')}`)
    console.log(`CA status: ${caStatus.rows.map((s) => `${s.ca_status}=${s.count}`).join(', ')}`)
    console.log('')
  }

  await pool.end()
}

main().catch(async (err) => {
  console.error(err)
  await pool.end()
  process.exit(1)
})
