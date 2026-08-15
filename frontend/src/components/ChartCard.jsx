function ChartCard({ title, subtitle, children, className = '' }) {
  return (
    <div className={`compact-section surface-card ${className}`}>
      <div className="mb-1.5">
        <div className="text-sm font-semibold leading-snug text-brand-ink">{title}</div>
        {subtitle && <div className="mt-0.5 text-[0.625rem] leading-4 text-brand-muted">{subtitle}</div>}
      </div>
      <div className="w-full min-h-[150px]">{children}</div>
    </div>
  )
}

export default ChartCard
