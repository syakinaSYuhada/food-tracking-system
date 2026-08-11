/**
 * Verify Phase 2 mappings via live API (backend must be running).
 */
const BASE = process.env.API_URL || 'http://localhost:3000/api'
const DEMO_PASS = process.env.SMOKE_PASS || 'demo_password_only'

async function login() {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'nazhif', password: DEMO_PASS })
  })
  const body = await res.json()
  if (!res.ok) throw new Error(body.message || 'Login failed')
  return body.data.token
}

async function getTypes(token, stage) {
  const res = await fetch(`${BASE}/defects/options/by-stage/${encodeURIComponent(stage)}`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  const body = await res.json()
  if (!res.ok) throw new Error(body.message || `Failed for ${stage}`)
  return body.data || []
}

async function getRule(token, defectType) {
  const res = await fetch(`${BASE}/defects/rules/by-type/${encodeURIComponent(defectType)}`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  const body = await res.json()
  if (!res.ok) throw new Error(body.message || `Rule failed for ${defectType}`)
  return body.data
}

async function main() {
  const token = await login()
  const stagesRes = await fetch(`${BASE}/defects/rules/stages`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  const stagesBody = await stagesRes.json()
  const stages = stagesBody.data || []
  console.log('API stages:', stages.join(' | '))

  const requiredStages = ['Packing / Filling', 'Labelling / Expiry Printing', 'Retort Process']
  for (const s of requiredStages) {
    if (!stages.includes(s)) console.log('FAIL missing stage:', s)
    else console.log('OK stage:', s)
  }

  const sealing = await getTypes(token, 'Sealing')
  console.log(sealing.includes('Bloated Packaging') ? 'FAIL Sealing has Bloated' : 'OK Sealing excludes Bloated')

  const retort = await getTypes(token, 'Retort Process')
  console.log(retort.includes('Bloated Packaging') && retort.includes('Colour / Texture Change')
    ? 'OK Retort Process types'
    : `FAIL Retort Process: ${retort.join(', ')}`)

  const prep = await getTypes(token, 'Ingredient Preparation')
  console.log(prep.includes('Ingredient Quality Issue') ? 'OK Ingredient Quality Issue at prep' : 'FAIL prep types')

  const rule = await getRule(token, 'Ingredient Quality Issue')
  const hasSpecific = (rule.product_handling_options || []).includes('Release After Review')
    && !(rule.root_cause_options || []).includes('Need further investigation')
  console.log(hasSpecific ? 'OK Ingredient Quality dedicated options' : 'FAIL Ingredient Quality uses Other-like options')

  const labelling = await getTypes(token, 'Labelling / Expiry Printing')
  console.log(labelling.includes('Wrong Batch Code on Label') ? 'OK Wrong Batch Code on labelling' : 'FAIL labelling types')

  const before = await getTypes(token, 'Before Delivery')
  console.log(
    before.includes('Wrong Label Used') && before.includes('Label Not Set Properly')
      ? 'OK Before Delivery label types'
      : `FAIL Before Delivery: ${before.join(', ')}`
  )

  const after = await getTypes(token, 'After Customer Receives Product')
  console.log(
    after.includes('Wrong Label Used') && after.includes('Wrong Batch Code on Label')
      ? 'OK After Customer types'
      : `FAIL After Customer: ${after.join(', ')}`
  )
}

main().catch((e) => {
  console.error(e.message)
  process.exit(1)
})
