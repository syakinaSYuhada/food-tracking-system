import { isActionOverdue } from './dueDate'
import { todayDateString } from './defectReviewDue'

export const DEFECT_REPORTED_DATE_OPTIONS = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'this_week', label: 'This Week' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'custom_range', label: 'Custom Range' }
]

export const CA_DUE_DATE_OPTIONS = [
  { value: 'all', label: 'All Time' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'due_today', label: 'Due Today' },
  { value: 'due_this_week', label: 'Due This Week' },
  { value: 'this_month', label: 'This Month' },
  { value: 'no_due_date', label: 'No Due Date' }
]

export const RETORT_DATE_OPTIONS = [
  { value: 'all', label: 'All Time' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'this_year', label: 'This Year' },
  { value: 'custom_range', label: 'Custom Range' }
]

export const ACTIVITY_LOG_DATE_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: 'last_7_days', label: 'Last 7 Days' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'this_year', label: 'This Year' },
  { value: 'custom_range', label: 'Custom Range' },
  { value: 'all', label: 'All Time' }
]

export function toLocalDateString(value) {
  if (!value) return null

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed
    const parsed = new Date(trimmed)
    if (Number.isNaN(parsed.getTime())) return null
    const year = parsed.getFullYear()
    const month = String(parsed.getMonth() + 1).padStart(2, '0')
    const day = String(parsed.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  if (value instanceof Date) {
    const year = value.getFullYear()
    const month = String(value.getMonth() + 1).padStart(2, '0')
    const day = String(value.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  return toLocalDateString(String(value))
}

function parseLocalDate(dateString) {
  const normalized = toLocalDateString(dateString)
  if (!normalized) return null
  return new Date(`${normalized}T00:00:00`)
}

function startOfWeek(dateString) {
  const date = parseLocalDate(dateString)
  if (!date) return null
  const day = date.getDay()
  const diff = day === 0 ? 6 : day - 1
  date.setDate(date.getDate() - diff)
  return toLocalDateString(date)
}

function endOfWeek(dateString) {
  const start = parseLocalDate(startOfWeek(dateString))
  if (!start) return null
  start.setDate(start.getDate() + 6)
  return toLocalDateString(start)
}

function startOfMonth(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}-01`
}

function startOfLastMonth(date) {
  const copy = new Date(date.getFullYear(), date.getMonth() - 1, 1)
  return startOfMonth(copy)
}

function startOfNextMonth(date) {
  const copy = new Date(date.getFullYear(), date.getMonth() + 1, 1)
  return startOfMonth(copy)
}

function startOfYear(date) {
  return `${date.getFullYear()}-01-01`
}

export function getDateFilterLabel(filter, { customFrom, customTo } = {}) {
  const optionLists = [
    DEFECT_REPORTED_DATE_OPTIONS,
    CA_DUE_DATE_OPTIONS,
    RETORT_DATE_OPTIONS,
    ACTIVITY_LOG_DATE_OPTIONS
  ]

  for (const options of optionLists) {
    const match = options.find((option) => option.value === filter)
    if (match) {
      if (filter === 'custom_range' && customFrom && customTo) {
        return `${customFrom} to ${customTo}`
      }
      return match.label
    }
  }

  return 'All Time'
}

export function matchesReportedDateFilter(dateValue, filter, { customFrom, customTo } = {}) {
  if (!filter || filter === 'all') return true

  const dateStr = toLocalDateString(dateValue)
  if (!dateStr) return false

  const today = todayDateString()
  const now = new Date()

  if (filter === 'today') return dateStr === today
  if (filter === 'this_week') {
    const weekStart = startOfWeek(today)
    const weekEnd = endOfWeek(today)
    return dateStr >= weekStart && dateStr <= weekEnd
  }
  if (filter === 'this_month') return dateStr >= startOfMonth(now) && dateStr < startOfNextMonth(now)
  if (filter === 'last_month') {
    return dateStr >= startOfLastMonth(now) && dateStr < startOfMonth(now)
  }
  if (filter === 'custom_range') {
    if (!customFrom || !customTo) return true
    return dateStr >= customFrom && dateStr <= customTo
  }

  return true
}

export function matchesRetortDateFilterValue(dateValue, filter, { customFrom, customTo } = {}) {
  if (!filter || filter === 'all') return true

  const dateStr = toLocalDateString(dateValue)
  if (!dateStr) return false

  const today = todayDateString()
  const now = new Date()

  if (filter === 'this_month') return dateStr >= startOfMonth(now) && dateStr < startOfNextMonth(now)
  if (filter === 'last_month') return dateStr >= startOfLastMonth(now) && dateStr < startOfMonth(now)
  if (filter === 'this_year') return dateStr >= startOfYear(now)
  if (filter === 'custom_range') {
    if (!customFrom || !customTo) return true
    return dateStr >= customFrom && dateStr <= customTo
  }

  return true
}

const OPEN_CA_STATUSES = ['assigned', 'in_progress', 'rejected']

export function matchesCaDueFilter(dueDate, status, filter) {
  if (!filter || filter === 'all') return true

  const dueStr = toLocalDateString(dueDate)
  const today = todayDateString()
  const now = new Date()

  if (filter === 'no_due_date') return !dueStr
  if (!dueStr) return false

  if (filter === 'overdue') return isActionOverdue(dueStr, status)
  if (filter === 'due_today') {
    return dueStr === today && OPEN_CA_STATUSES.includes(String(status || '').toLowerCase())
  }
  if (filter === 'due_this_week') {
    const weekStart = startOfWeek(today)
    const weekEnd = endOfWeek(today)
    return dueStr >= weekStart && dueStr <= weekEnd
  }
  if (filter === 'this_month') {
    return dueStr >= startOfMonth(now) && dueStr < startOfNextMonth(now)
  }

  return true
}

export function buildActivityLogQueryParams({
  period,
  customFrom,
  customTo,
  entityFilter,
  page,
  limit
}) {
  const params = { page, limit }

  if (entityFilter && entityFilter !== 'all') {
    params.entity_type = entityFilter
  }

  if (period && period !== 'all') {
    params.period = period
  }

  if (period === 'custom_range') {
    if (customFrom) params.date_from = customFrom
    if (customTo) params.date_to = customTo
  }

  return params
}

export function matchesActivityLogSearch(log, keyword) {
  const term = String(keyword || '').trim().toLowerCase()
  if (!term) return true

  return [log.description, log.action_type, log.entity_type, log.user_name, log.old_value, log.new_value]
    .some((value) => String(value || '').toLowerCase().includes(term))
}

export async function fetchAllActivityLogs(api, baseParams = {}) {
  const rows = []
  let page = 1
  let totalPages = 1

  while (page <= totalPages) {
    const res = await api.get('/activity-logs', {
      params: { ...baseParams, page, limit: 100 }
    })
    const payload = res.data.data || {}
    rows.push(...(payload.items || []))
    totalPages = payload.pagination?.totalPages || 1
    page += 1
  }

  return rows
}
