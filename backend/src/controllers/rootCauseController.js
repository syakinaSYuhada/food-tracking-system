const pool = require('../config/db')
const { successResponse, errorResponse } = require('../middleware/responseHandler')
const { actorId, assertWorkerDefectAccess, assertWorkerActionAccess } = require('../utils/accessControl')
const rootCauseService = require('../services/rootCauseService')

async function getRootCauseByDefect(req, res) {
  try {
    const { defectId } = req.params

    if (!(await assertWorkerDefectAccess(req, res, defectId))) return

    const result = await pool.query(
      `
      SELECT
        r.*,
        d.defect_code,
        d.defect_type,
        d.detected_at_stage,
        d.problem_level,
        p.product_name,
        b.batch_number,
        confirmed_user.full_name AS confirmed_by_name
      FROM root_cause_investigation r
      JOIN defects d ON r.defect_id = d.id
      JOIN products p ON d.product_id = p.id
      JOIN batches b ON d.batch_id = b.id
      LEFT JOIN users confirmed_user ON r.confirmed_by = confirmed_user.id
      WHERE r.defect_id = $1
      `,
      [defectId]
    )

    if (result.rows.length === 0) {
      return errorResponse(
        res,
        'Root cause investigation not found for this defect',
        404,
        'ROOT_CAUSE_NOT_FOUND'
      )
    }

    return successResponse(
      res,
      result.rows[0],
      'Root cause investigation retrieved successfully'
    )
  } catch (error) {
    return errorResponse(res, error, 500, 'GET_ROOT_CAUSE_ERROR')
  }
}

async function updateSuspectedRootCauseForAction(req, res) {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const { actionId } = req.params

    const {
      suspected_root_cause_source,
      suspected_root_cause,
      suspected_root_cause_notes
    } = req.body

    if (!suspected_root_cause_source || !suspected_root_cause) {
      await client.query('ROLLBACK')
      return errorResponse(
        res,
        'Suspected root cause source and suspected root cause are required',
        400,
        'VALIDATION_ERROR'
      )
    }

    const actionResult = await client.query(
      `
      SELECT
        ca.id,
        ca.action_code,
        ca.defect_id,
        d.defect_code,
        d.defect_status,
        r.root_cause_status
      FROM corrective_actions ca
      JOIN defects d ON d.id = ca.defect_id
      LEFT JOIN root_cause_investigation r ON r.defect_id = ca.defect_id
      WHERE ca.id = $1
      `,
      [actionId]
    )

    if (actionResult.rows.length === 0) {
      await client.query('ROLLBACK')
      return errorResponse(res, 'Corrective action not found', 404, 'CORRECTIVE_ACTION_NOT_FOUND')
    }

    const action = actionResult.rows[0]

    if (action.defect_status === 'closed') {
      await client.query('ROLLBACK')
      return errorResponse(
        res,
        'Cannot update suspected root cause on a closed defect',
        400,
        'DEFECT_CLOSED'
      )
    }

    if (action.root_cause_status === 'confirmed') {
      await client.query('ROLLBACK')
      return errorResponse(
        res,
        'Root cause is already confirmed and cannot be changed by workers',
        409,
        'ROOT_CAUSE_CONFIRMED'
      )
    }

    if (!(await assertWorkerActionAccess(req, res, actionId))) {
      await client.query('ROLLBACK')
      return
    }

    const result = await client.query(
      `
      UPDATE corrective_actions
      SET
        suspected_root_cause_source = $1,
        suspected_root_cause = $2,
        suspected_root_cause_notes = $3,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      RETURNING *
      `,
      [
        suspected_root_cause_source,
        suspected_root_cause,
        suspected_root_cause_notes || null,
        actionId
      ]
    )

    await client.query(
      `
      INSERT INTO root_cause_investigation (defect_id, root_cause_status)
      VALUES ($1, 'suspected')
      ON CONFLICT (defect_id)
      DO UPDATE SET
        root_cause_status = CASE
          WHEN root_cause_investigation.root_cause_status = 'pending_investigation' THEN 'suspected'
          ELSE root_cause_investigation.root_cause_status
        END,
        updated_at = CURRENT_TIMESTAMP
      `,
      [action.defect_id]
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
      VALUES ($1, 'UPDATE_SUSPECTED_ROOT_CAUSE', 'corrective_action', $2, $3, NULL, $4)
      `,
      [
        actorId(req),
        actionId,
        `Suspected root cause recorded for action ${action.action_code}.`,
        suspected_root_cause
      ]
    )

    await client.query('COMMIT')

    return successResponse(
      res,
      result.rows[0],
      'Suspected root cause updated successfully'
    )
  } catch (error) {
    await client.query('ROLLBACK')
    return errorResponse(res, error, 500, 'UPDATE_SUSPECTED_ROOT_CAUSE_ERROR')
  } finally {
    client.release()
  }
}

async function confirmRootCause(req, res) {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const { defectId } = req.params
    const {
      confirmed_root_cause_source,
      confirmed_root_cause,
      related_tool_machine,
      investigation_notes
    } = req.body

    const investigation = await rootCauseService.confirmRootCauseForDefect(client, {
      defectId: Number(defectId),
      confirmedRootCause: confirmed_root_cause,
      confirmedRootCauseSource: confirmed_root_cause_source,
      relatedToolMachine: related_tool_machine,
      investigationNotes: investigation_notes,
      confirmedBy: actorId(req)
    })

    await client.query('COMMIT')

    return successResponse(
      res,
      investigation,
      'Root cause confirmed successfully'
    )
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

module.exports = {
  getRootCauseByDefect,
  updateSuspectedRootCauseForAction,
  confirmRootCause
}
