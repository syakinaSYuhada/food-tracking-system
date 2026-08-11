/**
 * Calendar-date helpers for YYYY-MM-DD strings.
 * Avoids UTC shifts from Date.toISOString() when adding months or formatting.
 */

export function parseDateOnly(value) {
  if (!value) return null

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return {
      year: value.getFullYear(),
      month: value.getMonth() + 1,
      day: value.getDate()
    }
  }

  const str = String(value).split('T')[0]
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str)
  if (!match) return null

  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3])
  }
}

export function formatDateOnlyParts({ year, month, day }) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function toDateOnlyString(value) {
  const parts = parseDateOnly(value)
  return parts ? formatDateOnlyParts(parts) : null
}

export function addMonthsToDateOnly(dateString, months) {
  const parts = parseDateOnly(dateString)
  if (!parts) return null

  const monthCount = Number(months)
  if (!Number.isFinite(monthCount)) return null

  const date = new Date(parts.year, parts.month - 1, parts.day, 12, 0, 0, 0)
  date.setMonth(date.getMonth() + monthCount)

  return formatDateOnlyParts({
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate()
  })
}

export function diffDateOnlyDays(leftDate, rightDate) {
  const left = parseDateOnly(leftDate)
  const right = parseDateOnly(rightDate)
  if (!left || !right) return 0

  const leftUtc = Date.UTC(left.year, left.month - 1, left.day)
  const rightUtc = Date.UTC(right.year, right.month - 1, right.day)
  return Math.round((leftUtc - rightUtc) / (1000 * 60 * 60 * 24))
}

export function getExpiryDifferenceLabel(correctExpiryDate, printedExpiryDate) {
  const diffDays = diffDateOnlyDays(correctExpiryDate, printedExpiryDate)

  if (diffDays === 0) return 'Dates match'
  if (diffDays > 0) {
    return `${diffDays} day${diffDays === 1 ? '' : 's'} early`
  }

  const lateDays = Math.abs(diffDays)
  return `${lateDays} day${lateDays === 1 ? '' : 's'} late`
}
