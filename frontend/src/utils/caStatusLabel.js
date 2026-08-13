const CA_STATUS_LABELS = {
  assigned: 'Assigned',
  in_progress: 'In Progress',
  verified: 'Verified',
  rejected: 'Rejected',
  cancelled: 'Cancelled'
}

const COMPLETED_LABELS = {
  manager: 'Completed',
  worker: 'Submitted — Awaiting Verification'
}

export function formatCaStatusLabel(status, audience = 'manager') {
  const normalized = String(status || '').toLowerCase()

  if (normalized === 'completed') {
    return COMPLETED_LABELS[audience === 'worker' ? 'worker' : 'manager']
  }

  if (CA_STATUS_LABELS[normalized]) return CA_STATUS_LABELS[normalized]

  return String(status || 'Unknown')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}
