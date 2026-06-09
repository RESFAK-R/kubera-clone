import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { RecapCharts } from '@/components/dashboard/RecapCharts'
import { computeNetWorthTotals } from '@/lib/netWorth'
import { computeAssetReturns, enrich24hChange, computePortfolioReturn, topMovers, tickersToBenchmarks } from '@/lib/irr'
import type { Asset, TickerCache } from '@/types/db'

export default async function RecapPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [
    { data: profileData },
    { data: assetsRaw },
    { data: tickersRaw },
    { data: snapshotsRaw },
  ] = await Promise.all([
    supabase.from('profiles').select('base_currency').eq('id', user.id).single(),
    supabase.from('assets').select('*').eq('user_id', user.id),
    supabase.from('tickers_cache').select('*'),
    supabase
      .from('net_worth_snapshots')
      .select('snapshot_date,net_worth')
      .eq('user_id', user.id)
      .order('snapshot_date', { ascending: false })
      .limit(31),
  ])

  const assets = (assetsRaw ?? []) as Asset[]
  const tickers = (tickersRaw ?? []) as TickerCache[]
  const baseCurrency = profileData?.base_currency ?? 'EUR'

  const totals = computeNetWorthTotals(assets)

  // Asset-level returns
  const rawReturns = computeAssetReturns(assets)
  const assetReturns = enrich24hChange(rawReturns, tickers)

  // Portfolio-level return
  const portfolioReturn = computePortfolioReturn(assetReturns)

  // Top gainers / losers
  const { gainers, losers } = topMovers(assetReturns, 5)

  // Benchmarks from tickers_cache (SPX / BTC / AAPL / VT)
  const BENCHMARK_SYMBOLS = new Set(['SPX', 'BTC', 'AAPL', 'VT', 'DJI'])
  const benchmarkTickers = tickers.filter(
    (t) => BENCHMARK_SYMBOLS.has(t.symbol.toUpperCase()),
  )
  const benchmarks = tickersToBenchmarks(benchmarkTickers)

  // Asset class breakdown for charts
  const assetClassMap: Record<string, number> = {}
  for (const a of assets) {
    if (a.is_liability || a.asset_type === 'liability') continue
    const cls = a.asset_type ?? 'other'
    assetClassMap[cls] = (assetClassMap[cls] ?? 0) + Number(a.value)
  }
  const assetClassData = Object.entries(assetClassMap).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
    pct: totals.totalAssets > 0 ? ((value / totals.totalAssets) * 100).toFixed(1) : '0',
  }))

  // Sheet breakdown for charts
  const sheetMap: Record<string, number> = {}
  for (const a of assets) {
    if (a.is_liability || a.asset_type === 'liability') continue
    const sheet = a.sheet ?? 'Other'
    sheetMap[sheet] = (sheetMap[sheet] ?? 0) + Number(a.value)
  }
  const sheetData = Object.entries(sheetMap).map(([name, value]) => ({
    name,
    value,
    pct:
      totals.totalAssets > 0
        ? ((value / totals.totalAssets) * 100).toFixed(1)
        : '0',
  }))

  // 30d snapshot delta
  const sorted = (snapshotsRaw ?? []).slice().sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date))
  const snapshotDelta =
    sorted.length >= 2
      ? Number(sorted[sorted.length - 1].net_worth) - Number(sorted[0].net_worth)
      : null

  return (
    <div className="w-full min-w-0 overflow-x-hidden bg-[#f4f5f5] px-4 pb-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1180px] min-w-0 pt-8 lg:pt-12">
        <h1 className="text-[32px] font-bold tracking-tight text-[#1a1a1a] mb-8">Recap</h1>

        {/* Summary hero */}
        <div className="mb-10 grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-12 xl:gap-8">
          <div className="min-w-0 bg-white border border-[#e5e7eb] rounded-[4px] p-6 sm:p-8 lg:p-10 flex flex-col justify-between shadow-sm min-h-[360px] xl:col-span-8">
            <div>
              <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Net Worth</h3>
              <div className="break-words text-[40px] font-medium leading-tight tracking-tight sm:text-[50px] lg:text-[56px]">
                {new Intl.NumberFormat('de-DE', {
                  style: 'currency',
                  currency: baseCurrency,
                  maximumFractionDigits: 0,
                }).format(totals.netWorth)}
              </div>
              {snapshotDelta !== null && (
                <div
                  className={`mt-2 text-[15px] font-medium ${snapshotDelta >= 0 ? 'text-green-600' : 'text-red-500'}`}
                >
                  {snapshotDelta >= 0 ? '+' : ''}
                  {new Intl.NumberFormat('de-DE', {
                    style: 'currency',
                    currency: baseCurrency,
                    maximumFractionDigits: 0,
                  }).format(snapshotDelta)}{' '}
                  <span className="text-gray-400 text-[12px]">last 30 days</span>
                </div>
              )}
            </div>

            <div className="mt-10 grid grid-cols-1 gap-6 border-t border-gray-100 pt-8 sm:grid-cols-2 sm:gap-12 lg:pt-10">
              <div>
                <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                  Total Assets
                </h4>
                <div className="break-words text-[24px] font-medium tracking-tight sm:text-[28px]">
                  {new Intl.NumberFormat('de-DE', {
                    style: 'currency',
                    currency: baseCurrency,
                    maximumFractionDigits: 0,
                  }).format(totals.totalAssets)}
                </div>
              </div>
              <div>
                <h4 className="text-[11px] font-bold text-red-400 uppercase tracking-widest mb-1">
                  Total Debts
                </h4>
                <div className="break-words text-[24px] font-medium tracking-tight text-red-500 sm:text-[28px]">
                  {new Intl.NumberFormat('de-DE', {
                    style: 'currency',
                    currency: baseCurrency,
                    maximumFractionDigits: 0,
                  }).format(totals.totalDebts)}
                </div>
              </div>
            </div>
          </div>

          {/* Portfolio return summary */}
          <div className="min-w-0 bg-white border border-[#e5e7eb] rounded-[4px] p-6 sm:p-8 shadow-sm min-h-[320px] xl:min-h-[360px] xl:col-span-4 flex flex-col">
            <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-6">
              Portfolio Return
            </h3>
            {portfolioReturn.returnPct !== null ? (
              <>
                <div
                  className={`break-words text-[36px] font-medium leading-tight tracking-tight mb-1 sm:text-[42px] ${
                    portfolioReturn.returnAbs >= 0 ? 'text-green-600' : 'text-red-500'
                  }`}
                >
                  {portfolioReturn.returnPct >= 0 ? '+' : ''}
                  {portfolioReturn.returnPct.toFixed(1).replace('.', ',')}%
                </div>
                <div className="text-[13px] text-gray-400 mb-6">
                  {new Intl.NumberFormat('de-DE', {
                    style: 'currency',
                    currency: baseCurrency,
                    maximumFractionDigits: 0,
                  }).format(portfolioReturn.returnAbs)}{' '}
                  absolute return
                </div>
                <div className="text-[11px] text-gray-400 mb-4">
                  Based on cost basis for{' '}
                  {new Intl.NumberFormat('de-DE', {
                    style: 'currency',
                    currency: baseCurrency,
                    maximumFractionDigits: 0,
                  }).format(portfolioReturn.coveredValue)}{' '}
                  of assets
                </div>
              </>
            ) : (
              <div className="text-[14px] text-gray-400 flex-1 flex items-center">
                Add cost basis to assets to see portfolio return
              </div>
            )}
            <div className="border-t border-gray-100 pt-4 mt-auto">
              <div className="text-[11px] text-gray-400 uppercase tracking-widest mb-2">
                Total Cost Basis
              </div>
              <div className="text-[18px] font-medium">
                {new Intl.NumberFormat('de-DE', {
                  style: 'currency',
                  currency: baseCurrency,
                  maximumFractionDigits: 0,
                }).format(portfolioReturn.totalCost)}
              </div>
            </div>
          </div>
        </div>

        {/* Charts (pies + top gainers/losers + benchmarks) */}
        <RecapCharts
          assetClassData={assetClassData}
          sheetData={sheetData}
          assetReturns={assetReturns}
          gainers={gainers}
          losers={losers}
          benchmarks={benchmarks}
          baseCurrency={baseCurrency}
        />

        {/* Ghost footer */}
        <div className="flex flex-col items-center justify-center py-24 border-t border-gray-200 mt-12 opacity-40">
          <div className="w-12 h-12 bg-black rounded-t-[100px] relative mb-6">
            <div className="absolute top-4 left-2 w-2 h-2 bg-white rounded-full" />
            <div className="absolute top-4 right-2 w-2 h-2 bg-white rounded-full" />
            <div className="absolute -bottom-1 w-full flex justify-between">
              <div className="w-2 h-2 bg-[#f4f5f5] rounded-full" />
              <div className="w-2 h-2 bg-[#f4f5f5] rounded-full" />
              <div className="w-2 h-2 bg-[#f4f5f5] rounded-full" />
            </div>
          </div>
          <p className="text-[14px] text-center max-w-sm font-medium">
            Keep adding assets and cost basis for a better Recap experience.
          </p>
        </div>
      </div>
    </div>
  )
}
