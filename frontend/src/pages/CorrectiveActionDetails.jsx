import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Printer, XCircle } from 'lucide-react'
import api from '../api/client'
import StatusBadge from '../components/StatusBadge'
import Button from '../components/Button'
import LoadingState from '../components/LoadingState'
import SectionCard from '../components/SectionCard'
import RejectActionModal from '../components/RejectActionModal'
import { isAssignedToUser, isManager } from '../utils/roleAccess'
import { validateHandledQuantities } from '../utils/lossService'
import { printCorrectiveActionSummary } from '../utils/correctiveActionExport'
import { isActionOverdue } from '../utils/dueDate'
import { formatExpiryDate, hasExpiryMismatch } from '../utils/expiry'

function titleCase(value) {
  if (!value) return '-'
  return String(value).replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function Info({ label, value }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase text-brand-muted">{label}</p>
      <p className="mt-1 text-sm font-semibold text-brand-ink">{value || '-'}</p>
    </div>
  )
}

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
  const [action, setAction] = useState(null)
  const [rule, setRule] = useState(null)
  const [users, setUsers] = useState([])
  const [saving, setSaving] = useState(false)
  const [savingDueDate, setSavingDueDate] = useState(false)
  const [dueDateDraft, setDueDateDraft] = useState('')
  const [editingDueDate, setEditingDueDate] = useState(false)
  const [showRejectModal, setShowRejectModal] = useState(false)
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
      const requests = [api.get(`/corrective-actions/${id}`)]
      if (isManager(user)) {
        requests.push(api.get('/users'))
      }

      const [actionRes, usersRes] = await Promise.all(requests)

      const loadedUsers = usersRes?.data?.data || []
      const loadedAction = normalizeAction(actionRes.data.data)

      setUsers(loadedUsers)
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
          alert('You do not have access to this corrective action.')
          navigate('/corrective-actions')
        }
      }
        qty_on_hold: 0,
      })

      const computedOnHold = Math.max(
        0,
        Number(action.qtyAffected || 0) - (
          Number(form.qty_relabelled || 0) +
          Number(form.qty_repacked || 0) +
          Number(form.qty_reworked || 0) +
          Number(form.qty_released || 0) +
          Number(form.qty_discarded || 0)
        )
      )
      console.error(error)
      alert('Could not load corrective action.')
      navigate('/corrective-actions')
    }
  }

  useEffect(() => {
    load()
  }, [id, user])

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function hasCompletionEvidence(targetAction = action, file = form.evidence_file) {
    if (!targetAction?.evidenceRequired) return true
    if (file) return true
    return Boolean(targetAction.evidence?.length)
            qty_on_hold: computedOnHold,

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

            qty_on_hold: Number(computedOnHold || 0)
    if (!form.investigation_finding.trim()) return alert('Investigation result is required.')
    if (!form.action_taken.trim()) return alert('Action taken is required.')
    if (!hasCompletionEvidence()) {
      showEvidenceRequiredError()
      return
    }

    setEvidenceError(false)

    if (action.type === 'product_handling') {
      const validation = validateHandledQuantities({
        qty_affected: action.qtyAffected,
        qty_relabelled: form.qty_relabelled,
        qty_repacked: form.qty_repacked,
        qty_reworked: form.qty_reworked,
        qty_discarded: form.qty_discarded,
        qty_on_hold: form.qty_on_hold,
        qty_released: form.qty_released
      })

      if (!validation.valid) {
        return alert(validation.message)
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
      navigate(`/defects/${action.defectId}`)
    } catch (error) {
      const message = error.response?.data?.message || 'Could not complete action.'
      if (action.evidenceRequired && /evidence/i.test(message)) {
        showEvidenceRequiredError()
      } else {
        alert(message)
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
      return alert('Evidence is required before verification.')
    }

    await api.patch(`/corrective-actions/${id}/verify`, {
      verified_by: user?.id || null
    })

    await load()
  }

  async function cancelAction() {
    const reason = window.prompt('Cancel this rejected action? Optional reason:')
    if (reason === null) return

    try {
      await api.patch(`/corrective-actions/${id}/cancel`, {
        cancellation_reason: reason.trim() || null
      })
      await load()
    } catch (error) {
      alert(error.response?.data?.message || 'Could not cancel action.')
    }
  }

  async function saveDueDate() {
    if (!dueDateDraft) return alert('Due date is required.')

    setSavingDueDate(true)
    try {
      await api.patch(`/corrective-actions/${id}/due-date`, { due_date: dueDateDraft })
      await load()
    } catch (error) {
      alert(error.response?.data?.message || 'Could not update due date.')
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
  // compute on-hold as remainder to match backend semantics
  const computedOnHold = action?.containmentStatus === 'No Hold Needed'
    ? 0
    : Math.max(
      0,
      affected - (
        Number(form.qty_relabelled || 0) +
        Number(form.qty_repacked || 0) +
        Number(form.qty_reworked || 0) +
        Number(form.qty_released || 0) +
        Number(form.qty_discarded || 0)
      )
    )

  const quantityValidation = action?.type === 'product_handling'
    ? validateHandledQuantities({
        qty_affected: affected,
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

  return (
    <div className="space-y-6">
      <div className="text-sm text-brand-muted">
        <button
          type="button"
          onClick={() => navigate('/corrective-actions')}
          className="inline-flex items-center gap-1 hover:text-brand-ink hover:underline"
        >
          <ArrowLeft size={14} />
          Back to Corrective Actions
        </button>
      </div>

      <div className="surface-card-accent p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="page-eyebrow">Corrective Action</p>
            <h1 className="mt-1 text-2xl font-bold text-brand-ink">{action.code}</h1>
            <p className="mt-1 text-sm text-brand-muted">{action.task}</p>
            <p className="text-sm text-brand-muted">
              {action.defectCode} · {action.productName || '-'} · Batch {action.batchNumber || '-'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button color="slate" variant="subtle" size="sm" onClick={() => printCorrectiveActionSummary(action)}>
              <Printer size={14} /> Print Summary
            </Button>
            <StatusBadge kind="ca" value={action.status} />
            {isActionOverdue(action.dueDate, action.status) && (
              <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
                Overdue
              </span>
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

        {managerView && action.status === 'completed' && (
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

        <div className="flex flex-wrap items-center gap-3">
          {['Pending', 'In Progress', 'Submitted', 'Verified'].map((label, idx) => {
            const statusOrder = ['assigned', 'in_progress', 'completed', 'verified']
            const mappedStatus = action.status === 'rejected' ? 'assigned' : action.status
            const currentIndex = statusOrder.indexOf(mappedStatus)
            const stepIndex = idx
            const done = stepIndex < currentIndex
            const active = stepIndex === currentIndex
            return (
              <div key={label} className="flex items-center gap-3">
                <div className="flex items-center">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm ${done ? 'bg-emerald-600 text-white' : active ? 'bg-brand-600 text-white' : 'bg-brand-100 text-brand-600'}`}>
                    {done ? '✓' : stepIndex + 1}
                  </div>
                  {idx < 3 && (
                    <div className={`ml-2 mr-2 h-1 w-16 md:w-20 ${stepIndex < currentIndex ? 'bg-emerald-300' : 'bg-brand-border'}`} />
                  )}
                </div>
                <div className="text-sm font-semibold text-brand-muted">{label}</div>
              </div>
            )
          })}
        </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-brand-100 bg-brand-50 p-4">
          <div className="mb-3 text-base font-bold text-brand-ink">Related Defect</div>
          <div className="space-y-3">
            <Info label="Defect ID" value={action.defectCode} />
            <Info label="Product" value={action.productName} />
            <Info label="Batch" value={action.batchNumber} />
          </div>
        </div>

        <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
          <div className="mb-3 text-base font-bold text-brand-ink">Task</div>
          <p className="text-sm font-semibold text-brand-ink">{action.task}</p>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <Info label="CA Priority" value={titleCase(action.priority)} />
            <div>
              <p className="text-[11px] font-semibold uppercase text-brand-muted">CA Due Date</p>
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
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
          <div className="mb-3 text-base font-bold text-brand-ink">{managerView ? 'Worker Responsibility' : 'Complete These 4 Steps'}</div>
          {managerView ? (
            <div className="space-y-2 text-sm text-brand-muted">
              <p>Assigned to <span className="font-semibold text-brand-ink">{action.assignedToName || '-'}</span></p>
              <p>Workers enter findings and evidence. Managers only review and verify or reject.</p>
            </div>
          ) : (
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
          )}
        </div>
      </div>

      <div className="pt-2">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_320px]">
          <SectionCard title="Completion / Investigation">
              {managerView && (
                <div className="mb-4 rounded-xl border border-brand-100 bg-brand-50 px-4 py-3 text-sm text-brand-700">
                  Read-only manager view. Findings are entered by <b>{action.assignedToName || 'the assigned worker'}</b>.
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
                    <div className="mb-3 flex justify-between text-sm font-semibold text-brand-ink">
                      <span>Qty Affected: {affected}</span>
                      <span className={!quantityValidation.valid ? 'text-red-600' : 'text-brand-muted'}>
                        Accounted: {accounted}
                      </span>
                    </div>
                    {!quantityValidation.valid && (
                      <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                        {quantityValidation.message}
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                      {[
                        ['qty_relabelled', 'Relabelled'],
                        ['qty_repacked', 'Repacked'],
                        ['qty_reworked', 'Reworked'],
                        ['qty_discarded', 'Discarded'],
                        ['qty_released', 'Released'],
                        ['qty_on_hold', 'On Hold']
                      ].map(([field, label]) => (
                        <label key={field} className="text-xs font-semibold text-brand-muted">
                          {label}
                          {field === 'qty_on_hold' ? (
                            <>
                              <input type="number" value={computedOnHold} readOnly className="field-control mt-1 bg-gray-50" />
                              <p className="text-[11px] text-brand-muted mt-1">Automatically calculated from other quantities — not editable</p>
                            </>
                          ) : (
                            <input type="number" value={form[field]} onChange={(e) => update(field, Number(e.target.value))} className="field-control mt-1" />
                          )}
                        </label>
                      ))}
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
                    <span className="field-label">Evidence Required</span>
                    <p className="mt-1 text-sm text-brand-muted">JPG, PNG, PDF. Max 5MB.</p>
                    <input
                      type="file"
                      className="mt-3 block w-full text-sm text-brand-muted"
                      onChange={(e) => handleEvidenceFileChange(e.target.files?.[0] || null)}
                      accept="image/*,.pdf"
                    />
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
                <p className="text-sm text-brand-muted">No findings submitted yet. Waiting for {action.assignedToName || 'assigned worker'} to complete this action.</p>
              )}
          </SectionCard>

          <div className="space-y-4">
              <SectionCard title="Action Information">
                <div className="space-y-3">
                  <Info label="Action ID" value={action.code} />
                  <Info label="Action Type" value={action.type === 'product_handling' ? 'Product Handling' : 'Corrective Action'} />
                  <Info label="Status" value={titleCase(action.status)} />
                </div>
              </SectionCard>

              <SectionCard title="Assignment">
                <div className="space-y-3">
                  <Info label="Assigned To" value={action.assignedToName} />
                  <Info label="Assigned On" value={action.created_at ? String(action.created_at).split('T')[0] : '-'} />
                </div>
              </SectionCard>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-brand-border/70 pt-4">
        <Button color="slate" variant="subtle" onClick={() => navigate(`/defects/${action.defectId}`)}>
          View Defect
        </Button>

        {managerView && action.status === 'completed' && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
            Manager review: use <b>Reject</b> or <b>Verify</b> below
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
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
              <Button color="green" onClick={verifyAction}>Verify</Button>
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
