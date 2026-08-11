const express = require('express')
const { getEvidenceFile } = require('../controllers/evidenceController')

const router = express.Router()

router.get('/:id/file', getEvidenceFile)

module.exports = router
