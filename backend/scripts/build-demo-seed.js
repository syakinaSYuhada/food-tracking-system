/**
 * Generates backend/database/seed_demo_timeline.sql
 * H1 2026 Retort Niaga demo dataset — 55 defects, Jan–Jun 2026
 * Usage: node scripts/build-demo-seed.js
 */

const fs = require('fs')
const path = require('path')

const PRODUCTS = {
  1: { code: 'DD-060', price: 4.99 },
  2: { code: 'DD-180', price: 14.50 },
  3: { code: 'DSML-350', price: 19.50 },
  4: { code: 'CO-003', price: 8.00 },
  5: { code: 'PNG-004', price: 6.00 },
  6: { code: 'PTM-005', price: 5.00 }
}

const RC = {
  sealing: { src: 'Machine / Tool', name: 'Sealing Pressure Issue', tool: 'Sealing Machine' },
  expiryMould: { src: 'Label / Printing', name: 'Expiry Mould Not Changed', tool: 'Expiry Date Mould' },
  expirySetting: { src: 'Label / Printing', name: 'Wrong Expiry Date Setting', tool: 'Expiry Printer' },
  weighing: { src: 'Machine / Tool', name: 'Weighing Tool Not Adjusted', tool: 'Weighing Scale' },
  storage: { src: 'Storage', name: 'Storage Condition Issue', tool: 'Storage Rack B' },
  retort: { src: 'Retort / Cooking Process', name: 'Retort Temperature Too High', tool: 'Retort Machine' },
  handling: { src: 'Worker Process', name: 'Incorrect Handling Procedure', tool: 'Packing Line' },
  machineSetting: { src: 'Machine / Tool', name: 'Machine Setting Issue', tool: 'Production Line' }
}

function sqlString(value) {
  if (value === null || value === undefined) return 'NULL'
  return `'${String(value).replace(/'/g, "''")}'`
}
function sqlTs(value) { return value ? `'${value}'::timestamp` : 'NULL' }
function sqlDate(value) { return value ? `'${value}'::date` : 'NULL' }
function lossAmount(productId, discard) { return Number((discard * PRODUCTS[productId].price).toFixed(2)) }

function d(code, batchId, productId, stage, type, level, status, created, opts = {}) {
  const qty = opts.qty ?? 20
  const relabel = opts.relabel ?? 0
  const discard = opts.discard ?? 0
  const hold = opts.hold ?? (status === 'new' ? qty : opts.hold ?? 0)
  const loss = opts.loss ?? lossAmount(productId, discard)
  const lossStatus = opts.lossStatus ?? (discard > 0 && status !== 'closed' ? 'pending_review' : discard > 0 ? 'loss_confirmed' : 'no_loss')
  return {
    code,
    batchId,
    productId,
    stage,
    type,
    defectOther: opts.defectOther || null,
    mapping: opts.mapping || 'mapped',
    level,
    status,
    desc: opts.desc || `${type} on ${PRODUCTS[productId].code} batch.`,
    qty,
    relabel,
    discard,
    hold: opts.hold ?? hold,
    rework: opts.rework ?? 0,
    loss,
    lossStatus,
    created,
    updated: opts.updated || created,
    closed: opts.closed || null,
    worker: opts.worker ?? 2,
    priority: opts.priority ?? 'medium',
    reviewDue: opts.reviewDue ?? null,
    urgency: opts.urgency ?? null
  }
}

// batch id 6 = DD-060 integration batch (insert position 6)
const batchSpecs = [
  ['DD-060-B-20260108', 1, '2026-01-06', '2026-01-08', '2028-01-08', '2028-01-08', 360, 'approved', 'January snack run.'],
  ['DD-180-B-20260114', 2, '2026-01-12', '2026-01-14', '2028-01-14', '2028-01-14', 400, 'approved', 'January dendeng run.'],
  ['PNG-004-B-20260121', 5, '2026-01-19', '2026-01-21', '2028-01-21', '2028-01-21', 220, 'approved', 'January paste batch.'],
  ['CO-003-B-20260128', 4, '2026-01-26', '2026-01-28', '2027-07-28', '2027-07-28', 150, 'approved', 'January chilli oil.'],
  ['DSML-350-B-20260130', 3, '2026-01-28', '2026-01-30', '2028-01-30', '2028-01-30', 260, 'approved', 'January meal pack.'],
  ['DD-060-B-20260615', 1, '2026-06-15', '2026-06-15', '2028-06-15', '2028-06-15', 450, 'approved', 'Integration test batch (id 6).'],
  ['DD-060-B-20260205', 1, '2026-02-03', '2026-02-05', '2028-02-05', '2028-02-05', 380, 'approved', 'February snack run.'],
  ['DD-180-B-20260210', 2, '2026-02-08', '2026-02-10', '2028-02-10', '2028-02-10', 420, 'approved', 'February dendeng run.'],
  ['DSML-350-B-20260214', 3, '2026-02-12', '2026-02-14', '2028-02-14', '2028-02-14', 280, 'approved', 'February meal pack.'],
  ['PTM-005-B-20260218', 6, '2026-02-16', '2026-02-18', '2027-08-18', '2027-08-18', 200, 'approved', 'February red paste.'],
  ['PNG-004-B-20260222', 5, '2026-02-20', '2026-02-22', '2028-02-22', '2028-02-22', 230, 'approved', 'February nasi goreng paste.'],
  ['CO-003-B-20260226', 4, '2026-02-24', '2026-02-26', '2027-08-26', '2027-08-26', 160, 'approved', 'February condiment.'],
  ['DD-060-B-20260303', 1, '2026-03-01', '2026-03-03', '2028-03-03', '2028-03-03', 390, 'approved', 'March snack run.'],
  ['DD-180-B-20260307', 2, '2026-03-05', '2026-03-07', '2028-03-07', '2028-03-07', 440, 'approved', 'March dendeng run.'],
  ['DSML-350-B-20260311', 3, '2026-03-09', '2026-03-11', '2028-03-11', '2028-03-11', 290, 'approved', 'March meal pack.'],
  ['PTM-005-B-20260315', 6, '2026-03-13', '2026-03-15', '2027-09-15', '2027-09-15', 210, 'defective', 'March storage review batch.'],
  ['PNG-004-B-20260319', 5, '2026-03-17', '2026-03-19', '2028-03-19', '2028-03-19', 240, 'approved', 'March paste batch.'],
  ['CO-003-B-20260323', 4, '2026-03-21', '2026-03-23', '2027-09-23', '2027-09-23', 170, 'approved', 'March condiment.'],
  ['DD-180-B-20260327', 2, '2026-03-25', '2026-03-27', '2028-03-27', '2028-02-27', 460, 'defective', 'March expiry mismatch batch.'],
  ['DD-060-B-20260404', 1, '2026-04-02', '2026-04-04', '2028-04-04', '2028-04-04', 370, 'approved', 'April snack run.'],
  ['DD-180-B-20260409', 2, '2026-04-07', '2026-04-09', '2028-04-09', '2028-04-09', 430, 'approved', 'April dendeng run.'],
  ['DSML-350-B-20260414', 3, '2026-04-12', '2026-04-14', '2028-04-14', '2028-04-14', 270, 'approved', 'April meal pack.'],
  ['PTM-005-B-20260419', 6, '2026-04-17', '2026-04-19', '2027-10-19', '2027-10-19', 205, 'approved', 'April red paste.'],
  ['PNG-004-B-20260424', 5, '2026-04-22', '2026-04-24', '2028-04-24', '2028-04-24', 225, 'approved', 'April paste batch.'],
  ['CO-003-B-20260429', 4, '2026-04-27', '2026-04-29', '2027-10-29', '2027-10-29', 155, 'approved', 'April condiment.'],
  ['DD-060-B-20260506', 1, '2026-05-04', '2026-05-06', '2028-05-06', '2028-05-06', 385, 'approved', 'May snack run.'],
  ['DD-180-B-20260511', 2, '2026-05-09', '2026-05-11', '2028-05-11', '2028-05-11', 445, 'approved', 'May dendeng run.'],
  ['DSML-350-B-20260516', 3, '2026-05-14', '2026-05-16', '2028-05-16', '2028-05-16', 285, 'on_hold', 'May batch on hold.'],
  ['PTM-005-B-20260521', 6, '2026-05-19', '2026-05-21', '2027-11-21', '2027-11-21', 215, 'defective', 'May storage batch.'],
  ['PNG-004-B-20260526', 5, '2026-05-24', '2026-05-26', '2028-05-26', '2028-05-26', 235, 'approved', 'May paste batch.'],
  ['CO-003-B-20260530', 4, '2026-05-28', '2026-05-30', '2027-11-30', '2027-11-30', 165, 'approved', 'May condiment.'],
  ['DD-180-B-20260601', 2, '2026-06-01', '2026-06-01', '2028-06-01', '2028-05-01', 500, 'defective', 'June expiry mismatch for D001.'],
  ['DSML-350-B-20260602', 3, '2026-06-02', '2026-06-02', '2028-06-02', '2028-06-02', 300, 'approved', 'June meal pack.'],
  ['PNG-004-B-20260604', 5, '2026-06-04', '2026-06-04', '2028-06-04', '2028-06-04', 250, 'on_hold', 'June paste on hold.'],
  ['PTM-005-B-20260610', 6, '2026-06-10', '2026-06-10', '2027-12-10', '2027-12-10', 220, 'defective', 'June storage batch.'],
  ['CO-003-B-20260612', 4, '2026-06-12', '2026-06-12', '2027-12-12', '2027-12-12', 180, 'approved', 'June condiment.'],
  ['DD-180-B-20260616', 2, '2026-06-16', '2026-06-16', '2028-06-16', '2028-06-16', 480, 'approved', 'Late June dendeng.'],
  ['DSML-350-B-20260617', 3, '2026-06-17', '2026-06-17', '2028-06-17', '2028-06-17', 310, 'approved', 'Latest June meal pack.']
]

const batches = batchSpecs.map((spec, index) => ({
  id: index + 1,
  number: spec[0],
  productId: spec[1],
  production: spec[2],
  retort: spec[3],
  correct: spec[4],
  printed: spec[5],
  qty: spec[6],
  status: spec[7],
  notes: spec[8]
}))

const defects = [
  // === JUNE TEST ANCHORS (ids 1-2) ===
  d('D001', 32, 2, 'Labelling / Expiry Printing', 'Wrong Expiry Date Printing', 'Can Be Corrected', 'in_progress', '2026-06-02 08:40:00', {
    desc: 'Printed expiry earlier than correct expiry on Dendeng 180g. Relabelling required.',
    qty: 120, relabel: 100, hold: 20, loss: 0, lossStatus: 'no_loss',
    updated: '2026-06-12 10:15:00', worker: 2, priority: 'high', reviewDue: '2026-06-10'
  }),
  d('D002', 33, 3, 'Sealing', 'Leaking Packaging', 'Food Safety Risk', 'ready_verification', '2026-06-03 11:20:00', {
    desc: 'Leaking pouches on Daging Salai line after sealing check.',
    qty: 40, discard: 20, loss: 390, lossStatus: 'loss_confirmed',
    updated: '2026-06-11 16:00:00', worker: 3, priority: 'urgent', reviewDue: '2026-06-05',
    urgency: 'Food safety risk on retail-bound stock.'
  }),
  // === JANUARY (4) ===
  d('D003', 1, 1, 'Labelling / Expiry Printing', 'Untidy Label', 'Can Be Corrected', 'closed', '2026-01-08 09:00:00', { qty: 30, relabel: 30, closed: '2026-01-20 14:00:00', updated: '2026-01-20 14:00:00' }),
  d('D004', 1, 1, 'Sealing', 'Loose Sealing', 'Hold for Review', 'closed', '2026-01-12 10:30:00', { qty: 24, discard: 4, closed: '2026-01-28 11:00:00', updated: '2026-01-28 11:00:00', worker: 3 }),
  d('D005', 1, 1, 'Packing / Filling', 'Weight Issue', 'Hold for Review', 'closed', '2026-01-12 10:45:00', { qty: 18, rework: 18, closed: '2026-02-03 09:30:00', updated: '2026-02-03 09:30:00' }),
  d('D006', 1, 1, 'Labelling / Expiry Printing', 'Wrong Batch Code on Label', 'Hold for Review', 'in_progress', '2026-01-25 08:45:00', { qty: 12, relabel: 12, updated: '2026-06-10 11:00:00', worker: 2, priority: 'medium' }),
  // === FEBRUARY (8) ===
  d('D007', 7, 1, 'Before Delivery', 'Untidy Label', 'Can Be Corrected', 'closed', '2026-02-03 09:15:00', { qty: 22, relabel: 22, closed: '2026-02-18 10:00:00', updated: '2026-02-18 10:00:00' }),
  d('D008', 7, 1, 'Sealing', 'Loose Sealing', 'Hold for Review', 'closed', '2026-02-06 11:00:00', { qty: 26, discard: 3, closed: '2026-02-20 12:00:00', updated: '2026-02-20 12:00:00', worker: 3 }),
  d('D009', 9, 3, 'Packing / Filling', 'Weight Issue', 'Hold for Review', 'closed', '2026-02-11 14:20:00', { qty: 20, discard: 2, closed: '2026-02-24 09:00:00', updated: '2026-02-24 09:00:00' }),
  d('D010', 7, 1, 'Labelling / Expiry Printing', 'Label Not Set Properly', 'Can Be Corrected', 'closed', '2026-02-11 08:30:00', { qty: 16, relabel: 16, closed: '2026-02-27 14:00:00', updated: '2026-02-27 14:00:00' }),
  d('D011', 7, 1, 'Stock Storage', 'Packaging Material Damaged', 'Hold for Review', 'closed', '2026-02-18 16:00:00', { qty: 14, hold: 14, closed: '2026-03-02 10:00:00', updated: '2026-03-02 10:00:00', worker: 3 }),
  d('D012', 12, 4, 'Sealing', 'Loose Sealing', 'Hold for Review', 'closed', '2026-02-22 09:40:00', { qty: 19, discard: 2, closed: '2026-03-06 11:30:00', updated: '2026-03-06 11:30:00', worker: 3 }),
  d('D013', 7, 1, 'Packing / Filling', 'Weight Issue', 'Hold for Review', 'in_progress', '2026-02-25 13:10:00', { qty: 25, rework: 10, hold: 5, updated: '2026-06-08 09:00:00', worker: 2, priority: 'medium' }),
  d('D014', 8, 2, 'Retort Process', 'Colour / Texture Change', 'Hold for Review', 'under_review', '2026-02-28 10:50:00', { qty: 18, discard: 5, hold: 8, updated: '2026-06-09 10:00:00', worker: 3, priority: 'medium', reviewDue: '2026-06-12' }),
  // === MARCH (12) — quality spike ===
  d('D015', 13, 1, 'Sealing', 'Loose Sealing', 'Hold for Review', 'closed', '2026-03-02 08:55:00', { qty: 28, discard: 4, closed: '2026-03-18 12:00:00', updated: '2026-03-18 12:00:00', worker: 3 }),
  d('D016', 14, 2, 'Packing / Filling', 'Weight Issue', 'Hold for Review', 'closed', '2026-03-06 10:10:00', { qty: 22, discard: 3, closed: '2026-03-20 09:45:00', updated: '2026-03-20 09:45:00' }),
  d('D017', 15, 3, 'Retort Process', 'Colour / Texture Change', 'Hold for Review', 'closed', '2026-03-06 14:25:00', { qty: 24, discard: 6, closed: '2026-03-22 11:30:00', updated: '2026-03-22 11:30:00', worker: 3 }),
  d('D018', 16, 6, 'Packing / Filling', 'Foreign Matter', 'Food Safety Risk', 'closed', '2026-03-11 09:35:00', { qty: 10, discard: 10, closed: '2026-03-26 16:10:00', updated: '2026-03-26 16:10:00', worker: 3, priority: 'urgent', urgency: 'Metal fragment found during packing.' }),
  d('D019', 19, 2, 'Labelling / Expiry Printing', 'Wrong Expiry Date Printing', 'Can Be Corrected', 'closed', '2026-03-14 08:00:00', { qty: 40, relabel: 38, discard: 2, closed: '2026-03-28 10:00:00', updated: '2026-03-28 10:00:00', desc: 'March expiry mismatch resolved after relabelling.' }),
  d('D020', 14, 2, 'Sealing', 'Leaking Packaging', 'Food Safety Risk', 'closed', '2026-03-17 11:00:00', { qty: 32, discard: 15, closed: '2026-03-30 14:00:00', updated: '2026-03-30 14:00:00', worker: 3, priority: 'high' }),
  d('D021', 15, 3, 'Retort Process', 'Retort Process Issue', 'Food Safety Risk', 'closed', '2026-03-19 15:40:00', { qty: 18, discard: 8, closed: '2026-04-02 10:05:00', updated: '2026-04-02 10:05:00', worker: 3, priority: 'urgent' }),
  d('D022', 17, 5, 'Sealing', 'Loose Sealing', 'Hold for Review', 'closed', '2026-03-24 08:15:00', { qty: 21, discard: 3, closed: '2026-04-05 13:50:00', updated: '2026-04-05 13:50:00', worker: 3 }),
  d('D023', 18, 4, 'Stock Storage', 'Smell Change', 'Food Safety Risk', 'closed', '2026-03-24 11:00:00', { qty: 20, discard: 12, closed: '2026-04-08 08:30:00', updated: '2026-04-08 08:30:00', worker: 3, priority: 'high' }),
  d('D024', 13, 1, 'Ingredient Preparation', 'Foreign Matter', 'Food Safety Risk', 'under_review', '2026-03-27 13:25:00', { qty: 6, discard: 6, loss: 29.94, lossStatus: 'loss_confirmed', updated: '2026-06-05 09:00:00', worker: 3, priority: 'high', reviewDue: '2026-06-08' }),
  d('D025', 16, 6, 'Stock Storage', 'Product Spoiled', 'Food Safety Risk', 'in_progress', '2026-03-28 09:50:00', { qty: 14, discard: 14, loss: 70, lossStatus: 'loss_confirmed', updated: '2026-06-06 11:00:00', worker: 3, priority: 'high' }),
  d('D026', 17, 5, 'Packing / Filling', 'Weight Issue', 'Hold for Review', 'in_progress', '2026-03-30 16:55:00', { qty: 23, rework: 15, hold: 8, updated: '2026-06-07 14:00:00', worker: 2, priority: 'medium' }),
  // === APRIL (6) — recovery ===
  d('D027', 20, 1, 'Labelling / Expiry Printing', 'Untidy Label', 'Can Be Corrected', 'closed', '2026-04-04 09:10:00', { qty: 28, relabel: 28, closed: '2026-04-18 10:00:00', updated: '2026-04-18 10:00:00' }),
  d('D028', 21, 2, 'Sealing', 'Loose Sealing', 'Hold for Review', 'closed', '2026-04-09 10:30:00', { qty: 22, discard: 4, closed: '2026-04-22 11:45:00', updated: '2026-04-22 11:45:00', worker: 3 }),
  d('D029', 22, 3, 'Packing / Filling', 'Weight Issue', 'Hold for Review', 'closed', '2026-04-14 13:05:00', { qty: 20, rework: 20, closed: '2026-04-25 09:30:00', updated: '2026-04-25 09:30:00' }),
  d('D030', 23, 6, 'Labelling / Expiry Printing', 'Wrong Batch Code on Label', 'Hold for Review', 'closed', '2026-04-14 08:50:00', { qty: 16, relabel: 16, closed: '2026-04-27 15:10:00', updated: '2026-04-27 15:10:00' }),
  d('D031', 24, 5, 'Stock Storage', 'Packaging Material Damaged', 'Hold for Review', 'under_review', '2026-04-22 16:20:00', { qty: 12, hold: 12, updated: '2026-06-04 10:00:00', worker: 3, priority: 'medium', reviewDue: '2026-06-10' }),
  d('D032', 25, 4, 'Before Delivery', 'Untidy Label', 'Can Be Corrected', 'closed', '2026-04-29 09:40:00', { qty: 15, relabel: 15, closed: '2026-05-05 13:25:00', updated: '2026-05-05 13:25:00' }),
  // === MAY (10) — mixed storage / food safety ===
  d('D033', 26, 1, 'Stock Storage', 'Smell Change', 'Food Safety Risk', 'in_progress', '2026-05-02 08:55:00', { qty: 25, discard: 8, hold: 5, loss: 50, lossStatus: 'pending_review', updated: '2026-05-29 08:30:00', priority: 'high', reviewDue: '2026-05-20', urgency: 'Held stock may need disposal.' }),
  d('D034', 27, 2, 'Labelling / Expiry Printing', 'Wrong Expiry Date Printing', 'Can Be Corrected', 'under_review', '2026-05-06 10:10:00', { qty: 35, hold: 35, updated: '2026-05-28 14:00:00', priority: 'high', reviewDue: '2026-05-12', desc: 'May expiry label mix-up under manager review.' }),
  d('D035', 28, 3, 'Packing / Filling', 'Foreign Matter', 'Food Safety Risk', 'under_review', '2026-05-06 14:25:00', { qty: 8, discard: 8, loss: 156, lossStatus: 'loss_confirmed', updated: '2026-05-30 13:50:00', worker: 3, priority: 'high', reviewDue: '2026-05-15' }),
  d('D036', 29, 6, 'Stock Storage', 'Smell Change', 'Food Safety Risk', 'closed', '2026-05-14 09:35:00', { qty: 18, discard: 10, closed: '2026-05-26 16:10:00', updated: '2026-05-26 16:10:00', worker: 3, priority: 'high' }),
  d('D037', 30, 5, 'Sealing', 'Loose Sealing', 'Hold for Review', 'closed', '2026-05-14 11:00:00', { qty: 19, discard: 3, closed: '2026-05-30 12:00:00', updated: '2026-05-30 12:00:00', worker: 3 }),
  d('D038', 26, 1, 'Sealing', 'Loose Sealing', 'Hold for Review', 'closed', '2026-05-20 15:40:00', { qty: 16, hold: 16, closed: '2026-05-31 10:05:00', updated: '2026-05-31 10:05:00', worker: 3, priority: 'medium', reviewDue: '2026-05-25' }),
  d('D039', 27, 2, 'Retort Process', 'Colour / Texture Change', 'Hold for Review', 'closed', '2026-05-22 08:15:00', { qty: 22, hold: 10, closed: '2026-06-01 09:00:00', updated: '2026-06-01 09:00:00', worker: 3, priority: 'medium', reviewDue: '2026-05-28' }),
  d('D040', 31, 4, 'Labelling / Expiry Printing', 'Wrong Label Used', 'Hold for Review', 'closed', '2026-05-24 13:00:00', { qty: 14, relabel: 14, closed: '2026-06-01 11:00:00', updated: '2026-06-01 11:00:00' }),
  d('D041', 28, 3, 'Sealing', 'Loose Sealing', 'Hold for Review', 'action_assigned', '2026-05-28 16:55:00', { qty: 17, hold: 17, worker: 3, priority: 'medium', reviewDue: '2026-06-02' }),
  d('D042', 29, 6, 'Stock Storage', 'Product Spoiled', 'Food Safety Risk', 'closed', '2026-05-28 08:30:00', { qty: 10, discard: 10, loss: 50, lossStatus: 'loss_confirmed', closed: '2026-06-03 10:00:00', updated: '2026-06-03 10:00:00', worker: 3, priority: 'high', reviewDue: '2026-06-03' }),
  // === JUNE remainder (13) — ids 43-55 ===
  d('D043', 6, 1, 'Packing / Filling', 'Weight Issue', 'Hold for Review', 'new', '2026-06-06 09:10:00', { qty: 30, hold: 30, priority: 'high', reviewDue: '2026-06-08' }),
  d('D044', 6, 1, 'Before Delivery', 'Untidy Label', 'Can Be Corrected', 'closed', '2026-06-06 08:20:00', { qty: 18, relabel: 18, closed: '2026-06-12 14:00:00', updated: '2026-06-12 14:00:00' }),
  d('D045', 35, 6, 'Stock Storage', 'Smell Change', 'Food Safety Risk', 'under_review', '2026-06-09 13:25:00', { qty: 22, hold: 22, lossStatus: 'pending_review', updated: '2026-06-11 08:00:00', worker: 3, priority: 'high', reviewDue: '2026-06-09' }),
  d('D046', 34, 5, 'Sealing', 'Loose Sealing', 'Hold for Review', 'action_assigned', '2026-06-09 10:45:00', { qty: 18, hold: 18, worker: 3, priority: 'medium', reviewDue: '2026-06-11' }),
  d('D047', 36, 4, 'Labelling / Expiry Printing', 'Other', 'Hold for Review', 'new', '2026-06-11 10:00:00', { defectOther: 'Label ink faded after storage', mapping: 'needs_manager_review', qty: 15, hold: 15, priority: 'medium', reviewDue: '2026-06-12' }),
  d('D048', 37, 2, 'Before Delivery', 'Packaging Material Damaged', 'Hold for Review', 'under_review', '2026-06-13 08:20:00', { qty: 12, hold: 12, worker: 3, priority: 'medium', reviewDue: '2026-06-13' }),
  d('D049', 35, 6, 'Stock Storage', 'Product Spoiled', 'Food Safety Risk', 'in_progress', '2026-06-13 14:10:00', { qty: 12, discard: 12, loss: 60, lossStatus: 'loss_confirmed', updated: '2026-06-15 10:20:00', worker: 3, priority: 'high', reviewDue: '2026-06-12', urgency: 'Discard required immediately.' }),
  d('D050', 32, 2, 'Labelling / Expiry Printing', 'Wrong Expiry Date Printing', 'Can Be Corrected', 'pending_verification', '2026-06-15 08:30:00', { qty: 42, hold: 42, updated: '2026-06-15 11:00:00', priority: 'high', reviewDue: '2026-06-14', desc: 'Second June expiry case awaiting close-out.' }),
  d('D051', 33, 3, 'Packing / Filling', 'Weight Issue', 'Hold for Review', 'new', '2026-06-16 09:50:00', { qty: 26, hold: 26, priority: 'high', reviewDue: '2026-06-16' }),
  d('D052', 6, 1, 'Sealing', 'Leaking Packaging', 'Food Safety Risk', 'under_review', '2026-06-16 10:15:00', { qty: 14, hold: 14, lossStatus: 'pending_review', updated: '2026-06-15 11:40:00', worker: 3, priority: 'high', reviewDue: '2026-06-14' }),
  d('D053', 38, 3, 'Packing / Filling', 'Foreign Matter', 'Food Safety Risk', 'action_assigned', '2026-06-17 13:00:00', { qty: 6, discard: 6, loss: 117, lossStatus: 'loss_confirmed', updated: '2026-06-16 09:10:00', worker: 2, priority: 'high', reviewDue: '2026-06-15' }),
  d('D054', 34, 5, 'Retort Process', 'Colour / Texture Change', 'Hold for Review', 'in_progress', '2026-06-17 11:35:00', { qty: 20, hold: 8, lossStatus: 'pending_review', updated: '2026-06-16 09:50:00', worker: 3, priority: 'high', reviewDue: '2026-06-16' }),
  d('D055', 6, 1, 'Sealing', 'Loose Sealing', 'Hold for Review', 'new', '2026-06-17 07:50:00', { qty: 11, hold: 11, worker: 3, priority: 'urgent', reviewDue: '2026-06-17', urgency: 'Manager review needed before dispatch.' })
]

defects.forEach((defect, index) => { defect.id = index + 1 })

const confirmedRcByDefect = {
  2: RC.sealing,
  3: RC.handling, 4: RC.sealing, 5: RC.weighing, 6: RC.expirySetting,
  7: RC.handling, 8: RC.sealing, 9: RC.weighing, 10: RC.expirySetting,
  11: RC.storage, 12: RC.sealing,
  15: RC.sealing, 16: RC.weighing, 17: RC.retort, 18: RC.handling,
  19: RC.expiryMould, 20: RC.sealing, 21: RC.retort, 22: RC.sealing,
  23: RC.storage, 24: RC.handling, 25: RC.storage, 26: RC.weighing,
  27: RC.handling, 28: RC.sealing, 29: RC.weighing, 30: RC.expirySetting,
  31: RC.storage, 32: RC.handling, 36: RC.storage, 37: RC.sealing,
  38: RC.sealing, 39: RC.retort, 40: RC.expirySetting, 42: RC.storage, 44: RC.handling
}

const suspectedRcByDefect = {
  1: RC.expiryMould,
  13: RC.weighing,
  14: RC.retort,
  24: RC.handling,
  31: RC.storage,
  33: RC.storage,
  34: RC.expirySetting,
  39: RC.retort,
  41: RC.sealing,
  46: RC.sealing,
  49: RC.storage,
  52: RC.sealing,
  53: RC.handling,
  54: RC.retort
}

function buildRootCauses() {
  return defects.map((defect) => {
    if (defect.id === 1) {
      return { defectId: 1, status: 'suspected', suspectedSource: RC.expiryMould.src, suspected: RC.expiryMould.name, tool: RC.expiryMould.tool, confirmedSource: null, confirmed: null, confirmedBy: null, confirmedDate: null, notes: 'Suspected mould not changed before labelling.' }
    }
    const confirmed = confirmedRcByDefect[defect.id]
    if (confirmed) {
      return { defectId: defect.id, status: 'confirmed', suspectedSource: confirmed.src, suspected: confirmed.name, tool: confirmed.tool, confirmedSource: confirmed.src, confirmed: confirmed.name, confirmedBy: 1, confirmedDate: defect.closed || defect.updated, notes: 'Root cause confirmed during investigation.' }
    }
    const suspected = suspectedRcByDefect[defect.id]
    if (suspected) {
      return { defectId: defect.id, status: 'suspected', suspectedSource: suspected.src, suspected: suspected.name, tool: suspected.tool, confirmedSource: null, confirmed: null, confirmedBy: null, confirmedDate: null, notes: 'Suspected cause recorded; pending confirmation.' }
    }
    return { defectId: defect.id, status: 'pending_investigation', suspectedSource: null, suspected: null, tool: null, confirmedSource: null, confirmed: null, confirmedBy: null, confirmedDate: null, notes: 'Awaiting investigation.' }
  })
}

function ca(code, defectId, assignee, due, priority, status, created, opts = {}) {
  return { code, defectId, type: opts.type || 'product_handling', task: opts.task || 'Complete corrective work per defect investigation.', assignee, due, priority, status, created, started: opts.started || null, completed: opts.completed || null, verified: opts.verified || null, rejected: opts.rejected || null, rejectionReason: opts.rejectionReason || null, evidenceRequired: opts.evidenceRequired || false }
}

const actions = [
  ca('CA001', 1, 2, '2026-06-08', 'medium', 'in_progress', '2026-06-02 09:30:00', { type: 'product_handling', task: 'Change expiry date mould; Test print expiry date before full labelling', started: '2026-06-04 09:00:00' }),
  ca('CA002', 2, 3, '2026-06-06', 'high', 'verified', '2026-06-03 10:00:00', { type: 'machine_process_check', task: 'Adjust sealing machine pressure; Test sealing sample', started: '2026-06-03 10:00:00', completed: '2026-06-04 11:20:00', verified: '2026-06-05 15:30:00', evidenceRequired: true }),
  ca('CA003', 33, 2, '2026-05-25', 'critical', 'in_progress', '2026-05-18 09:30:00', { task: 'Check storage condition; Review storage condition; Discard defective product', started: '2026-05-20 09:30:00' }),
  ca('CA004', 38, 3, '2026-05-28', 'medium', 'verified', '2026-05-22 10:00:00', { type: 'machine_process_check', task: 'Adjust sealing machine pressure; Test sealing sample', started: '2026-05-23 10:00:00', completed: '2026-05-30 14:00:00', verified: '2026-05-31 10:05:00' }),
  ca('CA005', 41, 3, '2026-06-04', 'medium', 'in_progress', '2026-06-01 08:00:00', { type: 'machine_process_check', task: 'Adjust sealing machine pressure; Test sealing sample', started: '2026-06-02 09:00:00' }),
  ca('CA006', 46, 3, '2026-06-12', 'medium', 'in_progress', '2026-06-08 11:00:00', { type: 'machine_process_check', task: 'Adjust sealing machine pressure; Test sealing sample', started: '2026-06-09 08:00:00' }),
  ca('CA007', 49, 2, '2026-06-14', 'critical', 'in_progress', '2026-06-11 08:00:00', { task: 'Separate affected batch; Discard defective product', started: '2026-06-12 08:00:00' }),
  ca('CA008', 50, 2, '2026-06-16', 'high', 'completed', '2026-06-12 09:00:00', { task: 'Change expiry date mould; Test print expiry date before full labelling', started: '2026-06-13 09:00:00', completed: '2026-06-15 10:30:00' }),
  ca('CA009', 53, 2, '2026-06-18', 'critical', 'assigned', '2026-06-15 09:00:00', { task: 'Hold stock temporarily for review; Check ingredient quality' }),
  ca('CA010', 54, 3, '2026-06-17', 'high', 'in_progress', '2026-06-15 14:00:00', { type: 'machine_process_check', task: 'Check retort temperature; Adjust cooking temperature / time', started: '2026-06-16 08:00:00' }),
  ca('CA011', 20, 3, '2026-03-25', 'high', 'rejected', '2026-03-18 10:00:00', { type: 'machine_process_check', task: 'Adjust sealing machine pressure; Test sealing sample', started: '2026-03-19 10:00:00', completed: '2026-03-22 11:00:00', rejected: '2026-03-23 15:00:00', rejectionReason: 'Sealing test photo unclear — resubmit evidence.' }),
  ca('CA012', 20, 3, '2026-03-28', 'high', 'verified', '2026-03-24 09:00:00', { type: 'machine_process_check', task: 'Adjust sealing machine pressure; Test sealing sample (resubmit)', started: '2026-03-25 09:00:00', completed: '2026-03-27 10:00:00', verified: '2026-03-30 14:00:00' }),
  ca('CA013', 29, 2, '2026-04-22', 'medium', 'cancelled', '2026-04-15 10:00:00', { task: 'Duplicate assignment — superseded by machine check.' }),
  ca('CA014', 29, 2, '2026-04-22', 'medium', 'verified', '2026-04-15 10:05:00', { type: 'machine_process_check', task: 'Reset / adjust weighing tool; Recheck weighing procedure', started: '2026-04-17 09:00:00', completed: '2026-04-20 11:00:00', verified: '2026-04-25 09:30:00' }),
  ca('CA015', 18, 3, '2026-03-20', 'critical', 'rejected', '2026-03-12 08:00:00', { task: 'Hold stock temporarily for review; Check ingredient quality', started: '2026-03-13 08:00:00', completed: '2026-03-15 14:00:00', rejected: '2026-03-16 10:00:00', rejectionReason: 'Containment steps incomplete.' }),
  ca('CA016', 18, 3, '2026-03-24', 'critical', 'verified', '2026-03-17 09:00:00', { task: 'Hold stock; Segregate batch; Discard affected units', started: '2026-03-18 09:00:00', completed: '2026-03-22 16:00:00', verified: '2026-03-26 16:10:00' }),
  ca('CA017', 15, 3, '2026-03-12', 'medium', 'cancelled', '2026-03-04 09:00:00', { task: 'Cancelled — wrong assignee, reassigned to machine check.' }),
  ca('CA018', 15, 3, '2026-03-12', 'medium', 'verified', '2026-03-04 09:05:00', { type: 'machine_process_check', task: 'Adjust sealing machine pressure; Test sealing sample', started: '2026-03-06 10:00:00', completed: '2026-03-14 11:00:00', verified: '2026-03-18 12:00:00' }),
  ca('CA019', 39, 3, '2026-06-01', 'medium', 'verified', '2026-05-24 10:00:00', { type: 'machine_process_check', task: 'Check retort temperature; Adjust cooking temperature / time', started: '2026-05-28 09:00:00', completed: '2026-05-31 16:00:00', verified: '2026-06-01 09:00:00' }),
  ca('CA020', 42, 3, '2026-06-05', 'high', 'verified', '2026-06-01 09:00:00', { task: 'Separate affected batch; Discard defective product', started: '2026-06-02 08:00:00', completed: '2026-06-04 14:00:00', verified: '2026-06-03 10:00:00' }),
  ca('CA021', 48, 3, '2026-06-15', 'medium', 'verified', '2026-06-10 10:00:00', { task: 'Relabel affected products; Check all products in same batch', started: '2026-06-11 09:00:00', completed: '2026-06-14 11:00:00', verified: '2026-06-14 12:00:00' }),
  ca('CA022', 52, 3, '2026-06-16', 'high', 'completed', '2026-06-14 08:00:00', { type: 'machine_process_check', task: 'Adjust sealing machine pressure; Test sealing sample', started: '2026-06-14 13:00:00', completed: '2026-06-16 10:00:00' }),
  ca('CA023', 45, 2, '2026-06-14', 'high', 'assigned', '2026-06-07 09:00:00', { task: 'Check storage condition; Review storage condition' }),
  ca('CA024', 47, 2, '2026-06-15', 'medium', 'assigned', '2026-06-09 08:00:00', { task: 'Relabel affected products; Check all products in same batch' }),
  ca('CA025', 26, 2, '2026-04-10', 'medium', 'rejected', '2026-04-02 09:00:00', { task: 'Recheck weighing procedure', started: '2026-04-04 09:00:00', completed: '2026-04-08 10:00:00', rejected: '2026-04-09 11:00:00', rejectionReason: 'Rework evidence missing.' }),
  ca('CA026', 37, 3, '2026-05-20', 'medium', 'cancelled', '2026-05-12 09:00:00', { task: 'Cancelled duplicate CA after batch merge.' }),
  ca('CA027', 43, 2, '2026-06-10', 'high', 'in_progress', '2026-06-05 09:00:00', { type: 'machine_process_check', task: 'Reset / adjust weighing tool; Recheck weighing procedure', started: '2026-06-06 08:00:00' }),
  ca('CA028', 51, 2, '2026-06-18', 'high', 'assigned', '2026-06-13 09:00:00', { task: 'Reset / adjust weighing tool; Recheck weighing procedure' }),
  ca('CA029', 55, 3, '2026-06-18', 'critical', 'assigned', '2026-06-17 08:30:00', { type: 'machine_process_check', task: 'Adjust sealing machine pressure; Test sealing sample' })
]

const verifiedClosedPairs = [
  [3, '2026-01-20'], [4, '2026-01-28'], [7, '2026-02-18'], [15, '2026-03-18'],
  [19, '2026-03-28'], [27, '2026-04-18'], [36, '2026-05-26'], [37, '2026-05-30'], [44, '2026-06-12']
]
let caCounter = 30
verifiedClosedPairs.forEach(([defectId, verifiedDate]) => {
  const defect = defects[defectId - 1]
  actions.push(ca(`CA${String(caCounter).padStart(3, '0')}`, defectId, defect.worker, defect.created.split(' ')[0], 'medium', 'verified', defect.created, {
    type: defectId % 2 === 0 ? 'machine_process_check' : 'product_handling',
    started: defect.created,
    completed: defect.updated,
    verified: verifiedDate
  }))
  caCounter += 1
})

const monthlyActionSupplements = [
  ca('CA039', 6, 2, '2026-02-10', 'medium', 'assigned', '2026-01-10 09:00:00', { task: 'Relabel affected batch codes on DD-060 packs.' }),
  ca('CA040', 5, 2, '2026-02-03', 'medium', 'in_progress', '2026-01-14 10:00:00', { task: 'Recheck weighing after relabelling run.', started: '2026-01-16 09:00:00' }),
  ca('CA041', 4, 3, '2026-01-28', 'medium', 'completed', '2026-01-18 11:00:00', { type: 'machine_process_check', task: 'Adjust sealing machine pressure; Test sealing sample', started: '2026-01-19 09:00:00', completed: '2026-01-22 14:00:00' }),
  ca('CA042', 4, 3, '2026-01-25', 'medium', 'rejected', '2026-01-16 09:00:00', { type: 'machine_process_check', task: 'Adjust sealing machine pressure; Test sealing sample', started: '2026-01-17 10:00:00', completed: '2026-01-20 11:00:00', rejected: '2026-01-21 15:00:00', rejectionReason: 'Sealing test photo incomplete.' }),
  ca('CA043', 5, 2, '2026-02-03', 'low', 'cancelled', '2026-01-12 08:00:00', { task: 'Duplicate weighing check — cancelled after relabelling.' }),
  ca('CA044', 13, 2, '2026-03-15', 'medium', 'in_progress', '2026-02-20 10:00:00', { task: 'Reset / adjust weighing tool; Recheck weighing procedure', started: '2026-02-22 09:00:00' }),
  ca('CA045', 14, 3, '2026-03-12', 'medium', 'assigned', '2026-02-26 09:00:00', { type: 'machine_process_check', task: 'Check retort temperature; Adjust cooking temperature / time' }),
  ca('CA046', 8, 3, '2026-02-25', 'medium', 'completed', '2026-02-19 14:00:00', { type: 'machine_process_check', task: 'Adjust sealing machine pressure; Test sealing sample', started: '2026-02-20 09:00:00', completed: '2026-02-23 16:00:00' }),
  ca('CA047', 11, 3, '2026-03-05', 'medium', 'rejected', '2026-02-16 10:00:00', { task: 'Review storage condition on rack B.', started: '2026-02-17 09:00:00', completed: '2026-02-19 14:00:00', rejected: '2026-02-20 11:00:00', rejectionReason: 'Storage photo missing batch label.' }),
  ca('CA048', 9, 2, '2026-02-28', 'medium', 'cancelled', '2026-02-08 09:00:00', { task: 'Cancelled duplicate weight check assignment.' }),
  ca('CA049', 7, 2, '2026-02-22', 'medium', 'verified', '2026-02-10 09:00:00', { task: 'Relabel affected products.', started: '2026-02-12 09:00:00', completed: '2026-02-16 11:00:00', verified: '2026-02-18 10:00:00' }),
  ca('CA050', 31, 3, '2026-05-05', 'medium', 'assigned', '2026-04-18 09:00:00', { task: 'Review storage rack condition for damaged packaging.' }),
  ca('CA051', 28, 3, '2026-04-25', 'medium', 'in_progress', '2026-04-12 10:00:00', { type: 'machine_process_check', task: 'Adjust sealing machine pressure; Test sealing sample', started: '2026-04-14 09:00:00' }),
  ca('CA052', 27, 2, '2026-04-20', 'medium', 'completed', '2026-04-08 11:00:00', { task: 'Relabel untidy labels on April run.', started: '2026-04-10 09:00:00', completed: '2026-04-17 15:00:00' }),
  ca('CA053', 30, 2, '2026-04-28', 'medium', 'rejected', '2026-04-16 09:00:00', { task: 'Relabel batch code mismatch.', started: '2026-04-18 10:00:00', completed: '2026-04-22 11:00:00', rejected: '2026-04-23 14:00:00', rejectionReason: 'Before/after label photos not attached.' }),
  ca('CA054', 29, 2, '2026-04-25', 'low', 'cancelled', '2026-04-15 08:00:00', { task: 'Cancelled duplicate relabelling task.' }),
  ca('CA055', 34, 2, '2026-05-15', 'high', 'assigned', '2026-05-08 09:00:00', { task: 'Change expiry date mould; Test print expiry date before full labelling' }),
  ca('CA056', 36, 3, '2026-05-22', 'high', 'completed', '2026-05-14 10:00:00', { task: 'Separate affected batch; Discard defective product', started: '2026-05-16 09:00:00', completed: '2026-05-20 16:00:00' }),
  ca('CA057', 37, 3, '2026-05-25', 'medium', 'rejected', '2026-05-18 09:00:00', { type: 'machine_process_check', task: 'Adjust sealing machine pressure; Test sealing sample', started: '2026-05-19 10:00:00', completed: '2026-05-22 11:00:00', rejected: '2026-05-23 15:00:00', rejectionReason: 'Sample count below SOP minimum.' }),
  ca('CA058', 39, 3, '2026-06-02', 'medium', 'cancelled', '2026-05-26 08:00:00', { task: 'Cancelled after retort parameter update.' }),
  ca('CA059', 15, 3, '2026-03-20', 'medium', 'assigned', '2026-03-05 09:00:00', { type: 'machine_process_check', task: 'Adjust sealing machine pressure; Test sealing sample' }),
  ca('CA060', 16, 2, '2026-03-22', 'medium', 'in_progress', '2026-03-08 10:00:00', { task: 'Reset / adjust weighing tool; Recheck weighing procedure', started: '2026-03-10 09:00:00' }),
  ca('CA061', 17, 3, '2026-03-25', 'medium', 'completed', '2026-03-12 11:00:00', { type: 'machine_process_check', task: 'Check retort temperature; Adjust cooking temperature / time', started: '2026-03-14 09:00:00', completed: '2026-03-18 15:00:00' })
]
actions.push(...monthlyActionSupplements)

const rootCauses = buildRootCauses()

const evidenceSpecs = [
  { defectId: 2, caCode: 'CA002', file: 'sealing_test.jpg', note: 'Photo after sealing pressure adjustment.', uploader: 3 },
  { defectId: 18, caCode: 'CA016', file: 'foreign_matter_hold.jpg', note: 'Segregated stock photo.', uploader: 3 },
  { defectId: 20, caCode: 'CA011', file: 'sealing_test_blurry.jpg', note: 'Initial rejected sealing sample (blurry).', uploader: 3 },
  { defectId: 20, caCode: 'CA012', file: 'sealing_test_pass.jpg', note: 'Resubmitted sealing test — passed.', uploader: 3 },
  { defectId: 33, caCode: 'CA003', file: 'storage_smell_review.jpg', note: 'May storage smell inspection.', uploader: 2 },
  { defectId: 49, caCode: 'CA007', file: 'spoiled_stock.jpg', note: 'Spoiled units before discard.', uploader: 2 },
  { defectId: 50, caCode: 'CA008', file: 'expiry_test_print.jpg', note: 'Test print submitted — pending manager review.', uploader: 2 },
  { defectId: 15, caCode: 'CA018', file: 'sealing_pressure_log.jpg', note: 'Verified sealing pressure log.', uploader: 3 },
  { defectId: 19, caCode: 'CA034', file: 'expiry_relabel_mar.jpg', note: 'March expiry relabelling evidence.', uploader: 2 },
  { defectId: 1, caCode: 'CA001', file: 'expiry_mould_check.jpg', note: 'Expiry mould inspection in progress.', uploader: 2 },
  { defectId: 24, caCode: null, file: 'ingredient_sieve.jpg', note: 'Ingredient prep sieve check.', uploader: 3 },
  { defectId: 35, caCode: null, file: 'fm_containment.jpg', note: 'Foreign matter containment photo.', uploader: 3 }
]

const DEMO_EVIDENCE_ASSETS = [
  { filePath: '/uploads/evidence/demo-seed-1.jpeg', fileType: 'image/jpeg' },
  { filePath: '/uploads/evidence/demo-seed-2.jpeg', fileType: 'image/jpeg' },
  { filePath: '/uploads/evidence/demo-seed-3.png', fileType: 'image/png' }
]

function resolveDemoEvidenceAsset(index) {
  if (index < 4) return DEMO_EVIDENCE_ASSETS[0]
  if (index < 8) return DEMO_EVIDENCE_ASSETS[1]
  return DEMO_EVIDENCE_ASSETS[2]
}

const activityRows = [
  [2, 'REPORT_DEFECT', 'defect', 3, 'Worker reported untidy label on Dendeng 60g.', null, 'Defect status: new', '2026-01-08 09:05:00'],
  [1, 'START_REVIEW', 'defect', 3, 'Manager started review for defect D003.', 'new', 'under_review', '2026-01-08 10:00:00'],
  [1, 'ASSIGN_CORRECTIVE_ACTION', 'corrective_action', 30, 'Corrective action CA030 assigned for D003.', null, 'assigned', '2026-01-09 11:00:00'],
  [2, 'START_CORRECTIVE_ACTION', 'corrective_action', 30, 'Worker started corrective action CA030.', 'assigned', 'in_progress', '2026-01-12 08:30:00'],
  [2, 'COMPLETE_CORRECTIVE_ACTION', 'corrective_action', 30, 'Worker completed corrective action CA030.', 'in_progress', 'completed', '2026-01-18 15:00:00'],
  [1, 'VERIFY_CORRECTIVE_ACTION', 'corrective_action', 30, 'Manager verified corrective action CA030.', 'completed', 'verified', '2026-01-20 14:05:00'],
  [1, 'CONFIRM_ROOT_CAUSE', 'defect', 3, 'Root cause confirmed for D003.', 'suspected', 'confirmed', '2026-01-20 14:10:00'],
  [1, 'CLOSE_DEFECT', 'defect', 3, 'Defect D003 closed after verified corrective action.', 'ready_verification', 'closed', '2026-01-20 14:15:00'],
  [3, 'REPORT_DEFECT', 'defect', 15, 'Worker reported loose sealing during March QC.', null, 'Defect status: new', '2026-03-02 09:00:00'],
  [1, 'START_REVIEW', 'defect', 15, 'Manager started review for defect D015.', 'new', 'under_review', '2026-03-03 09:00:00'],
  [1, 'ASSIGN_CORRECTIVE_ACTION', 'corrective_action', 17, 'Corrective action CA017 assigned (later cancelled).', null, 'assigned', '2026-03-04 09:00:00'],
  [1, 'CANCEL_CORRECTIVE_ACTION', 'corrective_action', 17, 'Cancelled CA017 — reassigned as machine check.', 'assigned', 'cancelled', '2026-03-04 09:10:00'],
  [1, 'ASSIGN_CORRECTIVE_ACTION', 'corrective_action', 18, 'Corrective action CA018 assigned for D015.', null, 'assigned', '2026-03-04 09:15:00'],
  [3, 'COMPLETE_CORRECTIVE_ACTION', 'corrective_action', 11, 'Worker completed CA011 for D020.', 'in_progress', 'completed', '2026-03-22 11:05:00'],
  [1, 'REJECT_CORRECTIVE_ACTION', 'corrective_action', 11, 'Manager rejected CA011 — unclear sealing evidence.', 'completed', 'rejected', '2026-03-23 15:05:00'],
  [3, 'COMPLETE_CORRECTIVE_ACTION', 'corrective_action', 12, 'Worker resubmitted CA012 for D020.', 'in_progress', 'completed', '2026-03-27 10:05:00'],
  [1, 'VERIFY_CORRECTIVE_ACTION', 'corrective_action', 12, 'Manager verified CA012 for D020.', 'completed', 'verified', '2026-03-30 14:05:00'],
  [1, 'CONFIRM_ROOT_CAUSE', 'defect', 20, 'Root cause confirmed as Sealing Pressure Issue for D020.', 'suspected', 'confirmed', '2026-03-30 14:10:00'],
  [1, 'CLOSE_DEFECT', 'defect', 20, 'Defect D020 closed after verification.', 'ready_verification', 'closed', '2026-03-30 14:15:00'],
  [2, 'REPORT_DEFECT', 'defect', 27, 'Worker reported untidy label in April recovery run.', null, 'Defect status: new', '2026-04-04 09:15:00'],
  [1, 'START_REVIEW', 'defect', 27, 'Manager started review for D027.', 'new', 'under_review', '2026-04-05 10:00:00'],
  [1, 'CLOSE_DEFECT', 'defect', 27, 'Defect D027 closed after relabelling.', 'ready_verification', 'closed', '2026-04-18 10:05:00'],
  [3, 'REPORT_DEFECT', 'defect', 35, 'Worker reported foreign matter in May batch.', null, 'Defect status: new', '2026-05-10 14:30:00'],
  [1, 'START_REVIEW', 'defect', 35, 'Manager started food safety review for D035.', 'new', 'under_review', '2026-05-11 09:00:00'],
  [1, 'ASSIGN_CORRECTIVE_ACTION', 'corrective_action', 3, 'Corrective action CA003 assigned for May storage smell D033.', null, 'assigned', '2026-05-18 09:35:00'],
  [2, 'START_CORRECTIVE_ACTION', 'corrective_action', 3, 'Worker started CA003.', 'assigned', 'in_progress', '2026-05-20 09:35:00'],
  [1, 'CREATE_DEFECT', 'defect', 1, 'Defect D001 recorded for wrong expiry date printing.', null, 'Defect status: in_progress', '2026-06-02 09:00:00'],
  [1, 'ASSIGN_CORRECTIVE_ACTION', 'corrective_action', 1, 'Corrective action CA001 assigned to Siti Aminah.', null, 'assigned', '2026-06-02 09:30:00'],
  [2, 'START_CORRECTIVE_ACTION', 'corrective_action', 1, 'Siti Aminah started CA001.', 'assigned', 'in_progress', '2026-06-04 09:05:00'],
  [3, 'COMPLETE_CORRECTIVE_ACTION', 'corrective_action', 2, 'Hairul completed CA002 for D002.', 'in_progress', 'completed', '2026-06-04 11:25:00'],
  [1, 'VERIFY_CORRECTIVE_ACTION', 'corrective_action', 2, 'Nazhif verified CA002.', 'completed', 'verified', '2026-06-05 15:35:00'],
  [1, 'CONFIRM_ROOT_CAUSE', 'defect', 2, 'Root cause confirmed as Sealing Pressure Issue for D002.', 'suspected', 'confirmed', '2026-06-05 15:40:00'],
  [2, 'COMPLETE_CORRECTIVE_ACTION', 'corrective_action', 8, 'Worker completed CA008 for D050 — pending review.', 'in_progress', 'completed', '2026-06-15 10:35:00'],
  [1, 'CLOSE_DEFECT', 'defect', 44, 'Defect D044 closed after dispatch relabelling.', 'ready_verification', 'closed', '2026-06-12 14:05:00'],
  [3, 'REPORT_DEFECT', 'defect', 55, 'Worker reported urgent loose sealing on latest run.', null, 'Priority: urgent', '2026-06-17 08:00:00']
]

const lines = []
lines.push('-- =========================================================')
lines.push('-- H1 2026 DEMO TIMELINE SEED (Jan–Jun 2026, 55 defects)')
lines.push('-- Generated by scripts/build-demo-seed.js')
lines.push('-- =========================================================')
lines.push('')

lines.push('INSERT INTO batches (batch_number, product_id, production_date, retort_date, correct_expiry_date, printed_expiry_date, quantity_produced, batch_status, notes, created_by) VALUES')
lines.push(batches.map((batch, index) => `  (${sqlString(batch.number)}, ${batch.productId}, ${sqlDate(batch.production)}, ${sqlDate(batch.retort)}, ${sqlDate(batch.correct)}, ${sqlDate(batch.printed)}, ${batch.qty}, ${sqlString(batch.status)}, ${sqlString(batch.notes)}, 1)${index === batches.length - 1 ? ';' : ','}`).join('\n'))
lines.push('')

lines.push('INSERT INTO defects (defect_code, product_id, batch_id, detected_at_stage, defect_type, defect_type_other, mapping_status, problem_level, priority, review_due_date, urgency_reason, description, qty_affected, qty_relabelled, qty_repacked, qty_discarded, qty_on_hold, qty_reworked, still_sellable, loss_rate_per_unit, estimated_loss, loss_status, defect_status, created_by, closed_by, created_at, updated_at, closed_at) VALUES')
lines.push(defects.map((defect, index) => {
  const stillSellable = defect.relabel + defect.hold
  const price = PRODUCTS[defect.productId].price
  return `  (${sqlString(defect.code)}, ${defect.productId}, ${defect.batchId}, ${sqlString(defect.stage)}, ${sqlString(defect.type)}, ${sqlString(defect.defectOther)}, ${sqlString(defect.mapping)}, ${sqlString(defect.level)}, ${sqlString(defect.priority)}, ${sqlDate(defect.reviewDue)}, ${sqlString(defect.urgency)}, ${sqlString(defect.desc)}, ${defect.qty}, ${defect.relabel}, 0, ${defect.discard}, ${defect.hold}, ${defect.rework}, ${stillSellable}, ${price.toFixed(2)}, ${Number(defect.loss).toFixed(2)}, ${sqlString(defect.lossStatus)}, ${sqlString(defect.status)}, ${defect.worker}, ${defect.closed ? 1 : 'NULL'}, ${sqlTs(defect.created)}, ${sqlTs(defect.updated)}, ${sqlTs(defect.closed)})${index === defects.length - 1 ? ';' : ','}`
}).join('\n'))
lines.push('')

lines.push('INSERT INTO root_cause_investigation (defect_id, root_cause_status, suspected_root_cause_source, suspected_root_cause, related_tool_machine, confirmed_root_cause_source, confirmed_root_cause, confirmed_by, confirmed_date, investigation_notes) VALUES')
lines.push(rootCauses.map((row, index) => `  (${row.defectId}, ${sqlString(row.status)}, ${sqlString(row.suspectedSource)}, ${sqlString(row.suspected)}, ${sqlString(row.tool)}, ${sqlString(row.confirmedSource)}, ${sqlString(row.confirmed)}, ${row.confirmedBy || 'NULL'}, ${sqlTs(row.confirmedDate)}, ${sqlString(row.notes)})${index === rootCauses.length - 1 ? ';' : ','}`).join('\n'))
lines.push('')

lines.push('INSERT INTO corrective_actions (action_code, defect_id, action_type, task, containment_actions, corrective_actions, assigned_to, assigned_by, due_date, priority, ca_status, started_by, started_date, completed_by, completed_date, completion_notes, verified_by, verified_date, verification_notes, rejected_by, rejected_date, rejection_reason, created_at) VALUES')
lines.push(actions.map((action, index) => {
  const startedBy = action.started ? action.assignee : 'NULL'
  const completedBy = action.completed ? action.assignee : 'NULL'
  const verifiedBy = action.verified ? 1 : 'NULL'
  const rejectedBy = action.rejected ? 1 : 'NULL'
  return `  (${sqlString(action.code)}, ${action.defectId}, ${sqlString(action.type)}, ${sqlString(action.task)}, ${sqlString(action.task)}, ${sqlString(action.task)}, ${action.assignee}, 1, ${sqlDate(action.due)}, ${sqlString(action.priority)}, ${sqlString(action.status)}, ${startedBy}, ${sqlTs(action.started)}, ${completedBy}, ${sqlTs(action.completed)}, ${sqlString(action.completed ? 'Completed in demo seed.' : null)}, ${verifiedBy}, ${sqlTs(action.verified)}, ${sqlString(action.verified ? 'Verified in demo seed.' : null)}, ${rejectedBy}, ${sqlTs(action.rejected)}, ${sqlString(action.rejectionReason)}, ${sqlTs(action.created)})${index === actions.length - 1 ? ';' : ','}`
}).join('\n'))
lines.push('')

const caIdByCode = Object.fromEntries(actions.map((action, index) => [action.code, index + 1]))
lines.push('INSERT INTO evidence (defect_id, corrective_action_id, file_name, file_path, file_type, evidence_note, uploaded_by) VALUES')
lines.push(evidenceSpecs.map((row, index) => {
  const caId = row.caCode ? caIdByCode[row.caCode] : 'NULL'
  const asset = resolveDemoEvidenceAsset(index)
  return `  (${row.defectId}, ${caId}, ${sqlString(row.file)}, ${sqlString(asset.filePath)}, ${sqlString(asset.fileType)}, ${sqlString(row.note)}, ${row.uploader})${index === evidenceSpecs.length - 1 ? ';' : ','}`
}).join('\n'))
lines.push('')

lines.push('INSERT INTO activity_logs (user_id, action_type, entity_type, entity_id, description, old_value, new_value, created_at) VALUES')
lines.push(activityRows.map((row, index) => `  (${row[0]}, ${sqlString(row[1])}, ${sqlString(row[2])}, ${row[3]}, ${sqlString(row[4])}, ${sqlString(row[5])}, ${sqlString(row[6])}, ${sqlTs(row[7])})${index === activityRows.length - 1 ? ';' : ','}`).join('\n'))
lines.push('')

const outputPath = path.join(__dirname, '..', 'database', 'seed_demo_timeline.sql')
fs.writeFileSync(outputPath, `${lines.join('\n')}\n`, 'utf8')

const productCounts = {}
defects.forEach((def) => { productCounts[def.productId] = (productCounts[def.productId] || 0) + 1 })
const rcCounts = { confirmed: 0, suspected: 0, pending_investigation: 0 }
rootCauses.forEach((rc) => { rcCounts[rc.status] += 1 })
const caCounts = {}
actions.forEach((a) => { caCounts[a.status] = (caCounts[a.status] || 0) + 1 })

console.log(`Wrote ${outputPath}`)
console.log(`Batches: ${batches.length}, Defects: ${defects.length}, CAs: ${actions.length}, Evidence: ${evidenceSpecs.length}, Activity logs: ${activityRows.length}`)
console.log('Product distribution:', productCounts)
console.log('Root cause distribution:', rcCounts)
console.log('CA status distribution:', caCounts)