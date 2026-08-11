import test from 'node:test'
import assert from 'node:assert/strict'
import { formatExpiryDate, hasExpiryMismatch } from '../src/utils/expiry.js'
import { addMonthsToDateOnly, diffDateOnlyDays, getExpiryDifferenceLabel } from '../src/utils/dateOnly.js'
import { isActionOverdue } from '../src/utils/dueDate.js'

test('formatExpiryDate returns dash for empty values', () => {
  assert.equal(formatExpiryDate(null), '-')
  assert.equal(formatExpiryDate(''), '-')
})

test('formatExpiryDate strips time from ISO strings', () => {
  assert.equal(formatExpiryDate('2025-06-15T10:00:00.000Z'), '2025-06-15')
})

test('hasExpiryMismatch detects different printed and correct dates', () => {
  assert.equal(
    hasExpiryMismatch({
      correct_expiry_date: '2026-01-01',
      printed_expiry_date: '2025-12-01'
    }),
    true
  )
})

test('hasExpiryMismatch returns false when dates match', () => {
  assert.equal(
    hasExpiryMismatch({
      correct_expiry_date: '2026-01-01',
      printed_expiry_date: '2026-01-01'
    }),
    false
  )
})

test('hasExpiryMismatch returns false when either date is missing', () => {
  assert.equal(hasExpiryMismatch({ correct_expiry_date: '2026-01-01' }), false)
  assert.equal(hasExpiryMismatch({ printed_expiry_date: '2026-01-01' }), false)
})

test('isActionOverdue is false without due date', () => {
  assert.equal(isActionOverdue(null, 'assigned'), false)
})

test('isActionOverdue is false for closed statuses', () => {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const due = yesterday.toISOString().split('T')[0]
  assert.equal(isActionOverdue(due, 'completed'), false)
  assert.equal(isActionOverdue(due, 'verified'), false)
})

test('isActionOverdue flags past due open actions', () => {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const due = yesterday.toISOString().split('T')[0]
  assert.equal(isActionOverdue(due, 'assigned'), true)
  assert.equal(isActionOverdue(due, 'in_progress'), true)
})

test('isActionOverdue ignores future due dates', () => {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const due = tomorrow.toISOString().split('T')[0]
  assert.equal(isActionOverdue(due, 'assigned'), false)
})

test('addMonthsToDateOnly adds shelf life without UTC minus-one-day bug', () => {
  assert.equal(addMonthsToDateOnly('2026-06-25', 12), '2027-06-25')
})

test('getExpiryDifferenceLabel returns match, early, and late labels', () => {
  assert.equal(getExpiryDifferenceLabel('2027-06-25', '2027-06-25'), 'Dates match')
  assert.equal(getExpiryDifferenceLabel('2027-06-25', '2027-06-24'), '1 day early')
  assert.equal(getExpiryDifferenceLabel('2027-06-25', '2027-06-26'), '1 day late')
})

test('diffDateOnlyDays compares calendar dates', () => {
  assert.equal(diffDateOnlyDays('2027-06-25', '2027-06-24'), 1)
  assert.equal(diffDateOnlyDays('2027-06-25', '2027-06-26'), -1)
})
