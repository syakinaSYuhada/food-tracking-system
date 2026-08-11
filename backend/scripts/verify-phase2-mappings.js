require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })
const { Client } = require('pg')

const checks = [
  { stage: 'Packing / Filling', mustInclude: [], label: 'Stage rename Packing / Filling' },
  { stage: 'Labelling / Expiry Printing', mustInclude: ['Wrong Batch Code on Label'], label: 'Labelling stage' },
  { stage: 'Retort Process', mustInclude: ['Bloated Packaging', 'Colour / Texture Change'], label: 'Retort Process stage' },
  { stage: 'Sealing', mustExclude: ['Bloated Packaging'], label: 'Sealing no Bloated' },
  { stage: 'Ingredient Preparation', mustInclude: ['Ingredient Quality Issue'], label: 'Ingredient Prep' },
  { stage: 'Before Delivery', mustInclude: ['Wrong Label Used', 'Label Not Set Properly'], label: 'Before Delivery' },
  {
    stage: 'After Customer Receives Product',
    mustInclude: ['Wrong Label Used', 'Wrong Batch Code on Label'],
    label: 'After Customer'
  }
]

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL })
  await client.connect()

  const stages = await client.query(`
    SELECT DISTINCT detected_at_stage FROM defect_type_mappings ORDER BY detected_at_stage
  `)
  console.log('All stages:', stages.rows.map((r) => r.detected_at_stage).join(' | '))

  let failed = 0
  for (const check of checks) {
    if (check.mustInclude?.length === 0 && check.stage) {
      if (!stages.rows.some((r) => r.detected_at_stage === check.stage)) {
        console.log('FAIL:', check.label, '- stage missing:', check.stage)
        failed++
      } else {
        console.log('OK:', check.label)
      }
      continue
    }

    const result = await client.query(
      `
      SELECT dt.defect_type_name
      FROM defect_type_mappings dtm
      JOIN defect_types dt ON dt.id = dtm.defect_type_id
      WHERE dtm.detected_at_stage = $1
      ORDER BY dt.defect_type_name
      `,
      [check.stage]
    )
    const types = result.rows.map((r) => r.defect_type_name)

    for (const name of check.mustInclude || []) {
      if (!types.includes(name)) {
        console.log('FAIL:', check.label, '- missing', name, '| have:', types.join(', '))
        failed++
      }
    }
    for (const name of check.mustExclude || []) {
      if (types.includes(name)) {
        console.log('FAIL:', check.label, '- should NOT include', name)
        failed++
      }
    }
    if ((check.mustInclude || []).every((n) => types.includes(n)) &&
        (check.mustExclude || []).every((n) => !types.includes(n))) {
      console.log('OK:', check.label, '->', types.join(', '))
    }
  }

  const options = await client.query(`
    SELECT option_type, COUNT(*)::int AS count
    FROM defect_workflow_options
    WHERE defect_type = 'Ingredient Quality Issue'
    GROUP BY option_type
    ORDER BY option_type
  `)
  const total = options.rows.reduce((sum, row) => sum + row.count, 0)
  if (total < 10) {
    console.log('FAIL: Ingredient Quality Issue workflow options count =', total)
    failed++
  } else {
    console.log('OK: Ingredient Quality Issue dedicated options =', total)
  }

  const otherOnly = await client.query(`
    SELECT COUNT(*)::int AS count FROM defect_workflow_rules WHERE defect_type = 'Ingredient Quality Issue'
  `)
  if (otherOnly.rows[0].count !== 1) {
    console.log('FAIL: Ingredient Quality Issue missing workflow rule')
    failed++
  }

  await client.end()
  process.exit(failed > 0 ? 1 : 0)
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
