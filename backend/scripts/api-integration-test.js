/**
 * Extended API integration tests — run while backend is up.
 * Usage: npm run test:api
 */

const BASE = process.env.API_URL || 'http://localhost:3000/api'
const MANAGER_USER = process.env.SMOKE_USER || 'nazhif'
const WORKER_USER = process.env.SMOKE_WORKER || 'siti_aminah'
const DEMO_PASS = process.env.SMOKE_PASS || 'demo_password_only'

function localTodayDateString() {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

let passed = 0
let failed = 0

async function check(name, fn) {
  try {
    await fn()
    console.log(`  OK  ${name}`)
    passed += 1
  } catch (error) {
    console.error(`  FAIL ${name} — ${error.message}`)
    failed += 1
  }
}

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, options)
  const body = await res.json().catch(() => ({}))

  if (!res.ok) {
    throw new Error(body.message || `${res.status} ${res.statusText}`)
  }

  if (body.success === false) {
    throw new Error(body.message || 'API returned success: false')
  }

  return body
}

async function requestStatus(path, options = {}, expectedStatus) {
  const res = await fetch(`${BASE}${path}`, options)
  const body = await res.json().catch(() => ({}))

  if (res.status !== expectedStatus) {
    throw new Error(
      body.message || `Expected ${expectedStatus}, got ${res.status} ${res.statusText}`
    )
  }

  return body
}

async function login(username) {
  const body = await request('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password: DEMO_PASS })
  })

  const token = body.data?.token
  if (!token) throw new Error(`No token returned for ${username}`)

  return {
    token,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    user: body.data?.user
  }
}

async function main() {
  console.log(`Kak Norie QDTS API integration test → ${BASE}\n`)

  let manager = null
  let worker = null
  let sampleBatchId = null
  let sampleDefectId = null

  await check('GET /health', async () => {
    const body = await request('/health')
    if (body.status !== 'ok' && body.data?.status !== 'ok') {
      throw new Error('Health status missing')
    }
  })

  await check('POST /auth/login rejects invalid credentials', async () => {
    await requestStatus(
      '/auth/login',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'nazhif', password: 'wrong_password' })
      },
      401
    )
  })

  await check('POST /auth/login (manager)', async () => {
    manager = await login(MANAGER_USER)
    if (manager.user?.role !== 'manager') {
      throw new Error(`Expected manager role, got ${manager.user?.role}`)
    }
  })

  await check('POST /auth/login (worker)', async () => {
    worker = await login(WORKER_USER)
    if (worker.user?.role !== 'worker') {
      throw new Error(`Expected worker role, got ${worker.user?.role}`)
    }
  })

  await check('GET /auth/me (manager)', async () => {
    const body = await request('/auth/me', { headers: manager.headers })
    if (!body.data?.username) throw new Error('Manager profile missing username')
  })

  await check('GET /users is manager-only', async () => {
    await request('/users', { headers: manager.headers })
    await requestStatus('/users', { headers: worker.headers }, 403)
  })

  await check('POST /users creates account (manager only)', async () => {
    const username = `test_worker_${Date.now()}`
    const body = await request('/users', {
      method: 'POST',
      headers: manager.headers,
      body: JSON.stringify({
        username,
        email: `${username}@example.com`,
        full_name: 'Integration Test Worker',
        role: 'worker',
        password: DEMO_PASS
      })
    })

    if (!body.data?.id || body.data.username !== username) {
      throw new Error('Created user payload missing expected fields')
    }

    await requestStatus(
      '/users',
      {
        method: 'POST',
        headers: worker.headers,
        body: JSON.stringify({
          username: `${username}_blocked`,
          email: `${username}_blocked@example.com`,
          full_name: 'Should Fail',
          role: 'worker',
          password: DEMO_PASS
        })
      },
      403
    )
  })

  await check('GET /batches returns seeded data', async () => {
    const body = await request('/batches', { headers: manager.headers })
    const batches = body.data || []
    if (!Array.isArray(batches) || batches.length === 0) {
      throw new Error('Expected at least one batch in seed data')
    }
    sampleBatchId = batches[0].id ?? batches[0].batch_id
    if (!sampleBatchId) throw new Error('Batch id missing')
  })

  await check('GET /batches/:id/defects', async () => {
    await request(`/batches/${sampleBatchId}/defects`, { headers: manager.headers })
  })

  await check('GET /batches/:id/corrective-actions', async () => {
    await request(`/batches/${sampleBatchId}/corrective-actions`, { headers: manager.headers })
  })

  await check('GET /defects returns records', async () => {
    const body = await request('/defects', { headers: manager.headers })
    const defects = body.data || []
    if (!Array.isArray(defects) || defects.length === 0) {
      throw new Error('Expected at least one defect in seed data')
    }
    sampleDefectId = defects[0].id ?? defects[0].defect_id
    if (!sampleDefectId) throw new Error('Defect id missing')
  })

  await check('GET /defects/:id/activity', async () => {
    const body = await request(`/defects/${sampleDefectId}/activity`, {
      headers: manager.headers
    })
    if (!Array.isArray(body.data)) throw new Error('Activity log should be an array')
  })

  await check('Worker can read defects', async () => {
    await request('/defects', { headers: worker.headers })
  })

  await check('Worker cannot access manager reports', async () => {
    await requestStatus(
      '/reports/batch-expiry-audit',
      { headers: worker.headers },
      403
    )
    await requestStatus(
      '/reports/dashboard/summary?period=this_month',
      { headers: worker.headers },
      403
    )
    await requestStatus('/activity-logs', { headers: worker.headers }, 403)
  })

  await check('GET /reports/batch-expiry-audit (manager)', async () => {
    const body = await request('/reports/batch-expiry-audit', { headers: manager.headers })
    if (!Array.isArray(body.data?.rows)) {
      throw new Error('Batch expiry audit rows should be an array')
    }
    if (!body.data?.kpis) throw new Error('Batch expiry audit KPIs missing')
  })

  await check('GET /reports/expiry-issues (manager)', async () => {
    const body = await request('/reports/expiry-issues', { headers: manager.headers })
    if (!Array.isArray(body.data?.rows)) {
      throw new Error('Expiry issues rows should be an array')
    }
  })

  await check('GET /reports/by-batch (manager)', async () => {
    const body = await request('/reports/by-batch', { headers: manager.headers })
    if (!Array.isArray(body.data?.rows)) {
      throw new Error('By-batch report rows should be an array')
    }
  })

  await check('GET /reports/by-process-stage (manager)', async () => {
    const body = await request('/reports/by-process-stage?period=this_month', { headers: manager.headers })
    if (!Array.isArray(body.data?.rows)) {
      throw new Error('By-process-stage report rows should be an array')
    }
    if (!body.data?.kpis) throw new Error('By-process-stage KPIs missing')
  })

  await check('GET /reports/root-cause-by-process-area (manager)', async () => {
    const body = await request('/reports/root-cause-by-process-area?period=this_month', { headers: manager.headers })
    if (!Array.isArray(body.data?.rows)) {
      throw new Error('Root cause by process area rows should be an array')
    }
  })

  await check('GET /reports/related-process-tool (manager)', async () => {
    const body = await request('/reports/related-process-tool?period=this_month', { headers: manager.headers })
    if (!Array.isArray(body.data?.rows)) {
      throw new Error('Related process tool rows should be an array')
    }
  })

  await check('GET /activity-logs (manager)', async () => {
    const body = await request('/activity-logs', { headers: manager.headers })
    if (!Array.isArray(body.data?.items)) {
      throw new Error('Activity log items should be an array')
    }
    if (!body.data?.pagination) throw new Error('Activity log pagination missing')
  })

  await check('GET /corrective-actions includes due dates', async () => {
    const body = await request('/corrective-actions', { headers: manager.headers })
    const actions = body.data || []
    if (!Array.isArray(actions) || actions.length === 0) {
      throw new Error('Expected corrective actions in seed data')
    }
    const hasDueDateField = actions.some(
      (action) => 'due_date' in action || 'dueDate' in action
    )
    if (!hasDueDateField) throw new Error('Corrective actions missing due_date field')
  })

  await check('GET /defects/rules/by-type/Wrong Expiry Date Printing (manager)', async () => {
    const body = await request(
      `/defects/rules/by-type/${encodeURIComponent('Wrong Expiry Date Printing')}`,
      { headers: manager.headers }
    )
    if (!body.data?.default_problem_level) {
      throw new Error('Defect workflow rule missing default_problem_level')
    }
    if (!Array.isArray(body.data?.product_handling_options)) {
      throw new Error('Defect workflow rule missing product_handling_options')
    }
  })

  await check('POST /defects rejects invalid stage/type mapping (manager)', async () => {
    await requestStatus(
      '/defects',
      {
        method: 'POST',
        headers: manager.headers,
        body: JSON.stringify({
          product_id: 1,
          batch_id: 6,
          detected_at_stage: 'Ingredient Preparation',
          defect_type: 'Bloated Packaging',
          problem_level: 'Food Safety Risk',
          description: 'Invalid mapping test defect.',
          qty_affected: 5,
          containment_status: 'Segregated / On Hold'
        })
      },
      400
    )
  })

  await check('POST /defects rejects Other without description (manager)', async () => {
    await requestStatus(
      '/defects',
      {
        method: 'POST',
        headers: manager.headers,
        body: JSON.stringify({
          product_id: 1,
          batch_id: 6,
          detected_at_stage: 'Ingredient Preparation',
          defect_type: 'Other',
          problem_level: 'Hold for Review',
          description: 'Other type without detail text.',
          qty_affected: 5,
          containment_status: 'Segregated / On Hold'
        })
      },
      400
    )
  })

  await check('Worker cannot overwrite confirmed root cause (defect 2)', async () => {
    const hairul = await login('hairul_nizam')
    await requestStatus(
      '/root-causes/defects/2/suspect',
      {
        method: 'PATCH',
        headers: hairul.headers,
        body: JSON.stringify({
          suspected_root_cause_source: 'Machine / Tool',
          suspected_root_cause: 'Attempted overwrite after confirmation'
        })
      },
      409
    )
  })

  await check('Root cause confirm routes require verified corrective actions', async () => {
    const payload = JSON.stringify({
      confirmed_root_cause_source: 'Label / Printing',
      confirmed_root_cause: 'Expiry Mould Not Changed',
      investigation_notes: 'Should fail until actions are verified.'
    })

    await requestStatus(
      '/root-causes/defects/1/confirm',
      {
        method: 'PATCH',
        headers: manager.headers,
        body: payload
      },
      400
    )

    await requestStatus(
      '/defects/1/root-cause',
      {
        method: 'PATCH',
        headers: manager.headers,
        body: payload
      },
      400
    )
  })

  await check('POST /defects sets qty_on_hold per containment_status (manager)', async () => {
    const cases = [
      {
        containment_status: 'Segregated / On Hold',
        qty_affected: 8,
        expectedOnHold: 8
      },
      {
        containment_status: 'Not Yet Segregated',
        qty_affected: 5,
        expectedOnHold: 5
      },
      {
        containment_status: 'No Hold Needed',
        qty_affected: 3,
        expectedOnHold: 0
      }
    ]

    for (const testCase of cases) {
      const body = await request('/defects', {
        method: 'POST',
        headers: manager.headers,
        body: JSON.stringify({
          product_id: 1,
          batch_id: 6,
          detected_at_stage: 'Labelling / Expiry Printing',
          defect_type: 'Untidy Label',
          problem_level: 'Can Be Corrected',
          description: `Integration test defect for qty_on_hold validation (${testCase.containment_status}).`,
          qty_affected: testCase.qty_affected,
          containment_status: testCase.containment_status
        })
      })

      const defect = body.data || {}
      const onHold = Number(defect.qty_on_hold)
      if (onHold !== testCase.expectedOnHold) {
        throw new Error(`Expected qty_on_hold ${testCase.expectedOnHold} for ${testCase.containment_status}, got ${onHold}`)
      }
    }
  })

  await check('Worker cannot create batches', async () => {
    await requestStatus(
      '/batches',
      {
        method: 'POST',
        headers: worker.headers,
        body: JSON.stringify({
          product_id: 1,
          production_date: '2025-01-01',
          retort_date: '2025-01-02',
          printed_expiry_date: '2026-01-02',
          quantity_produced: 10
        })
      },
      403
    )
  })

  await check('Worker cannot read root cause for unassigned defect (C4)', async () => {
    await requestStatus('/root-causes/defects/2', { headers: worker.headers }, 403)
  })

  await check('Manager can read root cause for defect (C4)', async () => {
    const body = await request('/root-causes/defects/1', { headers: manager.headers })
    if (!body.data?.defect_id) throw new Error('Root cause payload missing defect_id')
  })

  await check('Worker cannot upload evidence for unassigned corrective action (C5)', async () => {
    const actionsBody = await request('/corrective-actions', { headers: manager.headers })
    const action = (actionsBody.data || []).find((row) => Number(row.assigned_to) !== Number(worker.user.id))
    if (!action) throw new Error('No corrective action assigned to another worker found')

    await requestStatus(
      `/corrective-actions/${action.id}/evidence`,
      {
        method: 'POST',
        headers: worker.headers
      },
      403
    )
  })

  await check('Verify and close actions are logged on defect activity', async () => {
    const usersBody = await request('/users', { headers: manager.headers })
    const assignee = (usersBody.data || []).find((row) => row.role === 'worker')
    if (!assignee) throw new Error('No worker user found')

    const createBody = await request('/defects', {
      method: 'POST',
      headers: worker.headers,
      body: JSON.stringify({
        product_id: 1,
        batch_id: 6,
        detected_at_stage: 'Sealing',
        defect_type: 'Loose Sealing',
        problem_level: 'Hold for Review',
        description: 'Activity log integration test defect.',
        qty_affected: 3
      })
    })

    const defectId = createBody.data.id
    await request(`/defects/${defectId}/start-review`, { method: 'PATCH', headers: manager.headers })

    const assignBody = await request(`/corrective-actions/defects/${defectId}/assign`, {
      method: 'POST',
      headers: manager.headers,
      body: JSON.stringify({
        action_type: 'machine_process_check',
        task: 'Check seal settings',
        assigned_to: assignee.id,
        assigned_by: manager.user.id,
        due_date: '2026-12-31',
        priority: 'medium'
      })
    })

    const actionId = assignBody.data.id
    const assigneeSession = await login(assignee.username)

    await request(`/corrective-actions/${actionId}/start`, {
      method: 'PATCH',
      headers: assigneeSession.headers
    })

    await request(`/corrective-actions/${actionId}/complete`, {
      method: 'PATCH',
      headers: assigneeSession.headers,
      body: JSON.stringify({ investigation_finding: 'Seal pressure low.' })
    })

    await request(`/corrective-actions/${actionId}/verify`, {
      method: 'PATCH',
      headers: manager.headers,
      body: JSON.stringify({ verification_notes: 'Verified in integration test.' })
    })

    await request(`/defects/${defectId}/root-cause`, {
      method: 'PATCH',
      headers: manager.headers,
      body: JSON.stringify({
        confirmed_root_cause_source: 'Machine / Tool',
        confirmed_root_cause: 'Seal unit misaligned'
      })
    })

    await request(`/defects/${defectId}/close`, {
      method: 'PATCH',
      headers: manager.headers,
      body: JSON.stringify({})
    })

    const activityBody = await request(`/defects/${defectId}/activity`, { headers: manager.headers })
    const actionTypes = new Set((activityBody.data || []).map((entry) => entry.action_type))

    for (const expected of [
      'REPORT_DEFECT',
      'START_REVIEW',
      'ASSIGN_CORRECTIVE_ACTION',
      'START_CORRECTIVE_ACTION',
      'COMPLETE_CORRECTIVE_ACTION',
      'VERIFY_CORRECTIVE_ACTION',
      'CONFIRM_ROOT_CAUSE',
      'CLOSE_DEFECT'
    ]) {
      if (!actionTypes.has(expected)) {
        throw new Error(`Missing activity log entry: ${expected}`)
      }
    }
  })

  await check('Cancelled corrective actions do not block close (BL-01)', async () => {
    const usersBody = await request('/users', { headers: manager.headers })
    const assignee = (usersBody.data || []).find((row) => row.role === 'worker')
    if (!assignee) throw new Error('No worker user found')
    const assigneeSession = await login(assignee.username)

    const createBody = await request('/defects', {
      method: 'POST',
      headers: worker.headers,
      body: JSON.stringify({
        product_id: 1,
        batch_id: 6,
        detected_at_stage: 'Sealing',
        defect_type: 'Loose Sealing',
        problem_level: 'Hold for Review',
        description: 'Cancelled CA counting test.',
        qty_affected: 2
      })
    })

    const defectId = createBody.data.id
    await request(`/defects/${defectId}/start-review`, { method: 'PATCH', headers: manager.headers })

    const rejectedAssign = await request(`/corrective-actions/defects/${defectId}/assign`, {
      method: 'POST',
      headers: manager.headers,
      body: JSON.stringify({
        action_type: 'machine_process_check',
        task: 'First attempt',
        assigned_to: assignee.id,
        assigned_by: manager.user.id,
        due_date: '2026-12-31',
        priority: 'medium',
        evidence_required: false
      })
    })

    const rejectedId = rejectedAssign.data.id
    await request(`/corrective-actions/${rejectedId}/start`, { method: 'PATCH', headers: assigneeSession.headers })
    await request(`/corrective-actions/${rejectedId}/complete`, {
      method: 'PATCH',
      headers: assigneeSession.headers,
      body: JSON.stringify({ investigation_finding: 'Done once.' })
    })
    await request(`/corrective-actions/${rejectedId}/reject`, {
      method: 'PATCH',
      headers: manager.headers,
      body: JSON.stringify({ rejection_reason: 'Redo required.' })
    })
    await request(`/corrective-actions/${rejectedId}/cancel`, {
      method: 'PATCH',
      headers: manager.headers,
      body: JSON.stringify({ cancellation_reason: 'Abandon first attempt.' })
    })

    const activeAssign = await request(`/corrective-actions/defects/${defectId}/assign`, {
      method: 'POST',
      headers: manager.headers,
      body: JSON.stringify({
        action_type: 'machine_process_check',
        task: 'Second attempt',
        assigned_to: assignee.id,
        assigned_by: manager.user.id,
        due_date: '2026-12-31',
        priority: 'medium',
        evidence_required: false
      })
    })

    const activeId = activeAssign.data.id
    await request(`/corrective-actions/${activeId}/start`, { method: 'PATCH', headers: assigneeSession.headers })
    await request(`/corrective-actions/${activeId}/complete`, {
      method: 'PATCH',
      headers: assigneeSession.headers,
      body: JSON.stringify({ investigation_finding: 'Done properly.' })
    })
    await request(`/corrective-actions/${activeId}/verify`, {
      method: 'PATCH',
      headers: manager.headers,
      body: JSON.stringify({ verification_notes: 'Verified.' })
    })

    const defectAfterVerify = await request(`/defects/${defectId}`, { headers: manager.headers })
    if (Number(defectAfterVerify.data.total_actions) !== 1) {
      throw new Error(`Expected 1 active action, got ${defectAfterVerify.data.total_actions}`)
    }
    if (Number(defectAfterVerify.data.verified_actions) !== 1) {
      throw new Error(`Expected 1 verified action, got ${defectAfterVerify.data.verified_actions}`)
    }
    if (defectAfterVerify.data.can_close) {
      throw new Error('can_close should be false before root cause confirmation')
    }

    await request(`/defects/${defectId}/root-cause`, {
      method: 'PATCH',
      headers: manager.headers,
      body: JSON.stringify({
        confirmed_root_cause_source: 'Machine / Tool',
        confirmed_root_cause: 'Seal misalignment'
      })
    })

    const defectBeforeClose = await request(`/defects/${defectId}`, { headers: manager.headers })
    if (!defectBeforeClose.data?.can_close) {
      throw new Error('Expected can_close true after root cause confirmation with cancelled action excluded')
    }

    await request(`/defects/${defectId}/close`, {
      method: 'PATCH',
      headers: manager.headers,
      body: JSON.stringify({})
    })
  })

  await check('Complete rejects when evidence_required but no evidence uploaded (CA-01)', async () => {
    const usersBody = await request('/users', { headers: manager.headers })
    const assignee = (usersBody.data || []).find((row) => row.role === 'worker')
    if (!assignee) throw new Error('No worker user found')

    const createBody = await request('/defects', {
      method: 'POST',
      headers: worker.headers,
      body: JSON.stringify({
        product_id: 1,
        batch_id: 6,
        detected_at_stage: 'Sealing',
        defect_type: 'Loose Sealing',
        problem_level: 'Hold for Review',
        description: 'Evidence required enforcement test.',
        qty_affected: 2
      })
    })

    const defectId = createBody.data.id
    await request(`/defects/${defectId}/start-review`, { method: 'PATCH', headers: manager.headers })

    const assignBody = await request(`/corrective-actions/defects/${defectId}/assign`, {
      method: 'POST',
      headers: manager.headers,
      body: JSON.stringify({
        action_type: 'machine_process_check',
        task: 'Check seal pressure',
        assigned_to: assignee.id,
        assigned_by: manager.user.id,
        due_date: '2026-12-31',
        priority: 'medium',
        evidence_required: true
      })
    })

    const actionId = assignBody.data.id
    const assigneeSession = await login(assignee.username)

    await request(`/corrective-actions/${actionId}/start`, {
      method: 'PATCH',
      headers: assigneeSession.headers
    })

    await requestStatus(
      `/corrective-actions/${actionId}/complete`,
      {
        method: 'PATCH',
        headers: assigneeSession.headers,
        body: JSON.stringify({ investigation_finding: 'Missing evidence attempt.' })
      },
      400
    )
  })

  await check('Worker creates defect with priority High and review due today', async () => {
    const today = localTodayDateString()
    const body = await request('/defects', {
      method: 'POST',
      headers: worker.headers,
      body: JSON.stringify({
        product_id: 1,
        batch_id: 6,
        detected_at_stage: 'Sealing',
        defect_type: 'Loose Sealing',
        problem_level: 'Hold for Review',
        description: 'Urgent review requested by worker.',
        qty_affected: 2,
        priority: 'high',
        review_due_date: today,
        urgency_reason: 'Product on hold may spoil if not reviewed today.'
      })
    })

    if (body.data?.priority !== 'high') throw new Error(`Expected priority high, got ${body.data?.priority}`)
    if (String(body.data?.review_due_date).split('T')[0] !== today) {
      throw new Error('Expected review_due_date to be today')
    }
  })

  await check('Defect creation rejects review_due_date in the past', async () => {
    await requestStatus(
      '/defects',
      {
        method: 'POST',
        headers: worker.headers,
        body: JSON.stringify({
          product_id: 1,
          batch_id: 6,
          detected_at_stage: 'Sealing',
          defect_type: 'Loose Sealing',
          problem_level: 'Hold for Review',
          description: 'Past review date test.',
          qty_affected: 2,
          review_due_date: '2020-01-01'
        })
      },
      400
    )
  })

  await check('Defect creation rejects Urgent priority without urgency_reason', async () => {
    await requestStatus(
      '/defects',
      {
        method: 'POST',
        headers: worker.headers,
        body: JSON.stringify({
          product_id: 1,
          batch_id: 6,
          detected_at_stage: 'Sealing',
          defect_type: 'Loose Sealing',
          problem_level: 'Hold for Review',
          description: 'Missing urgency reason test.',
          qty_affected: 2,
          priority: 'urgent'
        })
      },
      400
    )
  })

  await check('Defect creation without review_due_date still works', async () => {
    const body = await request('/defects', {
      method: 'POST',
      headers: worker.headers,
      body: JSON.stringify({
        product_id: 1,
        batch_id: 6,
        detected_at_stage: 'Sealing',
        defect_type: 'Loose Sealing',
        problem_level: 'Hold for Review',
        description: 'Optional review due date test.',
        qty_affected: 2
      })
    })

    if (body.data?.review_due_date) {
      throw new Error('Expected review_due_date to remain empty when omitted')
    }
  })

  console.log(`\nResult: ${passed} passed, ${failed} failed`)

  if (failed > 0) {
    process.exit(1)
  }

  console.log('API integration tests passed.')
}

main().catch((error) => {
  console.error(`API integration test crashed: ${error.message}`)
  console.error('Is the backend running? Try: cd backend && npm run dev')
  process.exit(1)
})
