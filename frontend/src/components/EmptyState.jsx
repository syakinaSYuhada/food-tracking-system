import Button from './Button'

export default function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  icon: Icon,
  tone = 'default'
}) {
  const iconWrapClass = tone === 'positive'
    ? 'bg-emerald-50 text-emerald-600 ring-emerald-100'
    : 'bg-brand-50 text-brand-600 ring-brand-100'

  return (
    <div className="surface-card flex flex-col items-center px-8 py-12 text-center">
      {Icon && (
        <div className={`mb-5 flex h-14 w-14 items-center justify-center rounded-2xl ring-1 ${iconWrapClass}`}>
          <Icon size={24} />
        </div>
      )}
      <h3 className="typo-subheading">{title}</h3>
      {description && (
        <p className="mt-2 max-w-md text-body leading-relaxed text-brand-muted">{description}</p>
      )}
      {actionLabel && onAction && (
        <Button className="mt-6" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
