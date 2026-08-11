import React from 'react'

const colorStyles = {
  brand: {
    solid: 'bg-brand-600 text-white border border-brand-600 shadow-xs shadow-brand-600/20 hover:bg-brand-700 hover:shadow-card hover:border-brand-700',
    ghost: 'text-brand-700 hover:bg-brand-50',
    subtle: 'bg-brand-50 text-brand-700 border border-brand-100 hover:bg-brand-100 hover:border-brand-200 hover:shadow-xs'
  },
  blue: {
    solid: 'bg-brand-600 text-white border border-brand-600 shadow-xs shadow-brand-600/20 hover:bg-brand-700 hover:shadow-card hover:border-brand-700',
    ghost: 'text-brand-700 hover:bg-brand-50',
    subtle: 'bg-brand-50 text-brand-700 border border-brand-100 hover:bg-brand-100 hover:border-brand-200 hover:shadow-xs'
  },
  slate: {
    solid: 'bg-brand-900 text-white border border-brand-900 shadow-xs hover:bg-brand-800 hover:shadow-card',
    ghost: 'text-brand-muted hover:bg-slate-100 hover:text-brand-ink',
    subtle: 'bg-white text-brand-ink border border-brand-border hover:bg-slate-50 hover:border-brand-300 hover:shadow-xs'
  },
  green: {
    solid: 'bg-emerald-600 text-white border border-emerald-600 shadow-xs shadow-emerald-600/20 hover:bg-emerald-700 hover:shadow-card',
    ghost: 'text-emerald-700 hover:bg-emerald-50',
    subtle: 'bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100 hover:shadow-xs'
  },
  red: {
    solid: 'bg-red-600 text-white border border-red-600 shadow-xs shadow-red-600/20 hover:bg-red-700 hover:shadow-card',
    ghost: 'text-red-700 hover:bg-red-50',
    subtle: 'bg-red-50 text-red-700 border border-red-100 hover:bg-red-100 hover:shadow-xs'
  },
  amber: {
    solid: 'bg-amber-500 text-white border border-amber-500 shadow-xs shadow-amber-500/20 hover:bg-amber-600 hover:shadow-card',
    ghost: 'text-amber-700 hover:bg-amber-50',
    subtle: 'bg-amber-50 text-amber-800 border border-amber-100 hover:bg-amber-100 hover:shadow-xs'
  }
}

function Button({
  children,
  variant = 'solid',
  color = 'blue',
  size = 'md',
  className = '',
  ...rest
}) {
  const sizes = {
    sm: 'h-8 rounded-xl px-2.5 text-[0.6875rem] gap-1',
    md: 'rounded-xl px-4 py-2 text-body gap-2',
    lg: 'rounded-xl px-5 py-2.5 text-body gap-2'
  }

  const cls = [
    'inline-flex items-center justify-center font-semibold',
    'transition-all duration-200 ease-smooth',
    'focus:outline-none focus-visible:shadow-focus',
    'active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100',
    sizes[size] || sizes.md,
    colorStyles[color]?.[variant] || colorStyles.blue.solid,
    className
  ].join(' ')

  return (
    <button className={cls} {...rest}>
      {children}
    </button>
  )
}

export default Button
