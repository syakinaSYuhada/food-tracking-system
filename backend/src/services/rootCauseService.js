function createConfirmError(message, status = 400, code = 'VALIDATION_ERROR') {
  const error = new Error(message)
  error.status = status
  error.code = code
  return error
}

async function confirmRootCauseForDefect(client, {
  defectId,
  confirmedRootCause,
  confirmedRootCauseSource,
  relatedToolMachine = null,
  investigationNotes = null,
  confirmedBy
}) {
  const cause = String(confirmedRootCause || '').trim()
  const source = String(confirmedRootCauseSource || '').trim()

  if (!cause) {
    throw createConfirmError('Confirmed root cause is required', 400, 'VALIDATION_ERROR')
  }

  if (!source) {
    throw createConfirmError(
      'Confirmed root cause source and confirmed root cause are required',
      400,
      'VALIDATION_ERROR'
    )
  }

  if (!confirmedBy) {
    throw createConfirmError(
      'Confirmed root cause source and confirmed root cause are required',
      400,
      'VALIDATION_ERROR'
    )
  }

  const defectResult = await client.query(
    'SELECT id, defect_code, defect_status FROM defects WHERE id = $1',
    [defectId]
  )

  if (defectResult.rows.length === 0) {
    throw createConfirmError('Defect not found', 404, 'DEFECT_NOT_FOUND')
  }

  const defect = defectResult.rows[0]

  if (defect.defect_status === 'closed') {
    throw createConfirmError('Cannot confirm root cause on a closed defect', 400, 'DEFECT_CLOSED')
  }

  const actionStats = await client.query(
    `
    SELECT
      COUNT(*) FILTER (WHERE ca_status != 'cancelled')::int AS total_actions,
      COUNT(*) FILTER (WHERE ca_status = 'verified')::int AS verified_actions
    FROM corrective_actions
    WHERE defect_id = $1
    `,
    [defectId]
  )

  const totalActions = Number(actionStats.rows[0].total_actions || 0)
  const verifiedActions = Number(actionStats.rows[0].verified_actions || 0)

  if (totalActions > 0 && verifiedActions < totalActions) {
    throw createConfirmError(
      'All corrective actions must be verified before confirming root cause',
      400,
      'ACTIONS_NOT_VERIFIED'
    )
  }

  const result = await client.query(
    `
    INSERT INTO root_cause_investigation (
      defect_id,
      root_cause_status,
      related_tool_machine,
      confirmed_root_cause_source,
      confirmed_root_cause,
      confirmed_by,
      confirmed_date,
      investigation_notes
    )
    VALUES ($1, 'confirmed', $2, $3, $4, $5, CURRENT_TIMESTAMP, $6)
    ON CONFLICT (defect_id)
    DO UPDATE SET
      root_cause_status = 'confirmed',
      related_tool_machine = COALESCE(EXCLUDED.related_tool_machine, root_cause_investigation.related_tool_machine),
      confirmed_root_cause_source = EXCLUDED.confirmed_root_cause_source,
      confirmed_root_cause = EXCLUDED.confirmed_root_cause,
      confirmed_by = EXCLUDED.confirmed_by,
      confirmed_date = CURRENT_TIMESTAMP,
      investigation_notes = COALESCE(EXCLUDED.investigation_notes, root_cause_investigation.investigation_notes),
      updated_at = CURRENT_TIMESTAMP
    RETURNING *
    `,
    [
      defectId,
      relatedToolMachine || null,
      source,
      cause,
      confirmedBy,
      investigationNotes || null
    ]
  )

  await client.query(
    `UPDATE defects SET updated_by = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
    [confirmedBy, defectId]
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
    VALUES ($1, 'CONFIRM_ROOT_CAUSE', 'defect', $2, $3, NULL, $4)
    `,
    [
      confirmedBy,
      defectId,
      `Root cause confirmed for defect ${defect.defect_code}.`,
      cause
    ]
  )

  return result.rows[0]
}

module.exports = {
  confirmRootCauseForDefect
}
