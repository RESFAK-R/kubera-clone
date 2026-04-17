'use client'

import { useState, useEffect } from 'react'
import {
  PieChart as RePieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'
import type { AssetReturn, BenchmarkReturn } from '@/lib/irr'

type Props = {
  assetClassData: { name: string; value: number; pct: string }[]
  sheetData: { name: string; value: number; pct: string }[]
  assetReturns: AssetReturn[]
  gainers: AssetReturn[]
  losers: AssetReturn[]
  benchmarks: BenchmarkReturn[]
  baseCurrency: string
}

const COLORS = ['#4f46e5', '#8b5cf6', '#d946ef', '#f43f5e', '#f59e0b', '#10b981', '#0ea5e9', '#64748b']

function fmt(val: number, currency: string) {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(val)
}

function fmtPct(pct: number) {
  return `${pct >= 0 ? '+' : ''}${pct.toFixed(1).replace('.', ',')}%`
}

export function RecapCharts({
  assetClassData,
  sheetData,
  assetReturns,
  gainers,
  losers,
  benchmarks,
  baseCurrency,
}: Props) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  if (!mounted) return <div className="min-h-[400px] w-full bg-gray-50 animate-pulse rounded-lg" />

  return (
    <div className="space-y-8">
      {/* Row 1: Asset class + Sheet breakdown pies */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <PieCard title="Asset Classes" data={assetClassData} currency={baseCurrency} />
        <PieCard title="Sheets" data={sheetData} currency={baseCurrency} />
      </div>

      {/* Row 2: Benchmarks 24h performance */}
      {benchmarks.length > 0 && (
        <div className="bg-white border border-[#e5e7eb] rounded-[4px] p-8 shadow-sm">
          <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-6">
            Benchmarks (24h change)
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {benchmarks.map((b) => (
              <div key={b.symbol} className="border border-gray-100 rounded-[4px] p-4">
                <div className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">
                  {b.symbol}
                </div>
                <div className="text-[14px] font-bold text-[#1a1a1a] mb-1">
                  {new Intl.NumberFormat('de-DE', {
                    style: 'currency',
                    currency: b.currency ?? 'USD',
                    maximumFractionDigits: 2,
                  }).format(b.price)}
                </div>
                {b.changePct24h !== null ? (
                  <div
                    className={`text-[12px] font-bold ${
                      b.changePct24h >= 0 ? 'text-green-600' : 'text-red-500'
                    }`}
                  >
                    {fmtPct(b.changePct24h)}
                  </div>
                ) : (
                  <div className="text-[12px] text-gray-300">—</div>
                )}
                {b.name && (
                  <div className="text-[10px] text-gray-400 mt-1 truncate">{b.name}</div>
                )}
              </div>
            ))}
          </div>
          {benchmarks.length === 0 && (
            <p className="text-[13px] text-gray-400">
              Benchmarks appear after the price refresh cron runs.
            </p>
          )}
        </div>
      )}

      {/* Row 3: Top gainers + losers */}
      {(gainers.length > 0 || losers.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <MoversCard title="Top Gainers" movers={gainers} currency={baseCurrency} positive />
          <MoversCard title="Top Losers" movers={losers} currency={baseCurrency} positive={false} />
        </div>
      )}

      {/* Row 4: Asset returns bar chart */}
      {assetReturns.filter((r) => r.returnPct !== null).length > 0 && (
        <div className="bg-white border border-[#e5e7eb] rounded-[4px] p-8 shadow-sm">
          <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-6">
            Return by Asset (cost basis vs current value)
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={assetReturns
                  .filter((r) => r.returnPct !== null)
                  .slice(0, 20)
                  .map((r) => ({
                    name: r.name.length > 12 ? r.name.slice(0, 12) + '…' : r.name,
                    pct: parseFloat((r.returnPct ?? 0).toFixed(1)),
                  }))}
                margin={{ top: 10, right: 10, left: 0, bottom: 40 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  angle={-35}
                  textAnchor="end"
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#9ca3af' }}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  formatter={(value) => [`${Number(value).toFixed(1)}%`, 'Return']}
                  labelStyle={{ fontSize: 12 }}
                />
                <Bar
                  dataKey="pct"
                  radius={[2, 2, 0, 0]}
                  fill="#4f46e5"
                  // per-bar colour: green if positive, red if negative
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  label={false as any}
                >
                  {assetReturns
                    .filter((r) => r.returnPct !== null)
                    .slice(0, 20)
                    .map((r, i) => (
                      <Cell
                        key={`cell-${i}`}
                        fill={Number(r.returnPct) >= 0 ? '#10b981' : '#f43f5e'}
                      />
                    ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Row 5: Full asset returns table */}
      {assetReturns.length > 0 && (
        <div className="bg-white border border-[#e5e7eb] rounded-[4px] shadow-sm">
          <div className="px-8 pt-8 pb-4">
            <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
              Asset Returns
            </h3>
          </div>
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-8 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                  Asset
                </th>
                <th className="text-right px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                  Current Value
                </th>
                <th className="text-right px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                  Cost Basis
                </th>
                <th className="text-right px-4 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                  Return €
                </th>
                <th className="text-right px-8 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                  Return %
                </th>
                <th className="text-right px-8 py-3 text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                  24h %
                </th>
              </tr>
            </thead>
            <tbody>
              {assetReturns.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                >
                  <td className="px-8 py-3">
                    <div className="font-medium text-[#1a1a1a]">{r.name}</div>
                    <div className="text-[11px] text-gray-400 uppercase">{r.assetType}</div>
                  </td>
                  <td className="text-right px-4 py-3 font-medium">
                    {fmt(r.value, baseCurrency)}
                  </td>
                  <td className="text-right px-4 py-3 text-gray-500">
                    {r.costBasis !== null ? fmt(r.costBasis, baseCurrency) : '—'}
                  </td>
                  <td
                    className={`text-right px-4 py-3 font-medium ${
                      r.returnAbs !== null
                        ? r.returnAbs >= 0
                          ? 'text-green-600'
                          : 'text-red-500'
                        : 'text-gray-300'
                    }`}
                  >
                    {r.returnAbs !== null
                      ? `${r.returnAbs >= 0 ? '+' : ''}${fmt(r.returnAbs, baseCurrency)}`
                      : '—'}
                  </td>
                  <td
                    className={`text-right px-8 py-3 font-bold ${
                      r.returnPct !== null
                        ? r.returnPct >= 0
                          ? 'text-green-600'
                          : 'text-red-500'
                        : 'text-gray-300'
                    }`}
                  >
                    {r.returnPct !== null ? fmtPct(r.returnPct) : '—'}
                  </td>
                  <td
                    className={`text-right px-8 py-3 ${
                      r.change24hPct !== null
                        ? r.change24hPct >= 0
                          ? 'text-green-600'
                          : 'text-red-500'
                        : 'text-gray-300'
                    }`}
                  >
                    {r.change24hPct !== null ? fmtPct(r.change24hPct) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {assetReturns.length === 0 && (
        <div className="bg-white border border-[#e5e7eb] rounded-[4px] p-12 shadow-sm text-center text-gray-400 text-[14px]">
          No assets found. Add assets on the Assets page to see your recap.
        </div>
      )}
    </div>
  )
}

function PieCard({
  title,
  data,
  currency,
}: {
  title: string
  data: { name: string; value: number; pct: string }[]
  currency: string
}) {
  return (
    <div className="bg-white border border-[#e5e7eb] rounded-[4px] p-8 shadow-sm h-[400px] flex flex-col">
      <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-6">{title}</h3>
      {data.length > 0 ? (
        <>
          <div className="flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <RePieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {data.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [fmt(Number(value), currency), 'Value']}
                  labelStyle={{ fontSize: 12 }}
                />
              </RePieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {data.map((item, index) => (
              <div key={item.name} className="flex items-center gap-2 min-w-0">
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="text-[11px] font-medium text-[#1a1a1a] truncate">{item.name}</span>
                <span className="text-[11px] text-gray-400 ml-auto flex-shrink-0">{item.pct}%</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center text-[13px] text-gray-400">
          No data yet
        </div>
      )}
    </div>
  )
}

function MoversCard({
  title,
  movers,
  currency,
  positive,
}: {
  title: string
  movers: AssetReturn[]
  currency: string
  positive: boolean
}) {
  return (
    <div className="bg-white border border-[#e5e7eb] rounded-[4px] p-8 shadow-sm">
      <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4">{title}</h3>
      {movers.length === 0 ? (
        <p className="text-[13px] text-gray-400">No data — add cost basis to assets.</p>
      ) : (
        <div className="space-y-3">
          {movers.map((r) => (
            <div key={r.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
              <div>
                <div className="text-[13px] font-bold text-[#1a1a1a]">{r.name}</div>
                <div className="text-[11px] text-gray-400 uppercase">{r.assetType}</div>
              </div>
              <div className="text-right">
                <div
                  className={`text-[14px] font-bold ${positive ? 'text-green-600' : 'text-red-500'}`}
                >
                  {r.returnPct !== null ? fmtPct(r.returnPct) : '—'}
                </div>
                <div className="text-[11px] text-gray-400">
                  {r.returnAbs !== null
                    ? `${r.returnAbs >= 0 ? '+' : ''}${fmt(r.returnAbs, currency)}`
                    : '—'}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
