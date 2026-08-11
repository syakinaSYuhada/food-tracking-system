import { BarChart3 } from 'lucide-react'

export default function ChartEmptyState({ message = 'No data for this period.' }) {
  return (
    <div className="flex h-[168px] flex-col items-center justify-center rounded-xl border border-dashed border-brand-border/80 bg-slate-50/60 px-4 text-center">
      <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-white text-brand-500 shadow-xs ring-1 ring-brand-border/60">
        <BarChart3 size={16} />
      </div>
      <p className="text-sm font-medium text-brand-ink">No chart data</p>
      <p className="mt-0.5 max-w-xs text-[0.6875rem] leading-4 text-brand-muted">{message}</p>
    </div>
  )
}
