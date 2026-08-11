import React from 'react'

function PageHeader({ title, subtitle, eyebrow = 'Kak Norie QDTS', children }) {
  return (
    <div className="compact-header">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          {eyebrow && <p className="page-eyebrow">{eyebrow}</p>}
          <h1 className="mt-0.5 typo-display">{title}</h1>
          {subtitle && (
            <p className="mt-1 max-w-3xl text-caption leading-snug text-brand-muted">{subtitle}</p>
          )}
        </div>

        {children && (
          <div className="flex flex-wrap items-center gap-1.5">
            {children}
          </div>
        )}
      </div>
    </div>
  )
}

export default PageHeader
