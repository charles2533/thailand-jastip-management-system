import { supabase } from '../lib/supabaseClient'
import type { SettingsRow } from '../types/database'
import { DEFAULT_FEE_CONFIGURATION, DEFAULT_BASE_RATE, DEFAULT_MARGIN, DEFAULT_ROUNDING_RULE } from '../utils/pricing'
import { DEFAULT_WHATSAPP_TEMPLATE } from '../utils/whatsapp'

const DEFAULT_DELIVERY_ZONES = [
  { name: 'Surabaya Barat', fee: 10000, active: true },
  { name: 'Surabaya area lainnya', fee: 15000, active: true },
  { name: 'Outside Surabaya', fee: 20000, active: true },
]

/**
 * Settings is a singleton table. This fetches the single row, creating it
 * with sensible defaults on first run if it doesn't exist yet.
 */
export async function getSettings(): Promise<SettingsRow> {
  const { data, error } = await supabase.from('settings').select('*').limit(1).maybeSingle()
  if (error) throw error
  if (data) return data as SettingsRow

  const { data: created, error: createError } = await supabase
    .from('settings')
    .insert({
      business_name: 'Thailand Jastip by Charles',
      whatsapp: '',
      instagram: '',
      address: '',
      base_exchange_rate: DEFAULT_BASE_RATE,
      currency_margin: DEFAULT_MARGIN,
      rounding_rule: DEFAULT_ROUNDING_RULE,
      fee_configuration: DEFAULT_FEE_CONFIGURATION,
      whatsapp_template: DEFAULT_WHATSAPP_TEMPLATE,
    })
    .select('*')
    .single()

  if (createError) throw createError

  // Seed default delivery zones alongside first-run settings.
  const { count } = await supabase.from('delivery_zones').select('id', { count: 'exact', head: true })
  if (!count) {
    await supabase.from('delivery_zones').insert(DEFAULT_DELIVERY_ZONES)
  }

  return created as SettingsRow
}

export async function updateSettings(id: string, patch: Partial<SettingsRow>): Promise<SettingsRow> {
  const { data, error } = await supabase
    .from('settings')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*')
    .single()
  if (error) throw error
  return data as SettingsRow
}
