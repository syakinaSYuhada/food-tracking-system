const pool = require('../config/db')

function normalizeOptionRows(rows) {
  return rows.reduce((acc, row) => {
    if (!acc[row.option_type]) acc[row.option_type] = []
    acc[row.option_type].push(row.option_value)
    return acc
  }, {})
}

async function getCategories() {
  const result = await pool.query(`
    SELECT DISTINCT detected_at_stage AS defect_category
    FROM defect_type_mappings
    ORDER BY detected_at_stage
  `)

  return result.rows.map((row) => row.defect_category)
}

async function isValidStageTypeMapping(stage, defectType, queryClient = pool) {
  const result = await queryClient.query(
    `
    SELECT 1
    FROM defect_type_mappings dtm
    JOIN defect_types dt ON dt.id = dtm.defect_type_id
    WHERE dtm.detected_at_stage = $1
      AND dt.defect_type_name = $2
      AND dt.is_active = TRUE
    LIMIT 1
    `,
    [stage, defectType]
  )

  return result.rows.length > 0
}

async function getDefectTypesByCategory(category) {
  const result = await pool.query(
    `
    SELECT
      dt.defect_type_name AS defect_type,
      dwr.default_problem_level,
      dwr.recommended_priority
    FROM defect_type_mappings dtm
    JOIN defect_types dt ON dt.id = dtm.defect_type_id
    LEFT JOIN defect_workflow_rules dwr ON dwr.defect_type = dt.defect_type_name
    WHERE dtm.detected_at_stage = $1
      AND dt.is_active = TRUE
    ORDER BY dt.defect_type_name
    `,
    [category]
  )

  return result.rows
}

async function getRuleByDefectType(defectType) {
  const ruleResult = await pool.query(
    `
    SELECT defect_type, default_problem_level, recommended_priority
    FROM defect_workflow_rules
    WHERE defect_type = $1 AND is_active = TRUE
    `,
    [defectType]
  )

  const fallbackResult = ruleResult.rows.length
    ? ruleResult
    : await pool.query(
      `
      SELECT defect_type, default_problem_level, recommended_priority
      FROM defect_workflow_rules
      WHERE defect_type = 'Other' AND is_active = TRUE
      `
    )

  if (fallbackResult.rows.length === 0) return null

  const selectedType = fallbackResult.rows[0].defect_type

  const optionsResult = await pool.query(
    `
    SELECT option_type, option_value
    FROM defect_workflow_options
    WHERE defect_type = $1 AND is_active = TRUE
    ORDER BY option_type, sort_order, option_value
    `,
    [selectedType]
  )

  const grouped = normalizeOptionRows(optionsResult.rows)

  return {
    ...fallbackResult.rows[0],
    product_handling_options: grouped.product_handling || [],
    machine_check_options: grouped.machine_check || [],
    corrective_action_options: grouped.machine_check || [],
    related_tool_options: grouped.related_tool || [],
    root_cause_options: grouped.root_cause || []
  }
}

async function getAllRules() {
  const rules = await pool.query(`
    SELECT defect_type, default_problem_level, recommended_priority
    FROM defect_workflow_rules
    WHERE is_active = TRUE
    ORDER BY defect_type
  `)

  const options = await pool.query(`
    SELECT defect_type, option_type, option_value
    FROM defect_workflow_options
    WHERE is_active = TRUE
    ORDER BY defect_type, option_type, sort_order, option_value
  `)

  const byDefect = {}
  rules.rows.forEach((rule) => {
    byDefect[rule.defect_type] = {
      ...rule,
      product_handling_options: [],
      machine_check_options: [],
      related_tool_options: [],
      root_cause_options: []
    }
  })

  options.rows.forEach((row) => {
    if (!byDefect[row.defect_type]) return
    if (row.option_type === 'product_handling') byDefect[row.defect_type].product_handling_options.push(row.option_value)
    if (row.option_type === 'machine_check') byDefect[row.defect_type].machine_check_options.push(row.option_value)
    if (row.option_type === 'related_tool') byDefect[row.defect_type].related_tool_options.push(row.option_value)
    if (row.option_type === 'root_cause') byDefect[row.defect_type].root_cause_options.push(row.option_value)
  })

  return Object.values(byDefect)
}

module.exports = {
  getStages: getCategories,
  getCategories,
  getDefectTypesByStage: getDefectTypesByCategory,
  getDefectTypesByCategory,
  isValidStageTypeMapping,
  getRuleByDefectType,
  getAllRules
}
