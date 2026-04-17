import type { FxRate } from '@/types/db'

const SYMBOLS: Record<string, string> = {
  EUR: '€',
  USD: '$',
  GBP: '£',
  CHF: 'CHF',
}

export function currencySymbol(code: string): string {
  return SYMBOLS[code] ?? code
}

export function formatCurrency(
  value: number,
  currency: string,
  opts: { maximumFractionDigits?: number; locale?: string } = {},
): string {
  const { maximumFractionDigits = 0, locale = 'de-DE' } = opts
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits,
  }).format(value)
}

export function formatCompactCurrency(value: number, currency: string): string {
  const sym = currencySymbol(currency)
  const abs = Math.abs(value)
  if (abs >= 1_000_000_000) return `${sym} ${(value / 1_000_000_000).toFixed(2)} Billion`
  if (abs >= 1_000_000) return `${sym} ${(value / 1_000_000).toFixed(2)} Million`
  if (abs >= 10_000) return `${sym} ${Math.round(value).toLocaleString('de-DE')}`
  return `${sym} ${value.toLocaleString('de-DE')}`
}

export function formatSignedPct(pct: number, digits = 2): string {
  const sign = pct > 0 ? '+' : ''
  return `${sign}${pct.toFixed(digits).replace('.', ',')}%`
}

export function formatSignedCurrency(value: number, currency: string): string {
  const sign = value > 0 ? '+' : value < 0 ? '-' : ''
  return `${sign}${formatCurrency(Math.abs(value), currency)}`
}

type FxMap = Map<string, number>

export function indexFxRates(rows: FxRate[], base: string): FxMap {
  const map = new Map<string, number>()
  map.set(base, 1)
  for (const r of rows) {
    if (r.base === base) map.set(r.quote, Number(r.rate))
  }
  return map
}

export function convert(amount: number, from: string, to: string, rates: FxMap): number {
  if (from === to) return amount
  const fromRate = rates.get(from)
  const toRate = rates.get(to)
  if (!fromRate || !toRate) return amount
  const inBase = amount / fromRate
  return inBase * toRate
}
