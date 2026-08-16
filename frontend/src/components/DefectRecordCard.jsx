import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'
import StatusBadge from './StatusBadge'
import ListActionButton from './ListActionButton'
import EntityRow from './EntityRow'
import {
  formatDefectPriorityLabel,
  getReviewDueBadge,
  getReviewDueStatus
} from '../utils/defectReviewDue'
import { defectStatusBadgeTitle } from '../utils/defectStatusHint'

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
  pending_verification: 'bg-amber-500',
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

export function shouldShowWorkerPriorityBadge(priority) {
  const normalized = String(priority || '').toLowerCase()
  return normalized === 'high' || normalized === 'urgent' || normalized === 'critical'
}

export default function DefectRecordCard({
  defect,
  managerView,
  workerAssignedDefectIds,
  expanded,
  onToggle,
  onView,
  children
}) {
  const accentClass = getCardAccentClass(defect)
  const cardRingClass = getCardRingClass(defect)
  const reviewDueBadge = getReviewDueBadge(defect.reviewDueDate, defect.status, { workerView: !managerView })
  const showPriorityBadge = shouldShowWorkerPriorityBadge(defect.priority)
  const hasAssignedAction = managerView ? undefined : Boolean(workerAssignedDefectIds?.has(Number(defect.id)))
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
            <StatusBadge
              value={defect.status}
              audience={managerView ? undefined : 'worker'}
              title={managerView ? undefined : defectStatusBadgeTitle(defect.status, hasAssignedAction)}
            />
            {managerView && <Badge tone="slate">{defect.problemLevel}</Badge>}
            {showPriorityBadge && (
              <Badge
                tone={getPriorityBadgeTone(defect.priority)}
                title="Defect Priority — how quickly the manager should review this report"
              >
                {formatDefectPriorityLabel(defect.priority)} Priority
              </Badge>
            )}
            {reviewDueBadge && (
              <Badge
                tone={reviewDueBadge.tone}
                title={reviewDueBadge.title || 'Manager review due date — not a corrective action due date'}
              >
                {reviewDueBadge.tone === 'red' && <AlertTriangle size={10} strokeWidth={2.5} />}
                {reviewDueBadge.label}
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
            <span className="text-brand-muted/80" title={managerView ? 'Corrective actions assigned by manager' : 'Your assigned work progress'}>{managerView ? 'Corrective Actions:' : 'My Work:'}</span>{' '}
            <span className="font-medium text-brand-700">{defect.actionProgress}</span>
          </p>
        </div>

        <div className="list-row-actions">
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
