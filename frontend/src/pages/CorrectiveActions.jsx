import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AlertTriangle, ClipboardList, Clock, Layers, Search } from 'lucide-react'
import api from '../api/client'
import CorrectiveActionRow, { getActionPriorityScore } from '../components/CorrectiveActionRow'
import KPICard from '../components/KPICard'
import Button from '../components/Button'
import PageHeader from '../components/PageHeader'
import EmptyState from '../components/EmptyState'
import LoadingState from '../components/LoadingState'
import RejectActionModal from '../components/RejectActionModal'
import ListPagination from '../components/ListPagination'
import { isManager } from '../utils/roleAccess'
import { paginateItems } from '../utils/pagination'
import { isActionOverdue } from '../utils/dueDate'
import ListDateFilter from '../components/ListDateFilter'
import ListCsvExport from '../components/ListCsvExport'
import { formatCaStatusLabel } from '../utils/caStatusLabel'
import {
  CA_DUE_DATE_OPTIONS,
  getDateFilterLabel,
  matchesCaDueFilter
} from '../utils/dateFilters'
import {
  formatAttentionPeriodLabel,
  matchesAttentionCreatedPeriod,
  parseAttentionPeriod
} from '../utils/attentionNavigation'

function matchesActionContext(action, { search, priorityFilter, typeFilter, assigneeFilter, createdPeriod, batchFilter }) {
  const term = search.toLowerCase()
  const matchesSearch = !term || [action.code, action.defectCode, action.task, action.productName, action.batchNumber, action.defectType, action.assignedToName]
    .some((value) => String(value || '').toLowerCase().includes(term))

  const matchesPriority =
    priorityFilter === 'all' ||
    String(action.priority || '').toLowerCase() === priorityFilter

  const matchesType =
    typeFilter === 'all' ||
    String(action.type || '').toLowerCase() === typeFilter

  const matchesAssignee =
    assigneeFilter === 'all' ||
    String(action.assignedTo) === assigneeFilter ||
    action.assignedToName === assigneeFilter

  const matchesCreatedPeriod = matchesAttentionCreatedPeriod(action.createdAt, createdPeriod)

  const matchesBatch =
    !batchFilter?.id ||
    String(action.batchId) === String(batchFilter.id)

  return matchesSearch && matchesPriority && matchesType && matchesAssignee && matchesCreatedPeriod && matchesBatch
}

function titleCase(value) {
  if (!value) return '-'
  return String(value).replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatDate(value) {
  if (!value) return '-'
  return String(value).split('T')[0]
}

const CA_EXPORT_COLUMNS = [
  { key: 'code', label: 'Action Code' },
  { key: 'defectCode', label: 'Related Defect' },
  { key: 'productName', label: 'Product' },
  { key: 'batchNumber', label: 'Batch' },
  { key: 'task', label: 'Task' },
  { key: 'type', label: 'Action Type', exportValue: (row) => titleCase(row.type) },
  { key: 'assignedToName', label: 'Assigned To' },
  { key: 'priority', label: 'CA Priority', exportValue: (row) => titleCase(row.priority) },
  { key: 'dueDate', label: 'CA Due Date' },
  { key: 'status', label: 'Status', exportValue: (row) => formatCaStatusLabel(row.status) },
  { key: 'evidenceRequired', label: 'Evidence Required', exportValue: (row) => (row.evidenceRequired ? 'Yes' : 'No') },
  { key: 'startedDate', label: 'Started Date' },
  { key: 'completedDate', label: 'Completed Date' },
  { key: 'verifiedDate', label: 'Verified Date' }
]

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'pending_review', label: 'Submitted — Pending Review' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'verified', label: 'Verified' },
  { value: 'rejected', label: 'Rejected' }
]

const PRIORITY_FILTER_OPTIONS = [
  { value: 'all', label: 'All CA Priority' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' }
]

const TYPE_FILTER_OPTIONS = [
  { value: 'all', label: 'All Types' },
  { value: 'product_handling', label: 'Product Handling' },
  { value: 'machine_process_check', label: 'Machine Check' }
]

function CompactFilterSelect({ label, value, options, onChange, wide = false }) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={wide ? 'list-toolbar-select-wide' : 'list-toolbar-select'}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>{option.label}</option>
      ))}
    </select>
  )
}

function normalizeAction(row) {
  return {
    ...row,
    id: row.id,
    code: row.action_code,
    defectId: row.defect_id,
    defectCode: row.defect_code,
    type: row.action_type,
    task: row.task,
    assignedToName: row.assigned_to_name,
    assignedTo: row.assigned_to,
    dueDate: formatDate(row.due_date),
    priority: row.priority,
    status: row.ca_status,
    evidenceRequired: row.evidence_required,
    productName: row.product_name,
    batchId: row.batch_id,
    batchNumber: row.batch_number,
    defectType: row.defect_type,
    investigationFinding: row.investigation_finding,
    actionTaken: row.action_taken,
    completionNotes: row.completion_notes,
    relatedToolChecked: row.related_tool_machine_checked,
    rootCauseStatus: row.root_cause_status,
    confirmedRootCause: row.confirmed_root_cause,
    rejectionReason: row.rejection_reason,
    rejectedByName: row.rejected_by_name,
    rejectedDate: formatDate(row.rejected_date),
    startedDate: formatDate(row.started_date),
    completedDate: formatDate(row.completed_date),
    verifiedDate: formatDate(row.verified_date),
    createdAt: row.created_at
  }
}

export default function CorrectiveActions({ user }) {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [actions, setActions] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [assigneeFilter, setAssigneeFilter] = useState('all')
  const [caDueFilter, setCaDueFilter] = useState('all')
  const [createdPeriod, setCreatedPeriod] = useState(null)
  const [batchFilter, setBatchFilter] = useState(null)
  const [page, setPage] = useState(1)
  const [rejectActionId, setRejectActionId] = useState(null)

  const currentUser = user
  const managerView = isManager(user)
  const managerId = isManager(user) ? user.id : null

  async function load() {
    setLoading(true)
    try {
      const query = {}
      if (!managerView && currentUser?.id) {
        query.assigned_to = currentUser.id
      }

      const batchId = params.get('batchId')
      if (batchId) {
        query.batch_id = batchId
      }

      const res = await api.get('/corrective-actions', { params: query })
      setActions((res.data.data || []).map(normalizeAction))
    } catch (error) {
      console.error(error)
      alert('Could not load corrective actions.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (managerView || currentUser?.id) {
      load()
    }
  }, [user?.id, params.get('batchId')])

  useEffect(() => {
    const legacyViewId = params.get('view')
    if (legacyViewId) {
      navigate(`/corrective-actions/${legacyViewId}`, { replace: true })
    }
  }, [params, navigate])

  useEffect(() => {
    const caDue = params.get('caDue')
    const legacyFilter = params.get('filter')
    const statusParam = params.get('status')
    const attentionPeriod = parseAttentionPeriod(params)

    if (statusParam === 'rejected' || statusParam === 'assigned' || statusParam === 'in_progress' || statusParam === 'verified') {
      setStatusFilter(statusParam)
      setCaDueFilter('all')
    } else if (caDue || legacyFilter === 'overdue') {
      setCaDueFilter(caDue || 'overdue')
      setStatusFilter('all')
    }

    setCreatedPeriod(attentionPeriod)

    const batchId = params.get('batchId')
    const batchCode = params.get('batchCode')
    setBatchFilter(batchId ? { id: batchId, code: batchCode || null } : null)
  }, [params])

  const contextFilters = useMemo(() => ({
    search,
    priorityFilter,
    typeFilter,
    assigneeFilter,
    createdPeriod,
    batchFilter
  }), [search, priorityFilter, typeFilter, assigneeFilter, createdPeriod, batchFilter])

  const contextActions = useMemo(
    () => actions.filter((action) => matchesActionContext(action, contextFilters)),
    [actions, contextFilters]
  )

  const filtered = useMemo(() => contextActions.filter((action) => {
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'pending_review' && action.status === 'completed') ||
      (statusFilter === 'overdue' && isActionOverdue(action.dueDate, action.status)) ||
      action.status === statusFilter

    const matchesCaDue = matchesCaDueFilter(action.dueDate, action.status, caDueFilter)

    return matchesStatus && matchesCaDue
  }), [contextActions, statusFilter, caDueFilter])

  const periodLabel = useMemo(() => formatAttentionPeriodLabel(createdPeriod), [createdPeriod])

  function syncCaDueParam(nextCaDue) {
    const next = new URLSearchParams(params)
    if (nextCaDue && nextCaDue !== 'all') {
      next.set('caDue', nextCaDue)
    } else {
      next.delete('caDue')
    }
    next.delete('filter')
    setParams(next, { replace: true })
  }

  function applyOverdueKpi() {
    setStatusFilter('all')
    setCaDueFilter('overdue')
    syncCaDueParam('overdue')
  }

  function applyStatusKpi(nextStatus) {
    setStatusFilter(nextStatus)
    setCaDueFilter('all')
    syncCaDueParam(null)
  }

  function applyTotalKpi() {
    setStatusFilter('all')
    setCaDueFilter('all')
    syncCaDueParam(null)
  }

  const assigneeOptions = useMemo(() => {
    const seen = new Map()
    actions.forEach((action) => {
      if (!action.assignedToName) return
      seen.set(String(action.assignedTo || action.assignedToName), action.assignedToName)
    })
    return [
      { value: 'all', label: 'All Assignees' },
      ...Array.from(seen.entries()).map(([value, label]) => ({ value, label }))
    ]
  }, [actions])

  const hasActiveFilters = statusFilter !== 'all'
    || priorityFilter !== 'all'
    || typeFilter !== 'all'
    || assigneeFilter !== 'all'
    || caDueFilter !== 'all'
    || Boolean(createdPeriod)
    || Boolean(batchFilter?.id)
    || search.trim().length > 0

  const batchFilterLabel = useMemo(() => {
    if (!batchFilter?.id) return null
    if (batchFilter.code) return batchFilter.code
    const match = actions.find((action) => String(action.batchId) === String(batchFilter.id))
    return match?.batchNumber || `batch #${batchFilter.id}`
  }, [batchFilter, actions])

  function clearBatchFilter() {
    setBatchFilter(null)
    setParams((current) => {
      const next = new URLSearchParams(current)
      next.delete('batchId')
      next.delete('batchCode')
      return next
    }, { replace: true })
  }

  function clearFilters() {
    setSearch('')
    setStatusFilter('all')
    setPriorityFilter('all')
    setTypeFilter('all')
    setAssigneeFilter('all')
    setCaDueFilter('all')
    setCreatedPeriod(null)
    setBatchFilter(null)
    setParams({}, { replace: true })
  }

  const caDueLabel = useMemo(() => getDateFilterLabel(caDueFilter), [caDueFilter])

  const exportPeriodLabel = useMemo(() => {
    const parts = []
    if (periodLabel) parts.push(periodLabel)
    if (caDueFilter !== 'all') parts.push(getDateFilterLabel(caDueFilter))
    if (statusFilter === 'pending_review') parts.push('Submitted — Pending Review')
    else if (statusFilter !== 'all') parts.push(formatCaStatusLabel(statusFilter))
    return parts.join(' · ') || 'All Time'
  }, [periodLabel, caDueFilter, statusFilter])

  const sortedFiltered = useMemo(() => (
    [...filtered].sort((a, b) => {
      const scoreDiff = getActionPriorityScore(b, managerView) - getActionPriorityScore(a, managerView)
      if (scoreDiff !== 0) return scoreDiff
      return String(a.dueDate || '').localeCompare(String(b.dueDate || ''))
    })
  ), [filtered, managerView])

  useEffect(() => {
    setPage(1)
  }, [search, statusFilter, priorityFilter, typeFilter, assigneeFilter, caDueFilter, createdPeriod, batchFilter?.id])

  const paged = useMemo(() => paginateItems(sortedFiltered, page), [sortedFiltered, page])

  const kpis = useMemo(() => ({
    total: contextActions.length,
    pendingReview: contextActions.filter((a) => a.status === 'completed').length,
    assigned: contextActions.filter((a) => a.status === 'assigned').length,
    inProgress: contextActions.filter((a) => a.status === 'in_progress').length,
    verified: contextActions.filter((a) => a.status === 'verified').length,
    overdue: contextActions.filter((a) => isActionOverdue(a.dueDate, a.status)).length
  }), [contextActions])

  const overdueKpiActive = caDueFilter === 'overdue' && statusFilter === 'all'
  const totalKpiActive = statusFilter === 'all' && caDueFilter === 'all'

  async function verifyAction(actionId) {
    try {
      await api.patch(`/corrective-actions/${actionId}/verify`, { verified_by: managerId })
      await load()
    } catch (error) {
      alert(error.response?.data?.message || 'Could not verify action.')
    }
  }

  function openAction(actionId) {
    navigate(`/corrective-actions/${actionId}`)
  }

  return (
    <div className="list-page">
      <PageHeader
        title={managerView ? 'Corrective Actions' : 'My Actions'}
        subtitle={managerView
          ? 'Overdue and pending review items are surfaced first. Verify or reject completed work directly from the list.'
          : 'Your assigned corrective work — overdue items appear at the top.'}
        eyebrow={managerView ? 'Quality Control' : 'Worker Portal'}
      />

      <div className={`grid gap-2 ${managerView ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2'}`}>
        <KPICard
          density="emphasis"
          variant="critical"
          title="Overdue"
          value={kpis.overdue}
          subtitle={kpis.overdue > 0 ? 'Requires attention' : undefined}
          zeroHint="Everything is on track"
          icon={<AlertTriangle size={18} />}
          tone="red"
          highlight={kpis.overdue > 0}
          active={overdueKpiActive}
          onClick={applyOverdueKpi}
        />
        {managerView ? (
          <KPICard
            density="emphasis"
            variant="warning"
            title="Submitted — Pending Review"
            value={kpis.pendingReview}
            subtitle={kpis.pendingReview > 0 ? 'Awaiting verify or reject' : undefined}
            zeroHint="Nothing waiting for review"
            icon={<Clock size={18} />}
            tone="amber"
            highlight={kpis.pendingReview > 0}
            active={statusFilter === 'pending_review' && caDueFilter === 'all'}
            onClick={() => applyStatusKpi('pending_review')}
          />
        ) : (
          <KPICard
            variant="secondary"
            title="In Progress"
            value={kpis.inProgress}
            active={statusFilter === 'in_progress' && caDueFilter === 'all'}
            onClick={() => applyStatusKpi('in_progress')}
          />
        )}
      </div>

      <div className={`grid grid-cols-2 gap-2 ${managerView ? 'sm:grid-cols-4' : 'sm:grid-cols-3'}`}>
        <KPICard
          variant="secondary"
          title={managerView ? 'Total Actions' : 'My Actions'}
          value={kpis.total}
          subtitle={periodLabel ? `In ${periodLabel}` : 'All records'}
          active={totalKpiActive}
          onClick={applyTotalKpi}
        />
        {managerView && (
          <KPICard
            variant="secondary"
            title="Assigned"
            value={kpis.assigned}
            subtitle="Not yet started"
            active={statusFilter === 'assigned' && caDueFilter === 'all'}
            onClick={() => applyStatusKpi('assigned')}
          />
        )}
        {managerView && (
          <KPICard
            variant="secondary"
            title="In Progress"
            value={kpis.inProgress}
            subtitle="Being worked on"
            active={statusFilter === 'in_progress' && caDueFilter === 'all'}
            onClick={() => applyStatusKpi('in_progress')}
          />
        )}
        <KPICard
          variant="secondary"
          title="Verified"
          value={kpis.verified}
          subtitle="Closed successfully"
          active={statusFilter === 'verified' && caDueFilter === 'all'}
          onClick={() => applyStatusKpi('verified')}
        />
      </div>

      <div className="list-panel">
        {batchFilter?.id && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-brand-border/60 bg-brand-50 px-3 py-2 text-[0.6875rem] text-brand-700">
            <span>
              Showing corrective actions for batch:{' '}
              <strong className="text-brand-ink">{batchFilterLabel}</strong>
              {' '}({filtered.length} action{filtered.length === 1 ? '' : 's'})
            </span>
            <button
              type="button"
              onClick={clearBatchFilter}
              className="font-semibold text-brand-600 hover:text-brand-700 hover:underline"
            >
              Clear filter
            </button>
          </div>
        )}
        {periodLabel && (
          <p className="border-b border-brand-border/60 px-3 py-2 text-[0.6875rem] text-brand-muted">
            Filtered by <span className="font-semibold text-brand-ink">{periodLabel}</span>
            {caDueFilter !== 'all' && (
              <> · CA Due: <span className="font-semibold text-brand-ink">{caDueLabel}</span></>
            )}
          </p>
        )}
        <div className="list-toolbar">
          <div className="list-toolbar-search">
            <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-brand-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search CA, defect, task, worker..."
              className="list-toolbar-search-input"
            />
          </div>
          <CompactFilterSelect
            label="Status"
            value={statusFilter}
            options={STATUS_FILTER_OPTIONS}
            onChange={setStatusFilter}
          />
          <CompactFilterSelect
            label="CA Priority"
            value={priorityFilter}
            options={PRIORITY_FILTER_OPTIONS}
            onChange={setPriorityFilter}
          />
          <CompactFilterSelect
            label="Type"
            value={typeFilter}
            options={TYPE_FILTER_OPTIONS}
            onChange={setTypeFilter}
          />
          {managerView && (
            <CompactFilterSelect
              label="Assigned To"
              value={assigneeFilter}
              options={assigneeOptions}
              onChange={setAssigneeFilter}
              wide
            />
          )}
          <CompactFilterSelect
            label="CA Due"
            value={caDueFilter}
            options={CA_DUE_DATE_OPTIONS}
            onChange={setCaDueFilter}
            wide
          />
          <ListCsvExport
            title="Corrective Actions"
            filename={`qdts-corrective-actions-${exportPeriodLabel.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.csv`}
            periodLabel={exportPeriodLabel}
            columns={CA_EXPORT_COLUMNS}
            rows={sortedFiltered}
          />
          {hasActiveFilters && (
            <Button color="slate" variant="ghost" size="sm" className="list-action-btn" onClick={clearFilters}>
              Clear
            </Button>
          )}
        </div>

        <div className="list-panel-body">
          {loading ? (
            <LoadingState label="Loading actions..." />
          ) : filtered.length === 0 ? (
            hasActiveFilters ? (
              <EmptyState
                title="No actions match this filter"
                description="Try clearing filters or adjusting your search."
              />
            ) : managerView ? (
              <EmptyState
                title="No corrective actions yet"
                description="Actions appear here after you assign work from a defect record."
                actionLabel="Go to Defect Records"
                onAction={() => navigate('/defects')}
                icon={ClipboardList}
              />
            ) : (
              <EmptyState
                title="No actions assigned yet"
                description="When your manager assigns corrective work from a defect, it will show up here."
                icon={ClipboardList}
              />
            )
          ) : (
            <div className="compact-list-stack">
              {paged.items.map((action) => (
                <CorrectiveActionRow
                  key={action.id}
                  action={action}
                  managerView={managerView}
                  onOpen={() => openAction(action.id)}
                  onVerify={() => verifyAction(action.id)}
                  onReject={() => setRejectActionId(action.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <ListPagination
        page={paged.page}
        totalPages={paged.totalPages}
        totalItems={paged.total}
        pageSize={paged.pageSize}
        onPageChange={setPage}
      />

      {rejectActionId && (
        <RejectActionModal
          actionId={rejectActionId}
          managerId={managerId}
          onClose={() => setRejectActionId(null)}
          onRejected={load}
        />
      )}
    </div>
  )
}
