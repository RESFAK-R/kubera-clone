import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AssetSpreadsheet } from '@/components/dashboard/AssetSpreadsheet'
import { computeDelta, snapshotByOffset } from '@/lib/netWorth'
import { formatSignedCurrency } from '@/lib/currency'
import type { Asset, NetWorthSnapshot } from '@/types/db'

export default async function AssetsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const [{ data: profile }, { data: allAssets }, { data: snapshotsRaw }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase
      .from('assets')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('net_worth_snapshots')
      .select('*')
      .eq('user_id', user.id)
      .order('snapshot_date', { ascending: false })
      .limit(40),
  ])

  // We are only handling assets (not liabilities) on this page
  const assets = ((allAssets ?? []) as Asset[]).filter(
    (a) => !a.is_liability && a.asset_type !== 'liability' && a.sheet !== 'Debts',
  )
  const snapshots = ((snapshotsRaw ?? []) as NetWorthSnapshot[]).slice().reverse()
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

  const yesterday = snapshotByOffset(snapshots, 1)
  const dayDelta = computeDelta(totalAssets, yesterday?.total_assets)

  return (
    <div className="w-full min-w-0 overflow-x-hidden bg-[#f4f5f5] px-4 pb-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[980px] min-w-0 pt-8">

        {/* Header */}
        <div className="mb-6">
          {assets.length === 0 ? (
            <h1 className="text-[30px] font-bold tracking-tight text-[#1a1a1a] leading-tight mb-2 whitespace-pre-line sm:text-[32px]">
              {'All your assets\nin one place!'}
            </h1>
          ) : (
            <>
              <div className="flex min-w-0 flex-wrap items-baseline gap-1">
                <span className="text-[15px] font-bold text-[#1a1a1a]">{sym}</span>
                <span className="text-[38px] font-bold tracking-tight text-[#1a1a1a] leading-none sm:text-[46px]">
                  {Math.round(totalAssets).toLocaleString('de-DE')}
                </span>
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-[12px] font-bold text-gray-400 uppercase tracking-widest">1 Day</span>
                <span
                  className={`text-[12px] font-bold ${dayDelta && dayDelta.absolute !== 0 ? (dayDelta.absolute > 0 ? 'text-green-600' : 'text-red-600') : 'text-gray-300'}`}
                >
                  {dayDelta ? formatSignedCurrency(dayDelta.absolute, baseCurrency) : `${sym}0`}
                </span>
              </div>
            </>
          )}
        </div>

        <div className="mb-16 min-w-0">
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
