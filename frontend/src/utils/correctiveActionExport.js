import { formatCaStatusLabel } from './caStatusLabel'
import { openPrintDocument } from './printDocument'

function escapeHtml(value) {
  return String(value ?? '-')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function titleCase(value) {
  if (!value) return '-'
  return String(value).replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}
function fieldRow(label, value) {
  return `
    <tr>
      <th>${escapeHtml(label)}</th>
      <td>${escapeHtml(value)}</td>
    </tr>
  `
}

function buildCorrectiveActionPrintHtml(action, audience = 'manager') {
  const headingLabel = audience === 'worker' ? 'My Work' : 'Corrective Action'
  const expiryMismatch =
    action.correctExpiryDate
    && action.printedExpiryDate
    && action.correctExpiryDate !== '-'
    && action.printedExpiryDate !== '-'
    && action.correctExpiryDate !== action.printedExpiryDate

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(action.code)} — ${escapeHtml(headingLabel)}</title>
        <style>
          body { font-family: Arial, sans-serif; color: #0c1f1a; padding: 28px; max-width: 900px; margin: 0 auto; }
          h1 { font-size: 22px; margin: 0 0 4px; color: #146356; }
          .eyebrow { font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: #1a7a62; margin-bottom: 8px; }
          .meta { color: #5f6f68; font-size: 12px; margin-bottom: 20px; }
          h2 { font-size: 14px; margin: 20px 0 8px; color: #146356; border-bottom: 1px solid #dbe5df; padding-bottom: 4px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 8px; }
          th, td { border: 1px solid #dbe5df; padding: 8px; text-align: left; vertical-align: top; }
          th { background: #f3faf7; width: 34%; font-weight: 600; }
          .alert { background: #fef2f2; border: 1px solid #fecaca; color: #991b1b; padding: 10px; border-radius: 8px; font-size: 12px; margin-bottom: 16px; }
          .footer { margin-top: 28px; font-size: 11px; color: #5f6f68; border-top: 1px solid #dbe5df; padding-top: 10px; }
        </style>
      </head>
      <body>
        <div class="eyebrow">Kak Norie Quality Defect Tracking</div>
        <h1>${escapeHtml(action.code)} — ${escapeHtml(headingLabel)}</h1>
        <p class="meta">
          Defect: ${escapeHtml(action.defectCode)} · ${escapeHtml(action.defectType)} ·
          Status: ${escapeHtml(formatCaStatusLabel(action.status, audience))} ·
          Assigned to: ${escapeHtml(action.assignedToName || '-')}
        </p>

        ${expiryMismatch ? `
          <div class="alert">
            Expiry mismatch on batch ${escapeHtml(action.batchNumber)}:
            expected ${escapeHtml(action.correctExpiryDate)}, printed ${escapeHtml(action.printedExpiryDate)}.
          </div>
        ` : ''}

        <h2>Related Defect</h2>
        <table>
          ${fieldRow('Defect Code', action.defectCode)}
          ${fieldRow('Product', action.productName)}
          ${fieldRow('Batch', action.batchNumber)}
          ${fieldRow('Defect Description', action.defectDescription)}
          ${fieldRow('Qty Affected', action.qtyAffected)}
        </table>

        <h2>Action Assignment</h2>
        <table>
          ${fieldRow('Action Type', titleCase(action.type))}
          ${fieldRow('Task', action.task)}
          ${fieldRow('CA Priority', titleCase(action.priority))}
          ${fieldRow('CA Due Date', action.dueDate)}
          ${fieldRow('Assigned To', action.assignedToName)}
          ${fieldRow('Evidence Required', action.evidenceRequired ? 'Yes' : 'No')}
        </table>

        <h2>Completion Record</h2>
        <table>
          ${fieldRow('Investigation Finding', action.investigationFinding)}
          ${fieldRow('Action Taken', action.actionTaken)}
          ${fieldRow('Tool / Machine Checked', action.relatedToolChecked)}
          ${fieldRow('Completion Notes', action.completionNotes)}
          ${action.type === 'product_handling' ? fieldRow('Qty Relabelled', action.qtyRelabelled) : ''}
          ${action.type === 'product_handling' ? fieldRow('Qty Repacked', action.qtyRepacked) : ''}
          ${action.type === 'product_handling' ? fieldRow('Qty Reworked', action.qtyReworked) : ''}
          ${action.type === 'product_handling' ? fieldRow('Qty Discarded', action.qtyDiscarded) : ''}
          ${action.type === 'product_handling' ? fieldRow('Qty On Hold', action.qtyOnHold) : ''}
          ${action.type === 'product_handling' ? fieldRow('Qty Released', action.qtyReleased) : ''}
          ${fieldRow('Calculated Loss', action.calculatedLoss != null ? `RM ${Number(action.calculatedLoss || 0).toFixed(2)}` : '-')}
        </table>

        ${action.status === 'rejected' ? `
          <h2>Rejection</h2>
          <table>
            ${fieldRow('Rejected By', action.rejectedByName)}
            ${fieldRow('Rejected Date', action.rejectedDate)}
            ${fieldRow('Reason', action.rejectionReason)}
          </table>
        ` : ''}

        <p class="footer">
          Generated ${new Date().toLocaleString('en-MY')} · Kak Norie QDTS · Corrective action completion record.
        </p>
      </body>
    </html>
  `
}

export function printCorrectiveActionSummary(action, audience = 'manager') {
  try {
    openPrintDocument(buildCorrectiveActionPrintHtml(action, audience), {
      blockedMessage: 'Please allow pop-ups to print the action summary.',
      failureMessage: 'Print failed. Please try again.',
      logLabel: 'Corrective action summary print'
    })
  } catch (error) {
    console.error('Corrective action summary print failed:', error)
    alert('Print failed. Please try again.')
  }
}
