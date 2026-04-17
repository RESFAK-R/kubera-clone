import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AssetSpreadsheet } from '@/components/dashboard/AssetSpreadsheet'

export default async function AssetsPage() {
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

  const { data: allAssets } = await supabase
    .from('assets')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  // We are only handling assets (not liabilities) on this page
  const assets = allAssets?.filter(a => a.sheet !== 'Debts') || []
  const baseCurrency = profile?.base_currency || 'EUR'

  // Get unique sheets for tabs
  const uniqueSheets = Array.from(new Set(assets.map(a => a.sheet || 'Others')))
  const tabs = uniqueSheets.map(s => ({ id: s, label: s }))

  // Default sheets if none exist
  if (tabs.length === 0) {
    tabs.push({ id: 'Investments', label: 'Investments' })
    tabs.push({ id: 'Real Estate', label: 'Real Estate' })
    tabs.push({ id: 'Cash & Cards', label: 'Cash & Cards' })
    tabs.push({ id: 'Others', label: 'Others' })
  }

  const totalAssets = assets.reduce((s, a) => s + Number(a.value), 0)
  const sym = baseCurrency === 'EUR' ? '€' : '$'

  return (
    <div className="flex-1 w-full bg-[#f4f5f5] pb-24 px-8 md:px-16 overflow-y-auto">
      <div className="max-w-[900px] mx-auto pt-10">

        {/* Header */}
        <div className="mb-6">
          {assets.length === 0 ? (
            <h1 className="text-[32px] font-bold tracking-tight text-[#1a1a1a] leading-tight mb-2 whitespace-pre-line">
              {'All your assets\nin one place!'}
            </h1>
          ) : (
            <>
              <div className="flex items-baseline gap-1">
                <span className="text-[15px] font-bold text-[#1a1a1a]">{sym}</span>
                <span className="text-[46px] font-bold tracking-tight text-[#1a1a1a] leading-none">
                  {Math.round(totalAssets).toLocaleString('de-DE')}
                </span>
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-[12px] font-bold text-gray-400 uppercase tracking-widest">1 Day</span>
                <span className="text-[12px] font-bold text-gray-300">{sym}0</span>
              </div>
            </>
          )}
        </div>

        <div className="mb-16">
          <AssetSpreadsheet
            assets={assets}
            baseCurrency={baseCurrency}
            tabs={tabs}
          />
        </div>

      </div>
    </div>
  )
}
