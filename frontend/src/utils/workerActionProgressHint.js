export function getWorkerActionProgressHint(status) {
  switch (String(status || '').toLowerCase()) {
    case 'assigned':
      return 'Not started'
    case 'in_progress':
      return 'In progress'
    case 'completed':
      return 'Submitted — Awaiting Verification'
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
