const express = require('express')
const {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  archiveProduct
} = require('../controllers/productController')
const { requireManager } = require('../utils/accessControl')

const router = express.Router()

router.get('/', getProducts)
router.get('/:id', getProductById)
router.post('/', requireManager, createProduct)
router.put('/:id', requireManager, updateProduct)
router.patch('/:id/archive', requireManager, archiveProduct)

module.exports = router