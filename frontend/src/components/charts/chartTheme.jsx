export const CHART_PALETTE = ['#1F8F73', '#146356', '#17856A', '#C2410C', '#F59E0B', '#7EC6AE']

export const chartMargins = {
  bar: { top: 8, right: 12, left: -8, bottom: 8 },
  pie: { top: 8, right: 8, left: 8, bottom: 8 }
}

export const chartAxisProps = {
  tick: { fill: '#64748B', fontSize: 11, fontWeight: 500 },
  axisLine: { stroke: '#E2E8F0' },
  tickLine: false
}

export const chartGridProps = {
  stroke: '#E2E8F0',
  strokeDasharray: '4 4',
  vertical: false
}

export function ChartTooltipContent({ active, payload, label, valueFormatter = (v) => v }) {
  if (!active || !payload?.length) return null

  const primary = payload[0]

  return (
    <div className="rounded-xl border border-brand-border/80 bg-white/95 px-2.5 py-1.5 shadow-elevated backdrop-blur-sm">
      {label && (
        <p className="mb-1 max-w-[220px] truncate text-micro uppercase text-brand-muted">{label}</p>
      )}
      <div className="flex items-center gap-2">
        {primary.color && (
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: primary.color || primary.payload?.fill || CHART_PALETTE[0] }}
          />
        )}
        <p className="text-body font-semibold text-brand-ink">
          {primary.name ? `${primary.name}: ` : ''}
          {valueFormatter(primary.value)}
        </p>
      </div>
    </div>
  )
}

export function ChartLegendContent({ payload = [] }) {
  if (!payload.length) return null

  return (
    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
      {payload.map((entry) => (
        <div key={entry.value} className="flex items-center gap-2">
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-caption text-brand-muted">{entry.value}</span>
        </div>
      ))}
    </div>
  )
}
