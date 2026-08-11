/**
 * Golden path workflow verification (steps 1-10).
 * Usage: node scripts/golden-path-workflow-test.js
 * Requires backend running on API_URL (default http://localhost:3000/api)
 */

const BASE = process.env.API_URL || 'http://localhost:3000/api'
const PASS = process.env.SMOKE_PASS || 'demo_password_only'

async function login(username) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password: PASS })
  })
  const body = await res.json()
  if (!res.ok || !body.data?.token) throw new Error(`Login failed for ${username}: ${body.message}`)
  return {
    headers: {
      Authorization: `Bearer ${body.data.token}`,
      'Content-Type': 'application/json'
    },
    user: body.data.user
  }
}

async function api(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, options)
  const body = await res.json().catch(() => ({}))
  return { res, body }
}

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

async function main() {
  console.log(`Golden path workflow test → ${BASE}\n`)

  const manager = await login('nazhif')
  const worker = await login('siti_aminah')

  const batchesRes = await api('/batches', { headers: manager.headers })
  assert(batchesRes.res.ok, 'Could not load batches')
  const batch = (batchesRes.body.data || []).find((b) => Number(b.quantity_produced) >= 10) || batchesRes.body.data[0]
  assert(batch?.id, 'No batch available')

  const productId = batch.product_id || batch.productId

  // 1. Worker creates defect
  const createRes = await api('/defects', {
    method: 'POST',
    headers: worker.headers,
    body: JSON.stringify({
      product_id: productId,
      batch_id: batch.id,
      detected_at_stage: 'Sealing',
      defect_type: 'Loose Sealing',
      problem_level: 'Hold for Review',
      description: 'Golden path workflow test defect.',
      qty_affected: 10,
      containment_status: 'Segregated / On Hold',
      created_by: worker.user.id
    })
  })
  assert(createRes.res.ok, `Step 1 failed: ${createRes.body.message}`)
  const defect = createRes.body.data
  const defectId = defect.id
  assert(defect.defect_status === 'new', `Expected new status, got ${defect.defect_status}`)
  console.log(`1. Worker creates defect — OK (${defect.defect_code}, status=new)`)

  // 2. Manager reviews defect
  const reviewRes = await api(`/defects/${defectId}/start-review`, {
    method: 'PATCH',
    headers: manager.headers
  })
  assert(reviewRes.res.ok, `Step 2 failed: ${reviewRes.body.message}`)
  assert(reviewRes.body.data?.defect_status === 'under_review', 'Expected under_review after start-review')
  console.log('2. Manager reviews defect — OK (status=under_review)')

  // 3. Manager assigns corrective action
  const usersRes = await api('/users', { headers: manager.headers })
  const assignee = (usersRes.body.data || []).find((u) => u.role === 'worker')
  assert(assignee?.id, 'No worker user for assignment')

  const assignRes = await api(`/corrective-actions/defects/${defectId}/assign`, {
    method: 'POST',
    headers: manager.headers,
    body: JSON.stringify({
      action_type: 'product_handling',
      task: 'Hold for Investigation',
      assigned_to: assignee.id,
      assigned_by: manager.user.id,
      due_date: '2026-12-31',
      evidence_required: false,
      priority: 'medium'
    })
  })
  assert(assignRes.res.ok, `Step 3 failed: ${assignRes.body.message}`)
  const action = assignRes.body.data
  const actionId = action.id
  console.log(`3. Manager assigns corrective action — OK (${action.action_code})`)

  const defectAfterAssign = await api(`/defects/${defectId}`, { headers: manager.headers })
  assert(
    ['action_assigned', 'under_review'].includes(defectAfterAssign.body.data?.defect_status),
    `Unexpected defect status after assign: ${defectAfterAssign.body.data?.defect_status}`
  )

  // 4. Worker completes action
  const workerLogin = assignee.id === worker.user.id
    ? worker
    : await login(assignee.username)

  const startRes = await api(`/corrective-actions/${actionId}/start`, {
    method: 'PATCH',
    headers: workerLogin.headers
  })
  assert(startRes.res.ok, `Step 4 start failed: ${startRes.body.message}`)

  const completeRes = await api(`/corrective-actions/${actionId}/complete`, {
    method: 'PATCH',
    headers: workerLogin.headers,
    body: JSON.stringify({
      investigation_finding: 'Golden path completion finding.',
      action_taken: 'Held affected units for manager review.',
      qty_on_hold: 10,
      qty_discarded: 0,
      qty_relabelled: 0,
      qty_repacked: 0,
      qty_reworked: 0,
      qty_released: 0
    })
  })
  assert(completeRes.res.ok, `Step 4 complete failed: ${completeRes.body.message}`)
  assert(completeRes.body.data?.ca_status === 'completed', 'Expected completed CA status')
  console.log('4. Worker completes action — OK (ca_status=completed)')

  // 5. Manager verifies action
  const verifyRes = await api(`/corrective-actions/${actionId}/verify`, {
    method: 'PATCH',
    headers: manager.headers,
    body: JSON.stringify({ verification_notes: 'Golden path verification.' })
  })
  assert(verifyRes.res.ok, `Step 5 failed: ${verifyRes.body.message}`)
  assert(verifyRes.body.data?.ca_status === 'verified', 'Expected verified CA status')
  console.log('5. Manager verifies action — OK (ca_status=verified)')

  // 6. Manager confirms root cause
  const confirmRes = await api(`/defects/${defectId}/root-cause`, {
    method: 'PATCH',
    headers: manager.headers,
    body: JSON.stringify({
      confirmed_root_cause_source: 'Machine / Tool',
      confirmed_root_cause: 'Sealing pressure incorrect',
      confirmed_by: manager.user.id
    })
  })
  assert(confirmRes.res.ok, `Step 6 failed: ${confirmRes.body.message}`)
  assert(confirmRes.body.data?.root_cause_status === 'confirmed', 'Expected confirmed root cause')
  console.log('6. Manager confirms root cause — OK (root_cause_status=confirmed)')

  // 7. Manager closes defect
  const closeRes = await api(`/defects/${defectId}/close`, {
    method: 'PATCH',
    headers: manager.headers,
    body: JSON.stringify({ closed_by: manager.user.id })
  })
  assert(closeRes.res.ok, `Step 7 failed: ${closeRes.body.message}`)
  assert(closeRes.body.data?.defect_status === 'closed', 'Expected closed defect')
  console.log(`7. Manager closes defect — OK (status=closed, loss_status=${closeRes.body.data?.loss_status})`)

  // 8. Dashboard updates
  const dashRes = await api('/reports/dashboard/summary?period=this_month', { headers: manager.headers })
  assert(dashRes.res.ok, `Step 8 failed: ${dashRes.body.message}`)
  assert(dashRes.body.data?.kpis, 'Dashboard KPIs missing')
  assert(Array.isArray(dashRes.body.data?.charts?.trend), 'Dashboard trend missing')
  console.log(
    `8. Dashboard updates — OK (total_defects=${dashRes.body.data.kpis.total_defects}, open=${dashRes.body.data.kpis.open_defects})`
  )

  // 9. Reports show loss/stage/root-cause data
  const [lossRes, stageRes, rootAreaRes] = await Promise.all([
    api('/reports/loss?period=this_month', { headers: manager.headers }),
    api('/reports/by-process-stage?period=this_month', { headers: manager.headers }),
    api('/reports/root-cause-by-process-area?period=this_month', { headers: manager.headers })
  ])
  assert(lossRes.res.ok, `Loss report failed: ${lossRes.body.message}`)
  assert(stageRes.res.ok, `Process stage report failed: ${stageRes.body.message}`)
  assert(rootAreaRes.res.ok, `Root cause area report failed: ${rootAreaRes.body.message}`)
  assert(Array.isArray(lossRes.body.data?.rows), 'Loss report rows missing')
  assert(Array.isArray(stageRes.body.data?.rows), 'Process stage rows missing')
  assert(Array.isArray(rootAreaRes.body.data?.rows), 'Root cause area rows missing')
  console.log(
    `9. Reports data — OK (loss rows=${lossRes.body.data.rows.length}, stage rows=${stageRes.body.data.rows.length}, root area rows=${rootAreaRes.body.data.rows.length})`
  )

  // 10. Activity log records actions
  const activityRes = await api(`/activity-logs?entity_type=defect&limit=50`, { headers: manager.headers })
  assert(activityRes.res.ok, `Step 10 failed: ${activityRes.body.message}`)
  const items = activityRes.body.data?.items || []
  const defectLogs = items.filter((item) => Number(item.entity_id) === Number(defectId))
  const actionTypes = new Set(defectLogs.map((item) => item.action_type))
  assert(actionTypes.has('START_REVIEW'), 'Activity log missing START_REVIEW')
  assert(actionTypes.has('CONFIRM_ROOT_CAUSE'), 'Activity log missing CONFIRM_ROOT_CAUSE')
  console.log(`10. Activity log records actions — OK (${defectLogs.length} entries for defect, types: ${[...actionTypes].join(', ')})`)

  console.log('\nGolden path workflow: ALL 10 STEPS PASSED')
}

main().catch((error) => {
  console.error(`\nGolden path workflow FAILED: ${error.message}`)
  process.exit(1)
})
