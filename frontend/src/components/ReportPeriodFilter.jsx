export const PERIOD_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: 'last_7_days', label: 'Last 7 Days' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'this_year', label: 'This Year' },
  { value: 'custom_month', label: 'Choose Month' },
  { value: 'all', label: 'All Time' }
]

export function currentMonthValue() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

export function buildReportPeriodParams(period, selectedMonth) {
  const params = { period }
  if (period === 'custom_month') {
    params.month = selectedMonth
  }
  return params
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

/** Client-side mirror of backend report period filters (created_at). */
export function createdInReportPeriod(createdAt, period, selectedMonth) {
  if (!createdAt) return false
  const created = new Date(createdAt)
  if (Number.isNaN(created.getTime())) return false
  const now = new Date()

  if (period === 'custom_month' && /^\d{4}-(0[1-9]|1[0-2])$/.test(String(selectedMonth || ''))) {
    const [year, month] = selectedMonth.split('-').map(Number)
    return created.getFullYear() === year && created.getMonth() === month - 1
  }

  const today = startOfDay(now)
  const createdDay = startOfDay(created)

  switch (period) {
    case 'today':
      return createdDay.getTime() === today.getTime()
    case 'last_7_days': {
      const start = new Date(today)
      start.setDate(start.getDate() - 6)
      return createdDay >= start && createdDay <= today
    }
    case 'last_month': {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const end = new Date(now.getFullYear(), now.getMonth(), 1)
      return created >= start && created < end
    }
    case 'this_year':
      return created.getFullYear() === now.getFullYear()
    case 'all':
      return true
    case 'this_month':
    default: {
      const start = new Date(now.getFullYear(), now.getMonth(), 1)
      return created >= start
    }
  }
}

export default function ReportPeriodFilter({ value, month, onChange, onMonthChange }) {
  return (
    <div className="surface-card flex flex-wrap items-center gap-2 px-3 py-1.5">
      <div className="text-[0.6875rem] font-semibold uppercase text-brand-muted">Period</div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="field-control !mt-0 w-auto min-w-[130px] !rounded-xl !py-1.5 !text-caption"
      >
        {PERIOD_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {value === 'custom_month' && (
        <input
          type="month"
          value={month}
          onChange={(e) => onMonthChange(e.target.value)}
          className="field-control !mt-0 w-auto !rounded-xl !py-1.5 !text-caption"
        />
      )}
    </div>
  )
}
