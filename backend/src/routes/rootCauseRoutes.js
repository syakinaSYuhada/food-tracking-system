const express = require('express')

const {
  getRootCauseByDefect,
  updateSuspectedRootCause,
  confirmRootCause
} = require('../controllers/rootCauseController')
const { requireManager, requireWorker } = require('../utils/accessControl')

const router = express.Router()

router.get('/defects/:defectId', getRootCauseByDefect)
router.patch('/defects/:defectId/suspect', requireWorker, updateSuspectedRootCause)
router.patch('/defects/:defectId/confirm', requireManager, confirmRootCause)

module.exports = router
