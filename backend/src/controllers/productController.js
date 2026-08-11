const pool = require('../config/db')
const { successResponse, errorResponse } = require('../middleware/responseHandler')
const { actorId } = require('../utils/accessControl')

function getProductPrefix(productName, category) {
  const name = String(productName || '').toLowerCase()
  const cat = String(category || '').toLowerCase()

  if (name.includes('dendeng')) return 'DD'
  if (name.includes('daging salai') || name.includes('salai') || name.includes('masak lemak')) return 'DSML'
  if (name.includes('chilli') || name.includes('chili')) return 'CO'
  if (name.includes('nasi goreng')) return 'PNG'
  if (name.includes('tumis merah')) return 'PTM'

  if (cat.includes('meat')) return 'MP'
  if (cat.includes('paste')) return 'PST'
  if (cat.includes('condiment')) return 'COND'
  if (cat.includes('oil')) return 'OIL'

  return 'PRD'
}

async function generateProductCode(productName, category) {
  const prefix = getProductPrefix(productName, category)

  const result = await pool.query(
    `
    SELECT product_code
    FROM products
    WHERE product_code LIKE $1
    ORDER BY product_code DESC
    LIMIT 1
    `,
    [`${prefix}-%`]
  )

  let nextNumber = 1

  if (result.rows.length > 0) {
    const lastCode = result.rows[0].product_code
    const lastNumber = Number(String(lastCode).split('-')[1])

    if (!Number.isNaN(lastNumber)) {
      nextNumber = lastNumber + 1
    }
  }

  return `${prefix}-${String(nextNumber).padStart(3, '0')}`
}

async function attachRecentActivity(products) {
  if (!Array.isArray(products) || products.length === 0) return products

  const ids = products.map((product) => product.id)
  const activityResult = await pool.query(
    `
    WITH product_activity AS (
      SELECT d.product_id, al.description, al.created_at
      FROM activity_logs al
      JOIN defects d ON al.entity_type = 'defect' AND al.entity_id = d.id
      UNION ALL
      SELECT b.product_id, al.description, al.created_at
      FROM activity_logs al
      JOIN batches b ON al.entity_type = 'batch' AND al.entity_id = b.id
      UNION ALL
      SELECT d.product_id, al.description, al.created_at
      FROM activity_logs al
      JOIN corrective_actions ca ON al.entity_type = 'corrective_action' AND al.entity_id = ca.id
      JOIN defects d ON ca.defect_id = d.id
    ),
    ranked AS (
      SELECT
        product_id,
        description,
        ROW_NUMBER() OVER (PARTITION BY product_id ORDER BY created_at DESC) AS rn
      FROM product_activity
      WHERE product_id = ANY($1::int[])
    )
    SELECT product_id, description
    FROM ranked
    WHERE rn <= 5
    ORDER BY product_id, rn
    `,
    [ids]
  )

  const activityMap = {}
  for (const row of activityResult.rows) {
    if (!activityMap[row.product_id]) activityMap[row.product_id] = []
    activityMap[row.product_id].push(row.description)
  }

  return products.map((product) => ({
    ...product,
    recent_activity: activityMap[product.id] || []
  }))
}

async function getProducts(req, res) {
  try {
    const result = await pool.query(`
      SELECT
        p.*,
        COUNT(DISTINCT b.id) AS batch_count,
        COUNT(DISTINCT CASE WHEN b.batch_status IN ('approved', 'on_hold') THEN b.id END) AS active_batch_count,
        COUNT(DISTINCT CASE WHEN b.batch_status IN ('closed', 'archived') THEN b.id END) AS completed_batch_count,
        COUNT(DISTINCT CASE WHEN d.id IS NOT NULL THEN b.id END) AS defective_batch_count,
        COUNT(DISTINCT d.id) AS defect_count
      FROM products p
      LEFT JOIN batches b ON p.id = b.product_id
      LEFT JOIN defects d ON p.id = d.product_id
      GROUP BY p.id
      ORDER BY p.id ASC
    `)

    const products = await attachRecentActivity(result.rows)
    return successResponse(res, products, 'Products retrieved successfully')
  } catch (error) {
    return errorResponse(res, error, 500, 'GET_PRODUCTS_ERROR')
  }
}

async function getProductById(req, res) {
  try {
    const { id } = req.params

    const result = await pool.query(
      `
      SELECT
        p.*,
        COUNT(DISTINCT b.id) AS batch_count,
        COUNT(DISTINCT CASE WHEN b.batch_status IN ('approved', 'on_hold') THEN b.id END) AS active_batch_count,
        COUNT(DISTINCT CASE WHEN b.batch_status IN ('closed', 'archived') THEN b.id END) AS completed_batch_count,
        COUNT(DISTINCT CASE WHEN d.id IS NOT NULL THEN b.id END) AS defective_batch_count,
        COUNT(DISTINCT d.id) AS defect_count
      FROM products p
      LEFT JOIN batches b ON p.id = b.product_id
      LEFT JOIN defects d ON p.id = d.product_id
      WHERE p.id = $1
      GROUP BY p.id
      `,
      [id]
    )

    if (result.rows.length === 0) {
      return errorResponse(res, 'Product not found', 404, 'PRODUCT_NOT_FOUND')
    }

    const [product] = await attachRecentActivity(result.rows)
    return successResponse(res, product, 'Product retrieved successfully')
  } catch (error) {
    return errorResponse(res, error, 500, 'GET_PRODUCT_ERROR')
  }
}

async function createProduct(req, res) {
  try {
    const {
      product_name,
      category,
      packaging_type,
      size_weight,
      shelf_life_months,
      loss_rate_per_unit,
      storage_condition,
      product_status,
      description,
      created_by
    } = req.body

    if (!product_name || !category || !packaging_type || !size_weight) {
      return errorResponse(
        res,
        'Product name, category, packaging type, and size/weight are required',
        400,
        'VALIDATION_ERROR'
      )
    }

    if (!shelf_life_months || Number(shelf_life_months) <= 0) {
      return errorResponse(
        res,
        'Shelf life must be greater than 0',
        400,
        'VALIDATION_ERROR'
      )
    }

    if (loss_rate_per_unit === undefined || Number(loss_rate_per_unit) < 0) {
      return errorResponse(
        res,
        'Loss rate per unit is required and cannot be negative',
        400,
        'VALIDATION_ERROR'
      )
    }

    const product_code = await generateProductCode(product_name, category)

    const result = await pool.query(
      `
      INSERT INTO products (
        product_name,
        product_code,
        category,
        packaging_type,
        size_weight,
        shelf_life_months,
        loss_rate_per_unit,
        storage_condition,
        product_status,
        description,
        created_by
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      RETURNING *
      `,
      [
        product_name,
        product_code,
        category,
        packaging_type,
        size_weight,
        Number(shelf_life_months),
        Number(loss_rate_per_unit),
        storage_condition || null,
        product_status || 'active',
        description || null,
        actorId(req) || created_by || null
      ]
    )

    return successResponse(res, result.rows[0], 'Product created successfully', 201)
  } catch (error) {
    if (error.code === '23505') {
      return errorResponse(res, 'Product code already exists', 409, 'DUPLICATE_PRODUCT_CODE')
    }

    return errorResponse(res, error, 500, 'CREATE_PRODUCT_ERROR')
  }
}

async function updateProduct(req, res) {
  try {
    const { id } = req.params

    const {
      product_name,
      category,
      packaging_type,
      size_weight,
      shelf_life_months,
      loss_rate_per_unit,
      storage_condition,
      product_status,
      description,
      updated_by
    } = req.body

    if (!product_name || !category || !packaging_type || !size_weight) {
      return errorResponse(
        res,
        'Product name, category, packaging type, and size/weight are required',
        400,
        'VALIDATION_ERROR'
      )
    }

    if (!shelf_life_months || Number(shelf_life_months) <= 0) {
      return errorResponse(
        res,
        'Shelf life must be greater than 0',
        400,
        'VALIDATION_ERROR'
      )
    }

    if (loss_rate_per_unit === undefined || Number(loss_rate_per_unit) < 0) {
      return errorResponse(
        res,
        'Loss rate per unit is required and cannot be negative',
        400,
        'VALIDATION_ERROR'
      )
    }

    const result = await pool.query(
      `
      UPDATE products
      SET
        product_name = $1,
        category = $2,
        packaging_type = $3,
        size_weight = $4,
        shelf_life_months = $5,
        loss_rate_per_unit = $6,
        storage_condition = $7,
        product_status = $8,
        description = $9,
        updated_by = $10,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $11
      RETURNING *
      `,
      [
        product_name,
        category,
        packaging_type,
        size_weight,
        shelf_life_months ? Number(shelf_life_months) : null,
        Number(loss_rate_per_unit),
        storage_condition || null,
        product_status || 'active',
        description || null,
        actorId(req) || updated_by || null,
        id
      ]
    )

    if (result.rows.length === 0) {
      return errorResponse(res, 'Product not found', 404, 'PRODUCT_NOT_FOUND')
    }

    return successResponse(res, result.rows[0], 'Product updated successfully')
  } catch (error) {
    return errorResponse(res, error, 500, 'UPDATE_PRODUCT_ERROR')
  }
}

async function archiveProduct(req, res) {
  try {
    const { id } = req.params
    const { updated_by } = req.body

    const result = await pool.query(
      `
      UPDATE products
      SET
        product_status = 'archived',
        updated_by = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
      `,
      [actorId(req) || updated_by || null, id]
    )

    if (result.rows.length === 0) {
      return errorResponse(res, 'Product not found', 404, 'PRODUCT_NOT_FOUND')
    }

    return successResponse(
      res,
      result.rows[0],
      'Product archived successfully. Product history is preserved.'
    )
  } catch (error) {
    return errorResponse(res, error, 500, 'ARCHIVE_PRODUCT_ERROR')
  }
}

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  archiveProduct
}
