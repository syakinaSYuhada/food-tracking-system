import { formatCaStatusLabel } from '../utils/caStatusLabel'

const dotColors = {
  active: 'bg-emerald-500',
  development: 'bg-brand-500',
  archived: 'bg-slate-400',
  approved: 'bg-emerald-500',
  defective: 'bg-red-500',
  on_hold: 'bg-amber-500',
  new: 'bg-brand-500',
  under_review: 'bg-amber-500',
  in_progress: 'bg-indigo-500',
  completed: 'bg-purple-500',
  verified: 'bg-emerald-500',
  closed: 'bg-slate-400',
  rejected: 'bg-red-500',
  cancelled: 'bg-slate-400',
  assigned: 'bg-slate-400',
  action_assigned: 'bg-brand-500',
  ready_verification: 'bg-purple-500',
  pending: 'bg-amber-500',
  pending_investigation: 'bg-slate-400',
  suspected: 'bg-amber-500',
  confirmed: 'bg-emerald-500',
  pending_review: 'bg-amber-500',
  loss_confirmed: 'bg-red-500',
  no_loss: 'bg-emerald-500',
  manager: 'bg-brand-500',
  worker: 'bg-indigo-500',
  inactive: 'bg-slate-400'
}

const labels = {
  new: 'New',
  under_review: 'Under Review',
  action_assigned: 'Actions Assigned',
  in_progress: 'In Progress',
  ready_verification: 'Ready for Verification',
  closed: 'Closed',
  assigned: 'Assigned',
  completed: 'Completed',
  verified: 'Verified',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
  pending_investigation: 'Pending Investigation',
  suspected: 'Suspected',
  confirmed: 'Confirmed',
  pending_review: 'Pending Review',
  loss_confirmed: 'Loss Confirmed',
  no_loss: 'No Loss'
}

const styles = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
  development: 'bg-brand-50 text-brand-700 border-brand-200/80',
  archived: 'bg-slate-100 text-slate-600 border-slate-200/80',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
  defective: 'bg-red-50 text-red-700 border-red-200/80',
  on_hold: 'bg-amber-50 text-amber-800 border-amber-200/80',
  new: 'bg-brand-50 text-brand-700 border-brand-200/80',
  under_review: 'bg-amber-50 text-amber-800 border-amber-200/80',
  in_progress: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
  completed: 'bg-purple-50 text-purple-700 border-purple-200/80',
  verified: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
  closed: 'bg-slate-100 text-slate-700 border-slate-200/80',
  rejected: 'bg-red-50 text-red-700 border-red-200/80',
  cancelled: 'bg-slate-100 text-slate-600 border-slate-200/80',
  assigned: 'bg-slate-50 text-slate-700 border-slate-200/80',
  action_assigned: 'bg-brand-50 text-brand-700 border-brand-200/80',
  ready_verification: 'bg-purple-50 text-purple-700 border-purple-200/80',
  pending: 'bg-amber-50 text-amber-800 border-amber-200/80',
  pending_investigation: 'bg-slate-100 text-slate-600 border-slate-200/80',
  suspected: 'bg-amber-50 text-amber-800 border-amber-200/80',
  confirmed: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
  pending_review: 'bg-amber-50 text-amber-800 border-amber-200/80',
  loss_confirmed: 'bg-red-50 text-red-700 border-red-200/80',
  no_loss: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
  manager: 'bg-brand-50 text-brand-700 border-brand-200/80',
  worker: 'bg-indigo-50 text-indigo-700 border-indigo-200/80',
  inactive: 'bg-slate-100 text-slate-600 border-slate-200/80'
}

function StatusBadge({ value, kind, audience, prefix }) {
  const normalized = String(value || '').toLowerCase()
  const workerDefectLabels = {
    action_assigned: 'Work Assigned'
  }
  const statusLabel = kind === 'ca'
    ? formatCaStatusLabel(normalized)
    : (audience === 'worker' && workerDefectLabels[normalized]
      ? workerDefectLabels[normalized]
      : (labels[normalized] || String(value || 'Unknown')
        .replaceAll('_', ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase())))
  const label = prefix ? `${prefix}: ${statusLabel}` : statusLabel
  const styleClass = styles[normalized] || 'bg-slate-100 text-slate-700 border-slate-200/80'
  const dotClass = dotColors[normalized] || 'bg-slate-400'

  return (
    <span className={`badge ${styleClass}`}>
      <span className={`badge-dot ${dotClass}`} aria-hidden="true" />
      {label}
    </span>
  )
}

export default StatusBadge
