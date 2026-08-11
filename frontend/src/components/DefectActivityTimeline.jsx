import { useEffect, useState } from 'react'
import api from '../api/client'
import LoadingState from './LoadingState'
import EmptyState from './EmptyState'
import { ClipboardList } from 'lucide-react'

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

function titleCase(value) {
  if (!value) return '-'
  return String(value).replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export default function DefectActivityTimeline({ defectId }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const res = await api.get(`/defects/${defectId}/activity`)
        setItems(res.data.data || [])
      } catch (error) {
        console.error(error)
        setItems([])
      } finally {
        setLoading(false)
      }
    }

    if (defectId) load()
  }, [defectId])

  if (loading) return <LoadingState label="Loading activity for this defect..." />

  if (items.length === 0) {
    return (
      <EmptyState
        title="No activity yet"
        description="Reports, reviews, assignments, and verifications for this defect will appear here."
        icon={ClipboardList}
      />
    )
  }

  return (
    <div className="surface-card p-5">
      <h3 className="text-sm font-bold text-brand-ink">Activity Timeline</h3>
      <p className="mt-1 text-sm text-brand-muted">Audit trail for this defect and its corrective actions.</p>

      <div className="mt-4 space-y-4">
        {items.map((item, index) => (
          <div key={item.id} className="relative flex gap-4 pl-2">
            {index < items.length - 1 && (
              <span className="absolute left-[11px] top-8 bottom-0 w-px bg-brand-border" />
            )}
            <div className="mt-1 h-3 w-3 shrink-0 rounded-full border-2 border-brand-500 bg-white" />
            <div className="min-w-0 flex-1 rounded-xl border border-brand-border/70 bg-brand-50/40 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="rounded-full border border-brand-100 bg-white px-2 py-0.5 text-xs font-semibold text-brand-700">
                  {titleCase(item.action_type)}
                </span>
                <span className="text-xs text-brand-muted">{formatDateTime(item.created_at)}</span>
              </div>
              <p className="mt-2 text-sm text-brand-ink">{item.description}</p>
              <p className="mt-1 text-xs text-brand-muted">
                {item.user_name || 'System'}
                {item.user_role ? ` · ${titleCase(item.user_role)}` : ''}
              </p>
              {(item.old_value || item.new_value) && (
                <p className="mt-2 text-xs text-brand-muted">
                  {item.old_value ? `${item.old_value} → ` : ''}
                  {item.new_value || '-'}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
