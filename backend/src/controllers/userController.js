const pool = require('../config/db')
const { successResponse, errorResponse } = require('../middleware/responseHandler')
const { hashPassword } = require('../utils/password')

function normalizeUsername(value) {
  return String(value || '').trim().toLowerCase()
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim())
}

async function getUsers(req, res) {
  try {
    const { role, include_inactive } = req.query
    const values = []
    const conditions = []

    if (String(include_inactive).toLowerCase() !== 'true') {
      conditions.push("account_status = 'active'")
    }

    if (role) {
      values.push(role)
      conditions.push(`role = $${values.length}`)
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    const result = await pool.query(
      `
      SELECT id, username, email, full_name, role, account_status
      FROM users
      ${where}
      ORDER BY role, full_name
      `,
      values
    )

    return successResponse(res, result.rows, 'Users retrieved successfully')
  } catch (error) {
    return errorResponse(res, error, 500, 'GET_USERS_ERROR')
  }
}

async function createUser(req, res) {
  try {
    const {
      username,
      email,
      full_name,
      role,
      password,
      account_status = 'active'
    } = req.body

    const normalizedUsername = normalizeUsername(username)
    const normalizedEmail = String(email || '').trim().toLowerCase()
    const normalizedFullName = String(full_name || '').trim()
    const normalizedRole = String(role || '').trim().toLowerCase()
    const normalizedStatus = String(account_status || 'active').trim().toLowerCase()

    if (!normalizedUsername || !normalizedEmail || !normalizedFullName || !normalizedRole || !password) {
      return errorResponse(
        res,
        'Username, email, full name, role, and password are required',
        400,
        'VALIDATION_ERROR'
      )
    }

    if (!/^[a-z0-9_]+$/.test(normalizedUsername)) {
      return errorResponse(
        res,
        'Username may only contain lowercase letters, numbers, and underscores',
        400,
        'INVALID_USERNAME'
      )
    }

    if (!isValidEmail(normalizedEmail)) {
      return errorResponse(res, 'Please enter a valid email address', 400, 'INVALID_EMAIL')
    }

    if (!['manager', 'worker'].includes(normalizedRole)) {
      return errorResponse(res, 'Role must be manager or worker', 400, 'INVALID_ROLE')
    }

    if (!['active', 'inactive'].includes(normalizedStatus)) {
      return errorResponse(res, 'Account status must be active or inactive', 400, 'INVALID_ACCOUNT_STATUS')
    }

    if (String(password).length < 6) {
      return errorResponse(res, 'Password must be at least 6 characters', 400, 'INVALID_PASSWORD')
    }

    const passwordHash = await hashPassword(String(password))

    const result = await pool.query(
      `
      INSERT INTO users (username, email, password_hash, full_name, role, account_status)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, username, email, full_name, role, account_status
      `,
      [
        normalizedUsername,
        normalizedEmail,
        passwordHash,
        normalizedFullName,
        normalizedRole,
        normalizedStatus
      ]
    )

    return successResponse(res, result.rows[0], 'User created successfully', 201)
  } catch (error) {
    if (error.code === '23505') {
      const detail = String(error.detail || '').toLowerCase()
      if (detail.includes('username')) {
        return errorResponse(res, 'Username is already taken', 409, 'USERNAME_EXISTS')
      }
      if (detail.includes('email')) {
        return errorResponse(res, 'Email is already registered', 409, 'EMAIL_EXISTS')
      }
      return errorResponse(res, 'Username or email already exists', 409, 'DUPLICATE_USER')
    }

    return errorResponse(res, error, 500, 'CREATE_USER_ERROR')
  }
}

async function updateUserStatus(req, res) {
  try {
    const userId = Number(req.params.id)
    const { account_status } = req.body

    if (!Number.isInteger(userId) || userId <= 0) {
      return errorResponse(res, 'Invalid user id', 400, 'INVALID_USER_ID')
    }

    const normalizedStatus = String(account_status || '').trim().toLowerCase()

    if (!['active', 'inactive'].includes(normalizedStatus)) {
      return errorResponse(res, 'Account status must be active or inactive', 400, 'INVALID_ACCOUNT_STATUS')
    }

    if (
      normalizedStatus === 'inactive' &&
      Number(req.user?.id) === userId
    ) {
      return errorResponse(res, 'You cannot deactivate your own account', 400, 'CANNOT_DEACTIVATE_SELF')
    }

    const result = await pool.query(
      `
      UPDATE users
      SET account_status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, username, email, full_name, role, account_status
      `,
      [normalizedStatus, userId]
    )

    if (result.rows.length === 0) {
      return errorResponse(res, 'User not found', 404, 'USER_NOT_FOUND')
    }

    const message = normalizedStatus === 'active'
      ? 'User activated successfully'
      : 'User deactivated successfully'

    return successResponse(res, result.rows[0], message)
  } catch (error) {
    return errorResponse(res, error, 500, 'UPDATE_USER_STATUS_ERROR')
  }
}

module.exports = { getUsers, createUser, updateUserStatus }
