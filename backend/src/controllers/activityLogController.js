const pool = require('../config/db')
const { successResponse, errorResponse } = require('../middleware/responseHandler')
const { parseReportPeriod, createdAtClause } = require('../utils/reportPeriod')

async function getActivityLogs(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20))
    const offset = (page - 1) * limit
    const values = []
    let where = 'WHERE 1=1'

    if (req.query.entity_type) {
      values.push(req.query.entity_type)
      where += ` AND al.entity_type = $${values.length}`
    }

    if (req.query.action_type) {
      values.push(req.query.action_type)
      where += ` AND al.action_type = $${values.length}`
    }

    if (req.query.user_id) {
      values.push(Number(req.query.user_id))
      where += ` AND al.user_id = $${values.length}`
    }

    if (req.query.search) {
      values.push(`%${String(req.query.search).trim()}%`)
      where += ` AND (
        al.description ILIKE $${values.length}
        OR al.action_type ILIKE $${values.length}
        OR al.entity_type ILIKE $${values.length}
        OR al.old_value ILIKE $${values.length}
        OR al.new_value ILIKE $${values.length}
        OR u.full_name ILIKE $${values.length}
      )`
    }

    if (req.query.period) {
      const periodConfig = parseReportPeriod(req.query)
      const dateClause = createdAtClause(periodConfig, 'al', {
        dateFrom: periodConfig.dateFrom,
        dateTo: periodConfig.dateTo
      })
      where += ` AND ${dateClause}`
    }

    const countResult = await pool.query(
      `
      SELECT COUNT(*)::int AS total
      FROM activity_logs al
      LEFT JOIN users u ON u.id = al.user_id
      ${where}
      `,
      values
    )

    const total = countResult.rows[0]?.total || 0
    const listValues = [...values, limit, offset]

    const result = await pool.query(
      `
      SELECT
        al.id,
        al.user_id,
        u.full_name AS user_name,
        u.role AS user_role,
        al.action_type,
        al.entity_type,
        al.entity_id,
        al.description,
        al.old_value,
        al.new_value,
        al.created_at
      FROM activity_logs al
      LEFT JOIN users u ON u.id = al.user_id
      ${where}
      ORDER BY al.created_at DESC, al.id DESC
      LIMIT $${listValues.length - 1}
      OFFSET $${listValues.length}
      `,
      listValues
    )

    return successResponse(res, {
      items: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit))
      }
    }, 'Activity logs retrieved successfully')
  } catch (error) {
    return errorResponse(res, error, 500, 'GET_ACTIVITY_LOGS_ERROR')
  }
}

module.exports = { getActivityLogs }
