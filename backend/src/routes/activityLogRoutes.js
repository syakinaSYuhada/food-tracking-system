const express = require('express')
const { getActivityLogs } = require('../controllers/activityLogController')
const { requireManager } = require('../utils/accessControl')

const router = express.Router()

router.get('/', requireManager, getActivityLogs)
module.exports = router
