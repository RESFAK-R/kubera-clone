import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { fetchCryptoPrices, fetchIndexBenchmarks, fetchStockQuotes, fetchFxRates } from '@/lib/marketData'

export const runtime = 'nodejs'
export const maxDuration = 60

function unauthorized() {
  return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
}

export async function POST(req: Request) {
  const token = req.headers.get('authorization') || req.headers.get('x-cron-secret')
  const expected = process.env.CRON_SECRET
  if (!expected || !token || !token.includes(expected)) return unauthorized()

  const supabase = createAdminClient()

  const { data: tickerRows } = await supabase
    .from('assets')
    .select('asset_type, ticker')
    .not('ticker', 'is', null)

  const cryptoSymbols = new Set<string>()
  const stockSymbols = new Set<string>()
  for (const row of tickerRows ?? []) {
    if (!row.ticker) continue
    if (row.asset_type === 'crypto') cryptoSymbols.add(row.ticker.toUpperCase())
    if (row.asset_type === 'stock') stockSymbols.add(row.ticker.toUpperCase())
  }
  cryptoSymbols.add('BTC')
  cryptoSymbols.add('ETH')

  const results = {
    crypto: 0,
    stocks: 0,
    indices: 0,
    fx: 0,
    errors: [] as string[],
  }

  try {
    const crypto = await fetchCryptoPrices([...cryptoSymbols])
    if (crypto.length) {
      const rows = crypto.map((s) => ({
        kind: s.kind,
        symbol: s.symbol,
        name: s.name ?? null,
        price: s.price,
        currency: s.currency,
        change_24h: s.change24h ?? null,
        change_pct_24h: s.changePct24h ?? null,
        fetched_at: new Date().toISOString(),
      }))
      const { error } = await supabase.from('tickers_cache').upsert(rows, { onConflict: 'kind,symbol' })
      if (error) results.errors.push(`crypto: ${error.message}`)
      else results.crypto = rows.length
    }
  } catch (e) {
    results.errors.push(`crypto: ${(e as Error).message}`)
  }

  try {
    const indices = await fetchIndexBenchmarks()
    if (indices.length) {
      const rows = indices.map((s) => ({
        kind: s.kind,
        symbol: s.symbol,
        name: s.name ?? null,
        price: s.price,
        currency: s.currency,
        change_24h: s.change24h ?? null,
        change_pct_24h: s.changePct24h ?? null,
        fetched_at: new Date().toISOString(),
      }))
      const { error } = await supabase.from('tickers_cache').upsert(rows, { onConflict: 'kind,symbol' })
      if (error) results.errors.push(`indices: ${error.message}`)
      else results.indices = rows.length
    }
  } catch (e) {
    results.errors.push(`indices: ${(e as Error).message}`)
  }

  if (stockSymbols.size > 0) {
    try {
      const stocks = await fetchStockQuotes([...stockSymbols])
      if (stocks.length) {
        const rows = stocks.map((s) => ({
          kind: s.kind,
          symbol: s.symbol,
          name: s.name ?? null,
          price: s.price,
          currency: s.currency,
          change_24h: s.change24h ?? null,
          change_pct_24h: s.changePct24h ?? null,
          fetched_at: new Date().toISOString(),
        }))
        const { error } = await supabase.from('tickers_cache').upsert(rows, { onConflict: 'kind,symbol' })
        if (error) results.errors.push(`stocks: ${error.message}`)
        else results.stocks = rows.length
      }
    } catch (e) {
      results.errors.push(`stocks: ${(e as Error).message}`)
    }
  }

  try {
    const fx = await fetchFxRates('EUR')
    if (fx.length) {
      const today = new Date().toISOString().split('T')[0]
      const rows = fx.map((f) => ({
        base: f.base,
        quote: f.quote,
        rate: f.rate,
        rate_date: today,
        fetched_at: new Date().toISOString(),
      }))
      const { error } = await supabase.from('fx_rates').upsert(rows, { onConflict: 'base,quote,rate_date' })
      if (error) results.errors.push(`fx: ${error.message}`)
      else results.fx = rows.length
    }
  } catch (e) {
    results.errors.push(`fx: ${(e as Error).message}`)
  }

  return NextResponse.json({ ok: true, ...results })
}
