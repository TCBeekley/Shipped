import { describe, expect, it } from 'vitest'
import {
  formatStatus,
  isCancellable,
  type ShipmentStatus,
} from '../../src/utils/shipment'

describe('formatStatus', () => {
  // Parametrized ("it.each") example: one row per case keeps the table readable.
  it.each<[ShipmentStatus, string]>([
    ['pending', 'Pending'],
    ['in_transit', 'In transit'],
    ['delivered', 'Delivered'],
    ['cancelled', 'Cancelled'],
  ])('formats %s as "%s"', (status, expected) => {
    expect(formatStatus(status)).toBe(expected)
  })
})

describe('isCancellable', () => {
  it.each<[ShipmentStatus, boolean]>([
    ['pending', true],
    ['in_transit', true],
    ['delivered', false],
    ['cancelled', false],
  ])('returns %s -> %s', (status, expected) => {
    expect(isCancellable(status)).toBe(expected)
  })
})
