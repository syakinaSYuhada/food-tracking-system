/**
 * Capture PSM §4.2.2 UI screenshots.
 * Prereq: backend (:3000) and frontend (:5173) running.
 * Usage: npm run screenshots
 */
import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.join(__dirname, '..', '..', 'PSM', 'screenshots')
const base = 'http://localhost:5173'

fs.mkdirSync(outDir, { recursive: true })

async function login(page, username) {
  await page.goto(base)
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await page.waitForSelector('text=Sign in to QDTS', { timeout: 15000 })
  const loginSelect = page.locator('form select.field-control')
  await loginSelect.selectOption(username)
  await page.fill('form input[type="password"]', 'demo_password_only')
  await page.click('form button[type="submit"]')
  await page.waitForSelector('text=Signed in as', { timeout: 15000 })
}

async function shot(page, name) {
  const file = path.join(outDir, name)
  await page.screenshot({ path: file, fullPage: true })
  console.log('  OK ', name)
}

async function main() {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } })

  try {
    await page.goto(base)
    await page.waitForSelector('text=Sign in to QDTS', { timeout: 15000 })
    await shot(page, 'fig-4-5-login.png')

    await login(page, 'nazhif')
    await page.waitForTimeout(800)
    await shot(page, 'fig-4-3-manager-sidebar.png')
    await shot(page, 'fig-4-10-dashboard-manager.png')

    await page.goto(`${base}/defects`)
    await page.waitForTimeout(800)
    await shot(page, 'fig-4-11-defect-list.png')

    await page.goto(`${base}/defects/1`)
    await page.waitForTimeout(1000)
    await shot(page, 'fig-4-12-defect-details.png')

    await page.goto(`${base}/reports`)
    await page.waitForTimeout(1000)
    await shot(page, 'fig-4-13-reports.png')

    await page.goto(`${base}/activity-log`)
    await page.waitForTimeout(800)
    await shot(page, 'fig-4-14-activity-log.png')

    await page.goto(`${base}/products`)
    await page.waitForTimeout(500)
    const addProduct = page.locator('button:has-text("Add Product")')
    if (await addProduct.count()) {
      await addProduct.first().click()
      await page.waitForTimeout(600)
      await shot(page, 'fig-4-6-add-product.png')
      await page.keyboard.press('Escape')
    }

    await page.goto(`${base}/batches`)
    await page.waitForTimeout(500)
    const addBatch = page.locator('button:has-text("Add Batch")')
    if (await addBatch.count()) {
      await addBatch.first().click()
      await page.waitForTimeout(600)
      await shot(page, 'fig-4-7-add-batch.png')
      await page.keyboard.press('Escape')
    }

    await page.goto(`${base}/defects`)
    await page.waitForTimeout(500)
    const addDefect = page.locator('button:has-text("Add Defect")')
    if (await addDefect.count()) {
      await addDefect.first().click()
      await page.waitForTimeout(800)
      await shot(page, 'fig-4-8-report-defect.png')
      await page.keyboard.press('Escape')
    }

    await page.goto(`${base}/defects/3`)
    await page.waitForTimeout(1000)
    const actionsTab = page.locator('button:has-text("Corrective Actions")')
    if (await actionsTab.count()) {
      await actionsTab.first().click()
      await page.waitForTimeout(600)
    }
    const assignBtn = page.locator('button:has-text("Assign Product Handling Action")')
    if (await assignBtn.count()) {
      await assignBtn.first().click()
      await page.waitForTimeout(600)
      await shot(page, 'fig-4-9-assign-action.png')
      await page.keyboard.press('Escape')
    }

    await login(page, 'siti_aminah')
    await page.goto(`${base}/defects`)
    await page.waitForTimeout(500)
    const reportDefect = page.locator('button:has-text("Report Defect")')
    if (await reportDefect.count()) {
      await reportDefect.first().click()
      await page.waitForTimeout(800)
      await shot(page, 'fig-4-8-report-defect-worker.png')
      await page.keyboard.press('Escape')
    }

    await login(page, 'siti_aminah')
    await page.waitForTimeout(800)
    await shot(page, 'fig-4-4-worker-sidebar.png')

    console.log('\nScreenshots saved to PSM/screenshots/')
  } catch (error) {
    console.error('Screenshot capture failed:', error.message)
    console.error('Ensure backend and frontend are running first.')
    process.exitCode = 1
  } finally {
    await browser.close()
  }
}

main()
