const PRIORITY_ORDER = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1
}

const CA_STATUS_ORDER = {
  assigned: 1,
  in_progress: 2,
  rejected: 3,
  completed: 4,
  verified: 5
}

export const REPORT_SORT_CONFIG = {
  Loss: {
    defaultSortBy: 'loss_at_risk',
    defaultOrder: 'desc',
    options: [
      { value: 'loss_at_risk', label: 'Loss at Risk', type: 'number' },
      { value: 'pending_loss', label: 'Pending Loss', type: 'number' },
      { value: 'confirmed_loss', label: 'Confirmed Loss', type: 'number' },
      { value: 'qty_on_hold', label: 'Qty On Hold', type: 'number' },
      { value: 'qty_discarded', label: 'Qty Discarded', type: 'number' }
    ]
  },
  'Root Cause': {
    defaultSortBy: 'total',
    defaultOrder: 'desc',
    options: [
      { value: 'total', label: 'Total', type: 'number' },
      { value: 'confirmed', label: 'Confirmed', type: 'number' },
      { value: 'suspected', label: 'Suspected', type: 'number' },
      { value: 'pending_investigation', label: 'Pending Investigation', type: 'number' },
      { value: 'root_cause', label: 'Root Cause', type: 'string' }
    ]
  },
  'Expiry Issues': {
    defaultSortBy: 'difference_days',
    defaultOrder: 'desc',
    options: [
      { value: 'difference_days', label: 'Days Difference', type: 'number' },
      { value: 'qty_affected', label: 'Qty Affected', type: 'number' },
      { value: 'latest_date', label: 'Latest Date', type: 'date' }
    ]
  },
  'Discarded Products': {
    defaultSortBy: 'estimated_loss',
    defaultOrder: 'desc',
    options: [
      { value: 'estimated_loss', label: 'Estimated Loss', type: 'number' },
      { value: 'qty_discarded', label: 'Qty Discarded', type: 'number' }
    ]
  },
  'By Product': {
    defaultSortBy: 'loss_at_risk',
    defaultOrder: 'desc',
    options: [
      { value: 'total_defects', label: 'Defects', type: 'number' },
      { value: 'loss_at_risk', label: 'Loss At Risk', type: 'number' },
      { value: 'pending_loss', label: 'Pending Loss', type: 'number' },
      { value: 'confirmed_loss', label: 'Confirmed Loss', type: 'number' },
      { value: 'product_name', label: 'Product Name', type: 'string' }
    ]
  },
  'By Batch': {
    defaultSortBy: 'loss_at_risk',
    defaultOrder: 'desc',
    options: [
      { value: 'defect_count', label: 'Defects', type: 'number' },
      { value: 'qty_affected', label: 'Qty Affected', type: 'number' },
      { value: 'qty_on_hold', label: 'Qty On Hold', type: 'number' },
      { value: 'qty_discarded', label: 'Qty Discarded', type: 'number' },
      { value: 'loss_at_risk', label: 'Loss At Risk', type: 'number' },
      { value: 'pending_loss', label: 'Pending Loss', type: 'number' },
      { value: 'confirmed_loss', label: 'Confirmed Loss', type: 'number' },
      { value: 'main_defect_type', label: 'Main Defect Type', type: 'string' },
      { value: 'batch_number', label: 'Batch Number', type: 'string' },
      { value: 'product_name', label: 'Product Name', type: 'string' }
    ]
  },
  'By Detection Stage': {
    defaultSortBy: 'defect_count',
    defaultOrder: 'desc',
    options: [
      { value: 'defect_count', label: 'Defect Count', type: 'number' },
      { value: 'qty_affected', label: 'Qty Affected', type: 'number' },
      { value: 'process_stage', label: 'Detection Stage', type: 'string' }
    ]
  },
  'Root Cause Area': {
    defaultSortBy: 'cases',
    defaultOrder: 'desc',
    options: [
      { value: 'cases', label: 'Cases', type: 'number' },
      { value: 'root_cause_area', label: 'Root Cause Area', type: 'string' },
      { value: 'status', label: 'Status', type: 'string' }
    ]
  },
  'Process / Tool': {
    defaultSortBy: 'cases',
    defaultOrder: 'desc',
    options: [
      { value: 'cases', label: 'Cases', type: 'number' },
      { value: 'related_process_tool', label: 'Related Process / Tool', type: 'string' },
      { value: 'most_common_defect', label: 'Most Common Defect', type: 'string' }
    ]
  }
}

export function getReportSortConfig(tab) {
  return REPORT_SORT_CONFIG[tab] || null
}

function getExpiryLatestDate(row, tableVariant = 'defects') {
  if (tableVariant === 'batch') {
    return row.retort_date || row.printed_expiry_date || row.correct_expiry_date || null
  }

  return row.created_at || row.printed_expiry_date || row.correct_expiry_date || row.expiry_date || null
}

function getSortValue(row, sortBy, option, tableVariant = 'defects') {
  switch (sortBy) {
    case 'due_date':
      return row.due_date || row.dueDate || null
    case 'ca_status':
      return row.ca_status || row.status || ''
    case 'count':
      return row.count ?? row.cases ?? 0
    case 'latest_date':
      return getExpiryLatestDate(row, tableVariant)
    case 'batch_number':
      return row.batch_number || row.batch_code || ''
    case 'qty_affected':
      if (tableVariant === 'batch') {
        return Number(row.qty_affected ?? row.defect_count ?? 0)
      }
      return Number(row.qty_affected ?? 0)
    case 'difference_days':
      return Number(row.difference_days ?? 0)
    default:
      return row[sortBy]
  }
}

function compareValues(a, b, type) {
  if (type === 'number') {
    const left = Number(a)
    const right = Number(b)
    const safeLeft = Number.isFinite(left) ? left : 0
    const safeRight = Number.isFinite(right) ? right : 0
    return safeLeft - safeRight
  }

  if (type === 'date') {
    const left = a ? new Date(a).getTime() : null
    const right = b ? new Date(b).getTime() : null
    if (left === null && right === null) return 0
    if (left === null) return 1
    if (right === null) return -1
    return left - right
  }

  if (type === 'priority') {
    const left = PRIORITY_ORDER[String(a || '').toLowerCase()] || 0
    const right = PRIORITY_ORDER[String(b || '').toLowerCase()] || 0
    return left - right
  }

  if (type === 'ca_status') {
    const left = CA_STATUS_ORDER[String(a || '').toLowerCase()] || 99
    const right = CA_STATUS_ORDER[String(b || '').toLowerCase()] || 99
    return left - right
  }

  return String(a ?? '').localeCompare(String(b ?? ''), undefined, { sensitivity: 'base' })
}

export function sortReportRows(rows, sortBy, sortOrder, tab, tableVariant = 'defects') {
  const config = getReportSortConfig(tab)
  if (!config || !Array.isArray(rows)) return rows || []

  const option = config.options.find((item) => item.value === sortBy) || config.options[0]
  const direction = sortOrder === 'asc' ? 1 : -1

  return [...rows].sort((leftRow, rightRow) => {
    const left = getSortValue(leftRow, option.value, option, tableVariant)
    const right = getSortValue(rightRow, option.value, option, tableVariant)
    return compareValues(left, right, option.type) * direction
  })
}
