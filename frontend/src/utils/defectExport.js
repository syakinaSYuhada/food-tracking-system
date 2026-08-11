import { fetchEvidenceBlob, getAuthToken, resolveEvidenceFileUrl } from './assetUrl'

function escapeHtml(value) {
  return String(value ?? '-')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function formatDate(value) {
  if (!value) return '-'
  return String(value).split('T')[0]
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

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

async function loadEvidenceAsDataUrl(evidenceId) {
  if (!evidenceId) return null

  try {
    const blob = await fetchEvidenceBlob(evidenceId)
    if (!blob || !blob.type.startsWith('image/')) return null
    return await blobToDataUrl(blob)
  } catch (error) {
    console.warn('Defect summary print: could not preload evidence image', evidenceId, error)
    return null
  }
}

async function loadImageAsDataUrl(url) {
  if (!url) return null

  const token = getAuthToken()
  if (!token) return null

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
    if (!response.ok) return null
    const blob = await response.blob()
    if (!blob.type.startsWith('image/')) return null
    return await blobToDataUrl(blob)
  } catch (error) {
    console.warn('Defect summary print: could not preload evidence image', url, error)
    return null
  }
}

function getDefectPhotos(defect) {
  if (defect.photos?.length) {
    return defect.photos.map((photo, index) => {
      if (typeof photo === 'string') {
        return {
          evidenceId: null,
          url: null,
          fileName: photo.split('/').pop() || `Photo ${index + 1}`
        }
      }

      return {
        evidenceId: photo.id ?? null,
        url: photo.url || (photo.id ? resolveEvidenceFileUrl(photo.id) : null),
        fileName: photo.fileName || photo.file_name || `Photo ${index + 1}`
      }
    }).filter((photo) => photo.evidenceId || photo.url)
  }

  return (defect.evidence || []).map((item, index) => ({
    evidenceId: item.id,
    url: resolveEvidenceFileUrl(item.id),
    fileName: item.file_name || item.file_path?.split('/').pop() || `Photo ${index + 1}`
  })).filter((photo) => photo.evidenceId)
}

async function preloadEvidencePhotos(photos) {
  return Promise.all(photos.map(async (photo) => ({
    ...photo,
    dataUrl: photo.evidenceId
      ? await loadEvidenceAsDataUrl(photo.evidenceId)
      : await loadImageAsDataUrl(photo.url)
  })))
}

function buildEvidenceSection(photos) {
  if (!photos.length) {
    return `
      <h2>Evidence / Photos</h2>
      <p class="empty-evidence">No evidence photos uploaded.</p>
    `
  }

  const items = photos.map(({ url, fileName, dataUrl }) => {
    if (!url && !dataUrl) {
      return `
        <div class="evidence-item">
          <p class="evidence-fallback" style="display: block;">${escapeHtml(fileName)}</p>
        </div>
      `
    }

    const imageSrc = dataUrl || escapeHtml(url)
    const fallbackMarkup = `<p class="evidence-fallback">${escapeHtml(fileName)}</p>`

    return `
      <div class="evidence-item">
        <img
          class="evidence-img"
          src="${imageSrc}"
          alt="${escapeHtml(fileName)}"
          ${dataUrl ? '' : `onerror="this.style.display='none';this.parentElement.querySelector('.evidence-fallback').style.display='block';"`}
        />
        ${dataUrl ? '' : fallbackMarkup}
        <p class="evidence-caption">${escapeHtml(fileName)}</p>
      </div>
    `
  }).join('')

  return `
    <h2>Evidence / Photos</h2>
    <div class="evidence-grid">${items}</div>
  `
}

function buildDefectPrintHtml(defect, actions = [], photos = []) {
  const actionRows = actions.map((action) => `
    <tr>
      <td>${escapeHtml(action.code || action.action_code)}</td>
      <td>${escapeHtml(action.task)}</td>
      <td>${escapeHtml(action.assignedToName || action.assigned_to_name || '-')}</td>
      <td>${escapeHtml(titleCase(action.status || action.ca_status))}</td>
      <td>${escapeHtml(formatDate(action.dueDate || action.due_date))}</td>
    </tr>
  `).join('')

  return `<!doctype html>
<html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(defect.defect_code)} — Defect Summary</title>
        <style>
          body { font-family: Arial, sans-serif; color: #0c1f1a; padding: 28px; max-width: 900px; margin: 0 auto; }
          h1 { font-size: 22px; margin: 0 0 4px; color: #146356; }
          .eyebrow { font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: #1a7a62; margin-bottom: 8px; }
          .meta { color: #5f6f68; font-size: 12px; margin-bottom: 20px; }
          h2 { font-size: 14px; margin: 20px 0 8px; color: #146356; border-bottom: 1px solid #dbe5df; padding-bottom: 4px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 8px; }
          th, td { border: 1px solid #dbe5df; padding: 8px; text-align: left; vertical-align: top; }
          th { background: #f3faf7; width: 32%; font-weight: 600; }
          .actions th { width: auto; background: #e8f5ef; }
          .block { white-space: pre-wrap; line-height: 1.5; }
          .footer { margin-top: 28px; font-size: 11px; color: #5f6f68; border-top: 1px solid #dbe5df; padding-top: 10px; }
          .empty-evidence { font-size: 12px; color: #5f6f68; margin: 0 0 8px; }
          .evidence-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 8px; }
          .evidence-item { break-inside: avoid; page-break-inside: avoid; }
          .evidence-caption { margin: 6px 0 0; font-size: 11px; color: #5f6f68; word-break: break-word; }
          .evidence-fallback { display: none; margin: 0; padding: 12px; font-size: 11px; color: #5f6f68; border: 1px solid #ddd; border-radius: 8px; word-break: break-word; }
          .evidence-img { max-width: 220px; max-height: 160px; object-fit: cover; border: 1px solid #ddd; border-radius: 8px; display: block; }
          @media print { body { padding: 12px; } }
        </style>
      </head>
      <body>
        <div class="eyebrow">Kak Norie Quality Defect Tracking</div>
        <h1>${escapeHtml(defect.defect_code)} — ${escapeHtml(defect.defect_type)}</h1>
        <p class="meta">
          Product: ${escapeHtml(defect.product_name)} · Batch: ${escapeHtml(defect.batch_number)} ·
          Status: ${escapeHtml(titleCase(defect.defect_status))} ·
          Reported: ${escapeHtml(formatDate(defect.created_at))}${defect.reported_by_name ? ` by ${escapeHtml(defect.reported_by_name)}` : ''}
        </p>

        <h2>Defect Details</h2>
        <table>
          ${fieldRow('Detected Stage', defect.detected_at_stage)}
          ${fieldRow('Problem Level', defect.problem_level)}
          ${fieldRow('Priority', titleCase(defect.priority))}
          ${fieldRow('Qty Affected', defect.qty_affected)}
          ${fieldRow('Containment', defect.containment_status)}
          ${fieldRow('Expected Expiry', formatDate(defect.correct_expiry_date))}
          ${fieldRow('Printed Expiry', formatDate(defect.printed_expiry_date))}
          ${fieldRow('Action Progress', defect.action_progress)}
        </table>

        <h2>Description</h2>
        <table>
          ${fieldRow('Description', defect.description)}
          ${defect.investigation_notes ? fieldRow('Worker Possible Cause', defect.investigation_notes) : ''}
        </table>

        <h2>Suggested Handling</h2>
        <table>
          ${fieldRow('Product Handling', defect.suggested_product_handling)}
          ${fieldRow('Machine / Process Check', defect.suggested_machine_handling)}
          ${fieldRow('Related Tool / Machine', defect.related_tool_machine)}
        </table>

        <h2>Corrective Actions</h2>
        <table class="actions">
          <thead>
            <tr>
              <th>Code</th>
              <th>Task</th>
              <th>Assigned To</th>
              <th>Status</th>
              <th>Due Date</th>
            </tr>
          </thead>
          <tbody>
            ${actionRows || '<tr><td colspan="5">No corrective actions assigned.</td></tr>'}
          </tbody>
        </table>

        <h2>Root Cause</h2>
        <table>
          ${fieldRow('Root Cause Status', titleCase(defect.root_cause_status || 'pending_investigation'))}
          ${fieldRow('Suspected Root Cause', defect.suspected_root_cause)}
          ${fieldRow('Confirmed Root Cause', defect.confirmed_root_cause)}
          ${fieldRow('Confirmed By', defect.confirmed_by_name)}
          ${fieldRow('Confirmed Date', formatDate(defect.confirmed_date))}
        </table>

        ${buildEvidenceSection(photos)}

        <p class="footer">
          Generated ${new Date().toLocaleString('en-MY')} · Kak Norie QDTS · For internal quality records and audit reference.
        </p>
      </body>
    </html>
  `
}

const DEFECT_PRINT_FRAME_ID = 'qdts-defect-print-frame'
let defectPrintInProgress = false

function getDefectPrintFrame() {
  let frame = document.getElementById(DEFECT_PRINT_FRAME_ID)
  if (frame) return frame

  frame = document.createElement('iframe')
  frame.id = DEFECT_PRINT_FRAME_ID
  frame.setAttribute('aria-hidden', 'true')
  frame.setAttribute('title', 'Defect summary print')
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;'
  document.body.appendChild(frame)
  return frame
}

function openDefectPrintHtml(html, {
  failureMessage = 'Print failed. Please try again.',
  logLabel = 'Defect summary print',
  onPrintTriggered,
  onFailure
} = {}) {
  const frame = getDefectPrintFrame()
  const printWindow = frame.contentWindow

  if (!printWindow) {
    onFailure?.()
    return false
  }

  let hasPrinted = false

  const printOnce = () => {
    if (hasPrinted) return
    hasPrinted = true
    try {
      printWindow.focus()
      printWindow.print()
      onPrintTriggered?.()
    } catch (error) {
      console.error(`${logLabel} failed to open print dialog:`, error)
      alert(failureMessage)
      onFailure?.()
    }
  }

  const waitForImagesThenPrint = () => {
    if (hasPrinted) return

    const images = Array.from(printWindow.document?.images || [])
    if (images.length === 0) {
      printOnce()
      return
    }

    let pending = images.filter((img) => !img.complete).length
    if (pending === 0) {
      printOnce()
      return
    }

    images.forEach((img) => {
      if (img.complete) return
      const onSettled = () => {
        pending -= 1
        if (pending <= 0) printOnce()
      }
      img.addEventListener('load', onSettled, { once: true })
      img.addEventListener('error', onSettled, { once: true })
    })
  }

  try {
    printWindow.document.open('text/html', 'replace')
    printWindow.document.write(html)
    printWindow.document.close()

    requestAnimationFrame(() => {
      requestAnimationFrame(waitForImagesThenPrint)
    })
  } catch (error) {
    console.error(`${logLabel} failed while writing HTML:`, error)
    alert(failureMessage)
    onFailure?.()
    return false
  }

  return true
}

export async function printDefectSummary(defect, actions = [], callbacks = {}) {
  if (defectPrintInProgress) return false

  defectPrintInProgress = true
  try {
    const photos = await preloadEvidencePhotos(getDefectPhotos(defect))
    const html = buildDefectPrintHtml(defect, actions, photos)
    const opened = openDefectPrintHtml(html, {
      failureMessage: 'Print failed. Please try again.',
      logLabel: 'Defect summary print',
      onPrintTriggered: () => {
        defectPrintInProgress = false
        callbacks.onPrintTriggered?.()
      },
      onFailure: () => {
        defectPrintInProgress = false
        callbacks.onFailure?.()
      }
    })

    if (!opened) {
      defectPrintInProgress = false
    }

    return opened
  } catch (error) {
    defectPrintInProgress = false
    console.error('Defect summary print failed:', error)
    alert('Print failed. Please try again.')
    callbacks.onFailure?.()
    return false
  }
}
