import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Calendar, CalendarCheck, Clock, Eye, FileSearch, Flag, Link2, Printer, Search, User, XCircle } from 'lucide-react'
import api from '../api/client'
import StatusBadge from '../components/StatusBadge'
import Button from '../components/Button'
import LoadingState from '../components/LoadingState'
import SectionCard from '../components/SectionCard'
import RejectActionModal from '../components/RejectActionModal'
import FieldLabel from '../components/FieldLabel'
import { isAssignedToUser, isManager } from '../utils/roleAccess'
import { validateHandledQuantities } from '../utils/lossService'
import { getCaStatusExplanation } from '../utils/caStatusExplanation'
import { printCorrectiveActionSummary } from '../utils/correctiveActionExport'
import { isActionOverdue } from '../utils/dueDate'
import { formatExpiryDate, hasExpiryMismatch } from '../utils/expiry'
import useObjectUrl from '../utils/useObjectUrl'
import { useToast } from '../components/Toast'
import { usePrompt } from '../components/PromptDialog'

function titleCase(value) {
  if (!value) return '-'
  return String(value).replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

// The stepper (Pending/In Progress/Submitted/Verified) can only represent these four
// statuses. Rejected and cancelled actions fall outside that progression — rejected is
// remapped to look identical to "assigned" in the stepper, and cancelled lights up no
// step at all — so the header badge stays visible for those two as the only place that
// distinguishes them.
const STEPPER_REPRESENTABLE_STATUSES = ['assigned', 'in_progress', 'completed', 'verified']

function normalizeAction(row) {
  return {
    ...row,
    id: row.id,
    code: row.action_code,
    defectCode: row.defect_code,
    defectId: row.defect_id,
    defectType: row.defect_type,
    defectStatus: row.defect_status,
    type: row.action_type,
    task: row.task,
    assignedToName: row.assigned_to_name,
    dueDate: row.due_date ? String(row.due_date).split('T')[0] : null,
    priority: row.priority,
    status: row.ca_status,
    assignedTo: row.assigned_to,
    evidenceRequired: row.evidence_required,
    evidence: row.evidence || [],
    qtyAffected: Number(row.qty_affected || 0),
    containmentStatus: row.defect_containment_status || row.containment_status || null,
    productName: row.product_name,
    batchNumber: row.batch_number,
    defectDescription: row.defect_description,
    correctExpiryDate: row.correct_expiry_date ? String(row.correct_expiry_date).split('T')[0] : null,
    printedExpiryDate: row.printed_expiry_date ? String(row.printed_expiry_date).split('T')[0] : null,
    qtyRelabelled: Number(row.qty_relabelled || 0),
    qtyRepacked: Number(row.qty_repacked || 0),
    qtyReworked: Number(row.qty_reworked || 0),
    qtyDiscarded: Number(row.qty_discarded || 0),
    qtyReleased: Number(row.qty_released || 0),
    qtyOnHold: Number(row.qty_on_hold || 0),
    // Already consumed by OTHER actions on this same defect (this action's own
    // contribution isn't added to the defect until it completes), so the
    // completion form can validate against remaining capacity instead of the
    // defect's full qty_affected -- see completeCorrectiveAction's cumulative check.
    handledByOtherActions: Number(row.defect_qty_relabelled || 0) +
      Number(row.defect_qty_repacked || 0) +
      Number(row.defect_qty_reworked || 0) +
      Number(row.defect_qty_released || 0) +
      Number(row.defect_qty_discarded || 0),
    calculatedLoss: row.calculated_loss != null ? Number(row.calculated_loss) : null,
    investigationFinding: row.investigation_finding,
    actionTaken: row.action_taken,
    completionNotes: row.completion_notes,
    relatedToolChecked: row.related_tool_machine_checked,
    rejectionReason: row.rejection_reason,
    rejectedByName: row.rejected_by_name,
    rejectedDate: row.rejected_date ? String(row.rejected_date).split('T')[0] : null,
    created_at: row.created_at
  }
}

const WORKER_STATUS_GUIDE_STYLES = {
  brand: 'border-brand-100 bg-brand-50 text-brand-700',
  amber: 'border-amber-200 bg-amber-50 text-amber-900',
  emerald: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  red: 'border-red-200 bg-red-50 text-red-800'
}

function getWorkerActionStatusGuide(status) {
  const guides = {
    assigned: {
      tone: 'brand',
      current: 'Assigned',
      next: 'Click "Start Action" to begin this corrective action.'
    },
    in_progress: {
      tone: 'brand',
      current: 'In Progress',
      next: 'Complete the action and submit findings.'
    },
    completed: {
      tone: 'amber',
      current: 'Submitted',
      next: 'Waiting for manager verification.'
    },
    verified: {
      tone: 'emerald',
      current: 'Verified',
      next: 'No further worker action required.'
    },
    rejected: {
      tone: 'red',
      current: 'Rejected',
      next: 'Restart the action, correct the issue, and resubmit.'
    }
  }

  return guides[status] || null
}

function WorkerActionStatusGuide({ status, rejectionReason, rejectedByName, rejectedDate }) {
  const guide = getWorkerActionStatusGuide(status)
  if (!guide) return null

  return (
    <div className={`mb-4 rounded-2xl border px-4 py-3 text-sm ${WORKER_STATUS_GUIDE_STYLES[guide.tone]}`}>
      <p>
        <span className="font-semibold">Current Status:</span>{' '}
        {guide.current}
      </p>
      <p className="mt-1">
        <span className="font-semibold">Next Step:</span>{' '}
        {guide.next}
      </p>
      {status === 'rejected' && (
        <>
          <p className="mt-2"><span className="font-semibold">Reason:</span> {rejectionReason || '-'}</p>
          <p className="mt-1">
            <span className="font-semibold">Rejected by:</span> {rejectedByName || '-'}
            {rejectedDate ? ` on ${rejectedDate}` : ''}
          </p>
        </>
      )}
    </div>
  )
}

export default function CorrectiveActionDetails({ user }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const prompt = usePrompt()
  const [action, setAction] = useState(null)
  const [rule, setRule] = useState(null)
  const [saving, setSaving] = useState(false)
  const [savingDueDate, setSavingDueDate] = useState(false)
  const [dueDateDraft, setDueDateDraft] = useState('')
  const [editingDueDate, setEditingDueDate] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [evidenceError, setEvidenceError] = useState(false)
  const evidenceSectionRef = useRef(null)
  const [form, setForm] = useState({
    investigation_finding: '',
    action_taken: '',
    related_tool_machine_checked: '',
    completion_notes: '',
    evidence_file: null,
    qty_relabelled: 0,
    qty_repacked: 0,
    qty_reworked: 0,
    qty_discarded: 0,
    qty_released: 0,
    qty_on_hold: 0
  })

  async function load() {
    try {
      const actionRes = await api.get(`/corrective-actions/${id}`)
      const loadedAction = normalizeAction(actionRes.data.data)

      setAction(loadedAction)
      setDueDateDraft(loadedAction.dueDate || '')
      setEditingDueDate(false)

      if (loadedAction.defectType) {
        const ruleRes = await api.get(`/defects/rules/by-type/${encodeURIComponent(loadedAction.defectType)}`)
        setRule(ruleRes.data.data)
      }

      setForm((current) => ({
        ...current,
        qty_on_hold: loadedAction.type === 'product_handling' ? Number(loadedAction.qtyAffected || 0) : 0
      }))

      if (!isManager(user)) {
        if (!isAssignedToUser(loadedAction, user?.id)) {
          toast.error('You do not have access to this corrective action.')
          navigate('/corrective-actions')
        }
      }
    } catch (error) {
      console.error(error)
      toast.error('Could not load corrective action.')
      navigate('/corrective-actions')
    }
  }

  useEffect(() => {
    load()
  }, [id, user])

  const evidencePreviewUrl = useObjectUrl(form.evidence_file)

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function hasCompletionEvidence(targetAction = action, file = form.evidence_file) {
    if (!targetAction?.evidenceRequired) return true
    if (file) return true
    return Boolean(targetAction.evidence?.length)
  }

  function showEvidenceRequiredError() {
    setEvidenceError(true)
    evidenceSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  function handleEvidenceFileChange(file) {
    update('evidence_file', file)
    if (file) setEvidenceError(false)
  }

  async function uploadEvidence() {
    if (!form.evidence_file) return

    const fd = new FormData()
    fd.append('evidence', form.evidence_file)
    fd.append('evidence_note', 'Action evidence uploaded during completion')

    await api.post(`/corrective-actions/${id}/evidence`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  }

  async function completeAction() {
    if (!form.investigation_finding.trim()) return toast.warning('Investigation result is required.')
    if (!form.action_taken.trim()) return toast.warning('Action taken is required.')
    if (!hasCompletionEvidence()) {
      showEvidenceRequiredError()
      return
    }

    setEvidenceError(false)

    const remainingCapacity = Math.max(0, Number(action.qtyAffected || 0) - Number(action.handledByOtherActions || 0))

    const computedOnHold = action?.containmentStatus === 'No Hold Needed'
      ? 0
      : Math.max(
        0,
        remainingCapacity - (
          Number(form.qty_relabelled || 0) +
          Number(form.qty_repacked || 0) +
          Number(form.qty_reworked || 0) +
          Number(form.qty_released || 0) +
          Number(form.qty_discarded || 0)
        )
      )

    if (action.type === 'product_handling') {
      const validation = validateHandledQuantities({
        qty_affected: remainingCapacity,
        qty_relabelled: form.qty_relabelled,
        qty_repacked: form.qty_repacked,
        qty_reworked: form.qty_reworked,
        qty_discarded: form.qty_discarded,
        qty_on_hold: computedOnHold,
        qty_released: form.qty_released
      })

      if (!validation.valid) {
        return toast.warning(validation.message)
      }
    }

    setSaving(true)
    try {
      await uploadEvidence()

      await api.patch(`/corrective-actions/${id}/complete`, {
        completed_by: user?.id || null,
        investigation_finding: form.investigation_finding,
        action_taken: form.action_taken,
        related_tool_machine_checked: form.related_tool_machine_checked,
        completion_notes: form.completion_notes,
        qty_relabelled: Number(form.qty_relabelled || 0),
        qty_repacked: Number(form.qty_repacked || 0),
        qty_reworked: Number(form.qty_reworked || 0),
        qty_discarded: Number(form.qty_discarded || 0),
        qty_released: Number(form.qty_released || 0),
        qty_on_hold: Number(computedOnHold || 0)
      })

      await load()
      toast.success(form.evidence_file ? 'Action completed successfully. Evidence uploaded.' : 'Action completed successfully.')
      navigate(`/defects/${action.defectId}`)
    } catch (error) {
      const message = error.response?.data?.message || 'Could not complete action.'
      if (action.evidenceRequired && /evidence/i.test(message)) {
        showEvidenceRequiredError()
      } else {
        toast.error(message)
      }
    } finally {
      setSaving(false)
    }
  }

  async function startAction() {
    await api.patch(`/corrective-actions/${id}/start`, { started_by: user?.id || null })
    await load()
  }

  async function verifyAction() {
    if (action.evidenceRequired && (!action.evidence || action.evidence.length === 0)) {
      return toast.warning('Evidence is required before verification.')
    }

    setIsVerifying(true)
    try {
      await api.patch(`/corrective-actions/${id}/verify`, {
        verified_by: user?.id || null
      })
      await load()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not verify action.')
    } finally {
      setIsVerifying(false)
    }
  }

  async function cancelAction() {
    const reason = await prompt({
      title: 'Cancel this action?',
      message: 'Cancel this rejected action? Optional reason:',
      placeholder: 'Optional reason...',
      confirmLabel: 'Cancel Action'
    })
    if (reason === null) return

    try {
      await api.patch(`/corrective-actions/${id}/cancel`, {
        cancellation_reason: reason.trim() || null
      })
      await load()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not cancel action.')
    }
  }

  async function saveDueDate() {
    if (!dueDateDraft) return toast.warning('Due date is required.')

    setSavingDueDate(true)
    try {
      await api.patch(`/corrective-actions/${id}/due-date`, { due_date: dueDateDraft })
      await load()
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not update due date.')
    } finally {
      setSavingDueDate(false)
    }
  }

  if (!action) return <LoadingState label="Loading corrective action..." />

  const currentUser = user
  const managerView = isManager(user)
  const canEditDueDate = managerView
    && action.defectStatus !== 'closed'
    && action.status !== 'verified'
  const isAssignee = isAssignedToUser(action, currentUser?.id)
  const canWorkerEdit = !managerView && isAssignee && (action.status === 'in_progress' || action.status === 'rejected')
  const hasSubmittedFindings = Boolean(
    action.investigationFinding || action.actionTaken || action.completionNotes || action.relatedToolChecked
  )
  const affected = Number(action.qtyAffected || 0)
  const handledByOtherActions = Number(action.handledByOtherActions || 0)
  // Other actions on this same defect may have already accounted for part of qty_affected;
  // validate this action's own form against what's left, matching the backend's cumulative check.
  const remainingCapacity = Math.max(0, affected - handledByOtherActions)
  // compute on-hold as remainder to match backend semantics
  const computedOnHold = action?.containmentStatus === 'No Hold Needed'
    ? 0
    : Math.max(
      0,
      remainingCapacity - (
        Number(form.qty_relabelled || 0) +
        Number(form.qty_repacked || 0) +
        Number(form.qty_reworked || 0) +
        Number(form.qty_released || 0) +
        Number(form.qty_discarded || 0)
      )
    )

  const quantityValidation = action?.type === 'product_handling'
    ? validateHandledQuantities({
        qty_affected: remainingCapacity,
        qty_relabelled: form.qty_relabelled,
        qty_repacked: form.qty_repacked,
        qty_reworked: form.qty_reworked,
        qty_discarded: form.qty_discarded,
        qty_on_hold: computedOnHold,
        qty_released: form.qty_released
      })
    : { valid: true, totalHandled: 0 }
  const accounted = quantityValidation.totalHandled ?? 0
  const isClosedDefect = action.defectStatus === 'closed'
  const isActionResolved = ['completed', 'verified', 'rejected'].includes(action.status)

  return (
    <div className="space-y-6">
      <div className="sticky top-16 z-10 flex flex-wrap items-center justify-between gap-3 bg-softBg py-2 text-sm text-brand-muted">
        <button
          type="button"
          onClick={() => navigate('/corrective-actions')}
          className="inline-flex items-center gap-1 hover:text-brand-ink hover:underline"
        >
          <ArrowLeft size={14} />
          Back to {managerView ? 'Corrective Actions' : 'My Work'}
        </button>
        {isActionOverdue(action.dueDate, action.status) && (
          <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
            Overdue
          </span>
        )}
      </div>

      <div className="surface-card-accent p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="page-eyebrow">{managerView ? 'Corrective Action' : 'My Work'}</p>
            <h1 className="mt-1 text-2xl font-bold text-brand-ink">{action.code}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button color="slate" variant="subtle" size="sm" onClick={() => printCorrectiveActionSummary(action, managerView ? 'manager' : 'worker')}>
              <Printer size={14} /> Print Summary
            </Button>
            {!STEPPER_REPRESENTABLE_STATUSES.includes(action.status) && (
              <StatusBadge
                kind="ca"
                value={action.status}
                audience={managerView ? undefined : 'worker'}
                title={managerView ? getCaStatusExplanation(action.status) : undefined}
              />
            )}
          </div>
        </div>

        <div className="mt-6">
        {hasExpiryMismatch(action) && (
          <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-900">
            <p className="font-semibold">Expiry date mismatch on batch {action.batchNumber}</p>
            <p className="mt-1">
              Expected expiry: <b>{formatExpiryDate(action.correctExpiryDate)}</b> ·
              Printed expiry: <b>{formatExpiryDate(action.printedExpiryDate)}</b>
            </p>
          </div>
        )}

        {managerView && action.status === 'completed' && !isClosedDefect && (
          <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Verify or reject this action here, or return to{' '}
            <button
              type="button"
              className="font-semibold text-brand-700 underline hover:text-brand-900"
              onClick={() => navigate(`/defects/${action.defectId}?tab=actions`)}
            >
              {action.defectCode} defect page
            </button>
            .
          </div>
        )}

        {!managerView && isAssignee && (
          <WorkerActionStatusGuide
            status={action.status}
            rejectionReason={action.rejectionReason}
            rejectedByName={action.rejectedByName}
            rejectedDate={action.rejectedDate}
          />
        )}

        {isClosedDefect && (
          <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-800">
            <p className="font-semibold text-slate-900">This defect has been successfully closed.</p>
            <p className="mt-1">No further actions or modifications are allowed.</p>
          </div>
        )}

        <div className="flex items-start">
          {['Pending', 'In Progress', 'Submitted', 'Verified'].map((label, idx) => {
            const statusOrder = ['assigned', 'in_progress', 'completed', 'verified']
            const mappedStatus = action.status === 'rejected' ? 'assigned' : action.status
            const currentIndex = statusOrder.indexOf(mappedStatus)
            const stepIndex = idx
            const done = stepIndex < currentIndex
            const active = stepIndex === currentIndex
            return (
              <div key={label} className={`flex items-center ${idx < 3 ? 'flex-1' : ''}`}>
                <div className="flex flex-col items-center">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${done ? 'bg-emerald-600 text-white' : active ? 'bg-brand-600 text-white' : 'bg-brand-100 text-brand-600'}`}>
                    {done ? '✓' : stepIndex + 1}
                  </div>
                  <div className="mt-2 text-xs font-semibold text-brand-muted">{label}</div>
                </div>
                {idx < 3 && (
                  <div className={`mx-2 h-1 flex-1 rounded-full ${stepIndex < currentIndex ? 'bg-emerald-300' : 'bg-brand-border'}`} />
                )}
              </div>
            )
          })}
        </div>

        <div className="mt-6 border-t border-brand-border/60 pt-4">
          <p className="text-[11px] font-semibold uppercase text-brand-muted">Action Type</p>
          <p className="mt-1 text-sm font-semibold text-brand-ink">{action.type === 'product_handling' ? 'Product Handling' : 'Corrective Action'}</p>
          <p className="mt-3 text-sm text-brand-ink">{action.task}</p>
          <p className="mt-2 flex items-center gap-1.5 text-sm text-brand-muted">
            <Link2 size={14} className="shrink-0" />
            Related Defect: {action.defectCode} · {action.productName || '-'} · Batch {action.batchNumber || '-'}
          </p>
        </div>
        </div>
      </div>

      <div className="surface-card p-5">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          <div className="flex items-start gap-2">
            <Flag size={16} className="mt-0.5 shrink-0 text-brand-muted" />
            <div>
              <p className="text-[11px] font-semibold uppercase text-brand-muted">Priority</p>
              <p className="mt-1 text-sm font-semibold text-brand-ink">{titleCase(action.priority)}</p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Calendar size={16} className="mt-0.5 shrink-0 text-brand-muted" />
            <div>
              <p className="text-[11px] font-semibold uppercase text-brand-muted">Due Date</p>
              {canEditDueDate && editingDueDate ? (
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <input
                    type="date"
                    value={dueDateDraft}
                    onChange={(e) => setDueDateDraft(e.target.value)}
                    className="field-control w-auto"
                  />
                  <Button size="sm" color="blue" onClick={saveDueDate} disabled={savingDueDate}>
                    {savingDueDate ? 'Saving...' : 'Save'}
                  </Button>
                  <Button size="sm" color="slate" variant="subtle" onClick={() => { setDueDateDraft(action.dueDate || ''); setEditingDueDate(false) }}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-brand-ink">{action.dueDate || '-'}</p>
                  {canEditDueDate && (
                    <Button size="sm" color="slate" variant="subtle" onClick={() => setEditingDueDate(true)}>
                      Edit
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-start gap-2">
            <User size={16} className="mt-0.5 shrink-0 text-brand-muted" />
            <div>
              <p className="text-[11px] font-semibold uppercase text-brand-muted">Assigned To</p>
              <p className="mt-1 text-sm font-semibold text-brand-ink">{action.assignedToName || '-'}</p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <CalendarCheck size={16} className="mt-0.5 shrink-0 text-brand-muted" />
            <div>
              <p className="text-[11px] font-semibold uppercase text-brand-muted">Assigned On</p>
              <p className="mt-1 text-sm font-semibold text-brand-ink">{action.created_at ? String(action.created_at).split('T')[0] : '-'}</p>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Clock size={16} className="mt-0.5 shrink-0 text-brand-muted" />
            <div>
              <p className="text-[11px] font-semibold uppercase text-brand-muted">Last Updated</p>
              <p className="mt-1 text-sm font-semibold text-brand-ink">{action.updated_at ? String(action.updated_at).split('T')[0] : '-'}</p>
            </div>
          </div>
        </div>
      </div>

      {!managerView && (
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
          <div className="mb-3 text-base font-bold text-brand-ink">Complete These 4 Steps</div>
          <ul className="space-y-2 text-sm text-brand-muted">
            {[
              'Enter Investigation Result',
              'Enter Action Taken',
              action.evidenceRequired ? 'Upload Evidence' : 'Evidence Not Required',
              'Submit Completion'
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-3">
                <div className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-emerald-600 text-xs text-white">{i + 1}</div>
                <div>{item}</div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="pt-2">
        <div className="grid grid-cols-1 gap-4">
          <SectionCard
            title={(
              <span className="inline-flex items-center gap-2">
                <Search size={16} className="text-brand-muted" />
                Investigation / Completion
              </span>
            )}
          >
              {managerView && (
                <div className="mb-4 rounded-xl border border-brand-100 bg-brand-50 px-4 py-3 text-sm text-brand-700">
                  Read-only manager view. Findings are entered by <b>the assigned worker</b>.
                </div>
              )}

              {canWorkerEdit ? (
              <div className="space-y-4">
                <label className="block">
                  <span className="field-label">Investigation Result <span className="text-red-500">*</span></span>
                  <textarea value={form.investigation_finding} onChange={(e) => update('investigation_finding', e.target.value)} placeholder="Enter investigation result" rows={3} className="field-control min-h-[84px]" />
                </label>

                <label className="block">
                  <span className="field-label">Action Taken <span className="text-red-500">*</span></span>
                  <textarea value={form.action_taken} onChange={(e) => update('action_taken', e.target.value)} placeholder="Enter action taken" rows={4} className="field-control min-h-[96px]" />
                </label>

                <label className="block">
                  <span className="field-label">Related Tool / Area Checked</span>
                  {rule?.related_tool_options?.length ? (
                    <select value={form.related_tool_machine_checked} onChange={(e) => update('related_tool_machine_checked', e.target.value)} className="field-control">
                      <option value="">Select</option>
                      {rule.related_tool_options.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  ) : (
                    <input value={form.related_tool_machine_checked} onChange={(e) => update('related_tool_machine_checked', e.target.value)} className="field-control" />
                  )}
                </label>

                {action.type === 'product_handling' && (
                  <div className="rounded-2xl border border-brand-border bg-brand-50/60 p-4">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm font-semibold text-brand-ink">
                      <span
                        className={
                          !quantityValidation.valid
                            ? 'text-red-600'
                            : accounted === remainingCapacity
                              ? 'text-emerald-700'
                              : 'text-amber-700'
                        }
                      >
                        Units Handled:{' '}
                        {Number(form.qty_relabelled || 0) +
                          Number(form.qty_repacked || 0) +
                          Number(form.qty_reworked || 0) +
                          Number(form.qty_released || 0) +
                          Number(form.qty_discarded || 0)}{' '}
                        / {remainingCapacity} affected
                      </span>
                    </div>
                    {handledByOtherActions > 0 && (
                      <p className="mb-3 text-xs text-brand-muted">
                        {handledByOtherActions} of {affected} units on this defect are already accounted for by other corrective actions — {remainingCapacity} remain for this action.
                      </p>
                    )}
                    {!quantityValidation.valid && (
                      <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                        {quantityValidation.message}
                      </div>
                    )}
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-muted">
                        How units were handled
                      </p>
                      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                        {[
                          ['qty_relabelled', 'Relabelled'],
                          ['qty_repacked', 'Repacked'],
                          ['qty_reworked', 'Reworked'],
                          ['qty_discarded', 'Discarded'],
                          ['qty_released', 'Released']
                        ].map(([field, label]) => (
                          <label key={field} className="text-xs font-semibold text-brand-muted">
                            {label}
                            <input
                              type="number"
                              value={form[field]}
                              onChange={(e) => update(field, Number(e.target.value))}
                              className="field-control mt-1"
                            />
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="mt-4 rounded-xl border border-brand-border/70 bg-white/70 p-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-muted">
                        Remaining on hold (calculated)
                      </p>
                      {action.containmentStatus === 'No Hold Needed' ? (
                        <p className="mb-2 text-xs font-medium text-amber-700">
                          Remaining unaccounted: {remainingCapacity - accounted}
                        </p>
                      ) : (
                        <p className="mb-2 text-xs font-medium text-brand-ink">
                          On Hold (auto-calculated): {computedOnHold}
                        </p>
                      )}
                      <label className="text-xs font-semibold text-brand-muted">
                        On Hold
                        <input
                          type="number"
                          value={computedOnHold}
                          readOnly
                          className="field-control mt-1 bg-gray-50"
                        />
                        <p className="mt-1 text-[11px] text-brand-muted">
                          Automatically calculated from other quantities — not editable
                        </p>
                      </label>
                    </div>
                  </div>
                )}

                <label className="block">
                  <span className="field-label">Completion Notes</span>
                  <textarea value={form.completion_notes} onChange={(e) => update('completion_notes', e.target.value)} placeholder="Enter completion notes (optional)" rows={3} className="field-control min-h-[72px]" />
                </label>

                {action.evidenceRequired && (
                  <div
                    ref={evidenceSectionRef}
                    className={[
                      'rounded-xl border p-4',
                      evidenceError ? 'border-red-300 bg-red-50/60' : 'border-brand-border/70 bg-white'
                    ].join(' ')}
                  >
                    <FieldLabel label="Evidence Required" required={action.evidenceRequired} />
                    <p className="mt-1 text-sm text-brand-muted">JPG, PNG, PDF. Max 5MB.</p>
                    <input
                      type="file"
                      className="mt-3 block w-full text-sm text-brand-muted"
                      onChange={(e) => handleEvidenceFileChange(e.target.files?.[0] || null)}
                      accept="image/*,.pdf"
                    />
                    {evidencePreviewUrl && (
                      <img
                        src={evidencePreviewUrl}
                        alt="Selected evidence preview"
                        className="mt-2 h-24 w-24 rounded-lg border border-brand-border object-cover"
                      />
                    )}
                    {form.evidence_file && !evidencePreviewUrl && (
                      <p className="mt-2 text-sm text-brand-muted">{form.evidence_file.name}</p>
                    )}
                    {evidenceError && (
                      <p className="mt-2 text-sm font-medium text-red-700" role="alert">
                        Evidence is required before completion.
                      </p>
                    )}
                  </div>
                )}
              </div>
              ) : hasSubmittedFindings ? (
                <div className="space-y-3 text-sm text-brand-muted">
                  <div><span className="font-semibold text-brand-ink">Investigation Result:</span> {action.investigationFinding || '-'}</div>
                  <div><span className="font-semibold text-brand-ink">Action Taken:</span> {action.actionTaken || '-'}</div>
                  <div><span className="font-semibold text-brand-ink">Related Tool / Area Checked:</span> {action.relatedToolChecked || '-'}</div>
                  <div><span className="font-semibold text-brand-ink">Completion Notes:</span> {action.completionNotes || '-'}</div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
                  <FileSearch size={40} className="text-brand-muted/50" />
                  <div>
                    <p className="text-sm font-semibold text-brand-ink">No findings submitted yet.</p>
                    <p className="mt-1 text-sm text-brand-muted">Waiting for the assigned worker to complete this action.</p>
                  </div>
                </div>
              )}
          </SectionCard>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-brand-border/70 pt-4">
        {managerView && action.status === 'completed' && !isClosedDefect && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
            Manager review: use <b>Reject</b> or <b>Verify</b> below
          </div>
        )}

        <div className="ml-auto flex flex-wrap items-center gap-3">
          <Button
            color={isActionResolved ? 'brand' : 'slate'}
            variant="subtle"
            size="sm"
            onClick={() => navigate(
              isActionResolved
                ? `/defects/${action.defectId}?tab=root-cause`
                : `/defects/${action.defectId}`
            )}
          >
            <Eye size={14} /> {isActionResolved ? 'Go to Investigation' : 'View Defect'}
          </Button>
          {!managerView && isAssignee && !isClosedDefect && (action.status === 'assigned' || action.status === 'rejected') && (
            <Button onClick={startAction}>
              {action.status === 'rejected' ? 'Restart Action' : 'Start Action'}
            </Button>
          )}

          {!managerView && isAssignee && !isClosedDefect && action.status === 'in_progress' && (
            <Button onClick={completeAction} disabled={saving} size="lg">{saving ? 'Saving...' : 'Mark as Completed'}</Button>
          )}

          {managerView && action.status === 'completed' && !isClosedDefect && (
            <>
              <Button color="red" onClick={() => setShowRejectModal(true)}>
                <XCircle size={16} /> Reject
              </Button>
              <Button color="green" onClick={verifyAction} disabled={isVerifying}>
                {isVerifying ? 'Verifying...' : 'Verify'}
              </Button>
            </>
          )}

          {managerView && action.status === 'rejected' && !isClosedDefect && (
            <Button color="slate" variant="subtle" onClick={cancelAction}>
              Cancel Action
            </Button>
          )}
        </div>
      </div>

      {showRejectModal && (
        <RejectActionModal
          actionId={id}
          managerId={isManager(user) ? user.id : null}
          onClose={() => setShowRejectModal(false)}
          onRejected={load}
        />
      )}
    </div>
  )
}
