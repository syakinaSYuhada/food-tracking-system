export function normalizeProduct(product) {
  return {
    id: product.id ?? product.product_id,
    name: product.product_name,
    code: product.product_code,
    category: product.category || '-',
    packaging: product.packaging_type || '-',
    size: product.size_weight || product.net_weight || '-',
    shelfLife: product.shelf_life_months || '',
    status: product.product_status || product.status || '-',
    batches: product.batch_count ?? 0,
    activeBatches: product.active_batch_count ?? 0,
    completedBatches: product.completed_batch_count ?? 0,
    defectiveBatches: product.defective_batch_count ?? product.defect_count ?? 0,
    defects: product.defect_count ?? 0,
    storage: product.storage_condition || '',
    description: product.description || '',
    lossRate: product.loss_rate_per_unit || '',
    recentActivity: product.recent_activity || []
  }
}

export function productIcon(category) {
  const value = String(category || '').toLowerCase()
  if (value.includes('meat')) return '🥩'
  if (value.includes('condiment')) return '🌶️'
  if (value.includes('paste')) return '🫙'
  return '📦'
}
