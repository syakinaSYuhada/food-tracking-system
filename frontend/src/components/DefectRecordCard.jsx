import { ChevronDown, ChevronUp } from 'lucide-react'
import StatusBadge from './StatusBadge'
import ListActionButton from './ListActionButton'
import EntityRow from './EntityRow'
import {
  formatDefectPriorityLabel,
  getReviewDueBadge,
  getReviewDueStatus
} from '../utils/defectReviewDue'

const ACCENT_BY_LEVEL = {
  'Food Safety Risk': 'bg-red-500',
  'Cannot Be Sold': 'bg-orange-500',
  'Hold for Review': 'bg-amber-500',
  'Can Be Corrected': 'bg-brand-500'
}

const ACCENT_BY_STATUS = {
  new: 'bg-emerald-400',
  under_review: 'bg-violet-500',
  action_assigned: 'bg-indigo-500',
  in_progress: 'bg-blue-500',
  ready_verification: 'bg-purple-500',
  closed: 'bg-slate-300'
}

function getDefaultAccentClass(defect) {
  return ACCENT_BY_LEVEL[defect.problemLevel]
    || ACCENT_BY_STATUS[defect.status]
    || 'bg-brand-500'
}

function getCardAccentClass(defect) {
  const reviewStatus = getReviewDueStatus(defect.reviewDueDate, defect.status)

  if (defect.problemLevel === 'Food Safety Risk') return 'bg-red-500'
  if (reviewStatus === 'overdue') return 'bg-red-500'
  if (reviewStatus === 'today') return 'bg-amber-500'

  return getDefaultAccentClass(defect)
}

function getCardRingClass(defect) {
  const reviewStatus = getReviewDueStatus(defect.reviewDueDate, defect.status)
  if (reviewStatus === 'overdue') return 'ring-1 ring-red-100/80'
  return ''
}

function getPriorityBadgeTone(priority) {
  const normalized = String(priority || '').toLowerCase()
  if (normalized === 'urgent' || normalized === 'critical') return 'redSoft'
  if (normalized === 'high') return 'orange'
  if (normalized === 'medium') return 'blue'
  return 'slate'
}

function shouldShowWorkerPriorityBadge(priority) {
  const normalized = String(priority || '').toLowerCase()
  return normalized === 'high' || normalized === 'urgent' || normalized === 'critical'
}

function resolveReporterRole(defect, users = []) {
  const role = defect.reportedByRole ?? defect.reported_by_role
  if (role) return role

  const reporterId = defect.createdBy ?? defect.created_by
  if (reporterId == null || !users.length) return null

  const reporter = users.find((user) => Number(user.id) === Number(reporterId))
  return reporter?.role ?? null
}

function shouldShowWorkerReportBadge(defect, managerView, users = []) {
  if (!managerView) return false
  return resolveReporterRole(defect, users) === 'worker'
}

export default function DefectRecordCard({
  defect,
  managerView,
  users = [],
  currentUserId,
  expanded,
  onToggle,
  onView,
  children
}) {
  const accentClass = getCardAccentClass(defect)
  const cardRingClass = getCardRingClass(defect)
  const reviewDueBadge = getReviewDueBadge(defect.reviewDueDate, defect.status, { workerView: !managerView })
  const showWorkerReportBadge = shouldShowWorkerReportBadge(defect, managerView, users)
  const showWorkerPriority = !managerView && shouldShowWorkerPriorityBadge(defect.priority)
  const Badge = EntityRow.Badge

  const reportedValue = defect.reportedByName
    ? `${defect.createdAt} · ${defect.reportedByName}`
    : defect.createdAt

  return (
    <article
      className={[
        'compact-list-row group relative overflow-hidden',
        expanded ? 'ring-1 ring-brand-200/80 shadow-card-hover' : '',
        cardRingClass
      ].join(' ')}
    >
      <div className={`list-row-accent ${accentClass}`} aria-hidden="true" />

      <div className="list-row-inner">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1">
            <span className="list-row-code">{defect.code}</span>
            <StatusBadge value={defect.status} audience={managerView ? undefined : 'worker'} />
            {showWorkerReportBadge && <Badge tone="green">Worker report</Badge>}
            {reviewDueBadge && (
              <Badge
                tone={reviewDueBadge.tone}
                title={reviewDueBadge.title || 'Manager review due date — not a corrective action due date'}
              >
                {reviewDueBadge.label}
              </Badge>
            )}
            {showWorkerPriority && (
              <Badge
                tone={getPriorityBadgeTone(defect.priority)}
                title="Defect Priority — how quickly the manager should review this report"
              >
                {formatDefectPriorityLabel(defect.priority)}
              </Badge>
            )}
          </div>

          <h3 className="list-row-title mt-0.5">{defect.productName}</h3>

          <p className="list-row-meta">
            <span className="font-medium text-brand-700">Batch {defect.batchNumber}</span>
            <span className="text-brand-border"> · </span>
            <span>{defect.defectType}</span>
            <span className="text-brand-border"> · </span>
            <span>{defect.detectedStage}</span>
          </p>

          <p className="list-row-meta">
            <span className="text-brand-muted/80">Reported:</span>{' '}
            <span className="font-medium text-brand-700">{reportedValue}</span>
            <span className="text-brand-border"> · </span>
            <span className="text-brand-muted/80">Qty:</span>{' '}
            <span className="font-medium text-brand-700">{defect.qtyAffected}</span>
            <span className="text-brand-border"> · </span>
            <span className="text-brand-muted/80" title="Corrective actions assigned by manager">Corrective Actions:</span>{' '}
            <span className="font-medium text-brand-700">{defect.actionProgress}</span>
          </p>
        </div>

        <div className="list-row-actions">
          {managerView && <Badge tone="slate">{defect.problemLevel}</Badge>}
          {managerView && (
            <Badge
              tone={getPriorityBadgeTone(defect.priority)}
              title="Defect Priority — how quickly the manager should review this report"
            >
              {formatDefectPriorityLabel(defect.priority)}
            </Badge>
          )}
          <ListActionButton intent="view" onClick={onView} />
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={expanded}
            aria-label={expanded ? 'Collapse details' : 'Expand details'}
            className="icon-btn"
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {expanded && children && (
        <div className="list-row-expand">{children}</div>
      )}
    </article>
  )
}

DefectRecordCard.InfoCard = EntityRow.InfoCard
