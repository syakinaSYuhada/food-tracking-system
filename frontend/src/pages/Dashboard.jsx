import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, CheckSquare, ClipboardList, Clock, Layers, Package, Plus, TrendingDown, AlertTriangle } from 'lucide-react'
import api from '../api/client'
import StatusBadge from '../components/StatusBadge'
import Button from '../components/Button'
import ListActionButton from '../components/ListActionButton'
import KPICard from '../components/KPICard'
import PageHeader from '../components/PageHeader'
import EmptyState from '../components/EmptyState'
import LoadingState from '../components/LoadingState'
import ChartCard from '../components/ChartCard'
import SectionCard from '../components/SectionCard'
import AttentionCenter from '../components/AttentionCenter'
import AnalyticRow from '../components/AnalyticRow'
import DefectsByTypeChart from '../components/charts/DefectsByTypeChart'
import DefectTrendChart from '../components/charts/DefectTrendChart'
import ActionsByStatusChart from '../components/charts/ActionsByStatusChart'
import ReportPeriodFilter, { buildReportPeriodParams, createdInReportPeriod, currentMonthValue } from '../components/ReportPeriodFilter'
import {
  formatUrgentReviewCountSummary,
  hasUrgentReviewAttention,
  summarizeUrgentReviewAttention
} from '../utils/defectReviewDue'
import { isManager } from '../utils/roleAccess'
import { isActionOverdue, isActionDueThisWeek } from '../utils/dueDate'
import { hasExpiryMismatch } from '../utils/expiry'
import { buildWorkerAttentionItems, summarizeWorkerAttention } from '../utils/workerAttention'
import { formatCaStatusLabel } from '../utils/caStatusLabel'
import {
  buildAttentionPath,
  buildAttentionPrimaryPath,
  getAttentionActionLabel
} from '../utils/attentionNavigation'
import { defectStatusHint } from '../utils/defectStatusHint'

const PIE_COLORS = ['#1F8F73', '#146356', '#C2410C', '#F59E0B', '#7EC6AE']

function titleCase(value) {
  if (!value) return '-'
  return String(value).replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function money(value) {
  return `RM ${Number(value || 0).toFixed(2)}`
}

function formatDate(value) {
  if (!value) return '-'
  return String(value).split('T')[0]
}

function actionButton(status, navigate, defectId) {
  const normalized = String(status || '').toLowerCase()

  const buttonMap = {
    new: { label: 'Review', intent: 'review', path: '/corrective-actions' },
    under_review: { label: 'Review', intent: 'review', path: '/corrective-actions' },
    action_assigned: { label: 'View', intent: 'view', path: '/corrective-actions' },
    in_progress: { label: 'View', intent: 'view', path: '/defects' },
    pending_verification: { label: 'View', intent: 'view', path: '/defects' },
    ready_verification: { label: 'View', intent: 'view', path: '/defects' },
    closed: { label: 'View', intent: 'view', path: '/defects' }
  }

  const config = buttonMap[normalized] || { label: 'View', intent: 'view', path: '/defects' }
  const path = defectId ? `/defects/${defectId}` : config.path

  return (
    <ListActionButton intent={config.intent} label={config.label} onClick={() => navigate(path)} />
  )
}

export default function Dashboard({ user }) {
  const navigate = useNavigate()
  const managerView = isManager(user)
  const [summary, setSummary] = useState(null)
  const [rootReport, setRootReport] = useState(null)
  const [workerActions, setWorkerActions] = useState([])
  const [workerDefects, setWorkerDefects] = useState([])
  const [managerActions, setManagerActions] = useState([])
  const [managerDefects, setManagerDefects] = useState([])
  const [period, setPeriod] = useState('this_month')
  const [selectedMonth, setSelectedMonth] = useState(currentMonthValue())
  const [initialLoading, setInitialLoading] = useState(true)
  const [isRefetching, setIsRefetching] = useState(false)
  const [loadError, setLoadError] = useState(null)
  const hasLoadedOnceRef = useRef(false)

  useEffect(() => {
    let cancelled = false

    async function loadDashboard() {
      if (hasLoadedOnceRef.current) setIsRefetching(true)
      else setInitialLoading(true)
      setLoadError(null)
      try {
        if (managerView) {
          const summaryParams = buildReportPeriodParams(period, selectedMonth)

          const [summaryRes, rootRes, actionsRes, defectsRes] = await Promise.all([
            api.get('/reports/dashboard/summary', { params: summaryParams }),
            api.get('/reports/root-causes', { params: summaryParams }),
            api.get('/corrective-actions'),
            api.get('/defects')
          ])

          if (cancelled) return

          const s = summaryRes?.data?.data ?? summaryRes?.data ?? {}
          const r = rootRes?.data?.data ?? rootRes?.data ?? {}
          setSummary(s)
          setRootReport(r)
          setManagerActions(actionsRes.data.data || [])
          setManagerDefects(defectsRes.data.data || [])
          setWorkerActions([])
        } else {
          const [actionsRes, defectsRes] = await Promise.all([
            user?.id
              ? api.get('/corrective-actions', { params: { assigned_to: user.id } })
              : Promise.resolve({ data: { data: [] } }),
            api.get('/defects')
          ])

          if (cancelled) return

          setWorkerActions(actionsRes.data.data || [])
          setWorkerDefects(defectsRes.data.data || [])
          setSummary(null)
          setRootReport(null)
        }
      } catch (error) {
        console.error(error)
        if (!cancelled) {
          setLoadError(hasLoadedOnceRef.current
            ? 'Could not refresh dashboard data. Showing the last loaded data.'
            : 'Could not load dashboard data.')
        }
      } finally {
        if (!cancelled) {
          setInitialLoading(false)
          setIsRefetching(false)
          hasLoadedOnceRef.current = true
        }
      }
    }

    loadDashboard()
    return () => { cancelled = true }
  }, [user, managerView, period, selectedMonth])

  const periodActions = useMemo(
    () => managerActions.filter((action) => createdInReportPeriod(action.created_at, period, selectedMonth)),
    [managerActions, period, selectedMonth]
  )

  const periodDefects = useMemo(
    () => managerDefects.filter((defect) => createdInReportPeriod(defect.created_at, period, selectedMonth)),
    [managerDefects, period, selectedMonth]
  )

  const pendingReviewActions = useMemo(
    () => periodActions.filter((action) => action.ca_status === 'completed'),
    [periodActions]
  )

  const reviewAttentionSummary = useMemo(
    () => summarizeUrgentReviewAttention(periodDefects),
    [periodDefects]
  )

  const data = useMemo(() => {
    if (!summary) return null

    const kpis = summary.kpis || {}

    const defectsByType = (summary.charts?.defects_by_type || []).map((item) => ({
      name: item.defect_type,
      value: Number(item.count)
    }))

    const caStatus = (summary.charts?.actions_by_status || []).map((item, index) => ({
      name: formatCaStatusLabel(item.ca_status || item.status),
      value: Number(item.count),
      color: PIE_COLORS[index % PIE_COLORS.length]
    }))

    const trendData = (summary.charts?.trend || []).map((t) => ({
      name: t.label || t.month,
      value: Number(t.value || t.defects || 0)
    }))

    const rootCauses = [...(rootReport?.breakdown || [])]
      .sort((a, b) => Number(b.total || 0) - Number(a.total || 0))
      .slice(0, 5)
      .map((item) => ({
        name: item.root_cause,
        cases: Number(item.total ?? item.count ?? 0),
        confirmed: Number(item.confirmed ?? 0),
        suspected: Number(item.suspected ?? 0),
        pending: Number(item.pending_investigation ?? 0)
      }))

    return {
      kpis,
      defectsByType,
      caStatus,
      trendData,
      rootCauses,
      latest: summary.latest_defects || []
    }
  }, [summary, rootReport])

  if (initialLoading) return <LoadingState label="Loading dashboard..." />

  if (!managerView) {
    const overdueActions = workerActions.filter((action) =>
      isActionOverdue(action.due_date, action.ca_status)
    )
    const overdueCount = overdueActions.length
    const dueThisWeekCount = workerActions.filter((action) =>
      isActionDueThisWeek(action.due_date ?? action.dueDate, action.ca_status ?? action.status)
    ).length

    const reportedDefects = workerDefects.filter(
      (defect) => Number(defect.created_by) === Number(user?.id)
    )
    const awaitingManager = reportedDefects.filter((defect) =>
      ['new', 'under_review'].includes(String(defect.defect_status || '').toLowerCase())
    ).length
    const workerAttention = summarizeWorkerAttention(workerActions, workerDefects, user?.id)
    const workerAttentionItems = buildWorkerAttentionItems(workerAttention, navigate)

    const assignedDefectIds = new Set(
      workerActions.map((action) => Number(action.defect_id))
    )

    return (
      <div className="page-stack mx-auto w-full max-w-[1280px]">
        <PageHeader
          title="My Dashboard"
          subtitle="Track defects you reported and corrective actions assigned to you."
        >
          <Button color="blue" onClick={() => navigate('/defects?report=1')}>
            <Plus size={16} className="mr-1 inline" />
            Report Defect
          </Button>
        </PageHeader>

        {loadError && (
          <div className="mb-4 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <span>{loadError}</span>
            <button type="button" onClick={() => setLoadError(null)} className="font-bold">
              ×
            </button>
          </div>
        )}

        <div className="list-kpi-grid lg:grid-cols-5">
          <KPICard density="command" title="My Reports" value={reportedDefects.length} subtitle="Submitted" icon={<ClipboardList size={18} />} tone="blue" />
          <KPICard density="command" title="Awaiting Manager" value={awaitingManager} subtitle="Reports waiting for manager review" helperText="Your manager will review and assign corrective work." icon={<AlertCircle size={18} />} tone="amber" highlight={awaitingManager > 0} />
          <KPICard density="command" title="Assigned Actions" value={workerActions.length} subtitle="Assigned to you" icon={<CheckSquare size={18} />} tone="purple" />
          <KPICard
            density="command"
            title="Overdue Actions"
            value={overdueCount}
            subtitle="Past due date"
            icon={<AlertTriangle size={18} />}
            tone="red"
            highlight={overdueCount > 0}
            onClick={overdueCount > 0 ? () => navigate('/corrective-actions?caDue=overdue') : undefined}
          />
          <KPICard
            density="command"
            title="Due This Week"
            value={dueThisWeekCount}
            subtitle="Due within 7 days"
            icon={<Clock size={18} />}
            tone="amber"
            highlight={dueThisWeekCount > 0}
            onClick={dueThisWeekCount > 0 ? () => navigate('/corrective-actions?caDue=due_this_week') : undefined}
          />
        </div>

        <AttentionCenter
          items={workerAttentionItems}
          action={(
            <Button color="amber" variant="subtle" size="sm" className="list-action-btn" onClick={() => navigate('/corrective-actions')}>
              View Assigned Actions
            </Button>
          )}
        />

        <SectionCard title="My Reported Defects">
          {reportedDefects.length === 0 ? (
            <EmptyState
              title="No reports yet"
              description="Record a problem you found on the floor. Your manager will review it before assigning work."
              actionLabel="Report Defect"
              onAction={() => navigate('/defects?report=1')}
              icon={Plus}
            />
          ) : (
            <div className="compact-list-stack">
              {reportedDefects.map((defect) => {
                const hasAssignedAction = assignedDefectIds.has(Number(defect.id))
                return (
                  <AnalyticRow
                    key={defect.id}
                    accentClass={hasExpiryMismatch(defect) ? 'bg-red-500' : 'bg-brand-500'}
                    title={`${defect.defect_code} — ${defect.defect_type}`}
                    subtitle={`${defect.product_name} · Batch ${defect.batch_number}`}
                    meta={`Reported ${formatDate(defect.created_at)} · ${defectStatusHint(defect.defect_status, hasAssignedAction)}`}
                    badge={(
                      <>
                        <StatusBadge value={defect.defect_status} />
                        {hasExpiryMismatch(defect) && (
                          <span className="badge border-red-200/80 bg-red-50 text-red-700">Expiry mismatch</span>
                        )}
                      </>
                    )}
                    action={(
                      <ListActionButton intent="view" onClick={() => navigate(`/defects/${defect.id}`)} />
                    )}
                  />
                )
              })}
            </div>
          )}
        </SectionCard>

        <SectionCard title="My Work">
          {workerActions.length === 0 ? (
            <EmptyState
              title="No assigned actions"
              description="When your manager assigns corrective work from a defect, it will appear here."
              icon={CheckSquare}
            />
          ) : (
            <div className="compact-list-stack">
              {workerActions.map((action) => {
                const overdue = isActionOverdue(action.due_date, action.ca_status)
                return (
                  <AnalyticRow
                    key={action.id}
                    accentClass={overdue ? 'bg-red-500' : 'bg-indigo-500'}
                    title={action.action_code}
                    subtitle={action.task}
                    meta={`${action.defect_code} · ${action.product_name}${action.due_date ? ` · CA Due Date ${formatDate(action.due_date)}` : ''}`}
                    badge={(
                      <>
                        {overdue && (
                          <span className="badge border-red-200/80 bg-red-50 text-red-700">Action Required</span>
                        )}
                        <StatusBadge kind="ca" value={action.ca_status} audience="worker" />
                      </>
                    )}
                    action={(
                      <ListActionButton intent="open" label="Open" onClick={() => navigate(`/corrective-actions/${action.id}`)} />
                    )}
                  />
                )
              })}
            </div>
          )}
        </SectionCard>
      </div>
    )
  }

  if (!data) return <div className="text-sm text-red-600">Failed to load dashboard.</div>

  const { kpis, defectsByType, caStatus, trendData, rootCauses, latest } = data
  const newReportCount = Number(kpis.new_reports ?? 0)
  const pendingReviewCount = Number(kpis.pending_review_actions ?? 0)
  const overdueActionCount = periodActions.filter((action) =>
    isActionOverdue(action.due_date, action.ca_status)
  ).length

  const attentionItems = [
    overdueActionCount > 0 && {
      id: 'overdue',
      count: overdueActionCount,
      label: `${overdueActionCount} overdue action${overdueActionCount === 1 ? '' : 's'}`,
      onClick: () => navigate(buildAttentionPath('/corrective-actions', period, selectedMonth, { caDue: 'overdue' }))
    },
    Number(kpis.expiry_mismatch_batches) > 0 && {
      id: 'expiry',
      count: Number(kpis.expiry_mismatch_batches),
      label: `${kpis.expiry_mismatch_batches} expiry mismatch${Number(kpis.expiry_mismatch_batches) === 1 ? '' : 'es'}`,
      onClick: () => navigate(buildAttentionPath('/batches', period, selectedMonth, { expiry: 'mismatch' }))
    },
    managerView && hasUrgentReviewAttention(reviewAttentionSummary) && {
      id: 'urgent-review',
      count: reviewAttentionSummary.urgent + reviewAttentionSummary.dueToday + reviewAttentionSummary.overdue,
      label: `Urgent defect reports need review (${formatUrgentReviewCountSummary(reviewAttentionSummary)})`,
      subtitle: 'Review urgent or due-today worker reports before assigning corrective actions.',
      onClick: () => navigate(buildAttentionPath('/defects', period, selectedMonth, { filter: 'urgent_review' }))
    },
    managerView && newReportCount > 0 && !hasUrgentReviewAttention(reviewAttentionSummary) && {
      id: 'new-reports',
      count: newReportCount,
      label: `${newReportCount} worker report${newReportCount === 1 ? '' : 's'} need your review`,
      onClick: () => navigate(buildAttentionPath('/defects', period, selectedMonth, { filter: 'new' }))
    }
  ].filter(Boolean)

  const visibleAttentionItems = attentionItems.filter((item) => item.count > 0)

  return (
    <div className="page-stack mx-auto w-full max-w-[1280px]">
      <PageHeader
        title="Dashboard"
        subtitle={summary?.period_label
          ? `Overview of defects, actions and loss for ${summary.period_label}.`
          : 'Overview of defects, actions and loss for the selected period.'}
      >
        <div className="flex flex-wrap items-center gap-3">
          <ReportPeriodFilter
            value={period}
            month={selectedMonth}
            onChange={setPeriod}
            onMonthChange={setSelectedMonth}
          />
          {isRefetching && (
            <span className="inline-flex items-center gap-1.5 text-xs text-brand-muted">
              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
              Updating…
            </span>
          )}
          <Button onClick={() => navigate('/reports')}>Open Reports</Button>
        </div>
      </PageHeader>

      {loadError && (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{loadError}</span>
          <button type="button" onClick={() => setLoadError(null)} className="font-bold">
            ×
          </button>
        </div>
      )}

      <div className="list-kpi-grid lg:grid-cols-4">
        <KPICard density="command" title="Total Defects" value={kpis.total_defects ?? '-'} subtitle="This period" icon={<Layers size={18} />} tone="blue" />
        <KPICard density="command" title="Open Defects" value={kpis.open_defects ?? '-'} subtitle="Not closed" icon={<Package size={18} />} tone="amber" />
        <KPICard density="command" title="Open Actions" value={kpis.open_actions ?? '-'} subtitle="In progress" icon={<CheckSquare size={18} />} tone="purple" />
        <KPICard
          density="command"
          title="Expiry Mismatches"
          value={kpis.expiry_mismatch_batches ?? 0}
          subtitle="Label vs retort"
          icon={<AlertTriangle size={18} />}
          tone="red"
          highlight={Number(kpis.expiry_mismatch_batches) > 0}
          onClick={() => navigate('/reports?tab=traceability&view=expiry-defect-cases')}
        />
      </div>

      <div className="list-kpi-strip lg:grid-cols-3">
        <KPICard
          density="command"
          title="Loss at Risk"
          value={money(kpis.loss_at_risk ?? 0)}
          subtitle="Open defects · held inventory"
          icon={<AlertTriangle size={18} />}
          tone="amber"
          highlight={Number(kpis.loss_at_risk) > 0}
        />
        <KPICard
          density="command"
          title="Pending Loss"
          value={money(kpis.pending_loss ?? 0)}
          subtitle="Discarded · case still open"
          icon={<TrendingDown size={18} />}
          tone="purple"
          highlight={Number(kpis.pending_loss) > 0}
        />
        <KPICard
          density="command"
          title="Confirmed Loss"
          value={money(kpis.confirmed_loss ?? 0)}
          subtitle="Finalized on close"
          icon={<TrendingDown size={18} />}
          tone="red"
        />
      </div>

      <AttentionCenter
        items={attentionItems}
        action={visibleAttentionItems.length > 0 ? (
          <Button
            color="amber"
            variant="subtle"
            size="sm"
            className="list-action-btn"
            onClick={() => navigate(buildAttentionPrimaryPath(period, selectedMonth, visibleAttentionItems))}
          >
            {getAttentionActionLabel(visibleAttentionItems)}
          </Button>
        ) : null}
      />

      {pendingReviewCount > 0 && (
        <SectionCard
          title="Pending Review — Corrective Actions"
          subtitle={`Worker-submitted actions waiting for verify or reject. (${pendingReviewCount} pending)`}
        >
          <div className="space-y-3">
            {pendingReviewActions.slice(0, 5).map((action) => (
              <AnalyticRow
                key={action.id}
                accentClass="bg-amber-500"
                title={action.action_code}
                subtitle={action.task}
                meta={`${action.defect_code} · ${action.assigned_to_name} · ${action.product_name}`}
                badge={<StatusBadge kind="ca" value={action.ca_status} />}
                action={(
                  <ListActionButton intent="review" onClick={() => navigate(`/corrective-actions/${action.id}`)} />
                )}
              />
            ))}
          </div>
          <ListActionButton intent="open" label="Open All Corrective Actions" className="mt-2 list-action-btn" onClick={() => navigate('/corrective-actions')} />
        </SectionCard>
      )}

      <div className="grid grid-cols-1 gap-2 lg:grid-cols-3">
        <ChartCard
          title="Defect Trend"
          subtitle="Defect volume over time for the selected period."
          className="lg:col-span-3"
        >
          <DefectTrendChart
            data={trendData}
            emptyMessage="No defects recorded for this period."
          />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-2 lg:grid-cols-3">
        <ChartCard
          title="Defects by Type"
          subtitle="Most frequent defect categories in the selected period."
          className="lg:col-span-2"
        >
          <DefectsByTypeChart
            data={defectsByType}
            emptyMessage="No defects recorded for this period."
          />
        </ChartCard>

        <ChartCard
          title="Actions by Status"
          subtitle="Corrective action progress breakdown."
        >
          <ActionsByStatusChart
            data={caStatus}
            emptyMessage="No corrective actions in this period yet."
          />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-2 lg:grid-cols-3">
        <SectionCard title="Top Root Causes" subtitle="Confirmed and suspected causes grouped by frequency." className="lg:col-span-1">
          {rootCauses.length === 0 ? (
            <EmptyState
              title="No root cause data yet"
              description="Root causes appear after manager confirmation on investigations."
            />
          ) : (
            <div className="compact-list-stack">
              {rootCauses.slice(0, 5).map((root, i) => (
                <AnalyticRow
                  key={`${root.name}-${i}`}
                  accentClass="bg-brand-500"
                  title={root.name}
                  subtitle={`${root.confirmed} confirmed · ${root.suspected} suspected · ${root.pending} pending`}
                  trailing={(
                    <div className="text-right">
                      <p className="text-micro uppercase text-brand-muted">Total</p>
                      <p className="text-base font-bold text-brand-ink">{root.cases}</p>
                    </div>
                  )}
                />
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Recent Defects" subtitle="Latest defect records in the selected period." className="lg:col-span-2">
          {latest.length === 0 ? (
            <EmptyState
              title="No recent defects"
              description="Defects recorded in the selected period will appear here."
              actionLabel="View All Defects"
              onAction={() => navigate('/defects')}
              icon={Package}
            />
          ) : (
            <div className="compact-list-stack">
              {latest.slice(0, 5).map((d) => (
                <AnalyticRow
                  key={d.id ?? d.defect_code}
                  accentClass="bg-brand-500"
                  title={d.defect_code}
                  subtitle={`${d.product_name} · Batch ${d.batch_number}`}
                  meta={d.created_at ? `Recorded ${formatDate(d.created_at)}` : undefined}
                  badge={<StatusBadge value={d.defect_status} />}
                  action={actionButton(d.defect_status, navigate, d.id)}
                />
              ))}
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  )
}

