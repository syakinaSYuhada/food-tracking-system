import { isActionOverdue } from './dueDate'
import { hasExpiryMismatch } from './expiry'

function actionStatus(action) {
  return String(action.ca_status || action.status || '').toLowerCase()
}

function isOpenWorkerAction(action) {
  return ['assigned', 'in_progress', 'rejected'].includes(actionStatus(action))
}

function isEvidenceRequiredAction(action) {
  return Boolean(action.evidence_required ?? action.evidenceRequired)
}

export function summarizeWorkerAttention(actions = [], defects = [], userId) {
  const activeActions = actions.filter(isOpenWorkerAction)

  const overdueActions = activeActions.filter((action) =>
    isActionOverdue(action.due_date ?? action.dueDate, actionStatus(action))
  )
  const overdueIds = new Set(overdueActions.map((action) => action.id))

  const rejectedActions = activeActions.filter(
    (action) => actionStatus(action) === 'rejected' && !overdueIds.has(action.id)
  )
  const rejectedIds = new Set(rejectedActions.map((action) => action.id))

  const evidenceActions = activeActions.filter((action) => {
    const status = actionStatus(action)
    if (!['assigned', 'in_progress'].includes(status)) return false
    if (overdueIds.has(action.id) || rejectedIds.has(action.id)) return false
    return isEvidenceRequiredAction(action)
  })
  const evidenceIds = new Set(evidenceActions.map((action) => action.id))

  const attentionActions = activeActions.filter((action) => {
    const status = actionStatus(action)
    if (!['assigned', 'in_progress'].includes(status)) return false
    if (overdueIds.has(action.id) || rejectedIds.has(action.id) || evidenceIds.has(action.id)) return false
    return true
  })

  const ownDefects = defects.filter((defect) => Number(defect.created_by) === Number(userId))
  const reportsWaiting = ownDefects.filter((defect) =>
    ['new', 'under_review'].includes(String(defect.defect_status || defect.status || '').toLowerCase())
  )
  const expiryMismatchReports = ownDefects.filter(
    (defect) => hasExpiryMismatch(defect) && String(defect.defect_status || defect.status || '').toLowerCase() !== 'closed'
  )

  return {
    overdueCount: overdueActions.length,
    rejectedCount: rejectedActions.length,
    attentionCount: attentionActions.length,
    evidenceCount: evidenceActions.length,
    reportsWaitingCount: reportsWaiting.length,
    expiryMismatchCount: expiryMismatchReports.length
  }
}

export function buildWorkerAttentionItems(summary, navigate) {
  const {
    overdueCount,
    rejectedCount,
    attentionCount,
    evidenceCount,
    reportsWaitingCount,
    expiryMismatchCount
  } = summary

  return [
    overdueCount > 0 && {
      id: 'overdue',
      count: overdueCount,
      label: `${overdueCount} overdue action${overdueCount === 1 ? '' : 's'}`,
      onClick: () => navigate('/corrective-actions?caDue=overdue')
    },
    rejectedCount > 0 && {
      id: 'rejected',
      count: rejectedCount,
      label: `${rejectedCount} rejected action${rejectedCount === 1 ? '' : 's'} need rework`,
      onClick: () => navigate('/corrective-actions?status=rejected')
    },
    evidenceCount > 0 && {
      id: 'evidence',
      count: evidenceCount,
      label: `${evidenceCount} action${evidenceCount === 1 ? '' : 's'} require evidence`,
      onClick: () => navigate('/corrective-actions?status=assigned')
    },
    attentionCount > 0 && {
      id: 'attention',
      count: attentionCount,
      label: `${attentionCount} assigned action${attentionCount === 1 ? '' : 's'} need your attention`,
      onClick: () => navigate('/corrective-actions')
    },
    reportsWaitingCount > 0 && {
      id: 'reports-waiting',
      count: reportsWaitingCount,
      label: `${reportsWaitingCount} report${reportsWaitingCount === 1 ? '' : 's'} waiting for manager review`,
      onClick: () => navigate('/defects?mine=true&status=awaiting_manager')
    },
    expiryMismatchCount > 0 && {
      id: 'expiry',
      count: expiryMismatchCount,
      label: `${expiryMismatchCount} report${expiryMismatchCount === 1 ? '' : 's'} with expiry mismatch`,
      onClick: () => navigate('/defects?mine=true&expiry=mismatch')
    }
  ].filter(Boolean)
}
