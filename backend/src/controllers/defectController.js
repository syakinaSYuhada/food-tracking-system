const pool = require('../config/db')
const { successResponse, errorResponse } = require('../middleware/responseHandler')
const { formatBatchDates, localTodayDateString } = require('../utils/dateFormatter')
const defectRuleService = require('../services/defectRuleService')
const rootCauseService = require('../services/rootCauseService')
const { determineLossStatus } = require('../services/lossService')
const {
  actorId,
  applyWorkerDefectListScope,
  assertWorkerDefectAccess
} = require('../utils/accessControl')
const { formatActionRow } = require('../utils/formatActionRow')

const DEFECT_PRIORITIES = ['low', 'medium', 'high', 'urgent', 'critical']

function todayDateString() {
  return localTodayDateString()
}

function parseOptionalDate(value) {
  if (value == null || value === '') return null
  const dateStr = String(value).split('T')[0]
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null
  return dateStr
}

function normalizeStoredReviewDueDate(value) {
  if (value == null || value === '') return null
  const parsed = parseOptionalDate(value)
  if (parsed) return parsed
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const year = value.getFullYear()
    const month = String(value.getMonth() + 1).padStart(2, '0')
    const day = String(value.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  return value
}

function resolveDefectPriority(priority, recommendedPriority) {
  const normalized = String(priority || recommendedPriority || 'medium').toLowerCase()
  return DEFECT_PRIORITIES.includes(normalized) ? normalized : 'medium'
}

function validateDefectUrgencyFields({ priority, reviewDueDate, urgencyReason }) {
  const parsedDate = parseOptionalDate(reviewDueDate)
  if (reviewDueDate != null && reviewDueDate !== '' && !parsedDate) {
    return { valid: false, message: 'Manager review due date must be a valid date', code: 'INVALID_REVIEW_DUE_DATE' }
  }

  if (parsedDate && parsedDate < todayDateString()) {
    return { valid: false, message: 'Manager review due date cannot be before today', code: 'INVALID_REVIEW_DUE_DATE' }
  }

  if (priority === 'urgent' && !String(urgencyReason || '').trim()) {
    return {
      valid: false,
      message: 'Please explain why this defect needs urgent manager review.',
      code: 'URGENCY_REASON_REQUIRED'
    }
  }

  return { valid: true, reviewDueDate: parsedDate, urgencyReason: String(urgencyReason || '').trim() || null }
}

function formatDefectRow(row) {
  const totalActions = Number(row.total_actions || 0)
  const verifiedActions = Number(row.verified_actions || 0)

  return {
    ...formatBatchDates(row),
    action_progress: totalActions > 0 ? `${verifiedActions}/${totalActions} verified` : 'No actions',
    total_actions: totalActions,
    completed_actions: Number(row.completed_actions || 0),
    verified_actions: verifiedActions,
    can_close:
      row.root_cause_status === 'confirmed' &&
      row.defect_status !== 'closed' &&
      (totalActions === 0 || verifiedActions === totalActions),
    created_at: row.created_at,
    updated_at: row.updated_at,
    closed_at: row.closed_at,
    confirmed_date: row.confirmed_date
  }
}

async function generateDefectCode(client = pool) {
  const result = await client.query(`
    SELECT defect_code
    FROM defects
    ORDER BY id DESC
    LIMIT 1
  `)

  if (result.rows.length === 0) return 'D001'

  const lastNumber = Number(String(result.rows[0].defect_code || '').replace('D', '')) || 0
  return `D${String(lastNumber + 1).padStart(3, '0')}`
}

async function getDefects(req, res) {
  try {
    const { query, workerId } = applyWorkerDefectListScope(req)
    const { status, product_id, batch_id, problem_level, search } = query
    const conditions = []
    const values = []

    if (status) {
      values.push(status)
      conditions.push(`d.defect_status = $${values.length}`)
    }
    if (product_id) {
      values.push(product_id)
      conditions.push(`d.product_id = $${values.length}`)
    }
    if (batch_id) {
      values.push(batch_id)
      conditions.push(`d.batch_id = $${values.length}`)
    }
    if (problem_level) {
      values.push(problem_level)
      conditions.push(`d.problem_level = $${values.length}`)
    }
    if (search) {
      values.push(`%${search}%`)
      conditions.push(`(
        d.defect_code ILIKE $${values.length}
        OR p.product_name ILIKE $${values.length}
        OR b.batch_number ILIKE $${values.length}
        OR d.defect_type ILIKE $${values.length}
      )`)
    }
    if (workerId) {
      values.push(workerId)
      conditions.push(`(
        d.created_by = $${values.length}
        OR EXISTS (
          SELECT 1
          FROM corrective_actions ca_worker
          WHERE ca_worker.defect_id = d.id
            AND ca_worker.assigned_to = $${values.length}
        )
      )`)
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    const result = await pool.query(
      `
      SELECT
        d.*,
        p.product_name,
        p.product_code,
        p.loss_rate_per_unit AS product_loss_rate,
        b.batch_number,
        b.production_date,
        b.retort_date,
        b.correct_expiry_date,
        b.printed_expiry_date,
        b.quantity_produced,
        r.root_cause_status,
        r.related_tool_machine,
        r.confirmed_root_cause,
        u.full_name AS reported_by_name,
        u.role AS reported_by_role,
        COALESCE(ca_stats.total_actions, 0) AS total_actions,
        COALESCE(ca_stats.completed_actions, 0) AS completed_actions,
        COALESCE(ca_stats.verified_actions, 0) AS verified_actions
      FROM defects d
      JOIN products p ON d.product_id = p.id
      JOIN batches b ON d.batch_id = b.id
      LEFT JOIN root_cause_investigation r ON d.id = r.defect_id
      LEFT JOIN users u ON d.created_by = u.id
      LEFT JOIN (
        SELECT
          defect_id,
          COUNT(*) FILTER (WHERE ca_status != 'cancelled') AS total_actions,
          COUNT(*) FILTER (WHERE ca_status IN ('completed','verified')) AS completed_actions,
          COUNT(*) FILTER (WHERE ca_status = 'verified') AS verified_actions
        FROM corrective_actions
        GROUP BY defect_id
      ) ca_stats ON ca_stats.defect_id = d.id
      ${whereClause}
      ORDER BY d.created_at DESC
      `,
      values
    )

    return successResponse(res, result.rows.map(formatDefectRow), 'Defects retrieved successfully')
  } catch (error) {
    return errorResponse(res, error, 500, 'GET_DEFECTS_ERROR')
  }
}

async function getDefectById(req, res) {
  try {
    const { id } = req.params

    const result = await pool.query(
      `
      SELECT
        d.*,
        p.product_name,
        p.product_code,
        p.category,
        p.packaging_type,
        p.size_weight,
        p.shelf_life_months,
        p.loss_rate_per_unit AS product_loss_rate,
        b.batch_number,
        b.production_date,
        b.retort_date,
        b.correct_expiry_date,
        b.printed_expiry_date,
        b.quantity_produced,
        b.batch_status,
        r.root_cause_status,
        r.suspected_root_cause_source,
        r.suspected_root_cause,
        r.related_tool_machine,
        r.confirmed_root_cause_source,
        r.confirmed_root_cause,
        r.confirmed_by,
        r.confirmed_date,
        r.investigation_notes,
        reported.full_name AS reported_by_name,
        reported.role AS reported_by_role,
        confirmed.full_name AS confirmed_by_name,
        COALESCE(ca_stats.total_actions, 0) AS total_actions,
        COALESCE(ca_stats.completed_actions, 0) AS completed_actions,
        COALESCE(ca_stats.verified_actions, 0) AS verified_actions
      FROM defects d
      JOIN products p ON d.product_id = p.id
      JOIN batches b ON d.batch_id = b.id
      LEFT JOIN root_cause_investigation r ON d.id = r.defect_id
      LEFT JOIN users reported ON d.created_by = reported.id
      LEFT JOIN users confirmed ON r.confirmed_by = confirmed.id
      LEFT JOIN (
        SELECT
          defect_id,
          COUNT(*) FILTER (WHERE ca_status != 'cancelled') AS total_actions,
          COUNT(*) FILTER (WHERE ca_status IN ('completed','verified')) AS completed_actions,
          COUNT(*) FILTER (WHERE ca_status = 'verified') AS verified_actions
        FROM corrective_actions
        GROUP BY defect_id
      ) ca_stats ON ca_stats.defect_id = d.id
      WHERE d.id = $1
      `,
      [id]
    )

    if (result.rows.length === 0) return errorResponse(res, 'Defect not found', 404, 'DEFECT_NOT_FOUND')

    if (!(await assertWorkerDefectAccess(req, res, id))) return

    const actionResult = await pool.query(
      `
      SELECT
        ca.*,
        assigned_to_user.full_name AS assigned_to_name,
        assigned_by_user.full_name AS assigned_by_name,
        started_user.full_name AS started_by_name,
        completed_user.full_name AS completed_by_name,
        verified_user.full_name AS verified_by_name,
        EXISTS (
          SELECT 1 FROM evidence e WHERE e.corrective_action_id = ca.id
        ) AS has_evidence
      FROM corrective_actions ca
      LEFT JOIN users assigned_to_user ON ca.assigned_to = assigned_to_user.id
      LEFT JOIN users assigned_by_user ON ca.assigned_by = assigned_by_user.id
      LEFT JOIN users started_user ON ca.started_by = started_user.id
      LEFT JOIN users completed_user ON ca.completed_by = completed_user.id
      LEFT JOIN users verified_user ON ca.verified_by = verified_user.id
      WHERE ca.defect_id = $1
      ORDER BY ca.created_at DESC
      `,
      [id]
    )

    const evidenceResult = await pool.query(
      `SELECT * FROM evidence WHERE defect_id = $1 ORDER BY created_at DESC`,
      [id]
    )

    return successResponse(
      res,
      {
        ...formatDefectRow(result.rows[0]),
        corrective_actions: actionResult.rows.map(formatActionRow),
        evidence: evidenceResult.rows
      },
      'Defect retrieved successfully'
    )
  } catch (error) {
    return errorResponse(res, error, 500, 'GET_DEFECT_ERROR')
  }
}

async function createDefect(req, res) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const {
      product_id,
      batch_id,
      detected_at_stage,
      defect_type,
      defect_type_other,
      problem_level,
      priority = 'medium',
      review_due_date,
      urgency_reason,
      description,
      qty_affected,
      containment_status = 'Segregated / On Hold',
      suggested_product_handling,
      suggested_machine_handling,
      related_tool_machine,
      investigation_notes,
      created_by
    } = req.body

    if (!product_id || !batch_id || !detected_at_stage || !defect_type || !problem_level || !description || !qty_affected) {
      await client.query('ROLLBACK')
      return errorResponse(res, 'Product, batch, detected stage, defect type, problem level, description, and quantity affected are required', 400, 'VALIDATION_ERROR')
    }

    const batchResult = await client.query(
      `
      SELECT b.*, p.loss_rate_per_unit
      FROM batches b
      JOIN products p ON b.product_id = p.id
      WHERE b.id = $1
      `,
      [batch_id]
    )

    if (batchResult.rows.length === 0) {
      await client.query('ROLLBACK')
      return errorResponse(res, 'Batch not found', 404, 'BATCH_NOT_FOUND')
    }

    const batch = batchResult.rows[0]
    if (Number(batch.product_id) !== Number(product_id)) {
      await client.query('ROLLBACK')
      return errorResponse(res, 'Product does not match batch', 400, 'MISMATCH_PRODUCT_BATCH')
    }

    const affected = Number(qty_affected)
    if (!Number.isInteger(affected) || affected <= 0) {
      await client.query('ROLLBACK')
      return errorResponse(res, 'Quantity affected must be a positive whole number', 400, 'INVALID_QUANTITY')
    }

    if (affected > Number(batch.quantity_produced)) {
      await client.query('ROLLBACK')
      return errorResponse(res, 'Quantity affected cannot exceed batch quantity produced', 400, 'QTY_EXCEEDS_BATCH')
    }

    const mappingValid = await defectRuleService.isValidStageTypeMapping(
      detected_at_stage,
      defect_type,
      client
    )
    if (!mappingValid) {
      await client.query('ROLLBACK')
      return errorResponse(
        res,
        'Defect type is not allowed for the selected process stage',
        400,
        'INVALID_STAGE_TYPE_MAPPING'
      )
    }

    if (defect_type === 'Other' && !String(defect_type_other || '').trim()) {
      await client.query('ROLLBACK')
      return errorResponse(
        res,
        'Please describe the defect when type is Other',
        400,
        'DEFECT_TYPE_OTHER_REQUIRED'
      )
    }

    const workflowRule = await defectRuleService.getRuleByDefectType(defect_type)
    const resolvedPriority = resolveDefectPriority(priority, workflowRule?.recommended_priority)
    const urgencyValidation = validateDefectUrgencyFields({
      priority: resolvedPriority,
      reviewDueDate: review_due_date,
      urgencyReason: urgency_reason
    })

    if (!urgencyValidation.valid) {
      await client.query('ROLLBACK')
      return errorResponse(res, urgencyValidation.message, 400, urgencyValidation.code)
    }

    const defectCode = await generateDefectCode(client)

    // Default new defects to 'new'; managers may optionally start in under_review later
    const defectStatus = 'new'
    const initialQtyOnHold = containment_status === 'No Hold Needed' ? 0 : affected

    const insertResult = await client.query(
      `
      INSERT INTO defects (
        defect_code,
        product_id,
        batch_id,
        detected_at_stage,
        defect_type,
        defect_type_other,
        mapping_status,
        problem_level,
        priority,
        review_due_date,
        urgency_reason,
        description,
        qty_affected,
        qty_relabelled,
        qty_repacked,
        qty_discarded,
        qty_on_hold,
        qty_reworked,
        still_sellable,
        loss_rate_per_unit,
        estimated_loss,
        loss_status,
        defect_status,
        containment_status,
        suggested_product_handling,
        suggested_machine_handling,
        created_by
      )
      VALUES ($1,$2,$3,$4,$5,$6,'mapped',$7,$8,$9,$10,$11,$12,0,0,0,$13,0,0,$14,0,'no_loss',$19,$15,$16,$17,$18)
      RETURNING *
      `,
      [
        defectCode,
        product_id,
        batch_id,
        detected_at_stage,
        defect_type,
        defect_type === 'Other' ? defect_type_other || null : null,
        problem_level,
        resolvedPriority,
        urgencyValidation.reviewDueDate,
        urgencyValidation.urgencyReason,
        description,
        affected,
        initialQtyOnHold,
        Number(batch.loss_rate_per_unit) || 0,
        containment_status,
        suggested_product_handling || null,
        suggested_machine_handling || null,
        actorId(req) || created_by || null,
        defectStatus
      ]
    )

    const defect = insertResult.rows[0]

    await client.query(
      `
      INSERT INTO root_cause_investigation (
        defect_id,
        root_cause_status,
        related_tool_machine,
        investigation_notes
      ) VALUES ($1, 'pending_investigation', $2, $3)
      ON CONFLICT (defect_id) DO UPDATE SET
        root_cause_status = 'pending_investigation',
        related_tool_machine = EXCLUDED.related_tool_machine,
        investigation_notes = EXCLUDED.investigation_notes,
        updated_at = CURRENT_TIMESTAMP
      `,
      [defect.id, related_tool_machine || null, investigation_notes || null]
    )

    const reporterId = actorId(req) || created_by || null
    const reporterName = req.user?.full_name || 'System'
    const actionType = req.user?.role === 'worker' ? 'REPORT_DEFECT' : 'CREATE_DEFECT'
    const actionDescription = req.user?.role === 'worker'
      ? `Defect ${defect.defect_code} reported by ${reporterName}.`
      : `Defect ${defect.defect_code} created by ${reporterName}.`

    await client.query(
      `
      INSERT INTO activity_logs (
        user_id,
        action_type,
        entity_type,
        entity_id,
        description,
        old_value,
        new_value
      )
      VALUES ($1, $2, 'defect', $3, $4, NULL, $5)
      `,
      [reporterId, actionType, defect.id, actionDescription, `Status: ${defectStatus}`]
    )

    await client.query('COMMIT')
    return successResponse(res, formatDefectRow(defect), 'Defect created successfully', 201)
  } catch (error) {
    await client.query('ROLLBACK')
    return errorResponse(res, error, 500, 'CREATE_DEFECT_ERROR')
  } finally {
    client.release()
  }
}

async function getStages(req, res) {
  try {
    const stages = await defectRuleService.getStages()
    return successResponse(res, stages, 'Stages retrieved successfully')
  } catch (error) {
    return errorResponse(res, error, 500, 'GET_STAGES_ERROR')
  }
}

async function getDefectTypesByStage(req, res) {
  try {
    const stage = req.params.stage || req.params.category

    const rows = await defectRuleService.getDefectTypesByStage(stage)

    return successResponse(res, rows.map((row) => row.defect_type), 'Defect types retrieved successfully')
  } catch (error) {
    return errorResponse(res, error, 500, 'GET_DEFECT_TYPES_ERROR')
  }
}

async function getWorkflowRulesByStage(req, res) {
  try {
    const stage = req.params.stage || req.params.category

    const rows = await defectRuleService.getDefectTypesByStage(stage)

    return successResponse(res, rows, 'Workflow rules retrieved successfully')
  } catch (error) {
    return errorResponse(res, error, 500, 'GET_DEFECT_TYPE_RULES_ERROR')
  }
}

async function getWorkflowRuleByType(req, res) {
  try {
    const { defectType } = req.params
    const rule = await defectRuleService.getRuleByDefectType(defectType)
    if (!rule) return errorResponse(res, 'Workflow rule not found', 404, 'RULE_NOT_FOUND')
    return successResponse(res, rule, 'Workflow rule retrieved successfully')
  } catch (error) {
    return errorResponse(res, error, 500, 'GET_WORKFLOW_RULE_ERROR')
  }
}

async function getRootCauseOptions(req, res) {
  try {
    const { defectType } = req.query
    if (!defectType) return errorResponse(res, 'defectType query parameter is required', 400, 'MISSING_DEFECT_TYPE')
    const rule = await defectRuleService.getRuleByDefectType(defectType)
    return successResponse(res, { rootCauseOptions: rule?.root_cause_options || [] }, 'Root cause options retrieved')
  } catch (error) {
    return errorResponse(res, error, 500, 'GET_ROOT_CAUSE_OPTIONS_ERROR')
  }
}

async function confirmRootCause(req, res) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { id } = req.params
    const {
      confirmed_root_cause,
      confirmed_root_cause_source,
      confirmed_by,
      investigation_notes,
      related_tool_machine
    } = req.body

    const investigation = await rootCauseService.confirmRootCauseForDefect(client, {
      defectId: Number(id),
      confirmedRootCause: confirmed_root_cause,
      confirmedRootCauseSource: confirmed_root_cause_source,
      relatedToolMachine: related_tool_machine,
      investigationNotes: investigation_notes,
      confirmedBy: actorId(req) || confirmed_by || null
    })

    await client.query('COMMIT')
    return successResponse(res, investigation, 'Root cause confirmed successfully')
  } catch (error) {
    await client.query('ROLLBACK')
    if (error.status) {
      return errorResponse(res, error.message, error.status, error.code)
    }
    return errorResponse(res, error, 500, 'CONFIRM_ROOT_CAUSE_ERROR')
  } finally {
    client.release()
  }
}

async function startReview(req, res) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { id } = req.params
    const reviewerId = actorId(req)

    const defectResult = await client.query(
      'SELECT id, defect_code, defect_status FROM defects WHERE id = $1',
      [id]
    )

    if (defectResult.rows.length === 0) {
      await client.query('ROLLBACK')
      return errorResponse(res, 'Defect not found', 404, 'DEFECT_NOT_FOUND')
    }

    const defect = defectResult.rows[0]

    if (defect.defect_status !== 'new') {
      await client.query('ROLLBACK')
      return successResponse(res, defect, 'Defect is already under review or past the new-report stage')
    }

    const updateResult = await client.query(
      `
      UPDATE defects
      SET defect_status = 'under_review',
          updated_by = $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
      `,
      [reviewerId, id]
    )

    const reviewerName = req.user?.full_name || 'Manager'

    await client.query(
      `
      INSERT INTO activity_logs (
        user_id,
        action_type,
        entity_type,
        entity_id,
        description,
        old_value,
        new_value
      )
      VALUES ($1, 'START_REVIEW', 'defect', $2, $3, $4, $5)
      `,
      [
        reviewerId,
        id,
        `Manager ${reviewerName} started review of ${defect.defect_code}.`,
        'Status: new',
        'Status: under_review'
      ]
    )

    await client.query('COMMIT')
    return successResponse(res, updateResult.rows[0], 'Defect review started')
  } catch (error) {
    await client.query('ROLLBACK')
    return errorResponse(res, error, 500, 'START_REVIEW_ERROR')
  } finally {
    client.release()
  }
}

async function closeDefect(req, res) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { id } = req.params
    const { closed_by } = req.body
    const closedBy = actorId(req) || closed_by || null

    const check = await client.query(
      `
      SELECT
        d.*,
        r.root_cause_status,
        COALESCE(ca_stats.total_actions,0) AS total_actions,
        COALESCE(ca_stats.verified_actions,0) AS verified_actions
      FROM defects d
      LEFT JOIN root_cause_investigation r ON r.defect_id = d.id
      LEFT JOIN (
        SELECT defect_id, COUNT(*) FILTER (WHERE ca_status != 'cancelled') AS total_actions, COUNT(*) FILTER (WHERE ca_status = 'verified') AS verified_actions
        FROM corrective_actions
        GROUP BY defect_id
      ) ca_stats ON ca_stats.defect_id = d.id
      WHERE d.id = $1
      `,
      [id]
    )

    if (check.rows.length === 0) {
      await client.query('ROLLBACK')
      return errorResponse(res, 'Defect not found', 404, 'DEFECT_NOT_FOUND')
    }

    const defect = check.rows[0]
    if (defect.defect_status === 'closed') {
      await client.query('ROLLBACK')
      return errorResponse(res, 'Defect is already closed', 400, 'DEFECT_CLOSED')
    }

    if (defect.root_cause_status !== 'confirmed') {
      await client.query('ROLLBACK')
      return errorResponse(res, 'Root cause must be confirmed before closing defect', 400, 'ROOT_CAUSE_NOT_CONFIRMED')
    }

    if (Number(defect.total_actions) > 0 && Number(defect.verified_actions) < Number(defect.total_actions)) {
      await client.query('ROLLBACK')
      return errorResponse(res, 'All corrective actions must be verified before closing defect', 400, 'ACTIONS_NOT_VERIFIED')
    }

    const lossStatus = determineLossStatus({
      qty_discarded: defect.qty_discarded,
      isVerifiedOrClosed: true
    })

    const result = await client.query(
      `
      UPDATE defects
      SET defect_status = 'closed',
          closed_by = $1,
          closed_at = CURRENT_TIMESTAMP,
          loss_status = $2,
          loss_confirmed_date = CASE WHEN $3::int > 0 THEN CURRENT_DATE ELSE loss_confirmed_date END,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *
      `,
      [closedBy, lossStatus, Number(defect.qty_discarded || 0), id]
    )

    await client.query(
      `
      INSERT INTO activity_logs (
        user_id,
        action_type,
        entity_type,
        entity_id,
        description,
        old_value,
        new_value
      )
      VALUES ($1, 'CLOSE_DEFECT', 'defect', $2, $3, $4, $5)
      `,
      [
        closedBy,
        id,
        `Defect ${defect.defect_code} closed by manager.`,
        `Status: ${defect.defect_status}`,
        'Status: closed'
      ]
    )

    await client.query('COMMIT')
    return successResponse(res, formatDefectRow(result.rows[0]), 'Defect closed successfully')
  } catch (error) {
    await client.query('ROLLBACK')
    return errorResponse(res, error, 500, 'CLOSE_DEFECT_ERROR')
  } finally {
    client.release()
  }
}

async function uploadDefectEvidence(req, res) {
  try {
    const { id } = req.params
    const { evidence_note, uploaded_by } = req.body

    const defectCheck = await pool.query('SELECT id FROM defects WHERE id = $1', [id])
    if (defectCheck.rows.length === 0) return errorResponse(res, 'Defect not found', 404, 'DEFECT_NOT_FOUND')

    if (!(await assertWorkerDefectAccess(req, res, id))) return

    if (!req.file) return errorResponse(res, 'Please upload a defect evidence photo.', 400, 'NO_FILE_UPLOADED')

    const result = await pool.query(
      `
      INSERT INTO evidence (defect_id, file_name, file_path, file_type, evidence_note, uploaded_by)
      VALUES ($1,$2,$3,$4,$5,$6)
      RETURNING *
      `,
      [id, req.file.originalname, `/uploads/evidence/${req.file.filename}`, req.file.mimetype, evidence_note || null, actorId(req) || uploaded_by || null]
    )

    return successResponse(res, result.rows[0], 'Defect evidence uploaded successfully', 201)
  } catch (error) {
    return errorResponse(res, error, 500, 'UPLOAD_DEFECT_EVIDENCE_ERROR')
  }
}

async function getDefectActivity(req, res) {
  try {
    const { id } = req.params

    if (!(await assertWorkerDefectAccess(req, res, id))) return

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
      WHERE
        (al.entity_type = 'defect' AND al.entity_id = $1)
        OR (
          al.entity_type = 'corrective_action'
          AND al.entity_id IN (SELECT id FROM corrective_actions WHERE defect_id = $1)
        )
      ORDER BY al.created_at DESC, al.id DESC
      LIMIT 50
      `,
      [id]
    )

    return successResponse(res, result.rows, 'Defect activity retrieved successfully')
  } catch (error) {
    return errorResponse(res, error, 500, 'GET_DEFECT_ACTIVITY_ERROR')
  }
}

async function updateDefectDetails(req, res) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { id } = req.params
    const managerId = actorId(req)
    const { priority, review_due_date, urgency_reason } = req.body

    const defectResult = await client.query(
      `
      SELECT id, defect_code, defect_status, priority, review_due_date, urgency_reason
      FROM defects
      WHERE id = $1
      `,
      [id]
    )

    if (defectResult.rows.length === 0) {
      await client.query('ROLLBACK')
      return errorResponse(res, 'Defect not found', 404, 'DEFECT_NOT_FOUND')
    }

    const defect = defectResult.rows[0]

    if (defect.defect_status === 'closed') {
      await client.query('ROLLBACK')
      return errorResponse(res, 'Cannot update details on a closed defect', 400, 'DEFECT_CLOSED')
    }

    const hasPriority = Object.prototype.hasOwnProperty.call(req.body, 'priority')
    const hasReviewDueDate = Object.prototype.hasOwnProperty.call(req.body, 'review_due_date')
    const hasUrgencyReason = Object.prototype.hasOwnProperty.call(req.body, 'urgency_reason')

    const mergedPriority = hasPriority ? resolveDefectPriority(priority) : defect.priority
    const mergedReviewDueDate = hasReviewDueDate
      ? review_due_date
      : normalizeStoredReviewDueDate(defect.review_due_date)
    const mergedUrgencyReason = hasUrgencyReason ? urgency_reason : defect.urgency_reason

    const urgencyValidation = validateDefectUrgencyFields({
      priority: mergedPriority,
      reviewDueDate: mergedReviewDueDate,
      urgencyReason: mergedUrgencyReason
    })

    if (!urgencyValidation.valid) {
      await client.query('ROLLBACK')
      return errorResponse(res, urgencyValidation.message, 400, urgencyValidation.code)
    }

    const nextReviewDueDate = urgencyValidation.reviewDueDate
    const nextUrgencyReason = urgencyValidation.urgencyReason

    function formatDateForLog(value) {
      if (value == null || value === '') return 'none'
      return normalizeStoredReviewDueDate(value) || String(value).split('T')[0]
    }

    const oldParts = []
    const newParts = []

    if (hasPriority && mergedPriority !== defect.priority) {
      oldParts.push(`priority: ${defect.priority}`)
      newParts.push(`priority: ${mergedPriority}`)
    }

    if (hasReviewDueDate && formatDateForLog(defect.review_due_date) !== formatDateForLog(nextReviewDueDate)) {
      oldParts.push(`review_due_date: ${formatDateForLog(defect.review_due_date)}`)
      newParts.push(`review_due_date: ${formatDateForLog(nextReviewDueDate)}`)
    }

    if (hasUrgencyReason && String(defect.urgency_reason || '').trim() !== String(nextUrgencyReason || '').trim()) {
      oldParts.push(`urgency_reason: ${defect.urgency_reason || 'none'}`)
      newParts.push(`urgency_reason: ${nextUrgencyReason || 'none'}`)
    }

    const updateResult = await client.query(
      `
      UPDATE defects
      SET priority = $1,
          review_due_date = $2,
          urgency_reason = $3,
          updated_by = $4,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING *
      `,
      [mergedPriority, nextReviewDueDate, nextUrgencyReason, managerId, id]
    )

    if (oldParts.length > 0) {
      await client.query(
        `
        INSERT INTO activity_logs (
          user_id,
          action_type,
          entity_type,
          entity_id,
          description,
          old_value,
          new_value
        )
        VALUES ($1, 'UPDATE_DEFECT_DETAILS', 'defect', $2, $3, $4, $5)
        `,
        [
          managerId,
          id,
          `Manager updated defect ${defect.defect_code} details.`,
          oldParts.join('; '),
          newParts.join('; ')
        ]
      )
    }

    await client.query('COMMIT')
    return successResponse(res, formatDefectRow(updateResult.rows[0]), 'Defect details updated successfully')
  } catch (error) {
    await client.query('ROLLBACK')
    return errorResponse(res, error, 500, 'UPDATE_DEFECT_DETAILS_ERROR')
  } finally {
    client.release()
  }
}

async function updateDefect(req, res) {
  return errorResponse(res, 'Use dedicated workflow endpoints instead of generic defect update for this version.', 405, 'GENERIC_UPDATE_DISABLED')
}

module.exports = {
  getDefects,
  getDefectById,
  getDefectActivity,
  createDefect,
  updateDefect,
  getStages,
  getDefectTypesByStage,
  getWorkflowRulesByStage,
  getWorkflowRuleByType,
  getRootCauseOptions,
  confirmRootCause,
  startReview,
  closeDefect,
  updateDefectDetails,
  uploadDefectEvidence
}
