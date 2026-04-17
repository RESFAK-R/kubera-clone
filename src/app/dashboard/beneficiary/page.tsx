import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BeneficiaryContent } from '@/components/dashboard/BeneficiaryContent'
import type { Beneficiary, LifeBeatState, Document } from '@/types/db'

export default async function BeneficiaryPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: beneficiariesData }, { data: lifeBeatData }, { data: documentsData }] = await Promise.all([
    supabase.from('beneficiaries').select('*').eq('user_id', user.id).order('role'),
    supabase.from('life_beat_state').select('*').eq('user_id', user.id).maybeSingle(),
    supabase.from('documents').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
  ])

  return (
    <BeneficiaryContent
      beneficiaries={(beneficiariesData ?? []) as Beneficiary[]}
      lifeBeat={(lifeBeatData ?? null) as LifeBeatState | null}
      documents={(documentsData ?? []) as Document[]}
    />
  )
}
