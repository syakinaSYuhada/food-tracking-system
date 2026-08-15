import { ClipboardList, Package, Search, User } from 'lucide-react'
import EntityRow from './EntityRow'

function titleCase(value) {
  if (!value) return '-'
  return String(value).replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatDateTime(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value).split('T')[0]
  return date.toLocaleString('en-MY', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function getLogIcon(entityType) {
  const type = String(entityType || '').toLowerCase()
  if (type === 'defect') return Search
  if (type === 'corrective_action') return ClipboardList
  if (type === 'batch') return Package
  return User
}

function getIconTone(entityType) {
  const type = String(entityType || '').toLowerCase()
  if (type === 'defect') return 'bg-amber-50 text-amber-700 ring-1 ring-amber-100'
  if (type === 'corrective_action') return 'bg-purple-50 text-purple-700 ring-1 ring-purple-100'
  if (type === 'batch') return 'bg-brand-50 text-brand-700 ring-1 ring-brand-100'
  return 'bg-slate-100 text-slate-600 ring-1 ring-slate-200'
}

export default function ActivityTimelineRow({ log }) {
  const Icon = getLogIcon(log.entity_type)
  const Badge = EntityRow.Badge
  const detail = [log.old_value, log.new_value].filter(Boolean).join(' → ')

  return (
    <article className="activity-timeline-row compact-list-row">
      <div className="list-row-inner !items-start">
        <div className={`list-row-icon ${getIconTone(log.entity_type)}`}>
          <Icon size={14} strokeWidth={2.25} />
        </div>

        <div className="min-w-0 flex-1 space-y-0.5">
          <p className="text-[0.6875rem] font-medium leading-4 text-brand-muted">{formatDateTime(log.created_at)}</p>
          <p className="list-row-title">
            {log.user_name || 'System'}
            {log.user_role ? (
              <span className="ml-1.5 font-normal text-brand-muted">· {titleCase(log.user_role)}</span>
            ) : null}
          </p>
          <p className="text-sm leading-snug text-brand-ink">{log.description || titleCase(log.action_type)}</p>
          {(detail || log.entity_type) && (
            <p className="list-row-meta !mt-0">
              {log.entity_type ? titleCase(log.entity_type) : ''}
              {detail ? `${log.entity_type ? ' · ' : ''}${detail}` : ''}
            </p>
          )}
        </div>

        <div className="activity-timeline-badge list-row-actions !items-start sm:!pt-0.5">
          <Badge tone="slate">{titleCase(log.action_type)}</Badge>
        </div>
      </div>
    </article>
  )
}
