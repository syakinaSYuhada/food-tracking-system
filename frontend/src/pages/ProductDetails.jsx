import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Edit, Eye, Layers, Package, AlertTriangle } from 'lucide-react'
import api from '../api/client'
import Button from '../components/Button'
import KPICard from '../components/KPICard'
import LoadingState from '../components/LoadingState'
import ProductFormModal from '../components/ProductFormModal'
import SectionCard from '../components/SectionCard'
import StatusBadge from '../components/StatusBadge'
import { normalizeProduct, productIcon } from '../utils/product'
import { useToast } from '../components/Toast'

function formatDate(value) {
  if (!value) return '-'
  return String(value).split('T')[0]
}

function normalizeBatch(batch) {
  return {
    id: batch.id,
    batchNumber: batch.batch_number,
    retortDate: formatDate(batch.retort_date),
    quantityProduced: batch.quantity_produced ?? 0,
    status: batch.batch_status || '-',
    defectCount: Number(batch.defect_count || 0),
    expiryMismatch: Boolean(batch.expiry_mismatch)
  }
}

function normalizeDefect(defect) {
  return {
    id: defect.id,
    code: defect.defect_code,
    batchNumber: defect.batch_number,
    defectType: defect.defect_type,
    status: defect.defect_status,
    qtyAffected: Number(defect.qty_affected || 0),
    createdAt: formatDate(defect.created_at)
  }
}

function Info({ label, value }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-brand-muted">{label}</p>
      <p className="mt-1 font-semibold text-brand-ink">{value || '-'}</p>
    </div>
  )
}

export default function ProductDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const [product, setProduct] = useState(null)
  const [batches, setBatches] = useState([])
  const [defects, setDefects] = useState([])
  const [loading, setLoading] = useState(true)
  const [showEdit, setShowEdit] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const [productRes, batchesRes, defectsRes] = await Promise.all([
        api.get(`/products/${id}`),
        api.get('/batches', { params: { product_id: id } }),
        api.get('/defects', { params: { product_id: id } })
      ])

      setProduct(normalizeProduct(productRes.data.data))
      setBatches((batchesRes.data.data || []).map(normalizeBatch))
      setDefects((defectsRes.data.data || []).map(normalizeDefect))
    } catch (error) {
      console.error(error)
      toast.error('Could not load product details.')
      navigate('/products')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [id])

  if (loading) {
    return <LoadingState label="Loading product details..." />
  }

  if (!product) {
    return <div className="text-sm text-red-600">Product not found.</div>
  }

  return (
    <div className="space-y-6">
      {showEdit && (
        <ProductFormModal
          mode="edit"
          product={product}
          onClose={() => setShowEdit(false)}
          onSaved={load}
        />
      )}

      <div className="text-sm text-brand-muted">
        <button
          type="button"
          onClick={() => navigate('/products')}
          className="inline-flex items-center gap-1 hover:text-brand-ink hover:underline"
        >
          <ArrowLeft size={14} />
          Back to Products
        </button>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-3xl">
            {productIcon(product.category)}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-brand-ink">{product.name}</h1>
            <p className="mt-1 text-sm text-brand-muted">
              {product.code} · {product.category} · {product.packaging} · {product.size}
            </p>
            <div className="mt-3">
              <StatusBadge value={product.status} />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button color="slate" variant="subtle" onClick={() => navigate(`/batches?product_id=${id}`)}>
            <Layers size={16} />
            View Batches
          </Button>
          <Button onClick={() => setShowEdit(true)}>
            <Edit size={16} />
            Edit Product
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <KPICard title="Total Batches" value={product.batches} tone="blue" icon={<Layers size={18} />} />
        <KPICard title="Active Batches" value={product.activeBatches} tone="green" />
        <KPICard
          title="Defect Records"
          value={product.defects}
          tone={Number(product.defects) > 0 ? 'red' : 'slate'}
          icon={<AlertTriangle size={18} />}
        />
        <KPICard
          title="Loss Rate / Unit"
          value={product.lossRate ? `RM ${Number(product.lossRate).toFixed(2)}` : '-'}
          tone="amber"
          icon={<Package size={18} />}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <SectionCard title="Product Information">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Info label="Product Code" value={product.code} />
            <Info label="Category" value={product.category} />
            <Info label="Packaging" value={product.packaging} />
            <Info label="Size / Weight" value={product.size} />
            <Info label="Shelf Life" value={product.shelfLife ? `${product.shelfLife} months` : '-'} />
            <Info label="Storage" value={product.storage || '-'} />
          </div>
          <div className="mt-4 rounded-2xl border border-brand-border bg-brand-50/60 p-4 text-sm text-brand-muted">
            {product.description || 'No product description recorded.'}
          </div>
        </SectionCard>

        <SectionCard title="Batch Summary">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Info label="Total Batches" value={product.batches} />
            <Info label="Active Batches" value={product.activeBatches} />
            <Info label="Completed Batches" value={product.completedBatches} />
            <Info label="Defective Batches" value={product.defectiveBatches} />
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="Related Batches"
        subtitle={`${batches.length} batch${batches.length === 1 ? '' : 'es'} recorded for this product.`}
      >
        {batches.length === 0 ? (
          <p className="text-sm text-brand-muted">No batches recorded for this product yet.</p>
        ) : (
          <div className="space-y-3">
            {batches.slice(0, 5).map((batch) => (
              <div
                key={batch.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-border/70 bg-white p-4"
              >
                <div>
                  <div className="font-semibold text-brand-ink">{batch.batchNumber}</div>
                  <div className="text-sm text-brand-muted">
                    Retort {batch.retortDate} · {batch.quantityProduced} units
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge value={batch.status} />
                  {batch.expiryMismatch && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
                      <AlertTriangle size={12} />
                      Expiry mismatch
                    </span>
                  )}
                  {batch.defectCount > 0 && (
                    <span className="rounded-full bg-red-50 px-2 py-1 text-xs font-semibold text-red-600">
                      {batch.defectCount} defects
                    </span>
                  )}
                  <Button size="sm" color="blue" onClick={() => navigate(`/batches/${batch.id}`)}>
                    Open
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
        {batches.length > 5 && (
          <Button size="sm" color="slate" variant="subtle" className="mt-3" onClick={() => navigate(`/batches?product_id=${product.id}`)}>
            View All Batches for This Product ({batches.length})
          </Button>
        )}
      </SectionCard>

      <SectionCard
        title="Related Defects"
        subtitle={`${defects.length} defect record${defects.length === 1 ? '' : 's'} for this product.`}
      >
        {defects.length === 0 ? (
          <p className="text-sm text-brand-muted">No defect records for this product.</p>
        ) : (
          <div className="space-y-3">
            {defects.slice(0, 5).map((defect) => (
              <div
                key={defect.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-border/70 bg-white p-4"
              >
                <div>
                  <div className="font-semibold text-brand-ink">{defect.code}</div>
                  <div className="text-sm text-brand-muted">
                    {defect.defectType} · Batch {defect.batchNumber} · {defect.qtyAffected} affected
                  </div>
                  <div className="mt-1 text-xs text-brand-muted">Reported {defect.createdAt}</div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge value={defect.status} />
                  <Button size="sm" color="blue" onClick={() => navigate(`/defects/${defect.id}`)}>
                    <Eye size={14} />
                    View
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
        {defects.length > 5 && (
          <Button size="sm" color="slate" variant="subtle" className="mt-3" onClick={() => navigate(`/defects?search=${encodeURIComponent(product.name)}`)}>
            View All Defects for This Product ({defects.length})
          </Button>
        )}
      </SectionCard>
    </div>
  )
}
