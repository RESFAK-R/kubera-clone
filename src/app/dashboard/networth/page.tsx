import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AddAssetDialog } from '@/components/dashboard/AddAssetDialog'
import Link from 'next/link'
import { NetWorthCharts } from '@/components/dashboard/NetWorthCharts'

export default async function NetWorthPage() {
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
  const userName = profile?.full_name || user!.email?.split('@')[0] || 'there'

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

  // Kubera sometimes shows investable/cash separately, we'll rough estimate it based on types
  const cashAssets = assets?.filter(a => a.asset_type === 'cash').reduce((acc, a) => acc + Number(a.value), 0) || 0
  const stockAssets = assets?.filter(a => a.asset_type === 'stock').reduce((acc, a) => acc + Number(a.value), 0) || 0
  const cryptoAssets = assets?.filter(a => a.asset_type === 'crypto').reduce((acc, a) => acc + Number(a.value), 0) || 0
  const metalAssets = assets?.filter(a => a.asset_type === 'metal').reduce((acc, a) => acc + Number(a.value), 0) || 0
  const investableAssets = stockAssets + cryptoAssets + metalAssets

  const totalNetWorth = totalAssets - totalDebts

  // Top Holding for Horizontal Bar
  const largestAsset = assets?.reduce((prev, current) => (Number(prev?.value || 0) > Number(current?.value || 0)) ? prev : current, assets?.[0])
  const largestAssetVal = Number(largestAsset?.value || 0)
  const largestAssetPct = totalAssets > 0 ? (largestAssetVal / totalAssets * 100) : 0

  // Chart Data: Investable Assets vs Net Worth
  const investableVsNetWorthData = [
    { name: 'Investable', value: investableAssets },
    { name: 'Remaining', value: Math.max(0, totalNetWorth - investableAssets) }
  ]

  // Chart Data: Investable ex Cash
  const investableExCashData = [
    { name: 'Stocks', value: stockAssets, color: '#4f46e5' },
    { name: 'Crypto', value: cryptoAssets, color: '#8b5cf6' },
    { name: 'Metals', value: metalAssets, color: '#d946ef' }
  ].filter(d => d.value > 0)

  // Chart Data: Assets x Sheets
  const sheetsMap: Record<string, number> = {}
  assets?.forEach(a => {
    const sheet = a.sheet || 'Others'
    sheetsMap[sheet] = (sheetsMap[sheet] || 0) + Number(a.value)
  })
  const assetsXSheetsData = Object.entries(sheetsMap).map(([name, value]) => ({ name, value }))

  const formatCurrency = (val: number) => {
    if (val === 0) return baseCurrency === 'EUR' ? '€0' : '$0'
    return new Intl.NumberFormat('de-DE', { 
      style: 'currency', 
      currency: baseCurrency,
      maximumFractionDigits: 0
    }).format(val)
  }

  return (
    <div className="flex-1 w-full bg-[#f4f5f5] pb-24 px-8 md:px-16 relative">
      
      <div className="max-w-[1200px] mx-auto pt-4">
        {/* Title */}
        <h1 className="text-[40px] font-medium text-[#1a1a1a] mb-12 tracking-tight">
          Namaste, {userName} <span className="text-[#3b82f6] text-[24px] align-top ml-[-4px]">#</span>
        </h1>

        <div className="grid grid-cols-12 gap-8 mb-8">
          {/* Main Stats Left (8 cols) */}
          <div className="col-span-8 bg-white border border-[#e5e7eb] rounded-[4px] p-10 min-h-[460px] flex flex-col justify-between shadow-sm relative overflow-hidden">
            <div>
              <h3 className="text-[15px] font-medium text-gray-500 mb-2">Net Worth</h3>
              <div className="text-[64px] font-medium tracking-tighter leading-tight flex items-baseline">
                <span className="text-[32px] font-bold mr-2 mt-[-10px]">€</span>
                {totalNetWorth.toLocaleString('de-DE')}
              </div>
            </div>

            <div className="mt-12">
              <div className="flex items-center gap-1 mb-2">
                 <h3 className="text-[15px] font-medium text-gray-500">Investable</h3>
                 <span className="text-gray-400 text-[14px] cursor-help">ⓘ</span>
              </div>
              <div className="text-[48px] font-medium tracking-tighter leading-tight flex items-baseline">
                <span className="text-[24px] font-bold mr-2">€</span>
                {investableAssets.toLocaleString('de-DE')}
              </div>
            </div>

            <div className="mt-12 grid grid-cols-2 gap-12 max-w-sm">
               <div>
                  <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">CAGR <span className="text-[10px] font-normal lowercase">(Will show after a month)</span></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-[10px] font-bold text-gray-400 uppercase mb-1">NET WORTH</div>
                      <div className="text-[18px] font-bold text-gray-300">+XX%</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-gray-400 uppercase mb-1">INVESTABLE</div>
                      <div className="text-[18px] font-bold text-gray-300">+XX%</div>
                    </div>
                  </div>
               </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-8 max-w-xs opacity-40">
               <div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase mb-1">S&P 500</div>
                  <div className="text-[18px] font-bold text-gray-300">+XX%</div>
               </div>
               <div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase mb-1">DOW JONES</div>
                  <div className="text-[18px] font-bold text-gray-300">+XX%</div>
               </div>
            </div>
          </div>

          {/* Side Stats Right (4 cols) */}
          <div className="col-span-4 flex flex-col gap-6">
            <div className="bg-white border border-[#e5e7eb] rounded-[4px] p-10 flex-1 shadow-sm">
                <h3 className="text-[15px] font-medium text-gray-500 mb-2">Assets</h3>
                <div className="text-[48px] font-medium tracking-tighter leading-tight flex items-baseline">
                  <span className="text-[24px] font-bold mr-2">€</span>
                  {totalAssets.toLocaleString('de-DE')}
                </div>
                <div className="mt-6">
                  <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">1 DAY</div>
                  <div className="text-[24px] font-medium">€0</div>
                </div>
                <div className="mt-4">
                  <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1 text-gray-300">1 WEEK</div>
                  <div className="text-[18px] font-bold text-gray-300">+€XXXX (XX%)</div>
                </div>
            </div>

            <div className="bg-white border border-[#e5e7eb] rounded-[4px] p-10 flex-1 shadow-sm">
                <div className="flex items-center gap-1 mb-2">
                  <h3 className="text-[15px] font-medium text-gray-500">Cash on hand</h3>
                  <span className="text-gray-400 text-[14px] cursor-help">ⓘ</span>
                </div>
                <div className="text-[48px] font-medium tracking-tighter leading-tight">
                  {cashAssets === 0 ? "Zero" : `€ ${cashAssets.toLocaleString('de-DE')}`}
                </div>
            </div>
          </div>
        </div>

        {/* Large Chart Section */}
        <div className="bg-white border border-[#e5e7eb] rounded-[4px] min-h-[500px] shadow-sm relative overflow-hidden flex flex-col pt-10 px-10 mb-8">
          <h2 className="text-[32px] font-bold text-[#1a1a1a]/15 absolute top-10 left-10 select-none">Net Worth</h2>
          
          <div className="flex-1 flex items-center justify-center relative">
            {/* The Floating Pill */}
            <div className="z-10 bg-white shadow-lg border border-gray-100 px-8 py-5 rounded-full flex items-center gap-4 animate-in fade-in zoom-in duration-700">
               <span className="text-[18px] font-medium text-[#1a1a1a]">The Net Worth chart will be ready after a week</span>
            </div>

            {/* Custom Purple Chart Wave */}
            <div className="absolute inset-0 top-auto h-[320px] pointer-events-none overflow-hidden">
               <svg viewBox="0 0 1000 300" preserveAspectRatio="none" className="w-full h-full">
                 <path 
                    d="M0,250 C150,220 250,280 400,240 C550,200 650,260 800,220 C950,180 1000,210 1000,210 L1000,300 L0,300 Z" 
                    fill="#d8b4fe" 
                    className="opacity-60"
                 />
                 <path 
                    d="M0,250 C150,220 250,280 400,240 C550,200 650,260 800,220 C950,180 1000,210 1000,210" 
                    fill="none" 
                    stroke="#a855f7" 
                    strokeWidth="4"
                    className="opacity-40"
                 />
               </svg>
            </div>
            {/* Bottom Gradient Fade */}
            <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white to-transparent"></div>
          </div>
        </div>

        {/* Charts & Allocation Section */}
        <NetWorthCharts 
          totalAssets={totalAssets}
          totalNetWorth={totalNetWorth}
          investableAssets={investableAssets}
          stockAssets={stockAssets}
          cryptoAssets={cryptoAssets}
          metalAssets={metalAssets}
          largestAsset={largestAsset}
          assetsXSheetsData={assetsXSheetsData}
          baseCurrency={baseCurrency}
        />
      </div>

      {/* Floating Action Button */}
      <button className="fixed bottom-8 right-8 w-14 h-14 bg-white shadow-xl border border-gray-200 rounded-full flex items-center justify-center text-[24px] font-medium text-gray-800 hover:scale-110 transition-transform active:scale-95 group overflow-hidden">
        <span className="relative z-10">?</span>
        <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
      </button>

    </div>
  )
}
