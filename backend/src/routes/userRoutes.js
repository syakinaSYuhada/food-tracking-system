const express = require('express')
const { getUsers, createUser, updateUserStatus } = require('../controllers/userController')
const { requireManager } = require('../utils/accessControl')

const router = express.Router()

router.get('/', requireManager, getUsers)
router.post('/', requireManager, createUser)
router.patch('/:id/status', requireManager, updateUserStatus)

module.exports = router
