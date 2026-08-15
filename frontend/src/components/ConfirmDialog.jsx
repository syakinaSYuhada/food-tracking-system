import { createContext, useCallback, useContext, useRef, useState } from 'react'
import BaseModal from './BaseModal'
import Button from './Button'

const ConfirmContext = createContext(null)

export function ConfirmProvider({ children }) {
  const [request, setRequest] = useState(null)
  const resolverRef = useRef(null)

  const confirm = useCallback((options) => {
    const opts = typeof options === 'string' ? { message: options } : options
    return new Promise((resolve) => {
      resolverRef.current = resolve
      setRequest(opts)
    })
  }, [])

  function resolve(result) {
    setRequest(null)
    if (resolverRef.current) {
      resolverRef.current(result)
      resolverRef.current = null
    }
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {request && (
        <BaseModal
          title={request.title || 'Are you sure?'}
          subtitle={request.message}
          size="sm"
          onClose={() => resolve(false)}
          footer={(
            <>
              <Button color="slate" variant="subtle" onClick={() => resolve(false)}>
                {request.cancelLabel || 'Cancel'}
              </Button>
              <Button color={request.danger ? 'red' : 'brand'} onClick={() => resolve(true)}>
                {request.confirmLabel || 'Confirm'}
              </Button>
            </>
          )}
        />
      )}
    </ConfirmContext.Provider>
  )
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider')
  return ctx
}
