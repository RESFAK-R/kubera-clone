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

  const latest = snapshots[snapshots.length - 1] ?? null
  const yesterday = snapshotByOffset(snapshots, 1)
  const weekAgo = snapshotByOffset(snapshots, 7)
  const yearAgo = snapshotByOffset(snapshots, 365)

  const dayDelta = computeDelta(totals.netWorth, yesterday?.net_worth)
  const dayAssetsDelta = computeDelta(totals.totalAssets, yesterday?.total_assets)
  const weekAssetsDelta = computeDelta(totals.totalAssets, weekAgo?.total_assets)
  const netWorthCagr = computeCagr(totals.netWorth, yearAgo?.net_worth ?? 0, 1)
  const investableCagr = computeCagr(totals.investable, yearAgo?.investable ?? 0, 1)

  const largestAsset = assets
    .filter((a) => !a.is_liability)
    .reduce<Asset | null>((prev, cur) => (!prev || cur.value > prev.value ? cur : prev), null)

  const sheetsMap: Record<string, number> = {}
  for (const a of assets) {
    if (a.is_liability) continue
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
    <div className="flex-1 w-full bg-[#f4f5f5] pb-24 px-8 md:px-16 relative">
      <div className="max-w-[1200px] mx-auto pt-4">
        <h1 className="text-[40px] font-medium text-[#1a1a1a] mb-12 tracking-tight">
          Namaste, {userName} <span className="text-[#3b82f6] text-[24px] align-top ml-[-4px]">#</span>
        </h1>

        <div className="grid grid-cols-12 gap-8 mb-8">
          <div className="col-span-8 bg-white border border-[#e5e7eb] rounded-[4px] p-10 min-h-[460px] flex flex-col justify-between shadow-sm relative overflow-hidden">
            <div>
              <h3 className="text-[15px] font-medium text-gray-500 mb-2">Net Worth</h3>
              <div className="text-[64px] font-medium tracking-tighter leading-tight flex items-baseline">
                <span className="text-[32px] font-bold mr-2 mt-[-10px]">{sym}</span>
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
              <div className="text-[48px] font-medium tracking-tighter leading-tight flex items-baseline">
                <span className="text-[24px] font-bold mr-2">{sym}</span>
                {totals.investable.toLocaleString('de-DE')}
              </div>
            </div>

            <div className="mt-12 grid grid-cols-2 gap-12 max-w-sm">
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

            <div className="mt-4 grid grid-cols-3 gap-8 max-w-md">
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

          <div className="col-span-4 flex flex-col gap-6">
            <div className="bg-white border border-[#e5e7eb] rounded-[4px] p-10 flex-1 shadow-sm">
              <h3 className="text-[15px] font-medium text-gray-500 mb-2">Assets</h3>
              <div className="text-[48px] font-medium tracking-tighter leading-tight flex items-baseline">
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

            <div className="bg-white border border-[#e5e7eb] rounded-[4px] p-10 flex-1 shadow-sm">
              <div className="flex items-center gap-1 mb-2">
                <h3 className="text-[15px] font-medium text-gray-500">Cash on hand</h3>
                <span className="text-gray-400 text-[14px] cursor-help">ⓘ</span>
              </div>
              <div className="text-[48px] font-medium tracking-tighter leading-tight">
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

      <button className="fixed bottom-8 right-8 w-14 h-14 bg-white shadow-xl border border-gray-200 rounded-full flex items-center justify-center text-[24px] font-medium text-gray-800 hover:scale-110 transition-transform active:scale-95 group overflow-hidden">
        <span className="relative z-10">?</span>
        <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
      </button>
    </div>
  )
}
