import { openPrintDocument } from './printDocument'
import { formatCaStatusLabel } from './caStatusLabel'

function escapeCsvValue(value) {
  const text = String(value ?? '')
  if (/[",\n\r]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`
  }
  return text
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function getCellValue(row, column) {
  if (column.exportValue) return column.exportValue(row)
  if (column.key) return row[column.key]
  return ''
}

export function downloadReportExcel({ title, periodLabel, filename, sections }) {
  const lines = [
    'Kak Norie QDTS Report',
    `Report,${escapeCsvValue(title)}`,
    `Period,${escapeCsvValue(periodLabel || 'All Time')}`,
    `Generated,${escapeCsvValue(new Date().toLocaleString('en-MY'))}`,
    ''
  ]

  sections.forEach((section) => {
    if (section.heading) {
      lines.push(escapeCsvValue(section.heading))
    }

    const columns = section.columns || []
    lines.push(columns.map((column) => escapeCsvValue(column.label)).join(','))

    ;(section.rows || []).forEach((row) => {
      lines.push(columns.map((column) => escapeCsvValue(getCellValue(row, column))).join(','))
    })

    lines.push('')
  })

  const blob = new Blob([`\uFEFF${lines.join('\n')}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename || `${title.toLowerCase().replaceAll(/\s+/g, '-')}.csv`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function buildPrintHtml({ title, periodLabel, sections }) {
  const safeTitle = escapeHtml(title)
  const safePeriod = escapeHtml(periodLabel || 'All Time')
  const generatedAt = escapeHtml(new Date().toLocaleString('en-MY'))

  const sectionHtml = (sections || []).map((section) => {
    const columns = section.columns || []
    const colSpan = Math.max(columns.length, 1)
    const header = columns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join('')
    const rows = section.rows || []
    const body = rows.length
      ? rows.map((row) => {
        const cells = columns.map((column) => `<td>${escapeHtml(getCellValue(row, column) || '-')}</td>`).join('')
        return `<tr>${cells}</tr>`
      }).join('')
      : `<tr><td colspan="${colSpan}">No data available for this report.</td></tr>`

    return `
      <section style="margin-bottom: 24px;">
        <h2 style="font-size: 16px; margin: 0 0 8px;">${escapeHtml(section.heading || title)}</h2>
        <table>
          <thead><tr>${header || `<th>Report</th>`}</tr></thead>
          <tbody>${body}</tbody>
        </table>
      </section>
    `
  }).join('')

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${safeTitle}</title>
    <style>
      body { font-family: Arial, sans-serif; color: #0f172a; background: #ffffff; padding: 24px; }
      h1 { font-size: 22px; margin: 0 0 6px; color: #0f172a; }
      h2 { color: #0f172a; }
      p { margin: 0 0 16px; color: #475569; font-size: 12px; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; }
      th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; vertical-align: top; color: #0f172a; }
      th { background: #f8fafc; }
    </style>
  </head>
  <body>
    <h1>Kak Norie QDTS — ${safeTitle}</h1>
    <p>Period: ${safePeriod} · Generated: ${generatedAt}</p>
    ${sectionHtml || '<p>No data available for this report.</p>'}
  </body>
</html>`
}

export function downloadReportPdf({ title, periodLabel, sections }) {
  try {
    const html = buildPrintHtml({ title, periodLabel, sections: sections || [] })
    openPrintDocument(html, {
      blockedMessage: 'Please allow pop-ups to export PDF.',
      failureMessage: 'PDF export failed. Please try again or use Export CSV instead.',
      logLabel: 'PDF export'
    })
  } catch (error) {
    console.error('PDF export failed:', error)
    alert('PDF export failed. Please try again or use Export CSV instead.')
  }
}

export function buildActiveReportExport(activeTab, context) {
  const {
    periodLabel,
    summaryKpis,
    defectsByType,
    correctiveRows,
    lossRows,
    lossKpis = {},
    rootRows,
    expiryRows,
    batchExpiryAuditRows,
    batchExpiryAuditKpis,
    discardedRows,
    byProductRows,
    byBatchRows,
    formatDate,
    money,
    titleCase
  } = context

  const slug = activeTab.toLowerCase().replace(/\s+/g, '-')

  if (activeTab === 'Overview') {
    return {
      title: 'Overview Report',
      filename: `qdts-overview-${slug}.csv`,
      sections: [
        {
          heading: 'Summary KPIs',
          columns: [
            { key: 'metric', label: 'Metric' },
            { key: 'value', label: 'Value' }
          ],
          rows: [
            { metric: 'Total Defects', value: summaryKpis.total_defects ?? '-' },
            { metric: 'Open Defects', value: summaryKpis.open_defects ?? '-' },
            { metric: 'Open Actions', value: summaryKpis.open_actions ?? '-' },
            { metric: 'Loss at Risk (RM)', value: summaryKpis.loss_at_risk ?? 0 },
            { metric: 'Pending Loss (RM)', value: summaryKpis.pending_loss ?? 0 },
            { metric: 'Confirmed Loss (RM)', value: summaryKpis.confirmed_loss ?? 0 }
          ]
        },
        {
          heading: 'Defects by Type',
          columns: [
            { key: 'name', label: 'Defect Type' },
            { key: 'value', label: 'Count' }
          ],
          rows: defectsByType
        },
        {
          heading: 'Corrective Actions',
          columns: [
            { key: 'action_code', label: 'Action Code' },
            { key: 'defect_code', label: 'Defect' },
            { key: 'assigned_to_name', label: 'Assigned To' },
            { key: 'due_date', label: 'Due Date', exportValue: (row) => formatDate(row.due_date || row.dueDate) },
            { key: 'ca_status', label: 'Status', exportValue: (row) => formatCaStatusLabel(row.ca_status || row.status) }
          ],
          rows: correctiveRows
        }
      ],
      periodLabel
    }
  }

  if (activeTab === 'Loss') {
    return {
      title: 'Loss Report',
      filename: `qdts-loss-${slug}.csv`,
      sections: [
        {
          heading: 'Financial KPIs',
          columns: [
            { key: 'metric', label: 'Metric' },
            { key: 'value', label: 'Value' }
          ],
          rows: [
            { metric: 'Loss at Risk (RM)', value: lossKpis.loss_at_risk ?? 0 },
            { metric: 'Pending Loss (RM)', value: lossKpis.pending_loss ?? 0 },
            { metric: 'Confirmed Loss (RM)', value: lossKpis.confirmed_loss ?? 0 }
          ]
        },
        {
          heading: 'Loss Cases',
          columns: [
            { key: 'defect_code', label: 'Defect Code' },
            { key: 'product_name', label: 'Product' },
            { key: 'batch_number', label: 'Batch' },
            { key: 'qty_on_hold', label: 'Qty On Hold' },
            { key: 'qty_discarded', label: 'Qty Discarded' },
            { key: 'loss_at_risk', label: 'Loss at Risk (RM)', exportValue: (row) => Number(row.loss_at_risk || 0).toFixed(2) },
            { key: 'pending_loss', label: 'Pending Loss (RM)', exportValue: (row) => Number(row.pending_loss || 0).toFixed(2) },
            { key: 'confirmed_loss', label: 'Confirmed Loss (RM)', exportValue: (row) => Number(row.confirmed_loss || 0).toFixed(2) },
            { key: 'loss_status', label: 'Loss Status', exportValue: (row) => titleCase(row.loss_status) }
          ],
          rows: lossRows
        }
      ],
      periodLabel
    }
  }

  if (activeTab === 'Corrective Actions') {
    return {
      title: 'Corrective Actions Report',
      filename: `qdts-corrective-actions-${slug}.csv`,
      sections: [{
        heading: 'Corrective Actions',
        columns: [
          { key: 'action_code', label: 'Action Code' },
          { key: 'defect_code', label: 'Defect' },
          { key: 'assigned_to_name', label: 'Assigned To' },
          { key: 'due_date', label: 'Due Date', exportValue: (row) => formatDate(row.due_date || row.dueDate) },
          { key: 'priority', label: 'Priority', exportValue: (row) => titleCase(row.priority) },
          { key: 'ca_status', label: 'Status', exportValue: (row) => formatCaStatusLabel(row.ca_status || row.status) }
        ],
        rows: correctiveRows
      }],
      periodLabel
    }
  }

  if (activeTab === 'Root Cause') {
    return {
      title: 'Root Cause Report',
      filename: `qdts-root-cause-${slug}.csv`,
      sections: [{
        heading: 'Root Causes',
        columns: [
          { key: 'root_cause', label: 'Root Cause' },
          { key: 'confirmed', label: 'Confirmed', exportValue: (row) => row.confirmed ?? 0 },
          { key: 'suspected', label: 'Suspected', exportValue: (row) => row.suspected ?? 0 },
          { key: 'pending_investigation', label: 'Pending Investigation', exportValue: (row) => row.pending_investigation ?? 0 },
          { key: 'total', label: 'Total', exportValue: (row) => row.total ?? 0 }
        ],
        rows: rootRows
      }],
      periodLabel
    }
  }

  if (activeTab === 'Expiry Issues') {
    return {
      title: 'Expiry Issues Report',
      filename: `qdts-expiry-issues-${slug}.csv`,
      sections: [
        {
          heading: 'Defect Cases — Expiry Issues',
          columns: [
            { key: 'defect_code', label: 'Defect' },
            { key: 'product_name', label: 'Product' },
            { key: 'batch_number', label: 'Batch', exportValue: (row) => row.batch_number || row.batch_code || '-' },
            { key: 'correct_expiry_date', label: 'Expected Expiry', exportValue: (row) => formatDate(row.correct_expiry_date || row.expiry_date) },
            { key: 'printed_expiry_date', label: 'Printed Expiry', exportValue: (row) => formatDate(row.printed_expiry_date) },
            { key: 'qty_affected', label: 'Qty Affected' }
          ],
          rows: expiryRows
        },
        {
          heading: 'Batch Expiry Audit',
          columns: [
            { key: 'batch_number', label: 'Batch' },
            { key: 'product_name', label: 'Product' },
            { key: 'retort_date', label: 'Retort Date', exportValue: (row) => formatDate(row.retort_date) },
            { key: 'correct_expiry_date', label: 'Expected Expiry', exportValue: (row) => formatDate(row.correct_expiry_date) },
            { key: 'printed_expiry_date', label: 'Printed Expiry', exportValue: (row) => formatDate(row.printed_expiry_date) },
            { key: 'difference_days', label: 'Days Diff' },
            { key: 'defect_count', label: 'Defects' },
            { key: 'open_defect_count', label: 'Open Defects' }
          ],
          rows: batchExpiryAuditRows
        }
      ],
      periodLabel
    }
  }

  if (activeTab === 'Discarded Products') {
    return {
      title: 'Discarded Products Report',
      filename: `qdts-discarded-products-${slug}.csv`,
      sections: [{
        heading: 'Discarded Products',
        columns: [
          { key: 'defect_code', label: 'Defect Code' },
          { key: 'product_name', label: 'Product' },
          { key: 'batch_number', label: 'Batch' },
          { key: 'qty_discarded', label: 'Qty Discarded' },
          { key: 'estimated_loss', label: 'Loss (RM)', exportValue: (row) => Number(row.estimated_loss || 0).toFixed(2) },
          { key: 'loss_status', label: 'Status', exportValue: (row) => titleCase(row.loss_status) }
        ],
        rows: discardedRows
      }],
      periodLabel
    }
  }

  if (activeTab === 'By Product') {
    return {
      title: 'By Product Report',
      filename: `qdts-by-product-${slug}.csv`,
      sections: [{
        heading: 'Defects by Product',
        columns: [
          { key: 'product_name', label: 'Product' },
          { key: 'total_defects', label: 'Total Defects' },
          { key: 'loss_at_risk', label: 'Loss at Risk (RM)', exportValue: (row) => Number(row.loss_at_risk || 0).toFixed(2) },
          { key: 'pending_loss', label: 'Pending Loss (RM)', exportValue: (row) => Number(row.pending_loss || 0).toFixed(2) },
          { key: 'confirmed_loss', label: 'Confirmed Loss (RM)', exportValue: (row) => Number(row.confirmed_loss || 0).toFixed(2) },
          { key: 'most_common_defect', label: 'Most Common Defect' }
        ],
        rows: byProductRows
      }],
      periodLabel
    }
  }

  if (activeTab === 'By Batch') {
    return {
      title: 'By Batch Report',
      filename: `qdts-by-batch-${slug}.csv`,
      sections: [{
        heading: 'Defects by Batch',
        columns: [
          { key: 'batch_number', label: 'Batch', exportValue: (row) => row.batch_number || row.batch_code || '-' },
          { key: 'product_name', label: 'Product' },
          { key: 'defect_count', label: 'Defects' },
          { key: 'qty_affected', label: 'Qty Affected' },
          { key: 'qty_on_hold', label: 'Qty On Hold' },
          { key: 'qty_discarded', label: 'Qty Discarded' },
          { key: 'loss_at_risk', label: 'Loss at Risk (RM)', exportValue: (row) => Number(row.loss_at_risk || 0).toFixed(2) },
          { key: 'pending_loss', label: 'Pending Loss (RM)', exportValue: (row) => Number(row.pending_loss || 0).toFixed(2) },
          { key: 'confirmed_loss', label: 'Confirmed Loss (RM)', exportValue: (row) => Number(row.confirmed_loss || 0).toFixed(2) },
          { key: 'main_defect_type', label: 'Main Defect Type' }
        ],
        rows: byBatchRows
      }],
      periodLabel
    }
  }

  return null
}
