import { createdInReportPeriod } from '../components/ReportPeriodFilter'

export function buildAttentionSearchParams(period, selectedMonth, extra = {}) {
  const params = new URLSearchParams()

  if (period && period !== 'all') {
    params.set('period', period)
  }
  if (period === 'custom_month' && selectedMonth) {
    params.set('month', selectedMonth)
  }

  Object.entries(extra).forEach(([key, value]) => {
    if (value != null && value !== '') {
      params.set(key, value)
    }
  })

  return params
}

export function buildAttentionPath(basePath, period, selectedMonth, extra = {}) {
  const params = buildAttentionSearchParams(period, selectedMonth, extra)
  const query = params.toString()
  return query ? `${basePath}?${query}` : basePath
}

export function parseAttentionPeriod(searchParams) {
  const period = searchParams.get('period')
  if (!period || period === 'all') return null
  return {
    period,
    month: searchParams.get('month') || ''
  }
}

export function matchesAttentionCreatedPeriod(createdAt, attentionPeriod) {
  if (!attentionPeriod?.period) return true
  return createdInReportPeriod(createdAt, attentionPeriod.period, attentionPeriod.month)
}

export function buildAttentionPrimaryPath(period, selectedMonth, items = []) {
  const ids = items.map((item) => item.id)

  if (ids.includes('overdue')) {
    return buildAttentionPath('/corrective-actions', period, selectedMonth, { caDue: 'overdue' })
  }
  if (ids.includes('urgent-review')) {
    return buildAttentionPath('/defects', period, selectedMonth, { filter: 'urgent_review' })
  }
  if (ids.includes('new-reports')) {
    return buildAttentionPath('/defects', period, selectedMonth, { filter: 'new' })
  }
  if (ids.includes('expiry')) {
    return buildAttentionPath('/batches', period, selectedMonth, { expiry: 'mismatch' })
  }

  return '/corrective-actions'
}

export function formatAttentionPeriodLabel(attentionPeriod) {
  if (!attentionPeriod?.period) return null

  if (attentionPeriod.period === 'custom_month' && /^\d{4}-(0[1-9]|1[0-2])$/.test(attentionPeriod.month || '')) {
    const [year, month] = attentionPeriod.month.split('-').map(Number)
    return new Date(year, month - 1, 1).toLocaleDateString('en-MY', { month: 'long', year: 'numeric' })
  }

  const labels = {
    today: 'Today',
    last_7_days: 'Last 7 Days',
    this_month: 'This Month',
    last_month: 'Last Month',
    this_year: 'This Year',
    all: 'All Time'
  }

  return labels[attentionPeriod.period] || null
}

export function getAttentionActionLabel(items = []) {
  if (items.length > 1) return 'View All'
  if (items.length === 1) {
    if (items[0].id === 'overdue') return 'View Overdue Actions'
    if (items[0].id === 'urgent-review') return 'View Urgent Reports'
    if (items[0].id === 'expiry') return 'View Expiry Issues'
    if (items[0].id === 'new-reports') return 'View New Reports'
  }
  return 'View All'
}
