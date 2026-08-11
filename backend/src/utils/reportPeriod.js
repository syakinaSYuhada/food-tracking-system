const PERIOD_OPTIONS = ['today', 'last_7_days', 'this_month', 'last_month', 'this_year', 'all', 'custom_month']

function isValidMonth(value) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(String(value || ''))
}

function currentMonthValue() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

function parseReportPeriod(query = {}) {
  const period = String(query.period || 'this_month').toLowerCase()
  const month = String(query.month || '')
  const dateFrom = String(query.date_from || query.dateFrom || '')
  const dateTo = String(query.date_to || query.dateTo || '')

  if (period === 'custom_month' && isValidMonth(month)) {
    return { period: 'custom_month', month }
  }

  if (period === 'custom_range') {
    return { period: 'custom_range', dateFrom, dateTo }
  }

  if (PERIOD_OPTIONS.includes(period) && period !== 'custom_month') {
    return { period }
  }

  return { period: 'this_month' }
}

function monthRangeClause(month, alias = 'd') {
  const column = `${alias}.created_at`
  const start = `${month}-01`
  return `${column} >= '${start}'::date AND ${column} < ('${start}'::date + INTERVAL '1 month')`
}

function createdAtClause(periodConfig, alias = 't', options = {}) {
  const column = `${alias}.created_at`
  const { dateFrom, dateTo } = options

  if (periodConfig.period === 'custom_range') {
    if (dateFrom && dateTo) {
      return `${column} >= '${dateFrom}'::date AND ${column} < ('${dateTo}'::date + INTERVAL '1 day')`
    }
    return 'TRUE'
  }

  if (periodConfig.period === 'custom_month') {
    return monthRangeClause(periodConfig.month, alias)
  }

  switch (periodConfig.period) {
    case 'today':
      return `${column} >= CURRENT_DATE AND ${column} < CURRENT_DATE + INTERVAL '1 day'`
    case 'last_7_days':
      return `${column} >= CURRENT_DATE - INTERVAL '6 days'`
    case 'last_month':
      return `${column} >= date_trunc('month', CURRENT_DATE - INTERVAL '1 month') AND ${column} < date_trunc('month', CURRENT_DATE)`
    case 'this_year':
      return `${column} >= date_trunc('year', CURRENT_DATE)`
    case 'all':
      return 'TRUE'
    case 'this_month':
    default:
      return `${column} >= date_trunc('month', CURRENT_DATE)`
  }
}

function defectCreatedClause(periodConfig, alias = 'd') {
  return createdAtClause(periodConfig, alias, {
    dateFrom: periodConfig.dateFrom,
    dateTo: periodConfig.dateTo
  })
}

function actionCreatedClause(periodConfig, alias = 'ca') {
  const column = `${alias}.created_at`

  if (periodConfig.period === 'custom_month') {
    return monthRangeClause(periodConfig.month, alias)
  }

  switch (periodConfig.period) {
    case 'today':
      return `${column} >= CURRENT_DATE AND ${column} < CURRENT_DATE + INTERVAL '1 day'`
    case 'last_7_days':
      return `${column} >= CURRENT_DATE - INTERVAL '6 days'`
    case 'last_month':
      return `${column} >= date_trunc('month', CURRENT_DATE - INTERVAL '1 month') AND ${column} < date_trunc('month', CURRENT_DATE)`
    case 'this_year':
      return `${column} >= date_trunc('year', CURRENT_DATE)`
    case 'all':
      return 'TRUE'
    case 'this_month':
    default:
      return `${column} >= date_trunc('month', CURRENT_DATE)`
  }
}

function trendClause(periodConfig) {
  if (periodConfig.period === 'custom_month') {
    const filter = monthRangeClause(periodConfig.month, 'd')
    return {
      bucket: `date_trunc('day', d.created_at)`,
      label: `TO_CHAR(date_trunc('day', d.created_at), 'DD Mon')`,
      filter
    }
  }

  switch (periodConfig.period) {
    case 'today':
      return {
        bucket: `date_trunc('hour', d.created_at)`,
        label: `TO_CHAR(date_trunc('hour', d.created_at), 'HH24:00')`,
        filter: `d.created_at >= CURRENT_DATE AND d.created_at < CURRENT_DATE + INTERVAL '1 day'`
      }
    case 'last_7_days':
      return {
        bucket: `date_trunc('day', d.created_at)`,
        label: `TO_CHAR(date_trunc('day', d.created_at), 'DD Mon')`,
        filter: `d.created_at >= CURRENT_DATE - INTERVAL '6 days'`
      }
    case 'last_month':
      return {
        bucket: `date_trunc('day', d.created_at)`,
        label: `TO_CHAR(date_trunc('day', d.created_at), 'DD Mon')`,
        filter: `d.created_at >= date_trunc('month', CURRENT_DATE - INTERVAL '1 month') AND d.created_at < date_trunc('month', CURRENT_DATE)`
      }
    case 'this_year':
      return {
        bucket: `date_trunc('month', d.created_at)`,
        label: `TO_CHAR(date_trunc('month', d.created_at), 'Mon YYYY')`,
        filter: `d.created_at >= date_trunc('year', CURRENT_DATE)`
      }
    case 'all':
      return {
        bucket: `date_trunc('month', d.created_at)`,
        label: `TO_CHAR(date_trunc('month', d.created_at), 'Mon YYYY')`,
        filter: `d.created_at >= date_trunc('month', CURRENT_DATE) - INTERVAL '11 months'`
      }
    case 'this_month':
    default:
      return {
        bucket: `date_trunc('day', d.created_at)`,
        label: `TO_CHAR(date_trunc('day', d.created_at), 'DD Mon')`,
        filter: `d.created_at >= date_trunc('month', CURRENT_DATE)`
      }
  }
}

function periodLabel(periodConfig) {
  if (periodConfig.period === 'custom_month') {
    const [year, month] = periodConfig.month.split('-').map(Number)
    const date = new Date(year, month - 1, 1)
    return date.toLocaleDateString('en-MY', { month: 'long', year: 'numeric' })
  }

  const labels = {
    today: 'Today',
    last_7_days: 'Last 7 Days',
    this_month: 'This Month',
    last_month: 'Last Month',
    this_year: 'This Year',
    all: 'All Time',
    custom_range: 'Custom Range'
  }

  if (periodConfig.period === 'custom_range' && periodConfig.dateFrom && periodConfig.dateTo) {
    return `${periodConfig.dateFrom} to ${periodConfig.dateTo}`
  }

  return labels[periodConfig.period] || 'This Month'
}

module.exports = {
  PERIOD_OPTIONS,
  isValidMonth,
  currentMonthValue,
  parseReportPeriod,
  createdAtClause,
  defectCreatedClause,
  actionCreatedClause,
  trendClause,
  periodLabel
}
