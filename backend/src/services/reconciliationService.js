const pool = require('../config/db')
const {
  calculateQtyOnHold,
  calculateStillSellable,
  determineLossStatus
} = require('./lossService')

const COUNTED_CA_STATUSES = ['completed', 'verified']

const QUANTITY_FIELDS = [
  'qty_relabelled',
  'qty_repacked',
  'qty_reworked',
  'qty_discarded',
  'qty_released',
  'estimated_loss',
  'qty_on_hold',
  'still_sellable'
]

function parseDefectId(defectId) {
  const id = Number(defectId)
  if (!Number.isInteger(id) || id <= 0) {
    const error = new Error('Invalid defect id')
    error.status = 400
    error.code = 'INVALID_DEFECT_ID'
    throw error
  }
  return id
}

function valuesMatch(stored, computed, field) {
  if (field === 'estimated_loss') {
    return Math.abs(Number(stored) - Number(computed)) < 0.005
  }
  return Number(stored) === Number(computed)
}

function pickQuantitySnapshot(row) {
  return QUANTITY_FIELDS.reduce((snapshot, field) => {
    snapshot[field] = field === 'estimated_loss'
      ? Number(row[field] || 0)
      : Number(row[field] || 0)
    return snapshot
  }, {})
}

function pickApplySnapshot(row) {
  return {
    ...pickQuantitySnapshot(row),
    loss_status: row.loss_status
  }
}

function buildDrift(storedSnapshot, computedSnapshot) {
  const drift = []

  for (const field of QUANTITY_FIELDS) {
    if (!valuesMatch(storedSnapshot[field], computedSnapshot[field], field)) {
      drift.push({
        field,
        stored: storedSnapshot[field],
        computed: computedSnapshot[field]
      })
    }
  }

  return drift
}

async function loadDefectQuantities(defectId) {
  const defectResult = await pool.query(
    `
    SELECT
      id,
      qty_affected,
      containment_status,
      qty_relabelled,
      qty_repacked,
      qty_reworked,
      qty_discarded,
      qty_released,
      qty_on_hold,
      still_sellable,
      estimated_loss,
      loss_status
    FROM defects
    WHERE id = $1
    `,
    [defectId]
  )

  if (defectResult.rows.length === 0) {
    const error = new Error('Defect not found')
    error.status = 404
    error.code = 'DEFECT_NOT_FOUND'
    throw error
  }

  return defectResult.rows[0]
}

async function sumCountedCorrectiveActionQuantities(defectId) {
  const totalsResult = await pool.query(
    `
    SELECT
      COALESCE(SUM(qty_relabelled), 0)::int AS qty_relabelled,
      COALESCE(SUM(qty_repacked), 0)::int AS qty_repacked,
      COALESCE(SUM(qty_reworked), 0)::int AS qty_reworked,
      COALESCE(SUM(qty_discarded), 0)::int AS qty_discarded,
      COALESCE(SUM(qty_released), 0)::int AS qty_released,
      COALESCE(SUM(calculated_loss), 0)::numeric(12,2) AS estimated_loss
    FROM corrective_actions
    WHERE defect_id = $1
      AND action_type = 'product_handling'
      AND ca_status = ANY($2::text[])
    `,
    [defectId, COUNTED_CA_STATUSES]
  )

  return totalsResult.rows[0]
}

function computeDerivedQuantities(defect, actionTotals) {
  const handlingBase = {
    qty_affected: defect.qty_affected,
    qty_relabelled: Number(actionTotals.qty_relabelled || 0),
    qty_repacked: Number(actionTotals.qty_repacked || 0),
    qty_reworked: Number(actionTotals.qty_reworked || 0),
    qty_released: Number(actionTotals.qty_released || 0),
    qty_discarded: Number(actionTotals.qty_discarded || 0)
  }

  const qtyOnHold = defect.containment_status === 'No Hold Needed'
    ? 0
    : calculateQtyOnHold(handlingBase)

  const stillSellable = calculateStillSellable(handlingBase)

  return {
    qty_relabelled: handlingBase.qty_relabelled,
    qty_repacked: handlingBase.qty_repacked,
    qty_reworked: handlingBase.qty_reworked,
    qty_discarded: handlingBase.qty_discarded,
    qty_released: handlingBase.qty_released,
    estimated_loss: Number(actionTotals.estimated_loss || 0),
    qty_on_hold: qtyOnHold,
    still_sellable: stillSellable
  }
}

async function reconcileDefectQuantities(defectId) {
  const id = parseDefectId(defectId)
  const defect = await loadDefectQuantities(id)
  const actionTotals = await sumCountedCorrectiveActionQuantities(id)
  const computedSnapshot = computeDerivedQuantities(defect, actionTotals)
  const storedSnapshot = pickQuantitySnapshot(defect)
  const drift = buildDrift(storedSnapshot, computedSnapshot)

  return {
    defectId: id,
    drift,
    inSync: drift.length === 0
  }
}

async function applyDefectQuantityReconciliation(defectId, userId = null) {
  const id = parseDefectId(defectId)
  const defect = await loadDefectQuantities(id)
  const actionTotals = await sumCountedCorrectiveActionQuantities(id)
  const computedSnapshot = computeDerivedQuantities(defect, actionTotals)
  const storedSnapshot = pickApplySnapshot(defect)
  const drift = buildDrift(pickQuantitySnapshot(defect), computedSnapshot)

  if (drift.length === 0) {
    return {
      defectId: id,
      inSync: true,
      drift: [],
      before: storedSnapshot,
      after: storedSnapshot
    }
  }

  const computed = computedSnapshot
  const lossStatus = determineLossStatus({
    qty_discarded: computed.qty_discarded,
    isVerifiedOrClosed: false
  })

  const updateResult = await pool.query(
    `
    UPDATE defects
    SET qty_relabelled = $1,
        qty_repacked = $2,
        qty_reworked = $3,
        qty_discarded = $4,
        qty_released = $5,
        estimated_loss = $6,
        qty_on_hold = $7,
        still_sellable = $8,
        loss_status = $9,
        updated_by = $10,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $11
    RETURNING
      qty_relabelled,
      qty_repacked,
      qty_reworked,
      qty_discarded,
      qty_released,
      estimated_loss,
      qty_on_hold,
      still_sellable,
      loss_status
    `,
    [
      computed.qty_relabelled,
      computed.qty_repacked,
      computed.qty_reworked,
      computed.qty_discarded,
      computed.qty_released,
      computed.estimated_loss,
      computed.qty_on_hold,
      computed.still_sellable,
      lossStatus,
      userId,
      id
    ]
  )

  return {
    defectId: id,
    inSync: false,
    drift,
    before: storedSnapshot,
    after: pickApplySnapshot(updateResult.rows[0])
  }
}

module.exports = {
  COUNTED_CA_STATUSES,
  reconcileDefectQuantities,
  applyDefectQuantityReconciliation
}
