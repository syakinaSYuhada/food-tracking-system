export function isCriticalActionPriority(action) {
  return String(action?.priority || '').toLowerCase() === 'critical'
}
