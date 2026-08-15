const ROOT_CAUSE_STATUS_LABELS = {
  pending_investigation: 'Pending Investigation',
  suspected: 'Suspected',
  confirmed: 'Confirmed'
}

const WORKER_ROOT_CAUSE_STATUS_LABELS = {
  pending_investigation: 'Not Started',
  suspected: 'Worker Investigating',
  confirmed: 'Manager Confirmed'
}

export function formatRootCauseStatusLabel(status, audience = 'manager') {
  const normalized = String(status || '').toLowerCase()

  if (audience === 'worker' && WORKER_ROOT_CAUSE_STATUS_LABELS[normalized]) {
    return WORKER_ROOT_CAUSE_STATUS_LABELS[normalized]
  }

  if (ROOT_CAUSE_STATUS_LABELS[normalized]) return ROOT_CAUSE_STATUS_LABELS[normalized]

  return String(status || 'Unknown')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}
