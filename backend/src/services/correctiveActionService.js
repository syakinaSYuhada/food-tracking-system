const VALID_STATUSES = ['assigned', 'in_progress', 'completed', 'verified', 'rejected', 'cancelled']

function canStartAction(status) {
  return status === 'assigned' || status === 'rejected'
}

function canCompleteAction(status) {
  return status === 'in_progress' || status === 'rejected'
}

function canVerifyAction(status) {
  return status === 'completed'
}

function canRejectAction(status) {
  return status === 'completed'
}

function canCancelAction(status) {
  return status === 'rejected'
}

function getStatusExplanation(status) {
  const explanations = {
    assigned: 'This action has been assigned but has not started yet.',
    in_progress: 'The assigned person has started this action but has not marked it completed.',
    completed: 'The assigned person has submitted findings/results. Manager verification is required.',
    verified: 'This action has been reviewed and verified by the Manager.',
    rejected: 'This action was rejected by the Manager and requires correction.',
    cancelled: 'This action was cancelled by the Manager and no longer blocks closure.'
  }

  return explanations[status] || 'Unknown status.'
}

function validateStatus(status) {
  return VALID_STATUSES.includes(status)
}

module.exports = {
  VALID_STATUSES,
  canStartAction,
  canCompleteAction,
  canVerifyAction,
  canRejectAction,
  canCancelAction,
  getStatusExplanation,
  validateStatus
}
