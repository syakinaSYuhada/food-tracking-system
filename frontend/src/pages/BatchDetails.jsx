import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, CheckSquare, Layers, Package } from 'lucide-react'
import api from '../api/client'
import Button from '../components/Button'
import KPICard from '../components/KPICard'
import LoadingState from '../components/LoadingState'
import SectionCard from '../components/SectionCard'
import StatusBadge from '../components/StatusBadge'
import { formatExpiryDate, hasExpiryMismatch } from '../utils/expiry'
import { isActionOverdue } from '../utils/dueDate'

function formatDate(value) {
  if (!value) return '-'
  return String(value).split('T')[0]
}

function titleCase(value) {
  if (!value) return '-'
  return String(value).replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function Info({ label, value }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-brand-muted">{label}</p>
      <p className="mt-1 font-semibold text-brand-ink">{value || '-'}</p>
    </div>
  )
}

function normalizeBatch(batch) {
  return {
    id: batch.id,
    batchNumber: batch.batch_number,
    productId: batch.product_id,
    productName: batch.product_name,
    productCode: batch.product_code,
    category: batch.category || '-',
    packaging: batch.packaging_type || '-',
    size: batch.size_weight || '-',
    shelfLife: batch.shelf_life_months,
    productionDate: formatDate(batch.production_date),
    retortDate: formatDate(batch.retort_date),
    correctExpiryDate: formatDate(batch.correct_expiry_date),
    printedExpiryDate: formatDate(batch.printed_expiry_date),
    quantityProduced: batch.quantity_produced ?? 0,
    status: batch.batch_status || '-',
    notes: batch.notes || '',
    defectCount: Number(batch.defect_count || 0),
    expiryMismatch: Boolean(batch.expiry_mismatch) || hasExpiryMismatch(batch),
    expiryDifferenceLabel: batch.expiry_difference_label || ''
  }
}

export default function BatchDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [batch, setBatch] = useState(null)
  const [defects, setDefects] = useState([])
  const [actions, setActions] = useState([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      const [batchRes, defectsRes, actionsRes] = await Promise.all([
        api.get(`/batches/${id}`),
        api.get(`/batches/${id}/defects`),
        api.get(`/batches/${id}/corrective-actions`)
      ])

      setBatch(normalizeBatch(batchRes.data.data))
      setDefects(defectsRes.data.data || [])
      setActions(actionsRes.data.data || [])
    } catch (error) {
      console.error(error)
      alert('Could not load batch details.')
      navigate('/batches')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [id])

  if (loading) return <LoadingState label="Loading batch details..." />
  if (!batch) return null

  const openDefects = defects.filter((defect) => defect.defect_status !== 'closed').length
  const openActions = actions.filter((action) => !['verified'].includes(action.ca_status)).length
  const overdueActions = actions.filter((action) => isActionOverdue(action.due_date, action.ca_status)).length

  return (
    <div className="space-y-4">
      <div className="text-sm text-brand-muted">
        <button type="button" onClick={() => navigate('/batches')} className="inline-flex items-center gap-1 hover:text-brand-ink hover:underline">
          <ArrowLeft size={14} /> Back to Batches
        </button>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-brand-ink">{batch.batchNumber}</h1>
          <p className="mt-1 text-sm text-brand-muted">
            {batch.productName} · {batch.productCode} · {batch.packaging} · {batch.size}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge value={batch.status} />
          {batch.expiryMismatch && (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
              <AlertTriangle size={12} /> Expiry mismatch
            </span>
          )}
        </div>
      </div>

      {batch.expiryMismatch && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-900">
          <p className="font-semibold">Expiry traceability — label does not match retort calculation</p>
          <p className="mt-1">
            Expected expiry (retort + shelf life): <b>{batch.correctExpiryDate}</b> ·
            Printed on pouch: <b>{batch.printedExpiryDate}</b>
            {batch.expiryDifferenceLabel ? ` · ${batch.expiryDifferenceLabel}` : ''}
          </p>
          <p className="mt-2 text-red-800">
            This is the core Kak Norie quality issue — wrong printed expiry on retort pouches.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard title="Qty Produced" value={batch.quantityProduced} icon={<Package />} tone="blue" />
        <KPICard title="Defect Cases" value={defects.length} icon={<Layers />} tone="amber" />
        <KPICard title="Open Defects" value={openDefects} icon={<AlertTriangle />} tone="red" highlight={openDefects > 0} />
        <KPICard title="Corrective Actions" value={actions.length} icon={<CheckSquare />} tone="purple" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="Production & Retort">
          <div className="grid grid-cols-2 gap-4">
            <Info label="Production Date" value={batch.productionDate} />
            <Info label="Retort Date" value={batch.retortDate} />
            <Info label="Shelf Life" value={batch.shelfLife ? `${batch.shelfLife} months` : '-'} />
            <Info label="Batch Status" value={titleCase(batch.status)} />
          </div>
        </SectionCard>

        <SectionCard title="Expiry Traceability">
          <div className="grid grid-cols-2 gap-4">
            <Info label="Expected Expiry" value={batch.correctExpiryDate} />
            <Info label="Printed Expiry" value={batch.printedExpiryDate} />
            <Info label="Mismatch" value={batch.expiryMismatch ? 'Yes' : 'No'} />
            <Info label="Difference" value={batch.expiryDifferenceLabel || (batch.expiryMismatch ? 'Dates differ' : 'Dates match')} />
          </div>
          <Button className="mt-4" color="slate" variant="subtle" size="sm" onClick={() => navigate(`/products/${batch.productId}`)}>
            View Product
          </Button>
        </SectionCard>
      </div>

      {batch.notes && (
        <SectionCard title="Notes">
          <p className="text-sm text-brand-muted">{batch.notes}</p>
        </SectionCard>
      )}

      <SectionCard
        title="Linked Defect Records"
        subtitle={`${defects.length} defect case${defects.length === 1 ? '' : 's'} recorded for this batch.`}
      >
        {defects.length === 0 ? (
          <p className="text-sm text-brand-muted">No defects recorded for this batch.</p>
        ) : (
          <div className="space-y-3">
            {defects.map((defect) => (
              <div key={defect.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-border/70 bg-white p-4">
                <div>
                  <div className="font-semibold text-brand-ink">{defect.defect_code} — {defect.defect_type}</div>
                  <div className="mt-1 text-sm text-brand-muted">
                    Qty affected: {defect.qty_affected ?? 0} · Reported {formatDate(defect.created_at)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge value={defect.defect_status} />
                  <Button size="sm" color="blue" onClick={() => navigate(`/defects/${defect.id}`)}>Open</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Corrective Actions"
        subtitle={overdueActions > 0 ? `${overdueActions} overdue action${overdueActions === 1 ? '' : 's'} on this batch.` : `${openActions} open action${openActions === 1 ? '' : 's'}.`}
      >
        {actions.length === 0 ? (
          <p className="text-sm text-brand-muted">No corrective actions linked to this batch yet.</p>
        ) : (
          <div className="space-y-3">
            {actions.map((action) => {
              const overdue = isActionOverdue(action.due_date, action.ca_status)
              return (
                <div key={action.id} className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 ${overdue ? 'border-red-200 bg-red-50/40' : 'border-brand-border/70 bg-white'}`}>
                  <div>
                    <div className="font-semibold text-brand-ink">{action.action_code}</div>
                    <div className="mt-1 text-sm text-brand-muted">
                      {action.task} · {action.defect_code}
                      {action.due_date ? ` · Due ${formatDate(action.due_date)}` : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {overdue && (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">Overdue</span>
                    )}
                    <StatusBadge kind="ca" value={action.ca_status} />
                    <Button size="sm" color="blue" onClick={() => navigate(`/corrective-actions/${action.id}`)}>Open</Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </SectionCard>
    </div>
  )
}
