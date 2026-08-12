const jwt = require('jsonwebtoken')
const { errorResponse } = require('./responseHandler')

const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required')
}

function signUserToken(user) {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role,
      full_name: user.full_name
    },
    JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  )
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization

  if (!header || !header.startsWith('Bearer ')) {
    return errorResponse(res, 'Authentication required', 401, 'AUTH_REQUIRED')
  }

  try {
    req.user = jwt.verify(header.slice(7), JWT_SECRET)
    return next()
  } catch (error) {
    return errorResponse(res, 'Invalid or expired session', 401, 'AUTH_INVALID')
  }
}

module.exports = {
  JWT_SECRET,
  signUserToken,
  requireAuth
}
