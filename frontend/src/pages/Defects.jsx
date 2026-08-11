import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AlertTriangle, Eye, FileWarning, FolderOpen, Layers, Plus, Search, SearchCheck } from 'lucide-react'
import api from '../api/client'
import DefectRecordCard from '../components/DefectRecordCard'
import ListPagination from '../components/ListPagination'
import PageHeader from '../components/PageHeader'
import KPICard from '../components/KPICard'
import Button from '../components/Button'
import BaseModal from '../components/BaseModal'
import EmptyState from '../components/EmptyState'
import LoadingState from '../components/LoadingState'
import NotificationCard from '../components/NotificationCard'
import { isManager } from '../utils/roleAccess'
import { paginateItems } from '../utils/pagination'
import {
  compareDefectsForReviewUrgency,
  DEFECT_PRIORITY_OPTIONS,
  formatDefectPriorityLabel,
  formatReviewDueDate,
  formatUrgentReviewCountSummary,
  hasUrgentReviewAttention,
  mapRecommendedPriority,
  matchesUrgentReviewFilter,
  summarizeUrgentReviewAttention,
  todayDateString
} from '../utils/defectReviewDue'
import ListDateFilter from '../components/ListDateFilter'
import ListCsvExport from '../components/ListCsvExport'
import {
  DEFECT_REPORTED_DATE_OPTIONS,
  getDateFilterLabel,
  matchesReportedDateFilter
} from '../utils/dateFilters'
import { matchesAttentionCreatedPeriod, parseAttentionPeriod } from '../utils/attentionNavigation'
import { hasExpiryMismatch } from '../utils/expiry'

function formatDate(value) {
  if (!value) return '-'
  return String(value).split('T')[0]
}

function titleCase(value) {
  if (!value) return '-'
  return String(value).replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function normalizeDefect(row) {
  return {
    ...row,
    id: row.id ?? row.defect_id,
    code: row.defect_code,
    productName: row.product_name,
    productCode: row.product_code,
    batchNumber: row.batch_number,
    defectType: row.defect_type,
    detectedStage: row.detected_at_stage,
    problemLevel: row.problem_level,
    priority: row.priority,
    reviewDueDate: formatReviewDueDate(row.review_due_date),
    urgencyReason: row.urgency_reason,
    qtyAffected: Number(row.qty_affected || 0),
    qtyOnHold: Number(row.qty_on_hold || 0),
    qtyDiscarded: Number(row.qty_discarded || 0),
    lossStatus: row.loss_status || '-',
    status: row.defect_status,
    containmentStatus: row.containment_status,
    suggestedProductHandling: row.suggested_product_handling,
    suggestedMachineHandling: row.suggested_machine_handling,
    relatedToolMachine: row.related_tool_machine,
    description: row.description,
    createdAt: formatDate(row.created_at),
    createdBy: row.created_by,
    reportedByName: row.reported_by_name,
    reportedByRole: row.reported_by_role ?? row.reportedByRole,
    actionProgress: row.action_progress || 'No actions'
  }
}

function normalizeProduct(row) {
  return {
    id: row.id ?? row.product_id,
    name: row.product_name,
    code: row.product_code,
    lossRate: Number(row.loss_rate_per_unit ?? row.product_loss_rate ?? 0)
  }
}

function normalizeBatch(row) {
  return {
    id: row.id ?? row.batch_id,
    productId: row.product_id,
    batchNumber: row.batch_number,
    productName: row.product_name,
    quantityProduced: Number(row.quantity_produced || 0),
    productionDate: formatDate(row.production_date),
    retortDate: formatDate(row.retort_date),
    expectedExpiry: formatDate(row.correct_expiry_date),
    printedExpiry: formatDate(row.printed_expiry_date),
    batchStatus: row.batch_status
  }
}

function KpiCard({ label, value, subtitle, active, onClick, highlight, icon, tone = 'brand' }) {
  return (
    <KPICard
      title={label}
      value={value}
      subtitle={subtitle}
      icon={icon}
      tone={tone}
      active={active}
      highlight={highlight}
      onClick={onClick}
    />
  )
}

const URGENCY_FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'urgent_review', label: 'Urgent / Due Review' }
]

const DEFECT_EXPORT_COLUMNS = [
  { key: 'code', label: 'Defect Code' },
  { key: 'productName', label: 'Product' },
  { key: 'batchNumber', label: 'Batch' },
  { key: 'detectedStage', label: 'Detection Stage' },
  { key: 'defectType', label: 'Defect Type' },
  { key: 'problemLevel', label: 'Problem Level' },
  { key: 'priority', label: 'Defect Priority', exportValue: (row) => formatDefectPriorityLabel(row.priority) },
  { key: 'reviewDueDate', label: 'Review Due Date' },
  { key: 'status', label: 'Status', exportValue: (row) => titleCase(row.status) },
  { key: 'qtyAffected', label: 'Qty Affected' },
  { key: 'qtyOnHold', label: 'Qty On Hold' },
  { key: 'qtyDiscarded', label: 'Qty Discarded' },
  { key: 'lossStatus', label: 'Loss Status', exportValue: (row) => titleCase(row.lossStatus) },
  { key: 'reportedByName', label: 'Reported By' },
  { key: 'createdAt', label: 'Reported Date' }
]

function getValidationMessage(form, step, workerReport, qtyExceedsBatch) {
  if (workerReport) {
    if (step === 1) {
      if (qtyExceedsBatch) return 'Qty affected cannot exceed quantity produced.'
      return 'Please complete the required fields first.'
    }
    if (step === 2) {
      if (form.priority === 'urgent' && !form.urgency_reason?.trim()) {
        return 'Please explain why this defect needs urgent manager review.'
      }
      return 'Please complete the required fields first.'
    }
  }

  if (step === 2 && workerReport && form.priority === 'urgent' && !form.urgency_reason?.trim()) {
    return 'Please explain why this defect needs urgent manager review.'
  }
  return 'Please complete the required fields first.'
}

const OPEN_DEFECT_STATUSES = ['new', 'under_review', 'action_assigned', 'in_progress', 'ready_verification']

const STATUS_FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'new', label: 'New Reports' },
  { value: 'open', label: 'Open' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'action_assigned', label: 'Actions Assigned' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'ready_verification', label: 'Ready for Verification' },
  { value: 'closed', label: 'Closed' }
]

const SEVERITY_FILTER_OPTIONS = [
  { value: 'all', label: 'All Severity' },
  { value: 'Can Be Corrected', label: 'Can Be Corrected' },
  { value: 'Hold for Review', label: 'Hold for Review' },
  { value: 'Cannot Be Sold', label: 'Cannot Be Sold' },
  { value: 'Food Safety Risk', label: 'Food Safety Risk' }
]

function FilterChipGroup({ label, value, options, onChange }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
      <span className="shrink-0 text-[0.625rem] font-semibold uppercase leading-3 text-brand-muted sm:w-16">{label}</span>
      <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={value === option.value ? 'filter-chip-active' : 'filter-chip-idle'}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function AddDefectModal({ onClose, onCreated, createdBy, workerReport = false }) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [products, setProducts] = useState([])
  const [batches, setBatches] = useState([])
  const [users, setUsers] = useState([])
  const [stages, setStages] = useState([])
  const [defectTypes, setDefectTypes] = useState([])
  const [rule, setRule] = useState(null)
  const [photo, setPhoto] = useState(null)
  const [form, setForm] = useState({
    product_id: '',
    batch_id: '',
    detected_at_stage: '',
    defect_type: '',
    defect_type_other: '',
    qty_affected: '',
    containment_status: 'Segregated / On Hold',
    problem_level: '',
    priority: '',
    review_due_date: '',
    urgency_reason: '',
    description: '',
    suggested_product_handling: '',
    suggested_machine_handling: '',
    related_tool_machine: '',
    handling_notes: ''
  })

  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const requests = [
          api.get('/products'),
          api.get('/batches'),
          api.get('/defects/rules/stages')
        ]
        if (!workerReport) {
          requests.splice(2, 0, api.get('/users'))
        }

        const results = await Promise.all(requests)
        const productsRes = results[0]
        const batchesRes = results[1]
        const usersRes = workerReport ? null : results[2]
        const stagesRes = workerReport ? results[2] : results[3]

        setProducts((productsRes.data.data || []).map(normalizeProduct))
        setBatches((batchesRes.data.data || []).map(normalizeBatch))
        setUsers(usersRes?.data?.data || [])
        setStages(stagesRes.data.data || [])
      } catch (error) {
        console.error(error)
        alert('Could not load add defect options from database.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  useEffect(() => {
    async function loadTypes() {
      if (!form.detected_at_stage) {
        setDefectTypes([])
        return
      }
      try {
        const res = await api.get(`/defects/options/by-stage/${encodeURIComponent(form.detected_at_stage)}`)
        setDefectTypes(res.data.data || [])
      } catch (error) {
        console.error(error)
        setDefectTypes([])
      }
    }
    loadTypes()
  }, [form.detected_at_stage])

  useEffect(() => {
    async function loadRule() {
      if (!form.defect_type) {
        setRule(null)
        return
      }
      try {
        const res = await api.get(`/defects/rules/by-type/${encodeURIComponent(form.defect_type)}`)
        const nextRule = res.data.data
        setRule(nextRule)
        setForm((current) => ({
          ...current,
          problem_level: nextRule.default_problem_level || current.problem_level,
          priority: mapRecommendedPriority(nextRule.recommended_priority || current.priority),
          suggested_product_handling: nextRule.product_handling_options?.[0] || '',
          suggested_machine_handling: nextRule.machine_check_options?.[0] || '',
          related_tool_machine: nextRule.related_tool_options?.[0] || ''
        }))
      } catch (error) {
        console.error(error)
        setRule(null)
      }
    }
    loadRule()
  }, [form.defect_type])

  const selectedProduct = products.find((product) => String(product.id) === String(form.product_id))
  const availableBatches = batches.filter((batch) => !form.product_id || String(batch.productId) === String(form.product_id))
  const selectedBatch = batches.find((batch) => String(batch.id) === String(form.batch_id))
  const qtyExceedsBatch = selectedBatch && Number(form.qty_affected || 0) > Number(selectedBatch.quantityProduced || 0)
  const totalSteps = workerReport ? 2 : 3
  const stepLabels = workerReport
    ? ['What & Where', 'Details & Photo']
    : ['Product Information', 'Defect Information', 'Evidence & Initial Suggestions']

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function validateStep() {
    if (workerReport) {
      if (step === 1) {
        return form.product_id
          && form.batch_id
          && form.detected_at_stage
          && form.defect_type
          && form.qty_affected
          && !qtyExceedsBatch
          && (form.defect_type !== 'Other' || form.defect_type_other)
      }
      if (step === 2) {
        return Boolean(form.description?.trim())
          && form.priority
          && (form.priority !== 'urgent' || form.urgency_reason?.trim())
      }
      return false
    }

    if (step === 1) return form.product_id && form.batch_id
    if (step === 2) {
      return form.detected_at_stage
        && form.defect_type
        && form.qty_affected
        && form.containment_status
        && form.problem_level
        && form.priority
        && form.description
        && !qtyExceedsBatch
    }
    if (step === 3) return form.suggested_product_handling && form.suggested_machine_handling && form.related_tool_machine
    return false
  }

  function buildSubmitPayload() {
    const problemLevel = form.problem_level || rule?.default_problem_level || 'Hold for Review'
    const priority = form.priority || mapRecommendedPriority(rule?.recommended_priority) || 'medium'
    const suggestedProduct = form.suggested_product_handling || rule?.product_handling_options?.[0] || null
    const suggestedMachine = form.suggested_machine_handling || rule?.machine_check_options?.[0] || null
    const relatedTool = form.related_tool_machine || rule?.related_tool_options?.[0] || null

    return {
      product_id: Number(form.product_id),
      batch_id: Number(form.batch_id),
      detected_at_stage: form.detected_at_stage,
      defect_type: form.defect_type,
      defect_type_other: form.defect_type === 'Other' ? form.defect_type_other : null,
      problem_level: problemLevel,
      priority,
      review_due_date: workerReport ? (form.review_due_date || null) : null,
      urgency_reason: workerReport ? (form.urgency_reason?.trim() || null) : null,
      description: form.description,
      qty_affected: Number(form.qty_affected),
      containment_status: form.containment_status || 'Segregated / On Hold',
      suggested_product_handling: suggestedProduct,
      suggested_machine_handling: suggestedMachine,
      related_tool_machine: relatedTool,
      handling_notes: form.handling_notes || null,
      investigation_notes: form.handling_notes || null,
      created_by: createdBy
    }
  }

  async function uploadPhoto(defectId) {
    if (!photo) return
    const formData = new FormData()
    formData.append('evidence', photo)
    formData.append('evidence_note', 'Defect evidence uploaded during defect creation')
    if (createdBy) formData.append('uploaded_by', String(createdBy))
    await api.post(`/defects/${defectId}/evidence`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  }

  function renderReviewDueFields({ includePriority = false } = {}) {
    const reviewToday = form.review_due_date === todayDateString()

    return (
      <>
        <div className={`grid grid-cols-1 gap-4 ${includePriority ? 'md:grid-cols-2' : ''}`}>
          {includePriority && (
            <Select
              label="Defect Priority"
              value={form.priority}
              onChange={(v) => update('priority', v)}
              options={DEFECT_PRIORITY_OPTIONS.map((option) => option.value)}
            />
          )}
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
          label={form.priority === 'urgent' ? 'Urgency Reason (required)' : 'Urgency Reason (optional)'}
          value={form.urgency_reason}
          onChange={(v) => update('urgency_reason', v)}
          rows={2}
        />
      </>
    )
  }

  async function submit() {
    if (!validateStep()) return alert(getValidationMessage(form, step, workerReport, qtyExceedsBatch))
    setSubmitting(true)
    try {
      const res = await api.post('/defects', buildSubmitPayload())
      const created = res.data.data
      const defectId = created?.id || created?.defect_id
      if (defectId) await uploadPhoto(defectId)
      onCreated()
      onClose()
    } catch (error) {
      console.error(error)
      alert(error.response?.data?.message || 'Could not create defect.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 grid place-items-center bg-brand-ink/50 p-4 backdrop-blur-sm">
        <LoadingState label="Loading form options..." />
      </div>
    )
  }

  const modalTitle = workerReport ? 'Report Defect' : 'Add Defect'
  const modalSubtitle = workerReport
    ? 'Record what you found on the floor. Your manager must assign corrective actions before work begins.'
    : 'Record defect and initial suggestions only. Assignment happens later.'

  return (
    <BaseModal
      title={modalTitle}
      subtitle={modalSubtitle}
      onClose={onClose}
      size="2xl"
      bodyClassName="!py-4"
      footer={
        <>
          <Button color="slate" variant="subtle" onClick={() => setStep((current) => Math.max(current - 1, 1))} disabled={step === 1}>Back</Button>
          {step < totalSteps ? (
            <Button onClick={() => validateStep() ? setStep((current) => current + 1) : alert(getValidationMessage(form, step, workerReport, qtyExceedsBatch))}>Next</Button>
          ) : (
            <Button onClick={submit} disabled={submitting}>
              {submitting ? 'Saving...' : workerReport ? 'Submit Report' : 'Save Defect'}
            </Button>
          )}
        </>
      }
    >
      <div className={`mb-5 grid gap-3 text-sm font-semibold ${workerReport ? 'grid-cols-2' : 'grid-cols-3'}`}>
        {stepLabels.map((label, index) => (
          <div key={label} className={`rounded-xl px-4 py-3 ${step === index + 1 ? 'bg-brand-50 text-brand-700 ring-1 ring-brand-100' : 'bg-brand-50/40 text-brand-muted'}`}>
            Step {index + 1}: {label}
          </div>
        ))}
      </div>

      <div>
          {workerReport && step === 1 && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="field-label">Product</span>
                  <select value={form.product_id} onChange={(e) => { update('product_id', e.target.value); update('batch_id', '') }} className="field-control">
                    <option value="">Select product</option>
                    {products.map((product) => <option key={product.id} value={product.id}>{product.name} ({product.code})</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="field-label">Batch</span>
                  <select value={form.batch_id} onChange={(e) => update('batch_id', e.target.value)} className="field-control">
                    <option value="">Select batch</option>
                    {availableBatches.map((batch) => <option key={batch.id} value={batch.id}>{batch.batchNumber}</option>)}
                  </select>
                </label>
              </div>

              {selectedBatch && (
                <div className="grid grid-cols-1 gap-3 rounded-2xl border border-brand-border/70 bg-brand-50/60 p-4 md:grid-cols-4">
                  <Info label="Batch Number" value={selectedBatch.batchNumber} />
                  <Info label="Quantity Produced" value={selectedBatch.quantityProduced} />
                  <Info label="Expected Expiry" value={selectedBatch.expectedExpiry} />
                  <Info label="Printed Expiry" value={selectedBatch.printedExpiry} />
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Select label="Where Found (Stage)" value={form.detected_at_stage} onChange={(v) => { update('detected_at_stage', v); update('defect_type', '') }} options={stages} />
                <Select label="Problem Type" value={form.defect_type} onChange={(v) => update('defect_type', v)} options={defectTypes} />
                <Input label="Qty Affected" type="number" value={form.qty_affected} onChange={(v) => update('qty_affected', v)} />
              </div>
              {form.defect_type === 'Other' && <Input label="Other Problem Type" value={form.defect_type_other} onChange={(v) => update('defect_type_other', v)} />}
              {qtyExceedsBatch && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">Qty affected cannot exceed quantity produced.</div>}
            </div>
          )}

          {workerReport && step === 2 && (
            <div className="space-y-5">
              <TextArea label="What happened? (Description)" value={form.description} onChange={(v) => update('description', v)} />
              {renderReviewDueFields({ includePriority: true })}
              <label className="block">
                <span className="field-label">Photo Evidence</span>
                <input type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files?.[0] || null)} className="field-control" />
                <p className="mt-1 text-xs text-brand-muted">Upload a photo of the problem if possible.</p>
              </label>
              <TextArea label="Possible Cause (optional)" value={form.handling_notes} onChange={(v) => update('handling_notes', v)} />
            </div>
          )}

          {!workerReport && step === 1 && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="field-label">Product</span>
                  <select value={form.product_id} onChange={(e) => { update('product_id', e.target.value); update('batch_id', '') }} className="field-control">
                    <option value="">Select product</option>
                    {products.map((product) => <option key={product.id} value={product.id}>{product.name} ({product.code})</option>)}
                  </select>
                </label>
                <label className="block">
                  <span className="field-label">Batch</span>
                  <select value={form.batch_id} onChange={(e) => update('batch_id', e.target.value)} className="field-control">
                    <option value="">Select batch</option>
                    {availableBatches.map((batch) => <option key={batch.id} value={batch.id}>{batch.batchNumber}</option>)}
                  </select>
                </label>
              </div>

              {selectedBatch && (
                <div className="grid grid-cols-1 gap-3 rounded-2xl border border-brand-border/70 bg-brand-50/60 p-4 md:grid-cols-4">
                  <Info label="Product" value={selectedProduct?.name || selectedBatch.productName} />
                  <Info label="Batch Number" value={selectedBatch.batchNumber} />
                  <Info label="Quantity Produced" value={selectedBatch.quantityProduced} />
                  <Info label="Production Date" value={selectedBatch.productionDate} />
                  <Info label="Retort Date" value={selectedBatch.retortDate} />
                  <Info label="Expected Expiry" value={selectedBatch.expectedExpiry} />
                  <Info label="Printed Expiry" value={selectedBatch.printedExpiry} />
                  <Info label="Batch Status" value={titleCase(selectedBatch.batchStatus)} />
                </div>
              )}
            </div>
          )}

          {!workerReport && step === 2 && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Select label="Detected Stage" value={form.detected_at_stage} onChange={(v) => { update('detected_at_stage', v); update('defect_type', '') }} options={stages} />
                <Select label="Defect Type" value={form.defect_type} onChange={(v) => update('defect_type', v)} options={defectTypes} />
                <Input label="Qty Affected" type="number" value={form.qty_affected} onChange={(v) => update('qty_affected', v)} />
              </div>
              {form.defect_type === 'Other' && <Input label="Other Defect Type" value={form.defect_type_other} onChange={(v) => update('defect_type_other', v)} />}
              {qtyExceedsBatch && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">Qty affected cannot exceed quantity produced.</div>}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Select label="Containment Status" value={form.containment_status} onChange={(v) => update('containment_status', v)} options={['Segregated / On Hold', 'Not Yet Segregated', 'No Hold Needed']} />
                <Select label="Problem Level" value={form.problem_level} onChange={(v) => update('problem_level', v)} options={['Can Be Corrected', 'Hold for Review', 'Cannot Be Sold', 'Food Safety Risk']} />
                <Select label="Defect Priority" value={form.priority} onChange={(v) => update('priority', v)} options={DEFECT_PRIORITY_OPTIONS.map((option) => option.value)} />
              </div>
              <TextArea label="Description" value={form.description} onChange={(v) => update('description', v)} />
            </div>
          )}

          {!workerReport && step === 3 && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Select label="Suggested Product Handling" value={form.suggested_product_handling} onChange={(v) => update('suggested_product_handling', v)} options={rule?.product_handling_options || []} />
                <Select label="Suggested Machine / Process Check" value={form.suggested_machine_handling} onChange={(v) => update('suggested_machine_handling', v)} options={rule?.machine_check_options || []} />
                <Select label="Related Tool / Machine / Area" value={form.related_tool_machine} onChange={(v) => update('related_tool_machine', v)} options={rule?.related_tool_options || []} />
              </div>
              <label className="block">
                <span className="field-label">Evidence Picture</span>
                <input type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files?.[0] || null)} className="field-control" />
              </label>
              <TextArea label="Notes" value={form.handling_notes} onChange={(v) => update('handling_notes', v)} />
            </div>
          )}
        </div>
    </BaseModal>
  )
}

function Info({ label, value }) {
  return <div><p className="text-xs font-semibold uppercase text-brand-muted">{label}</p><p className="mt-1 font-semibold text-brand-ink">{value || '-'}</p></div>
}
function Input({ label, value, onChange, type = 'text', min }) {
  return (
    <label className="block">
      <span className="field-label">{label}</span>
      <input type={type} value={value} min={min} onChange={(e) => onChange(e.target.value)} className="field-control" />
    </label>
  )
}
function Select({ label, value, onChange, options }) {
  return <label className="block"><span className="field-label">{label}</span><select value={value} onChange={(e) => onChange(e.target.value)} className="field-control"><option value="">Select</option>{options.map((option, i) => <option key={`${option}-${i}`} value={option}>{titleCase(option)}</option>)}</select></label>
}
function TextArea({ label, value, onChange }) {
  return <label className="block"><span className="field-label">{label}</span><textarea value={value} onChange={(e) => onChange(e.target.value)} rows={4} className="field-control" /></label>
}

export default function Defects({ user }) {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [defects, setDefects] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [expanded, setExpanded] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')
  const [severityFilter, setSeverityFilter] = useState('all')
  const [stageFilter, setStageFilter] = useState('all')
  const [urgencyFilter, setUrgencyFilter] = useState('all')
  const [reportedDateFilter, setReportedDateFilter] = useState('all')
  const [reportedFrom, setReportedFrom] = useState('')
  const [reportedTo, setReportedTo] = useState('')
  const [createdPeriod, setCreatedPeriod] = useState(null)
  const [workerMineOnly, setWorkerMineOnly] = useState(false)
  const [expiryMismatchFilter, setExpiryMismatchFilter] = useState(false)

  const currentUser = user
  const managerView = isManager(user)

  async function loadDefects() {
    setLoading(true)
    try {
      const res = await api.get('/defects')
      setDefects((res.data.data || []).map(normalizeDefect))
    } catch (error) {
      console.error(error)
      alert('Could not load defects.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (managerView) {
      api.get('/users')
        .then((res) => setUsers(res.data.data || []))
        .catch((error) => console.error(error))
    }
  }, [managerView])

  useEffect(() => {
    if (managerView || currentUser?.id) {
      loadDefects()
    }
  }, [user?.id])

  useEffect(() => {
    if (searchParams.get('report') === '1') {
      setShowAdd(true)
      const next = new URLSearchParams(searchParams)
      next.delete('report')
      setSearchParams(next, { replace: true })
      return
    }

    const attentionPeriod = parseAttentionPeriod(searchParams)
    setCreatedPeriod(attentionPeriod)

    const filter = searchParams.get('filter')
    if (filter === 'new' && managerView) {
      setStatusFilter('new')
      setUrgencyFilter('all')
      const next = new URLSearchParams(searchParams)
      next.delete('filter')
      setSearchParams(next, { replace: true })
      return
    }
    if (filter === 'urgent_review' && managerView) {
      setUrgencyFilter('urgent_review')
      const next = new URLSearchParams(searchParams)
      next.delete('filter')
      setSearchParams(next, { replace: true })
      return
    }

    if (!managerView) {
      if (searchParams.get('mine') === 'true') {
        setWorkerMineOnly(true)
      }

      const workerStatus = searchParams.get('status')
      if (workerStatus === 'awaiting_manager' || workerStatus === 'new_or_under_review') {
        setWorkerMineOnly(true)
        setStatusFilter('new')
      }

      if (searchParams.get('expiry') === 'mismatch') {
        setWorkerMineOnly(true)
        setExpiryMismatchFilter(true)
      }
    }
  }, [searchParams, setSearchParams, managerView])

  const stageOptions = useMemo(() => {
    const stages = [...new Set(defects.map((d) => d.detectedStage).filter(Boolean))].sort()
    return [
      { value: 'all', label: 'All Stages' },
      ...stages.map((stage) => ({ value: stage, label: stage }))
    ]
  }, [defects])

  const filtered = useMemo(() => {
    const term = search.toLowerCase()
    return defects.filter((defect) => {
      const matchesSearch = !term || [defect.code, defect.productName, defect.batchNumber, defect.defectType, defect.reportedByName]
        .some((value) => String(value || '').toLowerCase().includes(term))

      if (!matchesSearch) return false

      if (severityFilter !== 'all' && defect.problemLevel !== severityFilter) return false
      if (stageFilter !== 'all' && defect.detectedStage !== stageFilter) return false
      if (urgencyFilter === 'urgent_review' && !matchesUrgentReviewFilter(defect)) return false
      if (!matchesReportedDateFilter(defect.created_at || defect.createdAt, reportedDateFilter, {
        customFrom: reportedFrom,
        customTo: reportedTo
      })) return false
      if (!matchesAttentionCreatedPeriod(defect.created_at || defect.createdAt, createdPeriod)) return false
      if (workerMineOnly && Number(defect.createdBy) !== Number(currentUser?.id)) return false
      if (expiryMismatchFilter && !hasExpiryMismatch(defect)) return false

      if (statusFilter === 'all') return true
      if (statusFilter === 'new') {
        if (managerView) return defect.status === 'new'
        return Number(defect.createdBy) === Number(currentUser?.id)
          && ['new', 'under_review'].includes(defect.status)
      }
      if (statusFilter === 'open') return OPEN_DEFECT_STATUSES.includes(defect.status)
      if (['under_review', 'action_assigned', 'in_progress', 'ready_verification', 'closed'].includes(statusFilter)) {
        return defect.status === statusFilter
      }
      return true
    })
  }, [defects, search, statusFilter, severityFilter, stageFilter, urgencyFilter, reportedDateFilter, reportedFrom, reportedTo, createdPeriod, workerMineOnly, expiryMismatchFilter, managerView, currentUser?.id])

  const reportedDateLabel = useMemo(
    () => getDateFilterLabel(reportedDateFilter, { customFrom: reportedFrom, customTo: reportedTo }),
    [reportedDateFilter, reportedFrom, reportedTo]
  )

  const sorted = useMemo(
    () => [...filtered].sort(compareDefectsForReviewUrgency),
    [filtered]
  )

  useEffect(() => {
    setPage(1)
  }, [search, statusFilter, severityFilter, stageFilter, urgencyFilter, reportedDateFilter, reportedFrom, reportedTo])

  const paged = useMemo(() => paginateItems(sorted, page), [sorted, page])

  const reviewAttention = useMemo(
    () => summarizeUrgentReviewAttention(defects),
    [defects]
  )

  const kpis = useMemo(() => ({
    total: defects.length,
    newReports: defects.filter((d) => d.status === 'new').length,
    open: defects.filter((d) => OPEN_DEFECT_STATUSES.includes(d.status)).length,
    affected: defects.reduce((sum, d) => sum + d.qtyAffected, 0),
    underReview: defects.filter((d) => d.status === 'under_review').length
  }), [defects])

  return (
    <div className="list-page">
      <PageHeader
        title={managerView ? 'Defect Records' : 'My Defects'}
        subtitle={managerView
          ? 'Review floor reports, track open cases, and assign corrective actions.'
          : 'Defects you reported and defects with actions assigned to you.'}
        eyebrow={managerView ? 'Quality Control' : 'Worker Portal'}
      >
        <Button onClick={() => setShowAdd(true)}>
          <Plus size={18} /> {managerView ? 'Add Defect' : 'Report Defect'}
        </Button>
      </PageHeader>

      {!managerView && (workerMineOnly || expiryMismatchFilter) && (
        <p className="text-[0.6875rem] text-brand-muted">
          {workerMineOnly && expiryMismatchFilter && 'Showing your reports with expiry mismatch.'}
          {workerMineOnly && !expiryMismatchFilter && statusFilter === 'new' && 'Showing your reports waiting for manager review.'}
          {workerMineOnly && !expiryMismatchFilter && statusFilter !== 'new' && 'Showing your reported defects.'}
          {!workerMineOnly && expiryMismatchFilter && 'Showing defects with expiry mismatch.'}
        </p>
      )}

      <div className="list-kpi-grid">
        <KpiCard
          label={managerView ? 'Total Defects' : 'My Defects'}
          value={kpis.total}
          subtitle={managerView ? 'All records in the system' : 'Linked to your account'}
          active={statusFilter === 'all' && severityFilter === 'all' && stageFilter === 'all' && urgencyFilter === 'all'}
          onClick={() => {
            setStatusFilter('all')
            setSeverityFilter('all')
            setStageFilter('all')
            setUrgencyFilter('all')
          }}
          icon={<Layers size={16} />}
        />
        {managerView ? (
          <KpiCard
            label="New Reports"
            value={kpis.newReports}
            subtitle="Worker reports awaiting review"
            active={statusFilter === 'new'}
            highlight={kpis.newReports > 0}
            tone="amber"
            onClick={() => setStatusFilter('new')}
            icon={<FileWarning size={16} />}
          />
        ) : (
          <KpiCard
            label="Awaiting Manager"
            value={defects.filter((d) => Number(d.createdBy) === Number(currentUser?.id) && ['new', 'under_review'].includes(d.status)).length}
            subtitle="Submitted and pending assignment"
            active={statusFilter === 'new'}
            highlight
            tone="amber"
            onClick={() => setStatusFilter('new')}
            icon={<FileWarning size={16} />}
          />
        )}
        <KpiCard
          label="Open"
          value={kpis.open}
          subtitle="Not yet closed"
          active={statusFilter === 'open'}
          onClick={() => setStatusFilter('open')}
          icon={<FolderOpen size={16} />}
        />
        {managerView ? (
          <KpiCard
            label="Under Review"
            value={kpis.underReview}
            subtitle="Manager actively reviewing"
            active={statusFilter === 'under_review'}
            onClick={() => setStatusFilter('under_review')}
            icon={<SearchCheck size={16} />}
          />
        ) : (
          <KpiCard
            label="Affected Units"
            value={kpis.affected}
            subtitle="Total quantity impacted"
            icon={<Layers size={16} />}
          />
        )}
      </div>

      {managerView && hasUrgentReviewAttention(reviewAttention) && urgencyFilter !== 'urgent_review' && (
        <NotificationCard
          tone="warning"
          iconTone={reviewAttention.overdue > 0 ? 'error' : 'warning'}
          icon={AlertTriangle}
          title="Urgent defect reports need review"
          description={`Review urgent or due-today worker reports before assigning corrective actions. ${formatUrgentReviewCountSummary(reviewAttention)}`}
          action={(
            <Button size="sm" color="amber" onClick={() => setUrgencyFilter('urgent_review')}>
              Show Urgent / Due Review
            </Button>
          )}
        />
      )}

      {managerView && kpis.newReports > 0 && !hasUrgentReviewAttention(reviewAttention) && statusFilter !== 'new' && (
        <NotificationCard
          tone="info"
          iconTone="info"
          icon={FileWarning}
          title={`${kpis.newReports} worker report${kpis.newReports === 1 ? '' : 's'} need your review`}
          description="Review floor reports, then assign corrective actions before work begins."
          action={(
            <Button size="sm" color="slate" variant="subtle" onClick={() => setStatusFilter('new')}>
              Show New Reports
            </Button>
          )}
        />
      )}

      <div className="list-panel">
        <div className="list-toolbar">
          <div className="list-toolbar-search">
            <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-brand-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search defect ID, product, batch, or type..."
              className="list-toolbar-search-input"
            />
          </div>
          <ListCsvExport
            title="Defect Records"
            filename={`qdts-defect-records-${reportedDateLabel.toLowerCase().replace(/\s+/g, '-')}.csv`}
            periodLabel={reportedDateLabel}
            columns={DEFECT_EXPORT_COLUMNS}
            rows={sorted}
          />
        </div>

        <div className="compact-filter-panel">
            <FilterChipGroup
              label="Status"
              value={statusFilter}
              options={STATUS_FILTER_OPTIONS}
              onChange={setStatusFilter}
            />
            <FilterChipGroup
              label="Severity"
              value={severityFilter}
              options={SEVERITY_FILTER_OPTIONS}
              onChange={setSeverityFilter}
            />
            {stageOptions.length > 1 && (
              <FilterChipGroup
                label="Detection Stage"
                value={stageFilter}
                options={stageOptions}
                onChange={setStageFilter}
              />
            )}
            {managerView && (
              <FilterChipGroup
                label="Review Urgency"
                value={urgencyFilter}
                options={URGENCY_FILTER_OPTIONS}
                onChange={setUrgencyFilter}
              />
            )}
            <ListDateFilter
              label="Reported Date"
              value={reportedDateFilter}
              options={DEFECT_REPORTED_DATE_OPTIONS}
              onChange={setReportedDateFilter}
              customFrom={reportedFrom}
              customTo={reportedTo}
              onCustomFromChange={setReportedFrom}
              onCustomToChange={setReportedTo}
            />
        </div>

        {loading ? (
          <div className="list-panel-body">
            <LoadingState label="Loading defects..." />
          </div>
        ) : (
          <div className="list-panel-body">
            <div className="compact-list-stack">
            {paged.items.length === 0 ? (
              search || statusFilter !== 'all' || severityFilter !== 'all' || stageFilter !== 'all' || urgencyFilter !== 'all' || reportedDateFilter !== 'all' || workerMineOnly || expiryMismatchFilter ? (
                <EmptyState
                  title="No defects match this filter"
                  description="Try clearing the search or choosing different filter chips."
                />
              ) : managerView ? (
                <EmptyState
                  title="No defect records yet"
                  description="When workers report problems or you add defects, they will appear here for review and tracking."
                  actionLabel="Add Defect"
                  onAction={() => setShowAdd(true)}
                  icon={Plus}
                />
              ) : (
                <EmptyState
                  title="No defects yet"
                  description="Report a problem you found on the production floor. Your manager will review before assigning corrective work."
                  actionLabel="Report Defect"
                  onAction={() => setShowAdd(true)}
                  icon={Plus}
                />
              )
            ) : (
              paged.items.map((defect) => (
                <DefectRecordCard
                  key={defect.id}
                  defect={defect}
                  managerView={managerView}
                  users={users}
                  currentUserId={currentUser?.id}
                  expanded={expanded === defect.id}
                  onToggle={() => setExpanded(expanded === defect.id ? null : defect.id)}
                  onView={() => navigate(`/defects/${defect.id}`)}
                >
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    <DefectRecordCard.InfoCard title="Defect Information">
                      <Info label="Defect ID" value={defect.code} />
                      <Info label="Defect Type" value={defect.defectType} />
                      <Info label="Detection Stage" value={defect.detectedStage} />
                      <Info label="Qty Affected" value={defect.qtyAffected} />
                      <Info label="Containment" value={defect.containmentStatus} />
                    </DefectRecordCard.InfoCard>

                    <DefectRecordCard.InfoCard title="Manager Review Urgency">
                      <Info label="Defect Priority" value={titleCase(defect.priority)} />
                      <Info label="Manager Review Due Date" value={defect.reviewDueDate || '-'} />
                      <Info label="Urgency Reason" value={defect.urgencyReason || '-'} />
                      <p className="mt-2 text-xs text-brand-muted">
                        Set by worker at report time. Not a corrective action due date.
                      </p>
                    </DefectRecordCard.InfoCard>

                    <DefectRecordCard.InfoCard title="Handling Recommendation">
                      <Info label="Suggested Product Handling" value={defect.suggestedProductHandling} />
                      <Info label="Suggested Machine / Process Check" value={defect.suggestedMachineHandling} />
                      <Info label="Related Tool / Area" value={defect.relatedToolMachine} />
                      <Info label="Corrective Action Progress" value={defect.actionProgress} />
                    </DefectRecordCard.InfoCard>

                    <DefectRecordCard.InfoCard title="Description">
                      <div className="text-body text-brand-muted">{defect.description || 'No description provided.'}</div>
                    </DefectRecordCard.InfoCard>
                  </div>
                </DefectRecordCard>
              ))
            )}
            </div>
          </div>
        )}
      </div>

      <ListPagination
        page={paged.page}
        totalPages={paged.totalPages}
        totalItems={paged.total}
        pageSize={paged.pageSize}
        onPageChange={setPage}
      />

      {showAdd && (
        <AddDefectModal
          workerReport={!managerView}
          onClose={() => setShowAdd(false)}
          onCreated={loadDefects}
          createdBy={currentUser?.id}
        />
      )}
    </div>
  )
}
