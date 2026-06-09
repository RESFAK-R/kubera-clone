import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { NetWorthCharts } from '@/components/dashboard/NetWorthCharts'
import { NetWorthChart } from '@/components/dashboard/NetWorthChart'
import { computeNetWorthTotals, computeDelta, snapshotByOffset, computeCagr, snapshotsToChart } from '@/lib/netWorth'
import { formatCurrency, formatSignedCurrency, formatSignedPct, currencySymbol } from '@/lib/currency'
import type { Asset, NetWorthSnapshot, TickerCache } from '@/types/db'

const BENCHMARK_SYMBOLS: { label: string; kind: 'index' | 'crypto' | 'stock'; symbol: string }[] = [
  { label: 'S&P 500', kind: 'index', symbol: 'SPX' },
  { label: 'BTC', kind: 'crypto', symbol: 'BTC' },
  { label: 'AAPL', kind: 'stock', symbol: 'AAPL' },
]

export default async function NetWorthPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [{ data: profile }, { data: assetsData }, { data: snapshotsData }, { data: benchmarksData }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('assets').select('*').eq('user_id', user.id),
    supabase
      .from('net_worth_snapshots')
      .select('*')
      .eq('user_id', user.id)
      .order('snapshot_date', { ascending: true }),
    supabase.from('tickers_cache').select('*').in('symbol', BENCHMARK_SYMBOLS.map((b) => b.symbol)),
  ])

  const assets = (assetsData ?? []) as Asset[]
  const snapshots = (snapshotsData ?? []) as NetWorthSnapshot[]
  const benchmarks = (benchmarksData ?? []) as TickerCache[]
  const baseCurrency = profile?.base_currency ?? 'EUR'
  const userName = profile?.full_name || user.email?.split('@')[0] || 'there'

  const totals = computeNetWorthTotals(assets)
  const sym = currencySymbol(baseCurrency)

  const yesterday = snapshotByOffset(snapshots, 1)
  const weekAgo = snapshotByOffset(snapshots, 7)
  const yearAgo = snapshotByOffset(snapshots, 365)

  const dayDelta = computeDelta(totals.netWorth, yesterday?.net_worth)
  const dayAssetsDelta = computeDelta(totals.totalAssets, yesterday?.total_assets)
  const weekAssetsDelta = computeDelta(totals.totalAssets, weekAgo?.total_assets)
  const netWorthCagr = computeCagr(totals.netWorth, yearAgo?.net_worth ?? 0, 1)
  const investableCagr = computeCagr(totals.investable, yearAgo?.investable ?? 0, 1)

  const largestAsset = assets
    .filter((a) => !a.is_liability && a.asset_type !== 'liability')
    .reduce<Asset | null>((prev, cur) => (!prev || cur.value > prev.value ? cur : prev), null)

  const sheetsMap: Record<string, number> = {}
  for (const a of assets) {
    if (a.is_liability || a.asset_type === 'liability') continue
    const s = a.sheet || 'Others'
    sheetsMap[s] = (sheetsMap[s] || 0) + Number(a.value)
  }
  const assetsXSheetsData = Object.entries(sheetsMap).map(([name, value]) => ({ name, value }))

  const chartData = snapshotsToChart(snapshots, 'net_worth')

  const benchmarkByLabel = new Map<string, TickerCache>(
    BENCHMARK_SYMBOLS.map((b) => [b.label, benchmarks.find((x) => x.symbol === b.symbol)!]).filter(
      ([, v]) => v,
    ) as [string, TickerCache][],
  )

  return (
    <div className="w-full min-w-0 overflow-x-hidden bg-[#f4f5f5] px-4 pb-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1180px] min-w-0 pt-4 sm:pt-8">
        <h1 className="mb-8 break-words text-[32px] font-medium leading-tight tracking-tight text-[#1a1a1a] sm:text-[40px] lg:mb-10 lg:text-[48px]">
          Namaste, {userName} <span className="text-[#3b82f6] text-[24px] align-top ml-[-4px]">#</span>
        </h1>

        <div className="mb-8 grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-12 xl:gap-8">
          <div className="min-w-0 bg-white border border-[#e5e7eb] rounded-[4px] p-6 sm:p-8 lg:p-10 min-h-[420px] xl:min-h-[460px] flex flex-col justify-between shadow-sm relative overflow-hidden xl:col-span-8">
            <div>
              <h3 className="text-[15px] font-medium text-gray-500 mb-2">Net Worth</h3>
              <div className="flex min-w-0 flex-wrap items-baseline text-[48px] font-medium leading-tight tracking-tight sm:text-[58px] lg:text-[64px]">
                <span className="mr-2 text-[26px] font-bold sm:text-[32px]">{sym}</span>
                {totals.netWorth.toLocaleString('de-DE')}
              </div>
              {dayDelta && (
                <div className={`mt-2 text-[14px] font-semibold ${dayDelta.absolute >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatSignedCurrency(dayDelta.absolute, baseCurrency)} ({formatSignedPct(dayDelta.pct)})
                  <span className="text-gray-400 font-normal ml-2">1 Day</span>
                </div>
              )}
            </div>

            <div className="mt-12">
              <div className="flex items-center gap-1 mb-2">
                <h3 className="text-[15px] font-medium text-gray-500">Investable</h3>
                <span className="text-gray-400 text-[14px] cursor-help" title="Stocks + Crypto + Metals">ⓘ</span>
              </div>
              <div className="flex min-w-0 flex-wrap items-baseline text-[38px] font-medium leading-tight tracking-tight sm:text-[48px]">
                <span className="text-[24px] font-bold mr-2">{sym}</span>
                {totals.investable.toLocaleString('de-DE')}
              </div>
            </div>

            <div className="mt-12 grid max-w-sm grid-cols-1 gap-6 sm:grid-cols-2 sm:gap-12">
              <div>
                <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                  CAGR{' '}
                  {!netWorthCagr && (
                    <span className="text-[10px] font-normal lowercase">(shows after 1y of history)</span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase mb-1">NET WORTH</div>
                    <div className={`text-[18px] font-bold ${netWorthCagr == null ? 'text-gray-300' : netWorthCagr >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {netWorthCagr == null ? '—' : formatSignedPct(netWorthCagr)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase mb-1">INVESTABLE</div>
                    <div className={`text-[18px] font-bold ${investableCagr == null ? 'text-gray-300' : investableCagr >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {investableCagr == null ? '—' : formatSignedPct(investableCagr)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 grid max-w-md grid-cols-3 gap-4 sm:gap-8">
              {BENCHMARK_SYMBOLS.map(({ label }) => {
                const b = benchmarkByLabel.get(label)
                const pct = b?.change_pct_24h ?? null
                return (
                  <div key={label}>
                    <div className="text-[10px] font-bold text-gray-400 uppercase mb-1">{label}</div>
                    <div className={`text-[18px] font-bold ${pct == null ? 'text-gray-300' : pct >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {pct == null ? '—' : formatSignedPct(pct)}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="min-w-0 flex flex-col gap-6 xl:col-span-4">
            <div className="min-w-0 overflow-x-hidden bg-white border border-[#e5e7eb] rounded-[4px] p-6 sm:p-8 lg:p-10 shadow-sm xl:min-h-[230px]">
              <h3 className="text-[15px] font-medium text-gray-500 mb-2">Assets</h3>
              <div className="flex min-w-0 flex-wrap items-baseline text-[38px] font-medium leading-tight tracking-tight sm:text-[44px] xl:text-[48px]">
                <span className="text-[24px] font-bold mr-2">{sym}</span>
                {totals.totalAssets.toLocaleString('de-DE')}
              </div>
              <div className="mt-6">
                <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">1 DAY</div>
                <div className={`text-[24px] font-medium ${dayAssetsDelta && dayAssetsDelta.absolute !== 0 ? (dayAssetsDelta.absolute > 0 ? 'text-green-600' : 'text-red-600') : ''}`}>
                  {dayAssetsDelta ? formatSignedCurrency(dayAssetsDelta.absolute, baseCurrency) : `${sym}0`}
                </div>
              </div>
              <div className="mt-4">
                <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">1 WEEK</div>
                <div className={`text-[18px] font-bold ${weekAssetsDelta ? (weekAssetsDelta.absolute >= 0 ? 'text-green-600' : 'text-red-600') : 'text-gray-300'}`}>
                  {weekAssetsDelta
                    ? `${formatSignedCurrency(weekAssetsDelta.absolute, baseCurrency)} (${formatSignedPct(weekAssetsDelta.pct)})`
                    : '—'}
                </div>
              </div>
            </div>

            <div className="min-w-0 overflow-x-hidden bg-white border border-[#e5e7eb] rounded-[4px] p-6 sm:p-8 lg:p-10 shadow-sm xl:min-h-[230px]">
              <div className="flex items-center gap-1 mb-2">
                <h3 className="text-[15px] font-medium text-gray-500">Cash on hand</h3>
                <span className="text-gray-400 text-[14px] cursor-help">ⓘ</span>
              </div>
              <div className="break-words text-[38px] font-medium leading-tight tracking-tight sm:text-[44px] xl:text-[48px]">
                {totals.cash === 0 ? 'Zero' : formatCurrency(totals.cash, baseCurrency)}
              </div>
            </div>
          </div>
        </div>

        <NetWorthChart data={chartData} currency={baseCurrency} />

        <NetWorthCharts
          totalAssets={totals.totalAssets}
          totalNetWorth={totals.netWorth}
          investableAssets={totals.investable}
          stockAssets={totals.stocks}
          cryptoAssets={totals.crypto}
          metalAssets={totals.metals}
          largestAsset={largestAsset}
          assetsXSheetsData={assetsXSheetsData}
          baseCurrency={baseCurrency}
        />
      </div>

      <button className="fixed bottom-6 right-6 w-14 h-14 bg-white shadow-xl border border-gray-200 rounded-full flex items-center justify-center text-[24px] font-medium text-gray-800 hover:scale-110 transition-transform active:scale-95 group overflow-hidden lg:bottom-8 lg:right-8">
        <span className="relative z-10">?</span>
        <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
      </button>
    </div>
  )
}
