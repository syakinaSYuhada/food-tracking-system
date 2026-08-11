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
  await page.waitForSelector('text=Total Defects', { timeout: 30000 })
  await page.waitForTimeout(1000)

  for (const name of ['fig-4-10-dashboard-manager.png', 'fig-4-7-dashboard-manager.png']) {
    const file = path.join(outDir, name)
    await page.screenshot({ path: file, fullPage: true })
    console.log('Saved', file)
  }
} finally {
  await browser.close()
}
