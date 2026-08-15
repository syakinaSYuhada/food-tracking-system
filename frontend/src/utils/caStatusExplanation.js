const CA_STATUS_EXPLANATIONS = {
  rejected: 'Needs rework — worker must restart and resubmit',
  cancelled: 'No longer needed — manager cancelled this action'
}

export function getCaStatusExplanation(status) {
  return CA_STATUS_EXPLANATIONS[String(status || '').toLowerCase()] || undefined
}
