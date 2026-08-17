import { isActionOverdue } from './dueDate'

export function isCriticalActionPriority(action) {
  return String(action?.priority || '').toLowerCase() === 'critical'
}

export function getActionAttentionReasons(action) {
  const reasons = []
  if (isActionOverdue(action?.dueDate, action?.status)) reasons.push('Overdue')
  if (isCriticalActionPriority(action)) reasons.push('Critical Priority')
  return { flagged: reasons.length > 0, reasons }
}
