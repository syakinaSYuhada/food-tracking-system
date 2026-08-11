const { addMonthsToDateOnly, diffDateOnlyDays } = require('../utils/dateOnly')

function formatDateToYYYYMMDD(dateString) {
  return String(dateString).replaceAll('-', '')
}

function generateBatchNumber(productCode, retortDate) {
  return `${productCode}-B-${formatDateToYYYYMMDD(retortDate)}`
}

function calculateCorrectExpiryDate(retortDate, shelfLifeMonths) {
  return addMonthsToDateOnly(retortDate, shelfLifeMonths)
}

function isExpiryMismatch(correctExpiryDate, printedExpiryDate) {
  return correctExpiryDate !== printedExpiryDate
}

function getExpiryDifference(correctExpiryDate, printedExpiryDate) {
  const diffDays = diffDateOnlyDays(correctExpiryDate, printedExpiryDate)

  if (diffDays === 0) {
    return {
      days: 0,
      direction: 'match',
      label: 'Dates match'
    }
  }

  if (diffDays > 0) {
    return {
      days: diffDays,
      direction: 'early',
      label: `${diffDays} day${diffDays === 1 ? '' : 's'} early`
    }
  }

  const lateDays = Math.abs(diffDays)
  return {
    days: lateDays,
    direction: 'late',
    label: `${lateDays} day${lateDays === 1 ? '' : 's'} late`
  }
}

function determineBatchStatus(correctExpiryDate, printedExpiryDate) {
  return isExpiryMismatch(correctExpiryDate, printedExpiryDate) ? 'defective' : 'approved'
}

function validateBatchDates(productionDate, retortDate) {
  if (!productionDate || !retortDate) {
    return {
      valid: false,
      message: 'Production date and retort date are required'
    }
  }

  if (retortDate < productionDate) {
    return {
      valid: false,
      message: 'Retort date cannot be earlier than production date'
    }
  }

  return {
    valid: true,
    message: 'Valid dates'
  }
}

module.exports = {
  formatDateToYYYYMMDD,
  generateBatchNumber,
  calculateCorrectExpiryDate,
  isExpiryMismatch,
  getExpiryDifference,
  determineBatchStatus,
  validateBatchDates
}
