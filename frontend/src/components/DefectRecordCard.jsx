import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'
import StatusBadge from './StatusBadge'
import ListActionButton from './ListActionButton'
import EntityRow from './EntityRow'
import {
  formatReviewDueDate,
  getDefectAttentionReasons,
  getReviewDueStatus
} from '../utils/defectReviewDue'
import { defectStatusBadgeTitle } from '../utils/defectStatusHint'

export default function DefectRecordCard({
  defect,
  managerView,
  workerAssignedDefectIds,
  expanded,
  onToggle,
  onView,
  children
}) {
  const reviewDueStatus = getReviewDueStatus(defect.reviewDueDate, defect.status, defect.root_cause_status, defect.total_actions, defect.verified_actions)
  const needsAttention = getDefectAttentionReasons(defect, managerView).flagged
  const hasAssignedAction = managerView ? undefined : Boolean(workerAssignedDefectIds?.has(Number(defect.id)))

  const reportedValue = defect.reportedByName
    ? `${defect.createdAt} · ${defect.reportedByName}`
    : defect.createdAt

  return (
    <article
      className={[
        'compact-list-row group relative overflow-hidden',
        expanded ? 'ring-1 ring-brand-200/80 shadow-card-hover' : ''
      ].join(' ')}
    >
      <div className="list-row-inner">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1">
            <span className="list-row-code">{defect.code}</span>
            {needsAttention && defect.status !== 'closed' && (
              <AlertTriangle size={12} className="shrink-0 text-red-600" title="Needs attention" />
            )}
            <StatusBadge
              value={defect.status}
              audience={managerView ? undefined : 'worker'}
              title={managerView ? undefined : defectStatusBadgeTitle(defect.status, hasAssignedAction)}
              listView
            />
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
                <span className="font-medium text-brand-700">{formatReviewDueDate(defect.reviewDueDate)}</span>
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
