import { createContext, useCallback, useContext, useRef, useState } from 'react'
import BaseModal from './BaseModal'
import Button from './Button'

const PromptContext = createContext(null)

export function PromptProvider({ children }) {
  const [request, setRequest] = useState(null)
  const [value, setValue] = useState('')
  const resolverRef = useRef(null)

  const prompt = useCallback((options) => {
    const opts = typeof options === 'string' ? { message: options } : options
    return new Promise((resolve) => {
      resolverRef.current = resolve
      setValue(opts.defaultValue || '')
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
    <PromptContext.Provider value={prompt}>
      {children}
      {request && (
        <BaseModal
          title={request.title || 'Add a note'}
          subtitle={request.message}
          size="sm"
          onClose={() => resolve(null)}
          footer={(
            <>
              <Button color="slate" variant="subtle" onClick={() => resolve(null)}>
                Cancel
              </Button>
              <Button color="brand" onClick={() => resolve(value.trim())}>
                {request.confirmLabel || 'Continue'}
              </Button>
            </>
          )}
        >
          <textarea
            autoFocus
            rows={3}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder={request.placeholder || 'Optional...'}
            className="field-control resize-none"
          />
        </BaseModal>
      )}
    </PromptContext.Provider>
  )
}

export function usePrompt() {
  const ctx = useContext(PromptContext)
  if (!ctx) throw new Error('usePrompt must be used within PromptProvider')
  return ctx
}
