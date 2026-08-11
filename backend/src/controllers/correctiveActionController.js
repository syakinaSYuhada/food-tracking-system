const pool = require('../config/db')
const { successResponse, errorResponse } = require('../middleware/responseHandler')
const { formatBatchDates } = require('../utils/dateFormatter')
const correctiveActionService = require('../services/correctiveActionService')
const {
  calculateEstimatedLoss,
  calculateStillSellable,
  calculateQtyOnHold,
  clampNonNegative,
  determineLossStatus,
  validateCumulativeHandledQuantities
} = require('../services/lossService')
const {
  actorId,
  applyWorkerActionListScope,
  assertWorkerActionAccess
} = require('../utils/accessControl')

function formatActionRow(row) {
  return {
    ...formatBatchDates(row),
    status_explanation: correctiveActionService.getStatusExplanation(row.ca_status)
  }
}

async function generateActionCode(client = pool) {
  const result = await client.query(`
    SELECT action_code
    FROM corrective_actions
    ORDER BY id DESC
    LIMIT 1
  `)
  if (result.rows.length === 0) return 'CA001'
  const lastNumber = Number(String(result.rows[0].action_code || '').replace('CA', '')) || 0
  return `CA${String(lastNumber + 1).padStart(3, '0')}`
}

async function actionHasEvidence(client, actionId) {
  const result = await client.query(
    'SELECT 1 FROM evidence WHERE corrective_action_id = $1 LIMIT 1',
    [actionId]
  )
  return result.rows.length > 0
}

async function assertRequiredEvidence(client, res, action) {
  if (!action.evidence_required) return true

  const hasEvidence = await actionHasEvidence(client, action.id)
  if (hasEvidence) return true

  await client.query('ROLLBACK')
  errorResponse(
    res,
    'Evidence is required before this corrective action can be completed or verified',
    400,
    'EVIDENCE_REQUIRED'
  )
  return false
}

async function refreshDefectStatus(client, defectId, userId = null) {
  const result = await client.query(
    `
    SELECT
      COUNT(*) FILTER (WHERE ca_status != 'cancelled') AS total_actions,
      COUNT(*) FILTER (WHERE ca_status IN ('completed','verified')) AS completed_actions,
      COUNT(*) FILTER (WHERE ca_status = 'verified') AS verified_actions,
      COUNT(*) FILTER (WHERE ca_status = 'in_progress') AS in_progress_actions
    FROM corrective_actions
    WHERE defect_id = $1
    `,
    [defectId]
  )

  const stats = result.rows[0]
  const total = Number(stats.total_actions || 0)
  const submitted = Number(stats.completed_actions || 0)
  const verified = Number(stats.verified_actions || 0)
  const inProgress = Number(stats.in_progress_actions || 0)

  let status = 'under_review'
  if (total === 0) status = 'under_review'
  else if (verified === total) status = 'ready_verification'
  else if (submitted === total) status = 'ready_verification'
  else if (inProgress > 0 || submitted > 0) status = 'in_progress'
  else status = 'action_assigned'

  await client.query(
    `UPDATE defects SET defect_status = $1, updated_by = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3`,
    [status, userId, defectId]
  )

  return status
}

async function syncDefectHandlingTotals(client, defectId, userId = null) {
  const defectResult = await client.query(
    `
    SELECT
      qty_affected,
      qty_relabelled,
      qty_repacked,
      qty_reworked,
      qty_released,
      qty_discarded,
      estimated_loss
    FROM defects
    WHERE id = $1
    `,
    [defectId]
  )

  if (defectResult.rows.length === 0) return

  const defect = defectResult.rows[0]
  const qtyOnHold = calculateQtyOnHold(defect)
  const stillSellable = calculateStillSellable(defect)
  const lossStatus = determineLossStatus({
    qty_discarded: defect.qty_discarded,
    isVerifiedOrClosed: false
  })

  await client.query(
    `
    UPDATE defects
    SET qty_on_hold = $1,
        still_sellable = $2,
        loss_status = $3,
        updated_by = $4,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $5
    `,
    [qtyOnHold, stillSellable, lossStatus, userId, defectId]
  )
}

async function rollbackProductHandlingFromDefect(client, action, userId = null) {
  const defectResult = await client.query(
    `
    SELECT
      qty_affected,
      qty_relabelled,
      qty_repacked,
      qty_reworked,
      qty_released,
      qty_discarded,
      estimated_loss
    FROM defects
    WHERE id = $1
    `,
    [action.defect_id]
  )

  if (defectResult.rows.length === 0) return

  const defect = defectResult.rows[0]
  const nextRelabelled = clampNonNegative(Number(defect.qty_relabelled) - Number(action.qty_relabelled || 0))
  const nextRepacked = clampNonNegative(Number(defect.qty_repacked) - Number(action.qty_repacked || 0))
  const nextReworked = clampNonNegative(Number(defect.qty_reworked) - Number(action.qty_reworked || 0))
  const nextReleased = clampNonNegative(Number(defect.qty_released) - Number(action.qty_released || 0))
  const nextDiscarded = clampNonNegative(Number(defect.qty_discarded) - Number(action.qty_discarded || 0))
  const nextEstimatedLoss = clampNonNegative(Number(defect.estimated_loss) - Number(action.calculated_loss || 0))

  await client.query(
    `
    UPDATE defects
    SET qty_relabelled = $1,
        qty_repacked = $2,
        qty_reworked = $3,
        qty_released = $4,
        qty_discarded = $5,
        estimated_loss = $6,
        updated_by = $7,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $8
    `,
    [
      nextRelabelled,
      nextRepacked,
      nextReworked,
      nextReleased,
      nextDiscarded,
      nextEstimatedLoss,
      userId,
      action.defect_id
    ]
  )

  await syncDefectHandlingTotals(client, action.defect_id, userId)
}

async function getCorrectiveActions(req, res) {
  try {
    const scopedQuery = applyWorkerActionListScope(req)
    const { status, assigned_to, defect_id, action_type, batch_id } = scopedQuery
    const conditions = []
    const values = []

    if (status) {
      values.push(status)
      conditions.push(`ca.ca_status = $${values.length}`)
    }
    if (assigned_to) {
      values.push(assigned_to)
      conditions.push(`ca.assigned_to = $${values.length}`)
    }
    if (defect_id) {
      values.push(defect_id)
      conditions.push(`ca.defect_id = $${values.length}`)
    }
    if (action_type) {
      values.push(action_type)
      conditions.push(`ca.action_type = $${values.length}`)
    }
    if (batch_id) {
      values.push(batch_id)
      conditions.push(`d.batch_id = $${values.length}`)
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    const result = await pool.query(
      `
      SELECT
        ca.*,
        d.defect_code,
        d.defect_type,
        d.problem_level,
        d.defect_status,
        d.qty_affected,
        p.product_name,
        p.product_code,
        b.id AS batch_id,
        b.batch_number,
        b.production_date,
        b.retort_date,
        b.correct_expiry_date,
        b.printed_expiry_date,
        b.quantity_produced,
        assigned_to_user.full_name AS assigned_to_name,
        assigned_by_user.full_name AS assigned_by_name,
        started_user.full_name AS started_by_name,
        completed_user.full_name AS completed_by_name,
        verified_user.full_name AS verified_by_name,
        rejected_user.full_name AS rejected_by_name
      FROM corrective_actions ca
      JOIN defects d ON ca.defect_id = d.id
      JOIN products p ON d.product_id = p.id
      JOIN batches b ON d.batch_id = b.id
      LEFT JOIN users assigned_to_user ON ca.assigned_to = assigned_to_user.id
      LEFT JOIN users assigned_by_user ON ca.assigned_by = assigned_by_user.id
      LEFT JOIN users started_user ON ca.started_by = started_user.id
      LEFT JOIN users completed_user ON ca.completed_by = completed_user.id
      LEFT JOIN users verified_user ON ca.verified_by = verified_user.id
      LEFT JOIN users rejected_user ON ca.rejected_by = rejected_user.id
      ${whereClause}
      ORDER BY ca.created_at DESC
      `,
      values
    )

    return successResponse(res, result.rows.map(formatActionRow), 'Corrective actions retrieved successfully')
  } catch (error) {
    return errorResponse(res, error, 500, 'GET_CORRECTIVE_ACTIONS_ERROR')
  }
}

async function getCorrectiveActionById(req, res) {
  try {
    const { id } = req.params

    const result = await pool.query(
      `
      SELECT
        ca.*,
        d.defect_code,
        d.defect_type,
        d.problem_level,
        d.description AS defect_description,
        d.defect_status,
        d.qty_affected,
        d.qty_relabelled AS defect_qty_relabelled,
        d.qty_repacked AS defect_qty_repacked,
        d.qty_discarded AS defect_qty_discarded,
        d.qty_on_hold AS defect_qty_on_hold,
        d.qty_reworked AS defect_qty_reworked,
        d.estimated_loss AS defect_estimated_loss,
        d.loss_status,
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
        r.confirmed_root_cause,
        assigned_to_user.full_name AS assigned_to_name,
        assigned_by_user.full_name AS assigned_by_name,
        started_user.full_name AS started_by_name,
        completed_user.full_name AS completed_by_name,
        verified_user.full_name AS verified_by_name,
        rejected_user.full_name AS rejected_by_name
      FROM corrective_actions ca
      JOIN defects d ON ca.defect_id = d.id
      JOIN products p ON d.product_id = p.id
      JOIN batches b ON d.batch_id = b.id
      LEFT JOIN root_cause_investigation r ON d.id = r.defect_id
      LEFT JOIN users assigned_to_user ON ca.assigned_to = assigned_to_user.id
      LEFT JOIN users assigned_by_user ON ca.assigned_by = assigned_by_user.id
      LEFT JOIN users started_user ON ca.started_by = started_user.id
      LEFT JOIN users completed_user ON ca.completed_by = completed_user.id
      LEFT JOIN users verified_user ON ca.verified_by = verified_user.id
      LEFT JOIN users rejected_user ON ca.rejected_by = rejected_user.id
      WHERE ca.id = $1
      `,
      [id]
    )

    if (result.rows.length === 0) return errorResponse(res, 'Corrective action not found', 404, 'CORRECTIVE_ACTION_NOT_FOUND')

    if (!(await assertWorkerActionAccess(req, res, id))) return

    const evidenceResult = await pool.query(
      `SELECT * FROM evidence WHERE corrective_action_id = $1 ORDER BY created_at DESC`,
      [id]
    )

    return successResponse(res, { ...formatActionRow(result.rows[0]), evidence: evidenceResult.rows }, 'Corrective action retrieved successfully')
  } catch (error) {
    return errorResponse(res, error, 500, 'GET_CORRECTIVE_ACTION_ERROR')
  }
}

async function assignCorrectiveAction(req, res) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { defectId } = req.params
    const {
      action_type,
      task,
      description,
      assigned_to,
      due_date,
      evidence_required = false,
      priority = 'medium'
    } = req.body
    const assignedBy = actorId(req)

    if (!action_type || !task || !assigned_to) {
      await client.query('ROLLBACK')
      return errorResponse(res, 'Action type, task, and assigned to are required', 400, 'VALIDATION_ERROR')
    }

    if (!['product_handling', 'machine_process_check'].includes(action_type)) {
      await client.query('ROLLBACK')
      return errorResponse(res, 'Invalid action type', 400, 'INVALID_ACTION_TYPE')
    }

    const defectResult = await client.query('SELECT id, defect_status FROM defects WHERE id = $1', [defectId])
    if (defectResult.rows.length === 0) {
      await client.query('ROLLBACK')
      return errorResponse(res, 'Defect not found', 404, 'DEFECT_NOT_FOUND')
    }

    if (defectResult.rows[0].defect_status === 'closed') {
      await client.query('ROLLBACK')
      return errorResponse(res, 'Cannot assign actions to a closed defect', 400, 'DEFECT_CLOSED')
    }

    const workerResult = await client.query('SELECT id, role, full_name FROM users WHERE id = $1', [assigned_to])
    if (workerResult.rows.length === 0) {
      await client.query('ROLLBACK')
      return errorResponse(res, 'Assigned user not found', 404, 'ASSIGNEE_NOT_FOUND')
    }

    const actionCode = await generateActionCode(client)
    const containmentActions = action_type === 'product_handling' ? task : null
    const correctiveActions = action_type === 'machine_process_check' ? task : null

    const result = await client.query(
      `
      INSERT INTO corrective_actions (
        action_code,
        defect_id,
        action_type,
        task,
        action_description,
        containment_actions,
        corrective_actions,
        assigned_to,
        assigned_by,
        due_date,
        evidence_required,
        priority,
        ca_status
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'assigned')
      RETURNING *
      `,
      [
        actionCode,
        defectId,
        action_type,
        task,
        description || null,
        containmentActions,
        correctiveActions,
        assigned_to,
        assignedBy,
        due_date || null,
        Boolean(evidence_required),
        String(priority || 'medium').toLowerCase()
      ]
    )

    await refreshDefectStatus(client, defectId, assignedBy)

    const assigneeName = workerResult.rows[0].full_name || 'worker'

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
      VALUES ($1, 'ASSIGN_CORRECTIVE_ACTION', 'corrective_action', $2, $3, NULL, $4)
      `,
      [
        assignedBy,
        result.rows[0].id,
        `Corrective action ${actionCode} assigned to ${assigneeName}.`,
        'Status: assigned'
      ]
    )

    await client.query('COMMIT')
    return successResponse(res, result.rows[0], 'Corrective action assigned successfully', 201)
  } catch (error) {
    await client.query('ROLLBACK')
    return errorResponse(res, error, 500, 'ASSIGN_CORRECTIVE_ACTION_ERROR')
  } finally {
    client.release()
  }
}

async function startCorrectiveAction(req, res) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { id } = req.params
    const { started_by } = req.body

    const actionResult = await client.query(
      `
      SELECT ca.*, d.defect_status
      FROM corrective_actions ca
      JOIN defects d ON ca.defect_id = d.id
      WHERE ca.id = $1
      `,
      [id]
    )
    if (actionResult.rows.length === 0) {
      await client.query('ROLLBACK')
      return errorResponse(res, 'Corrective action not found', 404, 'CORRECTIVE_ACTION_NOT_FOUND')
    }

    const action = actionResult.rows[0]
    if (Number(action.assigned_to) !== Number(req.user.id)) {
      await client.query('ROLLBACK')
      return errorResponse(res, 'Only the assigned worker can start this action', 403, 'ACCESS_DENIED')
    }

    if (action.defect_status === 'closed') {
      await client.query('ROLLBACK')
      return errorResponse(res, 'Cannot update actions on a closed defect', 400, 'DEFECT_CLOSED')
    }

    if (!correctiveActionService.canStartAction(action.ca_status)) {
      await client.query('ROLLBACK')
      return errorResponse(res, `Action cannot be started from status: ${action.ca_status}`, 400, 'INVALID_STATUS_TRANSITION')
    }

    const result = await client.query(
      `
      UPDATE corrective_actions
      SET ca_status = 'in_progress',
          started_by = $1,
          started_date = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
      `,
      [actorId(req) || action.assigned_to, id]
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
      VALUES ($1, 'START_CORRECTIVE_ACTION', 'corrective_action', $2, $3, $4, $5)
      `,
      [
        actorId(req) || action.assigned_to,
        id,
        `Corrective action ${action.action_code} started.`,
        `Status: ${action.ca_status}`,
        'Status: in_progress'
      ]
    )

    await refreshDefectStatus(client, action.defect_id, actorId(req) || action.assigned_to)
    await client.query('COMMIT')
    return successResponse(res, result.rows[0], 'Corrective action started successfully')
  } catch (error) {
    await client.query('ROLLBACK')
    return errorResponse(res, error, 500, 'START_CORRECTIVE_ACTION_ERROR')
  } finally {
    client.release()
  }
}

async function completeCorrectiveAction(req, res) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { id } = req.params
    const {
      completed_by,
      investigation_finding,
      action_taken,
      related_tool_machine_checked,
      completion_notes,
      qty_relabelled = 0,
      qty_repacked = 0,
      qty_reworked = 0,
      qty_discarded = 0,
      qty_released = 0,
      qty_on_hold = 0
    } = req.body

    const actionResult = await client.query(
      `
      SELECT
        ca.*,
        d.qty_affected,
        d.qty_relabelled AS defect_qty_relabelled,
        d.qty_repacked AS defect_qty_repacked,
        d.qty_reworked AS defect_qty_reworked,
        d.qty_released AS defect_qty_released,
        d.qty_discarded AS defect_qty_discarded,
        d.qty_on_hold AS defect_qty_on_hold,
        d.estimated_loss AS defect_estimated_loss,
        d.loss_rate_per_unit,
        d.defect_status
      FROM corrective_actions ca
      JOIN defects d ON ca.defect_id = d.id
      WHERE ca.id = $1
      `,
      [id]
    )

    if (actionResult.rows.length === 0) {
      await client.query('ROLLBACK')
      return errorResponse(res, 'Corrective action not found', 404, 'CORRECTIVE_ACTION_NOT_FOUND')
    }

    const action = actionResult.rows[0]
    if (Number(action.assigned_to) !== Number(req.user.id)) {
      await client.query('ROLLBACK')
      return errorResponse(res, 'Only the assigned worker can complete this action', 403, 'ACCESS_DENIED')
    }

    if (action.defect_status === 'closed') {
      await client.query('ROLLBACK')
      return errorResponse(res, 'Cannot update actions on a closed defect', 400, 'DEFECT_CLOSED')
    }

    if (!correctiveActionService.canCompleteAction(action.ca_status)) {
      await client.query('ROLLBACK')
      return errorResponse(res, `Action cannot be completed from status: ${action.ca_status}`, 400, 'INVALID_STATUS_TRANSITION')
    }

    if (!investigation_finding || !String(investigation_finding).trim()) {
      await client.query('ROLLBACK')
      return errorResponse(res, 'Investigation / completion finding is required', 400, 'FINDING_REQUIRED')
    }

    if (!(await assertRequiredEvidence(client, res, action))) return

    const relabelled = Number(qty_relabelled || 0)
    const repacked = Number(qty_repacked || 0)
    const reworked = Number(qty_reworked || 0)
    const discarded = Number(qty_discarded || 0)
    const released = Number(qty_released || 0)
    const onHold = Number(qty_on_hold || 0)

    let calculatedLoss = 0

    if (action.action_type === 'product_handling') {
      const validation = validateCumulativeHandledQuantities(
        {
          qty_affected: action.qty_affected,
          qty_relabelled: action.defect_qty_relabelled,
          qty_repacked: action.defect_qty_repacked,
          qty_reworked: action.defect_qty_reworked,
          qty_released: action.defect_qty_released,
          qty_discarded: action.defect_qty_discarded
        },
        {
          qty_relabelled: relabelled,
          qty_repacked: repacked,
          qty_reworked: reworked,
          qty_discarded: discarded,
          qty_released: released
        }
      )

      if (!validation.valid) {
        await client.query('ROLLBACK')
        return errorResponse(res, validation.message, 400, 'INVALID_QUANTITIES')
      }

      calculatedLoss = calculateEstimatedLoss({
        qty_discarded: discarded,
        loss_rate_per_unit: action.loss_rate_per_unit
      })
    }

    const result = await client.query(
      `
      UPDATE corrective_actions
      SET ca_status = 'completed',
          completed_by = $1,
          completed_date = CURRENT_TIMESTAMP,
          investigation_finding = $2,
          action_taken = $3,
          related_tool_machine_checked = $4,
          completion_notes = $5,
          qty_relabelled = $6,
          qty_repacked = $7,
          qty_reworked = $8,
          qty_discarded = $9,
          qty_released = $10,
          qty_on_hold = $11,
          calculated_loss = $12,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $13
      RETURNING *
      `,
      [actorId(req) || action.assigned_to, investigation_finding, action_taken || null, related_tool_machine_checked || null, completion_notes || null, relabelled, repacked, reworked, discarded, released, onHold, calculatedLoss, id]
    )

    if (action.action_type === 'product_handling') {
      await client.query(
        `
        UPDATE defects
        SET qty_relabelled = qty_relabelled + $1,
            qty_repacked = qty_repacked + $2,
            qty_reworked = qty_reworked + $3,
            qty_discarded = qty_discarded + $4,
            qty_released = qty_released + $5,
            estimated_loss = estimated_loss + $6,
            updated_by = $7,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $8
        `,
        [
          relabelled,
          repacked,
          reworked,
          discarded,
          released,
          calculatedLoss,
          actorId(req) || action.assigned_to,
          action.defect_id
        ]
      )

      await syncDefectHandlingTotals(client, action.defect_id, actorId(req) || action.assigned_to)
    }

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
      VALUES ($1, 'COMPLETE_CORRECTIVE_ACTION', 'corrective_action', $2, $3, $4, $5)
      `,
      [
        actorId(req) || action.assigned_to,
        id,
        `Corrective action ${action.action_code} completed.`,
        `Status: ${action.ca_status}`,
        'Status: completed'
      ]
    )

    await refreshDefectStatus(client, action.defect_id, actorId(req) || action.assigned_to)
    await client.query('COMMIT')
    return successResponse(res, result.rows[0], 'Corrective action completed. Manager verification is required.')
  } catch (error) {
    await client.query('ROLLBACK')
    return errorResponse(res, error, 500, 'COMPLETE_CORRECTIVE_ACTION_ERROR')
  } finally {
    client.release()
  }
}

async function verifyCorrectiveAction(req, res) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { id } = req.params
    const { verified_by, verification_notes } = req.body

    const actionResult = await client.query('SELECT * FROM corrective_actions WHERE id = $1', [id])
    if (actionResult.rows.length === 0) {
      await client.query('ROLLBACK')
      return errorResponse(res, 'Corrective action not found', 404, 'CORRECTIVE_ACTION_NOT_FOUND')
    }

    const action = actionResult.rows[0]
    if (!correctiveActionService.canVerifyAction(action.ca_status)) {
      await client.query('ROLLBACK')
      return errorResponse(res, 'Manager can verify only when action status is completed', 400, 'INVALID_STATUS_TRANSITION')
    }

    if (!(await assertRequiredEvidence(client, res, action))) return

    const result = await client.query(
      `
      UPDATE corrective_actions
      SET ca_status = 'verified',
          verified_by = $1,
          verified_date = CURRENT_TIMESTAMP,
          verification_notes = $2,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
      `,
      [actorId(req) || action.assigned_by, verification_notes || null, id]
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
      VALUES ($1, 'VERIFY_CORRECTIVE_ACTION', 'corrective_action', $2, $3, $4, $5)
      `,
      [
        actorId(req) || action.assigned_by,
        id,
        `Corrective action ${action.action_code} verified by manager.`,
        'Status: completed',
        'Status: verified'
      ]
    )

    await refreshDefectStatus(client, action.defect_id, actorId(req) || action.assigned_by)
    await client.query('COMMIT')
    return successResponse(res, result.rows[0], 'Corrective action verified successfully')
  } catch (error) {
    await client.query('ROLLBACK')
    return errorResponse(res, error, 500, 'VERIFY_CORRECTIVE_ACTION_ERROR')
  } finally {
    client.release()
  }
}

async function rejectCorrectiveAction(req, res) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { id } = req.params
    const { rejected_by, rejection_reason } = req.body

    const actionResult = await client.query('SELECT * FROM corrective_actions WHERE id = $1', [id])
    if (actionResult.rows.length === 0) {
      await client.query('ROLLBACK')
      return errorResponse(res, 'Corrective action not found', 404, 'CORRECTIVE_ACTION_NOT_FOUND')
    }

    const action = actionResult.rows[0]
    if (!correctiveActionService.canRejectAction(action.ca_status)) {
      await client.query('ROLLBACK')
      return errorResponse(res, 'Only completed actions can be rejected', 400, 'INVALID_STATUS_TRANSITION')
    }

    const result = await client.query(
      `
      UPDATE corrective_actions
      SET ca_status = 'rejected',
          rejected_by = $1,
          rejected_date = CURRENT_TIMESTAMP,
          rejection_reason = $2,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
      `,
      [actorId(req) || action.assigned_by, rejection_reason || null, id]
    )

    if (action.action_type === 'product_handling') {
      await rollbackProductHandlingFromDefect(
        client,
        action,
        actorId(req) || action.assigned_by
      )
    }

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
      VALUES ($1, 'REJECT_CORRECTIVE_ACTION', 'corrective_action', $2, $3, $4, $5)
      `,
      [
        actorId(req) || action.assigned_by,
        id,
        `Corrective action ${action.action_code} rejected by manager.`,
        'Status: completed',
        'Status: rejected'
      ]
    )

    await refreshDefectStatus(client, action.defect_id, actorId(req) || action.assigned_by)
    await client.query('COMMIT')
    return successResponse(res, result.rows[0], 'Corrective action rejected successfully')
  } catch (error) {
    await client.query('ROLLBACK')
    return errorResponse(res, error, 500, 'REJECT_CORRECTIVE_ACTION_ERROR')
  } finally {
    client.release()
  }
}

async function cancelCorrectiveAction(req, res) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { id } = req.params
    const { cancellation_reason } = req.body

    const actionResult = await client.query(
      `
      SELECT ca.*, d.defect_status
      FROM corrective_actions ca
      JOIN defects d ON ca.defect_id = d.id
      WHERE ca.id = $1
      `,
      [id]
    )

    if (actionResult.rows.length === 0) {
      await client.query('ROLLBACK')
      return errorResponse(res, 'Corrective action not found', 404, 'CORRECTIVE_ACTION_NOT_FOUND')
    }

    const action = actionResult.rows[0]

    if (action.defect_status === 'closed') {
      await client.query('ROLLBACK')
      return errorResponse(res, 'Cannot update actions on a closed defect', 400, 'DEFECT_CLOSED')
    }

    if (!correctiveActionService.canCancelAction(action.ca_status)) {
      await client.query('ROLLBACK')
      return errorResponse(res, 'Only rejected actions can be cancelled by a manager', 400, 'INVALID_STATUS_TRANSITION')
    }

    const result = await client.query(
      `
      UPDATE corrective_actions
      SET ca_status = 'cancelled',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
      `,
      [id]
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
      VALUES ($1, 'CANCEL_CORRECTIVE_ACTION', 'corrective_action', $2, $3, $4, $5)
      `,
      [
        actorId(req) || action.assigned_by,
        id,
        `Corrective action ${action.action_code} cancelled by manager.${cancellation_reason ? ` Reason: ${cancellation_reason}` : ''}`,
        'Status: rejected',
        'Status: cancelled'
      ]
    )

    await refreshDefectStatus(client, action.defect_id, actorId(req) || action.assigned_by)
    await client.query('COMMIT')
    return successResponse(res, result.rows[0], 'Corrective action cancelled successfully')
  } catch (error) {
    await client.query('ROLLBACK')
    return errorResponse(res, error, 500, 'CANCEL_CORRECTIVE_ACTION_ERROR')
  } finally {
    client.release()
  }
}

async function updateCorrectiveActionDueDate(req, res) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const { id } = req.params
    const { due_date } = req.body
    const managerId = actorId(req)

    if (!due_date || !String(due_date).trim()) {
      await client.query('ROLLBACK')
      return errorResponse(res, 'Due date is required', 400, 'VALIDATION_ERROR')
    }

    const actionResult = await client.query(
      `
      SELECT ca.*, d.defect_status
      FROM corrective_actions ca
      JOIN defects d ON ca.defect_id = d.id
      WHERE ca.id = $1
      `,
      [id]
    )

    if (actionResult.rows.length === 0) {
      await client.query('ROLLBACK')
      return errorResponse(res, 'Corrective action not found', 404, 'CORRECTIVE_ACTION_NOT_FOUND')
    }

    const action = actionResult.rows[0]

    if (action.defect_status === 'closed') {
      await client.query('ROLLBACK')
      return errorResponse(res, 'Cannot update actions on a closed defect', 400, 'DEFECT_CLOSED')
    }

    if (action.ca_status === 'verified') {
      await client.query('ROLLBACK')
      return errorResponse(res, 'Cannot change due date on a verified action', 400, 'ACTION_ALREADY_VERIFIED')
    }

    const oldDueDate = action.due_date ? String(action.due_date).split('T')[0] : null
    const newDueDate = String(due_date).split('T')[0]

    const result = await client.query(
      `
      UPDATE corrective_actions
      SET due_date = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
      `,
      [newDueDate, id]
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
      VALUES ($1, 'UPDATE_DUE_DATE', 'corrective_action', $2, $3, $4, $5)
      `,
      [
        managerId,
        id,
        `Due date updated for ${action.action_code}.`,
        oldDueDate || 'none',
        newDueDate
      ]
    )

    await client.query('COMMIT')
    return successResponse(res, result.rows[0], 'Due date updated successfully')
  } catch (error) {
    await client.query('ROLLBACK')
    return errorResponse(res, error, 500, 'UPDATE_DUE_DATE_ERROR')
  } finally {
    client.release()
  }
}

async function uploadCorrectiveActionEvidence(req, res) {
  try {
    const { id } = req.params
    const { evidence_note, uploaded_by } = req.body
    const actionCheck = await pool.query('SELECT id FROM corrective_actions WHERE id = $1', [id])

    if (actionCheck.rows.length === 0) return errorResponse(res, 'Corrective action not found', 404, 'CORRECTIVE_ACTION_NOT_FOUND')

    if (!(await assertWorkerActionAccess(req, res, id))) return

    if (!req.file) return errorResponse(res, 'Please upload an action evidence photo.', 400, 'NO_FILE_UPLOADED')

    const result = await pool.query(
      `
      INSERT INTO evidence (corrective_action_id, file_name, file_path, file_type, evidence_note, uploaded_by)
      VALUES ($1,$2,$3,$4,$5,$6)
      RETURNING *
      `,
      [id, req.file.originalname, `/uploads/evidence/${req.file.filename}`, req.file.mimetype, evidence_note || null, uploaded_by || null]
    )

    return successResponse(res, result.rows[0], 'Action evidence uploaded successfully', 201)
  } catch (error) {
    return errorResponse(res, error, 500, 'UPLOAD_ACTION_EVIDENCE_ERROR')
  }
}

module.exports = {
  getCorrectiveActions,
  getCorrectiveActionById,
  assignCorrectiveAction,
  startCorrectiveAction,
  completeCorrectiveAction,
  verifyCorrectiveAction,
  rejectCorrectiveAction,
  cancelCorrectiveAction,
  updateCorrectiveActionDueDate,
  uploadCorrectiveActionEvidence
}
