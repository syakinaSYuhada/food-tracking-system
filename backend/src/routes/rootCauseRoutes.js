const express = require('express')

const {
  getRootCauseByDefect,
  updateSuspectedRootCauseForAction,
  confirmRootCause
} = require('../controllers/rootCauseController')
const { requireManager, requireWorker } = require('../utils/accessControl')

const router = express.Router()

router.get('/defects/:defectId', getRootCauseByDefect)
router.patch('/actions/:actionId/suspect', requireWorker, updateSuspectedRootCauseForAction)
router.patch('/defects/:defectId/confirm', requireManager, confirmRootCause)

module.exports = router
