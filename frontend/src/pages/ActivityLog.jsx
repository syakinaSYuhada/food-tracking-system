import { Fragment, useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import api from '../api/client'
import PageHeader from '../components/PageHeader'
import ListPagination from '../components/ListPagination'
import LoadingState from '../components/LoadingState'
import EmptyState from '../components/EmptyState'
import ActivityTimelineRow from '../components/ActivityTimelineRow'
import ListDateFilter from '../components/ListDateFilter'
import TableExportActions from '../components/TableExportActions'
import { downloadReportExcel, downloadReportPdf } from '../utils/reportExport'
import {
  ACTIVITY_LOG_DATE_OPTIONS,
  buildActivityLogQueryParams,
  fetchAllActivityLogs,
  getDateFilterLabel
} from '../utils/dateFilters'

function titleCase(value) {
  if (!value) return '-'
  return String(value).replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function getDayKey(value) {
  if (!value) return ''
  return String(value).split('T')[0]
}

function formatDateGroupLabel(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return getDayKey(value)

  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const day = startOfDay(date)
  const today = startOfDay(new Date())
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (day.getTime() === today.getTime()) return 'Today'
  if (day.getTime() === yesterday.getTime()) return 'Yesterday'

  return date.toLocaleDateString('en-MY', { year: 'numeric', month: 'long', day: 'numeric' })
}

function formatDateTime(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value).split('T')[0]
  return date.toLocaleString('en-MY', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function buildLogDetails(log) {
  const parts = []
  if (log.entity_type) {
    parts.push(`${titleCase(log.entity_type)}${log.entity_id ? ` #${log.entity_id}` : ''}`)
  }
  const change = [log.old_value, log.new_value].filter(Boolean).join(' → ')
  if (change) parts.push(change)
  return parts.join(' · ') || '-'
}

const ACTIVITY_EXPORT_COLUMNS = [
  { key: 'created_at', label: 'Date/Time', exportValue: (row) => formatDateTime(row.created_at) },
  { key: 'user_name', label: 'User', exportValue: (row) => row.user_name || 'System' },
  { key: 'user_role', label: 'Role', exportValue: (row) => titleCase(row.user_role) },
  { key: 'action_type', label: 'Action', exportValue: (row) => titleCase(row.action_type) },
  {
    key: 'entity_type',
    label: 'Entity',
    exportValue: (row) => `${titleCase(row.entity_type)}${row.entity_id ? ` #${row.entity_id}` : ''}`
  },
  { key: 'description', label: 'Description', exportValue: (row) => row.description || titleCase(row.action_type) },
  { key: 'details', label: 'Details', exportValue: (row) => buildLogDetails(row) }
]

export default function ActivityLog() {
  const [logs, setLogs] = useState([])
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 })
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [search, setSearch] = useState('')
  const [entityFilter, setEntityFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState('this_month')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [page, setPage] = useState(1)

  const dateFilterLabel = useMemo(
    () => getDateFilterLabel(dateFilter, { customFrom, customTo }),
    [dateFilter, customFrom, customTo]
  )

  const hasActiveFilters = search.trim().length > 0
    || entityFilter !== 'all'
    || dateFilter !== 'all'

  async function loadLogs(nextPage = page) {
    setLoading(true)
    try {
      const params = buildActivityLogQueryParams({
        period: dateFilter,
        customFrom,
        customTo,
        entityFilter,
        page: nextPage,
        limit: 15
      })

      if (search.trim()) {
        params.search = search.trim()
      }

      const res = await api.get('/activity-logs', { params })
      const payload = res.data.data || {}
      setLogs(payload.items || [])
      setPagination(payload.pagination || { page: nextPage, limit: 15, total: 0, totalPages: 1 })
    } catch (error) {
      console.error(error)
      setLogs([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLogs(page)
  }, [page, entityFilter, dateFilter, customFrom, customTo, search])

  useEffect(() => {
    setPage(1)
  }, [entityFilter, dateFilter, customFrom, customTo, search])

  async function handleExportRows() {
    setExporting(true)
    try {
      const params = buildActivityLogQueryParams({
        period: dateFilter,
        customFrom,
        customTo,
        entityFilter,
        page: 1,
        limit: 100
      })

      if (search.trim()) {
        params.search = search.trim()
      }

      const rows = await fetchAllActivityLogs(api, params)
      return rows
    } finally {
      setExporting(false)
    }
  }

  async function exportCsv() {
    const rows = await handleExportRows()
    if (!rows.length) {
      alert('No data to export.')
      return
    }

    downloadReportExcel({
      title: 'Activity Log Report',
      periodLabel: dateFilterLabel,
      filename: `qdts-activity-log-${dateFilterLabel.toLowerCase().replace(/\s+/g, '-')}.csv`,
      sections: [{
        heading: 'Activity Log Report',
        columns: ACTIVITY_EXPORT_COLUMNS,
        rows
      }]
    })
  }

  async function exportPdf() {
    try {
      const rows = await handleExportRows()
      downloadReportPdf({
        title: 'Activity Log Report',
        periodLabel: dateFilterLabel,
        sections: [{
          heading: 'Activity Log Report',
          columns: ACTIVITY_EXPORT_COLUMNS,
          rows
        }]
      })
    } catch (error) {
      console.error('Activity log PDF export failed:', error)
      alert('PDF export failed. Please try again or use Export CSV instead.')
    }
  }

  return (
    <div className="list-page">
      <PageHeader
        title="Activity Log"
        subtitle="Audit trail of system actions from the database."
        eyebrow="Compliance"
      />

      <div className="list-panel">
        <div className="list-toolbar">
          <div className="list-toolbar-search">
            <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-brand-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search description, user, action..."
              className="list-toolbar-search-input"
            />
          </div>
          <select
            aria-label="Entity"
            value={entityFilter}
            onChange={(e) => setEntityFilter(e.target.value)}
            className="list-toolbar-select-wide"
          >
            <option value="all">All Entities</option>
            <option value="defect">Defects</option>
            <option value="corrective_action">Corrective Actions</option>
            <option value="batch">Batches</option>
          </select>
          <TableExportActions
            title="Activity Log Report"
            heading="Activity Log Report"
            periodLabel={dateFilterLabel}
            filename={`qdts-activity-log-${dateFilterLabel.toLowerCase().replace(/\s+/g, '-')}.csv`}
            columns={ACTIVITY_EXPORT_COLUMNS}
            size="sm"
            onCsvClick={exportCsv}
            onPdfClick={exportPdf}
            exporting={exporting}
          />
        </div>

        <div className="compact-filter-panel border-t border-brand-border/60 px-3 py-2">
          <ListDateFilter
            label="Date Range"
            value={dateFilter}
            options={ACTIVITY_LOG_DATE_OPTIONS}
            onChange={setDateFilter}
            customFrom={customFrom}
            customTo={customTo}
            onCustomFromChange={setCustomFrom}
            onCustomToChange={setCustomTo}
          />
        </div>

        <div className="list-panel-body">
          {loading ? (
            <LoadingState label="Loading activity log..." />
          ) : logs.length === 0 ? (
            hasActiveFilters ? (
              <EmptyState
                title="No activity matches this filter"
                description="Try clearing the search, entity, or date filters."
              />
            ) : (
              <EmptyState
                title="No activity records"
                description="Actions such as defect reports, assignments, and verifications will appear here."
              />
            )
          ) : (
            <div className="compact-list-stack">
              {logs.map((log, index) => {
                const dayKey = getDayKey(log.created_at)
                const previousDayKey = index > 0 ? getDayKey(logs[index - 1].created_at) : null
                return (
                  <Fragment key={log.id}>
                    {dayKey !== previousDayKey && (
                      <div className="px-1 pt-2 text-[0.6875rem] font-semibold uppercase tracking-wide text-brand-muted first:pt-0">
                        {formatDateGroupLabel(log.created_at)}
                      </div>
                    )}
                    <ActivityTimelineRow log={log} />
                  </Fragment>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <ListPagination
        page={pagination.page}
        totalPages={pagination.totalPages}
        totalItems={pagination.total}
        pageSize={pagination.limit}
        onPageChange={setPage}
      />
    </div>
  )
}
