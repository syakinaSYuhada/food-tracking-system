const pool = require('../config/db')
const { successResponse, errorResponse } = require('../middleware/responseHandler')
const { signUserToken, requireAuth } = require('../middleware/auth')
const { verifyPassword } = require('../utils/password')

async function login(req, res) {
  try {
    const { username, password } = req.body

    if (!username || !password) {
      return errorResponse(res, 'Username and password are required', 400, 'LOGIN_FIELDS_REQUIRED')
    }

    const result = await pool.query(
      `
      SELECT id, username, email, full_name, role, account_status, password_hash
      FROM users
      WHERE username = $1
      LIMIT 1
      `,
      [String(username).trim().toLowerCase()]
    )

    if (result.rows.length === 0) {
      return errorResponse(res, 'Invalid username or password', 401, 'INVALID_CREDENTIALS')
    }

    const user = result.rows[0]

    if (user.account_status !== 'active') {
      return errorResponse(res, 'This account is inactive', 403, 'ACCOUNT_INACTIVE')
    }

    const passwordMatches = await verifyPassword(password, user.password_hash)

    if (!passwordMatches) {
      return errorResponse(res, 'Invalid username or password', 401, 'INVALID_CREDENTIALS')
    }

    const token = signUserToken(user)

    return successResponse(res, {
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        account_status: user.account_status
      }
    }, 'Login successful')
  } catch (error) {
    return errorResponse(res, error, 500, 'LOGIN_ERROR')
  }
}

async function getCurrentUser(req, res) {
  try {
    const result = await pool.query(
      `
      SELECT id, username, email, full_name, role, account_status
      FROM users
      WHERE id = $1
      LIMIT 1
      `,
      [req.user.id]
    )

    if (result.rows.length === 0) {
      return errorResponse(res, 'User not found', 404, 'USER_NOT_FOUND')
    }

    return successResponse(res, result.rows[0], 'Current user retrieved successfully')
  } catch (error) {
    return errorResponse(res, error, 500, 'GET_CURRENT_USER_ERROR')
  }
}

module.exports = {
  login,
  getCurrentUser,
  requireAuth
}
