import type { Asset, NetWorthSnapshot } from '@/types/db'

export interface NetWorthTotals {
  totalAssets: number
  totalDebts: number
  netWorth: number
  cash: number
  investable: number
  realEstate: number
  stocks: number
  crypto: number
  metals: number
}

export function computeNetWorthTotals(assets: Asset[]): NetWorthTotals {
  let totalAssets = 0
  let totalDebts = 0
  let cash = 0
  let stocks = 0
  let crypto = 0
  let metals = 0
  let realEstate = 0

  for (const a of assets) {
    const v = Number(a.value)
    if (a.is_liability || a.asset_type === 'liability') {
      totalDebts += v
      continue
    }
    totalAssets += v
    switch (a.asset_type) {
      case 'cash':
        cash += v
        break
      case 'stock':
        stocks += v
        break
      case 'crypto':
        crypto += v
        break
      case 'metal':
        metals += v
        break
      case 'real_estate':
        realEstate += v
        break
    }
  }

  return {
    totalAssets,
    totalDebts,
    netWorth: totalAssets - totalDebts,
    cash,
    investable: stocks + crypto + metals,
    realEstate,
    stocks,
    crypto,
    metals,
  }
}

export interface NetWorthDelta {
  absolute: number
  pct: number
}

export function computeDelta(
  current: number,
  previous: number | null | undefined,
): NetWorthDelta | null {
  if (previous == null || previous === 0) return null
  return {
    absolute: current - previous,
    pct: ((current - previous) / previous) * 100,
  }
}

export function snapshotByOffset(
  snapshots: NetWorthSnapshot[],
  daysAgo: number,
): NetWorthSnapshot | null {
  if (snapshots.length === 0) return null
  const target = new Date()
  target.setDate(target.getDate() - daysAgo)
  const targetStr = target.toISOString().split('T')[0]
  let best: NetWorthSnapshot | null = null
  let bestGap = Infinity
  for (const s of snapshots) {
    const gap = Math.abs(
      new Date(s.snapshot_date).getTime() - new Date(targetStr).getTime(),
    )
    if (gap < bestGap) {
      bestGap = gap
      best = s
    }
  }
  return best
}

export function computeCagr(
  current: number,
  starting: number,
  years: number,
): number | null {
  if (!starting || starting <= 0 || years <= 0) return null
  return (Math.pow(current / starting, 1 / years) - 1) * 100
}

export interface ChartPoint {
  date: string
  value: number
}

export function snapshotsToChart(
  snapshots: NetWorthSnapshot[],
  field: keyof Pick<
    NetWorthSnapshot,
    'net_worth' | 'total_assets' | 'total_debts' | 'cash' | 'investable' | 'real_estate'
  > = 'net_worth',
): ChartPoint[] {
  return snapshots
    .slice()
    .sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date))
    .map((s) => ({ date: s.snapshot_date, value: Number(s[field]) }))
}
