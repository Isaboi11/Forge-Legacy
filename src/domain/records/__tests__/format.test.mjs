/**
 * PersonalRecord display formatting — locks that the structured measure renders to the exact
 * string a PR plate shows, so the string→structured migration is provably lossless and stays that
 * way. Zero-dep node --test.
 */
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { formatRecordValue, formatDuration } from '../format.ts'

test('load: bare and with reps — the × branch changes the output', () => {
  assert.equal(formatRecordValue({ kind: 'load', value: 315, unit: 'lb' }), '315 lb')
  assert.equal(formatRecordValue({ kind: 'load', value: 405, unit: 'lb', reps: 3 }), '405 lb × 3')
  assert.equal(formatRecordValue({ kind: 'load', value: 100, unit: 'kg' }), '100 kg')
})

test('time: mm:ss under an hour, h:mm:ss once the effort exceeds one', () => {
  assert.equal(formatRecordValue({ kind: 'time', seconds: 1188 }), '19:48') // 5K PR
  assert.equal(formatRecordValue({ kind: 'time', seconds: 3725 }), '1:02:05') // >3600 → h:mm:ss (long row/ruck)
  assert.equal(formatDuration(3600), '1:00:00') // exact hour boundary
  assert.equal(formatDuration(605), '10:05') // zero-padded seconds
  assert.equal(formatDuration(59), '0:59')
  assert.equal(formatDuration(0), '0:00')
})

test('distance + reps', () => {
  assert.equal(formatRecordValue({ kind: 'distance', value: 18.2, unit: 'mi' }), '18.2 mi')
  assert.equal(formatRecordValue({ kind: 'reps', reps: 20 }), '20 reps')
})
