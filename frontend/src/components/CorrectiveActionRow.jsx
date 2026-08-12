import ListActionButton from './ListActionButton'
import EntityRow from './EntityRow'
import StatusBadge from './StatusBadge'
import { getDaysLate, isActionOverdue } from '../utils/dueDate'
import { formatCaStatusLabel } from '../utils/caStatusLabel'

function formatDisplayDate(value) {
  if (!value || value === '-') return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function titleCase(value) {
  if (!value) return '-'
  return String(value).replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function statusLabel(status) {
  return formatCaStatusLabel(status)
}

function actionTypeLabel(type) {
  return type === 'product_handling' ? 'Product Handling' : 'Machine Check'
}

function getWorkerProgressHint(status) {
  switch (String(status || '').toLowerCase()) {
    case 'assigned':
      return 'Not started'
    case 'in_progress':
      return 'In progress'
    case 'completed':
      return 'Submitted — waiting for manager verification'
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

function getAccentClass(action, managerView) {
  const overdue = isActionOverdue(action.dueDate, action.status)
  const pendingReview = managerView && action.status === 'completed'
  const highPriority = ['high', 'critical'].includes(String(action.priority || '').toLowerCase())

  if (overdue) return 'bg-red-500'
  if (pendingReview) return 'bg-amber-500'
  if (highPriority) return 'bg-orange-500'
  if (action.status === 'verified') return 'bg-emerald-400'
  if (action.status === 'in_progress') return 'bg-indigo-400'
  return 'bg-slate-300'
}

function getRowTint(action, managerView) {
  if (isActionOverdue(action.dueDate, action.status)) return 'bg-red-50/25'
  if (managerView && action.status === 'completed') return 'bg-amber-50/20'
  return ''
}

export function getActionPriorityScore(action, managerView) {
  let score = 0
  if (isActionOverdue(action.dueDate, action.status)) score += 300
  if (managerView && action.status === 'completed') score += 200
  if (['high', 'critical'].includes(String(action.priority || '').toLowerCase())) score += 100
  if (action.status === 'in_progress') score += 30
  if (action.status === 'assigned') score += 20
  return score
}

export default function CorrectiveActionRow({
  action,
  managerView,
  onOpen,
  onVerify,
  onReject
}) {
  const overdue = isActionOverdue(action.dueDate, action.status)
  const pendingReview = managerView && action.status === 'completed'
  const priority = String(action.priority || '').toLowerCase()
  const highPriority = priority === 'high' || priority === 'critical'
  const daysLate = getDaysLate(action.dueDate, action.status)
  const showManagerActions = managerView && action.status === 'completed'
  const verifyBlocked = managerView && action.status === 'completed'
    && action.evidenceRequired && !action.hasEvidence
  const accentClass = getAccentClass(action, managerView)
  const rowTint = getRowTint(action, managerView)
  const Badge = EntityRow.Badge
  const workerProgressHint = !managerView ? getWorkerProgressHint(action.status) : null

  const footerParts = managerView
    ? [actionTypeLabel(action.type), statusLabel(action.status), action.batchNumber ? `Batch ${action.batchNumber}` : null].filter(Boolean)
    : [
      action.productName || '-',
      action.batchNumber ? `Batch ${action.batchNumber}` : null,
      actionTypeLabel(action.type)
    ].filter(Boolean)

  return (
    <article
      className={[
        'compact-list-row group relative cursor-pointer overflow-hidden hover:shadow-card-hover',
        rowTint
      ].join(' ')}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onOpen()
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`Open corrective action ${action.code}`}
    >
      <div className={`list-row-accent ${accentClass}`} aria-hidden="true" />

      <div className="list-row-inner">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1">
            <span className="list-row-code">{action.code}</span>
            {!managerView && <StatusBadge kind="ca" value={action.status} />}
            {!managerView && highPriority && (
              <Badge tone={priority === 'critical' ? 'red' : 'orange'}>
                CA {titleCase(action.priority)}
              </Badge>
            )}
            {!managerView && action.evidenceRequired && (
              <Badge tone="amber">Evidence Required</Badge>
            )}
          </div>
          <p className="list-row-meta line-clamp-1 !text-brand-ink">{action.task}</p>
          {managerView ? (
            <p className="list-row-meta">
              <span className="text-brand-muted/80">Assigned:</span>{' '}
              <span className="font-medium text-brand-700">{action.assignedToName || 'Unassigned'}</span>
              <span className="text-brand-border"> · </span>
              <span className="text-brand-muted/80">CA Due Date:</span>{' '}
              <span className={`font-medium ${overdue ? 'text-red-700' : 'text-brand-700'}`}>
                {formatDisplayDate(action.dueDate)}
              </span>
              <span className="text-brand-border"> · </span>
              <span className="text-brand-muted/80">Defect:</span>{' '}
              <span className="font-mono font-medium text-brand-700">{action.defectCode || '-'}</span>
            </p>
          ) : (
            <p className="list-row-meta">
              <span className="text-brand-muted/80">Defect:</span>{' '}
              <span className="font-mono font-medium text-brand-700">{action.defectCode || '-'}</span>
              <span className="text-brand-border"> · </span>
              <span className="text-brand-muted/80">CA Due Date:</span>{' '}
              <span className={`font-medium ${overdue ? 'text-red-700' : 'text-brand-700'}`}>
                {formatDisplayDate(action.dueDate)}
              </span>
            </p>
          )}
          <p className="list-row-meta">{footerParts.join(' · ')}</p>
          {!managerView && workerProgressHint && (
            <p className="list-row-meta">
              <span className="font-medium text-brand-700">{workerProgressHint}</span>
              {action.evidenceRequired && (
                <span className="text-brand-muted"> · Evidence required before completion</span>
              )}
            </p>
          )}
        </div>

        <div
          className="list-row-actions"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
        >
          {overdue && (
            <Badge tone="red">
              {managerView
                ? `Overdue${daysLate > 0 ? ` · ${daysLate}d` : ''}`
                : `Action Required · Overdue by ${daysLate || 1} day${daysLate === 1 ? '' : 's'}`}
            </Badge>
          )}
          {pendingReview && !overdue && (
            <Badge tone="amber">{formatCaStatusLabel('completed')}</Badge>
          )}
          {managerView && highPriority && (
            <Badge tone={priority === 'critical' ? 'red' : 'orange'}>
              {titleCase(action.priority)}
            </Badge>
          )}
          <ListActionButton intent="view" onClick={onOpen} />
          {showManagerActions && (
            <>
              <ListActionButton
                intent="verify"
                onClick={onVerify}
                disabled={verifyBlocked}
                title={verifyBlocked ? 'Evidence is required before verification.' : undefined}
              />
              <ListActionButton intent="reject" onClick={onReject} />
            </>
          )}
        </div>
      </div>
    </article>
  )
}
