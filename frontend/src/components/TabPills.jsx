const toneClasses = {
  red: {
    inactive: 'bg-red-100/70 text-red-700',
    active: 'bg-white text-red-700 shadow-xs'
  },
  amber: {
    inactive: 'bg-amber-100/70 text-amber-800',
    active: 'bg-white text-amber-800 shadow-xs'
  }
}

export default function TabPills({ items, value, onChange, variant = 'default' }) {
  const itemClass = (item, active) => {
    const tone = item.tone && toneClasses[item.tone]
    if (tone) {
      return `tab-segment-item ${active ? tone.active : tone.inactive}`
    }
    return active
      ? variant === 'report'
        ? 'tab-segment-item tab-segment-item-active !text-brand-700'
        : 'tab-segment-item tab-segment-item-active'
      : 'tab-segment-item'
  }

  const container = (
    <div className={variant === 'report' ? 'tab-segment inline-flex min-w-max gap-0.5 p-0.5' : 'tab-segment'}>
      {items.map((item) => {
        const active = value === item.value
        return (
          <button
            key={item.value}
            type="button"
            onClick={() => onChange(item.value)}
            className={itemClass(item, active)}
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
