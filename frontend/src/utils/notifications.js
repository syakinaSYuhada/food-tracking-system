import { isManager } from './roleAccess'
import { isActionOverdue } from './dueDate'
import { formatExpiryDate, hasExpiryMismatch } from './expiry'
import { getActionStats, computeDefectPhase } from './defectWorkflow'
import {
  formatDefectPriorityLabel,
  getReviewDueStatus,
  getDefectStatus,
  isOpenDefect,
  isUrgentDefectPriority
} from './defectReviewDue'

function formatDueDate(value) {
  if (!value) return '-'
  return String(value).split('T')[0]
}

function getActionStatus(action) {
  return String(action.ca_status || action.status || '').toLowerCase()
}

const NEW_ASSIGNMENT_WINDOW_DAYS = 7

function isRecentlyAssignedAction(action) {
  const createdAt = action.created_at
  if (!createdAt) return false

  const created = new Date(String(createdAt).split('T')[0] + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const ageDays = (today - created) / (1000 * 60 * 60 * 24)
  return ageDays >= 0 && ageDays <= NEW_ASSIGNMENT_WINDOW_DAYS
}

function isNewAssignmentAction(action) {
  const status = getActionStatus(action)
  if (!['assigned', 'in_progress'].includes(status)) return false
  if (isActionOverdue(action.due_date, status)) return false
  if (status === 'assigned') return true
  return isRecentlyAssignedAction(action)
}

function getUrgentReviewNotification(defect) {
  if (!isOpenDefect(defect)) return null

  const status = getDefectStatus(defect)
  const reviewStatus = getReviewDueStatus(defect.review_due_date, status, defect.root_cause_status, defect.total_actions, defect.verified_actions)

  if (reviewStatus === 'overdue') {
    return {
      priority: 2,
      title: `${defect.defect_code} — review overdue`,
      subtitle: `${defect.reported_by_name || 'Worker'} · review by ${formatDueDate(defect.review_due_date)} · assign corrective actions`
    }
  }

  if (reviewStatus === 'today') {
    return {
      priority: 3,
      title: `${defect.defect_code} — review due today`,
      subtitle: `${defect.reported_by_name || 'Worker'} · ${defect.product_name} · review before assigning actions`
    }
  }

  if (isUrgentDefectPriority(defect)) {
    return {
      priority: 4,
      title: `${defect.defect_code} — urgent review needed`,
      subtitle: `${formatDefectPriorityLabel(defect.priority)} priority · ${defect.reported_by_name || 'Worker'} · ${defect.product_name}`
    }
  }

  return null
}

function isEvidenceRequiredAction(action) {
  return Boolean(action.evidence_required ?? action.evidenceRequired)
}

function buildWorkerActionNotifications(actions = []) {
  const notifications = []
  const seenActionIds = new Set()

  const openActions = actions.filter((action) =>
    ['assigned', 'in_progress', 'rejected'].includes(getActionStatus(action))
  )

  openActions
    .filter((action) => isActionOverdue(action.due_date, getActionStatus(action)))
    .forEach((action) => {
      seenActionIds.add(action.id)
      notifications.push({
        id: `ca-${action.id}`,
        kind: 'overdue',
        title: `${action.action_code} — overdue`,
        subtitle: `CA due ${formatDueDate(action.due_date)} · ${action.task}`,
        path: `/corrective-actions/${action.id}`,
        priority: 0
      })
    })

  openActions
    .filter((action) => {
      const status = getActionStatus(action)
      if (!['assigned', 'in_progress'].includes(status)) return false
      if (seenActionIds.has(action.id)) return false
      return isEvidenceRequiredAction(action)
    })
    .forEach((action) => {
      seenActionIds.add(action.id)
      notifications.push({
        id: `ca-evidence-${action.id}`,
        kind: 'evidence-required',
        title: `${action.action_code} — evidence required`,
        subtitle: `${action.task} · upload evidence before completing`,
        path: `/corrective-actions/${action.id}`,
        priority: 1
      })
    })

  openActions
    .filter((action) => isNewAssignmentAction(action) && !seenActionIds.has(action.id))
    .forEach((action) => {
      seenActionIds.add(action.id)
      notifications.push({
        id: `ca-${action.id}`,
        kind: 'new-assignment',
        title: `${action.action_code} — New Assignment`,
        subtitle: `${action.task} has been assigned to you.`,
        path: `/corrective-actions/${action.id}`,
        priority: 1
      })
    })

  openActions
    .filter((action) => ['in_progress', 'rejected'].includes(getActionStatus(action)) && !seenActionIds.has(action.id))
    .forEach((action) => {
      seenActionIds.add(action.id)
      notifications.push({
        id: `ca-${action.id}`,
        kind: 'attention',
        title: `${action.action_code} needs your attention`,
        subtitle: `${action.task} · ${getActionStatus(action).replaceAll('_', ' ')}`,
        path: `/corrective-actions/${action.id}`,
        priority: 2
      })
    })

  return notifications
}

const PANEL_ITEM_LIMIT = 8
const MAX_OVERDUE_BEFORE_NEW_ASSIGNMENTS = 3

function selectNotificationItems(notifications, limit = PANEL_ITEM_LIMIT) {
  const pinned = notifications.filter((item) =>
    item.kind === 'new-assignment' || item.kind === 'attention' || item.kind === 'evidence-required'
  )

  if (pinned.length === 0) {
    return notifications.slice(0, limit)
  }

  const pinnedIds = new Set(pinned.map((item) => item.id))
  const overdue = notifications.filter((item) => item.kind === 'overdue')
  const rest = notifications.filter((item) =>
    !pinnedIds.has(item.id) && item.kind !== 'overdue'
  )

  const items = []
  const usedIds = new Set()

  function add(item) {
    if (!item || usedIds.has(item.id) || items.length >= limit) return
    usedIds.add(item.id)
    items.push(item)
  }

  overdue.slice(0, MAX_OVERDUE_BEFORE_NEW_ASSIGNMENTS).forEach(add)
  pinned.forEach(add)
  overdue.slice(MAX_OVERDUE_BEFORE_NEW_ASSIGNMENTS).forEach(add)
  rest.forEach(add)

  return items
}

function getDefectPhase(defect, actions) {
  const defectActions = actions.filter((action) => Number(action.defect_id) === Number(defect.id))
  const stats = getActionStats(defectActions)

  return computeDefectPhase({
    total: stats.total,
    submitted: stats.submitted,
    verified: stats.verified,
    rootConfirmed: defect?.root_cause_status === 'confirmed',
    isClosed: defect?.defect_status === 'closed'
  })
}

export const ATTENTION_TONE_BY_KIND = {
  overdue: 'red',
  'evidence-required': 'amber',
  'urgent-review': 'amber',
  expiry: 'amber',
  'submitted-review': 'purple',
  'new-defect': 'blue',
  'confirm-root-cause': 'purple',
  'ready-to-close': 'green',
  'new-assignment': 'blue',
  attention: 'purple',
  'report-submitted': 'blue'
}

export function getAttentionTone(kind) {
  return ATTENTION_TONE_BY_KIND[kind] || 'blue'
}

function buildRawNotifications(user, actions = [], defects = []) {
  const notifications = []
  const managerView = isManager(user)
  const urgentReviewDefectIds = new Set()

  if (managerView) {
    actions
      .filter((action) => isActionOverdue(action.due_date, action.ca_status))
      .forEach((action) => {
        notifications.push({
          id: `overdue-ca-${action.id}`,
          kind: 'overdue',
          title: `${action.action_code} — overdue`,
          subtitle: `CA due ${formatDueDate(action.due_date)} · ${action.assigned_to_name || 'Unassigned'} · ${action.defect_code}`,
          path: `/corrective-actions/${action.id}`,
          priority: 0
        })
      })

    defects
      .map((defect) => ({ defect, notification: getUrgentReviewNotification(defect) }))
      .filter((entry) => entry.notification)
      .forEach(({ defect, notification }) => {
        urgentReviewDefectIds.add(defect.id)
        notifications.push({
          id: `urgent-review-${defect.id}`,
          kind: 'urgent-review',
          title: notification.title,
          subtitle: notification.subtitle,
          path: `/defects/${defect.id}`,
          priority: notification.priority
        })
      })

    defects
      .filter((defect) => hasExpiryMismatch(defect) && defect.defect_status !== 'closed')
      .forEach((defect) => {
        notifications.push({
          id: `expiry-${defect.id}`,
          kind: 'expiry',
          title: `${defect.defect_code} — expiry mismatch`,
          subtitle: `Batch ${defect.batch_number} · expected ${formatExpiryDate(defect.correct_expiry_date)} vs printed ${formatExpiryDate(defect.printed_expiry_date)}`,
          path: `/defects/${defect.id}`,
          priority: 5
        })
      })

    actions
      .filter((action) => action.ca_status === 'completed')
      .forEach((action) => {
        const workerName = action.assigned_to_name || 'Worker'
        const task = action.task || 'corrective action'
        notifications.push({
          id: `ca-${action.id}`,
          kind: 'submitted-review',
          title: `${action.action_code} — Submitted for Review`,
          subtitle: `${workerName} completed ${task}. Verify or reject this action.`,
          path: `/corrective-actions/${action.id}`,
          priority: 1
        })
      })

    defects
      .filter((defect) => defect.defect_status === 'new' && !urgentReviewDefectIds.has(defect.id))
      .forEach((defect) => {
        notifications.push({
          id: `new-defect-${defect.id}`,
          kind: 'new-defect',
          title: `${defect.defect_code} — new defect report`,
          subtitle: `${defect.reported_by_name || 'Worker'} · ${defect.product_name} · review and assign actions`,
          path: `/defects/${defect.id}`,
          priority: 6
        })
      })

    defects
      .filter((defect) => getDefectPhase(defect, actions) === 'confirm_root_cause')
      .forEach((defect) => {
        notifications.push({
          id: `confirm-rc-${defect.id}`,
          kind: 'confirm-root-cause',
          title: `${defect.defect_code} — confirm root cause`,
          subtitle: `${defect.product_name} · all actions verified · confirm on Root Cause tab`,
          path: `/defects/${defect.id}?tab=root-cause`,
          priority: 7
        })
      })

    defects
      .filter((defect) => getDefectPhase(defect, actions) === 'close')
      .forEach((defect) => {
        notifications.push({
          id: `ready-close-${defect.id}`,
          kind: 'ready-to-close',
          title: `${defect.defect_code} — ready to close`,
          subtitle: `${defect.product_name} · root cause confirmed · close defect to complete case`,
          path: `/defects/${defect.id}?tab=root-cause`,
          priority: 7
        })
      })
  } else if (user?.id) {
    notifications.push(...buildWorkerActionNotifications(actions))

    defects
      .filter((defect) =>
        Number(defect.created_by) === Number(user.id)
        && hasExpiryMismatch(defect)
        && defect.defect_status !== 'closed'
      )
      .forEach((defect) => {
        notifications.push({
          id: `expiry-${defect.id}`,
          kind: 'expiry',
          title: `${defect.defect_code} — expiry mismatch on your report`,
          subtitle: `Batch ${defect.batch_number} · check expected vs printed expiry`,
          path: `/defects/${defect.id}`,
          priority: 1
        })
      })

    defects
      .filter((defect) =>
        Number(defect.created_by) === Number(user.id)
        && ['new', 'under_review'].includes(defect.defect_status)
      )
      .forEach((defect) => {
        notifications.push({
          id: `report-${defect.id}`,
          kind: 'report-submitted',
          title: `${defect.defect_code} — report submitted`,
          subtitle: `Waiting for manager review · ${defect.product_name}`,
          path: `/defects/${defect.id}`,
          priority: 3
        })
      })
  }

  return notifications
}

export function buildNotifications(user, actions = [], defects = []) {
  const notifications = buildRawNotifications(user, actions, defects)
  const sorted = notifications.sort((a, b) => a.priority - b.priority)

  return {
    items: selectNotificationItems(sorted),
    count: sorted.length
  }
}

const ATTENTION_GROUP_ORDER = [
  { kind: 'overdue', id: 'overdue', pluralLabel: (n) => `${n} overdue action${n === 1 ? '' : 's'}`, path: '/corrective-actions?caDue=overdue' },
  { kind: 'submitted-review', id: 'submitted-review', pluralLabel: (n) => `${n} action${n === 1 ? '' : 's'} submitted for verification`, path: '/corrective-actions?status=completed' },
  { kind: 'urgent-review', id: 'urgent-review', pluralLabel: (n) => `${n} defect report${n === 1 ? '' : 's'} need urgent review`, path: '/defects?filter=urgent_review' },
  { kind: 'new-defect', id: 'new-reports', pluralLabel: (n) => `${n} new defect report${n === 1 ? '' : 's'} need review`, path: '/defects?filter=new' },
  { kind: 'expiry', id: 'expiry', pluralLabel: (n) => `${n} batch${n === 1 ? '' : 'es'} with expiry mismatch`, path: '/batches?expiry=mismatch' },
  { kind: 'confirm-root-cause', id: 'confirm-root-cause', pluralLabel: (n) => `${n} defect${n === 1 ? '' : 's'} ready to confirm root cause`, path: '/defects' },
  { kind: 'ready-to-close', id: 'ready-to-close', pluralLabel: (n) => `${n} defect${n === 1 ? '' : 's'} ready to close`, path: '/defects' }
]

// Grouped, all-time attention counts for the manager Dashboard — built from the exact
// same predicates as the header bell (buildNotifications) so the two surfaces can never
// disagree on what currently needs attention.
export function buildManagerAttentionSummary(actions = [], defects = [], navigate) {
  const notifications = buildRawNotifications({ role: 'manager' }, actions, defects)
  const countsByKind = new Map()

  notifications.forEach((item) => {
    countsByKind.set(item.kind, (countsByKind.get(item.kind) || 0) + 1)
  })

  return ATTENTION_GROUP_ORDER
    .map((group) => {
      const count = countsByKind.get(group.kind) || 0
      if (count === 0) return null
      return {
        id: group.id,
        tone: getAttentionTone(group.kind),
        count,
        label: group.pluralLabel(count),
        onClick: navigate ? () => navigate(group.path) : undefined
      }
    })
    .filter(Boolean)
}
