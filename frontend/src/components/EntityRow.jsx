import React from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import ListActionButton from './ListActionButton'

const badgeTone = {
  brand: 'bg-brand-50 text-brand-700 border-brand-200/80',
  blue: 'bg-brand-50 text-brand-700 border-brand-200/80',
  green: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
  amber: 'bg-amber-50 text-amber-800 border-amber-200/80',
  red: 'bg-red-50 text-red-700 border-red-200/80',
  redSoft: 'bg-red-50/70 text-red-600 border-red-100/70',
  slate: 'bg-slate-100 text-slate-600 border-slate-200/80',
  purple: 'bg-purple-50 text-purple-700 border-purple-200/80',
  orange: 'bg-orange-50 text-orange-800 border-orange-200/80'
}

const actionTone = {
  brand: 'text-brand-600 hover:bg-brand-50 hover:border-brand-200',
  blue: 'text-brand-600 hover:bg-brand-50 hover:border-brand-200',
  green: 'text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200',
  amber: 'text-amber-600 hover:bg-amber-50 hover:border-amber-200',
  red: 'text-red-600 hover:bg-red-50 hover:border-red-200',
  slate: 'text-brand-muted hover:bg-slate-50 hover:border-brand-300'
}

function EntityBadge({ children, tone = 'slate', title }) {
  return (
    <span className={`badge ${badgeTone[tone] || badgeTone.slate}`} title={title}>
      {children}
    </span>
  )
}

function EntityAction({ icon: Icon, label, tone = 'slate', onClick }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation()
        onClick?.(e)
      }}
      className={`icon-btn ${actionTone[tone] || actionTone.slate}`}
    >
      {Icon ? <Icon size={14} /> : null}
    </button>
  )
}

function EntityInfoCard({ title, children }) {
  return (
    <div className="surface-inset p-2.5">
      {title && (
        <div className="mb-1 text-[0.6875rem] font-semibold text-brand-ink">{title}</div>
      )}
      {children}
    </div>
  )
}

function EntityRow({
  icon,
  title,
  subtitle,
  meta = [],
  badges = [],
  actions = [],
  expanded = false,
  onToggle,
  children,
  danger = false
}) {
  return (
    <div className={`compact-list-row transition-all duration-200 ease-smooth hover:-translate-y-px hover:shadow-card-hover ${danger ? 'ring-1 ring-red-200/80' : ''}`}>
      <div className="list-row-inner !pl-1">
        {icon && <div className="list-row-icon">{icon}</div>}

        <div className="min-w-0 flex-1">
          <div className="list-row-title">{title}</div>
          {subtitle && (
            <div className="list-row-meta">{subtitle}</div>
          )}

          {meta.length > 0 && (
            <p className="list-row-meta">
              {meta.slice(0, 3).map((item, index) => (
                <span key={index}>
                  {index > 0 && ' · '}
                  <span className="text-brand-muted/80">{item.label}:</span>{' '}
                  <span className="font-medium text-brand-700">{item.value || '-'}</span>
                </span>
              ))}
            </p>
          )}
        </div>

        <div className="list-row-actions">
          {badges.map((badge, index) => (
            React.isValidElement(badge)
              ? <span key={index}>{badge}</span>
              : <EntityBadge key={index} tone={badge.tone}>{badge.label}</EntityBadge>
          ))}

          {actions.map((action, index) => (
            action.intent
              ? (
                <ListActionButton
                  key={index}
                  intent={action.intent}
                  label={action.label}
                  onClick={action.onClick}
                />
              )
              : (
                <EntityAction key={index} icon={action.icon} label={action.label} tone={action.tone} onClick={action.onClick} />
              )
          ))}

          {onToggle && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onToggle()
              }}
              className="icon-btn"
            >
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          )}
        </div>
      </div>

      {expanded && children && (
        <div className="list-row-expand">{children}</div>
      )}
    </div>
  )
}

EntityRow.Badge = EntityBadge
EntityRow.Action = EntityAction
EntityRow.InfoCard = EntityInfoCard

export default EntityRow
