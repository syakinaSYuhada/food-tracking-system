const express = require('express')
const { login, getCurrentUser, requireAuth } = require('../controllers/authController')

const router = express.Router()

router.post('/login', login)
router.get('/me', requireAuth, getCurrentUser)

module.exports = router
