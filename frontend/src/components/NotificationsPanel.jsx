import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  CheckSquare,
  ChevronRight,
  ClipboardList,
  FileWarning,
  Info,
  X
} from 'lucide-react'
import api from '../api/client'
import Button from './Button'
import { isManager } from '../utils/roleAccess'
import { buildNotifications } from '../utils/notifications'

async function fetchNotificationData(user) {
  if (isManager(user)) {
    const [actionsRes, defectsRes] = await Promise.all([
      api.get('/corrective-actions'),
      api.get('/defects')
    ])
    return {
      actions: actionsRes.data.data || [],
      defects: defectsRes.data.data || []
    }
  }

  if (user?.id) {
    const [actionsRes, defectsRes] = await Promise.all([
      api.get('/corrective-actions', { params: { assigned_to: user.id } }),
      api.get('/defects')
    ])
    return {
      actions: actionsRes.data.data || [],
      defects: defectsRes.data.data || []
    }
  }

  return { actions: [], defects: [] }
}

const toneStyles = {
  red: 'bg-red-50 text-red-700 ring-red-100',
  amber: 'bg-amber-50 text-amber-700 ring-amber-100',
  purple: 'bg-purple-50 text-purple-700 ring-purple-100',
  blue: 'bg-brand-50 text-brand-700 ring-brand-100',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-100'
}

function getNotificationVisual(item) {
  if (item.kind === 'new-assignment') {
    return { tone: 'blue', Icon: Info }
  }
  if (item.kind === 'overdue' || item.id.startsWith('overdue-ca')) {
    return { tone: 'red', Icon: AlertTriangle }
  }
  if (item.kind === 'expiry' || item.id.startsWith('expiry')) {
    return { tone: 'amber', Icon: AlertTriangle }
  }
  if (item.kind === 'submitted-review' || item.kind === 'pending-verification' || item.title.includes('Submitted for Review')) {
    return { tone: 'purple', Icon: CheckSquare }
  }
  if (item.kind === 'new-defect' || item.id.startsWith('new-defect')) {
    return { tone: 'blue', Icon: FileWarning }
  }
  if (item.kind === 'confirm-root-cause' || item.id.startsWith('confirm-rc-')) {
    return { tone: 'purple', Icon: ClipboardList }
  }
  if (item.kind === 'ready-to-close' || item.kind === 'ready-verification' || item.id.startsWith('ready-close-')) {
    return { tone: 'green', Icon: CheckCircle2 }
  }
  if (item.kind === 'report-submitted' || item.id.startsWith('report-')) {
    return { tone: 'blue', Icon: ClipboardList }
  }
  if (item.kind === 'attention' || item.id.startsWith('ca-')) {
    return { tone: 'purple', Icon: CheckSquare }
  }

  return { tone: 'blue', Icon: Bell }
}

export default function NotificationsPanel({ user, onClose, onNavigate }) {
  const [items, setItems] = useState([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const { actions, defects } = await fetchNotificationData(user)
        const result = buildNotifications(user, actions, defects)
        setItems(result.items)
        setTotalCount(result.count)
      } catch (error) {
        console.error(error)
        setItems([])
        setTotalCount(0)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [user])

  return (
    <div className="notification-panel absolute right-0 top-11 z-50 w-[22rem] max-w-[calc(100vw-1.5rem)]">
      <div className="notification-panel-head">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-brand-100">
            <Bell size={15} />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-brand-ink">Notifications</div>
            <div className="text-[0.6875rem] leading-4 text-brand-muted">
              {loading
                ? 'Checking for updates...'
                : totalCount > items.length
                  ? `${totalCount} pending items · showing ${items.length}`
                  : `${items.length} pending item${items.length === 1 ? '' : 's'}`}
            </div>
          </div>
        </div>
        <button type="button" onClick={onClose} className="icon-btn !h-8 !w-8" aria-label="Close notifications">
          <X size={14} />
        </button>
      </div>

      <div className="notification-panel-body">
        {loading ? (
          <div className="space-y-2 p-3">
            {[0, 1, 2].map((index) => (
              <div key={index} className="notification-skeleton h-14 rounded-xl" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="notification-empty">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
              <CheckCircle2 size={20} />
            </div>
            <p className="mt-3 text-sm font-semibold text-brand-ink">You&apos;re all caught up</p>
            <p className="mt-1 text-[0.6875rem] leading-4 text-brand-muted">
              {isManager(user)
                ? 'No overdue actions, new reports, or items waiting for review.'
                : 'No overdue actions, new assignments, or items needing your attention.'}
            </p>
          </div>
        ) : (
          items.map((item) => {
            const { tone, Icon } = getNotificationVisual(item)

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onNavigate(item.path)
                  onClose()
                }}
                className="notification-item group"
              >
                <div className={`notification-item-icon ${toneStyles[tone]}`}>
                  <Icon size={14} strokeWidth={2.25} />
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <div className="truncate text-sm font-semibold text-brand-ink">{item.title}</div>
                  <div className="mt-0.5 line-clamp-2 text-[0.6875rem] leading-4 text-brand-muted">{item.subtitle}</div>
                </div>
                <ChevronRight size={14} className="shrink-0 text-brand-muted/70 transition-transform duration-200 group-hover:translate-x-0.5" />
              </button>
            )
          })
        )}
      </div>

      {!loading && items.length > 0 && (
        <div className="notification-panel-foot">
          <Button
            color="slate"
            variant="subtle"
            size="sm"
            className="list-action-btn w-full"
            onClick={() => {
              onNavigate(isManager(user) ? '/corrective-actions' : '/defects')
              onClose()
            }}
          >
            View all items
            <ChevronRight size={14} />
          </Button>
        </div>
      )}
    </div>
  )
}
