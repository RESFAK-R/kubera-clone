'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const TICKERIZED_ASSET_TYPES = new Set(['stock', 'crypto', 'metal'])

function formString(formData: FormData, key: string): string {
  const value = formData.get(key)
  return typeof value === 'string' ? value.trim() : ''
}

function formNumber(formData: FormData, key: string): number | null {
  const value = formString(formData, key)
  if (!value) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function normalizeTicker(value: string): string | null {
  const ticker = value.trim().replace(/^\$/, '').toUpperCase()
  return ticker || null
}

export async function addAsset(_prevState: unknown, formData: FormData) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const name = formString(formData, 'name')
  const asset_type = formString(formData, 'asset_type')
  const value = formNumber(formData, 'value')
  const currency = formString(formData, 'currency') || 'USD'
  const notes = formString(formData, 'notes')
  const sheet = formString(formData, 'sheet') || asset_type
  const section = formString(formData, 'section') || 'General'

  if (!name) return { error: 'Asset name is required' }
  if (!asset_type) return { error: 'Asset type is required' }
  if (value == null) return { error: 'Asset value is required' }
  
  // Extract dynamic metadata based on type
  const metadata: Record<string, unknown> = {}
  const isTickerized = TICKERIZED_ASSET_TYPES.has(asset_type)
  const quantity = formNumber(formData, 'quantity') ?? formNumber(formData, 'qty')
  const pricePerUnit = formNumber(formData, 'price_per_unit')
  const explicitCostBasis = formNumber(formData, 'cost_basis')
  const explicitTicker = formString(formData, 'ticker')
  const ticker = isTickerized
    ? normalizeTicker(explicitTicker || (quantity != null ? name : ''))
    : null
  const costBasis =
    isTickerized
      ? explicitCostBasis ?? (quantity != null && pricePerUnit != null ? quantity * pricePerUnit : null)
      : null
  
  if (isTickerized) {
    if (ticker) metadata.ticker = ticker
    if (quantity != null) metadata.quantity = quantity
    if (costBasis != null) metadata.cost_basis = costBasis
  } 
  
  // Real Estate mapping
  if (formString(formData, 'address')) metadata.address = formString(formData, 'address')
  if (formString(formData, 'property_name')) metadata.property_name = formString(formData, 'property_name')
  
  // Vehicle mapping
  if (formString(formData, 'vin')) metadata.vin = formString(formData, 'vin')
  if (formString(formData, 'make')) metadata.make = formString(formData, 'make')
  if (formString(formData, 'model')) metadata.model = formString(formData, 'model')
  if (formString(formData, 'year')) metadata.year = formString(formData, 'year')
  
  // Qty/Price manual mapping
  if (quantity != null) metadata.qty = quantity
  if (pricePerUnit != null) metadata.price_per_unit = pricePerUnit

  // Assuming user has a default portfolio. In a real app, you'd select it.
  const { data: portfolio } = await supabase
    .from('portfolios')
    .select('id')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  const { error } = await supabase.from('assets').insert({
    user_id: user.id,
    portfolio_id: portfolio?.id ?? null,
    name,
    asset_type,
    value,
    currency,
    metadata,
    sheet,
    section,
    ticker,
    quantity,
    cost_basis: costBasis,
    is_liability: asset_type === 'liability' || sheet === 'Debts',
    notes: notes || null,
  })

  if (error) {
    console.error('Error adding asset:', error)
    return { error: error.message }
  }

  await supabase.rpc('capture_net_worth_snapshot', { p_user_id: user.id })
  await supabase.rpc('touch_life_beat', { p_user_id: user.id })
  revalidatePath('/dashboard')
  return { success: true }
}

export async function updateAsset(
  id: string,
  patch: {
    name?: string
    value?: number
    notes?: string | null
    metadata?: Record<string, unknown>
    sheet?: string
    section?: string
    ticker?: string | null
    quantity?: number | null
    cost_basis?: number | null
    is_liability?: boolean
  }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const update: Record<string, unknown> = {}
  if (patch.name !== undefined) update.name = patch.name
  if (patch.value !== undefined) update.value = patch.value
  if (patch.sheet !== undefined) update.sheet = patch.sheet
  if (patch.section !== undefined) update.section = patch.section
  if (patch.metadata !== undefined) update.metadata = patch.metadata
  if (patch.notes !== undefined) update.notes = patch.notes
  if (patch.ticker !== undefined) update.ticker = patch.ticker ? normalizeTicker(patch.ticker) : null
  if (patch.quantity !== undefined) update.quantity = patch.quantity
  if (patch.cost_basis !== undefined) update.cost_basis = patch.cost_basis
  if (patch.is_liability !== undefined) update.is_liability = patch.is_liability

  const { error } = await supabase
    .from('assets')
    .update(update)
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    console.error('Error updating asset:', error)
    return { error: error.message }
  }

  await supabase.rpc('capture_net_worth_snapshot', { p_user_id: user.id })
  await supabase.rpc('touch_life_beat', { p_user_id: user.id })
  revalidatePath('/dashboard')
  return { success: true }
}

export async function renameSheet(oldName: string, newName: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { error } = await supabase
    .from('assets')
    .update({ sheet: newName })
    .eq('sheet', oldName)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  revalidatePath('/dashboard')
  return { success: true }
}

export async function deleteSheet(name: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { error } = await supabase
    .from('assets')
    .delete()
    .eq('sheet', name)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  await supabase.rpc('capture_net_worth_snapshot', { p_user_id: user.id })
  await supabase.rpc('touch_life_beat', { p_user_id: user.id })
  revalidatePath('/dashboard')
  return { success: true }
}

export async function deleteAsset(id: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const { error } = await supabase.from('assets').delete().eq('id', id).eq('user_id', user.id)

  if (error) {
    console.error('Error deleting asset:', error)
    return { error: error.message }
  }

  await supabase.rpc('capture_net_worth_snapshot', { p_user_id: user.id })
  await supabase.rpc('touch_life_beat', { p_user_id: user.id })
  revalidatePath('/dashboard')
  return { success: true }
}
