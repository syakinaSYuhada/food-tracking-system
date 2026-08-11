export default function TabPills({ items, value, onChange, variant = 'default' }) {
  const itemClass = (active) => (
    active
      ? variant === 'report'
        ? 'tab-segment-item tab-segment-item-active !text-brand-700'
        : 'tab-segment-item tab-segment-item-active'
      : 'tab-segment-item'
  )

  const container = (
    <div className={variant === 'report' ? 'tab-segment inline-flex min-w-max gap-0.5 p-0.5' : 'tab-segment'}>
      {items.map((item) => {
        const active = value === item.value
        return (
          <button
            key={item.value}
            type="button"
            onClick={() => onChange(item.value)}
            className={itemClass(active)}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )

  if (variant === 'report') {
    return <div className="report-tab-scroll">{container}</div>
  }

  return container
}
