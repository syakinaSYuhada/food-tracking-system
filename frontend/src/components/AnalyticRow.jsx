export default function AnalyticRow({
  title,
  subtitle,
  meta,
  trailing,
  badge,
  action,
  accentClass = 'bg-brand-500'
}) {
  return (
    <div className="compact-list-row group relative overflow-hidden">
      <div className={`absolute inset-y-0 left-0 w-0.5 ${accentClass}`} aria-hidden="true" />
      <div className="flex flex-col gap-1.5 pl-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="truncate text-sm font-semibold text-brand-ink">{title}</p>
            {badge}
          </div>
          {subtitle && (
            <p className="mt-0.5 truncate text-[0.6875rem] leading-4 text-brand-muted">{subtitle}</p>
          )}
          {meta && (
            <p className="mt-0.5 truncate text-[0.6875rem] leading-4 text-brand-muted">{meta}</p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:justify-end">
          {trailing}
          {action}
        </div>
      </div>
    </div>
  )
}
