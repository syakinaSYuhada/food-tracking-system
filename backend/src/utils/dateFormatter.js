function formatDateOnly(value) {
  if (!value) return null

  if (typeof value === 'string') {
    return value.split('T')[0]
  }

  if (value instanceof Date) {
    const year = value.getFullYear()
    const month = String(value.getMonth() + 1).padStart(2, '0')
    const day = String(value.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  return value
}

function formatBatchDates(batch) {
  return {
    ...batch,
    production_date: formatDateOnly(batch.production_date),
    retort_date: formatDateOnly(batch.retort_date),
    correct_expiry_date: formatDateOnly(batch.correct_expiry_date),
    printed_expiry_date: formatDateOnly(batch.printed_expiry_date),
    loss_confirmed_date: formatDateOnly(batch.loss_confirmed_date),
    due_date: formatDateOnly(batch.due_date),
    review_due_date: formatDateOnly(batch.review_due_date)
  }
}

function localTodayDateString() {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

module.exports = {
  formatDateOnly,
  formatBatchDates,
  localTodayDateString
}