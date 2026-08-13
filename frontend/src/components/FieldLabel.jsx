export default function FieldLabel({ label, required = false }) {
  return (
    <span className="field-label">
      {label}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </span>
  )
}
