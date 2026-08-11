export function formatExpiryDate(value) {
  if (!value) return '-'
  return String(value).split('T')[0]
}

export function hasExpiryMismatch(record) {
  const correct = formatExpiryDate(record?.correct_expiry_date ?? record?.correctExpiryDate)
  const printed = formatExpiryDate(record?.printed_expiry_date ?? record?.printedExpiryDate)
  return correct !== '-' && printed !== '-' && correct !== printed
}
