const express = require('express')
const productRoutes = require('./productRoutes')
const batchRoutes = require('./batchRoutes')
const defectRoutes = require('./defectRoutes')
const correctiveActionRoutes = require('./correctiveActionRoutes')
const rootCauseRoutes = require('./rootCauseRoutes')
const reportRoutes = require('./reportRoutes')
const userRoutes = require('./userRoutes')
const activityLogRoutes = require('./activityLogRoutes')
const authRoutes = require('./authRoutes')
const evidenceRoutes = require('./evidenceRoutes')
const { requireAuth } = require('../middleware/auth')

const router = express.Router()

router.get('/health', (req, res) => {
	res.json({
		success: true,
		message: 'Kak Norie QDTS API running',
		status: 'ok'
	})
})

router.use('/auth', authRoutes)
router.use(requireAuth)

router.use('/products', productRoutes)
router.use('/batches', batchRoutes)
router.use('/defects', defectRoutes)
router.use('/evidence', evidenceRoutes)
router.use('/corrective-actions', correctiveActionRoutes)
router.use('/root-causes', rootCauseRoutes)
router.use('/reports', reportRoutes)
router.use('/users', userRoutes)
router.use('/activity-logs', activityLogRoutes)

module.exports = router

