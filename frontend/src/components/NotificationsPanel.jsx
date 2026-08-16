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
import Button from './Button'
import { isManager } from '../utils/roleAccess'
import { buildNotifications, getAttentionTone } from '../utils/notifications'
import { fetchNotificationData } from '../utils/notificationData'

const toneStyles = {
  red: 'bg-red-50 text-red-700 ring-red-100',
  amber: 'bg-amber-50 text-amber-700 ring-amber-100',
  purple: 'bg-purple-50 text-purple-700 ring-purple-100',
  blue: 'bg-brand-50 text-brand-700 ring-brand-100',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-100'
}

const ICON_BY_KIND = {
  overdue: AlertTriangle,
  'evidence-required': AlertTriangle,
  'urgent-review': AlertTriangle,
  expiry: AlertTriangle,
  'submitted-review': CheckSquare,
  'new-defect': FileWarning,
  'confirm-root-cause': ClipboardList,
  'ready-to-close': CheckCircle2,
  'new-assignment': Info,
  attention: CheckSquare,
  'report-submitted': ClipboardList
}

// Tone comes from the same shared map the header bell badge and the Dashboard's
// Attention Required section both use, so a given kind of item always reads the
// same color no matter which of the two surfaces it's shown on.
function getNotificationVisual(item) {
  return {
    tone: getAttentionTone(item.kind),
    Icon: ICON_BY_KIND[item.kind] || Bell
  }
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
            <div className="text-sm font-semibold text-brand-ink">Attention Required</div>
            <div className="text-[0.6875rem] leading-4 text-brand-muted">Things currently needing your action</div>
            <div className="text-[0.6875rem] leading-4 text-brand-muted">
              {loading
                ? 'Checking for updates...'
                : totalCount > items.length
                  ? `${totalCount} open items · showing ${items.length}`
                  : `${items.length} open item${items.length === 1 ? '' : 's'}`}
            </div>
          </div>
        </div>
        <button type="button" onClick={onClose} className="icon-btn !h-8 !w-8" aria-label="Close attention items">
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
