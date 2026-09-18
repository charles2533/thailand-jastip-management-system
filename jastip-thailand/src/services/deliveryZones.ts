import { supabase } from '../lib/supabaseClient'
import type { DeliveryZoneRow } from '../types/database'

export async function listDeliveryZones(): Promise<DeliveryZoneRow[]> {
  const { data, error } = await supabase.from('delivery_zones').select('*').order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []) as DeliveryZoneRow[]
}

export async function createDeliveryZone(zone: Pick<DeliveryZoneRow, 'name' | 'fee' | 'active'>) {
  const { data, error } = await supabase.from('delivery_zones').insert(zone).select('*').single()
  if (error) throw error
  return data as DeliveryZoneRow
}

export async function updateDeliveryZone(id: string, patch: Partial<DeliveryZoneRow>) {
  const { data, error } = await supabase
    .from('delivery_zones')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return data as DeliveryZoneRow
}

export async function deleteDeliveryZone(id: string) {
  const { error } = await supabase.from('delivery_zones').delete().eq('id', id)
  if (error) throw error
}
