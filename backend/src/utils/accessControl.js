const pool = require('../config/db')
const { errorResponse } = require('../middleware/responseHandler')

function isManager(user) {
  return user?.role === 'manager'
}

function isWorker(user) {
  return user?.role === 'worker'
}

function actorId(req) {
  return req.user?.id ?? null
}

function requireManager(req, res, next) {
  if (!isManager(req.user)) {
    return errorResponse(res, 'Manager access required', 403, 'MANAGER_REQUIRED')
  }
  return next()
}

function requireWorker(req, res, next) {
  if (!isWorker(req.user)) {
    return errorResponse(res, 'Worker access required', 403, 'WORKER_REQUIRED')
  }
  return next()
}

async function workerHasDefectAccess(defectId, userId) {
  const result = await pool.query(
    `
    SELECT 1
    FROM defects
    WHERE id = $1 AND created_by = $2
    UNION ALL
    SELECT 1
    FROM corrective_actions
    WHERE defect_id = $1 AND assigned_to = $2
    LIMIT 1
    `,
    [defectId, userId]
  )
  return result.rows.length > 0
}

async function workerHasActionAccess(actionId, userId) {
  const result = await pool.query(
    `
    SELECT 1
    FROM corrective_actions
    WHERE id = $1 AND assigned_to = $2
    LIMIT 1
    `,
    [actionId, userId]
  )
  return result.rows.length > 0
}

async function assertWorkerDefectAccess(req, res, defectId) {
  if (isManager(req.user)) return true

  const allowed = await workerHasDefectAccess(defectId, req.user.id)
  if (!allowed) {
    errorResponse(res, 'You do not have access to this defect', 403, 'ACCESS_DENIED')
    return false
  }

  return true
}

async function assertWorkerActionAccess(req, res, actionId) {
  if (isManager(req.user)) return true

  const allowed = await workerHasActionAccess(actionId, req.user.id)
  if (!allowed) {
    errorResponse(res, 'You do not have access to this corrective action', 403, 'ACCESS_DENIED')
    return false
  }

  return true
}

function applyWorkerDefectListScope(req) {
  if (!isWorker(req.user)) {
    return { query: req.query, workerId: null }
  }

  return { query: req.query, workerId: req.user.id }
}

function applyWorkerActionListScope(req) {
  if (!isWorker(req.user)) return req.query

  return {
    ...req.query,
    assigned_to: String(req.user.id)
  }
}

module.exports = {
  isManager,
  isWorker,
  actorId,
  requireManager,
  requireWorker,
  workerHasDefectAccess,
  workerHasActionAccess,
  assertWorkerDefectAccess,
  assertWorkerActionAccess,
  applyWorkerDefectListScope,
  applyWorkerActionListScope
}
