const express = require('express')
const {
  getBatches,
  getBatchById,
  createBatch,
  updateBatch,
  getBatchDefects,
  getBatchCorrectiveActions
} = require('../controllers/batchController')
const { requireManager } = require('../utils/accessControl')

const router = express.Router()

router.get('/', getBatches)
router.get('/:id', getBatchById)
router.get('/:id/defects', getBatchDefects)
router.get('/:id/corrective-actions', getBatchCorrectiveActions)
router.post('/', requireManager, createBatch)
router.put('/:id', requireManager, updateBatch)

module.exports = router