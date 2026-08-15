import { Download, FileText } from 'lucide-react'
import Button from './Button'
import { downloadReportExcel, downloadReportPdf } from '../utils/reportExport'
import { useToast } from './Toast'

export function buildExportColumns(columns = []) {
  return columns
    .filter((column) => column.key && column.label)
    .map(({ key, label, exportValue }) => ({ key, label, exportValue }))
}

export default function TableExportActions({
  title,
  heading,
  filename,
  periodLabel,
  columns,
  rows,
  size = 'sm',
  showPdf = true,
  onCsvClick,
  onPdfClick,
  exporting = false
}) {
  const toast = useToast()
  const exportColumns = buildExportColumns(columns)

  function exportPayload() {
    return {
      title,
      periodLabel,
      filename,
      sections: [{
        heading: heading || title,
        columns: exportColumns,
        rows: rows || []
      }]
    }
  }

  function handleCsv() {
    if (onCsvClick) {
      onCsvClick()
      return
    }

    if (!rows?.length) {
      toast.warning('No data to export.')
      return
    }
    downloadReportExcel(exportPayload())
  }

  function handlePdf() {
    if (onPdfClick) {
      onPdfClick()
      return
    }

    try {
      downloadReportPdf(exportPayload())
    } catch (error) {
      console.error('PDF export failed:', error)
      toast.error('PDF export failed. Please try again or use Export CSV instead.')
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button color="green" variant="subtle" size={size} onClick={handleCsv} disabled={exporting}>
        <Download size={14} /> Export CSV
      </Button>
      {showPdf && (
        <Button color="slate" variant="subtle" size={size} onClick={handlePdf} disabled={exporting}>
          <FileText size={14} /> Export PDF
        </Button>
      )}
    </div>
  )
}
