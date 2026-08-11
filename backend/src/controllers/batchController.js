const pool = require('../config/db')
const { successResponse, errorResponse } = require('../middleware/responseHandler')
const batchService = require('../services/batchService')
const { formatBatchDates, formatDateOnly } = require('../utils/dateFormatter')
const { toDateOnlyString } = require('../utils/dateOnly')
const { actorId } = require('../utils/accessControl')

function toDateString(val) {
  return toDateOnlyString(val) ?? formatDateOnly(val) ?? null
}

function addBatchMeta(batch) {
  const correctExpiryDate = toDateString(batch.correct_expiry_date)
  const printedExpiryDate = toDateString(batch.printed_expiry_date)
  const expiryDifference = batchService.getExpiryDifference(correctExpiryDate, printedExpiryDate)

  return {
    ...batch,
    expiry_mismatch: batchService.isExpiryMismatch(correctExpiryDate, printedExpiryDate),
    expiry_difference_days: expiryDifference.days,
    expiry_difference_direction: expiryDifference.direction,
    expiry_difference_label: expiryDifference.label
  }
}

async function getBatches(req, res) {
  try {
    const { product_id } = req.query
    const values = []
    let whereClause = ''

    if (product_id) {
      values.push(product_id)
      whereClause = `WHERE b.product_id = $${values.length}`
    }

    const result = await pool.query(`
      SELECT
        b.*,
        p.product_name,
        p.product_code,
        p.category,
        p.packaging_type,
        p.size_weight,
        p.shelf_life_months,
        COUNT(DISTINCT d.id) AS defect_count,
        COALESCE(SUM(d.qty_affected), 0)::int AS total_qty_affected,
        COALESCE(SUM(d.qty_discarded), 0)::int AS total_qty_discarded
      FROM batches b
      JOIN products p ON b.product_id = p.id
      LEFT JOIN defects d ON b.id = d.batch_id
      ${whereClause}
      GROUP BY b.id, p.id
      ORDER BY b.retort_date DESC, b.id DESC
    `, values)

    const batches = result.rows.map((batch) => {
      const formattedBatch = formatBatchDates(batch)

      const expiryDifference = batchService.getExpiryDifference(
        formattedBatch.correct_expiry_date,
        formattedBatch.printed_expiry_date
      )

      return {
        ...formattedBatch,
        expiry_mismatch: formattedBatch.correct_expiry_date !== formattedBatch.printed_expiry_date,
        expiry_difference_days: expiryDifference.days,
        expiry_difference_direction: expiryDifference.direction,
        expiry_difference_label: expiryDifference.label
      }
    })

    return successResponse(res, batches, 'Batches retrieved successfully')
  } catch (error) {
    return errorResponse(res, error, 500, 'GET_BATCHES_ERROR')
  }
}

async function getBatchById(req, res) {
  try {
    const { id } = req.params

    const result = await pool.query(
      `
      SELECT
        b.*,
        p.product_name,
        p.product_code,
        p.category,
        p.packaging_type,
        p.size_weight,
        p.shelf_life_months,
        COUNT(DISTINCT d.id) AS defect_count,
        COALESCE(SUM(d.qty_affected), 0)::int AS total_qty_affected,
        COALESCE(SUM(d.qty_discarded), 0)::int AS total_qty_discarded
      FROM batches b
      JOIN products p ON b.product_id = p.id
      LEFT JOIN defects d ON b.id = d.batch_id
      WHERE b.id = $1
      GROUP BY b.id, p.id
      `,
      [id]
    )

    if (result.rows.length === 0) {
      return errorResponse(res, 'Batch not found', 404, 'BATCH_NOT_FOUND')
    }

    const batch = formatBatchDates(result.rows[0])

    const expiryDifference = batchService.getExpiryDifference(
      batch.correct_expiry_date,
      batch.printed_expiry_date
    )

    return successResponse(
      res,
      {
        ...batch,
        expiry_mismatch: batch.correct_expiry_date !== batch.printed_expiry_date,
        expiry_difference_days: expiryDifference.days,
        expiry_difference_direction: expiryDifference.direction,
        expiry_difference_label: expiryDifference.label
      },
      'Batch retrieved successfully'
    )
  } catch (error) {
    return errorResponse(res, error, 500, 'GET_BATCH_ERROR')
  }
}

async function createBatch(req, res) {
  try {
    const {
      product_id,
      production_date,
      retort_date,
      printed_expiry_date,
      quantity_produced,
      notes,
      created_by
    } = req.body

    if (!product_id || !production_date || !retort_date || !printed_expiry_date || !quantity_produced) {
      return errorResponse(
        res,
        'Product, production date, retort date, printed expiry date, and quantity produced are required',
        400,
        'VALIDATION_ERROR'
      )
    }

    const dateValidation = batchService.validateBatchDates(production_date, retort_date)
    if (!dateValidation.valid) {
      return errorResponse(res, dateValidation.message, 400, 'INVALID_BATCH_DATES')
    }

    if (Number(quantity_produced) <= 0) {
      return errorResponse(res, 'Quantity produced must be greater than 0', 400, 'VALIDATION_ERROR')
    }

    const productResult = await pool.query(
      `
      SELECT id, product_code, shelf_life_months
      FROM products
      WHERE id = $1
      `,
      [product_id]
    )

    if (productResult.rows.length === 0) {
      return errorResponse(res, 'Product not found', 404, 'PRODUCT_NOT_FOUND')
    }

    const product = productResult.rows[0]
    const correctExpiryDate = batchService.calculateCorrectExpiryDate(retort_date, product.shelf_life_months)
    const batchNumber = batchService.generateBatchNumber(product.product_code, retort_date)
    const batchStatus = batchService.determineBatchStatus(correctExpiryDate, printed_expiry_date)

    const result = await pool.query(
      `
      INSERT INTO batches (
        batch_number,
        product_id,
        production_date,
        retort_date,
        correct_expiry_date,
        printed_expiry_date,
        quantity_produced,
        batch_status,
        notes,
        created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
      `,
      [
        batchNumber,
        product_id,
        production_date,
        retort_date,
        correctExpiryDate,
        printed_expiry_date,
        Number(quantity_produced),
        batchStatus,
        notes || null,
        actorId(req) || created_by || null
      ]
    )

    return successResponse(res, addBatchMeta(result.rows[0]), 'Batch created successfully', 201)
  } catch (error) {
    if (error.code === '23505') {
      return errorResponse(res, 'Batch number already exists', 409, 'DUPLICATE_BATCH_NUMBER')
    }

    return errorResponse(res, error, 500, 'CREATE_BATCH_ERROR')
  }
}

async function updateBatch(req, res) {
  try {
    const { id } = req.params
    const {
      product_id,
      production_date,
      retort_date,
      printed_expiry_date,
      quantity_produced,
      notes,
      updated_by
    } = req.body

    if (!product_id || !production_date || !retort_date || !printed_expiry_date || !quantity_produced) {
      return errorResponse(
        res,
        'Product, production date, retort date, printed expiry date, and quantity produced are required',
        400,
        'VALIDATION_ERROR'
      )
    }

    const dateValidation = batchService.validateBatchDates(production_date, retort_date)
    if (!dateValidation.valid) {
      return errorResponse(res, dateValidation.message, 400, 'INVALID_BATCH_DATES')
    }

    if (Number(quantity_produced) <= 0) {
      return errorResponse(res, 'Quantity produced must be greater than 0', 400, 'VALIDATION_ERROR')
    }

    const productResult = await pool.query(
      `
      SELECT id, product_code, shelf_life_months
      FROM products
      WHERE id = $1
      `,
      [product_id]
    )

    if (productResult.rows.length === 0) {
      return errorResponse(res, 'Product not found', 404, 'PRODUCT_NOT_FOUND')
    }

    const product = productResult.rows[0]
    const correctExpiryDate = batchService.calculateCorrectExpiryDate(retort_date, product.shelf_life_months)
    const batchNumber = batchService.generateBatchNumber(product.product_code, retort_date)
    const batchStatus = batchService.determineBatchStatus(correctExpiryDate, printed_expiry_date)

    const result = await pool.query(
      `
      UPDATE batches
      SET
        batch_number = $1,
        product_id = $2,
        production_date = $3,
        retort_date = $4,
        correct_expiry_date = $5,
        printed_expiry_date = $6,
        quantity_produced = $7,
        batch_status = $8,
        notes = $9,
        updated_by = $10,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $11
      RETURNING *
      `,
      [
        batchNumber,
        product_id,
        production_date,
        retort_date,
        correctExpiryDate,
        printed_expiry_date,
        Number(quantity_produced),
        batchStatus,
        notes || null,
        actorId(req) || updated_by || null,
        id
      ]
    )

    if (result.rows.length === 0) {
      return errorResponse(res, 'Batch not found', 404, 'BATCH_NOT_FOUND')
    }

    return successResponse(res, addBatchMeta(result.rows[0]), 'Batch updated successfully')
  } catch (error) {
    if (error.code === '23505') {
      return errorResponse(res, 'Batch number already exists', 409, 'DUPLICATE_BATCH_NUMBER')
    }

    return errorResponse(res, error, 500, 'UPDATE_BATCH_ERROR')
  }
}

async function getBatchDefects(req, res) {
  try {
    const { id } = req.params

    const result = await pool.query(
      `
      SELECT
        d.*,
        p.product_name,
        p.product_code,
        b.batch_number,
        b.production_date,
        b.retort_date,
        b.correct_expiry_date,
        b.printed_expiry_date,
        b.quantity_produced
      FROM defects d
      JOIN products p ON d.product_id = p.id
      JOIN batches b ON d.batch_id = b.id
      WHERE d.batch_id = $1
      ORDER BY d.id ASC
      `,
      [id]
    )

    const defects = result.rows.map((row) => formatBatchDates(row))

    return successResponse(res, defects, 'Batch defects retrieved successfully')
  } catch (error) {
    return errorResponse(res, error, 500, 'GET_BATCH_DEFECTS_ERROR')
  }
}

async function getBatchCorrectiveActions(req, res) {
  try {
    const { id } = req.params

    const batchCheck = await pool.query('SELECT id FROM batches WHERE id = $1', [id])
    if (batchCheck.rows.length === 0) {
      return errorResponse(res, 'Batch not found', 404, 'BATCH_NOT_FOUND')
    }

    const result = await pool.query(
      `
      SELECT
        ca.*,
        d.defect_code,
        d.defect_type,
        d.defect_status,
        assigned_user.full_name AS assigned_to_name
      FROM corrective_actions ca
      JOIN defects d ON ca.defect_id = d.id
      LEFT JOIN users assigned_user ON ca.assigned_to = assigned_user.id
      WHERE d.batch_id = $1
      ORDER BY ca.id ASC
      `,
      [id]
    )

    return successResponse(res, result.rows, 'Batch corrective actions retrieved successfully')
  } catch (error) {
    return errorResponse(res, error, 500, 'GET_BATCH_CORRECTIVE_ACTIONS_ERROR')
  }
}

module.exports = {
  getBatches,
  getBatchById,
  createBatch,
  updateBatch,
  getBatchDefects,
  getBatchCorrectiveActions
}