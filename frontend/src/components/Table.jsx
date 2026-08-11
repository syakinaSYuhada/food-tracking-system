import React from 'react'

export function Table({ children, className = '' }) {
  return <div className={`data-table-wrap ${className}`}>{children}</div>
}

export function THead({ children }) {
  return (
    <div className="grid-table-head">
      {children}
    </div>
  )
}

export function TBody({ children }) {
  return (
    <div className="divide-y divide-brand-border/50">
      {children}
    </div>
  )
}

export function TR({ children, className = '' }) {
  return (
    <div className={`grid-table-row ${className}`}>
      {children}
    </div>
  )
}

export function TH({ children, colSpan = 1, className = '' }) {
  const span = `col-span-${colSpan}`
  return (
    <div className={`${span} ${className} flex items-center font-semibold`}>{children}</div>
  )
}

export function TD({ children, colSpan = 1, className = '' }) {
  const span = `col-span-${colSpan}`
  return (
    <div className={`${span} ${className} flex items-center text-body`}>{children}</div>
  )
}

export default Table
