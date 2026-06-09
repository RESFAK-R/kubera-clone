'use client'

import { useState, useMemo } from 'react'
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts'
import type { ChartPoint } from '@/lib/netWorth'
import { formatCurrency } from '@/lib/currency'

type Range = '1W' | '1M' | '3M' | '6M' | '1Y' | 'ALL'

const RANGES: Range[] = ['1W', '1M', '3M', '6M', '1Y', 'ALL']

function daysForRange(range: Range): number | null {
  switch (range) {
    case '1W': return 7
    case '1M': return 30
    case '3M': return 90
    case '6M': return 180
    case '1Y': return 365
    case 'ALL': return null
  }
}

export function NetWorthChart({
  data,
  currency,
}: {
  data: ChartPoint[]
  currency: string
}) {
  const [range, setRange] = useState<Range>('ALL')

  const points = useMemo(() => {
    const days = daysForRange(range)
    if (days === null) return data
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)
    return data.filter((p) => new Date(p.date) >= cutoff)
  }, [data, range])

  if (points.length < 2) {
    return (
      <div className="bg-white border border-[#e5e7eb] rounded-[4px] min-h-[380px] lg:min-h-[500px] shadow-sm relative overflow-hidden flex flex-col pt-8 px-5 sm:px-8 lg:px-10 mb-8">
        <h2 className="text-[28px] sm:text-[32px] font-bold text-[#1a1a1a]/15 absolute top-8 left-5 sm:left-8 lg:left-10 select-none">
          Net Worth
        </h2>
        <div className="flex-1 flex items-center justify-center">
          <div className="mx-4 bg-white shadow-lg border border-gray-100 px-5 py-4 rounded-full text-center sm:px-8 sm:py-5">
            <span className="text-[14px] font-medium text-[#1a1a1a] sm:text-[18px]">
              Chart appears once a second daily snapshot is captured
            </span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-[#e5e7eb] rounded-[4px] min-h-[380px] lg:min-h-[500px] shadow-sm relative overflow-hidden flex flex-col pt-8 px-5 pb-6 mb-8 sm:px-8 lg:px-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[28px] font-bold text-[#1a1a1a]/15 select-none sm:text-[32px]">Net Worth</h2>
        <div className="flex flex-wrap gap-1">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest rounded-[4px] transition-colors ${
                range === r ? 'bg-black text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 min-h-[280px] lg:min-h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
            <XAxis
              dataKey="date"
              tickFormatter={(d) => new Date(d).toLocaleDateString('it-IT', { month: 'short', day: '2-digit' })}
              stroke="#9ca3af"
              fontSize={11}
            />
            <YAxis
              tickFormatter={(v) => formatCurrency(v, currency, { maximumFractionDigits: 0 })}
              stroke="#9ca3af"
              fontSize={11}
              width={80}
            />
            <Tooltip
              formatter={(value) => formatCurrency(Number(value), currency)}
              labelFormatter={(label) =>
                typeof label === 'string'
                  ? new Date(label).toLocaleDateString('it-IT', {
                      year: 'numeric',
                      month: 'short',
                      day: '2-digit',
                    })
                  : String(label ?? '')
              }
              contentStyle={{ borderRadius: 4, border: '1px solid #e5e7eb', fontSize: 12 }}
            />
            <Line type="monotone" dataKey="value" stroke="#a855f7" strokeWidth={2.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
