/**
 * Quick API smoke test — run while backend is up (npm run dev).
 * Usage: npm run smoke
 */

const BASE = process.env.API_URL || 'http://localhost:3000/api'
const DEMO_USER = process.env.SMOKE_USER || 'nazhif'
const DEMO_PASS = process.env.SMOKE_PASS || 'demo_password_only'

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

async function main() {
  console.log(`Kak Norie QDTS smoke test → ${BASE}\n`)

  let token = null

  await check('POST /auth/login', async () => {
    const body = await request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: DEMO_USER, password: DEMO_PASS })
    })
    token = body.data?.token
    if (!token) throw new Error('No token returned')
  })

  const authHeaders = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  }

  await check('GET /auth/me', async () => {
    await request('/auth/me', { headers: authHeaders })
  })

  await check('GET /defects', async () => {
    await request('/defects', { headers: authHeaders })
  })

  await check('GET /corrective-actions', async () => {
    await request('/corrective-actions', { headers: authHeaders })
  })

  await check('GET /reports/dashboard/summary', async () => {
    await request('/reports/dashboard/summary?period=this_month', { headers: authHeaders })
  })

  await check('GET /products', async () => {
    await request('/products', { headers: authHeaders })
  })

  await check('GET /batches', async () => {
    await request('/batches', { headers: authHeaders })
  })

  console.log(`\nResult: ${passed} passed, ${failed} failed`)

  if (failed > 0) {
    process.exit(1)
  }

  console.log('Smoke test passed. API is ready for demo.')
}

main().catch((error) => {
  console.error(`Smoke test crashed: ${error.message}`)
  console.error('Is the backend running? Try: cd backend && npm run dev')
  process.exit(1)
})
