import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { RecapCharts } from '@/components/dashboard/RecapCharts'

export default async function RecapPage() {
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

  assets?.forEach(asset => {
    const val = Number(asset.value)
    if (asset.asset_type === 'liability') {
      totalDebts += val
    } else {
      totalAssets += val
    }
  })

  const totalNetWorth = totalAssets - totalDebts

  // Top Holding for Horizontal Bar
  const largestAsset = assets?.reduce((prev, current) => (Number(prev?.value || 0) > Number(current?.value || 0)) ? prev : current, assets?.[0])

  // Asset Class Data
  const assetClassMap: Record<string, number> = {}
  assets?.forEach(a => {
    const cls = a.asset_type === 'liability' ? 'Debt' : a.asset_type
    assetClassMap[cls] = (assetClassMap[cls] || 0) + Number(a.value)
  })
  const assetClassData = Object.entries(assetClassMap).map(([name, value]) => ({ 
    name: name.charAt(0).toUpperCase() + name.slice(1), 
    value,
    pct: totalAssets > 0 ? (value / totalAssets * 100).toFixed(1) : 0
  }))

  // Sheet Data
  const sheetMap: Record<string, number> = {}
  assets?.forEach(a => {
    const sheet = a.sheet || 'Others'
    sheetMap[sheet] = (sheetMap[sheet] || 0) + Number(a.value)
  })
  const sheetData = Object.entries(sheetMap).map(([name, value]) => ({ 
    name, 
    value,
    pct: totalAssets > 0 ? (value / (totalAssets + totalDebts) * 100).toFixed(1) : 0
  }))

  // Top 5 Assets
  const topAssets = assets
    ?.filter(a => a.asset_type !== 'liability')
    ?.sort((a, b) => Number(b.value) - Number(a.value))
    ?.slice(0, 5) || []

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('de-DE', { 
      style: 'currency', 
      currency: baseCurrency,
      maximumFractionDigits: 0
    }).format(val)
  }

  return (
    <div className="flex-1 w-full bg-[#f4f5f5] pb-24 px-8 md:px-16 overflow-y-auto">
      <div className="max-w-[1200px] mx-auto pt-16">
        
        <h1 className="text-[32px] font-bold tracking-tight text-[#1a1a1a] mb-8">
          Recap
        </h1>

        <div className="grid grid-cols-12 gap-8 mb-12">
           {/* Summary Stats Vitals Card */}
           <div className="col-span-12 md:col-span-8 bg-white border border-[#e5e7eb] rounded-[4px] p-10 flex flex-col justify-between shadow-sm relative overflow-hidden h-[400px]">
              <div>
                 <h3 className="text-[17px] font-bold text-[#1a1a1a] mb-2 uppercase tracking-wider text-gray-400">Net Worth</h3>
                 <div className="text-[56px] font-medium tracking-tighter leading-tight flex items-baseline">
                    <span className="text-[28px] font-bold mr-2">€</span>
                    {totalNetWorth.toLocaleString('de-DE')}
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-12 border-t border-gray-100 pt-10 mt-10">
                 <div>
                    <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Assets</h4>
                    <div className="text-[28px] font-medium tracking-tight">€{totalAssets.toLocaleString('de-DE')}</div>
                 </div>
                 <div>
                    <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1 text-red-400/60">Total Debts</h4>
                    <div className="text-[28px] font-medium tracking-tight text-red-500/80">€{totalDebts.toLocaleString('de-DE')}</div>
                 </div>
              </div>
           </div>

           {/* Top Assets Card */}
           <div className="col-span-12 md:col-span-4 bg-white border border-[#e5e7eb] rounded-[4px] p-8 shadow-sm h-[400px] flex flex-col">
              <h3 className="text-[17px] font-bold text-[#1a1a1a] mb-6">Top Assets</h3>
              <div className="flex-1 space-y-4">
                 {topAssets.map(asset => (
                    <div key={asset.id} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors cursor-pointer px-1 rounded-sm">
                       <div className="flex flex-col">
                          <span className="text-[14px] font-bold text-[#1a1a1a] leading-tight">{asset.name}</span>
                          <span className="text-[12px] text-gray-400 uppercase font-medium">{asset.asset_type}</span>
                       </div>
                       <div className="text-[14px] font-bold text-[#1a1a1a]">
                          {formatCurrency(Number(asset.value))}
                       </div>
                    </div>
                 ))}
                 {topAssets.length === 0 && (
                     <div className="h-full flex items-center justify-center text-gray-300 italic text-[14px]">
                         No assets added yet
                     </div>
                 )}
              </div>
           </div>
        </div>

        {/* Charts Section */}
        <RecapCharts 
          assetClassData={assetClassData}
          sheetData={sheetData}
          baseCurrency={baseCurrency}
        />

        {/* Ghost Footer Message - Signature Kubera element */}
        <div className="flex flex-col items-center justify-center py-24 border-t border-gray-200 mt-12 opacity-40">
           <div className="w-12 h-12 bg-black rounded-t-[100px] relative mb-6">
              <div className="absolute top-4 left-2 w-2 h-2 bg-white rounded-full"></div>
              <div className="absolute top-4 right-2 w-2 h-2 bg-white rounded-full"></div>
              <div className="absolute -bottom-1 w-full flex justify-between">
                <div className="w-2 h-2 bg-[#f4f5f5] rounded-full"></div>
                <div className="w-2 h-2 bg-[#f4f5f5] rounded-full"></div>
                <div className="w-2 h-2 bg-[#f4f5f5] rounded-full"></div>
              </div>
           </div>
           <p className="text-[14px] text-center max-w-sm font-medium">
             Keep adding assets manually and keep linking your accounts for a better Recap experience.
           </p>
        </div>

      </div>
    </div>
  )
}
