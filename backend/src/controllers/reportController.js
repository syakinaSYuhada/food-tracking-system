const pool = require('../config/db')
const { successResponse, errorResponse } = require('../middleware/responseHandler')
const { formatBatchDates } = require('../utils/dateFormatter')
const {
  parseReportPeriod,
  defectCreatedClause,
  actionCreatedClause,
  trendClause,
  periodLabel
} = require('../utils/reportPeriod')

function formatRows(rows) {
  return rows.map((row) => formatBatchDates(row))
}

function getPeriodContext(req) {
  const periodConfig = parseReportPeriod(req.query)
  return {
    periodConfig,
    defectPeriod: defectCreatedClause(periodConfig, 'd'),
    actionPeriod: actionCreatedClause(periodConfig, 'ca'),
    periodLabel: periodLabel(periodConfig)
  }
}

function periodFields(periodConfig, label) {
  return {
    period: periodConfig.period,
    month: periodConfig.month || null,
    period_label: label
  }
}

async function queryFinancialKpis(defectPeriod) {
  const result = await pool.query(`
    SELECT
      COALESCE(SUM(
        CASE WHEN d.defect_status != 'closed'
        THEN d.qty_on_hold * d.loss_rate_per_unit
        ELSE 0 END
      ), 0)::numeric(12,2) AS loss_at_risk,
      COALESCE(SUM(
        CASE WHEN d.defect_status != 'closed' AND d.qty_discarded > 0
        THEN d.estimated_loss
        ELSE 0 END
      ), 0)::numeric(12,2) AS pending_loss,
      COALESCE(SUM(
        CASE WHEN d.loss_status = 'loss_confirmed' OR d.defect_status = 'closed'
        THEN d.estimated_loss
        ELSE 0 END
      ), 0)::numeric(12,2) AS confirmed_loss
    FROM defects d
    WHERE ${defectPeriod}
  `)

  return result.rows[0]
}

async function getDashboardSummary(req, res) {
  try {
    const periodConfig = parseReportPeriod(req.query)
    const defectPeriod = defectCreatedClause(periodConfig, 'd')
    const actionPeriod = actionCreatedClause(periodConfig, 'ca')
    const trend = trendClause(periodConfig)

    const totalDefects = await pool.query(`
      SELECT COUNT(*)::int AS count
      FROM defects d
      WHERE ${defectPeriod}
    `)

    const openDefects = await pool.query(`
      SELECT COUNT(*)::int AS count
      FROM defects d
      WHERE defect_status IN ('new', 'under_review', 'action_assigned', 'in_progress', 'pending_verification', 'ready_verification')
        AND ${defectPeriod}
    `)

    const totalLoss = await pool.query(`
      SELECT COALESCE(SUM(d.estimated_loss), 0)::numeric(12,2) AS total
      FROM defects d
      WHERE ${defectPeriod}
    `)

    const openActions = await pool.query(`
      SELECT COUNT(*)::int AS count
      FROM corrective_actions ca
      WHERE ca_status IN ('assigned', 'in_progress', 'rejected')
        AND ${actionPeriod}
    `)

    const verifiedActions = await pool.query(`
      SELECT COUNT(*)::int AS count
      FROM corrective_actions ca
      WHERE ca_status = 'verified'
        AND ${actionPeriod}
    `)

    const pendingReviewActions = await pool.query(`
      SELECT COUNT(*)::int AS count
      FROM corrective_actions ca
      WHERE ca_status = 'completed'
        AND ${actionPeriod}
    `)

    const newReports = await pool.query(`
      SELECT COUNT(*)::int AS count
      FROM defects d
      WHERE defect_status = 'new'
        AND ${defectPeriod}
    `)

    const expiryMismatch = await pool.query(`
      SELECT COUNT(DISTINCT b.id)::int AS count
      FROM batches b
      JOIN defects d ON d.batch_id = b.id
      WHERE b.correct_expiry_date <> b.printed_expiry_date
        AND ${defectPeriod}
    `)

    const financialKpis = await queryFinancialKpis(defectPeriod)

    const topRootCause = await pool.query(`
      SELECT r.confirmed_root_cause, COUNT(*)::int AS count
      FROM root_cause_investigation r
      JOIN defects d ON d.id = r.defect_id
      WHERE r.root_cause_status = 'confirmed'
        AND ${defectPeriod}
      GROUP BY r.confirmed_root_cause
      ORDER BY count DESC
      LIMIT 1
    `)

    const defectsByType = await pool.query(`
      SELECT d.defect_type, COUNT(*)::int AS count
      FROM defects d
      WHERE ${defectPeriod}
      GROUP BY d.defect_type
      ORDER BY count DESC
    `)

    const actionsByStatus = await pool.query(`
      SELECT ca.ca_status, COUNT(*)::int AS count
      FROM corrective_actions ca
      WHERE ${actionPeriod}
      GROUP BY ca.ca_status
      ORDER BY ca.ca_status
    `)

    const lossByProduct = await pool.query(`
      SELECT p.product_name, COALESCE(SUM(d.estimated_loss), 0)::numeric(12,2) AS total_loss
      FROM products p
      LEFT JOIN defects d ON p.id = d.product_id AND ${defectPeriod}
      GROUP BY p.product_name
      HAVING COALESCE(SUM(d.estimated_loss), 0) > 0
      ORDER BY total_loss DESC
    `)

    const defectTrend = await pool.query(`
      SELECT
        ${trend.label} AS label,
        COUNT(*)::int AS value
      FROM defects d
      WHERE ${trend.filter}
      GROUP BY ${trend.bucket}, ${trend.label}
      ORDER BY ${trend.bucket}
    `)

    const latestDefects = await pool.query(`
      SELECT
        d.id,
        d.defect_code,
        d.defect_type,
        d.problem_level,
        d.defect_status,
        d.estimated_loss,
        p.product_name,
        b.batch_number,
        d.created_at
      FROM defects d
      JOIN products p ON d.product_id = p.id
      JOIN batches b ON d.batch_id = b.id
      WHERE ${defectPeriod}
      ORDER BY d.created_at DESC
      LIMIT 8
    `)

    return successResponse(
      res,
      {
        period: periodConfig.period,
        month: periodConfig.month || null,
        period_label: periodLabel(periodConfig),
        kpis: {
          total_defects: totalDefects.rows[0].count,
          open_defects: openDefects.rows[0].count,
          total_estimated_loss: totalLoss.rows[0].total,
          loss_at_risk: financialKpis.loss_at_risk,
          pending_loss: financialKpis.pending_loss,
          confirmed_loss: financialKpis.confirmed_loss,
          open_actions: openActions.rows[0].count,
          verified_actions: verifiedActions.rows[0].count,
          pending_review_actions: pendingReviewActions.rows[0].count,
          new_reports: newReports.rows[0].count,
          expiry_mismatch_batches: expiryMismatch.rows[0].count,
          top_root_cause: topRootCause.rows[0]?.confirmed_root_cause || 'Pending Investigation'
        },
        charts: {
          defects_by_type: defectsByType.rows,
          actions_by_status: actionsByStatus.rows,
          loss_by_product: lossByProduct.rows,
          trend: defectTrend.rows
        },
        latest_defects: latestDefects.rows
      },
      'Dashboard summary retrieved successfully'
    )
  } catch (error) {
    return errorResponse(res, error, 500, 'GET_DASHBOARD_SUMMARY_ERROR')
  }
}

async function getLossReport(req, res) {
  try {
    const { periodConfig, defectPeriod, periodLabel: label } = getPeriodContext(req)

    const result = await pool.query(`
      SELECT
        d.defect_code,
        p.product_name,
        b.batch_number,
        d.defect_type,
        d.problem_level,
        d.defect_status,
        d.qty_on_hold,
        d.qty_discarded,
        d.loss_rate_per_unit,
        CASE
          WHEN d.defect_status != 'closed'
          THEN (d.qty_on_hold * d.loss_rate_per_unit)::numeric(12,2)
          ELSE 0::numeric(12,2)
        END AS loss_at_risk,
        CASE
          WHEN d.defect_status != 'closed' AND d.qty_discarded > 0
          THEN d.estimated_loss
          ELSE 0::numeric(12,2)
        END AS pending_loss,
        CASE
          WHEN d.loss_status = 'loss_confirmed' OR d.defect_status = 'closed'
          THEN d.estimated_loss
          ELSE 0::numeric(12,2)
        END AS confirmed_loss,
        d.loss_status,
        d.loss_confirmed_date,
        d.created_at
      FROM defects d
      JOIN products p ON d.product_id = p.id
      JOIN batches b ON d.batch_id = b.id
      WHERE (
        d.estimated_loss > 0
        OR d.qty_discarded > 0
        OR (d.defect_status != 'closed' AND d.qty_on_hold > 0)
      )
        AND ${defectPeriod}
      ORDER BY d.created_at DESC
    `)

    const [kpiResult, financialKpis] = await Promise.all([
      pool.query(`
        SELECT
          COALESCE(SUM(d.estimated_loss), 0)::numeric(12,2) AS total_estimated_loss,
          COALESCE(SUM(d.qty_discarded), 0)::int AS units_discarded,
          COALESCE(SUM(d.qty_affected), 0)::int AS units_affected,
          COALESCE(AVG(NULLIF(d.estimated_loss, 0)), 0)::numeric(12,2) AS average_loss_per_case
        FROM defects d
        WHERE ${defectPeriod}
      `),
      queryFinancialKpis(defectPeriod)
    ])

    return successResponse(
      res,
      {
        ...periodFields(periodConfig, label),
        kpis: {
          ...kpiResult.rows[0],
          ...financialKpis
        },
        rows: formatRows(result.rows)
      },
      'Loss report retrieved successfully'
    )
  } catch (error) {
    return errorResponse(res, error, 500, 'GET_LOSS_REPORT_ERROR')
  }
}

async function getCorrectiveActionReport(req, res) {
  try {
    const { periodConfig, actionPeriod, periodLabel: label } = getPeriodContext(req)

    const kpiResult = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE ca_status != 'cancelled')::int AS actions_created,
        COUNT(*) FILTER (WHERE ca_status IN ('assigned', 'in_progress', 'rejected'))::int AS open_actions,
        COUNT(*) FILTER (WHERE ca_status = 'completed')::int AS completed_waiting_verification,
        COUNT(*) FILTER (WHERE ca_status = 'verified')::int AS verified_actions,
        COUNT(*) FILTER (WHERE due_date < CURRENT_DATE AND ca_status != 'verified' AND ca_status != 'cancelled')::int AS overdue_actions
      FROM corrective_actions ca
      WHERE ${actionPeriod}
    `)

    const statusResult = await pool.query(`
      SELECT ca.ca_status, COUNT(*)::int AS count
      FROM corrective_actions ca
      WHERE ${actionPeriod}
      GROUP BY ca.ca_status
      ORDER BY ca.ca_status
    `)

    const rowsResult = await pool.query(`
      SELECT
        ca.action_code,
        ca.ca_status,
        ca.priority,
        ca.due_date,
        ca.task,
        ca.containment_actions,
        ca.corrective_actions,
        d.defect_code,
        d.defect_type,
        p.product_name,
        b.batch_number,
        assigned.full_name AS assigned_to_name
      FROM corrective_actions ca
      JOIN defects d ON ca.defect_id = d.id
      JOIN products p ON d.product_id = p.id
      JOIN batches b ON d.batch_id = b.id
      LEFT JOIN users assigned ON ca.assigned_to = assigned.id
      WHERE ${actionPeriod}
      ORDER BY ca.created_at DESC
    `)

    const kpis = kpiResult.rows[0]
    const resolutionRate =
      Number(kpis.actions_created) === 0
        ? 0
        : Math.round((Number(kpis.verified_actions) / Number(kpis.actions_created)) * 100)

    return successResponse(
      res,
      {
        ...periodFields(periodConfig, label),
        kpis: {
          ...kpis,
          resolution_rate_percent: resolutionRate
        },
        status_breakdown: statusResult.rows,
        rows: formatRows(rowsResult.rows)
      },
      'Corrective action report retrieved successfully'
    )
  } catch (error) {
    return errorResponse(res, error, 500, 'GET_CORRECTIVE_ACTION_REPORT_ERROR')
  }
}

async function getRootCauseReport(req, res) {
  try {
    const { periodConfig, defectPeriod, periodLabel: label } = getPeriodContext(req)

    const kpiResult = await pool.query(`
      SELECT
        COUNT(*)::int AS total_investigations,
        COUNT(*) FILTER (WHERE r.root_cause_status = 'confirmed')::int AS confirmed_root_causes,
        COUNT(*) FILTER (WHERE r.root_cause_status = 'pending_investigation')::int AS pending_investigation,
        COUNT(*) FILTER (WHERE r.root_cause_status = 'suspected')::int AS suspected_root_causes
      FROM root_cause_investigation r
      JOIN defects d ON d.id = r.defect_id
      WHERE ${defectPeriod}
    `)

    const breakdownResult = await pool.query(`
      SELECT
        CASE
          WHEN r.root_cause_status = 'confirmed' THEN COALESCE(NULLIF(BTRIM(r.confirmed_root_cause), ''), 'Pending Investigation')
          WHEN r.root_cause_status = 'suspected' THEN COALESCE(NULLIF(BTRIM(r.suspected_root_cause), ''), 'Pending Investigation')
          ELSE COALESCE(NULLIF(BTRIM(r.suspected_root_cause), ''), 'Pending Investigation')
        END AS root_cause,
        COUNT(*) FILTER (WHERE r.root_cause_status = 'confirmed')::int AS confirmed,
        COUNT(*) FILTER (WHERE r.root_cause_status = 'suspected')::int AS suspected,
        COUNT(*) FILTER (WHERE r.root_cause_status = 'pending_investigation')::int AS pending_investigation,
        COUNT(*)::int AS total
      FROM root_cause_investigation r
      JOIN defects d ON d.id = r.defect_id
      WHERE ${defectPeriod}
      GROUP BY 1
      ORDER BY total DESC, root_cause ASC
    `)

    return successResponse(
      res,
      {
        ...periodFields(periodConfig, label),
        kpis: kpiResult.rows[0],
        breakdown: breakdownResult.rows
      },
      'Root cause report retrieved successfully'
    )
  } catch (error) {
    return errorResponse(res, error, 500, 'GET_ROOT_CAUSE_REPORT_ERROR')
  }
}

async function getExpiryIssueReport(req, res) {
  try {
    const { periodConfig, defectPeriod, periodLabel: label } = getPeriodContext(req)

    const result = await pool.query(`
      SELECT
        d.defect_code,
        p.product_name,
        b.batch_number,
        b.correct_expiry_date,
        b.printed_expiry_date,
        (b.correct_expiry_date - b.printed_expiry_date) AS difference_days,
        d.qty_affected,
        d.qty_relabelled,
        d.defect_status
      FROM defects d
      JOIN products p ON d.product_id = p.id
      JOIN batches b ON d.batch_id = b.id
      WHERE (d.defect_type = 'Wrong Expiry Date Printing'
         OR b.correct_expiry_date <> b.printed_expiry_date)
        AND ${defectPeriod}
      ORDER BY d.created_at DESC
    `)

    const kpiResult = await pool.query(`
      SELECT
        COUNT(*)::int AS wrong_expiry_cases,
        COALESCE(SUM(d.qty_relabelled), 0)::int AS units_to_relabel,
        COUNT(*) FILTER (WHERE d.defect_status IN ('ready_verification', 'closed'))::int AS resolved_cases,
        COUNT(*) FILTER (WHERE d.defect_status IN ('new', 'under_review', 'action_assigned', 'in_progress', 'pending_verification'))::int AS open_cases
      FROM defects d
      WHERE d.defect_type = 'Wrong Expiry Date Printing'
        AND ${defectPeriod}
    `)

    return successResponse(
      res,
      {
        ...periodFields(periodConfig, label),
        kpis: kpiResult.rows[0],
        rows: formatRows(result.rows)
      },
      'Expiry date issue report retrieved successfully'
    )
  } catch (error) {
    return errorResponse(res, error, 500, 'GET_EXPIRY_ISSUE_REPORT_ERROR')
  }
}

async function getDiscardedProductReport(req, res) {
  try {
    const { periodConfig, defectPeriod, periodLabel: label } = getPeriodContext(req)

    const result = await pool.query(`
      SELECT
        d.defect_code,
        p.product_name,
        b.batch_number,
        d.defect_type,
        d.problem_level,
        d.qty_discarded,
        d.loss_rate_per_unit,
        d.estimated_loss,
        d.loss_status,
        d.created_at
      FROM defects d
      JOIN products p ON d.product_id = p.id
      JOIN batches b ON d.batch_id = b.id
      WHERE d.qty_discarded > 0
        AND ${defectPeriod}
      ORDER BY d.created_at DESC
    `)

    const kpiResult = await pool.query(`
      SELECT
        COALESCE(SUM(d.qty_discarded), 0)::int AS units_discarded,
        COALESCE(SUM(d.estimated_loss), 0)::numeric(12,2) AS total_estimated_loss,
        COUNT(*) FILTER (WHERE d.problem_level = 'Food Safety Risk')::int AS food_safety_risk_cases,
        COUNT(DISTINCT d.product_id)::int AS affected_products
      FROM defects d
      WHERE d.qty_discarded > 0
        AND ${defectPeriod}
    `)

    return successResponse(
      res,
      {
        ...periodFields(periodConfig, label),
        kpis: kpiResult.rows[0],
        rows: formatRows(result.rows)
      },
      'Discarded product report retrieved successfully'
    )
  } catch (error) {
    return errorResponse(res, error, 500, 'GET_DISCARDED_PRODUCT_REPORT_ERROR')
  }
}

async function getByProductReport(req, res) {
  try {
    const { periodConfig, defectPeriod, periodLabel: label } = getPeriodContext(req)

    const result = await pool.query(`
      SELECT
        p.product_name,
        p.product_code,
        COUNT(d.id)::int AS total_defects,
        COUNT(d.id) FILTER (WHERE d.defect_status IN ('new', 'under_review', 'action_assigned', 'in_progress', 'pending_verification', 'ready_verification'))::int AS open_defects,
        COUNT(d.id) FILTER (WHERE d.defect_status = 'closed')::int AS closed_defects,
        COALESCE(SUM(d.qty_affected), 0)::int AS qty_affected,
        COALESCE(SUM(d.qty_discarded), 0)::int AS qty_discarded,
        COALESCE(SUM(d.estimated_loss), 0)::numeric(12,2) AS total_loss,
        COALESCE(SUM(
          CASE WHEN d.defect_status != 'closed'
          THEN d.qty_on_hold * d.loss_rate_per_unit
          ELSE 0 END
        ), 0)::numeric(12,2) AS loss_at_risk,
        COALESCE(SUM(
          CASE WHEN d.defect_status != 'closed' AND d.qty_discarded > 0
          THEN d.estimated_loss
          ELSE 0 END
        ), 0)::numeric(12,2) AS pending_loss,
        COALESCE(SUM(
          CASE WHEN d.loss_status = 'loss_confirmed' OR d.defect_status = 'closed'
          THEN d.estimated_loss
          ELSE 0 END
        ), 0)::numeric(12,2) AS confirmed_loss,
        COALESCE(
          (
            SELECT d2.defect_type
            FROM defects d2
            WHERE d2.product_id = p.id
              AND ${defectPeriod.replaceAll('d.', 'd2.')}
            GROUP BY d2.defect_type
            ORDER BY COUNT(*) DESC
            LIMIT 1
          ),
          'No Defect'
        ) AS most_common_defect
      FROM products p
      LEFT JOIN defects d ON p.id = d.product_id AND ${defectPeriod}
      GROUP BY p.id
      HAVING COUNT(d.id) > 0
      ORDER BY total_defects DESC
    `)

    return successResponse(
      res,
      {
        ...periodFields(periodConfig, label),
        rows: result.rows
      },
      'By product report retrieved successfully'
    )
  } catch (error) {
    return errorResponse(res, error, 500, 'GET_BY_PRODUCT_REPORT_ERROR')
  }
}

async function getByBatchReport(req, res) {
  try {
    const { periodConfig, defectPeriod, periodLabel: label } = getPeriodContext(req)

    const result = await pool.query(`
      SELECT
        b.batch_number,
        p.product_name,
        b.retort_date,
        b.correct_expiry_date,
        b.printed_expiry_date,
        b.batch_status,
        COUNT(d.id)::int AS defect_count,
        COUNT(d.id) FILTER (WHERE d.defect_status != 'closed')::int AS open_defects,
        COALESCE(SUM(d.qty_affected), 0)::int AS qty_affected,
        COALESCE(SUM(d.qty_on_hold), 0)::int AS qty_on_hold,
        COALESCE(SUM(d.qty_discarded), 0)::int AS qty_discarded,
        COALESCE(SUM(
          CASE WHEN d.defect_status != 'closed'
          THEN d.qty_on_hold * d.loss_rate_per_unit
          ELSE 0 END
        ), 0)::numeric(12,2) AS loss_at_risk,
        COALESCE(SUM(
          CASE WHEN d.defect_status != 'closed' AND d.qty_discarded > 0
          THEN d.estimated_loss
          ELSE 0 END
        ), 0)::numeric(12,2) AS pending_loss,
        COALESCE(SUM(
          CASE WHEN d.loss_status = 'loss_confirmed' OR d.defect_status = 'closed'
          THEN d.estimated_loss
          ELSE 0 END
        ), 0)::numeric(12,2) AS confirmed_loss,
        COALESCE(
          (
            SELECT d2.defect_type
            FROM defects d2
            WHERE d2.batch_id = b.id
              AND ${defectPeriod.replaceAll('d.', 'd2.')}
            GROUP BY d2.defect_type
            ORDER BY COUNT(*) DESC
            LIMIT 1
          ),
          'No Defect'
        ) AS main_defect_type
      FROM batches b
      JOIN products p ON b.product_id = p.id
      LEFT JOIN defects d ON b.id = d.batch_id AND ${defectPeriod}
      GROUP BY b.id, p.product_name
      HAVING COUNT(d.id) > 0
      ORDER BY defect_count DESC, b.retort_date DESC
    `)

    return successResponse(
      res,
      {
        ...periodFields(periodConfig, label),
        rows: formatRows(result.rows)
      },
      'By batch report retrieved successfully'
    )
  } catch (error) {
    return errorResponse(res, error, 500, 'GET_BY_BATCH_REPORT_ERROR')
  }
}

async function getDefectsByProcessStageReport(req, res) {
  try {
    const { periodConfig, defectPeriod, periodLabel: label } = getPeriodContext(req)

    const result = await pool.query(`
      SELECT
        d.detected_at_stage AS process_stage,
        COUNT(*)::int AS defect_count,
        COALESCE(SUM(d.qty_affected), 0)::int AS qty_affected
      FROM defects d
      WHERE ${defectPeriod}
      GROUP BY d.detected_at_stage
      ORDER BY defect_count DESC, d.detected_at_stage ASC
    `)

    const kpiResult = await pool.query(`
      SELECT
        COUNT(DISTINCT d.detected_at_stage)::int AS stages_with_defects,
        COUNT(*)::int AS total_defects,
        COALESCE(SUM(d.qty_affected), 0)::int AS total_qty_affected
      FROM defects d
      WHERE ${defectPeriod}
    `)

    return successResponse(
      res,
      {
        ...periodFields(periodConfig, label),
        kpis: kpiResult.rows[0],
        rows: formatRows(result.rows)
      },
      'Defects by process stage report retrieved successfully'
    )
  } catch (error) {
    return errorResponse(res, error, 500, 'GET_DEFECTS_BY_PROCESS_STAGE_REPORT_ERROR')
  }
}

async function getRootCauseByProcessAreaReport(req, res) {
  try {
    const { periodConfig, defectPeriod, periodLabel: label } = getPeriodContext(req)

    const result = await pool.query(`
      SELECT
        COALESCE(
          NULLIF(TRIM(r.confirmed_root_cause_source), ''),
          NULLIF(TRIM(r.suspected_root_cause_source), ''),
          'Not Specified'
        ) AS root_cause_area,
        r.root_cause_status AS status,
        COUNT(*)::int AS cases
      FROM root_cause_investigation r
      JOIN defects d ON d.id = r.defect_id
      WHERE ${defectPeriod}
      GROUP BY root_cause_area, r.root_cause_status
      ORDER BY cases DESC, root_cause_area ASC
    `)

    const kpiResult = await pool.query(`
      SELECT
        COUNT(*)::int AS total_investigations,
        COUNT(DISTINCT COALESCE(
          NULLIF(TRIM(r.confirmed_root_cause_source), ''),
          NULLIF(TRIM(r.suspected_root_cause_source), ''),
          'Not Specified'
        ))::int AS process_areas
      FROM root_cause_investigation r
      JOIN defects d ON d.id = r.defect_id
      WHERE ${defectPeriod}
    `)

    return successResponse(
      res,
      {
        ...periodFields(periodConfig, label),
        kpis: kpiResult.rows[0],
        rows: formatRows(result.rows)
      },
      'Root cause by process area report retrieved successfully'
    )
  } catch (error) {
    return errorResponse(res, error, 500, 'GET_ROOT_CAUSE_BY_PROCESS_AREA_REPORT_ERROR')
  }
}

async function getRelatedProcessToolReport(req, res) {
  try {
    const { periodConfig, defectPeriod, periodLabel: label } = getPeriodContext(req)

    const result = await pool.query(`
      WITH tool_cases AS (
        SELECT
          TRIM(r.related_tool_machine) AS related_process_tool,
          d.id AS defect_id,
          d.defect_type
        FROM root_cause_investigation r
        JOIN defects d ON d.id = r.defect_id
        WHERE r.related_tool_machine IS NOT NULL
          AND TRIM(r.related_tool_machine) <> ''
          AND ${defectPeriod}

        UNION

        SELECT
          TRIM(ca.related_tool_machine_checked) AS related_process_tool,
          d.id AS defect_id,
          d.defect_type
        FROM corrective_actions ca
        JOIN defects d ON d.id = ca.defect_id
        WHERE ca.related_tool_machine_checked IS NOT NULL
          AND TRIM(ca.related_tool_machine_checked) <> ''
          AND ${defectPeriod}
      )
      SELECT
        tc.related_process_tool,
        COUNT(DISTINCT tc.defect_id)::int AS cases,
        COALESCE(
          (
            SELECT tc2.defect_type
            FROM tool_cases tc2
            WHERE tc2.related_process_tool = tc.related_process_tool
            GROUP BY tc2.defect_type
            ORDER BY COUNT(*) DESC
            LIMIT 1
          ),
          'No Defect'
        ) AS most_common_defect
      FROM tool_cases tc
      GROUP BY tc.related_process_tool
      ORDER BY cases DESC, tc.related_process_tool ASC
    `)

    const kpiResult = await pool.query(`
      WITH tool_cases AS (
        SELECT TRIM(r.related_tool_machine) AS related_process_tool, d.id AS defect_id
        FROM root_cause_investigation r
        JOIN defects d ON d.id = r.defect_id
        WHERE r.related_tool_machine IS NOT NULL
          AND TRIM(r.related_tool_machine) <> ''
          AND ${defectPeriod}

        UNION

        SELECT TRIM(ca.related_tool_machine_checked) AS related_process_tool, d.id AS defect_id
        FROM corrective_actions ca
        JOIN defects d ON d.id = ca.defect_id
        WHERE ca.related_tool_machine_checked IS NOT NULL
          AND TRIM(ca.related_tool_machine_checked) <> ''
          AND ${defectPeriod}
      )
      SELECT
        COUNT(DISTINCT related_process_tool)::int AS tools_tracked,
        COUNT(DISTINCT defect_id)::int AS linked_defect_cases
      FROM tool_cases
    `)

    return successResponse(
      res,
      {
        ...periodFields(periodConfig, label),
        kpis: kpiResult.rows[0],
        rows: formatRows(result.rows)
      },
      'Related process and tool report retrieved successfully'
    )
  } catch (error) {
    return errorResponse(res, error, 500, 'GET_RELATED_PROCESS_TOOL_REPORT_ERROR')
  }
}

async function getBatchExpiryAuditReport(req, res) {
  try {
    const result = await pool.query(`
      SELECT
        b.id,
        b.batch_number,
        p.product_name,
        p.product_code,
        b.retort_date,
        b.production_date,
        b.correct_expiry_date,
        b.printed_expiry_date,
        (b.correct_expiry_date - b.printed_expiry_date) AS difference_days,
        b.batch_status,
        COUNT(DISTINCT d.id)::int AS defect_count,
        COUNT(DISTINCT d.id) FILTER (WHERE d.defect_status NOT IN ('closed'))::int AS open_defect_count
      FROM batches b
      JOIN products p ON b.product_id = p.id
      LEFT JOIN defects d ON d.batch_id = b.id
      WHERE b.correct_expiry_date IS NOT NULL
        AND b.printed_expiry_date IS NOT NULL
        AND b.correct_expiry_date <> b.printed_expiry_date
      GROUP BY b.id, p.id
      ORDER BY ABS(b.correct_expiry_date - b.printed_expiry_date) DESC, b.retort_date DESC
    `)

    const kpiResult = await pool.query(`
      SELECT
        COUNT(*)::int AS mismatch_batches,
        COUNT(*) FILTER (WHERE EXISTS (
          SELECT 1 FROM defects d
          WHERE d.batch_id = b.id AND d.defect_status NOT IN ('closed')
        ))::int AS batches_with_open_defects,
        COALESCE((
          SELECT COUNT(*)::int
          FROM defects d
          JOIN batches bx ON d.batch_id = bx.id
          WHERE bx.correct_expiry_date IS NOT NULL
            AND bx.printed_expiry_date IS NOT NULL
            AND bx.correct_expiry_date <> bx.printed_expiry_date
        ), 0) AS linked_defect_cases
      FROM batches b
      WHERE b.correct_expiry_date IS NOT NULL
        AND b.printed_expiry_date IS NOT NULL
        AND b.correct_expiry_date <> b.printed_expiry_date
    `)

    return successResponse(
      res,
      {
        kpis: kpiResult.rows[0],
        rows: formatRows(result.rows)
      },
      'Batch expiry audit report retrieved successfully'
    )
  } catch (error) {
    return errorResponse(res, error, 500, 'GET_BATCH_EXPIRY_AUDIT_REPORT_ERROR')
  }
}

module.exports = {
  getDashboardSummary,
  getLossReport,
  getCorrectiveActionReport,
  getRootCauseReport,
  getDefectsByProcessStageReport,
  getRootCauseByProcessAreaReport,
  getRelatedProcessToolReport,
  getExpiryIssueReport,
  getBatchExpiryAuditReport,
  getDiscardedProductReport,
  getByProductReport,
  getByBatchReport
}
