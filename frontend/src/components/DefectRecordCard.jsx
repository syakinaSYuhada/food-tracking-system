import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'
import StatusBadge from './StatusBadge'
import ListActionButton from './ListActionButton'
import EntityRow from './EntityRow'
import {
  formatDefectPriorityLabel,
  formatReviewDueDate,
  getReviewDueBadge,
  getReviewDueStatus,
  isUrgentDefectPriority
} from '../utils/defectReviewDue'
import { defectStatusBadgeTitle } from '../utils/defectStatusHint'

function getCardRingClass(defect) {
  const reviewStatus = getReviewDueStatus(defect.reviewDueDate, defect.status)
  if (reviewStatus === 'overdue') return 'ring-1 ring-red-100/80'
  return ''
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
  const cardRingClass = getCardRingClass(defect)
  const reviewDueStatus = getReviewDueStatus(defect.reviewDueDate, defect.status)
  const reviewDueBadge = getReviewDueBadge(defect.reviewDueDate, defect.status, { workerView: !managerView })
  const isUrgentPriority = isUrgentDefectPriority(defect)
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
      <div className="list-row-inner">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1">
            <span className="list-row-code">{defect.code}</span>
            <StatusBadge
              value={defect.status}
              audience={managerView ? undefined : 'worker'}
              title={managerView ? undefined : defectStatusBadgeTitle(defect.status, hasAssignedAction)}
              listView
            />
            {managerView && defect.problemLevel === 'Food Safety Risk' && (
              <span className="text-xs font-semibold text-red-700">Food Safety Risk</span>
            )}
            {isUrgentPriority && (
              <span
                className="text-xs font-semibold text-red-700"
                title="Defect Priority — how quickly the manager should review this report"
              >
                {formatDefectPriorityLabel(defect.priority)} Priority
              </span>
            )}
            {reviewDueBadge && reviewDueStatus === 'overdue' && (
              <Badge
                tone={reviewDueBadge.tone}
                title={reviewDueBadge.title || 'Manager review due date — not a corrective action due date'}
              >
                <AlertTriangle size={10} strokeWidth={2.5} />
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
            {reviewDueStatus === 'today' && (
              <>
                <span className="text-brand-border"> · </span>
                <span className="text-brand-muted/80">Review Due:</span>{' '}
                <span className="font-bold text-red-700">{formatReviewDueDate(defect.reviewDueDate)}</span>
              </>
            )}
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
