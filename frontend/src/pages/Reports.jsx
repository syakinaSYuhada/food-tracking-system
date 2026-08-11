import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { CheckSquare, Layers, Package, TrendingDown, AlertTriangle } from 'lucide-react'
import api from '../api/client'
import StatusBadge from '../components/StatusBadge'
import KPICard from '../components/KPICard'
import PageHeader from '../components/PageHeader'
import ChartCard from '../components/ChartCard'
import SectionCard from '../components/SectionCard'
import ReportPeriodFilter, { buildReportPeriodParams, currentMonthValue } from '../components/ReportPeriodFilter'
import TabPills from '../components/TabPills'
import Button from '../components/Button'
import TableExportActions from '../components/TableExportActions'
import LoadingState from '../components/LoadingState'
import AnalyticRow from '../components/AnalyticRow'
import DefectsByTypeChart from '../components/charts/DefectsByTypeChart'
import ActionsByStatusChart from '../components/charts/ActionsByStatusChart'
import { getReportSortConfig, sortReportRows } from '../utils/reportSort'
import { formatCaStatusLabel } from '../utils/caStatusLabel'
const PIE_COLORS = ['#1F8F73', '#146356', '#C2410C', '#F59E0B', '#7EC6AE']

function money(value) {
  return `RM ${Number(value || 0).toFixed(2)}`
}

function formatDate(value) {
  if (!value) return '-'
  return String(value).split('T')[0]
}

function titleCase(value) {
  if (!value) return '-'
  return String(value).replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())
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

export default function Reports() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const tabs = ['Overview', 'Loss', 'Root Cause', 'By Detection Stage', 'Root Cause Area', 'Process / Tool', 'Expiry Issues', 'Discarded Products', 'By Product', 'By Batch']

  const [activeTab, setActiveTab] = useState('Overview')
  const [period, setPeriod] = useState('this_month')
  const [selectedMonth, setSelectedMonth] = useState(currentMonthValue())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reports, setReports] = useState({})
  const [sortBy, setSortBy] = useState('loss_at_risk')
  const [sortOrder, setSortOrder] = useState('desc')

  const activeSortConfig = getReportSortConfig(activeTab)

  useEffect(() => {
    const config = getReportSortConfig(activeTab)
    if (!config) return
    setSortBy(config.defaultSortBy)
    setSortOrder(config.defaultOrder)
  }, [activeTab])

  useEffect(() => {
    const tab = searchParams.get('tab')
    if (tab === 'expiry') setActiveTab('Expiry Issues')
  }, [searchParams])

  useEffect(() => {
    async function loadReports() {
      setLoading(true)
      setError('')

      try {
        const params = buildReportPeriodParams(period, selectedMonth)

        const [
          summaryRes,
          lossRes,
          correctiveRes,
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
          api.get('/reports/dashboard/summary', { params }),
          api.get('/reports/loss', { params }),
          api.get('/reports/corrective-actions', { params }),
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
          summary: getData(summaryRes),
          loss: getData(lossRes),
          corrective: getData(correctiveRes),
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

  const summaryKpis = reports.summary?.kpis || {}
  const summaryCharts = reports.summary?.charts || {}

  const defectsByType = useMemo(() => {
    return (summaryCharts.defects_by_type || []).map((item) => ({
      name: item.defect_type,
      value: Number(item.count)
    }))
  }, [summaryCharts])

  const actionsByStatus = useMemo(() => {
    return (summaryCharts.actions_by_status || []).map((item, index) => ({
      name: formatCaStatusLabel(item.ca_status),
      value: Number(item.count),
      color: PIE_COLORS[index % PIE_COLORS.length]
    }))
  }, [summaryCharts])

  const lossRows = reports.loss?.rows || []
  const lossKpis = reports.loss?.kpis || {}
  const correctiveRows = reports.corrective?.rows || []
  const rootRows = reports.root?.breakdown || []
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
  const periodLabel = reports.summary?.period_label

  const sortedLossRows = useMemo(
    () => sortReportRows(lossRows, sortBy, sortOrder, 'Loss'),
    [lossRows, sortBy, sortOrder]
  )
  const sortedRootRows = useMemo(
    () => sortReportRows(rootRows, sortBy, sortOrder, 'Root Cause'),
    [rootRows, sortBy, sortOrder]
  )
  const sortedByProcessStageRows = useMemo(
    () => sortReportRows(byProcessStageRows, sortBy, sortOrder, 'By Detection Stage'),
    [byProcessStageRows, sortBy, sortOrder]
  )
  const sortedRootCauseAreaRows = useMemo(
    () => sortReportRows(rootCauseAreaRows, sortBy, sortOrder, 'Root Cause Area'),
    [rootCauseAreaRows, sortBy, sortOrder]
  )
  const sortedRelatedProcessToolRows = useMemo(
    () => sortReportRows(relatedProcessToolRows, sortBy, sortOrder, 'Process / Tool'),
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
    () => sortReportRows(expiryRows, sortBy, sortOrder, 'Expiry Issues', 'defects'),
    [expiryRows, sortBy, sortOrder]
  )
  const sortedBatchExpiryAuditRows = useMemo(
    () => sortReportRows(batchExpiryAuditRows, sortBy, sortOrder, 'Expiry Issues', 'batch'),
    [batchExpiryAuditRows, sortBy, sortOrder]
  )
  const sortedDiscardedRows = useMemo(
    () => sortReportRows(discardedRows, sortBy, sortOrder, 'Discarded Products'),
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

  function tableExportConfig(title, slug) {
    const safePeriod = (periodLabel || 'all-time').toLowerCase().replace(/\s+/g, '-')
    return {
      title: `Reports — ${title}`,
      heading: title,
      filename: `qdts-${slug}-${safePeriod}.csv`,
      periodLabel: periodLabel || 'All Time'
    }
  }

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
          items={tabs.map((t) => ({ value: t, label: t }))}
          value={activeTab}
          onChange={setActiveTab}
        />
      </div>

      {activeTab !== 'Overview' && activeSortConfig && (
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 text-[0.6875rem] font-semibold uppercase tracking-wide text-brand-muted">
            Sort By
            <select
              aria-label="Sort by"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="list-toolbar-select-wide normal-case"
            >
              {activeSortConfig.options.map((option) => (
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
        </div>
      )}

      <div>
        {activeTab === 'Overview' && (
          <div className="page-stack">
            <div className="list-kpi-grid lg:grid-cols-3">
              <KPICard density="dashboard" title="Total Defects" value={summaryKpis.total_defects ?? summaryKpis.totalDefects ?? '-'} subtitle="This period" icon={<Layers size={16} />} tone="blue" />
              <KPICard density="dashboard" title="Open Defects" value={summaryKpis.open_defects ?? summaryKpis.open ?? '-'} subtitle="Not closed" icon={<Package size={16} />} tone="amber" />
              <KPICard density="dashboard" title="Open Actions" value={summaryKpis.open_actions ?? summaryKpis.openActions ?? '-'} subtitle="In progress" icon={<CheckSquare size={16} />} tone="purple" />
            </div>

            <div className="list-kpi-strip lg:grid-cols-3">
              <KPICard
                density="dashboard"
                title="Loss at Risk"
                value={money(summaryKpis.loss_at_risk ?? 0)}
                subtitle="Open defects · held inventory"
                icon={<AlertTriangle size={16} />}
                tone="amber"
                highlight={Number(summaryKpis.loss_at_risk) > 0}
              />
              <KPICard
                density="dashboard"
                title="Pending Loss"
                value={money(summaryKpis.pending_loss ?? 0)}
                subtitle="Discarded · case still open"
                icon={<TrendingDown size={16} />}
                tone="purple"
                highlight={Number(summaryKpis.pending_loss) > 0}
              />
              <KPICard
                density="dashboard"
                title="Confirmed Loss"
                value={money(summaryKpis.confirmed_loss ?? 0)}
                subtitle="Finalized on close"
                icon={<TrendingDown size={16} />}
                tone="red"
              />
            </div>

            <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
              <ChartCard title="Defects by Type" subtitle="Distribution of defect categories in this report period.">
                <DefectsByTypeChart data={defectsByType} emptyMessage="No defect categories recorded for this period." />
              </ChartCard>

              <ChartCard title="Actions by Status" subtitle="How corrective actions are progressing.">
                <ActionsByStatusChart data={actionsByStatus} emptyMessage="No corrective actions in this period yet." />
              </ChartCard>
            </div>

            <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
              <SectionCard
                title="Top Root Causes"
                subtitle="Top 5 in selected period."
                action={rootRows.length > 0 ? (
                  <TableExportActions
                    {...tableExportConfig('Top Root Causes', 'top-root-causes')}
                    columns={[
                      { key: 'root_cause', label: 'Root Cause' },
                      { key: 'confirmed', label: 'Confirmed' },
                      { key: 'suspected', label: 'Suspected' },
                      { key: 'pending_investigation', label: 'Pending Investigation' },
                      { key: 'total', label: 'Total' }
                    ]}
                    rows={[...rootRows].sort((a, b) => Number(b.total || 0) - Number(a.total || 0)).slice(0, 5)}
                  />
                ) : null}
              >
                {rootRows.length === 0 ? (
                  <ReportEmptyState text="Root cause breakdown will appear once investigations are recorded." />
                ) : (
                  <div className="compact-list-stack">
                    {[...rootRows]
                      .sort((a, b) => Number(b.total || 0) - Number(a.total || 0))
                      .slice(0, 5)
                      .map((row, index) => (
                      <AnalyticRow
                        key={`${row.root_cause}-${index}`}
                        accentClass="bg-brand-500"
                        title={row.root_cause}
                        subtitle={`${row.confirmed ?? 0} confirmed · ${row.suspected ?? 0} suspected · ${row.pending_investigation ?? 0} pending`}
                        trailing={(
                          <div className="text-right">
                            <p className="text-[0.625rem] font-semibold uppercase leading-3 text-brand-muted">Total</p>
                            <p className="text-base font-bold text-brand-ink">{row.total ?? '-'}</p>
                          </div>
                        )}
                      />
                    ))}
                  </div>
                )}
              </SectionCard>

              <SectionCard
                title="Recent Corrective Actions"
                subtitle="Latest 5 in this period."
                action={correctiveRows.length > 0 ? (
                  <TableExportActions
                    {...tableExportConfig('Recent Corrective Actions', 'recent-corrective-actions')}
                    columns={[
                      { key: 'action_code', label: 'Action Code' },
                      { key: 'task', label: 'Task', exportValue: (r) => r.task || r.defect_code },
                      { key: 'defect_code', label: 'Defect Code' },
                      { key: 'assigned_to_name', label: 'Assigned To', exportValue: (r) => r.assigned_to_name || 'Unassigned' },
                      { key: 'due_date', label: 'Due Date', exportValue: (r) => formatDate(r.due_date || r.dueDate) },
                      { key: 'ca_status', label: 'Status', exportValue: (r) => r.ca_status || r.status }
                    ]}
                    rows={correctiveRows.slice(0, 5)}
                  />
                ) : null}
              >
                {correctiveRows.length === 0 ? (
                  <ReportEmptyState text="Corrective actions created in this period will appear here." />
                ) : (
                  <div className="compact-list-stack">
                    {correctiveRows.slice(0, 5).map((row) => (
                      <AnalyticRow
                        key={row.action_code || row.id}
                        accentClass="bg-indigo-500"
                        title={row.action_code}
                        subtitle={row.task || row.defect_code}
                        meta={`${row.defect_code} · ${row.assigned_to_name || 'Unassigned'}${row.due_date ? ` · Due ${formatDate(row.due_date || row.dueDate)}` : ''}`}
                        badge={<StatusBadge kind="ca" value={row.ca_status || row.status} />}
                      />
                    ))}
                  </div>
                )}
              </SectionCard>
            </div>
          </div>
        )}

        {activeTab === 'Loss' && (
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

            {lossRows.length > 0 ? (
              <ReportTable
                exportConfig={tableExportConfig('Loss Report', 'loss-report')}
                columns={[
                  { key: 'defect_code', label: 'Defect Code', className: 'min-w-[7rem] w-28' },
                  { key: 'product_name', label: 'Product', className: 'w-full md:w-40' },
                  { key: 'batch_number', label: 'Batch', className: 'w-28' },
                  { key: 'qty_on_hold', label: 'Qty On Hold', className: 'w-24' },
                  { key: 'qty_discarded', label: 'Qty Discarded', className: 'w-24' },
                  { key: 'loss_at_risk', label: 'Loss at Risk', className: 'w-28', render: (row) => money(row.loss_at_risk), exportValue: (row) => money(row.loss_at_risk) },
                  { key: 'pending_loss', label: 'Pending Loss', className: 'w-28', render: (row) => money(row.pending_loss), exportValue: (row) => money(row.pending_loss) },
                  { key: 'confirmed_loss', label: 'Confirmed Loss', className: 'w-28', render: (row) => money(row.confirmed_loss), exportValue: (row) => money(row.confirmed_loss) },
                  { key: 'loss_status', label: 'Loss Status', className: 'w-32', render: (row) => <StatusBadge value={row.loss_status || row.status} />, exportValue: (row) => row.loss_status || row.status }
                ]}
                rows={sortedLossRows}
              />
            ) : <ReportEmptyState />}
          </div>
        )}

        {activeTab === 'Root Cause' && (
          <div className="space-y-4">
            <ReportTabHint>
              This report summarizes root causes found in defect records for the selected period, not the full list of available root cause options.
            </ReportTabHint>
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
          </div>
        )}

        {activeTab === 'By Detection Stage' && (
          <div className="page-stack">
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
          </div>
        )}

        {activeTab === 'Root Cause Area' && (
          <div className="page-stack">
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
          </div>
        )}

        {activeTab === 'Process / Tool' && (
          <div className="page-stack">
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
          </div>
        )}

        {activeTab === 'Expiry Issues' && (
          <div className="space-y-3">
            <SectionCard title="Defect Cases — Expiry Issues" subtitle="Defects in the selected period where printed expiry differs from expected retort expiry.">
              <ReportTable
                exportConfig={tableExportConfig('Defect Cases — Expiry Issues', 'expiry-defect-cases')}
                columns={[
                  { key: 'defect_code', label: 'Defect' },
                  { key: 'product_name', label: 'Product' },
                  { key: 'batch_number', label: 'Batch', render: (r) => r.batch_number || r.batch_code || '-', exportValue: (r) => r.batch_number || r.batch_code || '-' },
                  { key: 'correct_expiry_date', label: 'Expected Expiry', render: (r) => formatDate(r.correct_expiry_date || r.expiry_date), exportValue: (r) => formatDate(r.correct_expiry_date || r.expiry_date) },
                  { key: 'printed_expiry_date', label: 'Printed Expiry', render: (r) => formatDate(r.printed_expiry_date), exportValue: (r) => formatDate(r.printed_expiry_date) },
                  { key: 'qty_affected', label: 'Qty Affected' },
                  { key: 'defect_status', label: 'Status', render: (r) => <StatusBadge value={r.defect_status} />, exportValue: (r) => r.defect_status }
                ]}
                rows={sortedExpiryRows}
              />
              {expiryRows.length === 0 && <ReportEmptyState text="No expiry-related defects in the selected period." />}
            </SectionCard>

            <SectionCard
              title="Batch Expiry Audit"
              subtitle="All batches in the database where printed expiry ≠ correct retort-based expiry — full traceability view."
            >
              <div className="list-kpi-grid mb-3 lg:grid-cols-3">
                <KPICard title="Mismatch Batches" value={batchExpiryAuditKpis.mismatch_batches ?? 0} tone="red" highlight={Number(batchExpiryAuditKpis.mismatch_batches) > 0} icon={<Package size={16} />} />
                <KPICard title="With Open Defects" value={batchExpiryAuditKpis.batches_with_open_defects ?? 0} tone="amber" icon={<Layers size={16} />} />
                <KPICard title="Linked Defect Cases" value={batchExpiryAuditKpis.linked_defect_cases ?? 0} tone="blue" icon={<CheckSquare size={16} />} />
              </div>

              <ReportTable
                exportConfig={tableExportConfig('Batch Expiry Audit', 'batch-expiry-audit')}
                columns={[
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
                ]}
                rows={sortedBatchExpiryAuditRows}
              />
              {batchExpiryAuditRows.length === 0 && <ReportEmptyState text="No batch expiry mismatches in the database." />}
            </SectionCard>
          </div>
        )}

        {activeTab === 'Discarded Products' && (
          <div className="space-y-4">
            <ReportTable
              exportConfig={tableExportConfig('Discarded Products', 'discarded-products')}
              columns={[
                { key: 'defect_code', label: 'Defect Code', className: 'w-28' },
                { key: 'product_name', label: 'Product', className: 'w-full md:w-48' },
                { key: 'batch_number', label: 'Batch', className: 'w-28' },
                { key: 'qty_discarded', label: 'Qty Discarded', className: 'w-28' },
                { key: 'estimated_loss', label: 'Estimated Loss', className: 'w-32', render: (r) => money(r.estimated_loss), exportValue: (r) => money(r.estimated_loss) },
                { key: 'loss_status', label: 'Loss Status', className: 'w-36', render: (r) => <StatusBadge value={r.loss_status || r.status} />, exportValue: (r) => r.loss_status || r.status }
              ]}
              rows={sortedDiscardedRows}
            />
            {discardedRows.length === 0 && <ReportEmptyState />}
          </div>
        )}

        {activeTab === 'By Product' && (
          <div className="space-y-4">
            <ReportTabHint>Product-level defect and loss summary.</ReportTabHint>
            <ReportTable
              exportConfig={tableExportConfig('By Product', 'by-product')}
              columns={[
                { key: 'product_name', label: 'Product', className: 'w-full md:w-48' },
                { key: 'total_defects', label: 'Defects', className: 'w-20' },
                { key: 'loss_at_risk', label: 'Loss at Risk', className: 'w-32', render: (r) => money(r.loss_at_risk), exportValue: (r) => money(r.loss_at_risk) },
                { key: 'pending_loss', label: 'Pending Loss', className: 'w-32', render: (r) => money(r.pending_loss), exportValue: (r) => money(r.pending_loss) },
                { key: 'confirmed_loss', label: 'Confirmed Loss', className: 'w-32', render: (r) => money(r.confirmed_loss), exportValue: (r) => money(r.confirmed_loss) },
                { key: 'most_common_defect', label: 'Most Common Defect', className: 'w-1/3' }
              ]}
              rows={sortedByProductRows}
            />
            {byProductRows.length === 0 && <ReportEmptyState />}
          </div>
        )}

        {activeTab === 'By Batch' && (
          <div className="space-y-4">
            <ReportTabHint>Batch-level traceability and quality summary.</ReportTabHint>
            <ReportTable
              exportConfig={tableExportConfig('By Batch', 'by-batch')}
              columns={[
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
              ]}
              rows={sortedByBatchRows}
            />
            {byBatchRows.length === 0 && <ReportEmptyState />}
          </div>
        )}
      </div>
    </div>
  )
}
