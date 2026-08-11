export function openPrintDocument(html, {
  blockedMessage = 'Please allow pop-ups to print this summary.',
  failureMessage = 'Print failed. Please try again.',
  logLabel = 'Print',
  waitForImages = true,
  onPrintTriggered,
  onBlocked,
  onFailure
} = {}) {
  let printWindow

  try {
    // Do not use noopener/noreferrer — Chrome may leave the window blank and block document.write().
    printWindow = window.open('about:blank', '_blank', 'width=1024,height=768')
  } catch (error) {
    console.error(`${logLabel} failed to open print window:`, error)
    alert(blockedMessage)
    onBlocked?.()
    onFailure?.()
    return false
  }

  if (!printWindow) {
    alert(blockedMessage)
    onBlocked?.()
    return false
  }

  let hasPrinted = false

  const printOnce = () => {
    if (hasPrinted || printWindow.closed) return
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
    if (hasPrinted || printWindow.closed) return

    const images = Array.from(printWindow.document?.images || [])
    if (!waitForImages || images.length === 0) {
      printOnce()
      return
    }

    let pending = 0
    images.forEach((img) => {
      if (img.complete) return
      pending += 1
      img.addEventListener('load', () => {
        pending -= 1
        if (pending <= 0) printOnce()
      }, { once: true })
      img.addEventListener('error', () => {
        pending -= 1
        if (pending <= 0) printOnce()
      }, { once: true })
    })

    if (pending === 0) {
      printOnce()
    }
  }

  try {
    printWindow.document.open('text/html', 'replace')
    printWindow.document.write(html)
    printWindow.document.close()

    // Single deferred print path — no onload, no setTimeout print retries.
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
