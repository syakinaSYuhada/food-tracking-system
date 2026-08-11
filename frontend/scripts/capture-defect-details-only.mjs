import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.join(__dirname, '..', '..', 'PSM', 'screenshots')
const base = 'http://localhost:5173'

fs.mkdirSync(outDir, { recursive: true })

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1366, height: 900 } })

try {
  await page.goto(base)
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await page.waitForSelector('text=Sign in to QDTS', { timeout: 20000 })
  await page.locator('form select.field-control').selectOption('nazhif')
  await page.fill('form input[type="password"]', 'demo_password_only')
  await page.click('form button[type="submit"]')
  await page.waitForSelector('text=Signed in as', { timeout: 20000 })

  // Use a defect with workflow content visible on overview tab
  await page.goto(`${base}/defects/56`)
  await page.waitForSelector('button:has-text("Overview")', { timeout: 30000 })
  await page.waitForSelector('button:has-text("Corrective Actions")', { timeout: 30000 })
  await page.waitForTimeout(1200)

  for (const name of ['fig-4-12-defect-details.png', 'fig-4-8-defect-details.png']) {
    const file = path.join(outDir, name)
    await page.screenshot({ path: file, fullPage: true })
    console.log('Saved', file)
  }
} finally {
  await browser.close()
}
