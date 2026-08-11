const express = require('express')
const uploadEvidence = require('../middleware/upload')
const {
  getCorrectiveActions,
  getCorrectiveActionById,
  assignCorrectiveAction,
  startCorrectiveAction,
  completeCorrectiveAction,
  verifyCorrectiveAction,
  rejectCorrectiveAction,
  cancelCorrectiveAction,
  updateCorrectiveActionDueDate,
  uploadCorrectiveActionEvidence
} = require('../controllers/correctiveActionController')
const { requireManager, requireWorker } = require('../utils/accessControl')

const router = express.Router()

router.get('/', getCorrectiveActions)
router.post('/defects/:defectId/assign', requireManager, assignCorrectiveAction)
router.get('/:id', getCorrectiveActionById)
router.patch('/:id/start', requireWorker, startCorrectiveAction)
router.patch('/:id/complete', requireWorker, completeCorrectiveAction)
router.patch('/:id/verify', requireManager, verifyCorrectiveAction)
router.patch('/:id/reject', requireManager, rejectCorrectiveAction)
router.patch('/:id/cancel', requireManager, cancelCorrectiveAction)
router.patch('/:id/due-date', requireManager, updateCorrectiveActionDueDate)
router.post('/:id/evidence', uploadEvidence.single('evidence'), uploadCorrectiveActionEvidence)

module.exports = router
