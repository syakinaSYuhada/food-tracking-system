const defectRuleService = require('./defectRuleService')
const pool = require('../config/db')

async function getDefectTypesByStage(stage) {
  const rows = await defectRuleService.getDefectTypesByCategory(stage)
  return (rows || []).map((r) => r.defect_type)
}

async function getDefaultProblemLevel(defectType) {
  const rule = await defectRuleService.getRuleByDefectType(defectType)
  return rule?.default_problem_level || 'Hold for Review'
}

async function getRootCauseSources(/* stage, defectType */) {
  const result = await pool.query(`SELECT DISTINCT root_cause_source FROM root_causes ORDER BY root_cause_source`)
  return result.rows.map((r) => r.root_cause_source)
}

async function getRootCauseOptions(source) {
  const result = await pool.query(`SELECT root_cause_name FROM root_causes WHERE root_cause_source = $1 ORDER BY root_cause_name`, [source])
  return result.rows.map((r) => r.root_cause_name)
}

async function getRelatedToolOptions(defectType) {
  const rule = await defectRuleService.getRuleByDefectType(defectType)
  return rule?.related_tool_options || ['Not Applicable']
}

async function autoSelectTool(defectType, rootCause) {
  const related = await getRelatedToolOptions(defectType)
  if (!related || related.length === 0) return null
  const lc = String(rootCause || '').toLowerCase()
  for (const tool of related) {
    if (!tool) continue
    const t = String(tool).toLowerCase()
    if (lc && (t.includes(lc) || lc.includes(t))) return tool
  }
  return related[0] || null
}

module.exports = {
  getDefectTypesByStage,
  getDefaultProblemLevel,
  getRootCauseSources,
  getRootCauseOptions,
  getRelatedToolOptions,
  autoSelectTool
}
