const express = require('express')
const { getUsers, createUser } = require('../controllers/userController')
const { requireManager } = require('../utils/accessControl')

const router = express.Router()

router.get('/', requireManager, getUsers)
router.post('/', requireManager, createUser)

module.exports = router
