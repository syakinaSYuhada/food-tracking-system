export function formatReviewDueDate(value) {
  if (!value) return null
  if (typeof value === 'string') return value.split('T')[0]
  if (value instanceof Date) {
    const year = value.getFullYear()
    const month = String(value.getMonth() + 1).padStart(2, '0')
    const day = String(value.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  return String(value).split('T')[0]
}

export function todayDateString() {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getReviewDueStatus(reviewDueDate, defectStatus) {
  const due = formatReviewDueDate(reviewDueDate)
  if (!due || defectStatus === 'closed') return null

  const today = todayDateString()
  if (due < today) return 'overdue'
  if (due === today) return 'today'
  return null
}

export function getReviewDueBadge(reviewDueDate, defectStatus, options = {}) {
  const status = getReviewDueStatus(reviewDueDate, defectStatus)
  const workerView = Boolean(options.workerView)
  const managerReviewHint = 'Manager review due date set during defect reporting.'

  if (status === 'overdue') {
    return {
      label: workerView ? 'Manager Review Overdue' : 'Review Overdue',
      tone: 'red',
      title: workerView ? managerReviewHint : undefined
    }
  }
  if (status === 'today') {
    return {
      label: workerView ? 'Manager Review Due Today' : 'Review Due Today',
      tone: 'amber',
      title: workerView ? managerReviewHint : undefined
    }
  }
  return null
}

export function getDefectStatus(defect) {
  return String(defect?.status || defect?.defect_status || '').toLowerCase()
}

export function isOpenDefect(defect) {
  return getDefectStatus(defect) !== 'closed'
}

export function isUrgentDefectPriority(defect) {
  const priority = String(defect?.priority || '').toLowerCase()
  return priority === 'urgent' || priority === 'critical'
}

export function getDefectAttentionReasons(defect, managerView) {
  const reasons = []
  if (getReviewDueStatus(defect?.reviewDueDate, defect?.status) === 'overdue') reasons.push('Overdue')
  if (managerView && defect?.problemLevel === 'Food Safety Risk') reasons.push('Food Safety Risk')
  if (isUrgentDefectPriority(defect)) reasons.push('Urgent Priority')
  return { flagged: reasons.length > 0, reasons }
}

export function needsManagerReviewAttention(defect) {
  if (!isOpenDefect(defect)) return false
  return Boolean(getReviewDueStatus(defect.reviewDueDate || defect.review_due_date, getDefectStatus(defect)))
    || isUrgentDefectPriority(defect)
}

export function matchesUrgentReviewFilter(defect) {
  if (!isOpenDefect(defect)) return false
  return isUrgentDefectPriority(defect)
    || Boolean(getReviewDueStatus(defect.reviewDueDate || defect.review_due_date, getDefectStatus(defect)))
}

export function getDefectReviewSortRank(defect) {
  const reviewStatus = getReviewDueStatus(defect.reviewDueDate || defect.review_due_date, getDefectStatus(defect))
  const priority = String(defect?.priority || '').toLowerCase()

  if (reviewStatus === 'overdue') return 0
  if (reviewStatus === 'today') return 1
  if (priority === 'urgent' || priority === 'critical') return 2
  if (priority === 'high') return 3
  return 4
}

export function compareDefectsForReviewUrgency(a, b) {
  const rankDiff = getDefectReviewSortRank(a) - getDefectReviewSortRank(b)
  if (rankDiff !== 0) return rankDiff

  const aTime = new Date(a.createdAt || a.created_at || 0).getTime()
  const bTime = new Date(b.createdAt || b.created_at || 0).getTime()
  return bTime - aTime
}

export function summarizeUrgentReviewAttention(defects = []) {
  let urgent = 0
  let dueToday = 0
  let overdue = 0

  for (const defect of defects) {
    if (!isOpenDefect(defect)) continue
    const reviewStatus = getReviewDueStatus(defect.reviewDueDate || defect.review_due_date, getDefectStatus(defect))
    if (isUrgentDefectPriority(defect)) urgent += 1
    if (reviewStatus === 'today') dueToday += 1
    if (reviewStatus === 'overdue') overdue += 1
  }

  return { urgent, dueToday, overdue }
}

export function formatUrgentReviewCountSummary({ urgent = 0, dueToday = 0, overdue = 0 } = {}) {
  const parts = []
  if (urgent > 0) parts.push(`${urgent} urgent`)
  if (dueToday > 0) parts.push(`${dueToday} due today`)
  if (overdue > 0) parts.push(`${overdue} overdue`)
  return parts.join(' · ')
}

export function hasUrgentReviewAttention(summary) {
  return Number(summary?.urgent || 0) > 0
    || Number(summary?.dueToday || 0) > 0
    || Number(summary?.overdue || 0) > 0
}

export const DEFECT_PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' }
]

export function mapRecommendedPriority(value) {
  const normalized = String(value || 'medium').toLowerCase()
  if (normalized === 'critical') return 'urgent'
  return DEFECT_PRIORITY_OPTIONS.some((option) => option.value === normalized) ? normalized : 'medium'
}

export function formatDefectPriorityLabel(value) {
  if (!value) return '-'
  const normalized = String(value).toLowerCase()
  if (normalized === 'critical') return 'Urgent'
  return String(value).replaceAll('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}
