export function getWorkerActionProgressHint(status) {
  switch (String(status || '').toLowerCase()) {
    case 'assigned':
      return 'Not started'
    // 'in_progress' and 'completed' are intentionally omitted here: their status
    // badge label already says exactly this, so a hint would just repeat it.
    case 'rejected':
      return 'Rejected — revise and resubmit'
    case 'verified':
      return 'Verified by manager'
    case 'cancelled':
      return 'Cancelled by manager'
    default:
      return null
  }
}
