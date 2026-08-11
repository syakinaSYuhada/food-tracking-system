import React from 'react'

function SectionCard({ title, subtitle, children, action, className = '' }) {
  return (
    <div className={`compact-section surface-card ${className}`}>
      {(title || subtitle || action) && (
        <div className="compact-section-head">
          <div className="min-w-0">
            {title && <div className="text-sm font-semibold leading-snug text-brand-ink">{title}</div>}
            {subtitle && <div className="mt-0.5 text-[0.625rem] leading-4 text-brand-muted">{subtitle}</div>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}

      <div>{children}</div>
    </div>
  )
}

export default SectionCard
