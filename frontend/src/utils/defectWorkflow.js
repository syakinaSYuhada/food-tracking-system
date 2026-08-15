export function getActionStats(actions = []) {
  const list = Array.isArray(actions) ? actions : []
  const active = list.filter((a) => (a.status || a.ca_status) !== 'cancelled')
  const total = active.length
  const verified = active.filter((a) => a.status === 'verified' || a.ca_status === 'verified').length
  const completed = active.filter((a) => a.status === 'completed' || a.ca_status === 'completed').length
  const inProgress = active.filter((a) => a.status === 'in_progress' || a.ca_status === 'in_progress').length
  const assigned = active.filter((a) => a.status === 'assigned' || a.ca_status === 'assigned').length
  const rejected = active.filter((a) => a.status === 'rejected' || a.ca_status === 'rejected').length
  const submitted = completed + verified

  return {
    total,
    verified,
    completed,
    inProgress,
    assigned,
    rejected,
    submitted,
    pendingVerify: completed,
    allVerified: total === 0 || verified === total,
    allSubmitted: total === 0 || submitted === total,
    hasActions: total > 0
  }
}

export function getDefectWorkflow(defect, actions = [], managerView = true) {
  if (!defect) {
    return {
      phase: 'assign',
      stats: getActionStats(actions),
      isClosed: false,
      rootConfirmed: false,
      nextStep: '',
      nextTab: 'overview',
      blockers: [],
      canAssign: false,
      canConfirmRootCause: false,
      canClose: false,
      confirmBlockers: []
    }
  }

  const stats = getActionStats(actions)
  const isClosed = defect?.defect_status === 'closed'
  const rootConfirmed = defect?.root_cause_status === 'confirmed'

  let phase
  if (isClosed) phase = 'closed'
  else if (!stats.hasActions) phase = 'assign'
  else if (!stats.allSubmitted) phase = 'worker_complete'
  else if (!stats.allVerified) phase = 'manager_verify'
  else if (!rootConfirmed) phase = 'confirm_root_cause'
  else phase = 'close'

  const blockers = []
  if (!isClosed && stats.hasActions && !stats.allVerified) {
    blockers.push(`Verify all actions (${stats.verified}/${stats.total} verified)`)
  }
  if (!isClosed && stats.allVerified && !rootConfirmed) {
    blockers.push('Confirm root cause on Root Cause tab')
  }

  let nextStep = ''
  let nextTab = 'overview'

  if (isClosed) {
    nextStep = 'This defect has been successfully closed. No further actions or modifications are allowed.'
  } else if (!managerView) {
    if (!stats.hasActions) {
      nextStep = 'Your report has been submitted. This is not a task yet — wait for your manager to assign corrective actions.'
    } else if (stats.assigned > 0 || stats.rejected > 0) {
      nextStep = 'Start your assigned action(s) on the My Work tab.'
      nextTab = 'actions'
    } else if (stats.inProgress > 0) {
      nextStep = 'Open your in-progress action and submit completion findings.'
      nextTab = 'actions'
    } else if (stats.completed > 0) {
      nextStep = 'Waiting for manager verification.'
      nextTab = 'actions'
    } else if (stats.allVerified && !rootConfirmed) {
      nextStep = 'Record suspected root cause on the What Caused It tab.'
      nextTab = 'root'
    } else {
      nextStep = 'No action required from you right now.'
    }
  } else if (phase === 'assign') {
    nextStep = defect?.defect_status === 'new'
      ? 'Start review, then assign corrective actions on the Corrective Actions tab.'
      : 'Assign corrective actions on the Corrective Actions tab.'
    nextTab = 'actions'
  } else if (phase === 'worker_complete') {
    nextStep = `Waiting for workers to complete actions (${stats.submitted}/${stats.total} submitted).`
    nextTab = 'actions'
  } else if (phase === 'manager_verify') {
    nextStep = `Verify or reject submitted actions (${stats.verified}/${stats.total} verified).`
    nextTab = 'actions'
  } else if (phase === 'confirm_root_cause') {
    nextStep = 'All actions verified. Confirm root cause on the Root Cause tab.'
    nextTab = 'root'
  } else if (phase === 'close') {
    nextStep = 'Root cause confirmed. Close this defect on the Root Cause tab.'
    nextTab = 'root'
  }

  return {
    phase,
    stats,
    isClosed,
    rootConfirmed,
    nextStep,
    nextTab,
    blockers,
    canAssign: managerView && !isClosed,
    canConfirmRootCause: managerView && !isClosed && stats.allVerified && !rootConfirmed,
    canClose: managerView && !isClosed && stats.allVerified && rootConfirmed,
    confirmBlockers: !stats.allVerified && stats.hasActions
      ? [`All actions must be verified first (${stats.verified}/${stats.total})`]
      : []
  }
}
