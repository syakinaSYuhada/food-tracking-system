import { openPrintDocument } from './printDocument'

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
