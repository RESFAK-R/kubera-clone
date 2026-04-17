import type { TickerKind } from '@/types/db'

export interface PriceSample {
  kind: TickerKind
  symbol: string
  name?: string
  price: number
  currency: string
  change24h?: number
  changePct24h?: number
}

interface CoinGeckoMarket {
  id: string
  symbol: string
  name: string
  current_price: number
  price_change_24h: number | null
  price_change_percentage_24h: number | null
}

const CRYPTO_IDS: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  USDT: 'tether',
  USDC: 'usd-coin',
  BNB: 'binancecoin',
  SOL: 'solana',
  XRP: 'ripple',
  ADA: 'cardano',
  DOGE: 'dogecoin',
  AVAX: 'avalanche-2',
  DOT: 'polkadot',
  MATIC: 'matic-network',
  LINK: 'chainlink',
}

export async function fetchCryptoPrices(
  symbols: string[] = Object.keys(CRYPTO_IDS),
  baseCurrency = 'eur',
): Promise<PriceSample[]> {
  const ids = symbols
    .map((s) => CRYPTO_IDS[s.toUpperCase()])
    .filter((id): id is string => Boolean(id))
  if (ids.length === 0) return []

  const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=${encodeURIComponent(
    baseCurrency,
  )}&ids=${ids.join(',')}&price_change_percentage=24h`

  const res = await fetch(url, { next: { revalidate: 0 } })
  if (!res.ok) throw new Error(`CoinGecko ${res.status}`)
  const rows = (await res.json()) as CoinGeckoMarket[]

  return rows.map((r) => ({
    kind: 'crypto' as const,
    symbol: r.symbol.toUpperCase(),
    name: r.name,
    price: r.current_price,
    currency: baseCurrency.toUpperCase(),
    change24h: r.price_change_24h ?? undefined,
    changePct24h: r.price_change_percentage_24h ?? undefined,
  }))
}

// Stooq (free, CSV, reliable for stocks + indices) — no API key needed.
// Symbols: AAPL.US, ^SPX (→ ^SPX uses url ?s=^spx), VT.US etc.
export async function fetchStooqQuote(symbol: string, kind: TickerKind): Promise<PriceSample | null> {
  const s = encodeURIComponent(symbol.toLowerCase())
  const url = `https://stooq.com/q/l/?s=${s}&f=sd2t2ohlcv&h&e=csv`
  const res = await fetch(url, { next: { revalidate: 0 } })
  if (!res.ok) return null
  const text = await res.text()
  const [header, row] = text.trim().split('\n')
  if (!row || !header) return null
  const cols = row.split(',')
  const close = Number(cols[6])
  const open = Number(cols[3])
  if (!Number.isFinite(close)) return null
  const change = close - open
  const pct = open ? (change / open) * 100 : 0
  return {
    kind,
    symbol: symbol.toUpperCase(),
    price: close,
    currency: 'USD',
    change24h: change,
    changePct24h: pct,
  }
}

export async function fetchIndexBenchmarks(): Promise<PriceSample[]> {
  const targets: Array<{ symbol: string; stooq: string; kind: TickerKind; name: string }> = [
    { symbol: 'SPX', stooq: '^spx', kind: 'index', name: 'S&P 500' },
    { symbol: 'DJI', stooq: '^dji', kind: 'index', name: 'Dow Jones' },
    { symbol: 'IXIC', stooq: '^ndx', kind: 'index', name: 'Nasdaq 100' },
    { symbol: 'AAPL', stooq: 'aapl.us', kind: 'stock', name: 'Apple Inc.' },
    { symbol: 'VT', stooq: 'vt.us', kind: 'stock', name: 'Vanguard Total World' },
  ]
  const results: PriceSample[] = []
  for (const t of targets) {
    const q = await fetchStooqQuote(t.stooq, t.kind)
    if (q) results.push({ ...q, symbol: t.symbol, name: t.name })
  }
  return results
}

export async function fetchStockQuotes(symbols: string[]): Promise<PriceSample[]> {
  const results: PriceSample[] = []
  for (const s of symbols) {
    const stooqSymbol = s.includes('.') ? s.toLowerCase() : `${s.toLowerCase()}.us`
    const q = await fetchStooqQuote(stooqSymbol, 'stock')
    if (q) results.push({ ...q, symbol: s.toUpperCase() })
  }
  return results
}

interface ExchangeRateResponse {
  base?: string
  rates?: Record<string, number>
}

export async function fetchFxRates(base = 'EUR'): Promise<Array<{ base: string; quote: string; rate: number }>> {
  const url = `https://api.exchangerate.host/latest?base=${base}`
  const res = await fetch(url, { next: { revalidate: 0 } })
  if (!res.ok) throw new Error(`FX fetch ${res.status}`)
  const json = (await res.json()) as ExchangeRateResponse
  if (!json.rates) return []
  return Object.entries(json.rates).map(([quote, rate]) => ({
    base: json.base || base,
    quote,
    rate: Number(rate),
  }))
}
