import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DebtsContent } from '@/components/dashboard/DebtsContent'
import type { Asset } from '@/types/db'

export default async function DebtsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const { data: allAssets } = await supabase
    .from('assets')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  const debts = ((allAssets ?? []) as Asset[]).filter(
    (a) => a.is_liability || a.sheet === 'Debts' || a.asset_type === 'liability',
  )

  const baseCurrency = profile?.base_currency ?? 'EUR'
  const totalDebts = debts.reduce((s, d) => s + Number(d.value), 0)
  const sym = baseCurrency === 'EUR' ? '€' : '$'

  return (
    <div className="w-full min-w-0 overflow-x-hidden bg-[#f4f5f5] px-4 pb-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[980px] min-w-0 pt-8">

        {/* Header */}
        <div className="mb-6">
          <div className="flex min-w-0 flex-wrap items-baseline gap-1">
            <span className="text-[15px] font-bold text-[#1a1a1a]">{sym}</span>
            <span className="text-[38px] font-bold tracking-tight text-[#1a1a1a] leading-none sm:text-[46px]">
              {Math.round(totalDebts).toLocaleString('de-DE')}
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-[12px] font-bold text-gray-400 uppercase tracking-widest">1 Day</span>
            <span className="text-[12px] font-bold text-gray-300">{sym}0</span>
          </div>
        </div>

        <DebtsContent
          debts={debts}
          baseCurrency={baseCurrency}
          totalDebts={totalDebts}
        />

      </div>
    </div>
  )
}
