const { formatBatchDates } = require('./dateFormatter')
const correctiveActionService = require('../services/correctiveActionService')

function formatActionRow(row) {
  return {
    ...formatBatchDates(row),
    status_explanation: correctiveActionService.getStatusExplanation(row.ca_status)
  }
}

module.exports = {
  formatActionRow
}
