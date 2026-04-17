import type { Asset, TickerCache } from '@/types/db'

export interface AssetReturn {
  id: string
  name: string
  assetType: string
  ticker: string | null
  value: number
  costBasis: number | null
  returnAbs: number | null
  returnPct: number | null
  change24hPct: number | null
}

export interface BenchmarkReturn {
  symbol: string
  kind: string
  name: string | null
  price: number
  currency: string
  changePct24h: number | null
}

export function computeAssetReturns(assets: Asset[]): AssetReturn[] {
  return assets
    .filter((a) => !a.is_liability && a.asset_type !== 'liability')
    .map((a) => {
      const value = Number(a.value)
      const costBasis = a.cost_basis != null ? Number(a.cost_basis) : null
      const returnAbs = costBasis != null ? value - costBasis : null
      const returnPct =
        costBasis != null && costBasis !== 0 ? ((value - costBasis) / costBasis) * 100 : null
      return {
        id: a.id,
        name: a.name,
        assetType: a.asset_type,
        ticker: a.ticker,
        value,
        costBasis,
        returnAbs,
        returnPct,
        change24hPct: null,
      }
    })
}

export function enrich24hChange(
  returns: AssetReturn[],
  tickers: TickerCache[],
): AssetReturn[] {
  const bySymbol = new Map<string, TickerCache>()
  for (const t of tickers) bySymbol.set(`${t.kind}:${t.symbol.toUpperCase()}`, t)
  return returns.map((r) => {
    if (!r.ticker) return r
    const key =
      r.assetType === 'crypto'
        ? `crypto:${r.ticker.toUpperCase()}`
        : `stock:${r.ticker.toUpperCase()}`
    const row = bySymbol.get(key)
    if (!row || row.change_pct_24h == null) return r
    return { ...r, change24hPct: Number(row.change_pct_24h) }
  })
}

export function computePortfolioReturn(assetReturns: AssetReturn[]): {
  totalValue: number
  totalCost: number
  coveredValue: number
  returnAbs: number
  returnPct: number | null
} {
  let totalValue = 0
  let totalCost = 0
  let coveredValue = 0
  for (const r of assetReturns) {
    totalValue += r.value
    if (r.costBasis != null) {
      totalCost += r.costBasis
      coveredValue += r.value
    }
  }
  const returnAbs = coveredValue - totalCost
  const returnPct = totalCost > 0 ? (returnAbs / totalCost) * 100 : null
  return { totalValue, totalCost, coveredValue, returnAbs, returnPct }
}

export function topMovers(
  assetReturns: AssetReturn[],
  limit = 5,
): { gainers: AssetReturn[]; losers: AssetReturn[] } {
  const withReturns = assetReturns.filter((r) => r.returnPct != null)
  const sorted = [...withReturns].sort((a, b) => (b.returnPct ?? 0) - (a.returnPct ?? 0))
  return {
    gainers: sorted.slice(0, limit).filter((r) => (r.returnPct ?? 0) > 0),
    losers: sorted.slice(-limit).reverse().filter((r) => (r.returnPct ?? 0) < 0),
  }
}

export function tickersToBenchmarks(tickers: TickerCache[]): BenchmarkReturn[] {
  return tickers.map((t) => ({
    symbol: t.symbol,
    kind: t.kind,
    name: t.name,
    price: Number(t.price),
    currency: t.currency,
    changePct24h: t.change_pct_24h != null ? Number(t.change_pct_24h) : null,
  }))
}
