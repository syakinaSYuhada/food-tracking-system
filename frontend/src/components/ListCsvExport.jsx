import { Download } from 'lucide-react'
import Button from './Button'
import { downloadReportExcel } from '../utils/reportExport'
import { buildExportColumns } from './TableExportActions'
import { useToast } from './Toast'

export default function ListCsvExport({
  title,
  heading,
  filename,
  periodLabel,
  columns,
  rows,
  size = 'sm',
  disabled = false
}) {
  const toast = useToast()
  const exportColumns = buildExportColumns(columns)

  function handleCsv() {
    if (!rows?.length) {
      toast.warning('No data to export.')
      return
    }

    downloadReportExcel({
      title,
      periodLabel,
      filename,
      sections: [{
        heading: heading || title,
        columns: exportColumns,
        rows
      }]
    })
  }

  return (
    <Button
      color="green"
      variant="subtle"
      size={size}
      className="list-action-btn shrink-0"
      onClick={handleCsv}
      disabled={disabled}
    >
      <Download size={14} /> Export CSV
    </Button>
  )
}
