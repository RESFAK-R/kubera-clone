'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ActionResult } from '@/types/db'

export async function captureSnapshot(): Promise<ActionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { success: false, error: 'Unauthorized' }

  const { error } = await supabase.rpc('capture_net_worth_snapshot', {
    p_user_id: user.id,
  })

  if (error) {
    console.error('capture_net_worth_snapshot failed:', error)
    return { success: false, error: error.message }
  }

  await supabase.rpc('touch_life_beat', { p_user_id: user.id })
  revalidatePath('/dashboard/networth')
  return { success: true }
}
