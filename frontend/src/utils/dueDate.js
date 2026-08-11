export function isActionOverdue(dueDate, status) {
  if (!dueDate) return false

  const openStatuses = ['assigned', 'in_progress', 'rejected']
  if (!openStatuses.includes(String(status || '').toLowerCase())) return false

  const due = String(dueDate).split('T')[0]
  const today = new Date().toISOString().split('T')[0]
  return due < today
}

export function getDaysLate(dueDate, status) {
  if (!isActionOverdue(dueDate, status)) return 0

  const due = new Date(`${String(dueDate).split('T')[0]}T00:00:00`)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return Math.max(0, Math.floor((today - due) / (1000 * 60 * 60 * 24)))
}

export function isActionDueThisWeek(dueDate, status) {
  const normalizedStatus = String(status || '').toLowerCase()
  if (!['assigned', 'in_progress'].includes(normalizedStatus)) return false
  if (isActionOverdue(dueDate, status)) return false

  const dueStr = String(dueDate || '').split('T')[0]
  if (!dueStr || dueStr === '-') return false

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const end = new Date(today)
  end.setDate(end.getDate() + 7)

  const due = new Date(`${dueStr}T00:00:00`)
  return due >= today && due <= end
}
