import { useState } from 'react'
import api from '../api/client'
import Button from './Button'
import BaseModal from './BaseModal'

function Field({ label, children }) {
  return (
    <div className="mb-2">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-sm text-slate-700">{children}</div>
    </div>
  )
}

function TextInput(props) {
  return <input className="w-full rounded-md border px-3 py-2" {...props} />
}

function SelectInput({ children, ...props }) {
  return (
    <select className="w-full rounded-md border px-3 py-2" {...props}>
      {children}
    </select>
  )
}

function TextArea(props) {
  return <textarea className="w-full rounded-md border px-3 py-2" {...props} />
}

function ProductFormModal({ mode, product, onClose, onSaved }) {
  const isEdit = mode === 'edit'

  const [form, setForm] = useState({
    product_name: product?.name || '',
    category: product?.category || 'Meat Product',
    packaging_type: product?.packaging || 'Retort Pouch',
    size_weight: product?.size || '250g',
    shelf_life_months: product?.shelfLife || '',
    loss_rate_per_unit: product?.lossRate || '',
    storage_condition: product?.storage || 'Room Temperature',
    product_status: String(product?.status || 'active').toLowerCase(),
    description: product?.description || ''
  })

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit() {
    if (!form.product_name.trim()) return alert('Please enter the product name.')

    try {
      if (isEdit) {
        await api.put(`/products/${product.id}`, form)
      } else {
        await api.post('/products', form)
      }
      onSaved && onSaved()
      onClose && onClose()
    } catch (err) {
      console.error(err)
      alert('Failed to save product')
    }
  }

  return (
    <BaseModal
      title={isEdit ? 'Edit Product' : 'Add Product'}
      subtitle={
        isEdit
          ? 'Product code cannot be edited because it is used for traceability.'
          : 'Create a new product for future batches and defect records.'
      }
      onClose={onClose}
      size="lg"
      footer={
        <>
          <Button color="slate" onClick={onClose}>Cancel</Button>
          <Button color="blue" onClick={handleSubmit}>
            {isEdit ? 'Save Changes' : 'Add Product'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {isEdit && (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-xs font-semibold uppercase text-slate-500">Product Code</div>
            <div className="mt-1 text-sm font-bold text-slate-900">{product.code || '-'}</div>
          </div>
        )}

        <Field label="Product Name">
          <TextInput value={form.product_name} onChange={(e) => update('product_name', e.target.value)} />
        </Field>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Category">
            <SelectInput value={form.category} onChange={(e) => update('category', e.target.value)}>
              <option>Meat Product</option>
              <option>Paste</option>
              <option>Condiment</option>
              <option>Sauce/Oil</option>
              <option>Other</option>
            </SelectInput>
          </Field>

          <Field label="Packaging">
            <SelectInput value={form.packaging_type} onChange={(e) => update('packaging_type', e.target.value)}>
              <option>Retort Pouch</option>
              <option>Bottle</option>
              <option>Plastic Container</option>
              <option>Vacuum Pack</option>
              <option>Other</option>
            </SelectInput>
          </Field>

          <Field label="Size/Weight">
            <SelectInput value={form.size_weight} onChange={(e) => update('size_weight', e.target.value)}>
              <option>100g</option>
              <option>200g</option>
              <option>250g</option>
              <option>500g</option>
              <option>1kg</option>
              <option>200ml</option>
              <option>Not Fixed</option>
            </SelectInput>
          </Field>

          <Field label="Shelf Life (months)">
            <TextInput value={form.shelf_life_months} onChange={(e) => update('shelf_life_months', e.target.value)} />
          </Field>

          <Field label="Loss Rate per Unit">
            <TextInput value={form.loss_rate_per_unit} onChange={(e) => update('loss_rate_per_unit', e.target.value)} />
          </Field>

          <Field label="Storage">
            <SelectInput value={form.storage_condition} onChange={(e) => update('storage_condition', e.target.value)}>
              <option>Room Temperature</option>
              <option>Chilled</option>
              <option>Frozen</option>
              <option>Dry Storage</option>
            </SelectInput>
          </Field>
        </div>

        <Field label="Status">
          <SelectInput value={form.product_status} onChange={(e) => update('product_status', e.target.value)}>
            <option value="active">Active</option>
            <option value="development">Development</option>
          </SelectInput>
        </Field>

        <Field label="Description">
          <TextArea rows={3} value={form.description} onChange={(e) => update('description', e.target.value)} />
        </Field>
      </div>
    </BaseModal>
  )
}

export default ProductFormModal
