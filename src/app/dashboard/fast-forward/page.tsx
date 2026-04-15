import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { FastForwardContent } from '@/components/dashboard/FastForwardContent'

export default async function FastForwardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const { data: assets } = await supabase
    .from('assets')
    .select('*')
    .eq('user_id', user.id)

  const baseCurrency = profile?.base_currency || 'EUR'

  // Calculate totals
  let totalAssets = 0
  let totalDebts = 0
  let investableAssets = 0

  assets?.forEach(asset => {
    const val = Number(asset.value)
    if (asset.asset_type === 'liability') {
      totalDebts += val
    } else {
      totalAssets += val
      if (['stock', 'crypto', 'metal', 'cash'].includes(asset.asset_type)) {
        investableAssets += val
      }
    }
  })

  const totalNetWorth = totalAssets - totalDebts

  return (
    <div className="flex-1 w-full bg-[#f4f5f5] pb-24 px-8 md:px-16 overflow-y-auto">
      <div className="max-w-[1100px] mx-auto pt-16">
        
        <div className="flex justify-between items-center mb-12">
           <h1 className="text-[32px] font-bold tracking-tight text-[#1a1a1a]">
             Fast Forward
           </h1>
           <div className="text-4xl">🏎️</div>
        </div>

        <FastForwardContent
          initialNetWorth={totalNetWorth}
          totalAssets={totalAssets}
          totalDebts={totalDebts}
          investableAssets={investableAssets}
          baseCurrency={baseCurrency}
        />

        <div className="mt-16 text-[13px] text-gray-500 max-w-lg space-y-4">
           <p className="font-bold text-[#1a1a1a]">How it works</p>
           <p>Fast Forward simulates the growth of your "Investable Assets" (Stocks, Crypto, Metals, Cash) based on a custom growth rate, while adding your monthly "Net Flow" (Salary minus Expenses) to the total.</p>
           <p>This provides an adaptable projection that accounts for market conditions and your current lifestyle. Unlike traditional calculators, this is designed for the modern, fluctuating financial landscape.</p>
        </div>

      </div>
    </div>
  )
}
