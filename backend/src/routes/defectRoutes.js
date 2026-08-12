const express = require('express')
const uploadEvidence = require('../middleware/upload')
const {
  getDefects,
  getDefectById,
  getDefectActivity,
  createDefect,
  updateDefect,
  getStages,
  getDefectTypesByStage,
  getWorkflowRulesByStage,
  getWorkflowRuleByType,
  getRootCauseOptions,
  confirmRootCause,
  startReview,
  closeDefect,
  updateDefectDetails,
  uploadDefectEvidence
} = require('../controllers/defectController')
const { requireManager } = require('../utils/accessControl')

const router = express.Router()

router.get('/', getDefects)
router.post('/', createDefect)

// Option/rule routes must be before /:id
router.get('/rules/stages', getStages)
router.get('/rules/categories', getStages)
router.get('/rules/by-stage/:stage', getWorkflowRulesByStage)
router.get('/rules/by-type/:defectType', getWorkflowRuleByType)
router.get('/rules/by-category/:category', getWorkflowRulesByStage)
router.get('/options/by-stage/:stage', getDefectTypesByStage)
router.get('/options/by-category/:category', getDefectTypesByStage)
router.get('/root-cause-options', getRootCauseOptions)

router.get('/:id/activity', getDefectActivity)
router.get('/:id', getDefectById)
router.put('/:id', requireManager, updateDefect)
router.patch('/:id/start-review', requireManager, startReview)
router.patch('/:id/details', requireManager, updateDefectDetails)
router.patch('/:id/root-cause', requireManager, confirmRootCause)
router.patch('/:id/close', requireManager, closeDefect)
router.post('/:id/evidence', uploadEvidence.single('evidence'), uploadDefectEvidence)

module.exports = router
