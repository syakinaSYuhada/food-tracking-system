import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, Edit, Archive, Package } from 'lucide-react'
import api from '../api/client'
import Button from '../components/Button'
import KPICard from '../components/KPICard'
import PageHeader from '../components/PageHeader'
import LoadingState from '../components/LoadingState'
import EmptyState from '../components/EmptyState'
import EntityRow from '../components/EntityRow'
import ProductFormModal from '../components/ProductFormModal'
import ListPagination from '../components/ListPagination'
import { normalizeProduct, productIcon } from '../utils/product'
import { isManager } from '../utils/roleAccess'
import { useToast } from '../components/Toast'

function titleCase(value) {
  if (!value) return '-'
  return String(value).replaceAll('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

const PRODUCT_EXPORT_COLUMNS = [
  { key: 'name', label: 'Product Name' },
  { key: 'code', label: 'Product Code' },
  { key: 'category', label: 'Category' },
  { key: 'packaging', label: 'Packaging Type' },
  { key: 'size', label: 'Size/Weight' },
  { key: 'shelfLife', label: 'Shelf Life', exportValue: (row) => (row.shelfLife ? `${row.shelfLife} months` : '-') },
  { key: 'status', label: 'Status', exportValue: (row) => titleCase(row.status) },
  { key: 'defects', label: 'Defect Count' },
  { key: 'batches', label: 'Batch Count' }
]
import { paginateItems } from '../utils/pagination'
import ListCsvExport from '../components/ListCsvExport'
import LabeledFilterSelect from '../components/LabeledFilterSelect'
import FilterToggleButton from '../components/FilterToggleButton'

function DetailField({ label, value }) {
  return (
    <div className="mb-2">
      <div className="text-xs text-brand-muted">{label}</div>
      <div className="text-sm font-medium text-brand-ink">{value || '-'}</div>
    </div>
  )
}

function DeleteModal({ onClose, onArchive }) {
  return (
    <div className="p-4">
      <div className="text-lg font-semibold text-brand-ink">Product Cannot Be Deleted</div>
      <div className="mt-2 text-sm text-brand-muted">
        Products with batch or defect history should not be deleted. Archive this product instead to
        preserve traceability.
      </div>
      <div className="mt-4 flex gap-2">
        <Button color="slate" variant="subtle" onClick={onClose}>
          Cancel
        </Button>
        <Button color="red" onClick={onArchive}>
          Archive Instead
        </Button>
      </div>
    </div>
  )
}

function ProductRow({ product, onReload, managerView }) {
  const navigate = useNavigate()
  const toast = useToast()
  const [expanded, setExpanded] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [showEdit, setShowEdit] = useState(false)

  async function archiveProduct() {
    try {
      await api.patch(`/products/${product.id}/archive`)
      onReload()
    } catch (error) {
      console.error(error)
      toast.error('Failed to archive product.')
    }
  }

  return (
    <>
      {showDelete && (
        <DeleteModal
          onClose={() => setShowDelete(false)}
          onArchive={async () => {
            await archiveProduct()
            setShowDelete(false)
          }}
        />
      )}

      {showEdit && (
        <ProductFormModal
          mode="edit"
          product={product}
          onClose={() => setShowEdit(false)}
          onSaved={onReload}
        />
      )}

      <EntityRow
        icon={<div className="list-row-icon bg-brand-50 text-base">{productIcon(product.category)}</div>}
        title={product.name}
        subtitle={`${product.code || '-'} · ${product.category} · ${product.packaging} · ${product.size}`}
        badges={[
          { label: `${product.defects} defects`, tone: Number(product.defects) > 0 ? 'red' : 'slate' },
          { label: `${product.batches} batches`, tone: 'blue' }
        ]}
        actions={[
          { intent: 'view', onClick: () => navigate(`/products/${product.id}`) },
          ...(managerView ? [
            { icon: Edit, label: 'Edit', tone: 'slate', onClick: () => setShowEdit(true) },
            { icon: Archive, label: 'Archive', tone: 'amber', onClick: () => setShowDelete(true) }
          ] : [])
        ]}
        expanded={expanded}
        onToggle={() => setExpanded((current) => !current)}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <EntityRow.InfoCard title="Product Information">
            {[
              ['Category', product.category],
              ['Packaging', product.packaging],
              ['Size', product.size],
              ['Shelf Life', product.shelfLife ? `${product.shelfLife} months` : '-'],
              ['Storage', product.storage || '-'],
              ['Loss Rate / Unit', product.lossRate ? `RM ${Number(product.lossRate).toFixed(2)}` : '-']
            ].map(([label, value]) => (
              <DetailField key={label} label={label} value={value} />
            ))}

            <p className="mt-2 text-sm text-brand-muted">
              {product.description || 'No product description recorded.'}
            </p>
          </EntityRow.InfoCard>

          <EntityRow.InfoCard title="Batch Summary">
            {[
              ['Total Batches', product.batches],
              ['Active Batches', product.activeBatches],
              ['Completed Batches', product.completedBatches],
              ['Defective Batches', product.defectiveBatches ?? product.defects]
            ].map(([label, value]) => (
              <DetailField key={label} label={label} value={value} />
            ))}

            <Button
              color="brand"
              variant="subtle"
              className="mt-4 w-full"
              onClick={() => navigate('/batches')}
            >
              View All Batches
            </Button>
          </EntityRow.InfoCard>
        </div>
      </EntityRow>
    </>
  )
}

function Products({ user }) {
  const toast = useToast()
  const managerView = isManager(user)
  const [products, setProducts] = useState([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [defectsOnlyFilter, setDefectsOnlyFilter] = useState(false)
  const [page, setPage] = useState(1)
  const [showAdd, setShowAdd] = useState(false)
  const [loading, setLoading] = useState(true)
  const [filtersOpen, setFiltersOpen] = useState(false)

  const activeFilterCount = [
    statusFilter !== 'all',
    categoryFilter !== 'all',
    defectsOnlyFilter
  ].filter(Boolean).length

  useEffect(() => {
    if (activeFilterCount > 0) setFiltersOpen(true)
  }, [activeFilterCount])

  async function loadProducts() {
    try {
      const res = await api.get('/products')
      setProducts((res.data.data || []).map(normalizeProduct))
    } catch (error) {
      console.error(error)
      toast.error('Products could not be loaded. Please refresh and try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProducts()
  }, [])

  const categories = useMemo(() => {
    return [...new Set(products.map((product) => product.category).filter(Boolean))].sort()
  }, [products])

  const filtered = useMemo(() => {
    const keyword = search.toLowerCase()

    return products.filter((product) => {
      const matchesSearch =
        product.name.toLowerCase().includes(keyword) ||
        product.code.toLowerCase().includes(keyword) ||
        product.category.toLowerCase().includes(keyword) ||
        product.packaging.toLowerCase().includes(keyword) ||
        product.status.toLowerCase().includes(keyword)

      const matchesStatus =
        statusFilter === 'all' ||
        String(product.status).toLowerCase() === statusFilter

      const matchesCategory =
        categoryFilter === 'all' ||
        product.category === categoryFilter

      const matchesDefects =
        !defectsOnlyFilter ||
        Number(product.defects) > 0

      return matchesSearch && matchesStatus && matchesCategory && matchesDefects
    })
  }, [products, search, statusFilter, categoryFilter, defectsOnlyFilter])

  useEffect(() => {
    setPage(1)
  }, [search, statusFilter, categoryFilter, defectsOnlyFilter])

  const paged = useMemo(() => paginateItems(filtered, page), [filtered, page])

  const totalProducts = products.length
  const activeProducts = products.filter((p) => String(p.status).toLowerCase() === 'active').length
  const developmentProducts = products.filter(
    (p) => String(p.status).toLowerCase() === 'development'
  ).length
  const productsWithDefects = products.filter((p) => Number(p.defects) > 0).length
  const filtersCleared =
    !search &&
    statusFilter === 'all' &&
    categoryFilter === 'all' &&
    !defectsOnlyFilter

  function clearProductFilters() {
    setSearch('')
    setStatusFilter('all')
    setCategoryFilter('all')
    setDefectsOnlyFilter(false)
  }

  if (loading) {
    return <LoadingState label="Loading products..." />
  }

  return (
    <div className="list-page">
      {showAdd && managerView && (
        <ProductFormModal mode="add" onClose={() => setShowAdd(false)} onSaved={loadProducts} />
      )}

      <PageHeader
        title="Products"
        subtitle="Manage product records, shelf life, and batch traceability."
      >
        {managerView && (
          <Button onClick={() => setShowAdd(true)}>
            <Plus size={15} />
            Add Product
          </Button>
        )}
      </PageHeader>

      <div className="list-kpi-grid">
        <KPICard
          title="Total Products"
          value={totalProducts}
          tone="blue"
          icon={<Package size={16} />}
          active={filtersCleared}
          onClick={clearProductFilters}
          ariaLabel="Show all products and clear filters"
          hoverTitle="Show all products and clear filters"
        />
        <KPICard
          title="Active"
          value={activeProducts}
          tone="green"
          active={statusFilter === 'active' && !defectsOnlyFilter}
          onClick={() => {
            setDefectsOnlyFilter(false)
            setStatusFilter('active')
          }}
          ariaLabel="Filter products with Active status"
          hoverTitle="Filter products with Active status"
        />
        <KPICard
          title="Development"
          value={developmentProducts}
          tone="amber"
          active={statusFilter === 'development' && !defectsOnlyFilter}
          onClick={() => {
            setDefectsOnlyFilter(false)
            setStatusFilter('development')
          }}
          ariaLabel="Filter products with Development status"
          hoverTitle="Filter products with Development status"
        />
        <KPICard
          title="Products w/ Defects"
          value={productsWithDefects}
          tone="red"
          active={defectsOnlyFilter}
          onClick={() => {
            setDefectsOnlyFilter(true)
            setStatusFilter('all')
          }}
          ariaLabel="Filter products with defects"
          hoverTitle="Filter products with one or more defects"
        />
      </div>

      <div className="list-panel">
        <div className="list-toolbar">
          <div className="list-toolbar-search">
            <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-brand-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, code, category, packaging..."
              className="list-toolbar-search-input"
            />
          </div>
          <FilterToggleButton
            open={filtersOpen}
            activeCount={activeFilterCount}
            onClick={() => setFiltersOpen((current) => !current)}
          />
          {(statusFilter !== 'all' || categoryFilter !== 'all' || search || defectsOnlyFilter) && (
            <Button
              color="slate"
              variant="ghost"
              size="sm"
              className="list-action-btn"
              onClick={clearProductFilters}
            >
              Clear
            </Button>
          )}
          <ListCsvExport
            title="Products"
            filename="qdts-products.csv"
            periodLabel="All Products"
            columns={PRODUCT_EXPORT_COLUMNS}
            rows={filtered}
          />
        </div>

        {filtersOpen && (
          <div className="compact-filter-panel border-t border-brand-border/60 px-3 py-2">
            <LabeledFilterSelect
              label="Status"
              value={statusFilter}
              onChange={(value) => {
                setDefectsOnlyFilter(false)
                setStatusFilter(value)
              }}
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'active', label: 'Active' },
                { value: 'development', label: 'Development' },
                { value: 'archived', label: 'Archived' }
              ]}
            />
            <LabeledFilterSelect
              label="Category"
              value={categoryFilter}
              onChange={setCategoryFilter}
              options={[
                { value: 'all', label: 'All Categories' },
                ...categories.map((category) => ({ value: category, label: category }))
              ]}
            />
          </div>
        )}

        <div className="list-panel-body">
          {paged.items.length === 0 ? (
            !filtersCleared ? (
              <EmptyState
                icon={Package}
                title="No products match this filter"
                description="Try clearing the search or filters."
              />
            ) : (
              <EmptyState
                icon={Package}
                title="No products yet"
                description="Products will appear here once you add them."
                actionLabel={managerView ? 'Add Product' : undefined}
                onAction={managerView ? () => setShowAdd(true) : undefined}
              />
            )
          ) : (
            <div className="compact-list-stack">
              {paged.items.map((product) => (
                <ProductRow key={product.id} product={product} onReload={loadProducts} managerView={managerView} />
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

export default Products
