import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, CheckCircle, Edit, Eye, Play, Plus, Printer, Save, XCircle } from 'lucide-react'
import api from '../api/client'
import StatusBadge from '../components/StatusBadge'
import BaseModal from '../components/BaseModal'
import Button from '../components/Button'
import LoadingState from '../components/LoadingState'
import TabPills from '../components/TabPills'
import DefectActivityTimeline from '../components/DefectActivityTimeline'
import RejectActionModal from '../components/RejectActionModal'
import FieldLabel from '../components/FieldLabel'
import { isAssignedToUser, isManager } from '../utils/roleAccess'
import { getDefectWorkflow } from '../utils/defectWorkflow'
import { isActionOverdue } from '../utils/dueDate'
import { printDefectSummary } from '../utils/defectExport'
import { hasExpiryMismatch } from '../utils/expiry'
import { fetchEvidenceBlobUrl } from '../utils/assetUrl'
import { defectStatusBadgeTitle } from '../utils/defectStatusHint'
import { getWorkerActionProgressHint } from '../utils/workerActionProgressHint'
import { getCaStatusExplanation } from '../utils/caStatusExplanation'
import { formatDefectPriorityLabel, getReviewDueBadge, isUrgentDefectPriority, DEFECT_PRIORITY_OPTIONS, todayDateString, formatReviewDueDate } from '../utils/defectReviewDue'

function formatDate(value) {
  if (!value) return '-'
  return String(value).split('T')[0]
}

function titleCase(value) {
  if (!value) return '-'
  return String(value).replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function Info({ label, value }) {
  return <div><p className="text-xs font-semibold uppercase text-brand-muted">{label}</p><p className="mt-1 font-semibold text-brand-ink">{value || '-'}</p></div>
}

function Select({ label, value, onChange, options, required = false }) {
  return (
    <label className="block">
      <FieldLabel label={label} required={required} />
      <select value={value} onChange={(e) => onChange(e.target.value)} className="field-control">
        <option value="">Select</option>
        {options.map((option, i) => <option key={`${option.value ?? option}-${i}`} value={option.value ?? option}>{option.label ?? titleCase(option)}</option>)}
      </select>
    </label>
  )
}

function Input({ label, value, onChange, type = 'text', required = false }) {
  return (
    <label className="block">
      <FieldLabel label={label} required={required} />
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="field-control" />
    </label>
  )
}

function TextArea({ label, value, onChange, rows = 3, required = false }) {
  return (
    <label className="block">
      <FieldLabel label={label} required={required} />
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} className="field-control" />
    </label>
  )
}

function normalizeAction(action) {
  return {
    ...action,
    id: action.id,
    code: action.action_code,
    type: action.action_type,
    status: action.ca_status,
    assignedToName: action.assigned_to_name,
    assignedTo: action.assigned_to,
    dueDate: formatDate(action.due_date),
    completedDate: formatDate(action.completed_date),
    verifiedDate: formatDate(action.verified_date),
    qtyAffected: Number(action.qty_affected || 0),
    qtyRelabelled: Number(action.qty_relabelled || 0),
    qtyRepacked: Number(action.qty_repacked || 0),
    qtyReworked: Number(action.qty_reworked || 0),
    qtyDiscarded: Number(action.qty_discarded || 0),
    qtyReleased: Number(action.qty_released || 0),
    qtyOnHold: Number(action.qty_on_hold || 0),
    calculatedLoss: Number(action.calculated_loss || 0),
    evidenceRequired: Boolean(action.evidence_required),
    hasEvidence: Boolean(action.has_evidence)
  }
}

function rejectedActionHint(action) {
  const base = getWorkerActionProgressHint('rejected')
  return action.rejection_reason ? `${base} · Reason: ${action.rejection_reason}` : base
}

function formatAssignActionTypeLabel(actionType) {
  if (actionType === 'machine_process_check') return 'Machine / Process Check'
  return 'Product Handling'
}

function validateDefectDetailsForm(form) {
  if (form.review_due_date && form.review_due_date < todayDateString()) {
    return 'Manager review due date cannot be before today'
  }

  if (form.priority === 'urgent' && !form.urgency_reason?.trim()) {
    return 'Please explain why this defect needs urgent manager review.'
  }

  return null
}

function EditDefectDetailsModal({ defect, onClose, onSaved }) {
  const [form, setForm] = useState({
    priority: defect.priority || 'medium',
    review_due_date: formatReviewDueDate(defect.review_due_date) || '',
    urgency_reason: defect.urgency_reason || ''
  })
  const [saving, setSaving] = useState(false)

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function submit() {
    const validationError = validateDefectDetailsForm(form)
    if (validationError) {
      alert(validationError)
      return
    }

    setSaving(true)
    try {
      await api.patch(`/defects/${defect.id}/details`, {
        priority: form.priority,
        review_due_date: form.review_due_date || null,
        urgency_reason: form.urgency_reason.trim() || null
      })
      await onSaved()
      onClose()
    } catch (error) {
      console.error(error)
      alert(error.response?.data?.message || 'Could not update defect details.')
    } finally {
      setSaving(false)
    }
  }

  const reviewToday = form.review_due_date === todayDateString()

  return (
    <BaseModal
      title="Edit Defect Details"
      subtitle="Update review priority, manager review due date, and urgency reason."
      onClose={onClose}
      size="lg"
      footer={(
        <>
          <Button color="slate" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button color="brand" onClick={submit} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </>
      )}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Select
            label="Defect Priority"
            value={form.priority}
            onChange={(v) => update('priority', v)}
            options={DEFECT_PRIORITY_OPTIONS.map((option) => option.value)}
          />
          <Input
            label="Manager Review Due Date"
            type="date"
            value={form.review_due_date}
            min={todayDateString()}
            onChange={(v) => update('review_due_date', v)}
          />
        </div>
        <p className="text-xs text-brand-muted">
          Use this when the defect must be reviewed quickly to prevent further loss or damage.
        </p>
        {reviewToday && (
          <p className="text-xs font-medium text-amber-700">Needs review today</p>
        )}
        <TextArea
          label="Urgency Reason"
          value={form.urgency_reason}
          onChange={(v) => update('urgency_reason', v)}
          rows={2}
          required={form.priority === 'urgent'}
        />
      </div>
    </BaseModal>
  )
}

function AssignActionModal({ defect, rule, workers, users, assignedBy, defaultType, defaultAssigneeId, defaultTask, onClose, onAssigned }) {
  const initialTask = defaultTask
    || (defaultType === 'machine_process_check'
      ? defect.suggested_machine_handling
      : defect.suggested_product_handling)
    || (defaultType === 'machine_process_check'
      ? rule?.machine_check_options?.[0]
      : rule?.product_handling_options?.[0])
    || ''

  const [form, setForm] = useState({
    action_type: defaultType || 'product_handling',
    task: initialTask,
    custom_task: '',
    assigned_to: defaultAssigneeId ? String(defaultAssigneeId) : '',
    due_date: '',
    evidence_required: true,
    priority: defect.priority || 'medium'
  })
  const [saving, setSaving] = useState(false)

  const taskOptions = form.action_type === 'product_handling'
    ? [defect.suggested_product_handling, ...(rule?.product_handling_options || [])].filter(Boolean)
    : [defect.suggested_machine_handling, ...(rule?.machine_check_options || [])].filter(Boolean)

  const uniqueTasks = [...new Set([...taskOptions, 'Custom Task'])]
  const assignedById = assignedBy || users.find((u) => u.role === 'manager')?.id || null

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function submit() {
    const taskToSend = form.task === 'Custom Task'
      ? String(form.custom_task || '').trim()
      : String(form.task || '').trim()

    if (!taskToSend || !form.assigned_to) {
      return alert('Task and assigned worker are required.')
    }

    if (form.task === 'Custom Task' && !taskToSend) {
      return alert('Please enter a custom task description.')
    }

    setSaving(true)
    try {
      await api.post(`/corrective-actions/defects/${defect.id}/assign`, {
        action_type: form.action_type,
        task: taskToSend,
        assigned_to: Number(form.assigned_to),
        assigned_by: assignedById,
        due_date: form.due_date || null,
        evidence_required: Boolean(form.evidence_required),
        priority: form.priority
      })
      onAssigned()
      onClose()
    } catch (error) {
      console.error(error)
      alert(error.response?.data?.message || 'Could not assign action.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <BaseModal
      title={
        form.action_type === 'product_handling'
          ? 'Assign Product Handling Action'
          : 'Assign Machine / Process Check Action'
      }
      subtitle="Only assignment fields. Quantities and findings are entered during completion."
      onClose={onClose}
      size="lg"
      footer={
        <>
          <Button color="slate" variant="subtle" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>Assign Action</Button>
        </>
      }
    >
      <div className="space-y-5">
        <p className="text-sm text-brand-ink">
          <span className="font-semibold">Action Type:</span>{' '}
          {formatAssignActionTypeLabel(form.action_type)}
        </p>

        <Select
          label="Task"
          value={form.task === 'Custom Task' || uniqueTasks.includes(form.task) ? form.task : 'Custom Task'}
          onChange={(v) => {
            if (v === 'Custom Task') {
              setForm((current) => ({ ...current, task: 'Custom Task', custom_task: '' }))
            } else {
              setForm((current) => ({ ...current, task: v, custom_task: '' }))
            }
          }}
          options={uniqueTasks}
          required
        />

        {form.task === 'Custom Task' && (
          <Input
            label="Custom Task Description"
            value={form.custom_task || ''}
            onChange={(v) => update('custom_task', v)}
            required
          />
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Select
            label="Assign To Worker"
            value={form.assigned_to}
            onChange={(v) => update('assigned_to', v)}
            options={workers.map((w) => ({ value: w.id, label: w.full_name }))}
            required
          />

          <Input
            label="CA Due Date"
            type="date"
            value={form.due_date}
            onChange={(v) => update('due_date', v)}
          />

          <Select
            label="Evidence Required"
            value={String(form.evidence_required)}
            onChange={(v) => update('evidence_required', v === 'true')}
            options={[
              { value: 'true', label: 'Yes' },
              { value: 'false', label: 'No' }
            ]}
          />

          <Select
            label="CA Priority"
            value={form.priority}
            onChange={(v) => update('priority', v)}
            options={['low', 'medium', 'high', 'critical']}
          />
        </div>
      </div>
    </BaseModal>
  )
}

function resolveClosedByName(defect, users = []) {
  if (defect?.closed_by_name) return defect.closed_by_name
  const closedById = defect?.closed_by
  if (closedById == null || !users.length) return 'Manager'
  const closer = users.find((entry) => Number(entry.id) === Number(closedById))
  return closer?.full_name || 'Manager'
}

function ClosedDefectSummary({ defect, users = [] }) {
  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-800">
      <p className="font-semibold text-slate-900">Defect Closed</p>
      <p className="mt-2"><b>Closed by:</b> {resolveClosedByName(defect, users)}</p>
      <p><b>Closed on:</b> {formatDate(defect?.closed_at)}</p>
    </div>
  )
}

function BlockerBanner({ title, items, strongBorder = false, className = '' }) {
  const borderClass = strongBorder ? 'border-amber-300' : 'border-amber-200'

  return (
    <div className={`rounded-2xl border ${borderClass} bg-amber-50 px-4 py-4 text-sm text-amber-950 ${className}`.trim()}>
      <div className="flex items-start gap-3">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700 ring-1 ring-amber-200/80">
          <AlertTriangle size={16} aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{title}</p>
          <ul className="mt-2 list-disc pl-5">
            {items.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </div>
      </div>
    </div>
  )
}

function NextStepBanner({ workflow, activeTab, onGoToTab, managerView }) {
  if (!workflow.nextStep) return null

  const onTargetTab = workflow.nextTab !== 'overview' && activeTab === workflow.nextTab
  const actionsTabLabel = managerView ? 'Corrective Actions' : 'My Work'
  const rootTabLabel = managerView ? 'Root Cause' : 'What Caused It'
  const message =
    workflow.phase === 'confirm_root_cause'
      ? activeTab === 'root'
        ? 'All actions verified. Confirm the root cause below.'
        : managerView
          ? 'All actions verified. Confirm root cause on the Root Cause tab.'
          : 'All actions verified. Record what caused it on the What Caused It tab.'
      : workflow.phase === 'close'
        ? activeTab === 'root'
          ? 'Root cause confirmed. Close this defect below.'
          : managerView
            ? 'Root cause confirmed. Close this defect on the Root Cause tab.'
            : 'Root cause confirmed. This defect will be closed by your manager.'
        : workflow.nextStep

  const containerClass = workflow.isClosed
    ? 'mb-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800'
    : 'mb-5 rounded-2xl border border-brand-100 bg-brand-50 px-4 py-3 text-sm text-brand-ink'

  return (
    <div className={containerClass}>
      <p className={`font-semibold ${workflow.isClosed ? 'text-slate-900' : ''}`}>Next step</p>
      <p className="mt-1">{message}</p>
      {!workflow.isClosed && workflow.nextTab !== 'overview' && !onTargetTab && (
        <button
          type="button"
          onClick={() => onGoToTab(workflow.nextTab)}
          className="mt-2 font-semibold text-brand-700 underline"
        >
          Go to {workflow.nextTab === 'actions' ? actionsTabLabel : rootTabLabel} tab
        </button>
      )}
    </div>
  )
}

const WORKFLOW_VISUALS = {
  completed: {
    container: 'border-emerald-200 bg-emerald-50',
    badge: 'bg-emerald-600 text-white',
    status: 'text-emerald-700'
  },
  warning: {
    container: 'border-amber-200 bg-amber-50',
    badge: 'bg-amber-500 text-white',
    status: 'text-amber-800'
  },
  neutral: {
    container: 'border-brand-border/70 bg-slate-50/80',
    badge: 'bg-slate-200 text-slate-600',
    status: 'text-brand-muted'
  }
}

function buildWorkflowSteps({
  actions,
  visibleActions,
  stats,
  rootCauseConfirmed,
  defect,
  managerView,
  workerHasAssignedAction,
  canAssign,
  handlers
}) {
  const totalActions = actions.length
  const submittedCount = stats.submitted
  const verifiedCount = stats.verified
  const hasActions = totalActions > 0
  const isClosed = defect?.defect_status === 'closed'
  const step2Complete = hasActions && submittedCount === totalActions
  const step3Complete = hasActions && verifiedCount === totalActions
  const actionsVerified = verifiedCount === totalActions && totalActions > 0
  const pendingVerification = stats.pendingVerify > 0
  const viewActionsButton = hasActions
    ? { label: 'View Actions', onClick: handlers.viewActions, color: 'slate', variant: 'subtle' }
    : null

  if (!hasActions) {
    return [
      {
        title: 'Action Assignment',
        subtitle: 'Manager has not assigned corrective actions yet',
        status: 'Pending',
        visual: 'warning',
        hint: managerView ? null : 'Waiting for manager',
        action: managerView && canAssign ? { label: 'Assign Action', onClick: handlers.assignAction } : null
      },
      {
        title: 'Action Completion',
        subtitle: 'Waiting for assigned actions',
        status: 'Not Started',
        visual: 'neutral'
      },
      {
        title: 'Manager Verification',
        subtitle: 'Waiting for completed actions',
        status: 'Not Started',
        visual: 'neutral'
      },
      {
        title: 'Root Cause Finalization',
        subtitle: 'Available after actions are verified',
        status: 'Locked',
        visual: 'neutral'
      },
      {
        title: 'Defect Closure',
        subtitle: 'Available after root cause is finalized',
        status: 'Locked',
        visual: 'neutral'
      }
    ]
  }

  const step2Action = step2Complete
    ? viewActionsButton
    : managerView
      ? viewActionsButton
      : workerHasAssignedAction
        ? {
            label: visibleActions.some((action) => !['completed', 'verified'].includes(action.status))
              ? 'Complete Action'
              : 'View My Work',
            onClick: handlers.completeAction,
            color: 'brand',
            variant: 'subtle'
          }
        : null

  let step3Status = 'Not Started'
  let step3Visual = 'neutral'
  if (step3Complete) {
    step3Status = 'Completed'
    step3Visual = 'completed'
  } else if (pendingVerification) {
    step3Status = 'Pending'
    step3Visual = 'warning'
  } else if (!step2Complete) {
    step3Status = 'Locked'
    step3Visual = 'neutral'
  }

  const step3Action = pendingVerification && managerView
    ? { label: 'Verify Actions', onClick: handlers.verifyActions }
    : null

  const step3Hint = pendingVerification && !managerView ? 'Waiting for manager verification' : null

  const step4Action = actionsVerified && !rootCauseConfirmed && managerView
    ? { label: 'Confirm Root Cause', onClick: handlers.confirmRootCause }
    : null

  const step5Action = rootCauseConfirmed && !isClosed && managerView
    ? { label: 'Close Defect', onClick: handlers.closeDefect, color: 'green' }
    : null

  return [
    {
      title: 'Action Assignment',
      subtitle: `${totalActions} action(s) assigned`,
      status: 'Completed',
      visual: 'completed',
      action: viewActionsButton
    },
    {
      title: 'Action Completion',
      subtitle: `${submittedCount}/${totalActions} submitted`,
      status: step2Complete ? 'Completed' : 'Pending',
      visual: step2Complete ? 'completed' : 'warning',
      action: step2Action
    },
    {
      title: 'Manager Verification',
      subtitle: `${verifiedCount}/${totalActions} verified`,
      status: step3Status,
      visual: step3Visual,
      hint: step3Hint,
      action: step3Action
    },
    {
      title: 'Root Cause Finalization',
      subtitle: rootCauseConfirmed
        ? (defect?.confirmed_root_cause || 'Root cause confirmed')
        : 'Available after actions are verified',
      status: rootCauseConfirmed ? 'Completed' : actionsVerified ? 'Ready' : 'Locked',
      visual: rootCauseConfirmed ? 'completed' : actionsVerified ? 'warning' : 'neutral',
      action: step4Action
    },
    {
      title: 'Defect Closure',
      subtitle: isClosed
        ? 'Defect closed'
        : rootCauseConfirmed
          ? 'Ready to close'
          : 'Available after root cause is finalized',
      status: isClosed ? 'Completed' : rootCauseConfirmed ? 'Ready' : 'Locked',
      visual: isClosed ? 'completed' : rootCauseConfirmed ? 'warning' : 'neutral',
      action: step5Action
    }
  ]
}

function WorkflowStep({ number, title, subtitle, status, visual = 'neutral', hint, action }) {
  const tone = WORKFLOW_VISUALS[visual] || WORKFLOW_VISUALS.neutral

  return (
    <div className={`flex items-center gap-4 rounded-xl border p-4 ${tone.container}`}>
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-bold ${tone.badge}`}>{number}</div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-brand-ink">{title}</div>
        {subtitle && <div className="text-xs text-brand-muted">{subtitle}</div>}
        {hint && <div className="mt-1 text-xs text-brand-muted">{hint}</div>}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2">
        <div className={`text-sm font-medium ${tone.status}`}>{status}</div>
        {action && (
          <Button
            size="sm"
            color={action.color || 'brand'}
            variant={action.variant || 'subtle'}
            onClick={action.onClick}
          >
            {action.label}
          </Button>
        )}
      </div>
    </div>
  )
}

function ReviewUrgencyBanner({ defect, managerView, onEdit }) {
  const shouldShow = (managerView && defect.defect_status !== 'closed')
    || defect.review_due_date
    || defect.urgency_reason
    || isUrgentDefectPriority(defect)

  if (!shouldShow) return null

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-4 text-sm text-amber-950">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold">Manager Review Urgency</p>
          <p className="mt-1 text-xs text-amber-900/80">
            {managerView
              ? 'Set or adjust how quickly this defect needs manager review — not a corrective action due date.'
              : 'Set by the worker when reporting. This tells you how quickly to review the defect — not a corrective action due date.'}
          </p>
        </div>
        {managerView && defect.defect_status !== 'closed' && (
          <Button color="amber" variant="subtle" size="sm" onClick={onEdit}>
            <Edit size={14} />
            Edit Details
          </Button>
        )}
      </div>
      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
        <Info label="Defect Priority" value={formatDefectPriorityLabel(defect.priority)} />
        <Info label="Manager Review Due Date / Review Needed By" value={formatDate(defect.review_due_date) || '-'} />
        {getReviewDueBadge(defect.review_due_date, defect.defect_status) && (
          <Info
            label="Review Status"
            value={getReviewDueBadge(defect.review_due_date, defect.defect_status).label}
          />
        )}
      </div>
      {defect.urgency_reason ? (
        <div className="mt-3">
          <Info label="Urgency Reason" value={defect.urgency_reason} />
        </div>
      ) : managerView && defect.defect_status !== 'closed' ? (
        <div className="mt-3">
          <Info label="Urgency Reason" value="-" />
        </div>
      ) : null}
    </div>
  )
}

function DescriptionEvidenceCard({ defect }) {
  return (
    <div className="relative mt-2 surface-card p-6">
      <h3 className="absolute -top-3 left-6 bg-white px-3 text-sm font-bold text-brand-ink">Defect Description + Evidence</h3>
      <div className="mt-2"><Info label="Description" value={defect.description || 'No description provided.'} /></div>
      {defect.investigation_notes && (
        <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50/60 p-4">
          <Info label="Worker's Possible Cause" value={defect.investigation_notes} />
        </div>
      )}
      <div className="mt-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-brand-muted">Evidence / Photos</p>
        </div>
        <div className="mt-3">
          {(defect.photos || []).length === 0 ? (
            <div className="text-sm text-brand-muted">No photos uploaded.</div>
          ) : (
            <div className="mt-2 grid grid-cols-3 gap-2">
              {(defect.photos || []).map((p, i) => (
                <div key={p.id ?? p.url ?? i} className="aspect-square overflow-hidden rounded-md border border-brand-border/70 bg-brand-50">
                  <img src={p.url || p} alt={`evidence-${i}`} className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ManagerOverview({
  defect,
  managerView,
  showEditDetails,
  setShowEditDetails,
  onSavedDetails,
  workflowSteps,
  verifiedActionCount,
  totalActionCount,
  actions
}) {
  return (
    <div className="mt-6 space-y-5">
      {showEditDetails && (
        <EditDefectDetailsModal
          defect={defect}
          onClose={() => setShowEditDetails(false)}
          onSaved={onSavedDetails}
        />
      )}

      <ReviewUrgencyBanner defect={defect} managerView={managerView} onEdit={() => setShowEditDetails(true)} />

      <div className="surface-card p-5">
        <h3 className="text-sm font-bold text-brand-ink">Defect Summary</h3>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-4">
          <Info label="Product Batch" value={`${defect.product_name} / ${defect.batch_number}`} />
          <Info label="Detected Stage" value={defect.detected_at_stage} />
          <Info label="Defect Type" value={defect.defect_type} />
          <Info label="Problem Level" value={defect.problem_level} />
          <Info label="Qty Affected" value={defect.qty_affected} />
          <Info label="Containment" value={defect.containment_status} />
          <Info label="Corrective Action Progress" value={defect.action_progress} />
          <Info label="Expected Expiry" value={formatDate(defect.correct_expiry_date)} />
          <Info label="Printed Expiry" value={formatDate(defect.printed_expiry_date)} />
        </div>
      </div>

      <DescriptionEvidenceCard defect={defect} />

      <div className="surface-card p-5">
        <h3 className="text-sm font-bold text-brand-ink">Current Workflow</h3>
        <div className="mt-4 space-y-3">
          {workflowSteps.map((step, index) => (
            <WorkflowStep
              key={step.title}
              number={index + 1}
              title={step.title}
              subtitle={step.subtitle}
              status={step.status}
              visual={step.visual}
              hint={step.hint}
              action={step.action}
            />
          ))}
        </div>
      </div>

      <div className="surface-card p-5">
        <h3 className="text-sm font-bold text-brand-ink">Suggested Handling & Related Information</h3>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <Suggestion title="Suggested Product Handling" value={defect.suggested_product_handling} />
          <Suggestion title="Suggested Machine / Process Check" value={defect.suggested_machine_handling} />
          <Suggestion title="Related Tool / Machine / Area" value={defect.related_tool_machine} />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-brand-border/70 bg-brand-50/60 p-4">
            <p className="text-sm font-semibold text-brand-muted">Actions Verified</p>
            <p className="mt-2 text-2xl font-bold text-brand-ink">{verifiedActionCount}/{totalActionCount || 0}</p>
          </div>
          <div className="rounded-2xl border border-brand-border/70 bg-brand-50/60 p-4">
            <p className="text-sm font-semibold text-brand-muted">Actions Pending Verification</p>
            <p className="mt-2 text-2xl font-bold text-brand-ink">{actions.filter((a) => a.status !== 'verified').length}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

const WORKER_PHASE_STATUS = {
  assign: 'Waiting for Assignment',
  worker_complete: 'Action In Progress',
  manager_verify: 'Waiting for Manager Verification',
  confirm_root_cause: 'Ready for Root Cause',
  close: 'Ready to Close',
  closed: 'Closed'
}

function WorkerOverview({ defect, visibleActions, workflow, onStartAction, navigate }) {
  const statusLabel = WORKER_PHASE_STATUS[workflow.phase] || 'In Progress'

  return (
    <div className="mt-6 space-y-5">
      <ReviewUrgencyBanner defect={defect} managerView={false} />

      <div className="surface-card p-5">
        <h3 className="text-sm font-bold text-brand-ink">My Action(s)</h3>
        {visibleActions.length === 0 ? (
          <div className="mt-3 text-sm text-brand-muted">No corrective action assigned to you yet.</div>
        ) : (
          <div className="mt-3 space-y-3">
            {visibleActions.map((action) => {
              const suggestedText = action.type === 'machine_process_check'
                ? defect.suggested_machine_handling
                : defect.suggested_product_handling
              const needsStart = action.status === 'assigned' || action.status === 'rejected'
              const inProgress = action.status === 'in_progress'

              return (
                <div key={action.id} className="rounded-2xl border border-brand-border/70 bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-bold text-brand-ink">{action.code}</div>
                      <div className="text-sm text-brand-muted">{action.task}</div>
                      <div className="mt-2 text-xs text-brand-muted">Due {action.dueDate || '-'}</div>
                      {action.status === 'rejected' && (
                        <div className="mt-1 text-xs font-medium text-red-700">{rejectedActionHint(action)}</div>
                      )}
                      {action.type === 'machine_process_check' && defect.related_tool_machine && (
                        <div className="mt-1 text-xs text-brand-muted">Machine / Area: {defect.related_tool_machine}</div>
                      )}
                      {suggestedText && (
                        <div className="mt-1 text-xs text-brand-muted">Suggested: {suggestedText}</div>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <StatusBadge kind="ca" value={action.status} audience="worker" />
                      {isActionOverdue(action.dueDate, action.status) && (
                        <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">
                          Overdue
                        </span>
                      )}
                      {needsStart && (
                        <Button size="sm" onClick={() => onStartAction(action.id)}>
                          <Play size={14} /> {action.status === 'rejected' ? 'Restart Action' : 'Start Action'}
                        </Button>
                      )}
                      {inProgress && (
                        <Button size="sm" onClick={() => navigate(`/corrective-actions/${action.id}`)}>
                          <Save size={14} /> Complete Action
                        </Button>
                      )}
                      <Button color="slate" variant="subtle" size="sm" onClick={() => navigate(`/corrective-actions/${action.id}`)}>
                        <Eye size={14} /> Open Action
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-brand-border/70 bg-brand-50/60 px-4 py-3 text-sm">
        <p className="font-semibold text-brand-ink">{statusLabel}</p>
        {workflow.nextStep && <p className="mt-1 text-brand-muted">{workflow.nextStep}</p>}
      </div>

      <div className="surface-card p-5">
        <h3 className="text-sm font-bold text-brand-ink">Defect Summary</h3>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <Info label="Product Batch" value={`${defect.product_name} / ${defect.batch_number}`} />
          <Info label="Defect Type" value={defect.defect_type} />
          <Info label="Qty Affected" value={defect.qty_affected} />
          <Info label="Problem Level" value={defect.problem_level} />
          <Info label="Containment" value={defect.containment_status} />
          <Info label="My Work Progress" value={defect.action_progress} />
        </div>
      </div>

      <DescriptionEvidenceCard defect={defect} />
    </div>
  )
}

export default function DefectDetails({ user }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const initialTab = new URLSearchParams(location.search).get('tab') === 'root-cause' ? 'root' : 'overview'
  const [tab, setTab] = useState(initialTab)
  const [defect, setDefect] = useState(null)
  const [rule, setRule] = useState(null)
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [assignModal, setAssignModal] = useState(null)
  const [rejectActionId, setRejectActionId] = useState(null)
  const [rootCause, setRootCause] = useState('')
  const [otherRootCause, setOtherRootCause] = useState('')
  const [suspectedCause, setSuspectedCause] = useState('')
  const [otherSuspectedCause, setOtherSuspectedCause] = useState('')
  const [investigationNotes, setInvestigationNotes] = useState('')
  const [savingSuspected, setSavingSuspected] = useState(false)
  const [printingSummary, setPrintingSummary] = useState(false)
  const [showEditDetails, setShowEditDetails] = useState(false)

  function applyRootCauseSelection(value, options, setCause, setOther) {
    if (!value) return
    if (options.includes(value)) {
      setCause(value)
      setOther('')
      return
    }
    setCause('Other')
    setOther(value)
  }

  async function load() {
    setLoading(true)
    try {
      const manager = isManager(user)
      const requests = [api.get(`/defects/${id}`)]
      if (manager) {
        requests.push(api.get('/users'))
      }

      const [defectRes, usersRes] = await Promise.all(requests)
      const data = defectRes.data.data

      const photos = await Promise.all(
        (data.evidence || []).map(async (item) => ({
          id: item.id,
          url: await fetchEvidenceBlobUrl(item.id),
          fileName: item.file_name || item.file_path?.split('/').pop()
        }))
      )
      setDefect({ ...data, photos })
      setUsers(usersRes?.data?.data || [])
      const ruleRes = await api.get(`/defects/rules/by-type/${encodeURIComponent(data.defect_type)}`)
      const loadedRule = ruleRes.data.data
      setRule(loadedRule)

      const options = loadedRule?.root_cause_options || []
      setInvestigationNotes(data.investigation_notes || '')
      if (data.suspected_root_cause) {
        applyRootCauseSelection(data.suspected_root_cause, options, setSuspectedCause, setOtherSuspectedCause)
        if (!data.confirmed_root_cause) {
          applyRootCauseSelection(data.suspected_root_cause, options, setRootCause, setOtherRootCause)
        }
      }
      if (data.confirmed_root_cause) {
        applyRootCauseSelection(data.confirmed_root_cause, options, setRootCause, setOtherRootCause)
      }
    } catch (error) {
      console.error(error)
      alert('Could not load defect details.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id])

  useEffect(() => {
    const blobUrls = (defect?.photos || [])
      .map((photo) => photo.url)
      .filter((url) => typeof url === 'string' && url.startsWith('blob:'))

    return () => {
      blobUrls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [defect?.photos])

  const managerView = isManager(user)
  const currentUser = user
  const actions = (defect?.corrective_actions || []).map(normalizeAction)
  const visibleActions = managerView
    ? actions
    : actions.filter((action) => isAssignedToUser(action, currentUser?.id))
  const completedFindings = visibleActions.filter((a) => a.status === 'completed' || a.status === 'verified').filter((a) => a.investigation_finding)
  const rootCauseOptions = rule?.root_cause_options || []
  const workflow = getDefectWorkflow(defect, actions, managerView)
  const { stats, canClose: canCloseDefect, canConfirmRootCause, canAssign, confirmBlockers, blockers: closeBlockers } = workflow
  const { verified: verifiedActionCount, total: totalActionCount } = stats
  const rootCauseConfirmed = workflow.rootConfirmed
  const workerHasAssignedAction = (defect?.corrective_actions || []).some(
    (action) => Number(action.assigned_to) === Number(currentUser?.id)
  )
  const workerReportedDefect = Number(defect?.created_by) === Number(currentUser?.id)
  const workerHasAccess = managerView || workerHasAssignedAction || workerReportedDefect
  const tabs = managerView
    ? [['overview', 'Overview'], ['actions', 'Corrective Actions'], ['root', 'Investigation'], ['activity', 'Activity']]
    : [
        ['overview', 'Overview'],
        ...(workerHasAssignedAction ? [['actions', 'My Work']] : []),
        ...(workerHasAssignedAction || workerReportedDefect ? [['root', 'What Caused It']] : []),
        ['activity', 'Activity']
      ]

  useEffect(() => {
    if (!defect || managerView) return

    if (!workerHasAccess) {
      alert('You do not have access to this defect.')
      navigate('/defects')
    }
  }, [defect, managerView, workerHasAccess, navigate])

  const workers = users.filter((u) => u.role === 'worker')
  const managerId = isManager(user) ? user.id : null
  const defaultWorkerId = currentUser?.id || workers[0]?.id || users[0]?.id || null

  function canManageAction(action) {
    return managerView || isAssignedToUser(action, currentUser?.id)
  }

  async function handlePrintSummary() {
    if (printingSummary || !defect) return

    setPrintingSummary(true)
    try {
      const opened = await printDefectSummary(defect, visibleActions, {
        onPrintTriggered: () => setPrintingSummary(false),
        onFailure: () => setPrintingSummary(false)
      }, managerView ? 'manager' : 'worker')

      if (!opened) {
        setPrintingSummary(false)
      }
    } catch {
      setPrintingSummary(false)
    }
  }

  async function handleStartReview() {
    if (!defect || defect.defect_status !== 'new') return

    try {
      await api.patch(`/defects/${id}/start-review`)
      await load()
    } catch (error) {
      alert(error.response?.data?.message || 'Could not start review.')
    }
  }

  function getDefaultTask(actionType) {
    if (actionType === 'machine_process_check') {
      return defect?.suggested_machine_handling || rule?.machine_check_options?.[0] || null
    }
    return defect?.suggested_product_handling || rule?.product_handling_options?.[0] || null
  }

  function openAssignModal(actionType, assigneeId = null) {
    setAssignModal({
      type: actionType,
      assigneeId,
      task: getDefaultTask(actionType)
    })
  }

  async function quickAssignToReporter(actionType) {
    const reporterId = defect?.created_by
    const reporterName = defect?.reported_by_name || 'the reporter'
    const task = getDefaultTask(actionType)

    if (!reporterId) return alert('No reporter found for this defect.')
    if (!task) return alert('No suggested task available. Use Assign Action to choose manually.')

    if (!window.confirm(`Assign "${task}" to ${reporterName}?`)) return

    try {
      await api.post(`/corrective-actions/defects/${defect.id}/assign`, {
        action_type: actionType,
        task,
        description: 'Assigned to the worker who reported this defect.',
        assigned_to: Number(reporterId),
        assigned_by: managerId,
        evidence_required: true,
        priority: defect.priority || 'medium'
      })
      await load()
      setTab('actions')
    } catch (error) {
      alert(error.response?.data?.message || 'Could not assign action to reporter.')
    }
  }

  const reporterIsWorker = Boolean(
    defect?.created_by
    && workers.some((worker) => Number(worker.id) === Number(defect.created_by))
  )

  async function startAction(actionId) {
    const action = actions.find((item) => item.id === actionId)
    const startedBy = action?.assignedTo || defaultWorkerId
    try {
      await api.patch(`/corrective-actions/${actionId}/start`, { started_by: startedBy })
      load()
    } catch (error) {
      alert(error.response?.data?.message || 'Could not start action.')
    }
  }

  async function verifyAction(actionId) {
    try {
      await api.patch(`/corrective-actions/${actionId}/verify`, { verified_by: managerId })
      load()
    } catch (error) {
      alert(error.response?.data?.message || 'Could not verify action.')
    }
  }

  async function saveSuspectedRootCause() {
    const finalCause = suspectedCause === 'Other' ? otherSuspectedCause.trim() : suspectedCause
    if (!finalCause) return alert('Please choose or type a suspected root cause.')

    setSavingSuspected(true)
    try {
      await api.patch(`/root-causes/defects/${id}/suspect`, {
        suspected_root_cause_source: defect.defect_type,
        suspected_root_cause: finalCause,
        related_tool_machine: defect.related_tool_machine || null,
        investigation_notes: investigationNotes || null,
        updated_by: currentUser?.id || null
      })
      await load()
      alert('Suspected root cause saved. Manager will review and confirm.')
    } catch (error) {
      alert(error.response?.data?.message || 'Could not save suspected root cause.')
    } finally {
      setSavingSuspected(false)
    }
  }

  async function confirmRootCause() {
    const finalCause = rootCause === 'Other' ? otherRootCause : rootCause
    if (!finalCause) return alert('Please choose or type confirmed root cause.')
    try {
      await api.patch(`/defects/${id}/root-cause`, {
        confirmed_root_cause: finalCause,
        confirmed_root_cause_source: defect.defect_type,
        confirmed_by: managerId
      })
      load()
    } catch (error) {
      alert(error.response?.data?.message || 'Could not confirm root cause.')
    }
  }

  async function closeDefect() {
    if (
      !window.confirm(
        `Close defect ${defect.defect_code}? This will mark the defect as closed and cannot be undone.`
      )
    ) {
      return
    }

    try {
      await api.patch(`/defects/${id}/close`, { closed_by: managerId })
      load()
    } catch (error) {
      alert(error.response?.data?.message || 'Could not close defect.')
    }
  }

  const workflowSteps = buildWorkflowSteps({
    actions,
    visibleActions,
    stats,
    rootCauseConfirmed,
    defect,
    managerView,
    workerHasAssignedAction,
    canAssign,
    handlers: {
      assignAction: () => openAssignModal('product_handling'),
      viewActions: () => setTab('actions'),
      completeAction: () => {
        const target = visibleActions.find((action) => !['completed', 'verified'].includes(action.status))
        if (target) {
          navigate(`/corrective-actions/${target.id}`)
          return
        }
        setTab('actions')
      },
      verifyActions: () => {
        const target = actions.find((action) => action.status === 'completed')
        if (target) {
          navigate(`/corrective-actions/${target.id}`)
          return
        }
        setTab('actions')
      },
      confirmRootCause: () => setTab('root'),
      closeDefect: () => {
        if (canCloseDefect) {
          closeDefect()
          return
        }
        setTab('root')
      }
    }
  })

  if (loading) return <LoadingState label="Loading defect details..." />
  if (!defect) return <div className="surface-card p-6 text-brand-muted">Defect not found.</div>

  return (
    <div className="space-y-6">
      <div className="text-sm text-brand-muted">
        <button
          type="button"
          onClick={() => navigate('/defects')}
          className="inline-flex items-center gap-1 hover:text-brand-ink hover:underline"
        >
          <ArrowLeft size={14} />
          Back to Defects
        </button>
      </div>

      <div className="surface-card-accent p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="page-eyebrow">Defect Record</p>
            <h1 className="mt-1 text-2xl font-bold text-brand-ink">{defect.defect_code} — {defect.defect_type}</h1>
            <p className="text-sm text-brand-muted">{defect.product_name} / {defect.batch_number}</p>
            <p className="text-sm text-brand-muted">Reported {formatDate(defect.created_at)}{defect.reported_by_name ? ` by ${defect.reported_by_name}` : ''}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button color="slate" variant="subtle" size="sm" onClick={handlePrintSummary} disabled={printingSummary}>
              <Printer size={14} /> {printingSummary ? 'Preparing…' : 'Print Summary'}
            </Button>
            {managerView && defect.defect_status === 'new' && (
              <Button size="sm" onClick={handleStartReview}>
                Start Review
              </Button>
            )}
            <StatusBadge
              value={defect.defect_status}
              prefix="Defect"
              title={managerView ? undefined : defectStatusBadgeTitle(defect.defect_status, workerHasAssignedAction)}
            />
            <StatusBadge
              value={defect.root_cause_status || 'pending_investigation'}
              prefix="Root Cause"
              kind="root_cause"
              audience={managerView ? undefined : 'worker'}
            />
            {defect.suspected_root_cause && defect.root_cause_status !== 'confirmed' && (
              <span className="rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-700">
                Suspected: {defect.suspected_root_cause}
              </span>
            )}
          </div>
        </div>
        <div className="mt-6 border-b border-brand-border/70 pb-4">
          <TabPills
            items={tabs.map(([value, label]) => ({ value, label }))}
            value={tab}
            onChange={setTab}
          />
        </div>

        <NextStepBanner workflow={workflow} activeTab={tab} onGoToTab={setTab} managerView={managerView} />

        {hasExpiryMismatch(defect) && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-900">
            <p className="font-semibold">Expiry date mismatch on this batch</p>
            <p className="mt-1">
              Expected expiry: <b>{formatDate(defect.correct_expiry_date)}</b> ·
              Printed expiry: <b>{formatDate(defect.printed_expiry_date)}</b>
            </p>
            <p className="mt-2 text-red-800">
              This matches Kak Norie&apos;s common issue — printed label differs from the correct retort-based expiry.
            </p>
          </div>
        )}

        {managerView && defect.defect_status === 'under_review' && actions.length === 0 && (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-950">
            <p className="font-semibold">
              {defect.reported_by_role === 'worker'
                ? 'Under review — worker report'
                : 'Under review'}
            </p>
            <p className="mt-1">
              {defect.reported_by_role === 'worker' ? (
                <>
                  Reported by <b>{defect.reported_by_name || 'worker'}</b>. Review the report details below and use the quick-assign options when you are ready.
                </>
              ) : (
                <>
                  Created by <b>{defect.reported_by_name || 'manager'}</b>. Review the defect details below before assigning from the Corrective Actions tab.
                </>
              )}
            </p>
            {defect.investigation_notes && (
              <p className="mt-2"><b>Worker&apos;s possible cause:</b> {defect.investigation_notes}</p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <Button color="amber" variant="subtle" onClick={() => setTab('actions')}>
                Review & Assign Actions
              </Button>
              {reporterIsWorker && getDefaultTask('product_handling') && (
                <Button color="amber" onClick={() => quickAssignToReporter('product_handling')}>
                  Assign Product Handling to {defect.reported_by_name}
                </Button>
              )}
              {reporterIsWorker && getDefaultTask('machine_process_check') && (
                <Button color="slate" onClick={() => quickAssignToReporter('machine_process_check')}>
                  Assign Machine Check to {defect.reported_by_name}
                </Button>
              )}
            </div>
          </div>
        )}

        {!managerView && workerReportedDefect && !workerHasAssignedAction && defect.defect_status !== 'closed' && (
          <div className="mt-4 rounded-2xl border border-brand-100 bg-brand-50 px-4 py-3 text-sm text-brand-ink">
            <p className="font-semibold">Report submitted — not a task yet</p>
            <p className="mt-1">
              You reported this defect. It is saved for your manager to review. Corrective actions must be assigned by the manager before anyone (including you) can start work on it.
            </p>
          </div>
        )}

        {tab === 'overview' && (
          managerView ? (
            <ManagerOverview
              defect={defect}
              managerView={managerView}
              showEditDetails={showEditDetails}
              setShowEditDetails={setShowEditDetails}
              onSavedDetails={load}
              workflowSteps={workflowSteps}
              verifiedActionCount={verifiedActionCount}
              totalActionCount={totalActionCount}
              actions={actions}
            />
          ) : (
            <WorkerOverview
              defect={defect}
              visibleActions={visibleActions}
              workflow={workflow}
              onStartAction={startAction}
              navigate={navigate}
            />
          )
        )}

        {tab === 'actions' && (
          <div className="mt-6 space-y-5">
            <div className="surface-card p-4">
              <h3 className="text-sm font-bold text-brand-ink">Why This Action Exists</h3>
              <p className="mt-3 text-sm text-brand-muted">{defect.description || 'No description provided.'}</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {managerView && canAssign && (
                <>
                  <Button onClick={() => openAssignModal('product_handling')}>
                    <Plus size={16} /> Assign Product Handling Action
                  </Button>

                  <Button color="slate" onClick={() => openAssignModal('machine_process_check')}>
                    <Plus size={16} /> Assign Machine / Process Check
                  </Button>

                  {reporterIsWorker && ['new', 'under_review'].includes(defect.defect_status) && actions.length === 0 && (
                    <Button color="amber" variant="subtle" onClick={() => openAssignModal('product_handling', defect.created_by)}>
                      <Plus size={16} /> Assign to Reporter ({defect.reported_by_name})
                    </Button>
                  )}
                </>
              )}
            </div>

            {managerView && workflow.isClosed && (
              <p className="text-sm text-brand-muted">New corrective actions cannot be assigned on a closed defect.</p>
            )}

            <div className="surface-card p-5">
              <h3 className="text-sm font-bold text-brand-ink">{managerView ? 'Assigned Actions' : 'My Work'}</h3>

              {visibleActions.length === 0 ? (
                <div className="mt-3 text-sm text-brand-muted">No actions assigned yet.</div>
              ) : (
                <div className="mt-3 space-y-3">
                  {visibleActions.map((action) => {
                    const verifyBlocked = action.evidenceRequired && !action.hasEvidence
                    return (
                    <div key={action.id} className="flex items-center justify-between gap-3 rounded-2xl border border-brand-border/70 bg-white p-4 shadow-sm">
                      <div>
                        <div className="font-bold text-brand-ink">{action.code}</div>
                        <div className="text-sm text-brand-muted">{action.task}</div>
                        <div className="mt-2 text-xs text-brand-muted">{action.assignedToName || '-'} • Due {action.dueDate || '-'}</div>
                        {!managerView && action.status === 'rejected' && (
                          <div className="mt-1 text-xs font-medium text-red-700">{rejectedActionHint(action)}</div>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge
                          kind="ca"
                          value={action.status}
                          audience={managerView ? undefined : 'worker'}
                          title={managerView ? getCaStatusExplanation(action.status) : undefined}
                        />
                        {isActionOverdue(action.dueDate, action.status) && (
                          <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">
                            Overdue
                          </span>
                        )}

                        <Button color="slate" variant="subtle" size="sm" onClick={() => navigate(`/corrective-actions/${action.id}`)}>
                          <Eye size={14} /> Open Action
                        </Button>

                        {action.status === 'assigned' && canManageAction(action) && !managerView && (
                          <Button size="sm" onClick={() => startAction(action.id)}>
                            <Play size={14} /> Start Action
                          </Button>
                        )}

                        {action.status === 'rejected' && canManageAction(action) && !managerView && (
                          <Button size="sm" onClick={() => startAction(action.id)}>
                            <Play size={14} /> Restart Action
                          </Button>
                        )}

                        {action.status === 'in_progress' && canManageAction(action) && !managerView && (
                          <Button size="sm" onClick={() => navigate(`/corrective-actions/${action.id}`)}>
                            <Save size={14} /> Complete Action
                          </Button>
                        )}

                        {action.status === 'completed' && managerView && (
                          <>
                            <Button color="red" size="sm" onClick={() => setRejectActionId(action.id)}>
                              <XCircle size={14} /> Reject Action
                            </Button>
                            <Button
                              color="green"
                              size="sm"
                              onClick={() => verifyAction(action.id)}
                              disabled={verifyBlocked}
                              title={verifyBlocked ? 'Evidence is required before verification.' : undefined}
                            >
                              <CheckCircle size={14} /> Verify Action
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'root' && (
          <div className="mt-6 space-y-5">
            <div className="surface-card p-5">
              <h3 className="font-bold text-brand-ink">Investigation Findings</h3>
              {completedFindings.length === 0 ? (
                <p className="mt-2 text-sm text-brand-muted">No completed investigation actions yet. Workers should complete machine/process checks before recording suspected root cause.</p>
              ) : (
                <div className="mt-3 space-y-3">
                  {completedFindings.map((action) => (
                    <div key={action.id} className="rounded-xl bg-brand-50/70 p-3">
                      <p className="font-semibold text-brand-ink">{action.task}</p>
                      <p className="text-sm text-brand-muted">Finding: {action.investigation_finding}</p>
                      <p className="text-sm text-brand-muted">Action Taken: {action.action_taken || '-'}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {defect.root_cause_status === 'confirmed' ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
                <h3 className="font-bold text-emerald-800">Root cause confirmed by manager</h3>
                <p className="mt-3 text-sm text-emerald-700"><b>Confirmed Root Cause:</b> {defect.confirmed_root_cause}</p>
                {defect.suspected_root_cause && (
                  <p className="text-sm text-emerald-700"><b>Worker Suspected:</b> {defect.suspected_root_cause}</p>
                )}
                <p className="text-sm text-emerald-700"><b>Confirmed by:</b> {defect.confirmed_by_name || '-'}</p>
                <p className="text-sm text-emerald-700"><b>Confirmed at:</b> {formatDate(defect.confirmed_date)}</p>
                {workflow.isClosed ? (
                  <ClosedDefectSummary defect={defect} users={users} />
                ) : managerView && (
                  <div className="mt-4 space-y-3">
                    {closeBlockers.length > 0 && (
                      <BlockerBanner
                        title="Before closing this defect:"
                        items={closeBlockers}
                        strongBorder
                      />
                    )}
                    <Button
                      color="green"
                      onClick={closeDefect}
                      disabled={!canCloseDefect}
                      title={!canCloseDefect ? (closeBlockers.length ? closeBlockers.join(' · ') : 'Complete all workflow steps before closing.') : undefined}
                    >
                      Close Defect
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <>
                {!managerView && workerHasAssignedAction && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-5 shadow-sm">
                    <h3 className="font-bold text-brand-ink">Record Suspected Root Cause</h3>
                    <p className="mt-2 text-sm text-brand-muted">Based on your investigation, record what you think caused this defect. The manager will review and confirm.</p>
                    <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                      <Select label="Suspected Root Cause" value={suspectedCause} onChange={setSuspectedCause} options={rootCauseOptions} required />
                      {suspectedCause === 'Other' && (
                        <Input label="Please specify suspected root cause" value={otherSuspectedCause} onChange={setOtherSuspectedCause} required />
                      )}
                    </div>
                    <TextArea
                      label="Investigation Notes"
                      value={investigationNotes}
                      onChange={setInvestigationNotes}
                      rows={3}
                    />
                    <Button color="amber" onClick={saveSuspectedRootCause} disabled={savingSuspected} className="mt-4">
                      {savingSuspected ? 'Saving...' : defect.suspected_root_cause ? 'Update Suspected Root Cause' : 'Save Suspected Root Cause'}
                    </Button>
                  </div>
                )}

                {defect.suspected_root_cause && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
                    <h3 className="font-bold text-amber-800">Current Suspected Root Cause</h3>
                    <p className="mt-2 text-sm text-amber-800"><b>Cause:</b> {defect.suspected_root_cause}</p>
                    <p className="text-sm text-amber-800"><b>Source:</b> {defect.suspected_root_cause_source || defect.defect_type}</p>
                    {defect.investigation_notes && (
                      <p className="mt-2 text-sm text-amber-800"><b>Notes:</b> {defect.investigation_notes}</p>
                    )}
                  </div>
                )}

                {managerView ? (
                  <div className="surface-card p-5">
                    <h3 className="font-bold text-brand-ink">Manager — Confirm Root Cause</h3>
                    <p className="mt-2 text-sm text-brand-muted">
                      {defect.suspected_root_cause
                        ? 'Review the worker\'s suspected cause below, then confirm or change it.'
                        : 'No suspected root cause recorded yet. You can still confirm based on investigation findings.'}
                    </p>
                    <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                      <Select label="Confirmed Root Cause" value={rootCause} onChange={setRootCause} options={rootCauseOptions} required />
                      {rootCause === 'Other' && (
                        <Input label="Please specify confirmed root cause" value={otherRootCause} onChange={setOtherRootCause} required />
                      )}
                    </div>
                    {confirmBlockers.length > 0 && (
                      <BlockerBanner
                        className="mt-4"
                        title="Confirm root cause is locked until:"
                        items={confirmBlockers}
                      />
                    )}
                    <Button
                      onClick={confirmRootCause}
                      disabled={!canConfirmRootCause}
                      className="mt-4"
                      title={!canConfirmRootCause ? (confirmBlockers.length ? confirmBlockers.join(' · ') : 'Root cause confirmation is not available yet.') : undefined}
                    >
                      Confirm Root Cause
                    </Button>
                  </div>
                ) : workerReportedDefect ? (
                  <div className="surface-card bg-brand-50/40 p-5 text-sm text-brand-muted">
                    Root cause will be confirmed by your manager after corrective actions are completed.
                    {defect.suspected_root_cause && (
                      <p className="mt-2"><b>Current suspected cause:</b> {defect.suspected_root_cause}</p>
                    )}
                  </div>
                ) : (
                  <div className="surface-card bg-brand-50/40 p-5 text-sm text-brand-muted">
                    Root cause recording is handled by workers assigned to this defect.
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {tab === 'activity' && (
          <div className="mt-6">
            <DefectActivityTimeline defectId={defect.id} />
          </div>
        )}
      </div>

      {assignModal && (
        <AssignActionModal
          defect={defect}
          rule={rule}
          workers={workers}
          users={users}
          assignedBy={user?.id}
          defaultType={assignModal.type}
          defaultAssigneeId={assignModal.assigneeId}
          defaultTask={assignModal.task}
          onClose={() => setAssignModal(null)}
          onAssigned={load}
        />
      )}
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

function Suggestion({ title, value }) {
  return <div className="surface-card p-4"><p className="text-xs font-bold uppercase text-brand-muted">{title}</p><p className="mt-2 font-semibold text-brand-ink">{value || '-'}</p></div>
}

