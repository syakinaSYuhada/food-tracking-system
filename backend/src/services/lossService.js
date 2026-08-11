function calculateStillSellable({
  qty_relabelled = 0,
  qty_repacked = 0,
  qty_reworked = 0,
  qty_released = 0
}) {
  return Number(qty_relabelled) + Number(qty_repacked) + Number(qty_reworked) + Number(qty_released)
}

function calculateEstimatedLoss({
  qty_discarded = 0,
  loss_rate_per_unit = 0
}) {
  return Number(qty_discarded) * Number(loss_rate_per_unit)
}

function calculateQtyOnHold({
  qty_affected = 0,
  qty_relabelled = 0,
  qty_repacked = 0,
  qty_reworked = 0,
  qty_released = 0,
  qty_discarded = 0
}) {
  const remaining =
    Number(qty_affected) -
    Number(qty_relabelled) -
    Number(qty_repacked) -
    Number(qty_reworked) -
    Number(qty_released) -
    Number(qty_discarded)

  return Math.max(0, remaining)
}

function clampNonNegative(value) {
  return Math.max(0, Number(value) || 0)
}

function validateCumulativeHandledQuantities(defect, delta = {}) {
  const affected = Number(defect.qty_affected)

  const totalHandled =
    Number(defect.qty_relabelled) + Number(delta.qty_relabelled || 0) +
    Number(defect.qty_repacked) + Number(delta.qty_repacked || 0) +
    Number(defect.qty_reworked) + Number(delta.qty_reworked || 0) +
    Number(defect.qty_released) + Number(delta.qty_released || 0) +
    Number(defect.qty_discarded) + Number(delta.qty_discarded || 0)

  if (totalHandled > affected) {
    return {
      valid: false,
      message: `Cumulative handled quantity (${totalHandled}) cannot exceed quantity affected (${affected}).`
    }
  }

  return { valid: true, totalHandled }
}

function determineLossStatus({
  qty_discarded = 0,
  isVerifiedOrClosed = false
}) {
  if (Number(qty_discarded) === 0) {
    return 'no_loss'
  }

  if (isVerifiedOrClosed) {
    return 'loss_confirmed'
  }

  return 'pending_review'
}

function validateHandledQuantities({
  qty_affected,
  qty_relabelled = 0,
  qty_repacked = 0,
  qty_discarded = 0,
  qty_on_hold = 0,
  qty_reworked = 0,
  qty_released = 0
}) {
  const affected = Number(qty_affected)

  const totalHandled =
    Number(qty_relabelled) +
    Number(qty_repacked) +
    Number(qty_discarded) +
    Number(qty_on_hold) +
    Number(qty_reworked) +
    Number(qty_released)

  if ([qty_relabelled, qty_repacked, qty_discarded, qty_on_hold, qty_reworked, qty_released].some((n) => Number.isNaN(Number(n)) || Number(n) < 0)) {
    return {
      valid: false,
      message: 'Handling quantities cannot be negative.'
    }
  }

  if (totalHandled > affected) {
    return {
      valid: false,
      message: `Handled quantity (${totalHandled}) cannot exceed quantity affected (${affected}).`
    }
  }

  return {
    valid: true,
    totalHandled
  }
}

module.exports = {
  calculateStillSellable,
  calculateEstimatedLoss,
  calculateQtyOnHold,
  clampNonNegative,
  determineLossStatus,
  validateHandledQuantities,
  validateCumulativeHandledQuantities
}
