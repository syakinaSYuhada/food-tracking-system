import React from 'react'
import { Check } from 'lucide-react'

const toneStyles = {
  brand: 'bg-brand-50 text-brand-600 ring-1 ring-brand-100',
  blue: 'bg-brand-50 text-brand-600 ring-1 ring-brand-100',
  green: 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100',
  amber: 'bg-amber-50 text-amber-600 ring-1 ring-amber-100',
  red: 'bg-red-50 text-red-600 ring-1 ring-red-100',
  purple: 'bg-purple-50 text-purple-600 ring-1 ring-purple-100',
  slate: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200'
}

const emphasisToneStyles = {
  brand: 'bg-brand-100 text-brand-700 ring-1 ring-brand-200',
  blue: 'bg-brand-100 text-brand-700 ring-1 ring-brand-200',
  green: 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200',
  amber: 'bg-amber-100 text-amber-800 ring-1 ring-amber-200',
  red: 'bg-red-100 text-red-700 ring-1 ring-red-200',
  purple: 'bg-purple-100 text-purple-700 ring-1 ring-purple-200',
  slate: 'bg-slate-200 text-slate-700 ring-1 ring-slate-300'
}

const variantStyles = {
  default: '',
  critical: 'border-l-[3px] border-l-red-500 bg-red-50/30 ring-1 ring-red-100/60',
  warning: 'border-l-[3px] border-l-amber-500 bg-amber-50/25 ring-1 ring-amber-100/60',
  secondary: 'border-brand-border/70 bg-slate-50/80 ring-0 shadow-xs'
}

const emphasisVariantStyles = {
  critical: 'border-l-4 border-l-red-600 bg-gradient-to-r from-red-50/80 to-white ring-1 ring-red-200/70 shadow-xs',
  warning: 'border-l-4 border-l-amber-500 bg-gradient-to-r from-amber-50/70 to-white ring-1 ring-amber-200/70 shadow-xs'
}

const densityStyles = {
  list: 'p-2',
  dashboard: 'p-2.5',
  command: 'p-3',
  emphasis: 'py-3 pl-3 pr-2.5'
}

const valueStyles = {
  list: 'text-lg leading-none',
  dashboard: 'text-xl leading-none',
  command: 'text-[2.5rem] leading-none',
  emphasis: 'text-2xl leading-none'
}

const labelStyles = {
  list: 'text-[0.625rem] leading-4',
  dashboard: 'text-[0.625rem] leading-4',
  command: 'text-xs leading-4',
  emphasis: 'text-xs leading-4'
}

const subtitleStyles = {
  list: 'text-[0.625rem] leading-4',
  dashboard: 'text-[0.625rem] leading-4',
  command: 'text-[0.8125rem] leading-4',
  emphasis: 'text-[0.8125rem] leading-4'
}

const iconWrapStyles = {
  list: 'rounded-lg p-1',
  dashboard: 'rounded-lg p-1',
  command: 'rounded-lg p-1.5',
  emphasis: 'rounded-xl p-2'
}

function isZeroValue(value) {
  if (value === 0 || value === '0') return true
  if (typeof value === 'string' && value.trim() === '0') return true
  return false
}

function KPICard({
  title,
  value,
  subtitle,
  zeroHint,
  icon,
  tone = 'brand',
  highlight = false,
  active = false,
  onClick,
  ariaLabel,
  hoverTitle,
  variant = 'default',
  density = 'list',
  showSubtitle = false
}) {
  const Component = onClick ? 'button' : 'div'
  const isCritical = variant === 'critical'
  const isWarning = variant === 'warning'
  const isSecondary = variant === 'secondary'
  const isEmphasis = density === 'emphasis'
  const showZeroHint = Boolean(zeroHint) && isZeroValue(value)
  const displaySubtitle = !showZeroHint && subtitle && (showSubtitle || density === 'dashboard' || density === 'command' || density === 'emphasis')
  const resolvedVariantStyle = isEmphasis && emphasisVariantStyles[variant]
    ? emphasisVariantStyles[variant]
    : variantStyles[variant] || variantStyles.default
  const resolvedToneStyle = isEmphasis
    ? emphasisToneStyles[tone] || emphasisToneStyles.brand
    : toneStyles[tone] || toneStyles.brand

  return (
    <Component
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      aria-label={ariaLabel}
      title={hoverTitle}
      className={[
        'compact-kpi surface-card group min-h-0 text-left',
        densityStyles[density] || densityStyles.list,
        resolvedVariantStyle,
        onClick ? 'interactive-lift cursor-pointer' : '',
        highlight && variant === 'default' ? 'ring-1 ring-brand-accent/30 border-brand-accent/20' : '',
        highlight && isEmphasis && isCritical ? 'ring-1 ring-red-300/60' : '',
        highlight && isEmphasis && isWarning ? 'ring-1 ring-amber-300/60' : '',
        active && isSecondary ? 'border-brand-400 bg-white shadow-card ring-1 ring-brand-200/80' : '',
        active && (isCritical || isWarning) ? 'ring-1 ring-brand-500/15 shadow-card' : '',
        active && variant === 'default' ? 'border-brand-400 bg-brand-50/70 ring-1 ring-brand-200/80' : '',
        showZeroHint ? 'border-emerald-200/70 bg-emerald-50/20' : ''
      ].join(' ')}
    >
      <div className="min-w-0 flex-1">
        <div className={`font-bold tracking-tight text-brand-ink ${valueStyles[density] || valueStyles.list}`}>
          {value ?? '-'}
        </div>
        <div className={[
          'mt-0.5 truncate font-semibold uppercase',
          labelStyles[density] || labelStyles.list,
          isCritical ? 'text-red-700' : '',
          isWarning ? 'text-amber-800' : '',
          isSecondary ? 'text-brand-muted' : 'text-brand-muted'
        ].join(' ')}>
          {title}
        </div>
        {displaySubtitle && (
          <div className={[
            'mt-0.5 truncate',
            subtitleStyles[density] || subtitleStyles.list,
            isCritical ? 'text-red-600/90' : '',
            isWarning ? 'text-amber-700/90' : 'text-brand-muted'
          ].join(' ')}>
            {subtitle}
          </div>
        )}
        {showZeroHint && (
          <div className={`mt-0.5 flex items-center gap-1 truncate font-medium normal-case text-emerald-700 ${subtitleStyles[density] || subtitleStyles.list}`}>
            <Check size={12} strokeWidth={2.5} />
            {zeroHint}
          </div>
        )}
      </div>

      {icon && (
        <div className={`ml-2 shrink-0 ${iconWrapStyles[density] || iconWrapStyles.list} ${resolvedToneStyle}`}>
          {icon}
        </div>
      )}
    </Component>
  )
}

export default KPICard
