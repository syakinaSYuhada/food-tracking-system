const express = require('express')

const {
  getDashboardSummary,
  getLossReport,
  getCorrectiveActionReport,
  getRootCauseReport,
  getDefectsByProcessStageReport,
  getRootCauseByProcessAreaReport,
  getRelatedProcessToolReport,
  getExpiryIssueReport,
  getBatchExpiryAuditReport,
  getDiscardedProductReport,
  getByProductReport,
  getByBatchReport
} = require('../controllers/reportController')
const { requireManager } = require('../utils/accessControl')

const router = express.Router()

router.get('/dashboard/summary', requireManager, getDashboardSummary)

router.get('/loss', requireManager, getLossReport)
router.get('/corrective-actions', requireManager, getCorrectiveActionReport)
router.get('/root-causes', requireManager, getRootCauseReport)
router.get('/by-process-stage', requireManager, getDefectsByProcessStageReport)
router.get('/root-cause-by-process-area', requireManager, getRootCauseByProcessAreaReport)
router.get('/related-process-tool', requireManager, getRelatedProcessToolReport)
router.get('/expiry-issues', requireManager, getExpiryIssueReport)
router.get('/batch-expiry-audit', requireManager, getBatchExpiryAuditReport)
router.get('/discarded-products', requireManager, getDiscardedProductReport)
router.get('/by-product', requireManager, getByProductReport)
router.get('/by-batch', requireManager, getByBatchReport)

module.exports = router
