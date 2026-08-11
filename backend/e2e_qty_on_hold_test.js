const BASE = process.env.API_URL || 'http://localhost:3000/api'
const MANAGER = process.env.SMOKE_USER || 'nazhif'
const WORKER = process.env.SMOKE_WORKER || 'siti_aminah'
const PASS = process.env.SMOKE_PASS || 'demo_password_only'

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, options)
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.message || `${res.status} ${res.statusText}`)
  return body
}

async function login(username) {
  const body = await request('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password: PASS })
  })
  return { token: body.data.token, headers: { Authorization: `Bearer ${body.data.token}`, 'Content-Type': 'application/json' }, user: body.data.user }
}

;(async () => {
  try {
    const manager = await login(MANAGER)
    console.log('Logged in manager:', manager.user.username)

    const usersBody = await request('/users', { headers: manager.headers })
    const assignee = (usersBody.data || []).find((u) => u.role === 'worker')
    if (!assignee) throw new Error('No worker found to assign')
    console.log('Found worker assignee:', assignee.username)

    // create defect as manager
    const create = await request('/defects', {
      method: 'POST',
      headers: manager.headers,
      body: JSON.stringify({
        product_id: 1,
        batch_id: 6,
        detected_at_stage: 'Sealing',
        defect_type: 'Loose Sealing',
        problem_level: 'Hold for Review',
        description: 'E2E test defect for qty_on_hold',
        qty_affected: 7,
        containment_status: 'No Hold Needed'
      })
    })

    const defect = create.data
    console.log('Defect created id:', defect.id, 'qty_on_hold at creation:', defect.qty_on_hold)

    // Start review (manager)
    await request(`/defects/${defect.id}/start-review`, { method: 'PATCH', headers: manager.headers })

    // Assign a product_handling corrective action
    const assign = await request(`/corrective-actions/defects/${defect.id}/assign`, {
      method: 'POST',
      headers: manager.headers,
      body: JSON.stringify({
        action_type: 'product_handling',
        task: 'E2E: handle product quantities',
        assigned_to: assignee.id,
        assigned_by: manager.user.id,
        due_date: '2026-12-31',
        priority: 'medium',
        evidence_required: false
      })
    })

    const action = assign.data
    console.log('Assigned corrective action id:', action.id, 'qtyAffected:', action.qty_affected)

    // Login as assignee
    const worker = await login(assignee.username)

    // Fetch action details as worker
    const actionRes = await request(`/corrective-actions/${action.id}`, { headers: worker.headers })
    const actionData = actionRes.data
    console.log('Corrective action fetched. action.qty_affected=', actionData.qty_affected, 'qty_on_hold stored=', actionData.qty_on_hold)

    // Compute what the frontend shows before any edits (all quantities zero)
    const affected = Number(actionData.qty_affected || 0)
    const computedOnHold = Math.max(0, affected - (0 + 0 + 0 + 0 + 0))
    console.log('Computed qty_on_hold on CA form before submit (should be remainder):', computedOnHold)

    // Start action as worker
    await request(`/corrective-actions/${action.id}/start`, { method: 'PATCH', headers: worker.headers })

    // Complete with zeros and computedOnHold
    await request(`/corrective-actions/${action.id}/complete`, {
      method: 'PATCH',
      headers: worker.headers,
      body: JSON.stringify({
        investigation_finding: 'E2E test completion',
        action_taken: 'No changes required',
        qty_relabelled: 0,
        qty_repacked: 0,
        qty_reworked: 0,
        qty_discarded: 0,
        qty_released: 0,
        qty_on_hold: computedOnHold
      })
    })

    // Fetch defect after CA completion
    const defectAfter = await request(`/defects/${defect.id}`, { headers: manager.headers })
    console.log('Defect after CA completion qty_on_hold:', defectAfter.data.qty_on_hold)

    console.log('E2E flow complete')
  } catch (err) {
    console.error('E2E error:', err.message)
    process.exit(1)
  }
})()
