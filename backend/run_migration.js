const { Client } = require('pg')
;(async () => {
  const client = new Client({ connectionString: 'postgresql://postgres:postgres123@localhost:5432/kak_norie_qdts' })
  try {
    await client.connect()
    console.log('Connected to DB')
    const migration = `ALTER TABLE public.defects
ADD COLUMN IF NOT EXISTS containment_status VARCHAR(100) DEFAULT 'Segregated / On Hold',
ADD COLUMN IF NOT EXISTS suggested_product_handling VARCHAR(120),
ADD COLUMN IF NOT EXISTS suggested_machine_handling VARCHAR(200),
ADD COLUMN IF NOT EXISTS approved_product_handling VARCHAR(120),
ADD COLUMN IF NOT EXISTS approved_machine_handling VARCHAR(200),
ADD COLUMN IF NOT EXISTS handling_review_status VARCHAR(50) DEFAULT 'pending_review',
ADD COLUMN IF NOT EXISTS handling_review_notes TEXT,
ADD COLUMN IF NOT EXISTS handling_reviewed_by INTEGER,
ADD COLUMN IF NOT EXISTS handling_reviewed_at TIMESTAMP;`
    console.log('Running migration...')
    await client.query(migration)
    console.log('Migration applied')

    const check = `SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'defects'
AND column_name IN (
  'containment_status',
  'suggested_product_handling',
  'suggested_machine_handling',
  'approved_product_handling',
  'approved_machine_handling',
  'handling_review_status',
  'handling_review_notes',
  'handling_reviewed_by',
  'handling_reviewed_at'
)
ORDER BY column_name;`
    const res = await client.query(check)
    console.log('MIGRATION_CHECK::', JSON.stringify(res.rows, null, 2))
    await client.end()
    process.exit(0)
  } catch (e) {
    console.error('MIGRATION_ERROR::', e.message)
    try { await client.end() } catch (er) {}
    process.exit(2)
  }
})()
