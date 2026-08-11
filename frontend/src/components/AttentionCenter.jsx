import { AlertTriangle } from 'lucide-react'

export default function AttentionCenter({ title = 'Attention Required', items = [], action }) {
  const visibleItems = items.filter((item) => item.count > 0)
  const totalCount = visibleItems.reduce((sum, item) => sum + item.count, 0)

  if (visibleItems.length === 0) return null

  return (
    <div className="attention-center">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 ring-1 ring-amber-200/80">
            <AlertTriangle size={14} />
          </div>
          <p className="text-sm font-semibold text-brand-ink">
            {title} ({totalCount})
          </p>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>

      <ul className="mt-1.5 space-y-1 pl-9">
        {visibleItems.map((item) => (
          <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 text-[0.6875rem] leading-4 text-brand-ink">
            <div className="min-w-0">
              <button
                type="button"
                onClick={item.onClick}
                className={`text-left ${item.onClick ? 'hover:text-brand-700 hover:underline' : ''}`}
              >
                • {item.label}
              </button>
              {item.subtitle && (
                <p className="pl-3 text-[0.625rem] leading-4 text-brand-muted">{item.subtitle}</p>
              )}
            </div>
            {item.action && <span className="shrink-0">{item.action}</span>}
          </li>
        ))}
      </ul>
    </div>
  )
}
