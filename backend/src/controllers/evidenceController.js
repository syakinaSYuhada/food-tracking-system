const path = require('path')
const fs = require('fs')
const pool = require('../config/db')
const { errorResponse } = require('../middleware/responseHandler')
const {
  isManager,
  workerHasDefectAccess,
  workerHasActionAccess
} = require('../utils/accessControl')

const UPLOADS_ROOT = path.resolve(__dirname, '../../uploads')

async function assertEvidenceAccess(req, res, evidence) {
  if (isManager(req.user)) return true

  if (evidence.corrective_action_id) {
    const allowed = await workerHasActionAccess(evidence.corrective_action_id, req.user.id)
    if (!allowed) {
      errorResponse(res, 'You do not have access to this corrective action', 403, 'ACCESS_DENIED')
      return false
    }
    return true
  }

  if (evidence.defect_id) {
    const allowed = await workerHasDefectAccess(evidence.defect_id, req.user.id)
    if (!allowed) {
      errorResponse(res, 'You do not have access to this defect', 403, 'ACCESS_DENIED')
      return false
    }
    return true
  }

  errorResponse(res, 'Evidence not found', 404, 'EVIDENCE_NOT_FOUND')
  return false
}

function resolveSafeEvidencePath(filePath) {
  if (!filePath) return null

  const normalizedRoot = path.resolve(UPLOADS_ROOT)
  const relative = String(filePath).replace(/^\/uploads\/?/, '')
  const absolute = path.resolve(normalizedRoot, relative)
  const relativeToRoot = path.relative(normalizedRoot, absolute)

  if (relativeToRoot.startsWith('..') || path.isAbsolute(relativeToRoot)) {
    return null
  }

  return absolute
}

async function getEvidenceFile(req, res) {
  try {
    const { id } = req.params

    const result = await pool.query('SELECT * FROM evidence WHERE id = $1', [id])
    if (result.rows.length === 0) {
      return errorResponse(res, 'Evidence not found', 404, 'EVIDENCE_NOT_FOUND')
    }

    const evidence = result.rows[0]
    if (!(await assertEvidenceAccess(req, res, evidence))) return

    const absolutePath = resolveSafeEvidencePath(evidence.file_path)
    if (!absolutePath || !fs.existsSync(absolutePath)) {
      return errorResponse(res, 'Evidence file not found', 404, 'EVIDENCE_FILE_NOT_FOUND')
    }

    if (evidence.file_type) {
      res.type(evidence.file_type)
    }

    return res.sendFile(absolutePath)
  } catch (error) {
    return errorResponse(res, error, 500, 'GET_EVIDENCE_FILE_ERROR')
  }
}

module.exports = {
  getEvidenceFile
}
