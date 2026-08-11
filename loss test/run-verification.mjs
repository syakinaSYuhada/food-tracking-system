const BASE = process.env.API_URL || 'http://localhost:3000/api'
const PASS = process.env.SMOKE_PASS || 'demo_password_only'

async function req(path, opts = {}, token) {
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(opts.headers || {})
  }
  const res = await fetch(`${BASE}${path}`, { ...opts, headers })
  const body = await res.json().catch(() => ({}))
  return { ok: res.ok, status: res.status, body }
}

async function login(user) {
  const r = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: user, password: PASS })
  })
  if (!r.body.data?.token) throw new Error(`login failed for ${user}`)
  return r.body.data.token
}

function pickDefect(d) {
  return {
    id: d.id,
    defect_code: d.defect_code,
    qty_affected: Number(d.qty_affected),
    qty_on_hold: Number(d.qty_on_hold),
    qty_discarded: Number(d.qty_discarded),
    qty_relabelled: Number(d.qty_relabelled || 0),
    qty_repacked: Number(d.qty_repacked || 0),
    qty_reworked: Number(d.qty_reworked || 0),
    qty_released: Number(d.qty_released || 0),
    estimated_loss: Number(d.estimated_loss),
    loss_rate_per_unit: Number(d.loss_rate_per_unit),
    loss_status: d.loss_status,
    defect_status: d.defect_status
  }
}

function handledSum(d) {
  return d.qty_relabelled + d.qty_repacked + d.qty_reworked + d.qty_released + d.qty_discarded
}

const manager = await login('nazhif')
const worker = await login('siti_aminah')
const me = await req('/auth/me', {}, worker)
const workerId = me.body.data.id

const results = { cases: [], timestamp: new Date().toISOString(), environment: BASE }

const create = await req('/defects', {
  method: 'POST',
  body: JSON.stringify({
    product_id: 1,
    batch_id: 6,
    detected_at_stage: 'Labelling',
    defect_type: 'Untidy Label',
    problem_level: 'Can Be Corrected',
    description: 'Loss verification test defect',
    qty_affected: 100,
    containment_status: 'Segregated / On Hold'
  })
}, manager)

const d1 = pickDefect(create.body.data)
results.cases.push({
  id: 1,
  name: 'Create defect',
  pass: d1.qty_on_hold === 100 && d1.qty_discarded === 0 && d1.estimated_loss === 0 && d1.loss_status === 'no_loss',
  expected: { qty_on_hold: 100, qty_discarded: 0, estimated_loss: 0, loss_status: 'no_loss' },
  actual: d1
})

const assign = await req(`/corrective-actions/defects/${d1.id}/assign`, {
  method: 'POST',
  body: JSON.stringify({
    action_type: 'product_handling',
    task: 'Relabel and discard damaged units',
    assigned_to: workerId,
    due_date: '2026-12-31',
    priority: 'high'
  })
}, manager)
const caId = assign.body.data.id

await req(`/corrective-actions/${caId}/start`, { method: 'PATCH', body: '{}' }, worker)

const complete1 = await req(`/corrective-actions/${caId}/complete`, {
  method: 'PATCH',
  body: JSON.stringify({
    investigation_finding: 'Relabelled 80, discarded 20 damaged pouches',
    qty_relabelled: 80,
    qty_repacked: 0,
    qty_reworked: 0,
    qty_discarded: 20,
    qty_released: 0,
    qty_on_hold: 0
  })
}, worker)

const d2r = await req(`/defects/${d1.id}`, {}, manager)
const d2 = pickDefect(d2r.body.data)
const expectedLoss = Math.round(20 * d2.loss_rate_per_unit * 100) / 100

results.cases.push({
  id: 2,
  name: 'Complete CA with discard',
  pass: complete1.ok && d2.qty_discarded === 20 && d2.estimated_loss === expectedLoss && d2.qty_on_hold === 0 && d2.loss_status === 'pending_review',
  expected: { qty_discarded: 20, estimated_loss: expectedLoss, qty_on_hold: 0, loss_status: 'pending_review' },
  actual: d2,
  api: { complete_status: complete1.status, complete_message: complete1.body.message }
})

const reject = await req(`/corrective-actions/${caId}/reject`, {
  method: 'PATCH',
  body: JSON.stringify({ rejection_reason: 'Counts need correction - verification test' })
}, manager)

const d3r = await req(`/defects/${d1.id}`, {}, manager)
const d3 = pickDefect(d3r.body.data)

results.cases.push({
  id: 3,
  name: 'Reject completed CA',
  pass: reject.ok && d3.qty_discarded === 0 && d3.estimated_loss === 0 && d3.qty_on_hold === 100 && d3.loss_status === 'no_loss',
  expected: { qty_discarded: 0, estimated_loss: 0, qty_on_hold: 100, loss_status: 'no_loss' },
  actual: d3,
  api: { reject_status: reject.status, reject_message: reject.body.message }
})

await req(`/corrective-actions/${caId}/start`, { method: 'PATCH', body: '{}' }, worker)

const complete2 = await req(`/corrective-actions/${caId}/complete`, {
  method: 'PATCH',
  body: JSON.stringify({
    investigation_finding: 'Corrected counts: relabel 85, discard 15',
    qty_relabelled: 85,
    qty_repacked: 0,
    qty_reworked: 0,
    qty_discarded: 15,
    qty_released: 0,
    qty_on_hold: 0
  })
}, worker)

const d4r = await req(`/defects/${d1.id}`, {}, manager)
const d4 = pickDefect(d4r.body.data)
const expectedLoss2 = Math.round(15 * d4.loss_rate_per_unit * 100) / 100

results.cases.push({
  id: 4,
  name: 'Re-complete rejected CA',
  pass: complete2.ok && d4.qty_discarded === 15 && d4.estimated_loss === expectedLoss2 && handledSum(d4) === 100 && d4.qty_on_hold === 0,
  expected: { qty_discarded: 15, estimated_loss: expectedLoss2, total_handled: 100, qty_on_hold: 0 },
  actual: d4,
  double_count_check: { bug_would_show: 35, actual_discarded: d4.qty_discarded },
  api: { complete_status: complete2.status, complete_message: complete2.body.message }
})

const loss = await req('/reports/loss?period=all_time', {}, manager)
const rows = loss.body.data.rows || []
const kpis = loss.body.data.kpis || {}
const ourRow = rows.find((r) => r.defect_code === d1.defect_code)

results.cases.push({
  id: 5,
  name: 'Loss Report',
  pass: !!ourRow && rows.length > 0 && ourRow.loss_at_risk !== undefined && Number(kpis.loss_at_risk) >= 0,
  kpis: {
    loss_at_risk: Number(kpis.loss_at_risk),
    pending_loss: Number(kpis.pending_loss),
    confirmed_loss: Number(kpis.confirmed_loss)
  },
  our_defect_row: ourRow,
  row_count: rows.length,
  ui: 'Single ReportTable with rows={lossRows} in Reports.jsx'
})

results.summary = {
  defect_code: d1.defect_code,
  loss_rate_per_unit: d1.loss_rate_per_unit,
  passed: results.cases.filter((c) => c.pass).length,
  failed: results.cases.filter((c) => !c.pass).length,
  blocker: results.cases.some((c) => c.api?.complete_message?.includes('qty_released'))
    ? 'Live DB missing defects.qty_released column — CA complete returns 500'
    : null
}

console.log(JSON.stringify(results, null, 2))
