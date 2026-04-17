'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function addAsset(prevState: any, formData: FormData) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Unauthorized' }

  const name = formData.get('name') as string
  const asset_type = formData.get('asset_type') as string
  const value = parseFloat(formData.get('value') as string)
  const currency = (formData.get('currency') as string) || 'USD'
  
  // Extract dynamic metadata based on type
  const metadata: Record<string, any> = {}
  
  if (asset_type === 'crypto' || asset_type === 'stock' || asset_type === 'metal') {
    metadata.ticker = formData.get('ticker')
    metadata.quantity = formData.get('quantity')
  } 
  
  // Real Estate mapping
  if (formData.get('address')) metadata.address = formData.get('address')
  if (formData.get('property_name')) metadata.property_name = formData.get('property_name')
  
  // Vehicle mapping
  if (formData.get('vin')) metadata.vin = formData.get('vin')
  if (formData.get('make')) metadata.make = formData.get('make')
  if (formData.get('model')) metadata.model = formData.get('model')
  if (formData.get('year')) metadata.year = formData.get('year')
  
  // Qty/Price manual mapping
  if (formData.get('qty')) metadata.qty = formData.get('qty')
  if (formData.get('price_per_unit')) metadata.price_per_unit = formData.get('price_per_unit')

  // Assuming user has a default portfolio. In a real app, you'd select it.
  const { data: portfolio } = await supabase
    .from('portfolios')
    .select('id')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  const sheet = (formData.get('sheet') as string) || asset_type
  const section = (formData.get('section') as string) || 'General'

  const { error } = await supabase.from('assets').insert({
    user_id: user.id,
    portfolio_id: portfolio?.id,
    name,
    asset_type,
    value,
    currency,
    metadata,
    sheet,
    section
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
  patch: { name?: string; value?: number; notes?: string; metadata?: Record<string, unknown>; sheet?: string; section?: string }
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
