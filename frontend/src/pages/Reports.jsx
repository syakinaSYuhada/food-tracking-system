import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CheckSquare, Layers, Package, TrendingDown, AlertTriangle } from 'lucide-react'
import api from '../api/client'
import StatusBadge from '../components/StatusBadge'
import KPICard from '../components/KPICard'
import PageHeader from '../components/PageHeader'
import ChartCard from '../components/ChartCard'
import ReportPeriodFilter, { buildReportPeriodParams, currentMonthValue } from '../components/ReportPeriodFilter'
import TabPills from '../components/TabPills'
import Button from '../components/Button'
import TableExportActions from '../components/TableExportActions'
import LoadingState from '../components/LoadingState'
import DefectsByTypeChart from '../components/charts/DefectsByTypeChart'
import { getReportSortConfig, groupSortOptionsByType, sortReportRows } from '../utils/reportSort'
const TAB_ROOT_CAUSE = 'Root Cause & Process'
const TAB_FINANCIAL = 'Financial Impact'
const TAB_TRACEABILITY = 'Product & Batch Traceability'
const TABS = [TAB_ROOT_CAUSE, TAB_FINANCIAL, TAB_TRACEABILITY]
const ROOT_CAUSE_VIEWS = ['By Root Cause', 'By Detection Stage', 'By Process Area', 'By Process/Tool']
const FINANCIAL_VIEWS = ['By Defect', 'Discarded Only']
const TRACEABILITY_VIEWS = ['By Batch', 'By Product', 'Expiry Defect Cases', 'Batch Expiry Audit']
const VIEW_OPTIONS_BY_TAB = {
  [TAB_ROOT_CAUSE]: ROOT_CAUSE_VIEWS,
  [TAB_FINANCIAL]: FINANCIAL_VIEWS,
  [TAB_TRACEABILITY]: TRACEABILITY_VIEWS
}
const DEFAULT_VIEW_BY_TAB = {
  [TAB_ROOT_CAUSE]: 'By Root Cause',
  [TAB_FINANCIAL]: 'By Defect',
  [TAB_TRACEABILITY]: 'By Batch'
}
function money(value) {
  return `RM ${Number(value || 0).toFixed(2)}`
}
function formatDate(value) {
  if (!value) return '-'
  return String(value).split('T')[0]
}
function getData(res) {
  return res?.data?.data ?? res?.data ?? {}
}
function ReportTabHint({ children }) {
  return (
    <p className="mb-2 text-[0.6875rem] leading-4 text-brand-muted">{children}</p>
  )
}
function ReportEmptyState({ text = 'No report data available.' }) {
  return (
    <div className="rounded-xl border border-dashed border-brand-border/80 bg-slate-50/60 px-4 py-6 text-center">
      <p className="text-sm font-medium text-brand-ink">Nothing to show</p>
      <p className="mt-0.5 text-[0.6875rem] leading-4 text-brand-muted">{text}</p>
    </div>
  )
}
function ReportTable({ columns, rows, exportConfig }) {
  if (!rows || rows.length === 0) return <ReportEmptyState />
  return (
    <div className="space-y-2">
      {exportConfig && (
        <div className="flex justify-end">
          <TableExportActions
            title={exportConfig.title}
            heading={exportConfig.heading}
            filename={exportConfig.filename}
            periodLabel={exportConfig.periodLabel}
            columns={columns}
            rows={rows}
          />
        </div>
      )}
      <div className="data-table-scroll">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key || col.label} className={col.className || col.width || ''}>{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row.id ?? row.action_code ?? row.batch_code ?? i}>
              {columns.map((col) => (
                <td key={col.key || col.label} className={col.tdClass || ''}>
                  <div className={`truncate ${col.cellClass || ''}`} title={row[col.key] ?? ''} style={{ maxWidth: col.maxWidth || 'none' }}>
                    {col.render ? col.render(row) : (row[col.key] ?? '-')}
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  )
}
function ViewSelector({ label, value, options, onChange }) {
  return (
    <label className="flex items-center gap-1.5 text-[0.6875rem] font-semibold uppercase tracking-wide text-brand-muted">
      {label}
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="list-toolbar-select-wide normal-case"
      >
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </label>
  )
}
export default function Reports() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState(TAB_ROOT_CAUSE)
  const [rootCauseView, setRootCauseView] = useState(DEFAULT_VIEW_BY_TAB[TAB_ROOT_CAUSE])
  const [financialView, setFinancialView] = useState(DEFAULT_VIEW_BY_TAB[TAB_FINANCIAL])
  const [traceabilityView, setTraceabilityView] = useState(DEFAULT_VIEW_BY_TAB[TAB_TRACEABILITY])
  const [period, setPeriod] = useState('this_month')
  const [selectedMonth, setSelectedMonth] = useState(currentMonthValue())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reports, setReports] = useState({})
  const [sortBy, setSortBy] = useState('total')
  const [sortOrder, setSortOrder] = useState('desc')
  const activeView = activeTab === TAB_ROOT_CAUSE
    ? rootCauseView
    : activeTab === TAB_FINANCIAL
      ? financialView
      : traceabilityView
  const activeSortConfig = getReportSortConfig(activeView)
  const sortOptionGroups = activeSortConfig ? groupSortOptionsByType(activeSortConfig.options) : null
  useEffect(() => {
    const config = getReportSortConfig(activeView)
    if (!config) return
    setSortBy(config.defaultSortBy)
    setSortOrder(config.defaultOrder)
  }, [activeView])
  useEffect(() => {
    const tab = searchParams.get('tab')
    const view = searchParams.get('view')
    if (tab === 'expiry' || (tab === 'traceability' && view === 'expiry-defect-cases')) {
      setActiveTab(TAB_TRACEABILITY)
      setTraceabilityView('Expiry Defect Cases')
      return
    }
    if (tab === 'traceability') {
      setActiveTab(TAB_TRACEABILITY)
      if (view === 'by-product') setTraceabilityView('By Product')
      else if (view === 'batch-expiry-audit') setTraceabilityView('Batch Expiry Audit')
      else if (view === 'by-batch') setTraceabilityView('By Batch')
    }
  }, [searchParams])
  useEffect(() => {
    async function loadReports() {
      setLoading(true)
      setError('')
      try {
        const params = buildReportPeriodParams(period, selectedMonth)
        const [
          lossRes,
          rootRes,
          byProcessStageRes,
          rootCauseAreaRes,
          relatedProcessToolRes,
          expiryRes,
          batchExpiryAuditRes,
          discardedRes,
          byProductRes,
          byBatchRes
        ] = await Promise.all([
          api.get('/reports/loss', { params }),
          api.get('/reports/root-causes', { params }),
          api.get('/reports/by-process-stage', { params }),
          api.get('/reports/root-cause-by-process-area', { params }),
          api.get('/reports/related-process-tool', { params }),
          api.get('/reports/expiry-issues', { params }),
          api.get('/reports/batch-expiry-audit'),
          api.get('/reports/discarded-products', { params }),
          api.get('/reports/by-product', { params }),
          api.get('/reports/by-batch', { params })
        ])
        setReports({
          loss: getData(lossRes),
          root: getData(rootRes),
          byProcessStage: getData(byProcessStageRes),
          rootCauseArea: getData(rootCauseAreaRes),
          relatedProcessTool: getData(relatedProcessToolRes),
          expiry: getData(expiryRes),
          batchExpiryAudit: getData(batchExpiryAuditRes),
          discarded: getData(discardedRes),
          byProduct: getData(byProductRes),
          byBatch: getData(byBatchRes)
        })
      } catch (err) {
        console.error(err)
        setError('Failed to load report data.')
      } finally {
        setLoading(false)
      }
    }
    loadReports()
  }, [period, selectedMonth])
  const lossRows = reports.loss?.rows || []
  const lossKpis = reports.loss?.kpis || {}
  const rootRows = reports.root?.breakdown || []
  const rootKpis = reports.root?.kpis || {}
  const byProcessStageRows = reports.byProcessStage?.rows || []
  const byProcessStageKpis = reports.byProcessStage?.kpis || {}
  const rootCauseAreaRows = reports.rootCauseArea?.rows || []
  const rootCauseAreaKpis = reports.rootCauseArea?.kpis || {}
  const relatedProcessToolRows = reports.relatedProcessTool?.rows || []
  const relatedProcessToolKpis = reports.relatedProcessTool?.kpis || {}
  const expiryRows = reports.expiry?.rows || []
  const batchExpiryAuditRows = reports.batchExpiryAudit?.rows || []
  const batchExpiryAuditKpis = reports.batchExpiryAudit?.kpis || {}
  const discardedRows = reports.discarded?.rows || []
  const byProductRows = reports.byProduct?.rows || (Array.isArray(reports.byProduct) ? reports.byProduct : [])
  const byBatchRows = reports.byBatch?.rows || (Array.isArray(reports.byBatch) ? reports.byBatch : [])
  const periodLabel = reports.loss?.period_label
  const sortedLossRows = useMemo(
    () => sortReportRows(lossRows, sortBy, sortOrder, 'By Defect'),
    [lossRows, sortBy, sortOrder]
  )
  const sortedRootRows = useMemo(
    () => sortReportRows(rootRows, sortBy, sortOrder, 'By Root Cause'),
    [rootRows, sortBy, sortOrder]
  )
  const sortedByProcessStageRows = useMemo(
    () => sortReportRows(byProcessStageRows, sortBy, sortOrder, 'By Detection Stage'),
    [byProcessStageRows, sortBy, sortOrder]
  )
  const sortedRootCauseAreaRows = useMemo(
    () => sortReportRows(rootCauseAreaRows, sortBy, sortOrder, 'By Process Area'),
    [rootCauseAreaRows, sortBy, sortOrder]
  )
  const sortedRelatedProcessToolRows = useMemo(
    () => sortReportRows(relatedProcessToolRows, sortBy, sortOrder, 'By Process/Tool'),
    [relatedProcessToolRows, sortBy, sortOrder]
  )
  const byProcessStageChart = useMemo(
    () => byProcessStageRows.map((row) => ({
      name: row.process_stage,
      value: Number(row.defect_count || 0)
    })),
    [byProcessStageRows]
  )
  const sortedExpiryRows = useMemo(
    () => sortReportRows(expiryRows, sortBy, sortOrder, 'Expiry Defect Cases', 'defects'),
    [expiryRows, sortBy, sortOrder]
  )
  const sortedBatchExpiryAuditRows = useMemo(
    () => sortReportRows(batchExpiryAuditRows, sortBy, sortOrder, 'Batch Expiry Audit', 'batch'),
    [batchExpiryAuditRows, sortBy, sortOrder]
  )
  const sortedDiscardedRows = useMemo(
    () => sortReportRows(discardedRows, sortBy, sortOrder, 'Discarded Only'),
    [discardedRows, sortBy, sortOrder]
  )
  const sortedByProductRows = useMemo(
    () => sortReportRows(byProductRows, sortBy, sortOrder, 'By Product'),
    [byProductRows, sortBy, sortOrder]
  )
  const sortedByBatchRows = useMemo(
    () => sortReportRows(byBatchRows, sortBy, sortOrder, 'By Batch'),
    [byBatchRows, sortBy, sortOrder]
  )
  if (loading) return <LoadingState label="Loading report data..." />
  if (error) return <div className="alert-error">{error}</div>
  function tableExportConfig(title, slug, customPeriodLabel) {
    const safePeriod = (customPeriodLabel || periodLabel || 'all-time').toLowerCase().replace(/\s+/g, '-')
    return {
      title: `Reports — ${title}`,
      heading: title,
      filename: `qdts-${slug}-${safePeriod}.csv`,
      periodLabel: customPeriodLabel ?? periodLabel ?? 'All Time'
    }
  }
  function handleTabChange(tab) {
    setActiveTab(tab)
  }
  function handleViewChange(view) {
    if (activeTab === TAB_ROOT_CAUSE) setRootCauseView(view)
    else if (activeTab === TAB_FINANCIAL) setFinancialView(view)
    else setTraceabilityView(view)
  }
  const lossColumns = [
    { key: 'defect_code', label: 'Defect Code', className: 'min-w-[7rem] w-28' },
    { key: 'product_name', label: 'Product', className: 'w-full md:w-40' },
    { key: 'batch_number', label: 'Batch', className: 'w-28' },
    { key: 'qty_on_hold', label: 'Qty On Hold', className: 'w-24' },
    { key: 'qty_discarded', label: 'Qty Discarded', className: 'w-24' },
    { key: 'loss_at_risk', label: 'Loss at Risk', className: 'w-28', render: (row) => money(row.loss_at_risk), exportValue: (row) => money(row.loss_at_risk) },
    { key: 'pending_loss', label: 'Pending Loss', className: 'w-28', render: (row) => money(row.pending_loss), exportValue: (row) => money(row.pending_loss) },
    { key: 'confirmed_loss', label: 'Confirmed Loss', className: 'w-28', render: (row) => money(row.confirmed_loss), exportValue: (row) => money(row.confirmed_loss) },
    { key: 'loss_status', label: 'Loss Status', className: 'w-32', render: (row) => <StatusBadge value={row.loss_status || row.status} />, exportValue: (row) => row.loss_status || row.status }
  ]
  const discardedColumns = [
    { key: 'defect_code', label: 'Defect Code', className: 'w-28' },
    { key: 'product_name', label: 'Product', className: 'w-full md:w-48' },
    { key: 'batch_number', label: 'Batch', className: 'w-28' },
    { key: 'qty_discarded', label: 'Qty Discarded', className: 'w-28' },
    { key: 'estimated_loss', label: 'Estimated Loss', className: 'w-32', render: (r) => money(r.estimated_loss), exportValue: (r) => money(r.estimated_loss) },
    { key: 'loss_status', label: 'Loss Status', className: 'w-36', render: (r) => <StatusBadge value={r.loss_status || r.status} />, exportValue: (r) => r.loss_status || r.status }
  ]
  const expiryDefectColumns = [
    { key: 'defect_code', label: 'Defect' },
    { key: 'product_name', label: 'Product' },
    { key: 'batch_number', label: 'Batch', render: (r) => r.batch_number || r.batch_code || '-', exportValue: (r) => r.batch_number || r.batch_code || '-' },
    { key: 'correct_expiry_date', label: 'Expected Expiry', render: (r) => formatDate(r.correct_expiry_date || r.expiry_date), exportValue: (r) => formatDate(r.correct_expiry_date || r.expiry_date) },
    { key: 'printed_expiry_date', label: 'Printed Expiry', render: (r) => formatDate(r.printed_expiry_date), exportValue: (r) => formatDate(r.printed_expiry_date) },
    { key: 'qty_affected', label: 'Qty Affected' },
    { key: 'defect_status', label: 'Status', render: (r) => <StatusBadge value={r.defect_status} />, exportValue: (r) => r.defect_status }
  ]
  const batchExpiryAuditColumns = [
    { key: 'batch_number', label: 'Batch' },
    { key: 'product_name', label: 'Product' },
    { key: 'retort_date', label: 'Retort Date', render: (r) => formatDate(r.retort_date), exportValue: (r) => formatDate(r.retort_date) },
    { key: 'correct_expiry_date', label: 'Expected Expiry', render: (r) => formatDate(r.correct_expiry_date), exportValue: (r) => formatDate(r.correct_expiry_date) },
    { key: 'printed_expiry_date', label: 'Printed Expiry', render: (r) => formatDate(r.printed_expiry_date), exportValue: (r) => formatDate(r.printed_expiry_date) },
    { key: 'difference_days', label: 'Days Diff' },
    { key: 'defect_count', label: 'Defects' },
    { key: 'open_defect_count', label: 'Open' },
    {
      key: 'id',
      label: '',
      render: (r) => (
        <Button size="sm" color="blue" variant="subtle" onClick={() => navigate(`/batches/${r.id}`)}>
          Trace
        </Button>
      )
    }
  ]
  const byProductColumns = [
    { key: 'product_name', label: 'Product', className: 'w-full md:w-48' },
    { key: 'total_defects', label: 'Defects', className: 'w-20' },
    { key: 'loss_at_risk', label: 'Loss at Risk', className: 'w-32', render: (r) => money(r.loss_at_risk), exportValue: (r) => money(r.loss_at_risk) },
    { key: 'pending_loss', label: 'Pending Loss', className: 'w-32', render: (r) => money(r.pending_loss), exportValue: (r) => money(r.pending_loss) },
    { key: 'confirmed_loss', label: 'Confirmed Loss', className: 'w-32', render: (r) => money(r.confirmed_loss), exportValue: (r) => money(r.confirmed_loss) },
    { key: 'most_common_defect', label: 'Most Common Defect', className: 'w-1/3' }
  ]
  const byBatchColumns = [
    { key: 'batch_number', label: 'Batch', className: 'min-w-[7rem] w-24', render: (r) => r.batch_number || r.batch_code || '-', exportValue: (r) => r.batch_number || r.batch_code || '-' },
    { key: 'product_name', label: 'Product', className: 'w-full md:w-32' },
    { key: 'defect_count', label: 'Defects', className: 'w-16' },
    { key: 'qty_affected', label: 'Qty Affected', className: 'w-20' },
    { key: 'qty_on_hold', label: 'Qty On Hold', className: 'w-20' },
    { key: 'qty_discarded', label: 'Qty Discarded', className: 'w-20' },
    { key: 'loss_at_risk', label: 'Loss at Risk', className: 'w-24', render: (r) => money(r.loss_at_risk), exportValue: (r) => money(r.loss_at_risk) },
    { key: 'pending_loss', label: 'Pending Loss', className: 'w-24', render: (r) => money(r.pending_loss), exportValue: (r) => money(r.pending_loss) },
    { key: 'confirmed_loss', label: 'Confirmed Loss', className: 'w-24', render: (r) => money(r.confirmed_loss), exportValue: (r) => money(r.confirmed_loss) },
    { key: 'main_defect_type', label: 'Main Defect Type', className: 'w-full md:w-36' }
  ]
  return (
    <div className="page-stack mx-auto w-full max-w-[1280px]">
      <PageHeader
        title="Reports"
        subtitle={periodLabel
          ? `Analysis reports for ${periodLabel}. All data is loaded from the database.`
          : 'Analysis reports for defects, losses, corrective actions, root causes, expiry issues, products, and batches.'}
      >
        <ReportPeriodFilter
          value={period}
          month={selectedMonth}
          onChange={setPeriod}
          onMonthChange={setSelectedMonth}
        />
      </PageHeader>
      <div className="mb-1">
        <TabPills
          variant="report"
          items={TABS.map((t) => ({ value: t, label: t }))}
          value={activeTab}
          onChange={handleTabChange}
        />
      </div>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <ViewSelector
          label="View"
          value={activeView}
          options={VIEW_OPTIONS_BY_TAB[activeTab]}
          onChange={handleViewChange}
        />
        {activeSortConfig && (
          <>
            <label className="flex items-center gap-1.5 text-[0.6875rem] font-semibold uppercase tracking-wide text-brand-muted">
              Sort By
              <select
                aria-label="Sort by"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="list-toolbar-select-wide normal-case"
              >
                {sortOptionGroups
                  ? sortOptionGroups.map((group) => (
                      <optgroup key={group.type} label={group.label}>
                        {group.options.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </optgroup>
                    ))
                  : activeSortConfig.options.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
              </select>
            </label>
            <label className="flex items-center gap-1.5 text-[0.6875rem] font-semibold uppercase tracking-wide text-brand-muted">
              Order
              <select
                aria-label="Sort order"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="list-toolbar-select normal-case"
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </label>
          </>
        )}
      </div>
      <div>
        {activeTab === TAB_ROOT_CAUSE && (
          <div className="page-stack">
            {rootCauseView === 'By Root Cause' && (
              <>
                <ReportTabHint>
                  This report summarizes root causes found in defect records for the selected period, not the full list of available root cause options.
                </ReportTabHint>
                <div className="list-kpi-strip lg:grid-cols-4">
                  <KPICard density="dashboard" title="Investigations" value={rootKpis.total_investigations ?? 0} subtitle="This period" icon={<CheckSquare size={16} />} tone="blue" />
                  <KPICard density="dashboard" title="Confirmed" value={rootKpis.confirmed_root_causes ?? 0} subtitle="Root causes confirmed" icon={<Layers size={16} />} tone="green" />
                  <KPICard density="dashboard" title="Suspected" value={rootKpis.suspected_root_causes ?? 0} subtitle="Under suspicion" icon={<AlertTriangle size={16} />} tone="amber" />
                  <KPICard density="dashboard" title="Pending Investigation" value={rootKpis.pending_investigation ?? 0} subtitle="Not yet determined" icon={<Package size={16} />} tone="purple" />
                </div>
                <ReportTable
                  exportConfig={tableExportConfig('Root Cause Analysis', 'root-cause')}
                  columns={[
                    { key: 'root_cause', label: 'Root Cause' },
                    { key: 'confirmed', label: 'Confirmed' },
                    { key: 'suspected', label: 'Suspected' },
                    { key: 'pending_investigation', label: 'Pending Investigation' },
                    { key: 'total', label: 'Total' }
                  ]}
                  rows={sortedRootRows}
                />
                {rootRows.length === 0 && <ReportEmptyState />}
              </>
            )}
            {rootCauseView === 'By Detection Stage' && (
              <>
                <ReportTabHint>Where defects were detected across the Retort Niaga workflow.</ReportTabHint>
                <div className="list-kpi-strip lg:grid-cols-3">
                  <KPICard density="dashboard" title="Detection Stages" value={byProcessStageKpis.stages_with_defects ?? 0} subtitle="With defects" icon={<Layers size={16} />} tone="blue" />
                  <KPICard density="dashboard" title="Total Defects" value={byProcessStageKpis.total_defects ?? 0} subtitle="This period" icon={<Package size={16} />} tone="amber" />
                  <KPICard density="dashboard" title="Qty Affected" value={byProcessStageKpis.total_qty_affected ?? 0} subtitle="Units reported" icon={<TrendingDown size={16} />} tone="purple" />
                </div>
                {byProcessStageChart.length > 0 && (
                  <ChartCard title="Defects by Detection Stage" subtitle="Defect count grouped by where the issue was detected.">
                    <DefectsByTypeChart data={byProcessStageChart} emptyMessage="No detection stage data for this period." />
                  </ChartCard>
                )}
                <ReportTable
                  exportConfig={tableExportConfig('Defects by Detection Stage', 'by-detection-stage')}
                  columns={[
                    { key: 'process_stage', label: 'Detection Stage' },
                    { key: 'defect_count', label: 'Defect Count' },
                    { key: 'qty_affected', label: 'Qty Affected' }
                  ]}
                  rows={sortedByProcessStageRows}
                />
                {byProcessStageRows.length === 0 && <ReportEmptyState text="No defects recorded by detection stage in this period." />}
              </>
            )}
            {rootCauseView === 'By Process Area' && (
              <>
                <ReportTabHint>Analysis by process area responsible for defects.</ReportTabHint>
                <div className="list-kpi-strip lg:grid-cols-2">
                  <KPICard density="dashboard" title="Investigations" value={rootCauseAreaKpis.total_investigations ?? 0} subtitle="This period" icon={<CheckSquare size={16} />} tone="blue" />
                  <KPICard density="dashboard" title="Root Cause Areas" value={rootCauseAreaKpis.process_areas ?? 0} subtitle="Distinct process areas" icon={<Layers size={16} />} tone="amber" />
                </div>
                <ReportTable
                  exportConfig={tableExportConfig('Root Cause by Process Area', 'root-cause-area')}
                  columns={[
                    { key: 'root_cause_area', label: 'Root Cause Area' },
                    { key: 'cases', label: 'Cases' },
                    { key: 'status', label: 'Status', render: (r) => <StatusBadge value={r.status} />, exportValue: (r) => r.status }
                  ]}
                  rows={sortedRootCauseAreaRows}
                />
                {rootCauseAreaRows.length === 0 && <ReportEmptyState text="No root cause area data in this period." />}
              </>
            )}
            {rootCauseView === 'By Process/Tool' && (
              <>
                <ReportTabHint>Related process, equipment, or tool involved in investigations.</ReportTabHint>
                <div className="list-kpi-strip lg:grid-cols-2">
                  <KPICard density="dashboard" title="Related Process / Tool" value={relatedProcessToolKpis.tools_tracked ?? 0} subtitle="Distinct entries" icon={<Layers size={16} />} tone="blue" />
                  <KPICard density="dashboard" title="Linked Defect Cases" value={relatedProcessToolKpis.linked_defect_cases ?? 0} subtitle="This period" icon={<Package size={16} />} tone="amber" />
                </div>
                <ReportTable
                  exportConfig={tableExportConfig('Related Process / Tool Breakdown', 'related-process-tool')}
                  columns={[
                    { key: 'related_process_tool', label: 'Related Process / Tool' },
                    { key: 'cases', label: 'Cases' },
                    { key: 'most_common_defect', label: 'Most Common Defect' }
                  ]}
                  rows={sortedRelatedProcessToolRows}
                />
                {relatedProcessToolRows.length === 0 && <ReportEmptyState text="No related process or tool data in this period." />}
              </>
            )}
          </div>
        )}
        {activeTab === TAB_FINANCIAL && (
          <div className="page-stack">
            <div className="list-kpi-strip lg:grid-cols-3">
              <KPICard
                density="dashboard"
                title="Loss at Risk"
                value={money(lossKpis.loss_at_risk ?? 0)}
                subtitle="Open defects · held inventory"
                icon={<AlertTriangle size={16} />}
                tone="amber"
                highlight={Number(lossKpis.loss_at_risk) > 0}
              />
              <KPICard
                density="dashboard"
                title="Pending Loss"
                value={money(lossKpis.pending_loss ?? 0)}
                subtitle="Discarded · case still open"
                icon={<TrendingDown size={16} />}
                tone="purple"
                highlight={Number(lossKpis.pending_loss) > 0}
              />
              <KPICard
                density="dashboard"
                title="Confirmed Loss"
                value={money(lossKpis.confirmed_loss ?? 0)}
                subtitle="Finalized on close"
                icon={<TrendingDown size={16} />}
                tone="red"
              />
            </div>
            {financialView === 'By Defect' && (
              lossRows.length > 0 ? (
                <ReportTable
                  exportConfig={tableExportConfig('Loss Report', 'loss-report')}
                  columns={lossColumns}
                  rows={sortedLossRows}
                />
              ) : <ReportEmptyState />
            )}
            {financialView === 'Discarded Only' && (
              discardedRows.length > 0 ? (
                <ReportTable
                  exportConfig={tableExportConfig('Discarded Products', 'discarded-products')}
                  columns={discardedColumns}
                  rows={sortedDiscardedRows}
                />
              ) : <ReportEmptyState />
            )}
          </div>
        )}
        {activeTab === TAB_TRACEABILITY && (
          <div className="page-stack">
            {traceabilityView === 'By Batch' && (
              <>
                <ReportTabHint>Batch-level traceability and quality summary.</ReportTabHint>
                {byBatchRows.length > 0 ? (
                  <ReportTable
                    exportConfig={tableExportConfig('By Batch', 'by-batch')}
                    columns={byBatchColumns}
                    rows={sortedByBatchRows}
                  />
                ) : <ReportEmptyState />}
              </>
            )}
            {traceabilityView === 'By Product' && (
              <>
                <ReportTabHint>Product-level defect and loss summary.</ReportTabHint>
                {byProductRows.length > 0 ? (
                  <ReportTable
                    exportConfig={tableExportConfig('By Product', 'by-product')}
                    columns={byProductColumns}
                    rows={sortedByProductRows}
                  />
                ) : <ReportEmptyState />}
              </>
            )}
            {traceabilityView === 'Expiry Defect Cases' && (
              <>
                <ReportTabHint>Defects in the selected period where printed expiry differs from expected retort expiry.</ReportTabHint>
                {expiryRows.length > 0 ? (
                  <ReportTable
                    exportConfig={tableExportConfig('Defect Cases — Expiry Issues', 'expiry-defect-cases')}
                    columns={expiryDefectColumns}
                    rows={sortedExpiryRows}
                  />
                ) : <ReportEmptyState text="No expiry-related defects in the selected period." />}
              </>
            )}
            {traceabilityView === 'Batch Expiry Audit' && (
              <>
                <div className="mb-2 inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[0.6875rem] font-medium text-amber-800">
                  All batches — not filtered by period
                </div>
                <div className="list-kpi-grid lg:grid-cols-3">
                  <KPICard title="Mismatch Batches" value={batchExpiryAuditKpis.mismatch_batches ?? 0} tone="red" highlight={Number(batchExpiryAuditKpis.mismatch_batches) > 0} icon={<Package size={16} />} />
                  <KPICard title="With Open Defects" value={batchExpiryAuditKpis.batches_with_open_defects ?? 0} tone="amber" icon={<Layers size={16} />} />
                  <KPICard title="Linked Defect Cases" value={batchExpiryAuditKpis.linked_defect_cases ?? 0} tone="blue" icon={<CheckSquare size={16} />} />
                </div>
                {batchExpiryAuditRows.length > 0 ? (
                  <ReportTable
                    exportConfig={tableExportConfig('Batch Expiry Audit', 'batch-expiry-audit', 'All batches — not filtered by period')}
                    columns={batchExpiryAuditColumns}
                    rows={sortedBatchExpiryAuditRows}
                  />
                ) : <ReportEmptyState text="No batch expiry mismatches in the database." />}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
