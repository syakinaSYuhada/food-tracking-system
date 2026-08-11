const test = require('node:test')
const assert = require('node:assert/strict')
const batchService = require('../src/services/batchService')
const { addMonthsToDateOnly, diffDateOnlyDays } = require('../src/utils/dateOnly')

test('calculateCorrectExpiryDate adds shelf life months without UTC shift', () => {
  assert.equal(
    batchService.calculateCorrectExpiryDate('2026-06-25', 12),
    '2027-06-25'
  )
})

test('getExpiryDifference labels match, early, and late', () => {
  assert.deepEqual(batchService.getExpiryDifference('2027-06-25', '2027-06-25'), {
    days: 0,
    direction: 'match',
    label: 'Dates match'
  })

  assert.deepEqual(batchService.getExpiryDifference('2027-06-25', '2027-06-24'), {
    days: 1,
    direction: 'early',
    label: '1 day early'
  })

  assert.deepEqual(batchService.getExpiryDifference('2027-06-25', '2027-06-26'), {
    days: 1,
    direction: 'late',
    label: '1 day late'
  })
})

test('diffDateOnlyDays uses calendar dates only', () => {
  assert.equal(diffDateOnlyDays('2026-06-25', '2026-06-24'), 1)
  assert.equal(diffDateOnlyDays('2026-06-25', '2026-06-26'), -1)
})

test('addMonthsToDateOnly never uses UTC formatting', () => {
  assert.equal(addMonthsToDateOnly('2026-06-25', 12), '2027-06-25')
})
