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

  revalidatePath('/dashboard')
  return { success: true }
}

export async function deleteAsset(id: string) {
  const supabase = await createClient()
  
  const { error } = await supabase.from('assets').delete().eq('id', id)
  
  if (error) {
    console.error('Error deleting asset:', error)
    return { error: error.message }
  }
  
  revalidatePath('/dashboard')
  return { success: true }
}
