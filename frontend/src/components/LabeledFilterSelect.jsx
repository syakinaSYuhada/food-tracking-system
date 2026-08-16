export default function LabeledFilterSelect({ label, value, onChange, options, wide = true, className = '' }) {
  return (
    <div className={`flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2 ${className}`}>
      <span className="shrink-0 text-[0.625rem] font-semibold uppercase leading-3 text-brand-muted sm:w-24">
        {label}
      </span>
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${wide ? 'list-toolbar-select-wide' : 'list-toolbar-select'} max-w-full`}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </div>
  )
}
