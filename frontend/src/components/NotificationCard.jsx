const toneStyles = {
  warning: 'notification-card-warning',
  error: 'notification-card-error',
  info: 'notification-card-info'
}

const iconStyles = {
  warning: 'bg-amber-100 text-amber-700 ring-amber-200/80',
  error: 'bg-red-100 text-red-700 ring-red-200/80',
  info: 'bg-brand-100 text-brand-700 ring-brand-200/80'
}

export default function NotificationCard({
  tone = 'warning',
  iconTone,
  icon: Icon,
  title,
  description,
  action
}) {
  const resolvedIconTone = iconTone || tone

  return (
    <div className={`${toneStyles[tone] || toneStyles.warning} compact-alert`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          {Icon && (
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ring-1 ${iconStyles[resolvedIconTone] || iconStyles.warning}`}>
              <Icon size={16} />
            </div>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-brand-ink">{title}</p>
            {description && (
              <p className="mt-0.5 line-clamp-1 text-caption text-brand-muted">{description}</p>
            )}
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  )
}
