// Server bootstrap code
require('dotenv').config()
const express = require('express')
const cors = require('cors')
const apiRoutes = require('./routes')

const app = express()
app.use(cors())
app.use(express.json())

app.use('/api', apiRoutes)
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    code: 'ROUTE_NOT_FOUND',
    data: null
  })
})

app.use((err, req, res, next) => {
  console.error('Server error:', err)
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    code: err.code || 'SERVER_ERROR',
    data: null
  })
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Kak Norie QDTS API running on http://localhost:${PORT}`)
})
module.exports = app
