/**
 * Domain helpers for the Shipped app.
 *
 * Kept as pure functions so they are trivially unit-testable and reusable
 * across components without pulling in React.
 */

export type ShipmentStatus =
  'pending' | 'in_transit' | 'delivered' | 'cancelled'

const STATUS_LABELS: Record<ShipmentStatus, string> = {
  pending: 'Pending',
  in_transit: 'In transit',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

/** Human-readable label for a shipment status. */
export function formatStatus(status: ShipmentStatus): string {
  return STATUS_LABELS[status]
}

/** Whether a shipment can still be cancelled. */
export function isCancellable(status: ShipmentStatus): boolean {
  return status === 'pending' || status === 'in_transit'
}
