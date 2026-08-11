export default function LoadingState({ label = 'Loading...' }) {
  return (
    <div className="surface-card flex items-center gap-3 px-5 py-4 text-body text-brand-muted">
      <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
      {label}
    </div>
  )
}
