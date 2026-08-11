import React from 'react'
import { X } from 'lucide-react'

const widthClass = {
  sm: 'max-w-md',
  md: 'max-w-2xl',
  lg: 'max-w-3xl',
  xl: 'max-w-4xl',
  '2xl': 'max-w-5xl',
  full: 'max-w-6xl'
}

function BaseModal({
  title,
  subtitle,
  children,
  footer,
  onClose,
  size = 'lg',
  bodyClassName = ''
}) {
  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        className={`modal-panel ${widthClass[size] || widthClass.lg}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="modal-header">
          <div>
            <p className="page-eyebrow">Kak Norie QDTS</p>
            <h2 id="modal-title" className="mt-1 typo-heading">{title}</h2>
            {subtitle && (
              <p className="mt-1.5 text-body text-brand-muted">{subtitle}</p>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="icon-btn shrink-0"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        <div className={`modal-body ${bodyClassName}`}>
          {children}
        </div>

        {footer && (
          <div className="modal-footer">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

export default BaseModal
