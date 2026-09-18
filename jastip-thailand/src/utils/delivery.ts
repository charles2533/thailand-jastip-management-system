import type { DeliveryZoneRow } from '../types/database'

/** Resolve the fee for a given zone id from the currently loaded zones. */
export function calculateDeliveryFee(zoneId: string | null, zones: DeliveryZoneRow[]): number {
  if (!zoneId) return 0
  const zone = zones.find((z) => z.id === zoneId)
  return zone ? zone.fee : 0
}

export function getActiveZones(zones: DeliveryZoneRow[]): DeliveryZoneRow[] {
  return zones.filter((z) => z.active)
}
