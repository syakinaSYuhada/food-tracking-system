export function defectStatusHint(status, hasAssignedAction) {
  const normalized = String(status || '').toLowerCase()

  if (normalized === 'new') {
    return 'Submitted — waiting for manager review. No task assigned yet.'
  }
  if (normalized === 'under_review') {
    return 'Manager is reviewing your report.'
  }
  if (normalized === 'action_assigned' && !hasAssignedAction) {
    return 'Actions assigned to other workers. You can track progress here.'
  }
  if (normalized === 'action_assigned' && hasAssignedAction) {
    return 'You have been assigned corrective action(s). Open My Actions below.'
  }
  if (normalized === 'in_progress') {
    return hasAssignedAction ? 'Your action is in progress.' : 'Corrective work is in progress.'
  }
  if (normalized === 'pending_verification') {
    return 'Work submitted — waiting for manager verification.'
  }
  if (normalized === 'ready_verification') {
    return 'All corrective actions verified — waiting for root cause confirmation and close.'
  }
  if (normalized === 'closed') {
    return 'This defect has been closed.'
  }

  return 'Track the status of your report here.'
}

export function defectStatusBadgeTitle(status, hasAssignedAction) {
  const normalized = String(status || '').toLowerCase()

  if (hasAssignedAction === undefined) {
    if (normalized === 'action_assigned') {
      return 'Corrective actions have been assigned. Check My Actions if one is yours.'
    }
    if (normalized === 'in_progress') {
      return 'Corrective work is in progress.'
    }
  }

  return defectStatusHint(status, Boolean(hasAssignedAction))
}
