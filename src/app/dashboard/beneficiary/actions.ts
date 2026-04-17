'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ActionResult, Beneficiary, LifeBeatState, BeneficiaryRole } from '@/types/db'

const BeneficiaryInput = z.object({
  role: z.enum(['primary', 'secondary', 'trusted_angel']),
  full_name: z.string().min(1).max(200),
  email: z.string().email(),
  phone: z.string().max(40).optional().or(z.literal('')),
  relationship: z.string().max(80).optional().or(z.literal('')),
  notes: z.string().max(1000).optional().or(z.literal('')),
})

export type BeneficiaryInput = z.infer<typeof BeneficiaryInput>

export async function upsertBeneficiary(input: BeneficiaryInput): Promise<ActionResult<Beneficiary>> {
  const parsed = BeneficiaryInput.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues.map((i) => i.message).join(', ') }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const row = {
    user_id: user.id,
    role: parsed.data.role,
    full_name: parsed.data.full_name,
    email: parsed.data.email,
    phone: parsed.data.phone || null,
    relationship: parsed.data.relationship || null,
    notes: parsed.data.notes || null,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from('beneficiaries')
    .upsert(row, { onConflict: 'user_id,role' })
    .select()
    .single()

  if (error) return { success: false, error: error.message }

  await supabase.rpc('touch_life_beat', { p_user_id: user.id })
  revalidatePath('/dashboard/beneficiary')
  return { success: true, data: data as Beneficiary }
}

export async function deleteBeneficiary(role: BeneficiaryRole): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const { error } = await supabase
    .from('beneficiaries')
    .delete()
    .eq('user_id', user.id)
    .eq('role', role)

  if (error) return { success: false, error: error.message }
  revalidatePath('/dashboard/beneficiary')
  return { success: true }
}

const LifeBeatInput = z.object({
  check_interval_days: z.number().int().min(7).max(365),
  enabled: z.boolean(),
})

export async function updateLifeBeat(
  input: z.infer<typeof LifeBeatInput>,
): Promise<ActionResult<LifeBeatState>> {
  const parsed = LifeBeatInput.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues.map((i) => i.message).join(', ') }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const { data, error } = await supabase
    .from('life_beat_state')
    .upsert(
      {
        user_id: user.id,
        check_interval_days: parsed.data.check_interval_days,
        enabled: parsed.data.enabled,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    )
    .select()
    .single()

  if (error) return { success: false, error: error.message }

  revalidatePath('/dashboard/beneficiary')
  return { success: true, data: data as LifeBeatState }
}

export async function resetLifeBeatTimer(): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const { error } = await supabase.rpc('touch_life_beat', { p_user_id: user.id })
  if (error) return { success: false, error: error.message }
  revalidatePath('/dashboard/beneficiary')
  return { success: true }
}
