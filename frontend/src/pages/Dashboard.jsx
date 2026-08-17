import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, CheckSquare, ClipboardList, Clock, Layers, Package, Plus, AlertTriangle } from 'lucide-react'
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
import { isManager } from '../utils/roleAccess'
import { isActionOverdue, isActionDueThisWeek } from '../utils/dueDate'
import { hasExpiryMismatch } from '../utils/expiry'
import { buildWorkerAttentionItems, summarizeWorkerAttention } from '../utils/workerAttention'
import { formatCaStatusLabel } from '../utils/caStatusLabel'
import { buildManagerAttentionSummary } from '../utils/notifications'
import { defectStatusHint } from '../utils/defectStatusHint'

const PIE_COLORS = ['#1F8F73', '#146356', '#C2410C', '#F59E0B', '#7EC6AE']

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

          const [summaryRes, actionsRes, defectsRes] = await Promise.all([
            api.get('/reports/dashboard/summary', { params: summaryParams }),
            api.get('/corrective-actions'),
            api.get('/defects')
          ])

          if (cancelled) return

          const s = summaryRes?.data?.data ?? summaryRes?.data ?? {}
          setSummary(s)
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

  const readyForRootCause = useMemo(
    () => periodDefects.filter((defect) => {
      const status = String(defect.defect_status || '').toLowerCase()
      if (status === 'new' || status === 'closed') return false
      if (defect.root_cause_status === 'confirmed') return false
      const total = Number(defect.total_actions || 0)
      const verified = Number(defect.verified_actions || 0)
      return total === 0 || verified === total
    }),
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

    return {
      kpis,
      defectsByType,
      caStatus,
      trendData,
      latest: summary.latest_defects || []
    }
  }, [summary])

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
            <Button color="amber" size="sm" className="list-action-btn" onClick={() => navigate('/corrective-actions')}>
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
            <>
              <div className="compact-list-stack">
                {reportedDefects.slice(0, 5).map((defect) => {
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
              {reportedDefects.length > 5 && (
                <ListActionButton intent="open" label={`View All My Reports (${reportedDefects.length})`} className="mt-2 list-action-btn" onClick={() => navigate('/defects')} />
              )}
            </>
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
            <>
              <div className="compact-list-stack">
                {workerActions.slice(0, 5).map((action) => {
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
              {workerActions.length > 5 && (
                <ListActionButton intent="open" label={`View All My Work (${workerActions.length})`} className="mt-2 list-action-btn" onClick={() => navigate('/corrective-actions')} />
              )}
            </>
          )}
        </SectionCard>
      </div>
    )
  }

  if (!data) return <div className="text-sm text-red-600">Failed to load dashboard.</div>

  const { kpis, defectsByType, caStatus, trendData, latest } = data
  const pendingReviewCount = Number(kpis.pending_review_actions ?? 0)

  // All-time, not period-scoped: this must stay in lockstep with the header bell
  // (buildNotifications) since both answer the same question — "what currently
  // needs attention" — regardless of which reporting period the dashboard is showing.
  const attentionItems = buildManagerAttentionSummary(managerActions, managerDefects, navigate)
  const visibleAttentionItems = attentionItems

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
          <Button color="slate" variant="subtle" onClick={() => navigate('/reports')}>Open Reports</Button>
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

      <AttentionCenter
        items={attentionItems}
        action={visibleAttentionItems.length > 0 ? (
          <Button
            color="amber"
            size="sm"
            className="list-action-btn"
            onClick={visibleAttentionItems.length === 1 ? visibleAttentionItems[0].onClick : () => navigate('/corrective-actions')}
          >
            {visibleAttentionItems.length === 1 ? 'View Details' : 'View All'}
          </Button>
        ) : null}
      />

      <div className="space-y-3">
        <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-brand-muted">Performance Overview</p>

        <div className="list-kpi-grid lg:grid-cols-3">
          <KPICard density="command" title="Total Defects" value={kpis.total_defects ?? '-'} subtitle="This period" icon={<Layers size={18} />} tone="blue" />
          <KPICard density="command" title="Open Defects" value={kpis.open_defects ?? '-'} subtitle="Not closed" icon={<Package size={18} />} tone="amber" />
          <KPICard density="command" title="Open Actions" value={kpis.open_actions ?? '-'} subtitle="In progress" icon={<CheckSquare size={18} />} tone="purple" />
        </div>
      </div>

      {(pendingReviewCount > 0 || readyForRootCause.length > 0) && (
        <div className="space-y-3">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-brand-muted">Awaiting Your Sign-off</p>

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
                    action={(
                      <ListActionButton intent="review" onClick={() => navigate(`/corrective-actions/${action.id}`)} />
                    )}
                  />
                ))}
              </div>
              <ListActionButton intent="open" label="Open All Corrective Actions" className="mt-2 list-action-btn" onClick={() => navigate('/corrective-actions')} />
            </SectionCard>
          )}

          {readyForRootCause.length > 0 && (
            <SectionCard
              title="Ready for Root Cause Confirmation"
              subtitle={`Actions verified, awaiting your root cause sign-off. (${readyForRootCause.length} ready)`}
            >
              <div className="space-y-3">
                {readyForRootCause.slice(0, 5).map((defect) => (
                  <AnalyticRow
                    key={defect.id}
                    accentClass="bg-slate-500"
                    title={`${defect.defect_code} — ${defect.defect_type}`}
                    subtitle={`${defect.product_name} · Batch ${defect.batch_number}`}
                    meta={`${defect.action_progress} · Reported ${formatDate(defect.created_at)}`}
                    badge={<StatusBadge kind="root_cause" value={defect.root_cause_status} />}
                    action={(
                      <ListActionButton intent="review" onClick={() => navigate(`/defects/${defect.id}?tab=root-cause`)} />
                    )}
                  />
                ))}
              </div>
            </SectionCard>
          )}
        </div>
      )}

      <div className="space-y-3">
        <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-brand-muted">Trends &amp; Analysis</p>

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
          <SectionCard title="Recent Defects" subtitle="Latest defect records in the selected period." className="lg:col-span-3">
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
    </div>
  )
}

