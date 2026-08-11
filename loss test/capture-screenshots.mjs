import { chromium } from '../frontend/node_modules/playwright/index.mjs'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outDir = path.join(__dirname, 'screenshots')
fs.mkdirSync(outDir, { recursive: true })

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } })

await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' })
await page.locator('input[type="text"]').first().fill('nazhif')
await page.locator('input[type="password"]').first().fill('demo_password_only')
await page.locator('button[type="submit"]').click()
await page.waitForURL('**/dashboard**', { timeout: 15000 }).catch(() => page.waitForTimeout(3000))

await page.goto('http://localhost:5173/reports', { waitUntil: 'networkidle' })
await page.waitForTimeout(2000)
await page.screenshot({ path: path.join(outDir, '01-reports-overview.png'), fullPage: true })

await page.getByRole('button', { name: 'Loss', exact: true }).click()
await page.waitForTimeout(2500)
await page.screenshot({ path: path.join(outDir, '02-reports-loss-tab.png'), fullPage: true })

await page.goto('http://localhost:5173/dashboard', { waitUntil: 'networkidle' })
await page.waitForTimeout(2000)
await page.screenshot({ path: path.join(outDir, '03-dashboard-financial-kpis.png'), fullPage: true })

await browser.close()
console.log('Saved screenshots to', outDir)
