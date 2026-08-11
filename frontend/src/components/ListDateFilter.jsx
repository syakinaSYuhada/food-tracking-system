export default function ListDateFilter({
  label,
  value,
  options,
  onChange,
  customFrom,
  customTo,
  onCustomFromChange,
  onCustomToChange,
  className = ''
}) {
  const showCustomRange = value === 'custom_range'

  return (
    <div className={`flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2 ${className}`}>
      <span className="shrink-0 text-[0.625rem] font-semibold uppercase leading-3 text-brand-muted sm:w-24">
        {label}
      </span>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
        <select
          aria-label={label}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="list-toolbar-select-wide max-w-full"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {showCustomRange && (
          <>
            <input
              type="date"
              aria-label={`${label} from`}
              value={customFrom || ''}
              onChange={(e) => onCustomFromChange?.(e.target.value)}
              className="list-toolbar-select max-w-[9.5rem]"
            />
            <span className="text-[0.625rem] text-brand-muted">to</span>
            <input
              type="date"
              aria-label={`${label} to`}
              value={customTo || ''}
              onChange={(e) => onCustomToChange?.(e.target.value)}
              className="list-toolbar-select max-w-[9.5rem]"
            />
          </>
        )}
      </div>
    </div>
  )
}
