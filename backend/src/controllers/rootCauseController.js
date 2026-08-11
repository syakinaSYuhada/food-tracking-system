const pool = require('../config/db')
const { successResponse, errorResponse } = require('../middleware/responseHandler')
const { actorId, assertWorkerDefectAccess } = require('../utils/accessControl')
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

async function updateSuspectedRootCause(req, res) {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const { defectId } = req.params

    const {
      suspected_root_cause_source,
      suspected_root_cause,
      related_tool_machine,
      investigation_notes,
      updated_by
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

    const defectResult = await client.query(
      `
      SELECT
        d.id,
        d.defect_code,
        d.defect_status,
        r.root_cause_status
      FROM defects d
      LEFT JOIN root_cause_investigation r ON r.defect_id = d.id
      WHERE d.id = $1
      `,
      [defectId]
    )

    if (defectResult.rows.length === 0) {
      await client.query('ROLLBACK')
      return errorResponse(res, 'Defect not found', 404, 'DEFECT_NOT_FOUND')
    }

    const defect = defectResult.rows[0]

    if (defect.defect_status === 'closed') {
      await client.query('ROLLBACK')
      return errorResponse(
        res,
        'Cannot update suspected root cause on a closed defect',
        400,
        'DEFECT_CLOSED'
      )
    }

    if (defect.root_cause_status === 'confirmed') {
      await client.query('ROLLBACK')
      return errorResponse(
        res,
        'Root cause is already confirmed and cannot be changed by workers',
        409,
        'ROOT_CAUSE_CONFIRMED'
      )
    }

    if (!(await assertWorkerDefectAccess(req, res, defectId))) {
      await client.query('ROLLBACK')
      return
    }

    const result = await client.query(
      `
      INSERT INTO root_cause_investigation (
        defect_id,
        root_cause_status,
        suspected_root_cause_source,
        suspected_root_cause,
        related_tool_machine,
        investigation_notes
      )
      VALUES ($1, 'suspected', $2, $3, $4, $5)
      ON CONFLICT (defect_id)
      DO UPDATE SET
        root_cause_status = 'suspected',
        suspected_root_cause_source = EXCLUDED.suspected_root_cause_source,
        suspected_root_cause = EXCLUDED.suspected_root_cause,
        related_tool_machine = EXCLUDED.related_tool_machine,
        investigation_notes = EXCLUDED.investigation_notes,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
      `,
      [
        defectId,
        suspected_root_cause_source,
        suspected_root_cause,
        related_tool_machine || null,
        investigation_notes || null
      ]
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
      VALUES ($1, 'UPDATE_SUSPECTED_ROOT_CAUSE', 'defect', $2, $3, NULL, $4)
      `,
      [
        actorId(req) || updated_by || null,
        defectId,
        `Suspected root cause updated for defect ${defect.defect_code}.`,
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
  updateSuspectedRootCause,
  confirmRootCause
}
