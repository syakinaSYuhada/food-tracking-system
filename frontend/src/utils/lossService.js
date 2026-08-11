export function calculateStillSellable({
  qty_relabelled = 0,
  qty_repacked = 0,
  qty_reworked = 0,
  qty_released = 0
}) {
  return Number(qty_relabelled) + Number(qty_repacked) + Number(qty_reworked) + Number(qty_released)
}

export function calculateEstimatedLoss({
  qty_discarded = 0,
  loss_rate_per_unit = 0
}) {
  return Number(qty_discarded) * Number(loss_rate_per_unit)
}

export function validateHandledQuantities({
  qty_affected,
  qty_relabelled = 0,
  qty_repacked = 0,
  qty_discarded = 0,
  qty_on_hold = 0,
  qty_reworked = 0,
  qty_released = 0
}) {
  const affected = Number(qty_affected)
  const values = [qty_relabelled, qty_repacked, qty_discarded, qty_on_hold, qty_reworked, qty_released]

  if (values.some((value) => Number.isNaN(Number(value)) || Number(value) < 0)) {
    return {
      valid: false,
      message: 'Handling quantities cannot be negative.'
    }
  }

  const totalHandled = values.reduce((sum, value) => sum + Number(value), 0)

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
