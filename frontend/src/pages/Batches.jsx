import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  AlertTriangle,
  CheckCircle,
  Edit,
  Eye,
  Package,
  Plus,
  Search
} from 'lucide-react'
import api from '../api/client'
import Button from '../components/Button'
import KPICard from '../components/KPICard'
import PageHeader from '../components/PageHeader'
import LoadingState from '../components/LoadingState'
import EmptyState from '../components/EmptyState'
import EntityRow from '../components/EntityRow'
import BaseModal from '../components/BaseModal'
import ListPagination from '../components/ListPagination'
import ListDateFilter from '../components/ListDateFilter'
import ListCsvExport from '../components/ListCsvExport'
import { paginateItems } from '../utils/pagination'
import {
  RETORT_DATE_OPTIONS,
  getDateFilterLabel,
  matchesRetortDateFilterValue
} from '../utils/dateFilters'
import { createdInReportPeriod } from '../components/ReportPeriodFilter'
import { parseAttentionPeriod } from '../utils/attentionNavigation'
import { addMonthsToDateOnly } from '../utils/dateOnly'
import { isManager } from '../utils/roleAccess'

function formatDate(date) {
  if (!date) return '-'
  return String(date).split('T')[0]
}

function getAffectedQty(defect) {
  return Number(
    defect.qty_affected ??
      defect.quantity_affected ??
      defect.affected_quantity ??
      defect.total_affected_units ??
      defect.quantity_defective ??
      defect.qty_defective ??
      0
  )
}

function normalizeBatch(batch) {
  return {
    id: batch.id ?? batch.batch_id,
    batchNumber: batch.batch_number,
    productId: batch.product_id,
    productName: batch.product_name,
    productCode: batch.product_code,
    category: batch.category || '-',
    packaging: batch.packaging_type || '-',
    size: batch.size_weight || '-',
    shelfLife: batch.shelf_life_months || null,
    productionDate: formatDate(batch.production_date),
    retortDate: formatDate(batch.retort_date),
    correctExpiryDate: formatDate(batch.correct_expiry_date),
    printedExpiryDate: formatDate(batch.printed_expiry_date),
    quantityProduced: batch.quantity_produced ?? 0,
    qtyOnHold: Number(batch.qty_on_hold || 0),
    status: batch.batch_status || '-',
    notes: batch.notes || '',
    defectCount: Number(batch.defect_count || 0),
    totalQtyAffected: Number(batch.total_qty_affected || 0),
    totalQtyDiscarded: Number(batch.total_qty_discarded || 0),
    expiryMismatch: Boolean(batch.expiry_mismatch),
    expiryDifferenceLabel: batch.expiry_difference_label || ''
  }
}

function hasBatchExpiryMismatch(batch) {
  if (batch.expiryMismatch) return true
  return (
    batch.correctExpiryDate &&
    batch.printedExpiryDate &&
    batch.correctExpiryDate !== '-' &&
    batch.printedExpiryDate !== '-' &&
    batch.correctExpiryDate !== batch.printedExpiryDate
  )
}

function isBatchOnHold(batch) {
  return (
    String(batch.status || '').toLowerCase() === 'on_hold' ||
    Number(batch.qtyOnHold || 0) > 0
  )
}

function titleCase(value) {
  if (!value) return '-'
  return String(value).replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

const BATCH_EXPORT_COLUMNS = [
  { key: 'batchNumber', label: 'Batch Number' },
  { key: 'productName', label: 'Product' },
  { key: 'productCode', label: 'Product Code' },
  { key: 'quantityProduced', label: 'Quantity Produced' },
  { key: 'retortDate', label: 'Retort Date' },
  { key: 'correctExpiryDate', label: 'Expected Expiry' },
  { key: 'printedExpiryDate', label: 'Printed Expiry' },
  {
    key: 'expiryStatus',
    label: 'Expiry Status',
    exportValue: (row) => (hasBatchExpiryMismatch(row) ? 'Mismatch' : 'Matched')
  },
  { key: 'status', label: 'Batch Status', exportValue: (row) => titleCase(row.status) },
  { key: 'defectCount', label: 'Defect Count' },
  { key: 'totalQtyAffected', label: 'Qty Affected' },
  { key: 'totalQtyDiscarded', label: 'Qty Discarded' }
]

function normalizeProduct(product) {
  return {
    id: product.id ?? product.product_id,
    name: product.product_name,
    code: product.product_code,
    shelfLife: product.shelf_life_months,
    packaging: product.packaging_type,
    size: product.size_weight
  }
}

function BatchFormModal({ mode, batch, onClose, onSaved }) {
  const isEdit = mode === 'edit'
  const [products, setProducts] = useState([])
  const [form, setForm] = useState({
    product_id: batch?.productId ? String(batch.productId) : '',
    production_date: batch?.productionDate || '',
    retort_date: batch?.retortDate || '',
    printed_expiry_date: batch?.printedExpiryDate || '',
    quantity_produced: batch?.quantityProduced ? String(batch.quantityProduced) : '',
    notes: batch?.notes || ''
  })

  useEffect(() => {
    async function loadProducts() {
      try {
        const res = await api.get('/products')
        setProducts((res.data.data || []).map(normalizeProduct))
      } catch (error) {
        console.error(error)
        alert('Product list could not be loaded. Please refresh and try again.')
      }
    }

    loadProducts()
  }, [])

  const selectedProduct = products.find((product) => String(product.id) === String(form.product_id))

  const correctExpiryPreview = selectedProduct
    ? addMonthsToDateOnly(form.retort_date, selectedProduct.shelfLife)
    : ''

  const dateInvalid =
    form.production_date &&
    form.retort_date &&
    new Date(form.retort_date) < new Date(form.production_date)

  const expiryMismatch =
    form.printed_expiry_date &&
    correctExpiryPreview &&
    form.printed_expiry_date !== correctExpiryPreview

  async function handleSubmit() {
    if (!form.product_id) {
      alert('Please select a product.')
      return
    }

    if (!form.production_date) {
      alert('Please select the production date.')
      return
    }

    if (!form.retort_date) {
      alert('Please select the retort date.')
      return
    }

    if (dateInvalid) {
      alert('Retort date cannot be earlier than production date.')
      return
    }

    if (!form.printed_expiry_date) {
      alert('Please select the printed expiry date.')
      return
    }

    if (!form.quantity_produced || Number(form.quantity_produced) <= 0) {
      alert('Please enter a valid quantity produced.')
      return
    }

    try {
      const payload = {
        product_id: Number(form.product_id),
        production_date: form.production_date,
        retort_date: form.retort_date,
        printed_expiry_date: form.printed_expiry_date,
        quantity_produced: Number(form.quantity_produced),
        notes: form.notes
      }

      if (isEdit) {
        const res = await api.put(`/batches/${batch.id}`, payload)
        const batchNumber = res.data?.data?.batch_number
        onSaved(batchNumber)
      } else {
        const res = await api.post('/batches', payload)
        const batchNumber = res.data?.data?.batch_number
        onSaved(batchNumber)
      }

      onClose()
    } catch (error) {
      console.error(error)

      alert(
        error.response?.data?.message ||
          error.response?.data?.error ||
          (isEdit
            ? 'Batch could not be updated. Please check the form and try again.'
            : 'Batch could not be created. Please check the form and try again.')
      )
    }
  }

  return (
    <BaseModal
      title={isEdit ? 'Edit Batch' : 'Add Batch'}
      subtitle={
        isEdit
          ? 'Update batch details. Batch number may change if product or retort date is updated.'
          : 'Batch number will be generated automatically using product code and retort date.'
      }
      onClose={onClose}
      size="xl"
      footer={
        <>
          <Button color="slate" variant="subtle" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={dateInvalid}>
            {isEdit ? 'Save Changes' : 'Add Batch'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {isEdit ? (
          <div className="rounded-2xl border border-brand-border bg-brand-50/60 p-4 text-sm text-brand-ink">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-brand-muted">Current Batch Number: </span>
                <span className="font-semibold">{batch.batchNumber}</span>
              </div>
              <div>
                <span className="text-brand-muted">Status: </span>
                <span className="font-semibold capitalize">
                  {String(batch.status || '-').replaceAll('_', ' ')}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-brand-100 bg-brand-50 p-4 text-sm text-brand-700">
            Batch number will be generated automatically using product code and retort date.
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="field-label">Product *</label>
            <select
              value={form.product_id}
              onChange={(e) => setForm({ ...form, product_id: e.target.value })}
              className="field-control"
            >
              <option value="">Select product</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} ({product.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="field-label">Production Date *</label>
            <input
              type="date"
              value={form.production_date}
              onChange={(e) => setForm({ ...form, production_date: e.target.value })}
              className="field-control"
            />
            <p className="mt-1 text-xs text-brand-muted">
              Production date records when the product was prepared, cooked, or packed.
            </p>
          </div>

          <div>
            <label className="field-label">Retort Date *</label>
            <input
              type="date"
              value={form.retort_date}
              onChange={(e) => setForm({ ...form, retort_date: e.target.value })}
              className={`field-control ${
                dateInvalid ? 'border-red-300 focus:border-red-400 focus:ring-red-100' : ''
              }`}
            />

            {dateInvalid && (
              <div className="mt-2 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">
                <AlertTriangle size={14} />
                Retort date cannot be earlier than production date.
              </div>
            )}
          </div>

          <div>
            <label className="field-label">Expected Expiry Date</label>
            <input
              readOnly
              value={correctExpiryPreview || '-'}
              className="field-control bg-brand-50 font-semibold text-emerald-600"
            />
            <p className="mt-1 text-xs text-brand-muted">
              Calculated from retort date + product shelf life.
            </p>
          </div>

          <div>
            <label className="field-label">Printed Expiry Date *</label>
            <input
              type="date"
              value={form.printed_expiry_date}
              onChange={(e) => setForm({ ...form, printed_expiry_date: e.target.value })}
              className="field-control"
            />
          </div>

          <div>
            <label className="field-label">Quantity Produced *</label>
            <input
              type="number"
              value={form.quantity_produced}
              onChange={(e) => setForm({ ...form, quantity_produced: e.target.value })}
              placeholder="Enter quantity"
              className="field-control"
            />
          </div>
        </div>

        {selectedProduct && (
          <div className="rounded-2xl border border-brand-100 bg-brand-50 p-4">
            <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
              <div>
                <span className="text-brand-muted">Product Code: </span>
                <span className="font-semibold text-brand-ink">{selectedProduct.code}</span>
              </div>
              <div>
                <span className="text-brand-muted">Shelf Life: </span>
                <span className="font-semibold text-brand-ink">{selectedProduct.shelfLife} months</span>
              </div>
              <div>
                <span className="text-brand-muted">Packaging: </span>
                <span className="font-semibold text-brand-ink">{selectedProduct.packaging || '-'}</span>
              </div>
            </div>
          </div>
        )}

        {expiryMismatch && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-bold text-red-700">Expiry mismatch detected</p>

            <div className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-brand-muted">Expected Expiry</span>
                <span className="font-semibold text-emerald-600">{correctExpiryPreview}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-brand-muted">Printed Expiry</span>
                <span className="font-semibold text-red-600">{form.printed_expiry_date}</span>
              </div>
            </div>

            <p className="mt-3 text-sm text-brand-muted">
              Backend will mark this batch as an expiry mismatch. A defect record may be required.
            </p>
          </div>
        )}

        <div>
          <label className="field-label">Notes</label>
          <textarea
            rows={3}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Optional notes..."
            className="field-control resize-none"
          />
        </div>
      </div>
    </BaseModal>
  )
}

function DetailPanel({ title, children, className = '' }) {
  return (
    <div className={`surface-card min-h-[210px] p-4 ${className}`}>
      <h4 className="text-xs font-semibold uppercase tracking-wide text-brand-muted">{title}</h4>
      <div className="mt-3">{children}</div>
    </div>
  )
}

function DetailRow({ label, value, valueClassName = 'text-brand-ink' }) {
  return (
    <div className="mb-2 flex items-start justify-between gap-3">
      <span className="text-xs text-brand-muted">{label}</span>
      <span className={`text-right text-xs font-semibold ${valueClassName}`}>{value || '-'}</span>
    </div>
  )
}

function BatchRow({ batch, onEdit, managerView }) {
  const navigate = useNavigate()
  const [expanded, setExpanded] = useState(false)
  const [defects, setDefects] = useState([])
  const [loadingDefects, setLoadingDefects] = useState(false)
  const [defectLoadError, setDefectLoadError] = useState(false)

  async function loadDefects() {
    if (defects.length > 0) return

    try {
      setLoadingDefects(true)
      const res = await api.get(`/batches/${batch.id}/defects`)
      setDefects(res.data.data || [])
    } catch (error) {
      console.error(error)
      setDefectLoadError(true)
      alert('Batch defects could not be loaded. Please try again.')
    } finally {
      setLoadingDefects(false)
    }
  }

  async function handleToggle() {
    const nextExpanded = !expanded
    setExpanded(nextExpanded)
    if (nextExpanded) await loadDefects()
  }

  return (
    <EntityRow
      icon={
        <div className={`list-row-icon ${batch.expiryMismatch ? 'bg-red-50 text-red-600' : 'bg-brand-50 text-brand-600'}`}>
          <Package size={15} />
        </div>
      }
      iconTone={batch.expiryMismatch ? 'red' : 'brand'}
      danger={batch.expiryMismatch}
      title={batch.batchNumber}
      subtitle={`${batch.productName} · ${batch.productCode || '-'} · ${batch.packaging} · ${batch.size}`}
      meta={[
        { label: 'Retort Date', value: batch.retortDate || '-' },
        { label: 'Expected Expiry', value: batch.correctExpiryDate || '-' },
        { label: 'Printed Expiry', value: batch.printedExpiryDate || '-' }
      ]}
      badges={[
        { label: `${batch.quantityProduced || '-'} units`, tone: 'slate' },
        {
          label: batch.defectCount > 0 ? `${batch.defectCount} defects` : 'No defects',
          tone: batch.defectCount > 0 ? 'red' : 'slate'
        },
        {
          label: batch.expiryMismatch ? 'Expiry mismatch' : 'Dates match',
          tone: batch.expiryMismatch ? 'red' : 'green'
        }
      ]}
      actions={[
        {
          icon: Eye,
          label: 'Open Batch',
          tone: 'blue',
          onClick: () => navigate(`/batches/${batch.id}`)
        },
        ...(managerView ? [{
          icon: Edit,
          label: 'Edit Batch',
          tone: 'slate',
          onClick: () => onEdit(batch)
        }] : [])
      ]}
      expanded={expanded}
      onToggle={handleToggle}
    >
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DetailPanel title="Batch Details">
          {[
            ['Product Code', batch.productCode],
            ['Packaging', batch.packaging],
            ['Size', batch.size],
            ['Production Date', batch.productionDate],
            ['Quantity Produced', `${batch.quantityProduced} units`],
            ['Batch Status', String(batch.status).replaceAll('_', ' ')]
          ].map(([label, value]) => (
            <DetailRow key={label} label={label} value={value} />
          ))}
        </DetailPanel>

        <DetailPanel
          title={batch.expiryMismatch ? 'Expiry Mismatch' : 'Dates Match'}
          className={
            batch.expiryMismatch
              ? 'border-red-200 bg-red-50/50'
              : 'border-emerald-200 bg-emerald-50/40'
          }
        >
          <div
            className={`mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide ${
              batch.expiryMismatch ? 'text-red-600' : 'text-emerald-600'
            }`}
          >
            {batch.expiryMismatch ? <AlertTriangle size={14} /> : <CheckCircle size={14} />}
            {batch.expiryMismatch ? 'Mismatch detected' : 'Dates aligned'}
          </div>

          {[
            ['Retort Date', batch.retortDate, 'text-brand-ink'],
            ['Shelf Life', batch.shelfLife ? `${batch.shelfLife} months` : '-', 'text-brand-ink'],
            ['Category', batch.category || '-', 'text-brand-ink'],
            ['Expected Expiry', batch.correctExpiryDate, 'text-emerald-600'],
            [
              'Printed Expiry',
              batch.printedExpiryDate,
              batch.expiryMismatch ? 'text-red-600' : 'text-brand-ink'
            ]
          ].map(([label, value, valueClassName]) => (
            <DetailRow key={label} label={label} value={value} valueClassName={valueClassName} />
          ))}

          <p
            className={`mt-3 text-xs leading-relaxed ${
              batch.expiryMismatch ? 'text-red-600' : 'text-emerald-600'
            }`}
          >
            {batch.expiryMismatch
              ? batch.expiryDifferenceLabel || 'Printed expiry does not match expected expiry.'
              : 'Printed expiry matches expected expiry. No action required.'}
          </p>

          {batch.expiryMismatch && (
            <Button
              color="red"
              variant="subtle"
              className="mt-4 w-full"
              onClick={() => navigate('/defects')}
            >
              Create Defect Record
            </Button>
          )}
        </DetailPanel>

        <DetailPanel title="Batch Defects">
          {loadingDefects ? (
            <p className="text-sm text-brand-muted">Loading defect records...</p>
          ) : defects.length > 0 ? (
            <>
              {[
                ['Total Defect Records', defects.length],
                [
                  'Affected Units',
                  defects.some((defect) => getAffectedQty(defect) > 0)
                    ? defects.reduce((sum, defect) => sum + getAffectedQty(defect), 0)
                    : '-'
                ],
                [
                  'Open Defect Records',
                  defects.filter(
                    (defect) => String(defect.defect_status || '').toLowerCase() !== 'closed'
                  ).length
                ],
                [
                  'Closed Defect Records',
                  defects.filter(
                    (defect) => String(defect.defect_status || '').toLowerCase() === 'closed'
                  ).length
                ]
              ].map(([label, value]) => (
                <DetailRow key={label} label={label} value={value} />
              ))}

              <Button
                color="brand"
                variant="subtle"
                className="mt-4 w-full"
                onClick={() => navigate('/defects')}
              >
                View Batch Defects
              </Button>
            </>
          ) : batch.defectCount > 0 && defectLoadError ? (
            <p className="text-sm text-brand-muted">
              This batch has defect records, but details could not be loaded.
            </p>
          ) : (
            <p className="text-sm text-brand-muted">
              No defect records have been created for this batch yet.
            </p>
          )}
        </DetailPanel>

        <DetailPanel title="Linked Corrective Actions">
          <p className="text-xs leading-relaxed text-brand-muted">
            Corrective actions are created from defect records under this batch.
          </p>

          <Button
            color="brand"
            variant="subtle"
            className="mt-4 w-full"
            onClick={() => navigate(`/corrective-actions?batchId=${batch.id}&batchCode=${encodeURIComponent(batch.batchNumber)}`)}
          >
            View Linked Actions
          </Button>
        </DetailPanel>
      </div>

      <p className="mt-4 text-xs text-brand-muted">
        Batch records are traceability records and cannot be deleted.
      </p>
    </EntityRow>
  )
}

function Batches({ user }) {
  const managerView = isManager(user)
  const [searchParams, setSearchParams] = useSearchParams()
  const [batches, setBatches] = useState([])
  const [search, setSearch] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [editingBatch, setEditingBatch] = useState(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [expiryFilter, setExpiryFilter] = useState('all')
  const [defectsOnlyFilter, setDefectsOnlyFilter] = useState(false)
  const [onHoldOnlyFilter, setOnHoldOnlyFilter] = useState(false)
  const [retortDateFilter, setRetortDateFilter] = useState('all')
  const [retortFrom, setRetortFrom] = useState('')
  const [retortTo, setRetortTo] = useState('')
  const [page, setPage] = useState(1)
  const [attentionPeriod, setAttentionPeriod] = useState(null)
  const [periodDefectBatchIds, setPeriodDefectBatchIds] = useState(null)
  const [productFilter, setProductFilter] = useState(null)

  async function loadBatches() {
    try {
      const res = await api.get('/batches')
      setBatches((res.data.data || []).map(normalizeBatch))
    } catch (error) {
      console.error(error)
      alert('Batches could not be loaded. Please refresh and try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBatches()
  }, [])

  useEffect(() => {
    const expiry = searchParams.get('expiry')
    const attentionPeriodFromUrl = parseAttentionPeriod(searchParams)
    const productIdFromUrl = searchParams.get('product_id')

    if (expiry === 'mismatch') {
      setExpiryFilter('mismatch')
    }

    setAttentionPeriod(attentionPeriodFromUrl)
    setProductFilter(productIdFromUrl || null)
  }, [searchParams])

  useEffect(() => {
    if (!attentionPeriod) {
      setPeriodDefectBatchIds(null)
      return undefined
    }

    let cancelled = false

    api.get('/defects')
      .then((res) => {
        if (cancelled) return
        const batchIds = new Set(
          (res.data.data || [])
            .filter((defect) => createdInReportPeriod(
              defect.created_at,
              attentionPeriod.period,
              attentionPeriod.month
            ))
            .map((defect) => Number(defect.batch_id))
        )
        setPeriodDefectBatchIds(batchIds)
      })
      .catch((error) => {
        console.error(error)
        if (!cancelled) setPeriodDefectBatchIds(new Set())
      })

    return () => {
      cancelled = true
    }
  }, [attentionPeriod])

  const filtered = useMemo(() => {
    const keyword = search.toLowerCase()

    return batches.filter((batch) => {
      const matchesSearch =
        String(batch.batchNumber || '').toLowerCase().includes(keyword) ||
        String(batch.productName || '').toLowerCase().includes(keyword) ||
        String(batch.productCode || '').toLowerCase().includes(keyword) ||
        String(batch.status || '').toLowerCase().includes(keyword)

      const matchesStatus =
        statusFilter === 'all' ||
        String(batch.status || '').toLowerCase() === statusFilter

      const matchesExpiry =
        expiryFilter === 'all' ||
        (expiryFilter === 'mismatch' && hasBatchExpiryMismatch(batch)) ||
        (expiryFilter === 'matched' && !hasBatchExpiryMismatch(batch))

      const matchesDefects =
        !defectsOnlyFilter ||
        batch.defectCount > 0

      const matchesOnHold =
        !onHoldOnlyFilter ||
        isBatchOnHold(batch)

      const matchesRetortDate = matchesRetortDateFilterValue(batch.retortDate, retortDateFilter, {
        customFrom: retortFrom,
        customTo: retortTo
      })

      const matchesAttentionPeriod = !attentionPeriod
        || Boolean(periodDefectBatchIds?.has(Number(batch.id)))

      const matchesProduct =
        !productFilter ||
        String(batch.productId) === String(productFilter)

      return matchesSearch && matchesStatus && matchesExpiry && matchesDefects && matchesOnHold && matchesRetortDate && matchesAttentionPeriod && matchesProduct
    })
  }, [batches, search, statusFilter, expiryFilter, defectsOnlyFilter, onHoldOnlyFilter, retortDateFilter, retortFrom, retortTo, attentionPeriod, periodDefectBatchIds, productFilter])

  const retortDateLabel = useMemo(
    () => getDateFilterLabel(retortDateFilter, { customFrom: retortFrom, customTo: retortTo }),
    [retortDateFilter, retortFrom, retortTo]
  )

  useEffect(() => {
    setPage(1)
  }, [search, statusFilter, expiryFilter, defectsOnlyFilter, onHoldOnlyFilter, retortDateFilter, retortFrom, retortTo, productFilter])

  const paged = useMemo(() => paginateItems(filtered, page), [filtered, page])

  const kpiScopeBatches = useMemo(() => {
    if (!productFilter) return batches
    return batches.filter((batch) => String(batch.productId) === String(productFilter))
  }, [batches, productFilter])

  const totalBatches = kpiScopeBatches.length
  const mismatchBatches = kpiScopeBatches.filter((batch) => hasBatchExpiryMismatch(batch)).length
  const defectiveBatches = kpiScopeBatches.filter((batch) => batch.defectCount > 0).length
  const onHoldBatches = kpiScopeBatches.filter(isBatchOnHold).length

  const filteredProductLabel = useMemo(() => {
    if (!productFilter) return null
    const match = batches.find((batch) => String(batch.productId) === String(productFilter))
    return match?.productName || match?.productCode || null
  }, [batches, productFilter])

  const filtersCleared =
    !search &&
    !productFilter &&
    statusFilter === 'all' &&
    expiryFilter === 'all' &&
    !defectsOnlyFilter &&
    !onHoldOnlyFilter &&
    retortDateFilter === 'all'

  const expiryMismatchFilterActive =
    expiryFilter === 'mismatch' &&
    !defectsOnlyFilter &&
    !onHoldOnlyFilter &&
    statusFilter === 'all'

  function clearBatchFilters() {
    setSearch('')
    setStatusFilter('all')
    setExpiryFilter('all')
    setDefectsOnlyFilter(false)
    setOnHoldOnlyFilter(false)
    setRetortDateFilter('all')
    setRetortFrom('')
    setRetortTo('')
    setProductFilter(null)
    if (searchParams.get('product_id')) {
      setSearchParams((params) => {
        const next = new URLSearchParams(params)
        next.delete('product_id')
        return next
      })
    }
  }

  function clearProductFilter() {
    setProductFilter(null)
    setSearchParams((params) => {
      const next = new URLSearchParams(params)
      next.delete('product_id')
      return next
    })
  }

  function applyExpiryMismatchFilter() {
    setSearch('')
    setStatusFilter('all')
    setDefectsOnlyFilter(false)
    setOnHoldOnlyFilter(false)
    setExpiryFilter('mismatch')
  }

  if (loading) {
    return <LoadingState label="Loading batches..." />
  }

  return (
    <div className="list-page">
      {showAdd && managerView && (
        <BatchFormModal
          mode="add"
          onClose={() => setShowAdd(false)}
          onSaved={(batchNumber) => {
            loadBatches()
            setMessage({
              type: 'success',
              text: `Batch created successfully${batchNumber ? `: ${batchNumber}` : ''}.`
            })
          }}
        />
      )}

      {editingBatch && managerView && (
        <BatchFormModal
          mode="edit"
          batch={editingBatch}
          onClose={() => setEditingBatch(null)}
          onSaved={(batchNumber) => {
            loadBatches()
            setEditingBatch(null)
            setMessage({
              type: 'success',
              text: `Batch updated successfully${batchNumber ? `: ${batchNumber}` : ''}.`
            })
          }}
        />
      )}

      <PageHeader
        title="Batch Management"
        subtitle="Track production batches, expiry validation, defect records, and batch-level traceability."
      >
        {managerView && (
          <Button onClick={() => setShowAdd(true)}>
            <Plus size={15} />
            Add Batch
          </Button>
        )}
      </PageHeader>

      {message && (
        <div
          className={`mb-4 flex items-center justify-between rounded-xl px-4 py-3 text-sm ${
            message.type === 'success'
              ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border border-red-200 bg-red-50 text-red-700'
          }`}
        >
          <span>{message.text}</span>
          <button type="button" onClick={() => setMessage(null)} className="font-bold">
            ×
          </button>
        </div>
      )}

      {productFilter && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-700">
          <span>
            Showing batches for{' '}
            <strong>{filteredProductLabel || `product #${productFilter}`}</strong>
            {' '}({filtered.length} batch{filtered.length === 1 ? '' : 'es'})
          </span>
          <button
            type="button"
            onClick={clearProductFilter}
            className="font-semibold text-brand-600 hover:text-brand-700 hover:underline"
          >
            Show all products
          </button>
        </div>
      )}

      {mismatchBatches > 0 && (
        <button
          type="button"
          onClick={applyExpiryMismatchFilter}
          aria-label="Filter batches with expiry mismatch"
          title="Show batches with expiry mismatch"
          className={[
            'interactive-lift mb-4 flex w-full cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm text-red-700',
            expiryMismatchFilterActive
              ? 'border-brand-400 bg-red-50 ring-1 ring-brand-200/80'
              : 'border-red-200 bg-red-50'
          ].join(' ')}
        >
          <AlertTriangle size={16} />
          <span>
            {mismatchBatches} batch{mismatchBatches === 1 ? ' has' : 'es have'} an expiry date
            mismatch. Review highlighted batches and create a defect record if needed.
          </span>
        </button>
      )}

      <div className="list-kpi-grid">
        <KPICard
          title="Total Batches"
          value={totalBatches}
          tone="blue"
          icon={<Package size={16} />}
          active={filtersCleared}
          onClick={clearBatchFilters}
          ariaLabel="Show all batches and clear filters"
          hoverTitle="Show all batches and clear filters"
        />
        <KPICard
          title="Defective Batches"
          value={defectiveBatches}
          tone="red"
          active={defectsOnlyFilter && !onHoldOnlyFilter && expiryFilter === 'all' && statusFilter === 'all'}
          onClick={() => {
            setSearch('')
            setStatusFilter('all')
            setExpiryFilter('all')
            setOnHoldOnlyFilter(false)
            setDefectsOnlyFilter(true)
          }}
          ariaLabel="Filter batches with defects"
          hoverTitle="Show batches with one or more defects"
        />
        <KPICard
          title="On Hold Batches"
          value={onHoldBatches}
          tone="amber"
          active={onHoldOnlyFilter && !defectsOnlyFilter && expiryFilter === 'all' && statusFilter === 'all'}
          onClick={() => {
            setSearch('')
            setStatusFilter('all')
            setExpiryFilter('all')
            setDefectsOnlyFilter(false)
            setOnHoldOnlyFilter(true)
          }}
          ariaLabel="Filter on hold batches"
          hoverTitle="Show batches on hold or with held stock"
        />
        <KPICard
          title="Expiry Mismatch"
          value={mismatchBatches}
          tone="red"
          active={expiryMismatchFilterActive}
          onClick={applyExpiryMismatchFilter}
          ariaLabel="Filter batches with expiry mismatch"
          hoverTitle="Show batches where printed expiry differs from correct expiry"
        />
      </div>

      <div className="list-panel">
        <div className="list-toolbar">
          <div className="list-toolbar-search">
            <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-brand-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search batch, product, code, status..."
              className="list-toolbar-search-input"
            />
          </div>
          <select
            aria-label="Status"
            value={statusFilter}
            onChange={(e) => {
              setDefectsOnlyFilter(false)
              setOnHoldOnlyFilter(false)
              setStatusFilter(e.target.value)
            }}
            className="list-toolbar-select"
          >
            <option value="all">All Status</option>
            <option value="approved">Approved</option>
            <option value="on_hold">On Hold</option>
            <option value="defective">Defective</option>
          </select>
          <select
            aria-label="Expiry"
            value={expiryFilter}
            onChange={(e) => {
              setDefectsOnlyFilter(false)
              setOnHoldOnlyFilter(false)
              setExpiryFilter(e.target.value)
            }}
            className="list-toolbar-select-wide"
          >
            <option value="all">All Expiry</option>
            <option value="mismatch">Expiry Mismatch</option>
            <option value="matched">Expiry Matched</option>
          </select>
          <ListCsvExport
            title="Batch Records"
            filename={`qdts-batches-${retortDateLabel.toLowerCase().replace(/\s+/g, '-')}.csv`}
            periodLabel={retortDateLabel}
            columns={BATCH_EXPORT_COLUMNS}
            rows={filtered}
          />
        </div>

        <div className="compact-filter-panel border-t border-brand-border/60 px-3 py-2">
          <ListDateFilter
            label="Retort Date"
            value={retortDateFilter}
            options={RETORT_DATE_OPTIONS}
            onChange={setRetortDateFilter}
            customFrom={retortFrom}
            customTo={retortTo}
            onCustomFromChange={setRetortFrom}
            onCustomToChange={setRetortTo}
          />
        </div>

        <div className="list-panel-body">
          {paged.items.length === 0 ? (
            <EmptyState
              icon={Package}
              title="No batches found"
              description="Try adjusting your search or filters, or add a new production batch."
              actionLabel={managerView ? 'Add Batch' : undefined}
              onAction={managerView ? () => setShowAdd(true) : undefined}
            />
          ) : (
            <div className="compact-list-stack">
              {paged.items.map((batch) => (
                <BatchRow key={batch.id} batch={batch} onEdit={setEditingBatch} managerView={managerView} />
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
    </div>
  )
}

export default Batches
