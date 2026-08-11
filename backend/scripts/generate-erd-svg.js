/**
 * Generate ERD SVG from schema.sql
 * Usage:
 *   node scripts/generate-erd-svg.js          → full (all columns)
 *   node scripts/generate-erd-svg.js simple   → simplified (13 tables, key columns)
 *   node scripts/generate-erd-svg.js core     → core report ERD (8 tables)
 */

const fs = require('fs')
const path = require('path')

const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql')
const sql = fs.readFileSync(schemaPath, 'utf8')
const modeArg = process.argv[2] || 'full'
const mode = ['simple', 'core'].includes(modeArg) ? modeArg : 'full'
const outPath = path.join(
  __dirname,
  '..',
  '..',
  'PSM',
  'diagrams',
  mode === 'core'
    ? 'erd-qdts-core-report.svg'
    : mode === 'simple'
      ? 'erd-qdts-simplified.svg'
      : 'erd-qdts-full.svg'
)

const CORE_TABLES = [
  'users',
  'products',
  'batches',
  'defects',
  'root_cause_investigation',
  'corrective_actions',
  'evidence',
  'activity_logs'
]

// Key columns for FYP readability — PK, FKs, and essential business fields
const KEY_COLUMNS = {
  users: ['id', 'username', 'role', 'full_name', 'account_status'],
  products: ['id', 'product_code', 'product_name', 'shelf_life_months', 'loss_rate_per_unit', 'product_status'],
  batches: ['id', 'product_id', 'batch_number', 'retort_date', 'correct_expiry_date', 'printed_expiry_date', 'quantity_produced', 'batch_status'],
  defect_types: ['id', 'defect_type_name', 'defect_category', 'is_active'],
  defect_type_mappings: ['id', 'detected_at_stage', 'defect_type_id'],
  root_causes: ['id', 'root_cause_source', 'root_cause_name', 'is_active'],
  defects: ['id', 'defect_code', 'product_id', 'batch_id', 'detected_at_stage', 'defect_type', 'problem_level', 'qty_affected', 'defect_status', 'loss_status', 'created_by'],
  root_cause_investigation: ['id', 'defect_id', 'root_cause_status', 'confirmed_root_cause', 'confirmed_by'],
  corrective_actions: ['id', 'action_code', 'defect_id', 'action_type', 'task', 'assigned_to', 'assigned_by', 'due_date', 'ca_status', 'calculated_loss'],
  evidence: ['id', 'defect_id', 'corrective_action_id', 'file_name', 'uploaded_by'],
  activity_logs: ['id', 'user_id', 'action_type', 'entity_type', 'entity_id', 'description'],
  defect_workflow_rules: ['id', 'defect_type', 'default_problem_level', 'recommended_priority'],
  defect_workflow_options: ['id', 'defect_type', 'option_type', 'option_value']
}

const LAYOUT = {
  full: {
    users: { x: 520, y: 30 },
    products: { x: 60, y: 170 },
    batches: { x: 360, y: 170 },
    defect_types: { x: 60, y: 430 },
    defect_type_mappings: { x: 60, y: 600 },
    root_causes: { x: 60, y: 760 },
    defects: { x: 360, y: 430 },
    root_cause_investigation: { x: 360, y: 900 },
    corrective_actions: { x: 700, y: 430 },
    evidence: { x: 700, y: 900 },
    activity_logs: { x: 1040, y: 170 },
    defect_workflow_rules: { x: 1040, y: 430 },
    defect_workflow_options: { x: 1040, y: 600 }
  },
  simple: {
    users: { x: 420, y: 24 },
    products: { x: 60, y: 130 },
    batches: { x: 320, y: 130 },
    activity_logs: { x: 700, y: 130 },
    defect_types: { x: 60, y: 310 },
    defects: { x: 320, y: 310 },
    corrective_actions: { x: 700, y: 310 },
    defect_type_mappings: { x: 60, y: 530 },
    root_causes: { x: 60, y: 650 },
    root_cause_investigation: { x: 320, y: 530 },
    evidence: { x: 700, y: 530 },
    defect_workflow_rules: { x: 960, y: 310 },
    defect_workflow_options: { x: 960, y: 450 }
  },
  core: {
    users: { x: 520, y: 30 },
    products: { x: 60, y: 170 },
    batches: { x: 360, y: 170 },
    defects: { x: 360, y: 430 },
    root_cause_investigation: { x: 360, y: 700 },
    corrective_actions: { x: 700, y: 430 },
    evidence: { x: 700, y: 700 },
    activity_logs: { x: 1040, y: 170 }
  }
}

function parseTables(sqlText) {
  const tables = []
  const blocks = sqlText.match(/CREATE TABLE \w+\s*\([\s\S]*?\);/g) || []

  for (const block of blocks) {
    const name = block.match(/CREATE TABLE (\w+)/)[1]
    const inner = block.replace(/CREATE TABLE \w+\s*\(/, '').replace(/\);\s*$/, '')
    const parts = splitTopLevel(inner)

    const columns = []
    for (const part of parts) {
      const chunk = part.trim()
      if (!chunk || chunk.startsWith('CONSTRAINT') || chunk.startsWith('UNIQUE')) continue

      const col = chunk.match(/^(\w+)\s+(SERIAL|INT|INTEGER|VARCHAR|TEXT|BOOLEAN|DECIMAL|DATE|TIMESTAMP)/i)
      if (!col) continue

      const colName = col[1]
      const isPk = /PRIMARY KEY/i.test(chunk)
      const fk = chunk.match(/REFERENCES\s+(\w+)\((\w+)\)/i)
      columns.push({
        name: colName,
        isPk,
        fkTable: fk ? fk[1] : null
      })
    }

    tables.push({ name, columns })
  }

  return tables
}

function splitTopLevel(text) {
  const parts = []
  let current = ''
  let depth = 0

  for (const ch of text) {
    if (ch === '(') depth++
    if (ch === ')') depth--
    if (ch === ',' && depth === 0) {
      parts.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  if (current.trim()) parts.push(current)
  return parts
}

function filterColumns(table) {
  if (mode === 'full') return table
  const keep = KEY_COLUMNS[table.name]
  if (!keep) return table
  const colMap = Object.fromEntries(table.columns.map((c) => [c.name, c]))
  return {
    name: table.name,
    columns: keep.map((name) => colMap[name]).filter(Boolean)
  }
}

function filterTables(tables) {
  if (mode !== 'core') return tables
  const allowed = new Set(CORE_TABLES)
  return tables.filter((t) => allowed.has(t.name))
}

function tableSize(columns) {
  const rowH = 17
  const headerH = 24
  const keyColW = 32
  const attrColW = mode === 'simple' ? 185 : 200
  return {
    width: keyColW + attrColW + 14,
    height: headerH + columns.length * rowH + 6,
    rowH,
    headerH,
    keyColW,
    attrColW
  }
}

function renderTable(x, y, table) {
  const s = tableSize(table.columns)
  const lines = []
  lines.push(`  <g id="${table.name}">`)
  lines.push(`    <rect class="box" x="${x}" y="${y}" width="${s.width}" height="${s.height}"/>`)
  lines.push(`    <line class="line" x1="${x}" y1="${y + s.headerH}" x2="${x + s.width}" y2="${y + s.headerH}"/>`)
  lines.push(`    <line class="line" x1="${x + s.keyColW}" y1="${y + s.headerH}" x2="${x + s.keyColW}" y2="${y + s.height}"/>`)
  lines.push(`    <text class="title" x="${x + s.width / 2}" y="${y + 17}">${table.name}</text>`)

  table.columns.forEach((col, i) => {
    const rowY = y + s.headerH + 13 + i * s.rowH
    const keyLabel = col.isPk ? 'PK' : col.fkTable ? 'FK' : ''
    lines.push(`    <text class="key" x="${x + s.keyColW / 2}" y="${rowY}">${keyLabel}</text>`)
    lines.push(`    <text class="attr" x="${x + s.keyColW + 7}" y="${rowY}">${col.name}</text>`)
    if (col.isPk) {
      lines.push(`    <line class="line" x1="${x + s.keyColW + 7}" y1="${rowY + 2}" x2="${x + s.keyColW + 7 + col.name.length * 6}" y2="${rowY + 2}"/>`)
    }
  })

  lines.push('  </g>')
  return {
    svg: lines.join('\n'),
    cx: x + s.width / 2,
    top: y,
    bottom: y + s.height,
    right: x + s.width,
    left: x
  }
}

function drawRelationships(tables, rendered) {
  const relLines = []
  const seen = new Set()

  for (const table of tables) {
    for (const col of table.columns) {
      if (!col.fkTable) continue
      const key = `${col.fkTable}->${table.name}:${col.name}`
      if (seen.has(key)) continue
      seen.add(key)

      const parent = rendered[col.fkTable]
      const child = rendered[table.name]
      if (!parent || !child) continue

      const x1 = parent.cx
      const y1 = parent.bottom
      const x2 = child.cx
      const y2 = child.top
      const midY = (y1 + y2) / 2

      relLines.push(`  <path class="line" d="M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}"/>`)
      relLines.push(`  <line class="line" x1="${x1 - 5}" y1="${y1}" x2="${x1 + 5}" y2="${y1}"/>`)
      relLines.push(`  <line class="line" x1="${x2 - 5}" y1="${y2 - 4}" x2="${x2}" y2="${y2}"/>`)
      relLines.push(`  <line class="line" x1="${x2 - 5}" y1="${y2 + 4}" x2="${x2}" y2="${y2}"/>`)
      relLines.push(`  <line class="line" x1="${x2 - 5}" y1="${y2}" x2="${x2}" y2="${y2}"/>`)
    }
  }

  return relLines
}

function main() {
  const tables = filterTables(parseTables(sql)).map(filterColumns)
  const layout = LAYOUT[mode]
  const rendered = {}
  const blocks = tables.map((table) => {
    const pos = layout[table.name]
    const block = renderTable(pos.x, pos.y, table)
    rendered[table.name] = block
    return block.svg
  })

  const relLines = drawRelationships(tables, rendered)
  const maxX = Math.max(...Object.values(rendered).map((b) => b.right)) + 60
  const maxY = Math.max(...Object.values(rendered).map((b) => b.bottom)) + 60

  const label =
    mode === 'core'
      ? 'QDTS Core ERD (report)'
      : mode === 'simple'
        ? 'QDTS Simplified ERD (key columns)'
        : 'QDTS Full ERD from schema.sql'

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${maxX}" height="${maxY}" viewBox="0 0 ${maxX} ${maxY}" role="img" aria-label="${label}">
  <defs>
    <style>
      .title { font-family: Arial, Helvetica, sans-serif; font-size: 12px; font-weight: bold; fill: #000; text-anchor: middle; }
      .key { font-family: Arial, Helvetica, sans-serif; font-size: 10px; fill: #000; text-anchor: middle; }
      .attr { font-family: Arial, Helvetica, sans-serif; font-size: 10px; fill: #000; text-anchor: start; }
      .box { fill: #fff; stroke: #000; stroke-width: 1.1; }
      .line { fill: none; stroke: #000; stroke-width: 1.1; }
    </style>
  </defs>

${blocks.join('\n\n')}

  <g id="relationships">
${relLines.join('\n')}
  </g>
</svg>`

  fs.mkdirSync(path.dirname(outPath), { recursive: true })
  fs.writeFileSync(outPath, svg)

  console.log(`Generated (${mode}):`, outPath)
  console.log('Tables:', tables.length)
  tables.forEach((t) => console.log(`  ${t.name}: ${t.columns.length} columns`))
}

main()
