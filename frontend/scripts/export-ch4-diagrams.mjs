/**
 * Export Chapter 4 OOAD diagram PNGs from SVG / Mermaid sources.
 * Usage: node scripts/export-ch4-diagrams.mjs
 */
import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const diagramsDir = path.join(__dirname, '..', '..', 'PSM', 'diagrams')

const exports = [
  {
    out: 'figure-4-9-high-level-class-diagram.png',
    svg: 'class-diagram-qdts-high-level.svg',
  },
  {
    out: 'figure-4-10-sequence-diagram-defect-lifecycle.png',
    mmd: 'sequence-diagram-defect-lifecycle.mmd',
  },
]

async function svgToPng(page, svgPath, outPath) {
  const svg = fs.readFileSync(svgPath, 'utf8')
  await page.setContent(
    `<!DOCTYPE html><html><body style="margin:0;background:#fff">${svg}</body></html>`,
    { waitUntil: 'domcontentloaded' }
  )
  const box = await page.locator('svg').boundingBox()
  await page.locator('svg').screenshot({ path: outPath })
  console.log('  OK ', path.basename(outPath), box ? `${Math.round(box.width)}x${Math.round(box.height)}` : '')
}

async function mmdToPng(page, mmdPath, outPath) {
  const mmd = fs.readFileSync(mmdPath, 'utf8').replace(/^%%.*\n/gm, '')
  const html = `<!DOCTYPE html>
<html><head>
<script type="module">
import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs';
mermaid.initialize({ startOnLoad: true, theme: 'default', securityLevel: 'loose' });
</script>
<style>body{margin:0;padding:16px;background:#fff} .mermaid{font-family:Arial,sans-serif}</style>
</head><body><pre class="mermaid">${mmd.replace(/</g, '&lt;').replace(/`/g, '&#96;')}</pre></body></html>`
  await page.setContent(html, { waitUntil: 'networkidle' })
  await page.waitForSelector('.mermaid svg', { timeout: 30000 })
  await page.locator('.mermaid svg').screenshot({ path: outPath })
  console.log('  OK ', path.basename(outPath))
}

async function main() {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } })
  try {
    for (const item of exports) {
      const outPath = path.join(diagramsDir, item.out)
      if (item.svg) {
        await svgToPng(page, path.join(diagramsDir, item.svg), outPath)
      } else if (item.mmd) {
        await mmdToPng(page, path.join(diagramsDir, item.mmd), outPath)
      }
    }
    console.log('\nSaved to PSM/diagrams/')
  } finally {
    await browser.close()
  }
}

main().catch((err) => {
  console.error(err.message)
  process.exitCode = 1
})
