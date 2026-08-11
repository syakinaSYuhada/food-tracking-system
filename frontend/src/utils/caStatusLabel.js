const CA_STATUS_LABELS = {
  assigned: 'Assigned',
  in_progress: 'In Progress',
  completed: 'Submitted — Awaiting Verification',
  verified: 'Verified',
  rejected: 'Rejected',
  cancelled: 'Cancelled'
}

export function formatCaStatusLabel(status) {
  const normalized = String(status || '').toLowerCase()
  if (CA_STATUS_LABELS[normalized]) return CA_STATUS_LABELS[normalized]

  return String(status || 'Unknown')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}
