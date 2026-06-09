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

  // Revalue tickerized assets: value = quantity * latest price (FX-converted to base currency).
  // Append asset_history row for the change so the chart picks up the move.
  const revaluation = { updated: 0, errors: [] as string[] }
  try {
    const { data: cache } = await supabase.from('tickers_cache').select('kind, symbol, price, currency')
    const priceMap = new Map<string, { price: number; currency: string }>()
    for (const row of cache ?? []) {
      priceMap.set(`${row.kind}:${row.symbol.toUpperCase()}`, { price: Number(row.price), currency: row.currency })
    }

    const { data: fxRows } = await supabase
      .from('fx_rates')
      .select('base, quote, rate, rate_date')
      .order('rate_date', { ascending: false })
    const fxMap = new Map<string, number>()
    for (const r of fxRows ?? []) {
      const key = `${r.base}:${r.quote}`
      if (!fxMap.has(key)) fxMap.set(key, Number(r.rate))
    }
    const convert = (amount: number, from: string, to: string): number | null => {
      if (from === to) return amount
      const direct = fxMap.get(`${from}:${to}`)
      if (direct) return amount * direct
      const inverse = fxMap.get(`${to}:${from}`)
      if (inverse && inverse !== 0) return amount / inverse
      return null
    }

    const { data: tickAssets } = await supabase
      .from('assets')
      .select('id, user_id, ticker, asset_type, quantity, value, currency')
      .not('ticker', 'is', null)
      .gt('quantity', 0)

    const { data: profiles } = await supabase.from('profiles').select('id, base_currency')
    const baseByUser = new Map<string, string>(
      (profiles ?? []).map((p: { id: string; base_currency: string | null }) => [p.id, p.base_currency ?? 'EUR']),
    )

    for (const a of tickAssets ?? []) {
      if (!a.ticker || !a.quantity) continue
      const kind = a.asset_type === 'crypto' ? 'crypto' : a.asset_type === 'stock' ? 'stock' : null
      if (!kind) continue
      const cached = priceMap.get(`${kind}:${a.ticker.toUpperCase()}`)
      if (!cached) continue

      const baseCurrency = baseByUser.get(a.user_id) ?? 'EUR'
      const valueInPriceCurrency = Number(a.quantity) * cached.price
      const converted = convert(valueInPriceCurrency, cached.currency, baseCurrency)
      if (converted == null) continue
      const newValue = Math.round(converted * 100) / 100
      if (Math.abs(newValue - Number(a.value)) < 0.01) continue

      const { error: upErr } = await supabase
        .from('assets')
        .update({ value: newValue, last_priced_at: new Date().toISOString() })
        .eq('id', a.id)
      if (upErr) {
        revaluation.errors.push(`asset ${a.id}: ${upErr.message}`)
        continue
      }
      await supabase.from('asset_history').insert({
        asset_id: a.id,
        user_id: a.user_id,
        value: newValue,
        recorded_at: new Date().toISOString(),
      })
      revaluation.updated += 1
    }
  } catch (e) {
    revaluation.errors.push((e as Error).message)
  }

  return NextResponse.json({ ok: true, ...results, revaluation })
}
